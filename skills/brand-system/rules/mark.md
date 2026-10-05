# The mark

Everything is drawn from one file: `brand/mark.svg`. Get it right before anything else is made.

## What the engine needs

A flat mark made of **parts**. Each part is one closed, filled shape.

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 609 1026">
  <path id="top-left" d="M342.9 239.9L103 147.8L435 0Z"/>
  <path id="bottom-right" class="accent" d="M359.1 276.1L604.9 370.5L186.9 724.6Z"/>
</svg>
```

- **One element for each part**, with an `id` that names it in plain words (`body`, `wing`, `tail`). The names show
  up in the page, in settings and in error messages.
- **`class="accent"` on the part that takes the brand's colour.** The other parts stay white on dark and ink on
  light, so the mark is the same mark in every colour version. If no part is marked, the whole mark takes the colour.
- Paths, rectangles, circles, ellipses and polygons are all read. Transforms are worked out. A line with a stroke is
  turned into the outline of its stroke. A shape with a hole is one part.
- **Not read:** text (turn letters into outlines), pictures inside the SVG, `<use>`, gradients, filters, masks and
  clipping. Colours in the file are not kept at all: the brand's colours come from the settings.
- Any size and any `viewBox`. The engine sizes the mark so that its longer side is 1000 units.

A brand can have more than one mark (a company and its product, say). Each is its own file and its own entry under
`marks` in the settings.

## From a picture

If all they have is a PNG or a JPG:

```bash
run trace concept/their-logo.png --out=options/mark/traced.svg
```

It finds the flat colours, follows each edge to a fraction of a pixel, keeps corners sharp, and writes one part for
each separate shape. Use the largest, cleanest picture they have. Text beside the logo is traced too: delete it.

A traced outline is faithful and rough. It has several times the points a drawn one needs, and long edges wobble
slightly. **Tracing is where cleaning starts, not where it ends.**

## Cleaning a mark

Work on the SVG by hand. For each part:

1. **Fewer points.** A smooth curve needs a point at each end and at each place the curve changes direction, and
   no others. A part of a simple mark rarely needs more than a dozen. The mark step counts them and warns over 40.
2. **True shapes.** A straight edge is two points. A corner is one point with no handle on the straight side. An
   arc that should be part of a circle should be one.
3. **Even gaps.** Where two parts run beside each other, the gap between them should be the same all the way
   along. About 2% of the mark's width reads well and survives small sizes. The mark step measures each gap.
4. **Keep their shape.** Stay within a hair of the original outline wherever it was already good. You are removing
   noise, not redrawing.

Then test small. The sheet from the mark step shows the mark at 16, 24, 32, 48, 64 and 96 px in white and in black.
Look at it. Gaps closing at 16 px is normal and fine if the silhouette still reads. A part that disappears is not.

## Drawing a mark from nothing

If there is no logo, show three directions that are really different (not three weights of one idea), each as a
finished mark. Good marks for this system:

- are **two to five parts**, each a simple shape
- have **one part that can carry the colour** and still leave the mark recognisable in one flat colour
- read as a **silhouette** at 16 px
- show **one thing**. A mark that is a bird and also a letter and also an arrow is three weak marks

Write each direction as its own SVG in `options/mark/`, with real coordinates you have thought about. Compute
geometry rather than guessing it: a constructed shape (even gaps, true angles, a consistent lean) looks made, and
an eyeballed one looks approximate.

## The mark step

```bash
run mark <folder>
```

It writes `brand/mark.json`, which every other step reads, and prints what it measured:

- the size and proportions, and each part with its number of points and its share of the area
- **where a lockup can sit inside the outline**, and how large the mark is drawn behind one. Banners and two kinds
  of art seat the logo inside the enlarged mark. A mark with no roomy place inside gets plain banners instead
- the gap between each pair of neighbouring parts, and the width below which the gaps close
- notes on anything that will cause trouble: too many points, a tiny part, parts that overlap, text or pictures in
  the file that were not read

It also writes a **sheet** (`.build/mark-<id>.png`): the mark on dark and on light, as lines, with its parts named,
and at small sizes. Read that picture yourself every time. The numbers tell you what was read, and the picture
tells you whether it is right.

## Trying a mark without replacing the current one

Keep each candidate in `options/mark/` with a small file that points the settings at it:

```json
{ "marks": [{ "file": "../options/mark/b.svg" }] }
```

Save that as `options/mark/b.with.json`, then:

```bash
run mark <folder> --with options/mark/b.with.json
run sheet <folder> "Theirs=options/mark/a-sheet.png" "Cleaned=options/mark/b-sheet.png" --on=dark --title="The mark"
```

The first mark in the settings is changed by the first item of the list, and so on. The candidate's own sheet is
written beside it as `b-sheet.png`: the mark on dark and on light, with its parts named, and at small sizes. Those
sheets are what the person compares at this gate. Nothing else is needed yet, and no font.

To show the marks as the real files they will become (the mark alone, the square icon, the profile picture):

```bash
run logos <folder> --marks --with options/mark/b.with.json --out options/mark/b
run sheet <folder> "Cleaned=options/mark/b/logos/<mark>/svg/mark/<mark>-mark-white.svg|options/mark/b/logos/<mark>/svg/mark/<mark>-mark-black.svg" --title="The mark"
```

`--marks` leaves the lockups out, since the name has no font yet. Two files joined by `|` are one option with a
file for each panel of the sheet: a white mark cannot be seen on the light panel, so its black twin is given there.

## What you can set for a mark

In `brand.json`, under the mark (see [settings.md](settings.md) for all of it):

- `accentParts`: the ids that take the colour, instead of `class="accent"` in the drawing
- `accentAxis`: `[x1, y1, x2, y2]` in the mark's 1000 units, the line a gradient runs along. Measured if not given
- `inside` and `scale`: where a lockup sits inside the enlarged mark and how large the mark is drawn behind it
- `nudge`: moves the mark down in profile pictures, as a share of the square (`0.01`), when it looks too high in a
  circle
- `keepStarts`: `true` to leave each outline's first point where you drew it. Otherwise each outline is made to
  start at its point nearest the middle of the mark, so that a line drawn in motion grows outwards

## A mark the built-in kind cannot draw

A mark that is not flat shapes with one colour (a ball with shading and a number, say) can have a kind of its own:
a file in `brand/` that says how to draw it, named under `"kind"` in the mark's settings. It gives the same things
the built-in kind gives (`lib/kinds/parts.js` in the engine is the model): the still drawing in each colourway,
and, if wanted, its own art and its own motion. This is real programming work. Reach for it only when the mark
truly needs it, and tell the person it is a larger job.
