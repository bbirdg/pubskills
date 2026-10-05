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
run motion <folder> intro-1080x1080
```

The word after the folder picks the files whose names hold it. Look at the result (open the MP4, or read the PNG
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
- `loop`: how long each step of the loop lasts, in seconds.

## A motion of the brand's own

When the mark shows a thing that moves in its own way, write that. Name a file in the mark's settings:

```json
"motion": { "module": "motion.js" }
```

`example/brand/motion.js` is a complete one, forty lines, in which a kite rises on the wind with its tail
trailing. Copy its shape. The file exports one function that returns only what it does differently:

```js
module.exports = (kind, S, builtIn) => ({
  timing: { built: 1.5 },
  config(c, logo) { builtIn.config(c, logo); c.mine = { /* numbers the page needs */ }; },
  wrap: function (k, base) {
    function draw(t, cam) {
      if (k.LOOP || t >= k.T.built) return base.draw(t, cam);
      /* draw the mark at time t */
    }
    return { draw };
  },
  words: { intro: 'One sentence the page says about it.' },
});
```

How it fits together:

- **`wrap` runs in a browser page, not in Node.** The engine writes its source into the page, so it can see only
  its two arguments. Anything else it needs (a point, a list, a number) must be put into `c` by `config`, which
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
  filled with `c.ink`. The example shows the four lines.
- **End exactly on the still logo.** From `T.built` on, hand over to `base.draw`. Make every offset of yours a
  multiple of something that reaches zero at `T.built`, so that nothing jumps at the hand-over.
- **Leave the loop to the engine** unless you have a loop in which no shape moves.
- Every frame must depend on `t` alone. No randomness, no counters, no clock.

Then render one, look, adjust. `run check` tests that every loop ends on the frame it starts on.

## Moving backgrounds

`run art-motion` turns the art of the brand's own tone into ten-second loops. Nothing in a picture moves: light
runs along the lines and across the shapes that are already there. They come as MP4 on the background and as
transparent WebM. There is nothing to design here, only to render, at half a minute to a minute for each loop: a brand with two colours has three dozen, so say so before you start.
