// How a flat mark made of parts moves.
//   intro: each part turns from edge-on to flat, one after another, and the mark settles as they arrive.
//   loop:  the mark redraws itself without a shape moving: each part opens into its outline, the outline runs
//          off towards the far side, grows back from where it starts and fills again.
// A mark's settings can change the timing ("motion": { "built", "arrive", "order", "parts": { id: { "intro",
// "lag", "turn" } }, "loop" }) or hand the drawing to a file of the brand's own ("motion": { "module": "motion.js" }),
// which is the way to make a mark move as the thing it shows would move.
const path = require('path');

module.exports = (kind, S) => {
  const { ACCENTS, INK, WHITE, brand: B } = S, light = B.tone === 'light', M = kind.def.motion || {}, id = kind.id;
  const U = kind.U;
  const n = kind.parts.length, arrive = M.arrive || kind.G.parts.map(p => p.id);      // the order the parts turn up in
  const gap = Math.min(0.2, 0.8 / Math.max(1, n - 1)), lag = Math.min(0.22, 0.9 / Math.max(1, n - 1));
  const turnOf = { ...(kind.G.turn || {}), ...(kind.def.turn || {}) };
  const part = pid => {
    const p = kind.parts.find(x => x.id === pid), i = arrive.indexOf(pid), set = (M.parts || {})[pid] || {};
    if (!p || i < 0) throw new Error(`the motion settings of the mark "${id}" name the part "${pid}", which the mark does not have`);
    // intro: [start, length] of its turn. lag: how long after the first part it starts in the loop. turn: the line it turns about
    return { id: pid, d: p.d, accent: p.accent, intro: set.intro || [0.1 + gap * i, n > 1 && i === n - 1 ? 0.5 : 0.55], lag: set.lag !== undefined ? set.lag : lag * i, turn: set.turn || turnOf[pid] };
  };
  // drawn in this order: the accent parts last, over the rest, unless the settings say otherwise
  const parts = (M.order || kind.order.map(p => p.id)).map(part);
  const built = M.built || Math.max(...parts.map(p => p.intro[0] + p.intro[1])) + 0.12;
  // loop: what each part does, one after another, and how long each step lasts. It rests as the solid shape, opens
  // into its outline, the outline runs off, it is gone, it is drawn again, and it fills. thin: the outline's width
  const timing = { built, loop: { rest: 0.8, open: 0.8, off: 0.65, gone: 0.1, draw: 0.8, fill: 0.9, thin: 13 * U, ...(M.loop || {}) } };
  // The loop has to be back at the still logo before it ends: its steps, and the last part's wait, must fit its length
  const length = M.loopLength || 6, L = timing.loop, cycle = L.rest + L.open + L.off + L.gone + L.draw + L.fill + Math.max(...parts.map(p => p.lag));
  if (cycle > length) throw new Error(`the loop of the mark "${id}" needs ${+cycle.toFixed(2)} seconds (its steps, and the wait of its last part) and is ${length} seconds long, so it would jump where it repeats. Shorten the steps in "motion.loop" or set "motion.loopLength"`);
  const plain = kind.brands.filter(b => !b.accent);

  // The page side: given the harness's tools, it returns how to draw the mark at a time. Runs in the browser.
  function client(k) {
    const { c, W, H, T, sx, E, pr, lerp, RAD, LOOP, ID, markMatrix, turned, layer } = k, P = c.mark.parts;
    // The shapes are never bent or moved once the mark is complete: at rest they are the mark itself.
    // reach: how thick an outline drawn inside the part has to be before it fills the part
    const s = 0.25 / c.mark.unit, [probe, pg] = layer(Math.ceil(c.bounds[2] * s) + 8, Math.ceil(c.bounds[3] * s) + 8);
    const reach = shape => {
      const open = w => {
        pg.setTransform(ID); pg.globalCompositeOperation = 'source-over'; pg.clearRect(0, 0, probe.width, probe.height);
        pg.setTransform(s, 0, 0, s, 4 - c.bounds[0] * s, 4 - c.bounds[1] * s); pg.fillStyle = '#000'; pg.fill(shape);
        pg.globalCompositeOperation = 'destination-out'; pg.lineJoin = 'round'; pg.lineWidth = 2 * w; pg.stroke(shape);
        const d = pg.getImageData(0, 0, probe.width, probe.height).data;
        for (let i = 3; i < d.length; i += 4) if (d[i] > 40) return true;
        return false;
      };
      let lo = 0, hi = 400 * c.mark.unit;
      for (let i = 0; i < 9; i++) { const mid = (lo + hi) / 2; if (open(mid)) lo = mid; else hi = mid; }
      return hi * 1.05;
    };
    for (const p of P) {
      p.shape = new Path2D(p.d); p.reach = reach(p.shape);
      // a part may be several outlines (a shape with a hole in it): each runs as a line of its own
      p.lines = (p.d.match(/M[^M]+/g) || [p.d]).map(d => { const el = document.createElementNS('http://www.w3.org/2000/svg', 'path'); el.setAttribute('d', d); return { shape: new Path2D(d), length: el.getTotalLength() }; });
    }
    // Intro: how far each part faces us (1 flat, 0 edge-on), and the whole mark settling as it turns.
    function turn(t) {
      if (LOOP || t >= T.built) return null;
      // what we see of a part is the cosine of the angle it has left to turn
      const settle = E.outCubic(pr(t, [0.1, T.built - 0.1]));
      return { s: lerp(0.94, 1, settle), rot: -6 * RAD * (1 - settle), fold: p => Math.sin(Math.PI / 2 * E.outCubic(pr(t, p.intro))) };
    }
    // Loop: how much of a part's outline is there and how thick it is, or null while the part is solid.
    //   thin: 0 as thick as the part (solid), 1 a thin line      from, to: the stretch of outline that is drawn, as a
    //   share of the way from the outline's start to the far side, along both edges at once
    function line(p, t) {
      if (!LOOP) return null;
      const L = T.loop, x = ((t % c.duration) + c.duration) % c.duration - p.lag;
      let a = L.rest;
      if (x < a) return null;
      if (x < a + L.open) return { thin: E.inOutCubic((x - a) / L.open), from: 0, to: 1 };
      a += L.open;
      if (x < a + L.off) return { thin: 1, from: E.inCubic((x - a) / L.off), to: 1 };
      a += L.off;
      if (x < a + L.gone) return { thin: 1, from: 1, to: 1 };
      a += L.gone;
      if (x < a + L.draw) return { thin: 1, from: 0, to: E.outCubic((x - a) / L.draw) };
      a += L.draw;
      if (x < a + L.fill) return { thin: 1 - E.inOutCubic((x - a) / L.fill), from: 0, to: 1 };
      return null;
    }
    function draw(t, cam) {
      const w1 = c.rest.w * cam.g, q = turn(t);
      const m = markMatrix(W / 2 + cam.g * (c.rest.cx - cam.fx), H / 2 + cam.g * (c.rest.cy - cam.fy), w1 * (q ? q.s : 1), q ? q.rot : 0);
      const a = c.mark.axis;
      for (const p of P) {
        const f = q ? q.fold(p) : 1, ln = line(p, t);
        if (f <= 0.004 || (ln && ln.to <= ln.from)) continue;
        sx.setTransform(f === 1 ? m : turned(m, p.turn, f));
        let paint = c.ink;
        if (p.accent) { paint = sx.createLinearGradient(a[0], a[1], a[2], a[3]); c.stops.forEach((s, i) => paint.addColorStop(i / (c.stops.length - 1), s)); }
        if (!ln) { sx.fillStyle = paint; sx.fill(p.shape); continue; }
        // the outline lies inside the part, so the part never grows: a line of twice the width, cut to the shape
        sx.save(); sx.clip(p.shape);
        sx.strokeStyle = paint; sx.lineJoin = 'round'; sx.lineCap = 'butt'; sx.lineWidth = 2 * lerp(p.reach, T.loop.thin, ln.thin);
        for (const o of p.lines) {
          const h = o.length / 2, on = (ln.to - ln.from) * h;
          sx.setLineDash(ln.from <= 0 && ln.to >= 1 ? [] : [0, ln.from * h, on, o.length - ln.to * o.length, on, ln.from * h]);
          sx.stroke(o.shape);
        }
        sx.restore(); sx.setLineDash([]);
      }
      sx.setTransform(ID);
    }
    // while the loop rests, every part is solid and the picture is the still logo
    return { draw, resting: t => P.every(p => !line(p, t)), parts: P };
  }

  const built_in = {
    kind: 'parts', loop: length, timing, client,
    // what a logo is drawn in: the accent's stops, the colour of the name's accent, the background of the MP4, and the mark's own colour
    look(logo) {
      const a = logo.accent ? ACCENTS[logo.accent] : null;
      return { stops: a ? (light ? a.stopsLight : a.stops) : light ? [INK, INK] : [WHITE, WHITE], solid: a ? (light ? a.onLight : a.solid) : light ? INK : WHITE, bg: light ? WHITE : INK, ink: light ? INK : '#fff' };
    },
    // the mark alone: plain where a brand has no accent, then once for each accent its brands wear. of: whose it is
    marks: () => [
      ...(plain.length || !kind.accents.length ? [{ id: `${id}-mark`, accent: null, of: (plain[0] || kind.brands[0]).label }] : []),
      ...kind.accents.map(k => ({ id: `${id}-${k}-mark`, accent: k, of: ACCENTS[k].use })),
    ],
    markOf: b => b.accent && kind.accents.includes(b.accent) ? `${id}-${b.accent}-mark` : `${id}-mark`,
    config(c) { c.mark = { parts, axis: kind.AXIS, unit: U }; },
    words: {
      intro: 'Each part turns from edge-on to flat, one after another, and the mark settles as they arrive.',
      loop: 'No shape moves. Each part opens into its outline, the outline runs off, grows back and fills again.',
    },
  };
  // a brand's own way of moving its mark: a file that gives any of { timing, config, wrap, words, loop, client }
  if (!M.module) return built_in;
  const own = require(S.own(M.module, `the motion of the mark "${id}"`))(kind, S, built_in);
  return { ...built_in, ...own, timing: { ...built_in.timing, ...(own.timing || {}) }, words: { ...built_in.words, ...(own.words || {}) } };
};
