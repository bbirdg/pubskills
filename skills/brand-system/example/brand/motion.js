// How the Kitewell kite moves in its intro: it rises on the wind from below, leaning back, its tail trailing
// behind it, and settles at its lean. A kite is a thing that flies, so that is what it does.
// The loop is left to the engine: there no shape moves, and the mark redraws itself in place.
//
// This file is named by "motion": { "module": "motion.js" } in the mark's settings. It is given the mark's kind,
// the engine's shared definitions and the built-in motion, and returns only what it does differently.
module.exports = (kind, S, builtIn) => ({
  // built: the moment the mark is complete, in seconds. The name starts to arrive just before it
  timing: { built: 1.5 },

  // what the page is told (it runs in a browser and sees nothing else of this file)
  config(c, logo) {
    builtIn.config(c, logo);
    // the tail swings about the point where it meets the kite: the first point of its outline
    const start = kind.parts.find(p => p.id === 'tail').d.match(/^M(-?[\d.]+) (-?[\d.]+)/);
    c.kite = { tail: 'tail', pivot: [+start[1], +start[2]] };
  },

  // The drawing, in the page. k: the engine's tools. base: the built-in drawing, with base.parts (each part's
  // shape) and base.draw. It must be written to stand alone: it cannot see anything outside itself but k and base.
  wrap: function (k, base) {
    const { c, W, H, T, sx, E, pr, LOOP, ID, markMatrix } = k;
    function draw(t, cam) {
      // the loop, and the intro once the kite is in place, are the engine's own
      if (LOOP || t >= T.built) return base.draw(t, cam);
      // left: how much of the rise is still to come, from 1 below the picture to 0 in place
      const left = 1 - E.outCubic(pr(t, [0.05, T.built - 0.05]));
      const w = c.rest.w * cam.g, x = W / 2 + cam.g * (c.rest.cx - cam.fx), y = H / 2 + cam.g * (c.rest.cy - cam.fy);
      // it comes up from below and a little to the left, leaning back, and a gust rocks it as it settles
      const m = markMatrix(x - left * w * 0.5, y + left * (H * 0.5 + w), w, -0.42 * left + Math.sin(t * 9) * 0.05 * left);
      // the tail trails behind, and still swings after the kite has stopped
      const swing = (0.7 * left + Math.sin(t * 11) * 0.22 * (1 - E.outCubic(pr(t, [0.3, T.built - 0.3])))) * 180 / Math.PI;
      const a = c.mark.axis, at = c.kite.pivot;
      for (const p of base.parts) {
        sx.setTransform(p.id === c.kite.tail ? m.multiply(new DOMMatrix().translate(at[0], at[1]).rotate(swing).translate(-at[0], -at[1])) : m);
        let paint = c.ink;
        if (p.accent) { paint = sx.createLinearGradient(a[0], a[1], a[2], a[3]); c.stops.forEach((s, i) => paint.addColorStop(i / (c.stops.length - 1), s)); }
        sx.fillStyle = paint; sx.fill(p.shape);
      }
      sx.setTransform(ID);
    }
    return { draw };
  },

  // the sentence the page says about it
  words: { intro: 'The kite rises on the wind from below, its tail trailing, and settles at its lean.' },
});
