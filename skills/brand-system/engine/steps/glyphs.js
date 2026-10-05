// The first half of the fonts step: it draws the brand's own characters and writes the plan that fonts.py builds
// the family from (.build/font-plan.json). A brand's own characters are its marks, so that a logo can sit in a
// line of text, a star, a check mark and a cross, and anything a module of the brand's own adds.
// Outlines are in font units (1000 to the em, capitals 700 high, y upwards), outer contours clockwise.
// usage: node run.js fonts <brand folder>      (this file, then fonts.py)
const fs = require('fs'), path = require('path');
const paper = require('paper');
const { PaperOffset } = require('paperjs-offset');
const S = require('../lib/system').open();
const { brand: B, r } = S, F = B.type.family;
if (!F) { console.error('brand.json names no font family to build: set "type.family" (see the skill\'s rules on type), or skip this step'); process.exit(1); }
paper.setup(new paper.Size(100, 100));

const CAP = 700, MID = CAP / 2, SIDE = 50;      // capital height, its middle, the space each side of a picture
const item = d => new paper.CompoundPath({ pathData: d, insert: false });
const circle = (c, rad) => new paper.Path.Circle({ center: c, radius: rad, insert: false });
const unite = (a, b) => a.unite(b, { insert: false }), sub = (a, b) => a.subtract(b, { insert: false }), and = (a, b) => a.intersect(b, { insert: false });
// a shape as a character: `height` tall, standing in the middle of the capitals, with SIDE of space each side
function glyph(shape, height, unicode) {
  shape.scale(height / shape.bounds.height);
  shape.translate([SIDE - shape.bounds.left, -MID - shape.bounds.center.y]);
  shape.reorient(true, false);      // drawn y downwards here, so this is clockwise once y points up
  const contours = (shape.children && shape.children.length ? shape.children : [shape]).map(c => {
    const out = [['M', r(c.firstSegment.point.x), r(-c.firstSegment.point.y)]];
    for (const k of c.curves) out.push(k.isStraight() ? ['L', r(k.point2.x), r(-k.point2.y)] : ['C', r(k.point1.x + k.handle1.x), r(-k.point1.y - k.handle1.y), r(k.point2.x + k.handle2.x), r(-k.point2.y - k.handle2.y), r(k.point2.x), r(-k.point2.y)]);
    return out;
  });
  return { unicode, advance: Math.round(shape.bounds.width + SIDE * 2), contours };
}
const star = () => new paper.Path({ segments: Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + i * Math.PI / 5, rad = i % 2 ? 42 : 100; return [rad * Math.cos(a), rad * Math.sin(a)]; }), closed: true, insert: false });
const kit = { S, paper, PaperOffset, CAP, MID, SIDE, item, circle, unite, sub, and, glyph };

// the brand's own characters, in the order they are added to every weight. The marks have no place in Unicode, so
// they sit in its private use area, from U+E000
const own = [];
for (const entry of F.own) {
  if (entry === 'marks') S.marks.forEach((m, i) => {
    const shape = m.glyph ? m.glyph(paper, kit) : null;
    if (shape) own.push({ type: 'drawn', name: m.id, codes: [0xE000 + i], what: `the ${m.brands[0].label} mark`, ...glyph(shape, CAP * (m.glyphHeight || 0.9)) });
  });
  else if (entry === 'star') own.push({ type: 'drawn', name: 'star', codes: [0x2605], what: 'star', ...glyph(star(), CAP * 1.02) });
  else if (entry === 'check') own.push({ type: 'check', name: 'checkmark', codes: [0x2713], what: 'check mark' });
  else if (entry === 'cross') own.push({ type: 'cross', name: 'cross', codes: [0x2715, 0x2717], what: 'cross' });
  else if (entry && entry.module) own.push(...require(path.resolve(S.dir, 'brand', entry.module))(kit));
  else throw new Error(`"type.family.own" lists ${JSON.stringify(entry)}: it can be "marks", "star", "check", "cross" or { "module": "a file of the brand's own" }`);
}
const names = own.map(o => o.name);
if (new Set(names).size !== names.length) throw new Error('two of the brand\'s own characters share a name: ' + names.join(', '));

const src = f => path.resolve(S.dir, 'brand', f);
const plan = {
  comment: 'Written by glyphs.js for fonts.py: what the brand\'s font family is built from and the characters added to it.',
  brand: B.name, url: B.url, year: B.year, out: path.join(S.OUT, 'fonts'), report: path.join(S.BUILD, 'fonts.json'), ofl: path.join(__dirname, '..', 'lib', 'OFL-1.1.txt'),
  family: F.name, version: F.version, vendor: F.vendor, about: F.about || `The ${B.name} brand typeface`,
  sources: F.sources.map((s, i) => ({ script: s.script || (i === 0 ? 'latin' : null), name: s.name || path.basename(s.file).replace(/[\[\-_.].*$/, ''), file: src(s.file), licence: s.licence ? src(s.licence) : null, ranges: s.ranges || null })),
  weights: F.weights || null, cap: CAP, side: SIDE, own,
  display: F.display ? { cut: 'Black', lean: 20, share: 0.86, room: 12, also: [], ...F.display } : null,
};
for (const s of plan.sources) { if (!s.script) throw new Error(`the font source ${s.name} needs a "script": what it adds to the first one, for example "arabic"`); if (!fs.existsSync(s.file)) throw new Error(`the font source ${s.file} is not there`); }
if (plan.display && !plan.display.name) throw new Error('"type.family.display" needs a "name": what the font for titles is called');
fs.mkdirSync(S.BUILD, { recursive: true });
fs.writeFileSync(path.join(S.BUILD, 'font-plan.json'), JSON.stringify(plan) + '\n');
console.log(`brand characters: ${own.filter(o => o.type === 'drawn').length} drawn${own.some(o => o.type === 'weighted') ? `, ${own.filter(o => o.type === 'weighted').length} in a thickness for each weight` : ''}${own.some(o => o.type === 'check') ? ', a check mark' : ''}${own.some(o => o.type === 'cross') ? ', a cross' : ''}`);
// fonts.py reads the plan from the place this prints last
console.log(path.join(S.BUILD, 'font-plan.json'));
