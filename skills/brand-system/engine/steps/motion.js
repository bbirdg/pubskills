// Animated logos. Each mark is built from its own parts, undistorted, and comes to rest as the still logo.
// How a mark moves belongs to its kind (lib/kinds/parts-motion.js for a flat mark), or to a file of the brand's own.
//   intro: the mark arrives, then the name beside or under it.
//   loop:  the mark kept alive in place. A loop starts on the still logo and ends exactly where it starts, so an
//          intro can cut straight into it.
// Every frame is a pure function of time: Chromium draws it on a transparent canvas (fast moves are averaged over
// the shutter, which gives real motion blur) and ffmpeg encodes it three ways: MP4 on the brand background, and
// ProRes 4444 and WebM with transparency.
// usage: node run.js motion <brand folder> [filter]     e.g. node run.js motion <folder> loop-1080x1080
const fs = require('fs'), os = require('os'), path = require('path');
const { spawn } = require('child_process');
const S = require('../lib/system').open();
const { launchFilm } = require('../lib/browser');
const B = S.brand;

const FPS = B.motion.fps, FORMATS = B.motion.formats, VARIANTS = B.motion.variants;
// with a word: the mark, then the name beside or under it. Without: the mark alone, once for each colour the mark
// is worn in (of: whose it is). mark: the mark-alone logo that goes with a named one.
const MOVING = S.marks.filter(m => m.motion);
const LOGOS = [
  ...MOVING.flatMap(m => m.brands.filter(b => b.motion).map(b => ({ id: b.id, label: b.label, kind: m, accent: b.accent, word: b.word, desc: b.desc, tail: b.tail, mark: m.motion.markOf(b) }))),
  ...MOVING.flatMap(m => m.motion.marks().map(x => ({ ...x, kind: m }))),
];

// ---------------------------------------------------------------- timing, in seconds
// the name starts to arrive just before the mark is complete (built: when the mark is complete, which its kind says)
const textTiming = built => ({ move: [built - 0.05, 0.8], word: built + 0.12, stagger: 0.03, letter: 0.55, desc: [built + 0.55, 0.45] });
const INTRO = { lockup: 5, mark: 4, ...(B.motion.intro || {}) };

// ---------------------------------------------------------------- layout
// widths as a share of the frame: the finished lockup, the mark before the name arrives, the mark when it stands
// alone. A square or tall mark is made narrower, so that it is never more than 42% of the frame's height
const sizes = (W, H, aspect) => {
  const s = W > H ? { lock: W * 0.56, solo: W * 0.24, mark: W * 0.25 } : H > W ? { lock: W * 0.66, solo: W * 0.56, mark: W * 0.58 } : { lock: W * 0.56, solo: W * 0.48, mark: W * 0.5 }, most = H * 0.42 * aspect;
  return { lock: s.lock, solo: Math.min(s.solo, most), mark: Math.min(s.mark, most) };
};

function config(logo, variant, W, H) {
  const m = logo.kind, M = m.motion, aspect = m.aspect, look = M.look(logo), size = sizes(W, H, aspect);
  const c = { W, H, fps: FPS, kind: M.kind, variant, aspect, bounds: m.bounds, stops: look.stops, bg: look.bg, ink: look.ink };
  c.duration = variant === 'loop' ? M.loop : logo.word ? INTRO.lockup : INTRO.mark;
  c.T = Object.assign({}, M.timing);
  if (logo.word) Object.assign(c.T, textTiming(c.T.built));
  // rest: where the mark ends up. zoom: how much closer the view is before the name arrives
  c.rest = { cx: W / 2, cy: H / 2, w: size.mark }; c.zoom = 1;
  if (logo.word) {
    const L = S.lockupLayout(aspect, logo.word, logo.desc, logo.tail), a = W > H ? L.horizontal : L.stacked, p = L.pad, tb = L.tb;
    const k = size.lock / (a.w - 2 * p), ox = (W - (a.w - 2 * p) * k) / 2 - p * k, oy = (H - (a.h - 2 * p) * k) / 2 - p * k;
    const [mx, my, mw] = a.mark, [tx, ty, align] = a.text;
    c.rest = { cx: ox + (mx + mw / 2) * k, cy: oy + (my + mw / aspect / 2) * k, w: mw * k }; c.zoom = size.solo / c.rest.w;
    const letters = S.glyphs(S.FONTS.word, logo.word, S.SIZE, S.WORD_TRACK);
    c.text = { k, ox, oy, letters, accent: logo.tail ? letters.map((_, i) => i >= letters.length - logo.tail) : [], fill: look.solid, at: tb.wordAt(tx, ty), rise: S.CAP * 1.4, clip: [tx - 40, ty - S.CAP * 0.5, tb.word.w + 80, S.CAP * 1.55] };
    if (tb.desc) c.text.desc = { d: tb.desc.d, at: tb.descAt(tx, ty, align), rise: tb.descCap * 0.7 };
  }
  M.config(c, logo);
  return c;
}

