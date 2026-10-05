# Motion

## What makes a logo animation good

- **It does what the subject would do.** A kite rises on the wind. A ball lands and turns. A door opens. Ask what
  the mark shows, then how that thing moves, and animate that. If the mark shows nothing that moves (an abstract
  shape, a letter), let it be assembled from its own parts and leave it at that.
- **It is built from the mark's own shapes.** Nothing is bent or stretched. The parts arrive, turn or are drawn, and
  they end as the still logo, exactly.
- **Nothing is added for show.** No glow, no particles, no trails, no bounce for the sake of bounce. Fast movement
  is blurred the way a camera would blur it, which the engine does by itself.
- **In a loop, the logo's shapes do not move.** A loop sits under a stream or at the end of a video for a long
  time. A logo that keeps wobbling is tiring. Light may travel, an outline may redraw itself, but every shape stays
  where the still logo has it. A loop begins and ends on the still logo, so an intro cuts straight into it and it
  repeats without a jump.
- **Short.** The mark is complete in about a second and a half, the name follows, and then it holds still.

If you are not sure which of two motions is right, render both for one logo and show them side by side.

## What the engine makes

For each brand, an intro and a loop, with the name and as the mark alone, in three sizes (wide, tall, square).
Each one comes as:

| File | What | For |
| --- | --- | --- |
| `motion/<name>.mp4` | H.264, on the brand's background | posting as it is, end cards |
| `motion/transparent/<name>.mov` | ProRes 4444, no background | editing software |
| `motion/transparent/<name>.webm` | VP9, no background | the web, stream overlays |
| `motion/<name>.png` | the finished logo | the poster frame |

Sixty frames a second, no sound. Every frame is drawn from the time alone, so a render can always be repeated.

It takes about 10 seconds for each animation, and a brand with two colours has two dozen. **Render one first:**

```bash
run motion <folder> kitewell-intro-1080x1080
```

The word after the folder picks the animations whose names hold it. A name is the brand's id, then `intro` or
`loop`, then the size (`kitewell-intro-1080x1080`). The mark alone is `<mark id>-<accent>-mark-...`. Look at the result (open the MP4, or read the PNG
poster and a frame or two), and only render the whole set when the motion is approved. Say how long it will take.

## The built-in motion

For a flat mark made of parts:

- **Intro:** each part turns from edge-on to flat, one after another, and the whole mark settles as they arrive.
  Then the view pulls back and the name rises out of its baseline, letter by letter.
- **Loop:** each part opens into its own outline, the outline runs off, grows back from where it starts and fills
  again, one part after another. No shape moves.

It suits marks that are assembled things: facets, blades, petals, letters. Its settings, under the mark in
`brand.json`:

```json
"motion": {
  "arrive": ["body", "wing", "head"],
  "order": ["wing", "body", "head"],
  "built": 1.12,
  "parts": { "wing": { "intro": [0.3, 0.55], "lag": 0.22, "turn": [144, 257, 505, 470] } },
  "loop": { "rest": 0.8, "open": 0.8, "off": 0.65, "gone": 0.1, "draw": 0.8, "fill": 0.9 }
}
```

- `arrive`: the order the parts turn up in. Left out, it is the order of the drawing. Start with the part that
  anchors the mark and end with the one that completes it.
- `order`: the order they are painted in, the last on top. It matters only where parts cross while they turn.
- `built`: the second at which the mark is complete. The name starts to arrive just before it.
- For one part: `intro` is the start and the length of its turn in seconds, `lag` is how long after the first part
  it starts in the loop, and `turn` is the line it turns about, as two points in the mark's units. The mark step
  measures a line for each part (its long way across). A part should turn about the edge it would be hinged on.
- `loop`: how long each step of the loop lasts, in seconds. The loop itself is 6 seconds (`"loopLength"` changes
  it). The steps and the last part's `lag` must fit inside it, so that the mark is back at rest before the loop
  repeats: the step stops and says so if they do not.

## A motion of the brand's own

When the mark shows a thing that moves in its own way, write that. Name a file in the mark's settings:

```json
"motion": { "module": "motion.js" }
```

The file exports one function that returns only what it does differently. Here is a complete one, for a mark
that is a kite with a part called `tail`: it rises on the wind with its tail trailing. Copy its shape.

```js
// How a kite moves in its intro: it rises on the wind from below, leaning back, its tail trailing behind it,
// and settles at its lean. A kite is a thing that flies, so that is what it does.
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
```

How it fits together:

- **`wrap` runs in a browser page, not in Node.** The engine writes its source into the page, so it can see only
  its two arguments. Write it as `wrap: function (k, base) { }` or as `wrap(k, base) { }`: both work. Anything else it needs (a point, a list, a number) must be put into `c` by `config`, which
  runs in Node and can use `kind.parts` and the rest.
- **`k`, the tools:** `c` (the settings of this animation), `W` and `H` (the frame), `T` (the timing: `T.built`),
  `LOOP` (true in a loop), `sx` (the canvas to draw on), `lx` (a second canvas for light, laid over with a soft
  halo), `E` (easings: `inCubic`, `outCubic`, `inOutCubic`, `outExpo`, `outBack`), `pr(t, [start, length])`
  (progress from 0 to 1), `lerp`, `clamp`, `markMatrix(x, y, width, turn)`, `turned(matrix, line, share)`, `ID`.
- **`base`, the built-in drawing:** `base.draw(t, cam)` and `base.parts`, one for each part with its `id`, its
  `accent` flag and its `shape` (a `Path2D` in the mark's units).
- **Where the mark stands.** At rest it is `c.rest.w` wide, centred on `c.rest.cx`, `c.rest.cy`. The view moves
  while the name arrives, so always place it through the camera:

  ```js
  const w = c.rest.w * cam.g, x = W / 2 + cam.g * (c.rest.cx - cam.fx), y = H / 2 + cam.g * (c.rest.cy - cam.fy);
  sx.setTransform(markMatrix(x, y, w, 0));
  ```

- **Paint.** A part with `accent` is filled with a gradient along `c.mark.axis` through `c.stops`. The rest is
  filled with `c.ink`. The sample above shows the four lines.
- **End exactly on the still logo.** From `T.built` on, hand over to `base.draw`. Make every offset of yours a
  multiple of something that reaches zero at `T.built`, so that nothing jumps at the hand-over.
- **Leave the loop to the engine** unless you have a loop in which no shape moves.
- Every frame must depend on `t` alone. No randomness, no counters, no clock.

Then render one, look, adjust. `run check` tests that every loop ends on the frame it starts on.

## Moving backgrounds

`run art-motion` turns the art of the brand's own tone into ten-second loops. Nothing in a picture moves: light
runs along the lines and across the shapes that are already there. They come as MP4 on the background and as
transparent WebM. There is nothing to design here, only to render, at half a minute to a minute for each loop: a brand with two colours has three dozen, so say so before you start.
