---
name: brand-system
description: Build a complete brand design system from a logo, or from nothing. It cleans up or draws the mark, then makes every logo file (SVG and PNG, every colourway), the colours and design tokens, the brand's own font family, background art, animated logos, an upload kit with profile pictures, banners and icons at each platform's size, branded items such as business cards, bags, cups, stickers and labels with print files, and one review page that shows it all. Use when the user asks to design, redesign, refresh, clean up or package a logo, brand, visual identity, brand kit or style guide, or wants banners, profile pictures, favicons, an animated logo, business cards, packaging or stationery made from their logo.
license: Apache-2.0
compatibility: Needs Node 18 or later, and once, for setup, the network and about 750 MB of disk (libraries and a Chromium browser, in the home folder unless BRAND_SYSTEM_HOME says otherwise). Python 3.9 or later only for fonts, ffmpeg only for animation. Built and tested on Windows. In a sandboxed agent, setup and the steps that start the browser may need the person's approval.
metadata:
  author: bbirdg
  version: "0.2.0"
---

# Brand system

You are building a brand's whole visual system with a person who reviews and approves. An engine does the drawing:
it turns one settings file and one drawing of the mark into every file the brand needs. You bring the judgement
(what the mark should be, which colours, which typeface, how it should move), you show the person real options,
and you change nothing they have not approved.

The knowledge is in the files beside this one. This file is the procedure.

| Read | When |
| --- | --- |
| [rules/working-with-people.md](rules/working-with-people.md) | Before you start. The rules that hold all the way through |
| [rules/mark.md](rules/mark.md) | Before you touch the mark: how to trace, clean and draw it |
| [rules/colour-type.md](rules/colour-type.md) | Before colours, the typeface and the name beside the mark |
| [rules/art-and-rollout.md](rules/art-and-rollout.md) | Before the background art, the upload kit, the checks and the page |
| [rules/items.md](rules/items.md) | Before cards, bags, cups, stickers and other things the brand is put on |
| [rules/motion.md](rules/motion.md) | Before animating anything |
| [rules/settings.md](rules/settings.md) | Whenever you write `brand.json`: every key, its default, and a full sample |

## The engine

The engine is the folder `engine/` beside this file. Run it with Node, from anywhere:

```bash
node <the folder this file is in>/engine/run.js <command> <brand folder> [options]
```

Below, `run` stands for `node <that folder>/engine/run.js`. Work out the folder once, from the path of this file.

| Command | What it does | Takes about |
| --- | --- | --- |
| `run doctor` | Says what is installed and what is missing. Changes nothing | 5 seconds |
| `run setup` | Installs what the steps need, once for each computer | 1 to 5 minutes |
| `run init <folder> --name="Name"` | Starts a brand folder | instant |
| `run trace <picture>` | Turns a picture of a logo into an SVG outline to clean up | 2 seconds |
| `run mark <folder>` | Reads `brand/mark.svg`, measures it, writes `brand/mark.json` and a sheet to look at | 5 seconds |
| `run typeface <folder> "Family" ...` | Finds open typefaces. With `--yes`, fetches them into `brand/fonts` | 5 seconds |
| `run typesheet <folder> <font files...>` | The real lockup set in each typeface, side by side | 5 seconds for each |
| `run fonts <folder>` | Builds the brand's own font family (needs Python) | 30 seconds |
| `run logos <folder>` | Every logo file, and the design tokens. `--marks`: the mark's own files only, before there is a font | 15 seconds |
| `run masters <folder>` | One vector page with every main version, as SVG and PDF | 5 seconds |
| `run rollout <folder>` | The upload kit | 10 seconds |
| `run art <folder>` | Background art | 30 seconds to 3 minutes |
| `run items <folder>` | The brand on things: cards, bags, stickers, with print files | 2 seconds for each |
| `run motion <folder>` | Animated logos (needs ffmpeg) | 10 seconds for each animation |
| `run art-motion <folder>` | The art as loops (needs ffmpeg) | 30 to 60 seconds for each loop |
| `run check <folder>` | Tests what was made and says what it found | 30 seconds |
| `run page <folder>` | Writes `final/review.html` | instant |
| `run look <folder> [view]` | Pictures of the page's views, for you to look at | 10 seconds |
| `run all <folder>` | Every still step in order, then checks and page. `--motion` adds the animated logos, `--art-motion` the moving art | the sum |
| `run sheet <folder> <options...>` | Lays options side by side on one page | 5 seconds |
| `run discard <folder> <path>` | Moves options that were not chosen to the recycle bin. `--left`: files a check found left from an earlier build | instant |

