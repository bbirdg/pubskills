// The built-in kind of mark: a flat mark made of parts. Each part is one closed shape. The accent parts take the
// brand's colour, and the rest stay white on dark and ink on light, so it is the same mark in every colour.
// It reads the outline that the mark step wrote (brand/mark.json). What it draws in motion and as art is in
// parts-motion.js and parts-art.js.
const fs = require('fs'), path = require('path');

module.exports = (def, S) => {
  const { INK, WHITE, ACCENTS, NEUTRALS, PAPER, r, stopsSvg } = S, B = S.brand;
  const file = path.join(S.dir, 'brand', def.geometry);
  if (!fs.existsSync(file)) throw new Error(`the outline of the mark "${def.id}" has not been read yet (brand/${def.geometry} is missing): run the mark step first`);
  const G = JSON.parse(fs.readFileSync(file, 'utf8'));
  const parts = G.parts.map(p => ({ ...p, accent: def.accentParts ? def.accentParts.includes(p.id) : !!p.accent }));
  // a mark with no accent part takes the accent whole
  if (!parts.some(p => p.accent)) parts.forEach(p => { p.accent = true; });
  // the accent parts are drawn last, over the rest
  const order = [...parts.filter(p => !p.accent), ...parts.filter(p => p.accent)];
  const [bx, by, bw, bh] = G.bounds, aspect = bw / bh, id = def.id;
  // the accent runs along this line of the mark, from its first stop to its last
  const AXIS = def.accentAxis || G.accentAxis, AXIS_ATTR = `x1="${AXIS[0]}" y1="${AXIS[1]}" x2="${AXIS[2]}" y2="${AXIS[3]}"`;
  const PAINT = parts.find(p => p.accent).id;               // the accent's paint is named after the part it colours
  const rule = p => p.rule === 'evenodd' ? ' fill-rule="evenodd"' : '';
  // the accents its brands wear: these get a favicon, an animated mark and their own art
  const accents = Object.keys(ACCENTS).filter(k => def.brands.some(b => b.accent === k));
  const light = B.tone === 'light';

  // ---- the mark in a colourway. scheme: { body, paint }  where paint is a colour or a list of gradient stops
  function draw(s, x, y, w, pid = PAINT) {
    const k = w / bw, grad = Array.isArray(s.paint);
    const defs = grad ? `<defs><linearGradient id="${pid}" gradientUnits="userSpaceOnUse" ${AXIS_ATTR}>${stopsSvg(s.paint)}</linearGradient></defs>` : '';
    return `<g transform="translate(${r(x)} ${r(y)}) scale(${r(k, 5)}) translate(${r(-bx)} ${r(-by)})">${defs}${order.map(p => `<path fill="${p.accent ? (grad ? `url(#${pid})` : s.paint) : s.body}"${rule(p)} d="${p.d}"/>`).join('')}</g>`;
  }
  const schemes = {
    black: { body: '#000000', paint: '#000000', text: '#000000', desc: '#000000' },
    white: { body: WHITE, paint: WHITE, text: WHITE, desc: WHITE },
  };
  for (const [k, a] of Object.entries(ACCENTS)) {
    schemes[`${k}-on-dark`] = { body: WHITE, paint: a.stops, text: WHITE, desc: a.solid, bg: INK, accent: k };
    schemes[`${k}-on-light`] = { body: INK, paint: a.stopsLight, text: INK, desc: a.onLight, bg: WHITE, accent: k };
  }
  // a brand's lockups: in black and in white, and in its own accent where it has one
  const lockupNames = b => b.accent ? ['black', 'white', `${b.accent}-on-dark`, `${b.accent}-on-light`] : ['black', 'white'];
  const lockupScheme = name => ({ ...schemes[name], mark: schemes[name] });

  // one mark that can be put straight into a page: its colours come from CSS variables (the body, three accent stops)
  const first = Object.values(ACCENTS)[0];
  const themeable = () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${r(bx)} ${r(by)} ${r(bw)} ${r(bh)}" role="img" aria-label="${S.xml(B.name)}">` +
    `<defs><linearGradient id="${B.prefix}-${PAINT}" gradientUnits="userSpaceOnUse" ${AXIS_ATTR}>` +
    (first ? first.stops : [WHITE, WHITE, WHITE]).map((c, i) => `<stop offset="${i / 2}" style="stop-color:var(--${B.prefix}-accent-${i + 1}, ${c})"/>`).join('') +
    `</linearGradient></defs>${order.map(p => p.accent ? `<path fill="url(#${B.prefix}-${PAINT})"${rule(p)} d="${p.d}"/>` : `<path style="fill:var(--${B.prefix}-body, currentColor)"${rule(p)} d="${p.d}"/>`).join('')}</svg>\n`;

  // ---- the still files: marks, square icons, profile pictures and favicons
  // how wide the mark may be in a square of side q so that it stays inside a circle cut from it. `share` is its
  // width for a wide mark; a square or tall mark is made smaller until its corners are as far in
  const fit = (q, share) => q * Math.min(share, share / 0.70 * 0.86 / Math.hypot(1, 1 / aspect));
  const W = 1000, H = W / aspect;
  const tight = s => S.svgDoc(W, H, draw(s, 0, 0, W));
  function stills({ add, raw, png }) {
    const PAD = W * 0.04, Q = 1024, dy = Q * (def.nudge || 0);      // nudge: a mark that looks too high in a circle is moved down
    const square = (s, share, bg, dy = 0) => { const mw = fit(Q, share), mh = mw / aspect; return S.svgDoc(Q, Q, draw(s, (Q - mw) / 2, (Q - mh) / 2 + dy, mw), bg); };
    for (const [name, s] of Object.entries(schemes)) {
      add(`mark/${id}-mark-${name}.svg`, S.svgDoc(W + PAD * 2, H + PAD * 2, draw(s, PAD, PAD, W)), 2400);
      add(`icon/${id}-icon-${name}.svg`, square(s, 0.70), 1024);
    }
    raw(`mark/${id}-mark-themeable.svg`, themeable());
    // profile pictures (the whole square is filled, and the mark is safe inside a circle): in white and in black, then one pair for each accent
    add(`avatar/${id}-avatar-white.svg`, square(schemes.white, 0.70, INK, dy), 1024);
    add(`avatar/${id}-avatar-black.svg`, square(schemes.black, 0.70, WHITE, dy), 1024);
    for (const k of Object.keys(ACCENTS)) {
      add(`avatar/${id}-avatar-${k}-dark.svg`, square(schemes[`${k}-on-dark`], 0.70, INK, dy), 1024);
      add(`avatar/${id}-avatar-${k}-light.svg`, square(schemes[`${k}-on-light`], 0.70, WHITE, dy), 1024);
    }
    // favicons: the mark on a rounded tile of the brand's own surface, plain and in each accent its brands wear
    for (const k of [null, ...accents]) {
      const T = 512, mw = fit(T, 0.78), mh = mw / aspect, s = k ? schemes[`${k}-on-${B.tone}`] : light ? schemes.black : schemes.white, name = k || (light ? 'black' : 'white');
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${T} ${T}" width="${T}" height="${T}"><rect width="${T}" height="${T}" rx="${T * 0.22}" fill="${light ? WHITE : INK}"/>${draw(s, (T - mw) / 2, (T - mh) / 2, mw)}</svg>\n`;
      raw(`favicon/favicon-${name}.svg`, svg);
      for (const px of [16, 32, 48, 180, 192, 512]) png(svg, `favicon/favicon-${name}-${px}.png`, px);
    }
  }
  // the master sheet: every main version on one page. Each cell is [scheme of the mark or a lockup's file, on dark?]
  function masterRows() {
    const m = (name, dark) => [`mark/${id}-mark-${name}.svg`, dark], keys = Object.keys(ACCENTS), rows = [], b0 = def.brands[0];
    const pair = k => [m(`${k}-on-dark`, true), m(`${k}-on-light`, false)];
    rows.push(keys.length ? [...pair(keys[0]), m('white', true), m('black', false)] : [m('white', true), m('black', false)]);
    for (let i = 1; i < keys.length; i += 2) rows.push([...pair(keys[i]), ...(keys[i + 1] ? pair(keys[i + 1]) : [])]);
    rows.push([[`${b0.dir}/${b0.id}-horizontal-white.svg`, true], [`${b0.dir}/${b0.id}-horizontal-black.svg`, false], [`${b0.dir}/${b0.id}-stacked-white.svg`, true], [`${b0.dir}/${b0.id}-stacked-black.svg`, false]]);
    const rest = def.brands.slice(1).map(b => [`${b.dir}/${b.id}-horizontal-${b.accent ? `${b.accent}-on-dark` : 'white'}.svg`, true]);
    for (let i = 0; i < rest.length; i += 4) rows.push(rest.slice(i, i + 4));
    return rows;
  }

  // ---- what the upload kit asks for by name. Returns { file } (one of the logo files) or { svg } (drawn here)
  const base = `logos/${id}/svg`;
  function source(name, b) {
    const a = b && b.accent, dark = a ? `${a}-on-dark` : 'white', pale = a ? `${a}-on-light` : 'black', own = light ? pale : dark;
    const lock = (layout, s) => ({ file: `${base}/${b.dir}/${b.id}-${layout}-${s}.svg` });
    const tone = { '': own, '-dark': dark, '-light': pale, '-white': 'white', '-black': 'black', '-flat': light ? 'black' : 'white' };
    const [, what, t] = name.match(/^(avatar|lockup|stacked|mark|icon|tight|favicon)(-dark|-light|-white|-black|-flat|)$/) || [];
    if (!what) return null;
    if (what === 'avatar') { const av = t === '-flat' ? (light ? 'black' : 'white') : t === '-light' || (!t && light) ? (a ? `${a}-light` : 'black') : t === '-white' ? 'white' : t === '-black' ? 'black' : (a ? `${a}-dark` : 'white'); return { file: `${base}/avatar/${id}-avatar-${av}.svg` }; }
    if (what === 'lockup') return lock('horizontal', tone[t]);
    if (what === 'stacked') return lock('stacked', tone[t]);
    if (what === 'mark') return { file: `${base}/mark/${id}-mark-${tone[t]}.svg` };
    if (what === 'icon') return { file: `${base}/icon/${id}-icon-${tone[t]}.svg` };
    if (what === 'tight') return { svg: tight(schemes[tone[t]]) };
    return { file: `${base}/favicon/favicon-${t === '-white' ? 'white' : t === '-black' ? 'black' : t === '-flat' || !(a && accents.includes(a)) ? (light ? 'black' : 'white') : a}.svg` };
  }

  // ---- the mark as line art: its outline, the accent parts in the accent and the rest in a quiet line.
  // w: its width in the picture, width: the line's thickness there, both in pixels
  function lineArt(w, accent, { line = light ? PAPER['paper-line'] : NEUTRALS['surface-3'], width = 3 } = {}) {
    const sw = r(width * bw / w), pid = 'line' + S.uid(), a = accent && ACCENTS[accent];
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${r(bx - sw)} ${r(by - sw)} ${r(bw + sw * 2)} ${r(bh + sw * 2)}" width="${w}" style="display:block"><defs><linearGradient id="${pid}" gradientUnits="userSpaceOnUse" ${AXIS_ATTR}>${stopsSvg(a ? (light ? a.stopsLight : a.stops) : [line, line])}</linearGradient></defs>` +
      `<g fill="none" stroke-width="${sw}" stroke-linejoin="round">${order.map(p => `<path stroke="${p.accent ? `url(#${pid})` : line}" d="${p.d}"/>`).join('')}</g></svg>`;
  }
  // every part as one outline, in the order the mark's file has them
  const flat = () => G.parts.map(p => p.d);
  // the mark in one colour, cropped to its edges
  const cropped = name => S.svgDoc(bw, bh, draw(schemes[name], 0, 0, bw));
  // the mark as one shape, for a character in the brand's font
  const glyph = (paper) => order.map(p => new paper.CompoundPath({ pathData: p.d, insert: false })).reduce((a, b) => a.unite(b, { insert: false }));

  const kind = {
    id, label: def.label, def, kind: 'parts', G, parts, order, bounds: G.bounds, aspect, accents, brands: def.brands, AXIS, AXIS_ATTR, PAINT,
    // where a logo can sit when the mark is drawn large behind it: the point furthest from every line, and how
    // many times the picture's width the mark is drawn so that there is room there
    inside: def.inside || G.inside, scale: { wide: 1.29, tall: 1.9, ...(G.scale || {}), ...(def.scale || {}) }, roomy: G.roomy !== false,
    // distances in art and motion were set on a mark 954.02 by 640.19 units: U scales them to this mark's size
    U: Math.sqrt(bw * bh) / Math.sqrt(954.02 * 640.19),
    schemes, draw, lockupNames, lockupScheme, stills, masterRows, source, lineArt, flat, cropped, glyph, tight, fit, glyphHeight: def.glyphHeight,
    tokens: () => ({ logo: { clearSpace: '25% of the mark height on every side', ...(def.logo || {}) } }),
  };
  Object.defineProperty(kind, 'motion', { get() { return require('./parts-motion')(kind, S); } });
  Object.defineProperty(kind, 'art', { get() { return require('./parts-art')(kind, S); } });
  return kind;
};
