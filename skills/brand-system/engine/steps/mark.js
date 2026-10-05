// Mark: reads the mark's own drawing (brand/mark.svg) and writes it as the outline every other step draws from
// (brand/mark.json), with what was measured on it. The SVG is the source: change the drawing there and run this again.
//   Each filled shape is one part. A shape with class="accent" (or data-accent, or "accent" in its id) is an accent
//   part: it takes the brand's colour. Give each shape an id, which names its part.
//   Shapes, transforms and strokes are turned into plain outlines, and the mark is sized so that its longer side is
//   1000 units. Colours in the file are not kept: the brand's colours come from the settings.
// It also writes a sheet to look at (.build/mark-<id>.png): the mark large on dark and on light, as lines, at small
// sizes, with its parts named. Look at the sheet before going on.
// usage: node run.js mark <brand folder>
const fs = require('fs'), path = require('path');
const O = require('../lib/outline');
const { paper, PaperOffset, n2 } = O;
const brand = require('../lib/brand');
const { launch } = require('../lib/browser');
const { parse } = require('../lib/system');

const args = parse(process.argv.slice(2));
if (!args.dir) { console.error('give the brand folder: the one that holds brand/brand.json'); process.exit(1); }
const dir = path.resolve(args.dir), B = brand.load(dir, args.with.map(f => path.resolve(f))), BUILD = path.join(dir, '.build');
const SIDE = 1000;
// A lockup sits inside the mark's outline in the widest box that fits there, 3.6 times as wide as it is high. ROOM is
// how wide that box has to be, as a share of a wide picture's width: the room the engine's layouts were set with
const ROOM = 0.488, BOX = 3.6;

// In the page: every drawn shape as path data in the drawing's own units, with what it is painted in
function read() {
  const svg = document.querySelector('svg');
  if (!svg) return { error: 'the file holds no <svg> element' };
  const root = svg.getScreenCTM().inverse(), skip = 'defs, clipPath, mask, symbol, pattern, marker';
  const num = (el, a) => parseFloat(el.getAttribute(a)) || 0;
  const shapes = { rect(el) { const x = num(el, 'x'), y = num(el, 'y'), w = num(el, 'width'), h = num(el, 'height'); let rx = el.hasAttribute('rx') ? num(el, 'rx') : num(el, 'ry'), ry = el.hasAttribute('ry') ? num(el, 'ry') : rx; rx = Math.min(rx, w / 2); ry = Math.min(ry, h / 2);
      return rx || ry ? `M${x + rx} ${y}H${x + w - rx}A${rx} ${ry} 0 0 1 ${x + w} ${y + ry}V${y + h - ry}A${rx} ${ry} 0 0 1 ${x + w - rx} ${y + h}H${x + rx}A${rx} ${ry} 0 0 1 ${x} ${y + h - ry}V${y + ry}A${rx} ${ry} 0 0 1 ${x + rx} ${y}Z` : `M${x} ${y}H${x + w}V${y + h}H${x}Z`; },
    circle(el) { const cx = num(el, 'cx'), cy = num(el, 'cy'), r = num(el, 'r'); return `M${cx - r} ${cy}A${r} ${r} 0 1 0 ${cx + r} ${cy}A${r} ${r} 0 1 0 ${cx - r} ${cy}Z`; },
    ellipse(el) { const cx = num(el, 'cx'), cy = num(el, 'cy'), rx = num(el, 'rx'), ry = num(el, 'ry'); return `M${cx - rx} ${cy}A${rx} ${ry} 0 1 0 ${cx + rx} ${cy}A${rx} ${ry} 0 1 0 ${cx - rx} ${cy}Z`; },
    polygon(el) { return 'M' + (el.getAttribute('points') || '').trim().split(/[\s,]+/).join(' ') + 'Z'; },
    polyline(el) { return 'M' + (el.getAttribute('points') || '').trim().split(/[\s,]+/).join(' '); },
    line(el) { return `M${num(el, 'x1')} ${num(el, 'y1')}L${num(el, 'x2')} ${num(el, 'y2')}`; },
    path(el) { return el.getAttribute('d') || ''; } };
  const out = [];
  for (const el of svg.querySelectorAll('path, rect, circle, ellipse, polygon, polyline, line')) {
    if (el.closest(skip)) continue;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    const m = root.multiply(el.getScreenCTM()), group = el.closest('g[id]');
    out.push({ tag: el.tagName.toLowerCase(), id: el.id || '', group: group ? group.id : '', d: shapes[el.tagName.toLowerCase()](el), m: [m.a, m.b, m.c, m.d, m.e, m.f],
      accent: !!(el.closest('.accent, [data-accent]') || /accent/i.test(el.id) || (group && /accent/i.test(group.id))),
      fill: cs.fill, rule: cs.fillRule, stroke: cs.stroke, width: parseFloat(cs.strokeWidth) || 0, cap: cs.strokeLinecap, join: cs.strokeLinejoin });
  }
  return { shapes: out, unused: ['text', 'image', 'use', 'linearGradient', 'radialGradient', 'filter', 'clipPath', 'mask'].filter(t => svg.querySelector(t)) };
}

