# The settings: `brand/brand.json`

One file tells the engine everything. A key that is left out takes its default, so a working file can be this short:

```json
{
  "name": "Kitewell",
  "colours": { "accents": { "breeze": ["#12B5CB", "#7CF0C4"] } },
  "type": { "wordmark": { "font": "fonts/Some-Bold.ttf" } },
  "marks": [{ "brands": [{ "word": "Kitewell" }] }]
}
```

The one thing with no default is the font the name is set in. Give `type.wordmark.font` a font file, as here, or
give the brand a `type.family` and run the fonts step first.

A full one is at the end of this page. The engine reads the file fresh on every run and says what is wrong with
it in plain words. Unknown keys are ignored, so a `"comment"` is fine anywhere.

## The brand

| Key | Default | What it is |
| --- | --- | --- |
| `name` | required | The brand's name, as written |
| `id` | from the name | Lower-case letters, digits and hyphens. It names the token files and the first mark. Made from the name: letters and digits kept, accents dropped, everything else a hyphen ("Oat & Ember" gives `oat-ember`). A name in another alphabet needs an `id` written out |
| `prefix` | from the name | Starts the names of the CSS variables: `--ki-accent`. Two or three letters |
| `url` | none | The brand's address. It goes into the fonts' own information |
| `tone` | `"dark"` | `"dark"` or `"light"`: the surface the brand is at home on |
| `year` | this year | The year in the fonts' copyright line |

## `colours`

| Key | Default | What it is |
| --- | --- | --- |
| `ink` | `#0C0C0E` | The dark of the brand: the dark background, and text on light. Must be darker than `white` |
| `white` | `#FFFFFF` | The light of the brand: every light surface. A brand on cream gives its cream here |
| `neutrals` | a ramp from ink to paper | Any of `surface-1`, `surface-2`, `surface-3`, `line`, `text-3`, `text-2`, `text`, `paper-2`. With an ink or a white of the brand's own they are worked out from the two |
| `paper` | three greys | `paper-3`, `paper-line`, `paper-soft`: a quiet fill and two lines for light surfaces. Worked out the same way |
| `deep` | a shade under ink | The far edge of a soft light in dark art |
| `semantic` | green, red, blue | `success`, `danger`, `info`: for states only |
| `accents` | none | The brand's colours. See below |

An accent, under a key of lower-case letters and digits:

| Key | Default | What it is |
| --- | --- | --- |
| `stops` | required | One, two or three colours. A bare list or a single colour may stand for the whole accent |
| `label` | the key, capitalised | What people read |
| `use` | the brands that wear it | A few words on where it is used |
| `solid` | the middle stop | The flat version |
| `stopsLight` | the stops, deepened | The stops for use on white |
| `onLight` | `solid`, deepened | The flat version for use on white |
| `onAccent` | whichever reads | `"ink"` or `"white"`: text on the solid accent |

The first accent is the one in use by default. `black`, `white`, `color` and `colour` cannot be accent keys.

## `marks`

A list. Each mark:

| Key | Default | What it is |
| --- | --- | --- |
| `id` | the brand's id, for the first | Names its folder and files. Required from the second mark on |
| `label` | `"The mark"` | What the page calls it: "The kite" |
| `file` | `"mark.svg"` | Its drawing, in `brand/` |
| `geometry` | the file's name, as `.json` | Where the mark step writes the outline. Inside the brand folder |
| `turn` | measured | `{ "part id": [x1, y1, x2, y2] }`: the line a part turns about in the built-in intro |
| `kind` | `"parts"` | The built-in flat mark, or the path of a file in `brand/` that draws a mark of its own |
| `brands` | required | Who wears it. See below |
| `accentParts` | from the drawing | The ids of the parts that take the colour |
| `accentAxis` | measured | `[x1, y1, x2, y2]`: the line a gradient runs along, in the mark's 1000 units |
| `inside` | measured | `[x, y]`: where a logo sits when the mark is drawn large behind it |
| `scale` | measured | `{ "wide": 1.29, "tall": 1.9 }`: how many picture-widths wide the mark is drawn behind a logo |
| `nudge` | `0` | Moves the mark down in profile pictures, as a share of the square |
| `keepStarts` | `false` | Leave each outline's first point where it was drawn |
| `glyphHeight` | `0.9` | How tall the mark stands as a character in the font, against a capital letter |
| `art` | all kinds | `{ "skip": ["pattern"], "words": { "sweep": { "label": "...", "note": "..." } } }` |
| `motion` | built in | Timing, or `{ "module": "motion.js" }`. See the rules on motion |
| `about` | written for you | `{ "lead": "...", "facts": ["..."] }` for its page |
| `logo` | none | Anything to add to the tokens under `logo`, such as smallest sizes |

