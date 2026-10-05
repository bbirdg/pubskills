# Art, the upload kit and the page

## Background art

`run art` draws backgrounds from the mark itself, with nothing written on them. For a flat mark there are six
kinds, each in every colour the mark's brands wear, in three shapes (wide, tall, square) and two tones (dark and
light), as SVG and PNG, with the background and without it (the files named `-clear`).

| Kind | What it is | Where a logo or words go |
| --- | --- | --- |
| Outline | The mark's outline, drawn very large | Inside the mark, in its roomiest place |
| Echo | The outline with its contours spreading out and fading | Beside it |
| Sweep | The accent part alone, as one large shape of colour | Beside it |
| Pattern | Small marks in rows, one with its accent lit | In the empty middle |
| Shadow | The mark close up, tone on tone | Inside it |
| Story | The mark very large and quiet at one edge, inside a thin frame | Beside it |

Every picture has one **clear area**, where a logo, a title or a caption may go. The engine measures each picture
as it makes it: no line may come nearer to that area than 2% of the picture's width, and a picture that fails stops
the run with its name. The page can show the clear area over each picture.

What to do with it:

- **Look at the pictures.** The layouts were worked out on a wide mark and are adapted to others by rule. Most marks
  come out well. Some kinds will not suit some marks: a mark whose accent part is tiny makes a poor Sweep.
- **Leave a kind out** rather than ship a weak one: `"art": { "skip": ["pattern"] }` under the mark.
- **A mark with no roomy place inside** (the mark step says so) gets no Outline and no Shadow, by itself.
- **How large the mark is drawn** behind a logo is `"scale": { "wide": 1.3, "tall": 1.9 }` under the mark, in
  picture widths. The mark step works it out. Raise it if the logo looks cramped inside the outline.
- **Fewer or smaller files:** `"art": { "sizes": [0.5] }` at the top of the settings makes only the half-size PNGs
  (1920 x 1080 for the wide shape). The full set of a brand with two colours is several hundred megabytes.

Rules of use, which the page repeats: art stays behind and never stands in for a logo, one colour to a picture,
never mirrored or stretched.

## The upload kit

`"rollout"` in the settings lists the places the brand is seen. `run rollout` makes what each place asks for, at
its size, under plain names in `final/rollout/<place>/`.

```json
"rollout": [
  { "platform": "youtube", "handle": "kitewell", "brand": "kitewell" },
  { "platform": "web", "brand": "kitewell" }
]
```

Built in: `youtube`, `tiktok`, `instagram`, `facebook`, `discord`, `telegram`, `whatsapp`, `twitch`, `x`,
`linkedin`, `github`, `web` (favicons, touch icon, share picture), `email` (logo, header strip, sender logo),
`shopify`, `app` (store icons and Android layers), `video` (the mark cut tight for editors) and `profile`.

**`profile` is for anywhere else.** A brand always meets a place that is not on the list: a forum, a new app, a
partner's page. Give every brand one `{ "platform": "profile", "brand": "<id>" }` entry and it gets its profile
picture six ways, as PNG and as SVG, in `final/rollout/profile/`: square on dark and on light (the ones to
upload), the same two already cut to a circle (for a website, a signature, an overlay), and two with nothing
behind the mark (for dark and for light surfaces, where the person chooses the background).

An entry can have:

| Key | What it is |
| --- | --- |
| `platform` | Which place, from the list above or from the brand's own `platforms` |
| `brand` | The id of the brand whose logo it wears. Left out, the first brand |
| `handle` | The account's name. It goes into file names and into the page's words |
| `folder` | The folder under `final/rollout/`. Left out, the platform's name |
| `only` | `["profile"]`: make only these items of the place |
| `label`, `how` | What the page calls the place, and a line on how its files get there |
| `lock` | `{ "banner": 800 }`: how wide the lockup may be in one banner, in pixels |
| `steps` | `[{ "what": "...", "note": "..." }]`: things a person does by hand, with no file |

**Two brands in one place need two folders.** The files of `web`, `email`, `shopify`, `app` and `video` have fixed
names, so a second brand there would replace the first. The step stops and says so. Give one entry a folder of its
own: `{ "platform": "web", "brand": "kitewell-workshop", "folder": "web-workshop" }`.

Things to know:

- **A banner is the lockup inside the mark's own outline.** The lockup is as wide as the place allows. If the
  mark leaves less room, the engine narrows it and says so. If it still does not fit, raise the mark's `scale`.
- **Profile pictures are the solid squares**, not the files with nothing behind them. Platforms cut a circle out of
  the square, and a see-through picture gets whatever colour the platform puts behind it. The mark is sized to sit
  inside that circle.
- **Sizes are the ones in common use, not a promise.** Platforms change them. Say so, and let the person confirm
  in each upload dialog.
