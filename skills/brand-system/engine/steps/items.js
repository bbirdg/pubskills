// Items: the brand on the things it hands out, wraps, sends and wears. Each entry of "items" in brand.json names a
// kind of thing (a business card, a bag, a cup, a sticker) and this step draws its faces at their real size:
// each face as SVG and PNG, one print file for the thing (PDF with bleed, every word as outlines) and a picture of
// the thing itself, drawn, to judge it by. The faces are laid out from the logo files (run the logos step first)
// and from the mark's own art, so a logo sits in a picture's clear area here as it does everywhere else.
// The kinds are in ITEMS below. A brand adds its own with "item": "panel" and a size, or with a module of its own
// in the brand folder ("module": "items/menu.js"), which is given the same tools the kinds here are drawn with.
// usage: node run.js items <brand folder> [filter]     e.g. node run.js items <folder> bag
const fs = require('fs'), path = require('path');
const S = require('../lib/system').open();
const K = require('../lib/artkit')(S);
const { launch } = require('../lib/browser');
const { brand: B, OUT, INK, WHITE, ACCENTS, NEUTRALS, PAPER, r } = S, only = S.args.rest[0] || '';

const PT = 0.3528, BLEED = 3;                 // a point in millimetres; how far a printed background runs past the cut
const NATURAL = '#E9E1CF', KRAFT = '#C8A77C'; // unbleached cotton and brown paper, for things that are not printed edge to edge
let uidN = 0;
// a drawing put inside another: its ids are made its own, so two drawings never share a paint
const own = svg => { const n = ++uidN; return svg.replace(/\bid="([^"]+)"/g, (m, id) => `id="${id}-i${n}"`).replace(/url\(#([^)]+)\)/g, (m, id) => `url(#${id}-i${n})`).replace(/href="#([^"]+)"/g, (m, id) => `href="#${id}-i${n}"`); };
const dark = c => S.contrast(c, WHITE) > S.contrast(c, INK);          // is a colour dark enough to carry light words?

