# Colour and type

## How colour works in this system

A brand has a short list of neutrals and one or more **accents**. An accent is the only colour: it paints the
accent part of the mark, the line under the name, links and the one button that matters. Everything else is white
on dark and ink on light.

That restraint is the point. It is why the mark is recognisable in every version, and why a second colour can mean
something.

### A family of brands

Several brands can wear one mark:

```json
"brands": [
  { "word": "Kitewell", "accent": "breeze" },
  { "word": "Kitewell", "desc": "WORKSHOP", "accent": "poppy" }
]
```

- `word` is the name as written beside the mark. It is turned into outlines.
- `desc` is a short line under the name, in capitals, in the accent: a branch, a product, "A ... company".
- `tail` is how many of the name's last letters take the accent (`"word": "BrandX", "tail": 1` colours the X).
- `accent` names one of the brand's accents. Left out, the brand takes the first accent. `null` means none: the
  brand is plain white on dark and black on light.

A pattern that works well: **the parent carries no accent, and colour always means a branch.** A single brand with
one accent is fine too. Do not give two brands accents that are hard to tell apart.

### Choosing an accent

```json
"accents": {
  "breeze": { "label": "Breeze", "stops": ["#12B5CB", "#7CF0C4"] }
}
```

- The key (`breeze`) goes into file names, so it is lower-case letters and digits. The label is what people read.
- `stops` is one, two or three colours. One gives a flat colour. Two or three give a gradient that runs along the
  accent part: keep them in **one colour family**, lighter towards one end. A rainbow is not an accent.
- The rest is worked out and can be overridden: `solid` (the flat version, the middle stop), `stopsLight` (deeper
  stops for use on white, where pale colours fade), `onLight` (the flat version for white), `onAccent` (ink or
  white, whichever reads on it).

Test it, do not trust your eye: `run check` computes contrast. An accent should reach **3:1** against the
background it sits on, and text on a solid accent **4.5:1**. If the strongest stop fails on white, set
`stopsLight` yourself.

To show accent options, write each as a small file and lay it over the settings:

```json
{ "colours": { "accents": { "breeze": { "stops": ["#12B5CB", "#7CF0C4"] } } } }
```

```bash
run logos <folder> --marks --with options/colour/a.with.json --out options/colour/a
run sheet <folder> "A=options/colour/a/logos/<mark>/svg/mark/<mark>-mark-<accent>-on-dark.svg|options/colour/a/logos/<mark>/svg/mark/<mark>-mark-<accent>-on-light.svg" "B=...|..." --title="The accent"
```

`--marks` makes the mark's own files only, which need no font, so colour can be chosen before type. Two files
joined by `|` are one option: the first is shown on the sheet's dark panel and the second on its light one. Once
there is a font, show lockups the same way (leave `--marks` out and point at `.../svg/lockup/...-horizontal-...`).
The sheet's other switches: `--on=dark` or `--on=light` for one panel only, `--cols=3`, `--out=options/colour/sheet`
for where it is written, and `--with` so that its panels take a trial ink or white.

### Neutrals and tone

`"tone": "dark"` or `"light"` says which surface the brand is at home on. It decides the background of banners,
profile pictures, favicons and animations. Both tones of every logo file are made either way.

`ink` is the brand's dark and `white` is its light. They are not always black and white: a bakery on cream paper
with brown lettering sets `"ink": "#3B2416"` and `"white": "#F6EBDD"`, and every dark surface, every light surface
and every one-colour logo follows. The greys between them (three surfaces, a line, three text greys, the paper
tones) are worked out from the two, so a brown ink gets warm surfaces. Set single ones under `neutrals` only if
the brand needs its own, and run `check` after: it says when text and background have come too close.

## Type

### Choosing the typeface

A brand's typeface is chosen for that brand, by looking. It is the strongest lever after the mark, and the easiest
one to get wrong by habit: an assistant that reuses the font it used last time makes every brand look like the
last one. So:

1. **Pick three or four candidates of clearly different character**, from what the person said the brand should
   feel like. Not four geometric sans faces. One from each of a few of these families of style:

   | Style | Feels | Open typefaces to start from |
   | --- | --- | --- |
   | Geometric sans | modern, plain, confident | Montserrat, Outfit, Jost, Urbanist, Lexend |
   | Humanist sans | warm, readable, friendly | Nunito Sans, Source Sans 3, Open Sans, Figtree |
   | Grotesque | sober, editorial, technical | Inter, Work Sans, Archivo, Hanken Grotesk |
   | Rounded | soft, playful, approachable | Nunito, Rubik, Quicksand, Fredoka, Comfortaa |
   | Slab serif | sturdy, crafted, honest | Bitter, Roboto Slab, Aleo, Rokkitt |
   | Serif | established, literary, refined | Source Serif 4, Literata, Newsreader, Playfair Display |
   | Condensed | loud, sporty, urgent | Oswald, Barlow Condensed, Big Shoulders Display |
   | Technical | digital, engineered, precise | Exo 2, Space Grotesk, Chakra Petch, JetBrains Mono |

   These are starting points, not a menu: any typeface under the SIL Open Font License will do, and the person's
   own licensed font can set the name (see below).

2. **Ask before fetching.** `run typeface <folder> "Bitter" "Nunito" "Exo 2"` says what would be downloaded: each
   file's name, its size and where it comes from (the Google Fonts collection on GitHub, where every family under
   `ofl/` carries its licence). Tell the person, and when they agree run it again with `--yes`. The files and their
   licences land in `brand/fonts/`. Fonts that are already on the computer need no fetching: give their paths.

