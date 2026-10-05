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
run logos <folder> --with options/colour/a.with.json --out options/colour/a
run sheet <folder> "A=options/colour/a/logos/<mark>/svg/lockup/<brand>-horizontal-<accent>-on-dark.svg" "B=..." --title="The accent"
```

Show each option on dark and on light (the sheet does both), at the size of a real lockup.

### Neutrals and tone

`"tone": "dark"` or `"light"` says which surface the brand is at home on. It decides the background of banners,
profile pictures, favicons and animations. Both tones of every logo file are made either way.

The neutrals have sound defaults (a near-black ink, three dark surfaces, three text greys, paper). Change `ink` or
single neutrals under `colours` only if the brand needs its own, and run `check` after.

## Type

### The name beside the mark

The name is set in a font file and converted to outlines, so no logo file ever needs a font installed.

- By default it is set in the **ExtraBold weight of the brand's own family**, and the line under it in SemiBold.
  That needs the fonts step to have run first.
- Or name any font file you have the right to use: `"type": { "wordmark": { "font": "fonts/Some-Bold.ttf" } }`. It
  must be a single-weight TTF or OTF, not a variable font.
- `tracking` tightens or loosens it (the default, `-0.03`, is slightly tight). The line under the name is spaced
  wide (`0.42`) and small (`0.32` of the name's size).

Type options are the strongest lever on how a brand feels. Show the real lockup in two to four typefaces.

### The brand's own font family

The engine can build a family named after the brand, in up to nine weights, as TTF and WOFF2:

```json
"type": {
  "family": {
    "name": "Kitewell Sans",
    "sources": [
      { "script": "latin", "name": "Spartan", "file": "fonts/Spartan-VariableFont_wght.ttf", "licence": "fonts/OFL-Spartan.txt" }
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

Where sources come from: the Google Fonts collection keeps open fonts with their licence files
(`github.com/google/fonts`, in the `ofl` folder, one folder for each family). You need the **variable** file, the
one with a weight axis (its name ends in `[wght].ttf` or `VariableFont_wght.ttf`), and its `OFL.txt`. **Ask the
person before downloading**, and say the file name, where it comes from and its size. Put both files in
`brand/fonts/`.

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
"display": { "name": "Kitewell Display", "lean": 0, "share": 0.66 }
```

`lean` is the square's tilt in degrees: 0 stands it on a corner as a diamond, 45 stands it upright. `share` is its
area against the dot's. If the squares come too near their letters the step stops and says so: make `share`
smaller or bring `lean` towards 45. Offer a display cut when the brand wants a title face of its own and the
squares echo something in the mark. Otherwise leave it out: one family is enough.

### How type is used

- **One line leads.** The heaviest weight, or the display cut, is for the one title of a screen or a picture.
- **Bold for headings, spaced capitals for labels, a medium weight for reading.** The weights are in
  `type.weights` and go into the tokens.
- **The logos are not set in live text.** Nobody retypes the name: they use the lockup files.

## Tokens

`run logos` writes `final/tokens/<id>.css` and a JSON twin: every colour, the accent in use, the fonts, weights,
tracking, corner radii and spacing, as variables named `--<prefix>-...`. The prefix comes from the brand's name
(`"prefix"` sets it). A website or an app that takes the tokens takes the whole system.