- **Their own places.** A website or an app usually loads its logo under names of its own. Give the brand a place
  that writes drop-in files under exactly those names, so that swapping is a copy:

  ```json
  "platforms": {
    "site": { "label": "The website", "how": "Into its public folder, then published.", "items": [
      { "id": "logo", "what": "Header logo", "file": "img/logo.svg", "text": "cropped:white" },
      { "id": "touch", "what": "Touch icon", "file": "apple-touch-icon.png", "picture": [180, 180], "place": [["mark-flat", "70%"]] },
      { "id": "og", "what": "Share picture", "file": "og.png", "banner": [1200, 630], "lock": 470 }
    ] }
  }
  ```

  An item is one of: `"svg"` (a logo file drawn at a `width`), `"copy"` (the same drawing kept as an SVG file),
  `"banner"` (a size, and how wide the lockup may be),
  `"picture"` (a size, a background, and logo files placed on it), `"text"` (`"cropped:white"`, `"cropped:black"`
  or `"sender"`) or `"ico"` (pictures gathered into one `.ico`). What can be placed: `avatar`, `lockup`, `stacked`,
  `mark`, `icon`, `favicon`, `tight`, `clear` (the profile picture with nothing behind it), each optionally with
  `-light`, `-dark`, `-white`, `-black` or `-flat`, or the path of any logo file under `final/`. `"round": true`
  on an `svg` or a `copy` cuts the drawing to a circle. In a file name or in the words, `{handle}` is the handle, `{at}` the handle
  with an @ before it, `{brand}` the brand's name, `{id}` its id and `{mark}` its mark's id.
  `engine/platforms.json` shows every form in use.

**None of this is uploaded.** The kit is files. See the rule on going live.

## The page

`run page` writes `final/review.html`: one file with a view for each brand, each mark, colour, type, motion, art,
components, the upload kit, the checks and every file. It is where the person looks at everything, downloads any
file and approves the work. It shows what the other steps have made so far and says what is missing.

The words about the brand itself are yours to write, in `"about"`:

```json
"about": {
  "lead": "One kite for the whole family.",
  "body": "A second sentence or two, if the start page needs it.",
  "status": "Approved on 4 May. Not rolled out yet.",
  "family": ["<b>Kitewell is the parent.</b> ...", "<b>The workshop is a branch.</b> ..."]
}
```

Each brand and each mark can have its own `"about": { "lead": "..." }`, and a mark can have `"facts"`. Write them
the way the page is written: short, plain, a bold opening and then the rule. Say what is true of this brand, not
what is true of brands. Keep `status` current: it is the first thing the person reads.

`"page": { "banned": ["old name"] }` makes the step fail if a word that must not appear does. Useful after a
rename.

## The checks

`run check` tests what was made and writes `.build/checks.json`, which the page shows:

- every logo file is there and is exactly what the settings make today (so a file older than the settings is caught)
- contrast of text and accents against their backgrounds
- every file of the upload kit, the art and the items is there, at the size its name says
- the font family's files, its own characters, and a display cut as wide as the weight it is cut from
- every animation: size, frame rate, length, that each loop ends on the frame it starts on, and that it was
  rendered from today's settings and not from earlier ones
- the page: every view at desktop and phone width, no error, no sideways scroll, no link that leads nowhere

`run all` runs the checks, writes the page, then tests the page. A failed check ends with an error and says what
failed: fix it, do not explain it away. Pass on what the checks say in their own words, and add what they cannot
know: whether the mark looks right, whether a name is free to use, whether a platform has changed its sizes.

Three things a check may say that are not faults in the design:

- **"Not yet".** A set that is partly made (one animation rendered to look at, say) is reported as so many of so
  many. It does not fail, and the page shows what is there.
- **"Left from an earlier build".** The engine never deletes. When the settings stop making a file (a kind of art
  is skipped, a place is taken off the list, the font family is renamed), the old file stays in `final/` and the
  check fails until it is gone, because a stale logo is the one that gets used by mistake. The list is in
  `.build/left.json`: read it, then `run discard <folder> --left` moves those files to the recycle bin.
- **"Rendered before the settings changed".** An animation whose colours or lettering are no longer the brand's.
  Run the motion step again.

## Looking at the page yourself

You cannot see `final/review.html` the way the person does, so `run look <folder>` writes a picture of every view
into `.build/page/` (`run look <folder> colour` for one view, `--phone` for a narrow screen). Read them before
you say the page is ready. A check passing means nothing is broken, not that it looks right.

## Master files, and Illustrator

`run masters` writes one vector page with every main version of each mark, as SVG and as PDF. Both open in
Illustrator, Affinity, Figma and Inkscape as shapes that can be edited, and every name in them is already
outlines. The engine cannot write Illustrator's own `.ai` format: only Illustrator can. If the person wants `.ai`
files and you have a way to drive Illustrator on their computer, open each `final/logos/<mark>/<mark>-master.svg`
there and save it beside itself as `.ai`. Otherwise tell them it is one "Save as" away. The check lets a
`-master.ai` stand beside the others.

## Going live

Nothing in this skill puts anything live. When the person decides to:

- Go **slow places first**: files inside projects, websites and apps, then the public profiles last, in one sitting.
  A video should never carry a logo its channel does not show yet.
- The Rollout view lists every file with a tick box. The ticks are the person's, and they are remembered on their
  computer.
- Keep the old files until the new ones are confirmed live.
- Record in the notes what went live, when, and on whose word.