A brand, under a mark:

| Key | Default | What it is |
| --- | --- | --- |
| `word` | required | The name as written beside the mark |
| `desc` | none | A line under the name, in capitals, in the accent |
| `tail` | `0` | How many of the name's last letters take the accent |
| `accent` | the first accent | An accent's key, or `null` for none |
| `id` | from the label | Names its files, and is how `rollout` and `items` name the brand. Must be unique. Made like the brand's id: "Kitewell" with `"desc": "WORKSHOP"` gives `kitewell-workshop`. Write it out when you would rather choose it |
| `label` | the word and the line under it | What the page calls it |
| `dir` | `lockup`, then `lockup-<id>` | The folder of its lockups |
| `motion` | `true` | `false` makes no animated logo for it |
| `page` | `true` | `false` keeps it off the page. Its files are still made |
| `about` | written for you | `{ "lead": "...", "chips": ["..."], "note": "..." }` for its page |

## `type`

| Key | Default | What it is |
| --- | --- | --- |
| `wordmark` | `{ "font": "family:ExtraBold", "tracking": -0.03, "size": 200, "cap": "H" }` | The name beside the mark. `font` is a weight of the brand's family (`family:Regular`, `family:Bold`...), or a font file in `brand/` |
| `descriptor` | `{ "font": "family:SemiBold", "tracking": 0.42, "scale": 0.32, "cap": "H" }` | The line under the name. Where the name has a font file of its own, this takes the same file unless it names another |
| `family` | none | The brand's own font family. See below |
| `weights` | `{ "heading": 700, "label": 600, "body": 500 }` | Which weight does what. `hero` (800 unless there is a display cut) is the weight of titles |
| `tracking` | `{ "hero": "-0.02em", "label": "0.14em" }` | Letter spacing of titles and labels |
| `fallback` | `"Segoe UI", system-ui, sans-serif` | The fonts after the brand's own |
| `samples` | English, and Arabic | `{ "latin": { "d": "...", "h": "...", "l": "...", "b": "...", "w": "..." } }`: the page's sample lines for a script |

`family`:

| Key | Default | What it is |
| --- | --- | --- |
| `name` | required | What the family is called. Not the source's name. Its files are named after it, letters and digits only |
| `sources` | required | A list of `{ "script", "name", "file", "licence" }`. The first is the base. Each must be a variable font with a weight axis under the SIL Open Font License |
| `weights` | all nine the sources reach | A list such as `[400, 600, 800]` |
| `own` | `["marks", "star", "check", "cross"]` | The brand's own characters, in order. Also `{ "module": "file.js" }` for more |
| `display` | none | `{ "name", "lean": 20, "share": 0.86, "cut": "Black", "also": [] }`: a font for titles |
| `version`, `vendor`, `about` | `1.000`, from the id, a sentence | What the font says about itself |

A source's `script` is `latin` for the first, then `arabic`, `hebrew`, `greek`, `cyrillic`, `thai` or
`devanagari`, or give `ranges` as pairs of first and last code point.

## The rest

| Key | Default | What it is |
| --- | --- | --- |
| `art` | three shapes, two sizes | `{ "sizes": [1, 0.5], "shapes": [{ "id", "label", "w", "h", "use" }] }` |
| `motion` | 60 frames, three sizes | `{ "fps": 60, "formats": [[1920, 1080], [1080, 1920], [1080, 1080]], "variants": ["intro", "loop"], "intro": { "lockup": 5, "mark": 4 } }` |
| `tokens` | radii and spacing | `{ "radius": { "s", "m", "l", "pill" }, "space": [...], "logo": { ... } }` |
| `rollout` | none | The places the brand is seen. See the rules on the upload kit |
| `items` | none | The things the brand is put on: cards, bags, stickers. See the rules on items |
| `platforms` | none | Places of the brand's own |
| `about` | written for you | `lead`, `body`, `status`, `statusNote`, `family`, `rollout`, `checks`: the page's words about the brand |
| `page` | | `{ "banned": ["a word"], "credit": true }` |

## Laying settings over settings