(async () => {
  const browser = await launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  const made = [];
  for (const def of B.marks.filter(m => m.kind === 'parts')) {
    const file = path.join(dir, 'brand', def.file), warn = [];
    if (!fs.existsSync(file)) throw new Error(`the mark's drawing is not there: brand/${def.file}. Draw it as an SVG, one filled shape for each part, or start from a picture with the trace step`);
    await page.setContent(`<!doctype html><html><body style="margin:0">${fs.readFileSync(file, 'utf8').replace(/<\?xml[^>]*\?>|<!DOCTYPE[^>]*>/gi, '')}</body></html>`);
    const got = await page.evaluate(read);
    if (got.error) throw new Error(`brand/${def.file}: ${got.error}`);
    for (const t of got.unused) warn.push(t === 'text' ? 'the file holds text: letters must be turned into outlines to be part of the mark' : t === 'image' ? 'the file holds a picture (<image>), which is not part of the outline: trace it first' : t === 'use' ? 'the file uses <use>: copy the shape in instead, a reused shape is not read' : `the file holds a ${t}, which is not kept: the mark is flat shapes, and its colours come from the settings`);

    // each shape as a clean outline in the drawing's units
    let parts = [];
    for (const s of got.shapes) {
      const filled = s.fill !== 'none' && !/rgba\(0, 0, 0, 0\)/.test(s.fill), lined = s.stroke !== 'none' && s.width > 0;
      if (!filled && !lined) continue;
      let it = O.item(s.d);
      it.transform(new paper.Matrix(...s.m));
      const grow = Math.sqrt(Math.abs(s.m[0] * s.m[3] - s.m[1] * s.m[2]));
      let shape = null;
      if (filled) {
        for (const c of O.children(it)) if (!c.closed) c.closePath();
        it.fillRule = s.rule === 'evenodd' ? 'evenodd' : 'nonzero';
        // crossings and the fill rule are worked out once, so that the outline fills the same everywhere
        const tangled = O.children(it).length > 1 || O.children(it).some(c => c.getIntersections(c).length > 0);
        shape = tangled ? it.unite(new paper.Path({ insert: false }), { insert: false }) : it;
      }
      if (lined) {
        // a line is turned into the outline of its stroke
        const cap = s.cap === 'round' ? 'round' : 'butt', join = s.join === 'round' ? 'round' : s.join === 'bevel' ? 'bevel' : 'miter';
        const stroked = O.children(it).map(c => PaperOffset.offsetStroke(c, s.width * grow / 2, { cap, join, insert: false })).reduce((a, b) => a.unite(b, { insert: false }));
        shape = shape ? shape.unite(stroked, { insert: false }) : stroked;
        if (!filled) warn.push(`"${s.id || s.tag}" is a line: its stroke was turned into an outline ${n2(s.width * grow)} wide`);
      }
      if (!shape || Math.abs(shape.area) < 1e-6) continue;
      parts.push({ id: s.id || s.group, accent: s.accent, shape });
    }
    if (!parts.length) throw new Error(`brand/${def.file} holds no filled shape to read`);
    // names: the shape's own id, made plain, or part-1, part-2...
    const used = new Set();
    parts.forEach((p, i) => { let id = String(p.id || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || `part-${i + 1}`; while (used.has(id)) id += '-2'; used.add(id); p.id = id; });
    if (def.accentParts) for (const p of parts) p.accent = def.accentParts.includes(p.id);

    // sized so that the longer side is 1000 units, with its top left corner at the origin
    const all = parts.map(p => p.shape.bounds).reduce((a, b) => a.unite(b)), k = SIDE / Math.max(all.width, all.height);
    for (const p of parts) { p.shape.translate([-all.x, -all.y]); p.shape.scale(k, [0, 0]); }
    const bw = n2(all.width * k), bh = n2(all.height * k), bounds = [0, 0, bw, bh], mid = [bw / 2, bh / 2];
    // each outline starts at its point nearest the middle of the mark, so that in motion a line drawn from its
    // start runs outwards. (A part made of several outlines is left as it is drawn.)
    if (!def.keepStarts) for (const p of parts) {
      const c = O.children(p.shape);
      if (c.length !== 1 || c[0].segments.length < 3) continue;
      const segs = c[0].segments, near = segs.reduce((a, s) => Math.hypot(s.point.x - mid[0], s.point.y - mid[1]) < Math.hypot(a.point.x - mid[0], a.point.y - mid[1]) ? s : a);
      if (near.index) { const copy = segs.map(s => s.clone()); c[0].removeSegments(); c[0].addSegments([...copy.slice(near.index), ...copy.slice(0, near.index)]); c[0].closed = true; }
    }
    for (const p of parts) { p.d = O.toD(p.shape); p.shape = O.item(p.d); p.pts = O.sample(p.shape, 3); p.area = Math.abs(p.shape.area); }
    if (parts.some(p => /NaN/.test(p.d))) throw new Error('a part came out with broken path data: ' + parts.filter(p => /NaN/.test(p.d)).map(p => p.id).join(', '));
    // the larger parts first; an accent part keeps its place among them
    const total = parts.reduce((n, p) => n + p.area, 0), edges = parts.flatMap(p => p.pts);

    // ---- what is measured
    const accents = parts.some(p => p.accent) ? parts.filter(p => p.accent) : parts;
    const axis = O.farthest(accents.flatMap(p => p.pts)).sort((a, b) => Math.abs(a[0] - b[0]) > Math.abs(a[1] - b[1]) * 0.5 ? a[0] - b[0] : a[1] - b[1]);
    const room = O.roomiestBox(parts.map(p => p.shape), edges, bounds, BOX), roomy = room.width / bw >= ROOM / 4;
    const wide = Math.min(4, Math.max(0.9, n2(ROOM * bw / Math.max(room.width, 1))));
    const gaps = [];
    for (let i = 0; i < parts.length; i++) for (let j = i + 1; j < parts.length; j++) { const g = O.gap(parts[i].pts, parts[j].pts); if (g < Math.max(bw, bh) * 0.12) gaps.push({ between: [parts[i].id, parts[j].id], units: n2(g), pct: +(g / bw * 100).toFixed(1) }); }
    const turn = Object.fromEntries(parts.map(p => { const [a, b] = O.farthest(p.pts); return [p.id, [n2(a[0]), n2(a[1]), n2(b[0]), n2(b[1])]]; }));
    const nodes = Object.fromEntries(parts.map(p => [p.id, O.children(p.shape).reduce((n, c) => n + c.segments.length, 0)]));
    // the smallest width at which the narrowest gap between two parts is still a whole pixel
    const tight = gaps.length ? Math.min(...gaps.map(g => g.units)) : null, minWidth = tight ? Math.ceil(bw / tight) : 16;

    if (parts.length > 8) warn.push(`${parts.length} parts: a mark of a few parts reads better small and moves better. Join what belongs together`);
    for (const p of parts) {
      if (nodes[p.id] > 40) warn.push(`"${p.id}" has ${nodes[p.id]} points: that is a traced outline, not a drawn one. Redraw it with fewer points and smooth curves`);
      if (p.area / total < 0.004) warn.push(`"${p.id}" is under half a percent of the mark: it will vanish at small sizes`);
    }
    for (let i = 0; i < parts.length; i++) for (let j = i + 1; j < parts.length; j++) {
      const both = parts[i].shape.intersect(parts[j].shape, { insert: false });
      if (Math.abs(both.area) > total * 0.004) warn.push(`"${parts[i].id}" and "${parts[j].id}" overlap: the accent parts are drawn over the rest, so check the mark in one colour`);
    }
    if (!parts.some(p => p.accent)) warn.push('no part is marked as the accent (class="accent"), so the whole mark takes the brand\'s colour in the colour versions');
    if (!roomy) warn.push('the mark has no roomy place inside it, so banners are the lockup on a plain surface, and the Outline and Shadow art are left out');
    if (tight !== null && tight / bw < 0.012) warn.push(`the narrowest gap between two parts is ${(tight / bw * 100).toFixed(1)}% of the mark's width: that is a hairline. Open it to about 2%`);

    const out = {
      comment: `Written by the mark step from brand/${def.file}: the mark's outline, sized so that its longer side is ${SIDE} units. Change the drawing, not this file.`,
      source: def.file, bounds,
      parts: parts.map(p => ({ id: p.id, d: p.d, ...(p.accent ? { accent: true } : {}) })),
      accentAxis: [n2(axis[0][0]), n2(axis[0][1]), n2(axis[1][0]), n2(axis[1][1])],
      inside: room.at, insideBox: [room.width, n2(room.width / BOX)], roomy, scale: { wide, tall: n2(wide * 1.9 / 1.29) },
      turn,
      measures: { aspect: +(bw / bh).toFixed(3), nodes, areaPct: Object.fromEntries(parts.map(p => [p.id, +(p.area / total * 100).toFixed(1)])), gaps, gapsCloseUnderPx: tight ? minWidth : null },
      warnings: warn,
    };
    fs.writeFileSync(path.join(dir, 'brand', def.geometry), JSON.stringify(out, null, 1) + '\n');

    // ---- the sheet to look at
    const body = (fill, acc) => parts.filter(p => !p.accent).map(p => `<path fill="${fill}" d="${p.d}"/>`).join('') + parts.filter(p => p.accent).map(p => `<path fill="${acc}" d="${p.d}"/>`).join('');
    const a0 = Object.values(B.colours.accents)[0], ink = B.colours.ink, white = B.colours.white, stops = a0 ? a0.stops : [white, white, white];
    const grad = id => `<defs><linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${out.accentAxis[0]}" y1="${out.accentAxis[1]}" x2="${out.accentAxis[2]}" y2="${out.accentAxis[3]}">${stops.map((c, i) => `<stop offset="${i / (stops.length - 1)}" stop-color="${c}"/>`).join('')}</linearGradient></defs>`;
    const vb = `viewBox="${-40} ${-40} ${bw + 80} ${bh + 80}"`, label = p => { const b = p.shape.bounds; return `<text x="${n2(b.center.x)}" y="${n2(b.center.y)}" text-anchor="middle" font-size="${n2(Math.max(bw, bh) * 0.035)}" font-family="Segoe UI, Arial, sans-serif" font-weight="600" fill="#ff4d4d" stroke="${ink}" stroke-width="${n2(Math.max(bw, bh) * 0.008)}" paint-order="stroke">${p.id}${p.accent ? ' *' : ''}</text>`; };
    const small = (bg, fill) => `<div class="row" style="background:${bg}">${[16, 24, 32, 48, 64, 96].map(w => `<svg width="${w}" viewBox="0 0 ${bw} ${bh}">${body(fill, fill)}</svg>`).join('')}</div>`;
    const sheet = `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;width:1600px;background:#1b1b24;font:600 15px/1.4 "Segoe UI",Arial,sans-serif;color:#f4f4f6;display:grid;grid-template-columns:1fr 1fr;gap:14px;padding:14px;box-sizing:border-box}.t{display:grid;place-items:center;padding:34px;border-radius:14px;position:relative;min-height:340px}.t svg{width:86%;max-height:400px}.t span{position:absolute;left:16px;top:12px;font-size:13px;opacity:.75}.row{display:flex;align-items:flex-end;gap:22px;padding:22px 26px;border-radius:14px}.wide{grid-column:span 2}</style></head><body>
      <div class="t" style="background:${ink}"><span>on dark, in the first accent</span><svg ${vb}>${grad('a')}${body(white, 'url(#a)')}</svg></div>
      <div class="t" style="background:${white};color:${ink}"><span>on light, one colour</span><svg ${vb}>${body('#000', '#000')}</svg></div>
      <div class="t" style="background:${ink}"><span>parts as named (* accent), where a lockup sits inside the outline, the line the accent runs along</span><svg ${vb}>${body('#3a3a48', '#5a5a6c')}<rect x="${n2(room.at[0] - room.width / 2)}" y="${n2(room.at[1] - room.width / BOX / 2)}" width="${room.width}" height="${n2(room.width / BOX)}" fill="none" stroke="#2bd67b" stroke-width="${n2(Math.max(bw, bh) * 0.004)}" stroke-dasharray="${n2(Math.max(bw, bh) * 0.012)}"/><path d="M${out.accentAxis[0]} ${out.accentAxis[1]}L${out.accentAxis[2]} ${out.accentAxis[3]}" stroke="#ffa51f" stroke-width="${n2(Math.max(bw, bh) * 0.005)}"/>${parts.map(label).join('')}</svg></div>
      <div class="t" style="background:${ink}"><span>as lines</span><svg ${vb}>${grad('b')}<g fill="none" stroke-width="${n2(Math.max(bw, bh) * 0.006)}" stroke-linejoin="round">${parts.map(p => `<path stroke="${p.accent ? 'url(#b)' : '#7c7c8a'}" d="${p.d}"/>`).join('')}</g></svg></div>
      <div class="wide">${small(ink, white)}</div><div class="wide">${small(white, '#000')}</div>
      </body></html>`;
    fs.mkdirSync(BUILD, { recursive: true });
    await page.setViewportSize({ width: 1600, height: 900 });
    await page.setContent(sheet);
    // the sheet of the brand's own mark goes with the engine's notes; the sheet of an option being tried sits beside that option
    const png = /[\\/]/.test(def.geometry) ? path.join(dir, 'brand', def.geometry.replace(/\.json$/i, '-sheet.png')) : path.join(BUILD, `mark-${def.id}.png`);
    fs.mkdirSync(path.dirname(png), { recursive: true });
    await page.screenshot({ path: png, fullPage: true });
    made.push({ def, out, png });
  }
  await browser.close();
  for (const { def, out, png } of made) {
    const m = out.measures;
    console.log(`${def.id}: ${out.bounds[2]} x ${out.bounds[3]} units (${m.aspect} wide to 1 high), ${out.parts.length} part${out.parts.length > 1 ? 's' : ''}: ${out.parts.map(p => `${p.id}${p.accent ? ' (accent)' : ''} ${m.nodes[p.id]} points ${m.areaPct[p.id]}%`).join(', ')}`);
    console.log(`  a lockup sits inside the outline round ${out.inside.join(', ')}, in a box ${out.insideBox[0]} units wide${out.roomy ? `. Behind a lockup the mark is drawn ${out.scale.wide} times as wide as the picture` : ': not enough room, so banners are plain'}`);
    if (m.gapsCloseUnderPx > 16) console.log(`  under ${m.gapsCloseUnderPx} px wide the gaps between its parts close and it reads as one shape`);
    if (m.gaps.length) console.log('  gaps: ' + m.gaps.map(g => `${g.between.join(' to ')} ${g.pct}% of the width`).join(', '));
    for (const w of out.warnings) console.log('  note: ' + w);
    console.log(`  written: brand/${def.geometry}. Look at ${png}`);
  }
})().catch(e => { console.error(e.message); process.exit(1); });
