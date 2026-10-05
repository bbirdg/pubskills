# Items: the brand on things

A brand is not only seen on screens. `run items` puts it on the things it hands out, wraps, sends and wears: each
one drawn at its real size, with a print file and a picture of the thing itself.

Which things depends on what the brand is, and on what the person asks for. **Never build the whole list.** Ask.

## Which items

Start from what the brand does. Propose a short list, say why each is on it, and let the person strike and add:

| The brand is | Start with | Often asked for next |
| --- | --- | --- |
| A place that sells food or drink | `bag`, `cup`, `sticker`, `label` | `box`, a loyalty card (`business-card`), `poster`, a menu header (`panel`) |
| A shop or a maker of things | `label`, `tag`, `bag`, `sticker` | `box`, `business-card`, `tote`, a thank-you card (`panel`) |
| A studio, a freelancer, a firm | `business-card`, `letterhead` | `sticker`, `poster`, a slide cover (`panel` in pixels) |
| A channel or a creator | `sticker`, `tote` | `poster`, an end card or a frame for posts (`panel` in pixels) |
| An app or a service | `business-card`, `sticker` | a slide cover or a store banner (`panel` in pixels) |
| An event or a community | `poster`, `sticker`, `tote` | a badge (`tag`), a sign (`panel`) |

Then ask one question: **"Is there anything else you hand out, wrap, send, hang up or wear?"** Whatever they name
is either one of the kinds below or a `panel`, which is any flat thing at any size.

This is a gate like the others. Show the items as pictures (`run look <folder> items`, or a sheet of the
`-shown-` pictures), get a yes for the set, and write it into the notes. Words that go on a thing (a name on a
card, a product on a label) are the person's: ask for them, and never invent a name, a phone number or an address.

## The kinds

```json
"items": [
  { "item": "business-card", "fields": { "name": "Maya Okafor", "role": "Kite maker", "lines": ["maya@kitewell.example", "+44 20 7946 0102"] } },
  { "item": "bag" },
  { "item": "sticker" },
  { "item": "panel", "id": "shop-sign", "label": "Shop sign", "size": [900, 300] }
]
```

| `item` | What is drawn | Sizes (mm) | Takes |
| --- | --- | --- | --- |
| `business-card` | Front: the logo. Back: a name, a role and lines, on the other tone | `eu` 85 x 55, `us` 88.9 x 50.8, `jp` 91 x 55, `square` 65 x 65 | `fields.name`, `role`, `lines`; `art` for the front |
| `letterhead` | The logo at the top and one line at the foot | `a4`, `letter` | `fields.lines` |
| `sticker` | The mark, cut round: on the brand's surface, on its accent, on paper | `round` 60, `small` 40 | |
| `tag` | A hang tag with a hole. Front: the logo. Back: a title and lines | `tall` 50 x 90, `small` 40 x 70 | `fields.title`, `lines` |
| `label` | The logo, with a title and lines under it | `wide` 80 x 50, `small` 60 x 40, `square` 60 x 60 | `fields.title`, `lines` |
| `bag` | The front of a paper bag: the mark's art with the logo in its clear area | `medium` 240 x 320, `small`, `large` | `art` |
| `cup` | The print on a takeaway cup | `print` 80 x 70 | |
| `box` | The lid of a box | `lid` 200 x 200, `small` 140 x 140 | `art` |
| `tote` | A cloth bag's print: the logo in one colour | `print` 260 x 300 | `cloth`: `"black"` |
| `poster` | The mark's art with the logo, or with a title in its place | `a3`, `a2`, `a4`, `us` | `fields.title`, `lines`; `art` |
| `panel` | Any flat thing: a sign, a cover, a card, a screen | `size` is required | `size`, `unit`, `art`, `fields.title`, `lines` |

Every entry can also have:

