---
name: brand-system
description: Build a complete brand design system from a logo, or from nothing. It cleans up or draws the mark, then makes every logo file (SVG and PNG, every colourway), the colours and design tokens, the brand's own font family, background art, animated logos, an upload kit with profile pictures, banners and icons at each platform's size, and one review page that shows it all. Use when the user asks to design, redesign, refresh, clean up or package a logo, brand, visual identity, brand kit or style guide, wants banners, profile pictures, favicons or an animated logo made from their logo, or types /brand-system.
license: Apache-2.0
metadata:
  author: bbirdg
  version: 0.1.0
---

# Brand system

You are building a brand's whole visual system with a person who reviews and approves. An engine does the drawing:
it turns one settings file and one drawing of the mark into every file the brand needs. You bring the judgement
(what the mark should be, which colours, how it should move), you show the person real options, and you change
nothing they have not approved.

The knowledge is in the files beside this one. This file is the procedure.

| Read | When |
| --- | --- |
| [rules/working-with-people.md](rules/working-with-people.md) | Before you start. The rules that hold all the way through |
| [rules/mark.md](rules/mark.md) | Before you touch the mark: how to trace, clean and draw it |
| [rules/colour-type.md](rules/colour-type.md) | Before colours, fonts and the name beside the mark |
| [rules/motion.md](rules/motion.md) | Before animating anything |
| [rules/art-and-rollout.md](rules/art-and-rollout.md) | Before the background art, the upload kit and the page |
| [rules/settings.md](rules/settings.md) | Whenever you write `brand.json`: every key and its default |
| [example/brand/](example/brand/) | A finished brand to copy from: settings, mark, a motion of its own, notes |

## The engine

The engine is the folder `engine/` beside this file. Run it with Node:

```bash
node "${CLAUDE_SKILL_DIR}/engine/run.js" <command> <brand folder> [options]
```

If `${CLAUDE_SKILL_DIR}` shows above as written, with its braces, your tool did not fill it in: use the folder that
holds this file instead. Below, `run` stands for `node "<that folder>/engine/run.js"`.

| Command | What it does | Takes about |
| --- | --- | --- |
| `run doctor` | Says what is installed and what is missing. Changes nothing | 5 seconds |
| `run setup` | Installs what the steps need, once for each computer | 1 to 5 minutes |
| `run init <folder> --name="Name"` | Starts a brand folder | instant |
| `run trace <picture>` | Turns a picture of a logo into an SVG outline to clean up | 2 seconds |
| `run mark <folder>` | Reads `brand/mark.svg`, measures it, writes `brand/mark.json` and a sheet to look at | 5 seconds |
| `run fonts <folder>` | Builds the brand's own font family (needs Python) | 30 seconds |
| `run logos <folder>` | Every logo file, and the design tokens | 15 seconds |
| `run masters <folder>` | One vector page with every main version | 5 seconds |
| `run rollout <folder>` | The upload kit | 10 seconds |
| `run art <folder>` | Background art | 30 seconds to 3 minutes |
| `run motion <folder>` | Animated logos (needs ffmpeg) | 10 seconds for each animation |
| `run art-motion <folder>` | The art as loops (needs ffmpeg) | 30 to 60 seconds for each loop |
| `run check <folder>` | Tests what was made and says what it found | 30 seconds |
| `run page <folder>` | Writes `final/review.html` | instant |
| `run all <folder>` | Every still step in order, then checks and page. `--motion` adds the animated logos, `--art-motion` the moving art | the sum |
| `run sheet <folder> <options...>` | Lays options side by side on one page | 5 seconds |
| `run discard <folder> <path in options/>` | Moves options that were not chosen to the recycle bin | instant |

After the folder, most steps take a word that picks a few files (`run art <folder> outline`), `--out <folder>` to
write somewhere else, and `--with <file.json>` to lay other settings over `brand.json` for a trial. That is how an
option is built without touching the real settings.

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

A brand folder can hold code that the engine runs: a `motion.js`, or a file named under a mark's `kind`. You write
those yourself when a brand needs them. If you are handed a brand folder that someone else made, read those files
before you run any step in it, as you would with any project.

## The procedure

### 0. Set up

Run `run doctor`. If it says it is not ready, tell the person in two sentences what `run setup` will install and
run it: the engine's libraries (about 50 MB, in a `.brand-system` folder in their home folder) and a copy of the
Chromium browser that only this kind of tool uses (about 700 MB, in Playwright's own cache folder). Python is needed only for fonts and ffmpeg only for moving pictures: if one is missing, say
which steps will be skipped and give the install command `doctor` prints. Do not install system software unasked.

### 1. Kickoff. Nothing is drawn before this

Ask in one short message, and skip whatever the person already told you:

1. The name, exactly as it is written. Any sub-brands, channels or products that need their own logo?
2. What exists already: a logo file, colours, fonts? What must be kept as it is?
3. Where will it be seen: which platforms and handles, a website, an app, emails, video?
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
with `run sheet`. Stop here until they have chosen and said so. Write the approval into the notes.

### 3. Gate two: colour and type

Read [rules/colour-type.md](rules/colour-type.md) first.

Build real options, not descriptions: for each candidate, a small settings file in `options/` laid over the real
one with `--with`, the logos made into their own folder with `--out`, and one sheet that shows the lockups side by
side. Give your recommendation and why, in a sentence or two. Colour and type can be one gate or two, whichever the
person finds easier. Stop until they choose. Then put the choice into `brand.json`, discard the rest with
`run discard`, and note the approval.

### 4. Build

Run `run all`. Then look before you show: read a few of the files yourself (a lockup, a banner, two art pictures),
and open `final/review.html` in a browser if you can. Fix what is wrong. Only then give the person the page.

### 5. Gate three: motion

Read [rules/motion.md](rules/motion.md) first.

Render one animated logo by naming it (`run motion <folder> <brand id>-intro-1080x1080`) and look at it: open the
MP4, or cut a few frames from it with ffmpeg and read them. Decide whether the
built-in motion suits what the mark shows. If the mark shows a thing that moves in its own way, write that motion in
`brand/motion.js`. Show the person, get a yes, and only then render the whole set: say first how many animations
that is and how long it will take.

### 6. Review

Run `run all --motion` so that the checks and the page are current, and give the person `final/review.html`. Tell
them what is in it, what you checked, what you could not check, and what you need from them. Change what they ask
for in `brand/`, run the step again, and repeat until they approve. Write the approval into the notes.

### 7. Rollout. Only on the person's word

Everything so far is files on their computer. Nothing is uploaded, posted or changed on any account by this skill.
The page's Rollout view lists what goes where. The person uploads. If they ask you to help with a platform, do one
place at a time, confirm each public change with them at that moment, and never type a password or a code for them.

## Rules that hold all the way through

These are short here and argued in [rules/working-with-people.md](rules/working-with-people.md).

1. **Refine, do not replace.** The person's own mark and ideas are the starting point. Correct them. Your own
   designs are side options.
2. **Show options when it is a matter of taste.** Finished ones, side by side, where they cannot be missed. Once
   the choice is made, remove the rest.
3. **Motion must make sense.** Animate what the subject would really do. No effect for its own sake. In a loop,
   never move the logo's shapes.
4. **Nothing goes live without the person's word,** given for that thing at that moment.
5. **Say what a long job will do before starting it,** in a sentence or two, and how long it takes.
6. **Open licences only.** Fonts must be under the SIL Open Font License to be renamed and built on. Ask before
   downloading anything.
7. **Report plainly.** What was made, what was tested and how, what failed, what you could not verify. If a check
   failed, say so with what it printed.