3. **Show the real lockup in each**, side by side:

   ```bash
   run typesheet <folder> "fonts/Bitter[wght].ttf" "fonts/Nunito[wght].ttf" "fonts/Exo2[wght].ttf"
   run typesheet <folder> "fonts/Nunito[wght].ttf@Regular" "fonts/Nunito[wght].ttf@ExtraBold"
   ```

   Each option is the brand's own lockup, on dark and on light. `@Weight` after a file sets the name in that
   weight: **how heavy the name is changes a logo as much as the typeface does**, so show the front-runner light
   and heavy before the person decides. Give your recommendation and the reason in a sentence.

4. **Take the one they choose.** Each option's settings are in `options/type/<letter>.with.json`: copy its `type`
   block into `brand.json` (without its `"weights"` line, so that every weight is built, and without
   `"display": null`), run `run fonts` and `run logos`, and discard `options/type`.

**Never use the typeface in `example/` for another brand.** It is the example's own. A brand that ends up in it
did not have its type chosen.

### The name beside the mark

The name is set in a font file and converted to outlines, so no logo file ever needs a font installed.

- By default it is set in the **ExtraBold weight of the brand's own family**, and the line under it in SemiBold.
  That needs the fonts step to have run first.
- Or name any font file you have the right to use: `"type": { "wordmark": { "font": "fonts/Some-Bold.ttf" } }`. It
  must be a single-weight TTF or OTF, not a variable font.
- A lighter name is `"font": "family:Regular"` (or `Light`, `Medium`, `Bold`...). If the source does not reach a
  weight, the step says which weights it has.
- `tracking` tightens or loosens it (the default, `-0.03`, is slightly tight: a light name usually wants `0` to
  `0.04`). The line under the name is spaced wide (`0.42`) and small (`0.32` of the name's size).
- The name is set without ligatures, one letter to a character, as tracked type should be.

### The brand's own font family

The engine can build a family named after the brand, in up to nine weights, as TTF and WOFF2:

```json
"type": {
  "family": {
    "name": "Kitewell Sans",
    "sources": [
      { "script": "latin", "name": "Raleway", "file": "fonts/Raleway[wght].ttf", "licence": "fonts/OFL-Raleway.txt" }
    ]
  }
}
```

What it does: cuts each weight from the source's variable font, renames the family, and adds the brand's own
characters to every weight. The mark becomes a character (U+E000), so it can sit in a line of text, along with a
star, a check mark and a cross drawn in each weight's own stroke.

**The licence rule is strict.** A source must be under the **SIL Open Font License**, which allows renaming,
changing and shipping a font as long as the licence text travels with it. The engine reads the licence from the
font itself and refuses anything else. It also refuses a family name that uses a name the source's licence
reserves, so call the family after the brand, never after the source.

Where sources come from: `run typeface` (above) finds a family in the Google Fonts collection and fetches its
**variable** file, the one with a weight axis, together with its licence. **Ask the person before downloading**:
the step prints the file name, where it comes from and its size, and fetches nothing until it is run with `--yes`.
A family with no variable file cannot be built into nine weights, but one of its files can still set the name in
the logo: the step lists them, and `--file=<name>` fetches one.

The font files are named after the family with nothing but its letters and digits: "Oat & Ember Sans" gives
`OatEmberSans-Bold.ttf`.

If the brand should simply use an existing font as it is, leave `family` out and name the font stack in
`type.fallback`. Then give `wordmark.font` a file of its own.

### A second script

For a brand that writes in two scripts, add a second source. Its script is joined to the first, with one name and
one set of line heights:

```json
"sources": [
  { "script": "latin", "name": "Montserrat", "file": "fonts/Montserrat[wght].ttf", "licence": "fonts/OFL-Montserrat.txt" },
  { "script": "arabic", "name": "Alexandria", "file": "fonts/Alexandria[wght].ttf", "licence": "fonts/OFL-Alexandria.txt" }
]
```

Pick two typefaces drawn to sit together: similar weight range, similar proportions. Arabic is the pairing this was
built and tested for. Hebrew, Greek, Cyrillic, Thai and Devanagari follow the same path and are untested: build
them, then look hard at joins, marks and line heights before trusting them. Never letter-space a joined script.

### A font for titles

Optional. A display cut is the heaviest weight with every round dot (on i and j, in punctuation, in accents)
turned into a small square. Nothing else changes, so a title sets exactly as wide as in the plain weight.

```json
"display": { "name": "Northwind Display", "lean": 0, "share": 0.8 }
```

`lean` is the square's tilt in degrees: 0 stands it on a corner as a diamond, 45 stands it upright. `share` is its
area against the dot's. If the squares come too near their letters the step stops and says so: make `share`
smaller or bring `lean` towards 45. Offer a display cut when the brand wants a title face of its own and the
squares echo something in the mark. Otherwise leave it out: one family is enough.

It only works on a typeface whose dots are round. Many draw them as squares already (Raleway does, which is why
the example has no display cut): the step says so and stops, and the answer is to leave `display` out.

### How type is used

- **One line leads.** The heaviest weight, or the display cut, is for the one title of a screen or a picture.
- **Bold for headings, spaced capitals for labels, a medium weight for reading.** The weights are in
  `type.weights` and go into the tokens.
- **The logos are not set in live text.** Nobody retypes the name: they use the lockup files.

## Tokens

`run logos` writes `final/tokens/<id>.css` and a JSON twin: every colour, the accent in use, the fonts, weights,
tracking, corner radii and spacing, as variables named `--<prefix>-...`. The prefix comes from the brand's name
(`"prefix"` sets it). A website or an app that takes the tokens takes the whole system.