| Key | What it is |
| --- | --- |
| `brand` | The id of the brand whose logo it wears. Left out, the first brand |
| `id` | Names its folder and files. Needed when one kind is listed twice (two cards, two signs) |
| `size` | One of the kind's sizes by name, or `[width, height]` in millimetres |
| `unit` | `"px"`, for a `panel` that is a picture for a screen: `"size": [1920, 1080], "unit": "px"` |
| `tone` | `"dark"` or `"light"`. Left out, the brand's own |
| `art` | Which kind of the mark's art is behind the logo: `"sweep"`, `"echo"`, `"pattern"`, `"shadow"`, `"outline"`, or `"none"` |
| `round` | Corner radius in millimetres, for a card or a label that is cut with round corners |
| `label` | What the page calls it |

## What comes out

In `final/items/<id>/`:

- each face as **SVG** and **PNG**, cut to its size
- **one print file**, `<id>-print.pdf`: a page for each face, at real size, with the background running 3 mm past
  the cut (the bleed), in RGB, with every word turned into outlines
- **a picture of the thing**, `<id>-shown-1600x1200.png`: a drawing, to judge the design by

Say these three things when you hand items over, because they are true and people do not expect them:

1. **A printer may ask for more.** A colour profile, a cut line, their own template. Bags, cups and boxes are made
   from the maker's template: what the engine gives is the art for their faces. Send it with the logo files.
2. **The pictures are drawings, not photographs.** They show the layout and the colours, not paper, gloss or cloth.
3. **Sizes are common ones.** A card in another country, a bag from another maker: take the size from the maker
   and give it as `"size": [w, h]`.

## Rules

- **The logo keeps its room.** Where a thing carries the mark's art, the logo sits in the art's clear area. Do not
  move it nearer to a line to make it larger: choose another kind of art, or none.
- **One accent to a thing.** A sub-brand's item wears that sub-brand's colour (`"brand"`).
- **Small things carry less.** A sticker is the mark. A cup is the logo. Words go on cards, tags and labels.
- **Cloth and stamps are one colour.** That is what `tote` draws. Do not send a gradient to be printed on cloth
  unless the maker says they can.
- **Art is behind, never instead.** A bag with only a pattern on it is not the brand's bag. The logo is on it.

## A thing the kinds do not cover

First try a `panel`: most flat things are a size, the mark's art and the logo, with or without a title.

When a thing needs a layout of its own (a menu, a price list, a certificate), write a module in the brand folder
and name it: `{ "module": "items/menu.js", "id": "menu", "size": [148, 210] }`. It is given the same tools the
built-in kinds are drawn with, and returns what they return:

```js
// brand/items/menu.js
module.exports = t => ({
  label: 'Menu',
  note: 'Folded once. The list is under "fields.lines".',
  faces: () => [{
    id: 'front', label: 'Front',
    svg: t.fill(t.surface(t.tone))                                             // a background, with its bleed
       + t.lockup(t.tone, [10, 10, t.W - 20, 40])                              // the logo, fitted into a box [x, y, w, h]
       + t.words((t.fields.lines || []).map(l => ({ t: l, pt: 10, w: 500 })),  // words, as outlines
                 { x: t.W / 2, y: 70, align: 'center', colour: t.ink(t.tone) }).svg,
  }],
  scene: (t, faces) => t.lay(faces[0], 520, 150, 3.8, -3),                     // the picture: the face laid into a room
});
```

Everything is in millimetres from the top left corner of the cut. `t.art(kind, tone)` gives one of the mark's
kinds of art as `{ svg, clear }`, `t.logo(name, box)` places any logo file (`"mark-dark"`, `"stacked-white"`),
`t.titled(title, lines, box, colour)` sets a title as large as its box allows, and `t.W`, `t.H`, `t.fields`,
`t.tone` and `t.other` say what was asked for. `engine/steps/items.js` is the model: every built-in kind is a
few lines there. This is programming work: say so, and build it only for a thing the person really wants.