After the folder, most steps take a word that picks a few files (`run art <folder> outline`), `--out <folder>` to
write somewhere else, and `--with <file.json>` to lay other settings over `brand.json` for a trial. That is how an
option is built without touching the real settings. A path given after the brand folder is taken from the brand
folder, wherever you run the command from.

A step that fails says why in plain words and what to change. Read the message before trying anything else.

## The brand folder

```text
<brand folder>/
  brand/        the only place you change things
    brand.json    the settings
    mark.svg      the mark's own drawing
    mark.json     written by the mark step from mark.svg. Do not edit it
    motion.js     only where the mark moves in a way of its own
    fonts/        the open fonts the family is built from, with their licences
    notes.md      what was asked, decided and approved. Keep it current
  concept/      what the person brought: their logo as it is, references
  options/      choices laid side by side for a decision. Emptied once it is made
  final/        everything the engine makes. Never edit by hand: change brand/ and run the step again
```

A brand folder can hold code that the engine runs: a `motion.js`, an item of its own, or a file named under a
mark's `kind`. You write those yourself when a brand needs them. If you are handed a brand folder that someone
else made, read those files before you run any step in it, as you would with any project.

## The procedure

### 0. Set up

Run `run doctor`. If it says it is not ready, tell the person in two sentences what `run setup` will install and
run it: the engine's libraries (about 50 MB, in a `.brand-system` folder in their home folder) and a copy of the
Chromium browser that only this kind of tool uses (about 700 MB, in Playwright's own cache folder). Python is
needed only for fonts and ffmpeg only for moving pictures: if one is missing, say which steps will be skipped and
give the install command `doctor` prints. Do not install system software unasked.

If your tool runs commands in a sandbox (no network, or no writing outside the project), setup cannot work inside
it: it downloads, and it writes to the home folder. Ask the person to approve that one command, or to run it
themselves in a terminal. Setting `BRAND_SYSTEM_HOME` to a folder inside the project keeps the libraries and the
browser there. The steps that draw pictures start that browser: if one says Chromium did not start, ask to run the
step outside the sandbox. Do not work round a sandbox quietly.

### 1. Kickoff. Nothing is drawn before this

Ask in one short message, and skip whatever the person already told you:

1. The name, exactly as it is written. Any sub-brands, channels or products that need their own logo?
2. What exists already: a logo file, colours, fonts? What must be kept as it is?
3. What the brand is and does (a café, a shop, a studio, a channel, an app), and where it will be seen: which
   platforms and handles, a website, emails, video, and which things it hands out, wraps, sends or wears.
4. Is the brand at home on dark or on light? Which languages does it write in?
5. What should it feel like, and what must it not look like? Two or three references if they have them.

Then `run init`, put what they gave you into `concept/`, and write their answers into `brand/notes.md`. From here
on, record each decision there as it is made.

### 2. Gate one: the mark

Read [rules/mark.md](rules/mark.md) first.

- **They have a logo.** Your job is to make their mark right, not to replace it. Get it into `brand/mark.svg` as
  clean shapes (trace it first if it is a picture), fix what is technically wrong (wobbly curves, uneven gaps, too
  many points, parts that vanish when small), and show the cleaned mark beside their original. If you think another
  design would serve them better, show it as a side option, clearly labelled as yours.
- **They have none.** Draw three directions as finished marks, each in its own SVG, and show them side by side.

Run `run mark`, then look at the sheet it writes (read the PNG yourself). Fix what it warns about. Show the person
with `run sheet`: the marks' own sheets, or the mark files from `run logos --marks`, which need no font yet. Stop
here until they have chosen and said so. Write the approval into the notes.

### 3. Gate two: colour

Read [rules/colour-type.md](rules/colour-type.md) first.

Build real options, not descriptions: for each candidate, a small settings file in `options/` laid over the real
one with `--with`, the mark files made into their own folder with `--out`, and one sheet that shows them side by
side on dark and on light. Give your recommendation and why, in a sentence or two. Stop until they choose. Then put
the choice into `brand.json`, discard the rest with `run discard`, and note the approval.

### 4. Gate three: type

**Every brand gets a typeface chosen for it.** No font comes with this skill, on purpose: do not reach for the
one you used for the last brand, or for whatever is on the computer. Pick three or four open typefaces of clearly different character
that suit what the person said the brand should feel like, ask before fetching them (`run typeface` says what
would be downloaded), and show the brand's real lockup in each with `run typesheet`, light and heavy where that
helps. The typeface and how heavy the name is set change a logo more than anything but the mark. Stop until they
choose. Put the chosen `type` into `brand.json`, run `run fonts`, discard the rest, note the approval.

Colour and type can be shown together when the person finds that easier. They are still two decisions.

### 5. Build

Run `run all`. Then look before you show: `run look <folder>` writes a picture of every view of the page into
`.build/page/`, and you read them. Read a few of the files too (a lockup, a banner, two art pictures). Fix what is
wrong, and what a check says is wrong. Only then give the person `final/review.html`.

### 6. Gate four: items

Read [rules/items.md](rules/items.md) first.

Propose the few things this brand would really use, from what it is and from what the person named at kickoff,
and ask for the words that go on them (a name for a card, a product for a label). Put them under `"items"`, run
`run items`, look at the pictures, and show them. Stop until the set is approved. A brand that is only ever seen
on screens may need none: say so and move on.

### 7. Gate five: motion

Read [rules/motion.md](rules/motion.md) first.

Render one animated logo by naming it (`run motion <folder> <brand id>-intro-1080x1080`) and look at it: open the
MP4, or cut a few frames from it with ffmpeg and read them. Decide whether the built-in motion suits what the mark
shows. If the mark shows a thing that moves in its own way, write that motion in `brand/motion.js`. Show the
person, get a yes, and only then render the whole set: say first how many animations that is and how long it will
take.

### 8. Review

Run `run all --motion` so that the checks and the page are current, and give the person `final/review.html`. Tell
them what is in it, what you checked, what you could not check, and what you need from them. Change what they ask
for in `brand/`, run the step again, and repeat until they approve. Write the approval into the notes.

### 9. Rollout. Only on the person's word

Everything so far is files on their computer. Nothing is uploaded, posted, sent to a printer or changed on any
account by this skill. The page's Rollout view lists what goes where. The person uploads. If they ask you to help
with a platform, do one place at a time, confirm each public change with them at that moment, and never type a
password or a code for them.

## Rules that hold all the way through

These are short here and argued in [rules/working-with-people.md](rules/working-with-people.md).

1. **Refine, do not replace.** The person's own mark and ideas are the starting point. Correct them. Your own
   designs are side options.
2. **Show options when it is a matter of taste.** Finished ones, side by side, where they cannot be missed. Once
   the choice is made, remove the rest.
3. **Each brand is its own.** Its typeface, its colours and its items are chosen for it. Nothing is carried over
   from another brand because it was at hand.
4. **Motion must make sense.** Animate what the subject would really do. No effect for its own sake. In a loop,
   never move the logo's shapes.
5. **Nothing goes live without the person's word,** given for that thing at that moment.
6. **Say what a long job will do before starting it,** in a sentence or two, and how long it takes.
7. **Open licences only.** Fonts must be under the SIL Open Font License to be renamed and built on. Ask before
   downloading anything.
8. **Report plainly.** What was made, what was tested and how, what failed, what you could not verify. If a check
   failed, say so with what it printed.