// ---------------------------------------------------------------- what a face is drawn with
// Every measure is in millimetres, from the top left corner of the cut. A background runs BLEED past every edge.
function tools(entry, b, W, H, bleed) {
  const m = b.mark, a = b.accent && ACCENTS[b.accent], brandTone = B.tone, other = brandTone === 'light' ? 'dark' : 'light';
  const surface = tone => tone === 'dark' ? INK : WHITE;
  const fill = colour => `<rect x="${-bleed}" y="${-bleed}" width="${r(W + bleed * 2)}" height="${r(H + bleed * 2)}" fill="${colour}"/>`;
  // the accent across the whole face, from its first stop at the bottom left to its last at the top right
  const accentFill = () => { const id = `acc${++uidN}`; return `<defs><linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${-bleed}" y1="${H + bleed}" x2="${W + bleed}" y2="${-bleed}">${S.stopsSvg(a.stops)}</linearGradient></defs>` + fill(`url(#${id})`); };
  // one of the brand's logo files, as wide as it can be inside a box [x, y, w, h], in the middle of it.
  // name: "lockup", "stacked", "mark" or "icon", then -dark, -light, -white or -black for what it stands on
  const drawing = name => {
    const src = m.source(name, b);
    if (!src) throw new Error(`the item "${entry.item}" asks for the logo "${name}", which the mark "${m.id}" does not have`);
    if (src.file && !fs.existsSync(path.join(OUT, src.file))) throw new Error(`${src.file} is not made yet: run the logos step first`);
    const text = src.svg || fs.readFileSync(path.join(OUT, src.file), 'utf8'), [, , vw, vh] = text.match(/viewBox="([^"]+)"/)[1].split(/[ ,]+/).map(Number);
    return { text, vw, vh };
  };
  function logo(name, box, share = 1, width = null) {
    const { text, vw, vh } = drawing(name), w = width || Math.min(box[2], box[3] * vw / vh) * share, h = w * vh / vw, x = box[0] + (box[2] - w) / 2, y = box[1] + (box[3] - h) / 2;
    return `<g transform="translate(${r(x, 3)} ${r(y, 3)}) scale(${r(w / vw, 6)})">${own(text.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, ''))}</g>`;
  }
  // whichever of the lockups fills a box better: the one beside the mark or the one under it
  const lockup = (on, box, share = 1) => { const area = n => { const v = drawing(n), w = Math.min(box[2], box[3] * v.vw / v.vh); return w * w * v.vh / v.vw; }; return logo(area(`lockup-${on}`) >= area(`stacked-${on}`) ? `lockup-${on}` : `stacked-${on}`, box, share); };
  // one of the mark's kinds of art as the background of a face: { svg, clear: the box that is kept clear for a logo or words }
  function art(kind, tone) {
    const f = m.art, v = f && f.variants.find(x => x.id === kind);
    if (!v) return null;
    const th = K.THEMES[tone === 'light' ? 1 : 0], c = f.colours.find(x => x.accent === (b.accent || null)) || f.colours[0], k = 10;
    const p = v.draw((W + bleed * 2) * k, (H + bleed * 2) * k, c, th);
    return { clear: p.clear.map((n, i) => n / k - (i < 2 ? bleed : 0)), svg: fill(th.back) + `<g transform="translate(${-bleed} ${-bleed}) scale(${1 / k})">${own(`<defs>${p.defs}</defs>${p.under || ''}${p.body}${p.top || ''}`)}</g>` };
  }
  // words, as outlines. lines: [{ t, pt: size in points, w: weight 100 to 900, op: opacity, track }]. The block's top is at y
  function words(lines, { x, y, align = 'left', colour, leading = 1.36 } = {}) {
    let at = y, out = '', wide = 0;
    for (const l of lines.filter(l => l && l.t)) {
      const size = l.pt * PT, f = S.font(l.w || 400), o = S.outline(f, String(l.t), size, l.track || 0), cap = -S.outline(f, 'H', size).y1;
      const tx = align === 'center' ? x - (o.x1 + o.x2) / 2 : align === 'right' ? x - o.x2 : x - o.x1;
      out += `<path fill="${colour}"${l.op ? ` fill-opacity="${l.op}"` : ''} transform="translate(${r(tx, 3)} ${r(at + cap, 3)})" d="${o.d}"/>`;
      at += size * leading; wide = Math.max(wide, o.w);
    }
    return { svg: out, h: at - y, w: wide };
  }
  // a title that is made as large as its box allows, up to `max` points, with smaller lines under it
  function titled(title, lines, box, colour, max = Math.max(20, H * 0.22)) {
    let pt = max;
    const f = S.font(B.type.weights.hero || 800), set = () => [{ t: title, pt, w: B.type.weights.hero || 800, track: -0.02 }, ...lines.map(t => ({ t, pt: Math.max(7, pt * 0.3), w: 500, op: 0.78 }))];
    const size = () => { const o = S.outline(f, String(title), pt * PT, -0.02); return [Math.max(o.w, ...lines.map(t => S.outline(S.font(500), String(t), Math.max(7, pt * 0.3) * PT).w), 0), words(set(), { x: 0, y: 0, colour }).h]; };
    while (pt > 8 && (size()[0] > box[2] || size()[1] > box[3])) pt -= 1;
    const [, h] = size();
    return words(set(), { x: box[0] + box[2] / 2, y: box[1] + (box[3] - h) / 2, align: 'center', colour }).svg;
  }
  const ink = tone => tone === 'dark' ? NEUTRALS.text : INK;
  return { entry, b, m, a, W, H, bleed, tone: entry.tone || brandTone, other: entry.tone ? (entry.tone === 'light' ? 'dark' : 'light') : other, fields: entry.fields || {}, surface, fill, accentFill, logo, lockup, art, words, titled, ink, own, dark, r, S, K, NATURAL, KRAFT, PT };
}
// art behind a logo: the kind that was asked for, or the first that this mark has from a list, or none
const pick = (t, asked, list) => asked === 'none' || asked === false ? null : [].concat(asked || [], list).map(k => t.art(k, t.tone)).find(Boolean) || null;
// a face that is a logo on the brand's own surface, with art behind it where there is some
function logoFace(t, asked, list, margin = 0.1) {
  const p = pick(t, asked, list), box = p ? p.clear : [t.W * margin, t.H * margin, t.W * (1 - margin * 2), t.H * (1 - margin * 2)];
  const f = t.fields, said = f.title ? t.titled(f.title, f.lines || [], box, t.ink(t.tone)) : null;
  return (p ? p.svg : t.fill(t.surface(t.tone))) + (said || t.lockup(t.tone, box, p ? 0.94 : 0.62));
}