// ---------------------------------------------------------------- the page: runs in the browser, given the config
// makeMark: the kind's own part of the page. Given these tools it returns { draw(t, cam), resting(t), backdrop(g) }:
// how to draw the mark at a time, whether it is at rest then (a loop), and what to paint behind it, if anything.
// wrap: a brand's own motion for the mark, laid over the kind's (see the skill's rules on motion)
function client(c, makeMark, wrap) {
  const W = c.W, H = c.H, T = c.T, TAU = Math.PI * 2, RAD = Math.PI / 180, LOOP = c.variant === 'loop';
  const view = document.getElementById('view'), out = view.getContext('2d');
  const layer = (w = W, h = H) => { const x = document.createElement('canvas'); x.width = w; x.height = h; return [x, x.getContext('2d')]; };
  const [solid, sx] = layer(), [light, lx] = layer();
  // Motion blur: the moments of one shutter are averaged two at a time, then those averages two at a time, and so on.
  // Halving keeps the full 8 bits at every step, so gradients stay smooth (adding sixteenths would band them).
  const stack = () => ({ keep: Array.from({ length: 5 }, () => layer()), work: Array.from({ length: 4 }, () => layer()), has: [false, false, false, false, false] });
  const accS = stack(), accL = stack();
  function push(acc, src, level) {
    const [cv, cx] = acc.keep[level];
    if (!acc.has[level]) { cx.globalCompositeOperation = 'copy'; cx.globalAlpha = 1; cx.drawImage(src, 0, 0); acc.has[level] = true; return; }
    const [wk, wx] = acc.work[level];
    wx.globalCompositeOperation = 'copy'; wx.globalAlpha = 0.5; wx.drawImage(cv, 0, 0);
    wx.globalCompositeOperation = 'lighter'; wx.drawImage(src, 0, 0);
    acc.has[level] = false; push(acc, wk, level + 1);
  }
  const GQ = 4, [glowA, gax] = layer(Math.ceil(W / GQ), Math.ceil(H / GQ)), [glowB, gbx] = layer(Math.ceil(W / GQ), Math.ceil(H / GQ));
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x)), lerp = (a, b, k) => a + (b - a) * k;
  const pr = (t, [t0, d]) => clamp((t - t0) / d);
  const E = {
    inCubic: x => x * x * x,
    outCubic: x => 1 - Math.pow(1 - x, 3),
    outExpo: x => x >= 1 ? 1 : 1 - Math.pow(2, -10 * x),
    inOutCubic: x => x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2,
    outBack: (x, s) => 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2),
  };
  const ID = new DOMMatrix();

  // ---- the view: close on the mark first, then it pulls back to the whole lockup while the name arrives
  function camera(t) {
    const m = !c.text || LOOP ? 1 : E.inOutCubic(pr(t, T.move));
    return { g: Math.pow(c.zoom, 1 - m), fx: lerp(c.rest.cx, W / 2, m), fy: lerp(c.rest.cy, H / 2, m) };
  }
  const frameOf = cam => `matrix(${cam.g},0,0,${cam.g},${W / 2 - cam.g * cam.fx},${H / 2 - cam.g * cam.fy})`;
  const BC = [c.bounds[0] + c.bounds[2] / 2, c.bounds[1] + c.bounds[3] / 2];
  // mark units -> screen, for a mark of width w centred on (x, y) and turned by rot
  function markMatrix(x, y, w, rot) {
    const s = w / c.bounds[2], co = Math.cos(rot) * s, si = Math.sin(rot) * s;
    return new DOMMatrix([co, si, -si, co, x - (co * BC[0] - si * BC[1]), y - (si * BC[0] + co * BC[1])]);
  }
  // a flat shape turned about a line in its own plane: seen from the front it narrows across that line by k (1 flat, 0 edge-on)
  function turned(m, [x0, y0, x1, y1], k) {
    const l = Math.hypot(x1 - x0, y1 - y0), nx = -(y1 - y0) / l, ny = (x1 - x0) / l, q = 1 - k;
    const a = 1 - q * nx * nx, b = -q * nx * ny, d = 1 - q * ny * ny;
    return m.multiply(new DOMMatrix([a, b, b, d, x0 - (a * x0 + b * y0), y0 - (b * x0 + d * y0)]));
  }

  // =============================================================== the mark, drawn by its kind
  // sx: the picture. lx: light laid over it with a soft halo (a glint, a spark), which is never blurred into the mark
  const tools = { c, W, H, T, TAU, RAD, LOOP, sx, lx, layer, clamp, lerp, pr, E, ID, markMatrix, turned };
  let mark = makeMark(tools);
  // a brand's own motion: given the tools and the kind's drawing, it returns what it does differently
  if (wrap) mark = Object.assign({}, mark, wrap(tools, mark));

  // =============================================================== the name
  const LET = c.text ? c.text.letters.map(d => new Path2D(d)) : [], DESC = c.text && c.text.desc ? new Path2D(c.text.desc.d) : null;
  function drawText(t, cam) {
    if (!c.text) return;
    const x = c.text, base = new DOMMatrix(frameOf(cam)).translate(x.ox, x.oy).scale(x.k);
    sx.save(); sx.setTransform(base);
    const done = LOOP || t >= T.word + (x.letters.length - 1) * T.stagger + T.letter;
    if (!done) { sx.beginPath(); sx.rect(...x.clip); sx.clip(); }
    LET.forEach((p, i) => {
      // letters rise out of the baseline one after another
      const e = LOOP ? 1 : E.outExpo(pr(t, [T.word + i * T.stagger, T.letter]));
      sx.fillStyle = x.accent[i] ? x.fill : c.ink;
      sx.setTransform(base.translate(x.at[0], x.at[1] + (1 - e) * x.rise)); sx.fill(p);
    });
    sx.restore();
    if (DESC) {
      const e = LOOP ? 1 : E.outCubic(pr(t, T.desc));
      if (e > 0) { sx.save(); sx.globalAlpha = e; sx.fillStyle = x.fill; sx.setTransform(base.translate(x.desc.at[0], x.desc.at[1] + (1 - e) * x.desc.rise)); sx.fill(DESC); sx.restore(); }
    }
    sx.setTransform(ID);
  }

  // =============================================================== frames
  const [back, bkx] = layer();
  bkx.fillStyle = c.bg; bkx.fillRect(0, 0, W, H);
  if (mark.backdrop) mark.backdrop(bkx);

  const textEnd = c.text ? Math.max(T.word + (c.text.letters.length - 1) * T.stagger + T.letter, c.text.desc ? T.desc[0] + T.desc[1] : 0, T.move[0] + T.move[1]) : 0;
  const end = LOOP ? Infinity : Math.max(T.built, textEnd);
  // while a loop rests, the picture is the still logo
  const resting = t => !!mark.resting && mark.resting(t);
  // how many moments of the shutter to average (1, 4 or 16): more while things move fast
  function samples(t) {
    if (LOOP) return (t / c.duration) % 1 === 0 || resting(t) ? 1 : 4;      // the first frame is the still logo itself, drawn once
    return t >= end ? 1 : 16;
  }
  function sample(t) {
    sx.clearRect(0, 0, W, H); lx.clearRect(0, 0, W, H);
    const cam = camera(t);
    mark.draw(t, cam);
    drawText(t, cam);
  }
  // the picture at time t. On its own it is transparent; with the backdrop it is the finished frame.
  function render(t, backdrop) {
    const K = samples(t), shutter = 0.5 / c.fps, top = Math.log2(K);
    let S = solid, L = light;
    if (K === 1) sample(t);
    else {
      accS.has.fill(false); accL.has.fill(false);
      for (let k = 0; k < K; k++) { sample(t + (k / (K - 1) - 0.5) * shutter); push(accS, solid, 0); push(accL, light, 0); }
      S = accS.keep[top][0]; L = accL.keep[top][0];
    }
    out.globalCompositeOperation = 'source-over'; out.globalAlpha = 1; out.filter = 'none';
    if (backdrop) out.drawImage(back, 0, 0); else out.clearRect(0, 0, W, H);
    out.drawImage(S, 0, 0);
    // light: with a soft halo of its own
    gax.clearRect(0, 0, glowA.width, glowA.height); gax.drawImage(L, 0, 0, glowA.width, glowA.height);
    gbx.clearRect(0, 0, glowB.width, glowB.height); gbx.filter = `blur(${Math.max(2, W / 320)}px)`; gbx.drawImage(glowA, 0, 0); gbx.filter = 'none';
    out.globalCompositeOperation = 'lighter'; out.globalAlpha = 0.7; out.drawImage(glowB, 0, 0, W, H); out.globalAlpha = 1; out.drawImage(L, 0, 0);
    out.globalCompositeOperation = 'source-over';
  }

  window.scene = { width: W, height: H, fps: c.fps, duration: c.duration, end: LOOP ? c.duration : end };
  // returns a key that only changes when the picture does, so the renderer can reuse a frame while nothing moves
  window.seek = (t, backdrop = false) => { render(t, backdrop); return t >= end || (LOOP && resting(t)) ? 'hold' : t.toFixed(5); };
  window.backdrop = () => back.toDataURL('image/png');
  window.still = t => { render(t, true); return view.toDataURL('image/png'); };
  window.seek(0);
}

