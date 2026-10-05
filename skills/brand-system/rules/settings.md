# The settings: `brand/brand.json`

One file tells the engine everything. A key that is left out takes its default, so a working file can be this short:

```json
{
  "name": "Kitewell",
  "colours": { "accents": { "breeze": ["#12B5CB", "#7CF0C4"] } },
  "marks": [{ "brands": [{ "word": "Kitewell" }] }]
}
```

`example/brand/brand.json` is a full one. The engine reads the file fresh on every run and says what is wrong
with it in plain words. Unknown keys are ignored, so a `"comment"` is fine anywhere.

## The brand

| Key | Default | What it is |
| --- | --- | --- |
| `name` | required | The brand's name, as written |
| `id` | from the name | Lower-case letters, digits and hyphens. It names the token files and the first mark |
| `prefix` | from the name | Starts the names of the CSS variables: `--ki-accent`. Two or three letters |
| `url` | none | The brand's address. It goes into the fonts' own information |
| `tone` | `"dark"` | `"dark"` or `"light"`: the surface the brand is at home on |
| `year` | this year | The year in the fonts' copyright line |

## `colours`

| Key | Default | What it is |
| --- | --- | --- |
| `ink` | `#0C0C0E` | The dark of the brand: the dark background, and text on light |
| `white` | `#FFFFFF` | The light of the brand |
| `neutrals` | a ramp from ink to paper | Any of `surface-1`, `surface-2`, `surface-3`, `line`, `text-3`, `text-2`, `text`, `paper-2` |
| `paper` | three greys | `paper-3`, `paper-line`, `paper-soft`: a quiet fill and two lines for light surfaces |
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

The first accent is the one in use by default. `black`, `white` and `color` cannot be accent keys.

## `marks`

A list. Each mark:

| Key | Default | What it is |
| --- | --- | --- |
| `id` | the brand's id, for the first | Names its folder and files. Required from the second mark on |
| `label` | `"The mark"` | What the page calls it: "The kite" |
| `file` | `"mark.svg"` | Its drawing, in `brand/` |
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
| `id` | from the label | Names its files. Must be unique |
| `label` | the word and the line under it | What the page calls it |
| `dir` | `lockup`, then `lockup-<id>` | The folder of its lockups |
| `motion` | `true` | `false` makes no animated logo for it |
| `page` | `true` | `false` keeps it off the page. Its files are still made |
| `about` | written for you | `{ "lead": "...", "chips": ["..."], "note": "..." }` for its page |

## `type`

| Key | Default | What it is |
| --- | --- | --- |
| `wordmark` | `{ "font": "family:ExtraBold", "tracking": -0.03, "size": 200, "cap": "H" }` | The name beside the mark. `font` is a weight of the brand's family, or a font file in `brand/` |
| `descriptor` | `{ "font": "family:SemiBold", "tracking": 0.42, "scale": 0.32, "cap": "H" }` | The line under the name |
| `family` | none | The brand's own font family. See below |
| `weights` | `{ "heading": 700, "label": 600, "body": 500 }` | Which weight does what |
| `tracking` | `{ "hero": "-0.02em", "label": "0.14em" }` | Letter spacing of titles and labels |
| `fallback` | `"Segoe UI", system-ui, sans-serif` | The fonts after the brand's own |
| `samples` | English, and Arabic | `{ "latin": { "d": "...", "h": "...", "l": "...", "b": "...", "w": "..." } }`: the page's sample lines for a script |

`family`:

| Key | Default | What it is |
| --- | --- | --- |
| `name` | required | What the family is called. Not the source's name |
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
| `platforms` | none | Places of the brand's own |
| `about` | written for you | `lead`, `body`, `status`, `statusNote`, `family`, `rollout`, `checks`: the page's words about the brand |
| `page` | | `{ "banned": ["a word"], "credit": true }` |

## Laying settings over settings

`--with file.json` lays a file over `brand.json` for one run. Objects are merged key by key. A list of objects
(the marks, a mark's brands) is merged item by item, so `{ "marks": [{ "file": "../options/mark/b.svg" }] }`
changes only the first mark's drawing. Any other list is replaced whole. With `--out folder` the files go
somewhere else, and nothing in `final/` is touched.