// ---------------------------------------------------------------- the kinds of thing
// size: [width, height] in millimetres. faces(t): what is printed, each { id, label, svg }. shape: how it is cut.
const ITEMS = {
  'business-card': {
    label: 'Business card', sizes: { eu: [85, 55], us: [88.9, 50.8], jp: [91, 55], square: [65, 65] }, bleed: BLEED, note: 'Two sides. Give the name, the role and the lines of the back under "fields".',
    faces(t) {
      const f = t.fields, on = t.other, m = 6.5, lines = [].concat(f.lines || []), url = B.url.replace(/^https?:\/\//, '').replace(/\/$/, '');
      const front = (t.entry.art ? logoFace(t, t.entry.art, []) : t.fill(t.surface(t.tone)) + t.lockup(t.tone, [t.W * 0.14, t.H * 0.14, t.W * 0.72, t.H * 0.72], 0.82));
      let back = t.fill(t.surface(on));
      if (f.name || lines.length) {
        const block = [f.name && { t: f.name, pt: 10.5, w: 700 }, f.role && { t: f.role, pt: 7.5, w: 500, op: 0.7 }, (f.name || f.role) && { t: ' ', pt: 3.5 }, ...lines.map(l => ({ t: l, pt: 7.2, w: 500, op: 0.86 }))].filter(Boolean);
        const h = t.words(block, { x: 0, y: 0, colour: '#000' }).h;
        back += t.logo(`mark-${on}`, [m - 1.2, m - 1.2, 16, 12]) + t.words(block, { x: m, y: t.H - m - h + 1, colour: t.ink(on) }).svg;
      } else back += t.logo(`mark-${on}`, [t.W * 0.3, t.H * 0.2, t.W * 0.4, t.H * 0.42]) + (url ? t.words([{ t: url, pt: 7.5, w: 600, track: 0.04 }], { x: t.W / 2, y: t.H * 0.74, align: 'center', colour: t.ink(on) }).svg : '');
      return [{ id: 'front', label: 'Front', svg: front }, { id: 'back', label: 'Back', svg: back, on }];
    },
    scene: (t, F) => t.lay(F[1], 230, 190, 8.2, -8) + t.lay(F[0], 700, 560, 8.2, 6),
  },
  letterhead: {
    label: 'Letterhead', sizes: { a4: [210, 297], letter: [215.9, 279.4] }, bleed: 0, note: 'The logo and one line at the foot: the rest of the sheet is for the letter. "fields.lines" is the line at the foot.',
    faces(t) {
      const lines = [].concat(t.fields.lines || []), foot = lines.join('   ·   '), m = 20, rule = t.a ? t.a.onLight : INK;
      return [{ id: 'sheet', label: 'Sheet', on: 'light', svg: t.fill('#FFFFFF') + t.logo('lockup-light', [m - 4, 12, 62, 26]) + (foot ? `<rect x="${m}" y="${t.H - 19}" width="${t.W - m * 2}" height="0.3" fill="${rule}"/>` + t.words([{ t: foot, pt: 7.5, w: 500, op: 0.75 }], { x: m, y: t.H - 15.5, colour: INK }).svg : '') }];
    },
    scene: (t, F) => t.lay(F[0], 476, 96, 3.08, -2.5),
  },
  sticker: {
    label: 'Sticker', sizes: { round: [60, 60], small: [40, 40] }, bleed: BLEED, shape: 'circle', note: 'One for each way the mark stands: on the brand\'s surface, on its accent and on paper.',
    faces(t) {
      // the mark is as wide as it can be and stay inside the circle, as in a profile picture (its file has a little room round it)
      const box = [0, 0, t.W, t.H], wide = (t.m.fit ? t.m.fit(t.W, 0.6) : t.W * 0.56) * 1.08, out = [{ id: 'surface', label: 'On the brand\'s surface', svg: t.fill(t.surface(t.tone)) + t.logo(`mark-${t.tone}`, box, 1, wide) }];
      if (t.a) out.push({ id: 'accent', label: `On ${t.a.label}`, svg: t.accentFill() + t.logo(t.a.onAccent === WHITE ? 'mark-white' : 'mark-black', box, 1, wide) });
      out.push({ id: 'paper', label: t.tone === 'light' ? 'On dark' : 'On paper', on: t.other, svg: t.fill(t.surface(t.other)) + t.logo(`mark-${t.other}`, box, 1, wide) });
      return out;
    },
    scene: (t, F) => F.map((f, i) => t.lay(f, [330, 660, 990][i] + (3 - F.length) * 165, [330, 520, 300][i], 6, [-8, 6, 12][i], { rim: 9 })).join(''),
  },
  tag: {
    label: 'Hang tag', sizes: { tall: [50, 90], small: [40, 70] }, bleed: BLEED, round: 3, hole: [0.5, 8, 2.2], note: 'A hole 4.4 mm wide, 8 mm from the top: tell the printer. "fields.title" and "fields.lines" go on the back.',
    faces(t) {
      const f = t.fields, on = t.other, lines = [].concat(f.lines || []);
      const block = [f.title && { t: f.title, pt: 9.5, w: 700 }, f.title && { t: ' ', pt: 3 }, ...lines.map(l => ({ t: l, pt: 7, w: 500, op: 0.85 }))].filter(Boolean), h = block.length ? t.words(block, { x: 0, y: 0, colour: '#000' }).h : 0;
      return [{ id: 'front', label: 'Front', svg: t.fill(t.surface(t.tone)) + t.lockup(t.tone, [4, 18, t.W - 8, t.H - 26], 0.9) },
        { id: 'back', label: 'Back', on, svg: t.fill(t.surface(on)) + (block.length ? t.words(block, { x: t.W / 2, y: 22 + (t.H - 48 - h) / 2, align: 'center', colour: t.ink(on) }).svg + t.logo(`mark-${on}`, [t.W * 0.34, t.H - 24, t.W * 0.32, 14]) : t.logo(`mark-${on}`, [t.W * 0.2, 22, t.W * 0.6, t.H - 40])) }];
    },
    scene: (t, F) => `<path d="M770 -20 C 690 150, 640 230, 742 322" fill="none" stroke="${NATURAL}" stroke-width="5" stroke-linecap="round" opacity="0.9"/>` + t.lay(F[1], 880, 300, 7, 9) + t.lay(F[0], 560, 250, 7.6, -7),
  },
  label: {
    label: 'Label', sizes: { wide: [80, 50], small: [60, 40], square: [60, 60] }, bleed: BLEED, round: 3, note: 'A label for a packet, a jar or a box. "fields.title" and "fields.lines" are set under the logo.',
    faces(t) {
      const f = t.fields, lines = [].concat(f.lines || []), has = f.title || lines.length;
      const block = [f.title && { t: f.title, pt: 10, w: 700 }, ...lines.map(l => ({ t: l, pt: 7, w: 500, op: 0.82 }))].filter(Boolean), h = has ? t.words(block, { x: 0, y: 0, colour: '#000' }).h : 0;
      return [{ id: 'front', label: 'Label', svg: t.fill(t.surface(t.tone)) + (has ? t.lockup(t.tone, [5, 4, t.W - 10, t.H - h - 12], 0.9) + t.words(block, { x: t.W / 2, y: t.H - h - 5.5, align: 'center', colour: t.ink(t.tone) }).svg : t.lockup(t.tone, [5, 5, t.W - 10, t.H - 10], 0.84)) }];
    },
    // on a paper pouch with a folded top
    scene: (t, F) => `<g filter="url(#soft)" opacity="0.4"><rect x="512" y="186" width="600" height="900" rx="26"/></g><rect x="500" y="160" width="600" height="900" rx="26" fill="${KRAFT}"/><rect x="500" y="160" width="600" height="96" rx="26" fill="#000" opacity="0.09"/><rect x="500" y="250" width="600" height="3" fill="#000" opacity="0.14"/>` + t.lay(F[0], 800 - F[0].w * 2.75, 640 - F[0].h * 2.75, 5.5, -3, { shade: 0.25 }),
  },
  bag: {
    label: 'Bag', sizes: { medium: [240, 320], small: [180, 240], large: [320, 400] }, bleed: BLEED, note: 'The front of a paper bag. A bag maker has its own template for the folds and the handles: this is the art for its front.',
    faces: t => [{ id: 'front', label: 'Front', svg: logoFace(t, t.entry.art, t.a ? ['sweep', 'shadow', 'pattern'] : ['shadow', 'pattern']) }],
    scene(t, F) {
      const f = F[0], k = 800 / f.h, w = f.w * k, x = 800 - w / 2 - 40, y = 290, side = dark(f.bg) ? '#000' : '#000', rope = dark(f.bg) ? NEUTRALS['text-3'] : PAPER['paper-soft'];
      const handle = d => `<path d="M${x + w * 0.3 + d} ${y + 6} C ${x + w * 0.3 + d} ${y - 190}, ${x + w * 0.7 + d} ${y - 190}, ${x + w * 0.7 + d} ${y + 6}" fill="none" stroke="${rope}" stroke-width="11" stroke-linecap="round"/>`;
      return `<g filter="url(#soft)" opacity="0.45"><path d="M${x + 10} ${y + 800 - 8}h${w + 96}l40 34H${x - 30}z"/></g>${handle(34)}<path d="M${x + w} ${y}l84 44v${800 - 20}l-84 -24z" fill="${f.bg}"/><path d="M${x + w} ${y}l84 44v${800 - 20}l-84 -24z" fill="${side}" opacity="0.28"/>` + t.lay(f, x, y, k, 0, { shadow: 0 }) + `<rect x="${x}" y="${y}" width="${w}" height="20" fill="#000" opacity="0.1"/>${handle(0)}`;
    },
  },
  cup: {
    label: 'Cup', sizes: { print: [80, 70] }, bleed: 0, note: 'The print on a takeaway cup. A cup maker has its own template for the curve: this is the art for the middle of it.',
    faces: t => [{ id: 'print', label: 'Print', svg: t.fill(t.surface(t.tone)) + t.lockup(t.tone, [t.W * 0.08, t.H * 0.08, t.W * 0.84, t.H * 0.84], 0.86) }],
    scene(t, F) {
      const f = F[0], lid = dark(f.bg) ? '#ECECF0' : (S.contrast(INK, WHITE) > 4 ? INK : '#26262B'), id = `cup${++uidN}`, k = 372 / f.w;
      return `<defs><clipPath id="${id}"><path d="M572 400H1028L952 1050H648Z"/></clipPath><linearGradient id="${id}s" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#000" stop-opacity="0.34"/><stop offset="0.3" stop-color="#000" stop-opacity="0"/><stop offset="0.66" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.38"/></linearGradient></defs>` +
        `<g filter="url(#soft)" opacity="0.5"><ellipse cx="812" cy="1054" rx="210" ry="26"/></g><g clip-path="url(#${id})"><rect x="560" y="390" width="480" height="670" fill="${f.bg}"/><g transform="translate(${800 - f.w * k / 2} ${700 - f.h * k / 2}) scale(${k})">${f.svg}</g><rect x="560" y="390" width="480" height="670" fill="url(#${id}s)"/></g>` +
        `<rect x="546" y="350" width="508" height="58" rx="16" fill="${lid}"/><rect x="596" y="306" width="408" height="54" rx="18" fill="${lid}"/><rect x="546" y="396" width="508" height="12" rx="6" fill="#000" opacity="0.14"/><rect x="596" y="350" width="408" height="8" fill="#000" opacity="0.1"/>`;
    },
  },
  box: {
    label: 'Box', sizes: { lid: [200, 200], small: [140, 140] }, bleed: BLEED, note: 'The lid of a box. A box maker has its own template for the sides: this is the art for the top.',
    faces: t => [{ id: 'lid', label: 'Lid', svg: logoFace(t, t.entry.art, ['pattern', 'outline', 'shadow']) }],
    scene(t, F) {
      const f = F[0], s = 560, k = s / f.w, h = 170, top = `matrix(0.866 0.5 -0.866 0.5 800 250)`;
      return `<g filter="url(#soft)" opacity="0.5"><path d="M330 ${540 + h + 20}L800 ${810 + h + 30}L1300 ${540 + h}L820 ${290 + h}Z"/></g>` +
        `<path d="M315 530L800 810V${810 + h}L315 ${530 + h}Z" fill="${f.bg}"/><path d="M315 530L800 810V${810 + h}L315 ${530 + h}Z" fill="#000" opacity="0.22"/><path d="M800 810L1285 530V${530 + h}L800 ${810 + h}Z" fill="${f.bg}"/><path d="M800 810L1285 530V${530 + h}L800 ${810 + h}Z" fill="#000" opacity="0.4"/>` +
        `<g transform="${top}"><g transform="scale(${k})"><svg width="${f.w}" height="${f.h}" viewBox="0 0 ${f.w} ${f.h}">${f.svg}</svg></g></g><path d="M315 530L800 810L1285 530" fill="none" stroke="#fff" stroke-opacity="0.12" stroke-width="2"/>`;
    },
  },
  tote: {
    label: 'Tote bag', sizes: { print: [260, 300] }, bleed: 0, plain: true, note: 'One colour, as cloth is printed: the logo alone, with nothing behind it. The cloth is not part of the print: unbleached, or black with "cloth": "black".',
    faces(t) { const black = t.entry.cloth === 'black'; return [{ id: 'print', label: 'Print', bg: black ? '#16161A' : NATURAL, on: black ? 'dark' : 'light', svg: t.logo(`stacked-${black ? 'white' : 'black'}`, [t.W * 0.06, t.H * 0.06, t.W * 0.88, t.H * 0.88]) }]; },
    scene(t, F) {
      const f = F[0], k = 1.5, strap = d => `<path d="M${640 + d} 430C${640 + d} 120, ${960 + d} 120, ${960 + d} 430" fill="none" stroke="${f.bg}" stroke-width="34"/><path d="M${640 + d} 430C${640 + d} 120, ${960 + d} 120, ${960 + d} 430" fill="none" stroke="#000" stroke-opacity="${d ? 0.3 : 0.12}" stroke-width="34"/>`;
      return `${strap(26)}<g filter="url(#soft)" opacity="0.42"><rect x="492" y="446" width="640" height="690" rx="12"/></g><rect x="480" y="420" width="640" height="690" rx="12" fill="${f.bg}"/><rect x="480" y="420" width="640" height="26" fill="#000" opacity="0.08"/>${strap(0)}<g transform="translate(${800 - f.w * k / 2} ${790 - f.h * k / 2}) scale(${k})">${f.svg}</g><rect x="480" y="420" width="640" height="690" rx="12" fill="none" stroke="#000" stroke-opacity="0.12" stroke-width="2"/>`;
    },
  },
  poster: {
    label: 'Poster', sizes: { a3: [297, 420], a2: [420, 594], a4: [210, 297], us: [457.2, 609.6] }, bleed: BLEED, note: 'The mark\'s own art with the logo in its clear area. With "fields.title", the title stands there instead.',
    faces: t => [{ id: 'poster', label: 'Poster', svg: logoFace(t, t.entry.art, ['echo', 'shadow', 'sweep', 'pattern']) }],
    scene(t, F) { const f = F[0], k = 920 / f.h, w = f.w * k, x = 800 - w / 2, y = 140, edge = 14; return `<g filter="url(#soft)" opacity="0.5"><rect x="${x - edge + 10}" y="${y - edge + 22}" width="${w + edge * 2}" height="${920 + edge * 2}"/></g><rect x="${x - edge}" y="${y - edge}" width="${w + edge * 2}" height="${920 + edge * 2}" fill="${B.tone === 'light' ? '#1D1D21' : '#050506'}"/>` + t.lay(f, x, y, k, 0, { shadow: 0 }); },
  },
  // any flat thing of the brand's own: a sign, a cover, a screen, a wrapper. "size": [w, h], in mm or with "unit": "px"
  panel: {
    label: 'Panel', sizes: {}, bleed: BLEED, note: 'The mark\'s own art with the logo in its clear area, at the size given.',
    faces: t => [{ id: 'face', label: t.entry.label || 'Face', svg: logoFace(t, t.entry.art, t.W > t.H * 1.2 ? ['outline', 'echo', 'sweep', 'shadow'] : ['sweep', 'echo', 'shadow', 'pattern']) }],
    scene(t, F) { const f = F[0], k = Math.min(1240 / f.w, 900 / f.h); return t.lay(f, 800 - f.w * k / 2, 600 - f.h * k / 2, k, 0); },
  },
};

// ---------------------------------------------------------------- the picture of the thing
const SW = 1600, SH = 1200;
// a face laid into the picture: its top left corner at x, y, k pixels to the millimetre, turned round its middle,
// with a soft shadow under it. rim: a white edge round a sticker. shade: a shadow that is lighter or none
function lay(f, x, y, k, turn = 0, { rim = 0, shadow = 1, shade = 0.42 } = {}) {
  const w = f.w * k, h = f.h * k, id = `lay${++uidN}`, rx = f.shape === 'circle' ? w / 2 : (f.round || 0) * k;
  const cut = (grow = 0) => `<rect x="${r(x - grow)}" y="${r(y - grow)}" width="${r(w + grow * 2)}" height="${r(h + grow * 2)}" rx="${r(rx + grow)}"/>`;
  const hole = f.hole ? `<circle cx="${r(x + w * f.hole[0])}" cy="${r(y + f.hole[1] * k)}" r="${r(f.hole[2] * k)}" fill="url(#room)"/><circle cx="${r(x + w * f.hole[0])}" cy="${r(y + f.hole[1] * k)}" r="${r(f.hole[2] * k)}" fill="#000" opacity="0.25"/>` : '';
  return `<g transform="rotate(${turn} ${r(x + w / 2)} ${r(y + h / 2)})">${shadow ? `<g filter="url(#soft)" opacity="${shade * shadow}" transform="translate(8 20)">${cut(rim)}</g>` : ''}${rim ? `<g fill="#fff">${cut(rim)}</g>` : ''}<defs><clipPath id="${id}">${cut()}</clipPath></defs><g clip-path="url(#${id})"><g transform="translate(${r(x)} ${r(y)}) scale(${r(k, 5)})">${f.bg ? `<rect width="${f.w}" height="${f.h}" fill="${f.bg}"/>` : ''}${f.svg}</g></g><g fill="none" stroke="${dark(f.bg || '#ffffff') ? '#fff' : '#000'}" stroke-opacity="0.09" stroke-width="1.5">${cut()}</g>${hole}</g>`;
}
// the room the thing is shown in: the brand's own surface, a shade apart from the thing, with light from the top left
function room(body) {
  const lit = B.tone === 'light', a = lit ? NEUTRALS['paper-2'] : NEUTRALS['surface-3'], b = lit ? PAPER['paper-line'] : NEUTRALS['surface-1'];
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${SW} ${SH}" width="${SW}" height="${SH}"><defs><radialGradient id="room" gradientUnits="userSpaceOnUse" cx="420" cy="200" r="1500"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></radialGradient><filter id="soft" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="18"/></filter></defs><rect width="100%" height="100%" fill="url(#room)"/>${body}</svg>\n`;
}

// ---------------------------------------------------------------- every item of the settings
const list = [], taken = new Set();
for (const entry of B.items) {
  const kind = entry.module ? require(S.own(entry.module, `the item "${entry.id || entry.item || entry.module}"`)) : ITEMS[entry.item];
  if (!kind) throw new Error(`"items" names "${entry.item}", which is not a kind of thing the engine draws. The kinds are: ${Object.keys(ITEMS).join(', ')}. Anything else is a "panel" with a "size", or a module of the brand's own`);
  const b = entry.brand ? S.brands.find(x => x.id === entry.brand) : S.brands[0];
  if (!b) throw new Error(`"items" names the brand "${entry.brand}", which no mark has. A brand is named by its id: ${S.brands.map(x => `"${x.id}"`).join(', ')}`);
  if (!b.mark.source) throw new Error(`the mark "${b.mark.id}" has a kind of its own that gives no logo files by name, so items cannot be laid out from it`);
  const id = entry.id || (entry.item || path.basename(entry.module, '.js')) + (b === S.brands[0] ? '' : `-${b.id}`);
  if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) throw new Error(`an item's "id" names its folder and files, so it must be lower-case letters, digits and hyphens: "${id}"`);
  if (taken.has(id)) throw new Error(`two items are called "${id}": give one of them an "id" of its own`);
  taken.add(id);
  const sizes = kind.sizes || {}, first = Object.keys(sizes)[0], size = Array.isArray(entry.size) ? entry.size : sizes[entry.size || first];
  if (!size || size.length !== 2 || !size.every(n => n > 0)) throw new Error(`the item "${id}" needs a "size": ${Object.keys(sizes).length ? `one of ${Object.keys(sizes).join(', ')}, or ` : ''}[width, height]${entry.item === 'panel' ? ' in millimetres, or in pixels with "unit": "px"' : ' in millimetres'}`);
  const px = entry.unit === 'px', [W, H] = size, bleed = px ? 0 : typeof kind === 'function' ? BLEED : kind.bleed || 0;      // a thing of the brand's own is printed, so it has a bleed
  const t = tools(entry, b, W, H, bleed);
  t.lay = lay;
  const made = typeof kind === 'function' ? kind(t) : kind, faces = made.faces(t).map(f => ({ shape: made.shape, round: entry.round === undefined ? made.round : entry.round, hole: made.hole, w: W, h: H, bg: f.bg || (made.plain ? null : t.surface(f.on || t.tone)), ...f }));
  list.push({ id, kind: made, entry, b, W, H, px, bleed, faces, t, label: entry.label || made.label, note: made.note || '' });
}
if (!list.length) { console.log('the settings list no items ("items" in brand.json): nothing to make. The kinds are: ' + Object.keys(ITEMS).join(', ')); process.exit(0); }
const todo = list.filter(i => i.id.includes(only));
if (!todo.length) throw new Error(`no item has "${only}" in its name. The items are: ${list.map(i => i.id).join(', ')}`);

// a face as a file: cut to its size, or with its bleed for the printer
const cutShape = f => f.shape === 'circle' ? `<circle cx="${f.w / 2}" cy="${f.h / 2}" r="${Math.min(f.w, f.h) / 2}"/>` : `<rect width="${f.w}" height="${f.h}" rx="${f.round || 0}"/>`;
const holeOf = f => f.hole ? `<circle cx="${r(f.w * f.hole[0])}" cy="${f.hole[1]}" r="${f.hole[2]}"/>` : '';
function faceSvg(i, f, { bleed = 0, unit = i.px ? '' : 'mm' } = {}) {
  const id = `cut${++uidN}`, b = bleed, body = bleed || (!f.shape && !f.round && !f.hole) ? f.svg : `<defs><clipPath id="${id}"><path fill-rule="evenodd" clip-rule="evenodd" d="${f.shape === 'circle' ? `M0 ${f.h / 2}a${f.w / 2} ${f.h / 2} 0 1 0 ${f.w} 0a${f.w / 2} ${f.h / 2} 0 1 0 ${-f.w} 0Z` : `M${f.round || 0} 0H${f.w - (f.round || 0)}a${f.round || 0} ${f.round || 0} 0 0 1 ${f.round || 0} ${f.round || 0}V${f.h - (f.round || 0)}a${f.round || 0} ${f.round || 0} 0 0 1 ${-(f.round || 0)} ${f.round || 0}H${f.round || 0}a${f.round || 0} ${f.round || 0} 0 0 1 ${-(f.round || 0)} ${-(f.round || 0)}V${f.round || 0}a${f.round || 0} ${f.round || 0} 0 0 1 ${f.round || 0} ${-(f.round || 0)}Z`}${f.hole ? `M${r(f.w * f.hole[0] - f.hole[2])} ${f.hole[1]}a${f.hole[2]} ${f.hole[2]} 0 1 0 ${f.hole[2] * 2} 0a${f.hole[2]} ${f.hole[2]} 0 1 0 ${-f.hole[2] * 2} 0Z` : ''}"/></clipPath></defs><g clip-path="url(#${id})">${f.svg}</g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="${-b} ${-b} ${r(f.w + b * 2)} ${r(f.h + b * 2)}" width="${r(f.w + b * 2)}${unit}" height="${r(f.h + b * 2)}${unit}">${body}</svg>\n`;
}

(async () => {
  const browser = await launch(), page = await browser.newPage({ deviceScaleFactor: 1 }), notes = [], files = [];
  const shot = async (svg, w, h, rel) => { await page.setViewportSize({ width: Math.round(w), height: Math.round(h) }); await page.setContent(`<body style="margin:0;background:transparent">${svg.replace(/<svg ([^>]*?)width="[^"]*" height="[^"]*"/, `<svg $1width="${Math.round(w)}" height="${Math.round(h)}" style="display:block"`)}</body>`); S.put(rel, await page.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: Math.round(w), height: Math.round(h) } })); files.push(rel); };
  for (const i of todo) {
    const dir = `items/${i.id}`, k = i.px ? 1 : Math.min(12, 2400 / Math.max(i.W, i.H)), out = [];
    for (const f of i.faces) {
      const base = `${dir}/${i.id}-${f.id}`;
      S.put(base + '.svg', faceSvg(i, f)); files.push(base + '.svg');
      await shot(faceSvg(i, f), i.W * k, i.H * k, i.px ? `${base}-${i.W}x${i.H}.png` : base + '.png');
      out.push({ id: f.id, label: f.label, svg: base + '.svg', png: i.px ? `${base}-${i.W}x${i.H}.png` : base + '.png' });
    }
    // the print file: every face on a page of its own, with its bleed, at its real size
    let pdf = null;
    if (!i.px) {
      const w = i.W + i.bleed * 2, h = i.H + i.bleed * 2;
      await page.setContent(`<style>@page{size:${w}mm ${h}mm;margin:0}html,body{margin:0}svg{display:block}svg:not(:last-child){break-after:page}</style>${i.faces.map(f => faceSvg(i, f, { bleed: i.bleed })).join('')}`);
      pdf = `${dir}/${i.id}-print.pdf`;
      fs.mkdirSync(path.join(OUT, dir), { recursive: true });
      await page.pdf({ path: path.join(OUT, pdf), width: `${w}mm`, height: `${h}mm`, printBackground: true });
      files.push(pdf);
    }
    const scene = i.kind.scene ? room(i.kind.scene(i.t, i.faces)) : null;
    if (scene) await shot(scene, SW, SH, `${dir}/${i.id}-shown-${SW}x${SH}.png`);
    notes.push({ id: i.id, item: i.entry.item || 'own', label: i.label, brand: i.b.id, size: [i.W, i.H], unit: i.px ? 'px' : 'mm', bleed: i.bleed, shape: i.kind.shape || (i.kind.round ? 'rounded' : 'square'), note: i.note, faces: out, pdf, shown: scene ? `${dir}/${i.id}-shown-${SW}x${SH}.png` : null });
    console.log(`${i.id}  ${i.W} x ${i.H} ${i.px ? 'px' : 'mm'}  ${out.length} face${out.length > 1 ? 's' : ''}${pdf ? ', print file' : ''}${scene ? ', shown' : ''}`);
  }
  await browser.close();
  // what the page and the check read back. A run for a few items keeps what is known of the others
  const before = only ? (S.read('items') || { items: [], files: [] }) : { items: [], files: [] };
  S.save('items', { comment: 'Written by the items step: every thing that was drawn, its faces and its files.', items: [...before.items.filter(x => !notes.some(n => n.id === x.id) && list.some(l => l.id === x.id)), ...notes].sort((a, b) => list.findIndex(l => l.id === a.id) - list.findIndex(l => l.id === b.id)), files: [...new Set([...before.files.filter(f => list.some(l => f.startsWith(`items/${l.id}/`))), ...files])].sort() });
  console.log(`${todo.length} item${todo.length > 1 ? 's' : ''}, ${files.length} files -> ${path.join(OUT, 'items')}`);
})().catch(e => { console.error(e.message); process.exit(1); });