function sceneHtml(logo, variant, W, H) {
  const c = config(logo, variant, W, H);
  return `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;background:transparent}canvas{display:block}</style></head><body><canvas id="view" width="${W}" height="${H}"></canvas><script>(${client.toString()})(${JSON.stringify(c)}, ${logo.kind.motion.client.toString()}, ${logo.kind.motion.wrap ? logo.kind.motion.wrap.toString() : 'null'})</script></body></html>`;
}
// when a logo is complete, in seconds from the start of its intro
function doneAt(logo) {
  const c = config(logo, 'intro', FORMATS[0][0], FORMATS[0][1]), T = c.T;
  return c.text ? Math.max(T.built, T.word + (c.text.letters.length - 1) * T.stagger + T.letter, c.text.desc ? T.desc[0] + T.desc[1] : 0, T.move[0] + T.move[1]) : T.built;
}

// ---------------------------------------------------------------- render
const png = url => Buffer.from(url.split(',')[1], 'base64');
async function render(browser, job, root) {
  const { logo, variant, W, H } = job;
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.setContent(sceneHtml(logo, variant, W, H));
  if (errors.length) throw new Error(`${job.name}: ${errors[0]}`);
  const { duration } = await page.evaluate(() => window.scene);
  const bg = path.join(os.tmpdir(), `brand-backdrop-${job.name}-${process.pid}.png`);
  fs.writeFileSync(bg, png(await page.evaluate(() => window.backdrop())));
  // The frames are transparent. MP4: laid over the brand background, sRGB to BT.709, tagged, so players show the
  // brand colours as drawn. Transparent: ProRes 4444 for editing, WebM for the web.
  const tags = ['-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv'], to709 = 'scale=in_range=pc:out_range=tv:out_color_matrix=bt709';
  const mp4 = path.join(root, job.name + '.mp4'), clear = path.join(root, 'transparent');
  fs.mkdirSync(clear, { recursive: true });
  const graph = `[0:v]split=3[a][b][w];[1:v][a]overlay=shortest=1:format=gbrp,${to709},format=yuv420p[m];[b]${to709},format=yuva444p10le[p];[w]${to709},format=yuva420p[v]`;
  const outs = ['-map', '[m]', '-c:v', 'libx264', '-preset', 'slow', '-crf', '14', ...tags, '-movflags', '+faststart', mp4,
    // qscale 8 keeps ProRes within 60 dB of the frames at less than half the default size; the frames carry 8 bits of alpha
    '-map', '[p]', '-c:v', 'prores_ks', '-profile:v', '4444', '-qscale:v', '8', '-alpha_bits', '8', '-vendor', 'apl0', ...tags, path.join(clear, job.name + '.mov'),
    '-map', '[v]', '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '24', '-auto-alt-ref', '0', '-row-mt', '1', '-deadline', 'good', '-cpu-used', '4', ...tags, path.join(clear, job.name + '.webm')];
  const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-', '-loop', '1', '-framerate', String(FPS), '-i', bg, '-filter_complex', graph, ...outs], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((res, rej) => { ff.on('error', () => rej(new Error('ffmpeg did not start: it is needed for moving pictures (see `node run.js doctor`)'))); ff.on('close', code => code === 0 ? res() : rej(new Error(`ffmpeg exited ${code}`))); });
  const frames = Math.round(duration * FPS);
  let key = null, shot = null, drawn = 0;
  for (let i = 0; i < frames; i++) {
    const k = await page.evaluate(t => window.seek(t), i / FPS);
    if (k !== key) { shot = await page.screenshot({ type: 'png', omitBackground: true }); key = k; drawn++; }
    if (!ff.stdin.write(shot)) await new Promise(res => ff.stdin.once('drain', res));
  }
  ff.stdin.end();
  await done;
  fs.unlinkSync(bg);
  if (errors.length) throw new Error(`${job.name}: ${errors[0]}`);
  // the poster: the finished logo (an intro's last frame, a loop's first)
  fs.writeFileSync(mp4.replace(/\.mp4$/, '.png'), png(await page.evaluate(t => window.still(t), variant === 'loop' ? 0 : duration)));
  await page.close();
  return { frames, drawn, mp4 };
}

// every logo, as intro and loop, in every size
const jobs = () => LOGOS.flatMap(logo => VARIANTS.flatMap(variant => FORMATS.map(([W, H]) => ({ logo, variant, W, H, name: `${logo.id}-${variant}-${W}x${H}` }))));
// what the page reads back: every logo, how long each version runs, when it is complete, and which files are there
function notes(root) {
  const has = f => fs.existsSync(path.join(root, f));
  S.save('motion', {
    comment: 'Written by the motion step: the animated logos as the page lists them.', fps: FPS, formats: FORMATS, variants: VARIANTS,
    logos: LOGOS.map(l => ({ id: l.id, label: l.label || null, of: l.of || null, named: !!l.word, mark: l.mark || null, accent: l.accent || null, of_mark: l.kind.id, done: +doneAt(l).toFixed(2), duration: Object.fromEntries(VARIANTS.map(v => [v, config(l, v, FORMATS[0][0], FORMATS[0][1]).duration])) })),
    words: Object.fromEntries(MOVING.map(m => [m.id, m.motion.words || {}])),
    made: jobs().filter(j => has(j.name + '.mp4')).length, clear: jobs().filter(j => has(`transparent/${j.name}.webm`) && has(`transparent/${j.name}.mov`)).length, of: jobs().length,
  });
}

async function main() {
  const OUT = S.OUT, filter = S.args.rest[0] || '';
  if (!LOGOS.length) throw new Error('no mark of this brand has a way to move');
  const root = path.join(OUT, 'motion');
  fs.mkdirSync(root, { recursive: true });
  const list = jobs().filter(j => j.name.includes(filter));
  const browser = await launchFilm();
  const t0 = Date.now();
  let next = 0;
  await Promise.all(Array.from({ length: 3 }, async () => {
    while (next < list.length) {
      const j = list[next++], res = await render(browser, j, root);
      console.log(`${j.name}  ${res.frames} frames (${res.drawn} drawn)  ${(fs.statSync(res.mp4).size / 1024).toFixed(0)} KB`);
    }
  }));
  await browser.close();
  notes(root);
  console.log(`${list.length} animations in ${((Date.now() - t0) / 1000).toFixed(0)}s -> ${root}`);
}

module.exports = { LOGOS, FORMATS, VARIANTS, FPS, jobs, sceneHtml, config, doneAt };
if (require.main === module) main().catch(e => { console.error(e.message); process.exit(1); });