`--with file.json` lays a file over `brand.json` for one run. Objects are merged key by key. A list of objects
(the marks, a mark's brands) is merged item by item, so `{ "marks": [{ "file": "../options/mark/b.svg" }] }`
changes only the first mark's drawing. Any other list is replaced whole. With `--out folder` the files go
somewhere else, and nothing in `final/` is touched. Both can be written with a space or with an equals sign
(`--out folder`, `--out=folder`), and both are taken from the brand folder, wherever the command is run from:
`--out options/type/a` is that brand's `options/type/a`.

## What the engine will not do with a settings file

- Write outside the output folder, or outside the brand folder for the mark's outline. A name with `..` in it
  stops the run.
- Run code from outside the brand folder. A mark's `kind`, a `motion.module`, an item's `module` and a font `own`
  module are files the engine runs, and they must be in `brand/`.
- Delete anything. A file the settings no longer make stays until `run discard` moves it to the recycle bin.

## Outside the settings

- `BRAND_SYSTEM_HOME`: an environment variable that moves the engine's libraries from `.brand-system` in the home
  folder to somewhere else. The Chromium browser then goes there too (into `browsers/`), so that everything the
  engine installs is in one folder.
- `BRAND_SYSTEM_DEBUG=1`: makes a step that fails show its whole error, not one line.
- `run check <folder> --only=page` tests one thing, and `--skip=motion,page` leaves things out. The names are
  `logos`, `colour`, `rollout`, `art`, `items`, `fonts`, `motion` and `page`.

## A full settings file

For a made-up kite maker with two brands on one mark, a font family of its own, a motion of its own and a few
items. It shows how the parts are written, not what a brand should choose: every value in it was a decision for
that brand.

```json
{
  "comment": "Kitewell, a made-up kite maker with a second brand for its workshop. A setting that is left out takes its default, so most brands need less than this.",

  "name": "Kitewell",
  "url": "https://kitewell.example",
  "tone": "dark",

  "about": {
    "lead": "One kite for the whole family. Kitewell flies it in Breeze, and its workshop in Poppy.",
    "status": "Draft. Nothing here is approved yet.",
    "family": [
      "<b>Kitewell is the parent.</b> The kite with its lower right facet in Breeze, alone or next to the name.",
      "<b>The workshop is a branch.</b> The same kite with WORKSHOP under the name, and Poppy in place of Breeze.",
      "<b>One accent at a time.</b> Colour says which part of the family is speaking.",
      "<b>Where the name cannot be read,</b> the kite stands alone."
    ]
  },

  "colours": {
    "accents": {
      "breeze": { "label": "Breeze", "stops": ["#12B5CB", "#7CF0C4"] },
      "poppy": { "label": "Poppy", "stops": ["#F23D5E", "#FF8A7A"] }
    }
  },

  "type": {
    "wordmark": { "font": "family:Regular", "tracking": 0.02 },
    "weights": { "hero": 300, "heading": 600, "body": 400 },
    "family": {
      "name": "Kitewell Sans",
      "sources": [
        { "script": "latin", "name": "Raleway", "file": "fonts/Raleway[wght].ttf", "licence": "fonts/OFL-Raleway.txt" }
      ]
    }
  },

  "marks": [
    {
      "label": "The kite",
      "file": "mark.svg",
      "motion": { "module": "motion.js" },
      "about": {
        "lead": "Four facets and a tail. The same outline at every size and in every colour version.",
        "facts": [
          "<b>The spars are gaps, not lines.</b> The four facets stand apart by one even gap, so the cross is the background showing through.",
          "<b>It leans 21 degrees,</b> the way a kite sits in the wind."
        ]
      },
      "brands": [
        {
          "word": "Kitewell", "accent": "breeze",
          "about": { "lead": "The parent. The kite with its lower right facet in Breeze." }
        },
        {
          "word": "Kitewell", "desc": "WORKSHOP", "accent": "poppy",
          "about": { "lead": "The workshop, where kites are built and mended. The same kite, with Poppy in place of Breeze and WORKSHOP under the name." }
        }
      ]
    }
  ],

  "art": { "sizes": [0.5] },

  "items": [
    { "item": "business-card", "fields": { "name": "Maya Okafor", "role": "Kite maker", "lines": ["maya@kitewell.example", "+44 20 7946 0102", "kitewell.example"] } },
    { "item": "letterhead", "fields": { "lines": ["Kitewell Ltd", "12 Harbour Row, Whitby", "hello@kitewell.example"] } },
    { "item": "sticker" },
    { "item": "tag", "fields": { "title": "Delta 120", "lines": ["Ripstop sail, carbon spars", "Flies in 8 to 40 km/h", "Ages 8 and up"] } },
    { "item": "label", "fields": { "title": "Spare line, 30 m", "lines": ["Braided, 45 kg"] } },
    { "item": "bag" },
    { "item": "box" },
    { "item": "tote", "brand": "kitewell-workshop" },
    { "item": "poster" },
    { "item": "panel", "id": "shop-sign", "label": "Shop sign", "size": [900, 300] }
  ],

  "rollout": [
    { "platform": "web", "brand": "kitewell" },
    { "platform": "email", "brand": "kitewell" },
    { "platform": "youtube", "handle": "kitewell", "brand": "kitewell" },
    { "platform": "instagram", "handle": "kitewell", "brand": "kitewell" }
  ]
}
```
