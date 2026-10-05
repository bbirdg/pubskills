// Art: backgrounds drawn from the marks, with nothing written on them. Each mark's kind gives its own kinds of
// picture, in each of the colours its brands wear. Each comes in three shapes and two tones (dark and light), as SVG
// and as PNG in two sizes, with its background and without (the files named -clear). Every picture names the area
// where a logo or words may go, and is measured as it is made so that no line comes near that area.
// Each also says where its light runs when it is animated (the art-motion step). Writes final/art.
// usage: node run.js art <brand folder> [filter]     e.g. node run.js art <folder> outline
const path = require('path');
const S = require('../lib/system').open();
const K = require('../lib/artkit')(S);
const { launch } = require('../lib/browser');
const { OUT, CLEARANCE, r } = S, { SHAPES, SIZES, THEMES, svg, nearest, pictures, families } = K, only = S.args.rest[0] || '';

(async () => {
  const all = pictures().map(x => ({ ...x, p: x.v.draw(x.s.w, x.s.h, x.c, x.th) })), tooNear = [], clear = {};
  if (!all.length) throw new Error('no mark of this brand has art to draw');
  for (const { f, v, s, p, name } of all) {
    const near = nearest(p, s);
    if (near < s.w * CLEARANCE) tooNear.push(`${name} (${Math.round(near)} px)`);
    clear[[f.id, v.id, s.id].join('-')] = [p.clear[0] / s.w, p.clear[1] / s.h, p.clear[2] / s.w, p.clear[3] / s.h].map(x => r(x * 100, 1));
  }
  if (tooNear.length) throw new Error('a line runs too near the clear area in: ' + tooNear.join(', ') + '. Leave that kind out for this mark ("art": { "skip": [...] } in the mark\'s settings), or change how large the mark is drawn ("scale")');
  S.save('art', {
    comment: 'Written by the art step: the art the page shows. clear: where a logo or words may go in each picture, as x, y, width and height in percent of the picture. tones: an empty id is the dark one, whose files carry no tone in their names.',
    shapes: SHAPES, sizes: SIZES, tones: THEMES.map(t => ({ id: t.id, label: t.label })),
    families: families().map(f => ({ id: f.id, label: f.label, colours: f.colours.map(c => ({ id: c.id, label: c.label, accent: c.accent, brands: c.brands })), variants: f.variants.map(v => ({ id: v.id, label: v.label, note: v.note, light: v.light })) })),
    clear,
  });

  const todo = all.filter(x => x.name.includes(only));
  const browser = await launch();
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  for (const { f, name, dir, s, p, th } of todo) {
    for (const b of [f.back(th), null]) S.put(`${dir}/${name}${b ? '' : '-clear'}.svg`, svg(s.w, s.h, p, b));
    for (const k of SIZES) for (const b of [f.back(th), null]) {
      const w = s.w * k, h = s.h * k;
      await page.setViewportSize({ width: w, height: h });
      await page.setContent(`<!doctype html><html><body style="margin:0;background:transparent">${svg(s.w, s.h, p, b).replace(`width="${s.w}" height="${s.h}"`, `width="${w}" height="${h}" style="display:block"`)}</body></html>`);
      S.put(`${dir}/${name}-${w}x${h}${b ? '' : '-clear'}.png`, await page.screenshot({ omitBackground: !b, clip: { x: 0, y: 0, width: w, height: h } }));
    }
    if (only) console.log(`${name}: the nearest line is ${nearest(p, s) === Infinity ? 'nowhere near' : Math.round(nearest(p, s)) + ' px from'} the clear area`);
  }
  await browser.close();
  console.log(`${todo.length} pictures, ${todo.length * (2 + SIZES.length * 2)} files -> ${path.join(OUT, 'art')}`);
})().catch(e => { console.error(e.message); process.exit(1); });
