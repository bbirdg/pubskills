// Page: writes final/review.html, the brand's design system as one file with a view for each subject. It is the
// place to look at everything, download any file and approve the work. The rail groups the views: Start, one for
// each brand, the system (each mark, colour, type, motion, art, components), where the brand is seen, how to use it,
// and reference. Only one view shows at a time; a link to anything inside a view opens that view first.
// It shows what the other steps have made so far, and says what is not made yet. Words about the brand itself come
// from "about" in brand.json; everything else is written from what was made.
// usage: node run.js page <brand folder>
const fs = require('fs'), path = require('path');
const S = require('../lib/system').open();
const { ACCENTS, NEUTRALS, SEMANTIC, PAPER, INK, WHITE, contrast, r, brand: B, OUT } = S, P = B.prefix;
const ENGINE = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
const FONT = S.read('fonts'), ART = S.read('art'), MOTION = S.read('motion'), ARTM = S.read('art-motion'), ROLL = S.read('rollout'), CHECKS = S.read('checks');
// the things the brand is put on, as far as they are drawn
const THINGS = (S.read('items') || { items: [] }).items.filter(i => i.faces.every(f => fs.existsSync(path.join(S.OUT, f.svg))));

const has = f => !!f && fs.existsSync(path.join(OUT, f));
const size = f => has(f) ? fs.statSync(path.join(OUT, f)).size : 0;
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const cr = (a, b) => contrast(a, b).toFixed(1) + ':1';
const img = (src, alt, cls = '', extra = '') => `<img src="${src}" alt="${esc(alt)}"${cls ? ` class="${cls}"` : ''} ${extra}>`;
const tile = (tone, inner, cap, cls = '') => `<figure class="tile-wrap ${cls}"><div class="tile ${tone}">${inner}</div>${cap ? `<figcaption>${cap}</figcaption>` : ''}</figure>`;
// the same, for one logo file: its caption carries the downloads
const get = svg => { const png = svg.replace('/svg/', '/png/').replace('.svg', '.png'); return `<span class="dl"><a href="${svg}" download>SVG</a>${has(png) ? `<a href="${png}" download>PNG</a>` : ''}</span>`; };
const fileTile = (tone, svg, alt, cap, style = '') => svg ? `<figure class="tile-wrap"><div class="tile ${tone}">${img(svg, alt, '', style ? `style="${style}"` : '')}</div><figcaption class="fc"><span>${cap}</span>${get(svg)}</figcaption></figure>` : '';
const inWords = n => ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'][n] || String(n), capital = s => s[0].toUpperCase() + s.slice(1);
const list = a => a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1];
const soft = p => p.replace(/\//g, '/<wbr>');      // a file path that may break after a slash
const mb = n => n >= 1e9 ? (n / 1073741824).toFixed(1) + ' GB' : Math.max(1, Math.round(n / 1048576)) + ' MB';
const view = (id, title, body, first) => `<section id="${id}" data-view data-title="${esc(title)}"${first ? '' : ' hidden'}>${body}\n</section>\n`;
const jump = items => `<nav class="jump" aria-label="On this page">${items.filter(Boolean).map(([id, label]) => `<a href="#${id}">${label}</a>`).join('')}</nav>`;
const facts = (items, two) => items.length ? `<ul class="facts${two ? ' two' : ''} mt">${items.map(t => `<li>${t}</li>`).join('')}</ul>` : '';

// the brand is at home on dark or on light: its own surface, and the other one
const light = B.tone === 'light', OWN = light ? 'paper' : 'ink', OTHER = light ? 'ink' : 'paper', OPP = light ? '-dark' : '-light';
// the mark in one colour, as a file: the white one for a dark brand, the black one for a light brand
const FLAT = light ? 'mark-black' : 'mark-white';
// a brand can be kept off the page ("page": false): its files are still made and listed under Files
const A0 = Object.keys(ACCENTS)[0] || null, BRANDS = S.brands.filter(b => b.page !== false), PARTS = S.marks.filter(m => m.kind === 'parts'), M0 = S.marks[0], B0 = BRANDS[0];
// a logo file by what it is ("lockup", "avatar-light", "mark-white"...), or nothing where the mark's kind has none
const file = (b, name) => { const s = b.mark.source && b.mark.source(name, b); return s && s.file && has(s.file) ? s.file : null; };
if (!file(B0, 'lockup')) throw new Error('the logo files are not made yet: run the logos step first');
const dot = b => { const a = b.accent && ACCENTS[b.accent]; return `<i style="background:${a ? `linear-gradient(120deg,${a.stops.join(',')})` : light ? INK : WHITE}"></i>`; };
const about = B.about;

// ---------------------------------------------------------------- colour
const accentCards = Object.entries(ACCENTS).map(([k, a]) => `
  <div class="accent-card">
    <div class="accent-swatch" style="background:linear-gradient(120deg,${a.stops.join(',')})"></div>
    <div><h3>${a.label}</h3><p class="small">${esc(a.use)}</p>
    <p class="mono">${a.stops.join('  ')}</p>
    <p class="mono">on paper  ${a.stopsLight.join('  ')}</p>
    <p class="small">Solid ${a.solid} (${cr(a.solid, INK)} on ink). On paper use ${a.onLight} (${cr(a.onLight, WHITE)}).</p></div>
  </div>`).join('');
const on = v => contrast(v, WHITE) > 4.5 ? NEUTRALS.text : INK;
const neutralRow = Object.entries(NEUTRALS).map(([k, v]) => `<div class="sw" style="background:${v};color:${on(v)}"><b>${k}</b><span>${v}</span></div>`).join('');
const paperRow = [['paper', WHITE], ['paper-2', NEUTRALS['paper-2']], ...Object.entries(PAPER)].map(([k, v]) => `<div class="sw" style="background:${v};color:${INK}"><b>${k}</b><span>${v}</span></div>`).join('');
const semanticRow = Object.entries(SEMANTIC).map(([k, v]) => `<div class="sw" style="background:${v};color:${INK}"><b>${k}</b><span>${v}</span></div>`).join('');
const contrastRows = [
  ['Text on ink', NEUTRALS.text, INK], ['Secondary text on ink', NEUTRALS['text-2'], INK], ['Tertiary text on ink', NEUTRALS['text-3'], INK],
  ['Text on surface-1', NEUTRALS.text, NEUTRALS['surface-1']], ['Ink on paper', INK, WHITE],
  ...Object.values(ACCENTS).map(a => [`${a.onAccent === WHITE ? 'White' : 'Ink'} on ${a.label}`, a.onAccent, a.solid]),
].map(([n, a, b]) => `<div class="cr"><span class="chip" style="background:${b};color:${a}">Aa</span><span>${n}</span><b>${cr(a, b)}</b></div>`).join('');
// the brand's accents, then three colours that only show what a single post or video might take
const PRESETS = [
  ...Object.entries(ACCENTS).map(([k, a]) => ({ k, label: a.label, stops: a.stops, light: a.stopsLight, brand: true })),
  { k: 'felt', label: 'Felt', stops: ['#0B8F5A', '#22C17A', '#8FE8B5'] },
  { k: 'crimson', label: 'Crimson', stops: ['#D7263D', '#F0475B', '#FF8E7A'] },
  { k: 'gold', label: 'Gold', stops: ['#C98A00', '#F2B705', '#FFE27A'] },
];

// ---------------------------------------------------------------- type
const fam = B.type.family, stem = fam ? fam.stem : '', HERO = FONT && FONT.display;
// what the dots of the title font have become: a square on its corner is a diamond
const DOTS = !HERO ? '' : HERO.lean === 0 ? 'diamonds' : HERO.lean === 45 ? 'squares' : 'leaning squares', DOT = !HERO ? '' : HERO.lean === 0 ? 'a diamond: a square standing on a corner' : HERO.lean === 45 ? 'an upright square' : `a square that leans ${HERO.lean} degrees`;
const built = FONT ? FONT.weights.filter(([, s]) => has(`fonts/${stem}-${s}.woff2`)) : [];
const fontCss = built.map(([w, s]) => `@font-face{font-family:"${fam.name}";src:url("fonts/${stem}-${s}.woff2") format("woff2");font-weight:${w};font-display:swap}`).join('')
  + (HERO && has(`fonts/${HERO.file}.woff2`) ? `@font-face{font-family:"${HERO.family}";src:url("fonts/${HERO.file}.woff2") format("woff2");font-weight:${HERO.weight};font-display:swap}` : '');
const SCRIPTS = FONT ? FONT.sources.map(s => s.script) : ['latin'], SECOND = SCRIPTS.find(s => s !== 'latin'), RTL = ['arabic', 'hebrew'].includes(SECOND);
const WORDS = {
  latin: { d: 'Make it yours today', h: 'A full walkthrough for beginners', l: 'New &nbsp; Popular &nbsp; About', b: 'Body text is set at a comfortable size, with enough weight to read well on a dark surface and enough room between the lines.', w: `${B.name} 0123` },
  arabic: { d: 'اصنعها بطريقتك اليوم', h: 'شرح كامل للمبتدئين خطوة بخطوة', l: 'جديد &nbsp; الأكثر رواجا &nbsp; من نحن', b: 'يُكتب النص بحجم مريح للقراءة وبوزن يكفي ليظهر بوضوح على خلفية داكنة، مع مسافة كافية بين السطور.', w: 'أبجد هوز ٠١٢٣' },
};
// a brand's own sample lines replace these one by one
for (const [script, lines] of Object.entries(B.type.samples || {})) WORDS[script] = { ...(WORDS[script] || {}), ...lines };
const second = (cls, key) => SECOND && WORDS[SECOND] ? `<div class="${cls}"${RTL ? ' dir="rtl"' : ''} lang="${{ arabic: 'ar', hebrew: 'he', greek: 'el', cyrillic: 'ru', thai: 'th', devanagari: 'hi' }[SECOND] || ''}">${WORDS[SECOND][key]}</div>` : '';

// ---------------------------------------------------------------- motion
const FMT = f => `${f[0] > f[1] ? 'Wide' : f[1] > f[0] ? 'Tall' : 'Square'}, ${f[0]} x ${f[1]}`;
const motionReady = !!MOTION && MOTION.made === MOTION.of, clearReady = motionReady && MOTION.clear === MOTION.of;
const NAMED = MOTION ? MOTION.logos.filter(l => l.named) : [];
// One choice in a panel of controls: its label over a track that holds its options. The first option is the one in
// use, or the one named by `on`. items: [value, words, further attributes]. note: a quiet word after the label.
// wide: a long row of options that takes a line to itself. end: set apart at the end of its row
const ctl = (label, pick, items, { note = '', wide = false, end = false, on = null } = {}) =>
  `<div class="ctl${wide ? ' wide' : ''}${end ? ' end' : ''}"><span class="ctl-l">${label}${note ? `<small>${note}</small>` : ''}</span><div class="seg" role="group" aria-label="${label}" data-pick="${pick}">${items.map(([v, words, more = ''], i) => `<button class="pill" data-v="${v}"${more} aria-pressed="${on === null ? i === 0 : v === on}">${words}</button>`).join('')}</div></div>`;
const brandOf = id => S.brands.find(b => b.id === id);
// the sizes of one animated logo, with the controls that pick which version plays. all: adds the row of logos
function player(first, all) {
  if (!motionReady) {
    // the ones that are rendered so far are shown as they are, on the Motion view: one is looked at before the rest are made
    const some = MOTION && all ? MOTION.logos.flatMap(l => MOTION.variants.flatMap(v => MOTION.formats.map(f => ({ l, v, f, name: `${l.id}-${v}-${f.join('x')}` })))).filter(x => has(`motion/${x.name}.mp4`) && has(`motion/${x.name}.png`)) : [];
    return `<p class="note">The animated logos are not all rendered yet${MOTION ? ` (${some.length || MOTION.made} of ${MOTION.of} are)` : ''}. Run the motion step, then this page again.</p>`
      + (some.length ? `<div class="motion mt">${some.slice(0, 6).map(x => `<figure style="flex:0 1 ${Math.round(300 * x.f[0] / x.f[1])}px"><div class="vbox"><video width="${x.f[0]}" height="${x.f[1]}" muted loop playsinline controls preload="none" aria-label="Animated logo, ${x.f[0]} by ${x.f[1]}" poster="motion/${x.name}.png" src="motion/${x.name}.mp4"></video></div><figcaption class="fc"><span>${esc(x.l.label || x.l.of || x.l.id)}, ${x.v}. ${FMT(x.f)}</span><span class="dl"><a href="motion/${x.name}.mp4" download>MP4</a></span></figcaption></figure>`).join('')}</div>` : '');
  }
  const l = NAMED.find(x => x.id === first) || NAMED[0];
  if (!l) return '';
  return `<div class="player" data-logo="${l.id}" data-mark="${l.mark}">
    <div class="controls">
      ${all && NAMED.length > 1 ? `<div class="ctl-row">${ctl('Logo', 'logo', NAMED.map(x => [x.id, dot(brandOf(x.id)) + x.label, ` data-mark="${x.mark}"`]), { wide: true, on: l.id })}</div>` : ''}
      <div class="ctl-row">${ctl('Version', 'variant', MOTION.variants.map(v => [v, capital(v)]))}${ctl('Name', 'name', [['1', 'With name'], ['0', 'Mark only']])}${clearReady ? ctl('Background', 'back', [['solid', 'Included'], ['clear', 'Transparent']]) : ''}</div>
    </div>
    <div class="motion">${MOTION.formats.map(f => { const k = f.join('x'), name = `${l.id}-${MOTION.variants[0]}-${k}`; return `<figure style="flex-grow:${r(f[0] / f[1], 4)}"><div class="vbox"><video data-fmt="${k}" width="${f[0]}" height="${f[1]}" muted loop playsinline preload="none" aria-label="Animated logo, ${f[0]} by ${f[1]}" poster="motion/${name}.png" src="motion/${name}.mp4"></video></div><figcaption class="fc"><span>${FMT(f)}</span><span class="dl"><a data-k="mp4" href="motion/${name}.mp4" download>MP4</a>${clearReady ? `<a data-k="mov" href="motion/transparent/${name}.mov" download>MOV</a><a data-k="webm" href="motion/transparent/${name}.webm" download>WebM</a>` : ''}</span></figcaption></figure>`; }).join('')}</div>
  </div>`;
}

// ---------------------------------------------------------------- art
// the art of one brand: its mark's pictures in the brand's colour
const artOf = b => { if (!ART) return null; const f = ART.families.find(x => x.id === b.mark.id); if (!f) return null; const c = f.colours.find(x => x.brands.includes(b.id)) || f.colours[0]; return c ? { f, c } : null; };
const artFile = (f, v, c, s) => `art/${f.id}/${[f.id, v.id, c.id, s.id].filter(Boolean).join('-')}`;
const small = s => { const k = ART.sizes[ART.sizes.length - 1]; return `${s.w * k}x${s.h * k}`; };
const MOVETONE = ARTM ? ARTM.tone : '';
const artMoving = !!ART && !!ARTM && ARTM.made === ARTM.of;
const artPictures = ART ? ART.families.reduce((n, f) => n + f.variants.length * f.colours.length, 0) * ART.shapes.length : 0;
const artFiles = ART ? artPictures * (ART.tones.length * (2 + ART.sizes.length * 2) + (artMoving ? 2 : 0)) : 0;
const ART_BRANDS = BRANDS.filter(b => artOf(b));
// one brand's pictures in one shape. The switches above them show one set at a time and pick the tone, the background
// and still or moving: the script builds each picture's file names from data-base. The frame over each picture
// marks its clear area
function artSet(b, s, first) {
  const { f, c } = artOf(b), sizes = ART.sizes.map(k => `${s.w * k} x ${s.h * k}`).reverse();
  return `<div class="art-set" data-brand="${b.id}" data-shape="${s.id}" data-sizes="${sizes.join(',')}" style="--n:${f.variants.length}"${first ? '' : ' hidden'}>${f.variants.map(v => {
    const base = artFile(f, v, c, s), box = ART.clear[`${f.id}-${v.id}-${s.id}`];
    return `<figure class="art" data-base="${base}"><div class="art-pic" style="aspect-ratio:${s.w}/${s.h}">${img(`${base}.svg`, `${v.label}, ${s.label.toLowerCase()}`, '', 'loading="lazy"')}<i style="left:${box[0]}%;top:${box[1]}%;width:${box[2]}%;height:${box[3]}%"></i></div><figcaption><b>${v.label}</b><span class="n-still">${v.note}</span><span class="n-moving">${v.light}</span><span class="dl">${sizes.map(z => `<a href="${base}-${z.replace(/ /g, '')}.png" download>PNG ${z}</a>`).join('')}<a href="${base}.svg" download>SVG</a></span></figcaption></figure>`;
  }).join('')}</div>`;
}
// a shape as a small outline of its proportions, beside its name in the controls
const shapeIcon = s => { const k = 12 / Math.max(s.w, s.h), w = r(s.w * k, 1), h = r(s.h * k, 1); return `<svg viewBox="0 0 14 14" aria-hidden="true"><rect x="${r((14 - w) / 2, 1)}" y="${r((14 - h) / 2, 1)}" width="${w}" height="${h}" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>`; };
// a brand's art as a row of small pictures that lead to the Art page with that brand picked
const artStrip = b => { const { f, c } = artOf(b); return `<div class="art-strip mt" style="--n:${f.variants.length}">${f.variants.map(v => `<a href="#art-${b.id}">${img(`${artFile(f, v, c, ART.shapes[0])}${light && ART.tones.some(t => t.id === 'light') ? '-light' : ''}.svg`, `${v.label} art`, '', 'loading="lazy"')}<span>${v.label}</span></a>`).join('')}</div>`; };

// ---------------------------------------------------------------- the upload kit
// each step's tick is remembered under the step's own name, so adding a step later does not move the ticks
const roKeys = new Set();
const roKey = name => { let key = name.toLowerCase().replace(/[^a-z0-9]+/g, '-'); while (roKeys.has(key)) key += '-2'; roKeys.add(key); return key; };
const rolloutHtml = ROLL ? ROLL.groups.map((g, n) => `<div class="ro-group"><h3>${n + 1}. ${esc(g.label)}</h3>${g.how ? `<p class="small">${esc(g.how)}</p>` : ''}${g.items.map(i => `<label class="ro"><input type="checkbox" data-ro="${roKey(`${g.label} ${i.what} ${i.brand}`)}"><span><b>${esc(i.what)}</b>${i.file && has(i.file) ? `<a class="mono" href="${i.file}">${soft(i.file)}</a>` : ''}${i.note ? `<span class="small">${esc(i.note)}</span>` : ''}</span></label>`).join('')}</div>`).join('') : '';
const kit = b => ROLL ? ROLL.groups.flatMap(g => g.items.filter(i => i.brand === b.id && i.file && has(i.file) && /\.(png|svg)$/.test(i.file)).map(i => ({ ...i, group: g.label }))) : [];
const ready = b => `<div class="ready">${kit(b).map(i => `<a href="${i.file}" download>${img(i.file, i.what, '', 'loading="lazy"')}<span><b>${esc(i.group)}: ${esc(i.what)}</b><span class="mono">${soft(i.file)}</span></span></a>`).join('')}</div>`;
const BANNERS = ROLL ? ROLL.groups.flatMap(g => g.items.filter(i => i.kind === 'banner' && has(i.file)).map(i => ({ ...i, group: g.label }))) : [];
const groupFiles = re => ROLL ? ROLL.groups.filter(g => re.test(g.label)).flatMap(g => g.items.filter(i => i.file && has(i.file))) : [];
const MAIL = groupFiles(/email|shopify/i).filter(i => /email|sender/i.test(i.file)), WEB = groupFiles(/website/i);

const sizesStrip = (src, tone) => `<div class="sizes ${tone}">${[16, 24, 32, 48, 64].map(s => `<img src="${src}" width="${s}" alt="">`).join('')}</div>`;
const favRow = (svg, cap) => { const pre = svg.replace('/svg/', '/png/').replace('.svg', ''); return has(`${pre}-16.png`) ? `<figure><div class="sizes ${OWN}">${[16, 32, 48].map(s => `<img src="${pre}-${s}.png" width="${s}" height="${s}" alt="">`).join('')}${[16, 32].map(s => `<img class="px" src="${pre}-${s}.png" width="${s * 5}" height="${s * 5}" alt="">`).join('')}</div><figcaption>${cap}</figcaption></figure>` : ''; };

// ---------------------------------------------------------------- one view for each brand
function brandView(b) {
  const m = b.mark, a = b.accent && ACCENTS[b.accent], ab = b.about || {}, id = b.id, f = n => file(b, n);
  const places = [...new Set(kit(b).map(i => i.group))];
  const lead = ab.lead || `${b.desc ? `${b.word}, with ${b.desc} under the name` : b.label}. ${a ? `It wears the ${a.label} accent.` : `It carries no accent: ${light ? 'ink on light and white on dark' : 'white on dark and black on light'}.`}`;
  const chips = ab.chips || [a ? `${a.label} accent` : 'No accent', ...places];
  const art = artOf(b), moving = MOTION && NAMED.some(x => x.id === id), fav = f('favicon');
  return view(id, b.label, `
  <header class="vh"><h1>${esc(b.label)}</h1><p class="lead">${lead}</p>
    <div class="chips">${chips.map((c, i) => `<span class="fact-chip">${i === 0 ? dot(b) : ''}${esc(c)}</span>`).join('')}</div>
    ${jump([[`${id}-lockups`, 'Lockups'], [`${id}-icons`, 'Profile picture and icons'], moving && [`${id}-motion`, 'Animated logo'], art && [`${id}-art`, 'Art'], kit(b).length && [`${id}-ready`, 'Ready to upload']])}
  </header>
  <h2 id="${id}-lockups">Lockups</h2>
  <p>${ab.note || 'The name is turned into outlines, so the logo files need no font installed.'}</p>
  <div class="grid mt" style="grid-template-columns:1.6fr 1fr">
    ${fileTile(OWN, f('lockup'), `${b.label} horizontal lockup`, 'Horizontal', 'width:min(100%,520px)')}
    ${fileTile(OWN, f('stacked'), `${b.label} stacked lockup`, 'Stacked', 'height:190px')}
  </div>
  <div class="grid g4 mt">
    ${fileTile(OTHER, f(`lockup${OPP}`), `${b.label} on ${light ? 'dark' : 'light'}`, light ? 'On dark' : 'On paper')}
    ${fileTile(OTHER, f(`stacked${OPP}`), `${b.label} stacked on ${light ? 'dark' : 'light'}`, light ? 'Stacked, on dark' : 'Stacked, on paper', 'height:130px')}
    ${a ? fileTile('ink', f('lockup-white'), `${b.label} in white`, 'One colour, white') + fileTile('paper', f('lockup-black'), `${b.label} in black`, 'One colour, black') : ''}
  </div>
  <h2 id="${id}-icons">Profile picture and icons</h2>
  <p>The mark is sized to stay inside a circle cut from the square, on every platform.</p>
  <div class="grid g4 mt">
    ${fileTile('surface', f('avatar'), `${b.label} profile picture`, 'Profile picture', 'width:150px;border-radius:50%')}
    ${fileTile('surface', f(`avatar${OPP}`), `${b.label} profile picture, ${light ? 'dark' : 'light'}`, light ? 'Dark variant' : 'Light variant', 'width:150px;border-radius:50%')}
    ${fileTile(light ? 'paper' : 'surface', f('icon'), 'Square icon', 'Square icon', 'width:150px;border-radius:14px')}
    ${fileTile(OWN, f('mark'), 'The mark alone', 'The mark alone', 'height:120px')}
  </div>
  <div class="grid g2 mt">
    ${fav ? favRow(fav, 'Favicon at 16, 32 and 48 px, then 16 and 32 enlarged five times.') : ''}
    ${f(FLAT) ? `<figure>${sizesStrip(f(FLAT), OWN)}<figcaption>The flat mark at 16, 24, 32, 48 and 64 px wide.</figcaption></figure>` : ''}
  </div>
  ${moving ? `<h2 id="${id}-motion">Animated logo</h2>
  <p>An intro and a loop, with the name or as the mark alone, in ${inWords(MOTION.formats.length)} sizes. Each one comes as an MP4 on the brand background and as two transparent files.</p>
  <div class="mt">${player(id)}</div>` : ''}
  ${art ? `<h2 id="${id}-art">Art</h2>
  <p>${capital(inWords(art.f.variants.length))} backgrounds ${art.c.accent ? `in ${ACCENTS[art.c.accent].label}` : 'with no accent'}, with nothing written on them. Their shapes, sizes and the place for a logo are under <a href="#art-${id}">Art</a>.</p>
  ${artStrip(b)}` : ''}
  ${kit(b).length ? `<h2 id="${id}-ready">Ready to upload</h2>
  <p>Cut to size. Nothing here has been uploaded: the list of what goes where is under <a href="#rollout">Rollout</a>.</p>
  ${ready(b)}` : ''}`);
}

// ---------------------------------------------------------------- one view for each mark
function markView(m) {
  const id = `mark-${m.id}`, b = BRANDS.find(x => x.mark === m), f = n => file(b, n);
  if (m.kind !== 'parts') return view(id, m.label, `
  <header class="vh"><h1>${esc(m.label)}</h1><p class="lead">${(m.def.about && m.def.about.lead) || 'A mark with a drawing of its own.'}</p></header>
  <div class="grid g3 mt">${fileTile(OWN, f('mark'), `${m.label} in colour`, 'In colour', 'height:150px')}${fileTile('ink', f('mark-white'), `${m.label} in white`, 'White, on dark', 'height:150px')}${fileTile('paper', f('mark-black'), `${m.label} in black`, 'Black, on light', 'height:150px')}</div>`);
  const [bx, by, bw, bh] = m.bounds, G = m.G, ms = G.measures || {}, cs = bh * 0.25, u = Math.max(bw, bh) / 1000, ab = m.def.about || {};
  const paths = (body, paint) => m.order.map(p => `<path fill="${p.accent ? paint : body}" d="${p.d}"/>`).join('');
  const grad = (gid, stops) => `<defs><linearGradient id="${gid}" gradientUnits="userSpaceOnUse" ${m.AXIS_ATTR}>${S.stopsSvg(stops)}</linearGradient></defs>`;
  const stops0 = A0 ? ACCENTS[A0].stops : [WHITE, WHITE, WHITE], quiet = m.parts.filter(p => !p.accent), lit = m.parts.filter(p => p.accent), whole = !quiet.length;
  // where each part's name goes: the middle of its own box
  const paper = require('paper'); paper.setup(new paper.Size(10, 10));
  const mid = p => { const c = new paper.CompoundPath({ pathData: p.d, insert: false }).bounds.center; return [r(c.x), r(c.y)]; };
  const diagram = `<svg viewBox="${r(bx - cs - 30 * u)} ${r(by - cs - 30 * u)} ${r(bw + cs * 2 + 60 * u)} ${r(bh + cs * 2 + 60 * u)}" role="img" aria-label="Construction of the mark">
    ${grad('dg', stops0)}
    <rect x="${r(bx - cs)}" y="${r(by - cs)}" width="${r(bw + cs * 2)}" height="${r(bh + cs * 2)}" fill="none" stroke="${NEUTRALS['text-3']}" stroke-width="${r(2 * u)}" stroke-dasharray="${r(10 * u)} ${r(10 * u)}"/>
    <rect x="${r(bx)}" y="${r(by)}" width="${r(bw)}" height="${r(bh)}" fill="none" stroke="${NEUTRALS.line}" stroke-width="${r(2 * u)}"/>
    ${paths(NEUTRALS.text, 'url(#dg)')}
    <g font-size="${r(30 * u)}" font-weight="600" text-anchor="middle" fill="${INK}" stroke="${NEUTRALS.text}" stroke-width="${r(7 * u)}" paint-order="stroke" stroke-linejoin="round">${m.parts.map(p => `<text x="${mid(p)[0]}" y="${mid(p)[1] + r(10 * u)}">${p.id}${p.accent && !whole ? ', accent' : ''}</text>`).join('')}</g>
    <text x="${r(bx + bw + cs - 18 * u)}" y="${r(by + bh + cs - 22 * u)}" text-anchor="end" font-size="${r(30 * u)}" font-weight="600" fill="${NEUTRALS['text-3']}">clear space: a quarter of the height</text>
  </svg>`;
  const themeable = gid => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${r(bx)} ${r(by)} ${r(bw)} ${r(bh)}" role="img" aria-label="${esc(B.name)} mark"><defs><linearGradient id="${gid}" gradientUnits="userSpaceOnUse" ${m.AXIS_ATTR}><stop offset="0" style="stop-color:var(--${P}-accent-1)"/><stop offset=".5" style="stop-color:var(--${P}-accent-2)"/><stop offset="1" style="stop-color:var(--${P}-accent-3)"/></linearGradient></defs>${m.order.map(p => p.accent ? `<path fill="url(#${gid})" d="${p.d}"/>` : `<path style="fill:var(--${P}-body)" d="${p.d}"/>`).join('')}</svg>`;
  const gaps = (ms.gaps || []).map(g => `<li><b>Gap, ${g.between.join(' to ')}:</b> ${g.pct}% of the mark's width.</li>`).join('');
  const keys = Object.keys(ACCENTS), accentNote = whole ? 'The whole mark takes the accent in the colour versions, and stands in white or black where colour would not read.' : `Only ${lit.length > 1 ? 'the accent parts change' : `the ${lit[0].id} changes`} colour. The rest stays white on dark and ink on light, so it is always the same mark.`;
  const favs = [null, ...m.accents].map(k => `logos/${m.id}/svg/favicon/favicon-${k || (light ? 'black' : 'white')}.svg`).filter(has);
  return view(id, m.label, `
  <header class="vh"><h1>${esc(m.label)}</h1><p class="lead">${ab.lead || `${capital(inWords(m.parts.length))} shape${m.parts.length > 1 ? 's' : ''}: ${list(m.parts.map(p => p.id))}. The same outline at every size and in every colour version.`}</p>
    ${jump([[`${id}-mark`, 'The mark'], keys.length && [`${id}-accent`, 'The accent'], keys.length && PARTS[0] === m && [`${id}-colour`, 'Try a colour'], [`${id}-line`, 'Line art'], [`${id}-small`, 'Small sizes']])}
  </header>
  <h2 id="${id}-mark">The mark</h2>
  <div class="grid g2 mt">
    ${fileTile('ink', f('mark-white'), `${m.label} in white`, 'White, on dark', 'height:150px')}
    ${fileTile('paper', f('mark-black'), `${m.label} in black`, 'Black, on light', 'height:150px')}
  </div>
  <div class="split mt2">
    <div class="tile surface" style="padding:18px">${diagram}</div>
    <ul class="facts">
      ${(ab.facts || []).map(t => `<li>${t}</li>`).join('')}${gaps}
      <li><b>Clear space:</b> a quarter of the mark's height on every side.</li>
      ${ms.gapsCloseUnderPx > 16 ? `<li><b>Small sizes:</b> under ${ms.gapsCloseUnderPx} px wide the gaps between its parts close, and the outline carries it.</li>` : '<li><b>Small sizes:</b> its parts stay apart down to 16 px wide.</li>'}
    </ul>
  </div>
  ${keys.length ? `<h2 id="${id}-accent">The accent</h2>
  <p>${accentNote}</p>
  <div class="grid g3 mt">
    ${keys.map(k => fileTile('ink', `logos/${m.id}/svg/mark/${m.id}-mark-${k}-on-dark.svg`, `${ACCENTS[k].label} accent on dark`, `${ACCENTS[k].label}, on dark`, 'height:130px')).join('')}
    ${keys.map(k => fileTile('paper', `logos/${m.id}/svg/mark/${m.id}-mark-${k}-on-light.svg`, `${ACCENTS[k].label} accent on light`, `${ACCENTS[k].label}, on paper`, 'height:130px')).join('')}
  </div>
  <div class="accent-cards mt">${accentCards}</div>
  ${facts([
    keys.length > 1 ? '<b>One accent to a layout.</b> Never two accents side by side, except on a page like this one.' : '<b>The accent is one colour family.</b> It is not mixed with a second colour.',
    '<b>Two or three stops from one colour family</b>, running along the accent part.',
    '<b>Keep it readable:</b> the strongest stop should reach 3:1 against what is behind it. On paper the accent switches to deeper stops, and on busy or mid-tone backgrounds the flat white or black mark takes over.',
    BRANDS.some(x => !x.accent) && BRANDS.some(x => x.accent) ? '<b>No accent means the parent.</b> A brand with no accent is all white on dark and all black on light. Colour always means a branch.' : '',
  ].filter(Boolean), true)}` : ''}
  ${keys.length && PARTS[0] === m ? `<h2 id="${id}-colour">Try a colour</h2>
  <p>Pick a brand accent, or set your own stops for a single post or video, for example a season's colour. The three examples show the idea and are not brand colours.</p>
  <div class="picker mt">
    <div class="stage" id="stage" data-bg="ink">${themeable('pick')}</div>
    <div class="panel">
      <div class="lbl">Brand accents<div class="presets" id="presets"></div></div>
      <div class="lbl">Examples for one post or video<div class="presets" id="examples"></div></div>
      <div class="lbl">Stops, along the accent<div class="stops"><input type="color" id="s1" aria-label="First stop"><input type="color" id="s2" aria-label="Middle stop"><input type="color" id="s3" aria-label="Last stop"></div></div>
      <div class="lbl">Background<div class="seg" id="bgs"><button class="pill" data-bg="ink" aria-pressed="true">Ink</button><button class="pill" data-bg="surface" aria-pressed="false">Surface</button><button class="pill" data-bg="paper" aria-pressed="false">Paper</button></div></div>
      <p class="readout" id="readout"></p>
      <div class="btns"><button class="ds-btn primary" id="copy">Copy SVG</button><button class="ds-btn secondary" id="dl">Download SVG</button></div>
    </div>
  </div>` : ''}
  <h2 id="${id}-line">Line art</h2>
  <p>The outline of the mark, the same line the animated logo draws. Enlarged, it fills banners and covers.${ART ? ' It is the first kind of <a href="#art">art</a>.' : ''}</p>
  <div class="split mt">
    <div class="tile ink"><svg viewBox="${r(bx - 8 * u)} ${r(by - 8 * u)} ${r(bw + 16 * u)} ${r(bh + 16 * u)}" role="img" aria-label="The mark as line art" style="width:min(100%,460px);max-height:340px">${grad('la', stops0)}<g fill="none" stroke-width="${r(6 * u)}" stroke-linejoin="round">${m.order.map(p => `<path stroke="${p.accent ? 'url(#la)' : NEUTRALS['text-3']}" d="${p.d}"/>`).join('')}</g></svg></div>
    <ul class="facts">
      <li><b>${whole ? 'The outline in the accent' : 'The quiet parts in a quiet line, the accent part in the accent'},</b> or in white where a brand has none.</li>
      <li><b>No line runs behind a logo or behind words.</b> Either they sit inside the mark, where no line passes, or the lines fade out before they reach them.</li>
      <li><b>It stays a background.</b> One thin line, never filled, never the only thing in the picture.</li>
    </ul>
  </div>
  <h2 id="${id}-small">Small sizes</h2>
  <div class="grid g2 mt">
    <figure>${sizesStrip(f('mark-white'), 'ink')}<figcaption>Flat white at 16, 24, 32, 48 and 64 px wide, actual pixels.</figcaption></figure>
    <figure>${sizesStrip(f('mark-black'), 'paper')}<figcaption>Flat black at the same sizes.</figcaption></figure>
    ${favs.map((s, i) => favRow(s, i ? 'The favicon in an accent.' : 'Favicon at 16, 32 and 48 px, then 16 and 32 enlarged five times.')).join('')}
  </div>`);
}

// ---------------------------------------------------------------- start
const count = (d, ext) => fs.existsSync(d) ? fs.readdirSync(d, { withFileTypes: true }).reduce((n, e) => n + (e.isDirectory() ? count(path.join(d, e.name), ext) : e.name.endsWith(ext) ? 1 : 0), 0) : 0;
const svgCount = S.marks.reduce((n, m) => n + count(path.join(OUT, `logos/${m.id}/svg`), '.svg'), 0), pngCount = S.marks.reduce((n, m) => n + count(path.join(OUT, `logos/${m.id}/png`), '.png'), 0);
const start = view('start', 'Start', `
  <div class="hero">
    <div>
      <h1>${esc(B.name)} design system</h1>
      <p class="lead">${about.lead || `The ${esc(B.name)} mark, its colours, its type and every file made from them.`}</p>
      ${about.body ? `<p>${about.body}</p>` : ''}
      <div class="note warn mt"><b>${about.status || 'Made, not published.'}</b> ${about.statusNote || `Every file here is ready and waits on this computer. Nothing has been uploaded anywhere${ROLL ? ': what goes where is listed under <a href="#rollout">Rollout</a>' : ''}.`}</div>
    </div>
    <div class="tile ${OWN}">${img(file(B0, light ? 'mark' : FLAT) || file(B0, 'mark'), `${B.name} mark`, '', 'style="width:min(100%,560px);max-height:340px"')}</div>
  </div>
  ${BRANDS.length > 1 ? `<h2>The family</h2>
  <p>Each brand has its own page with its lockups, icons${MOTION ? ', animated logo' : ''} and upload-ready files.</p>
  <div class="family mt">
    ${BRANDS.map((b, i) => `<a${i === 0 ? ' class="wide"' : ''} href="#${b.id}"><div class="tile ${light ? 'paper' : 'surface'}">${img(file(b, 'lockup'), b.label, '', i === 0 ? 'style="width:min(100%,420px)"' : '')}</div><span>${esc(b.label)}</span></a>`).join('')}
  </div>` : ''}
  <div class="split top mt2">
    <div><h3>${BRANDS.length > 1 ? 'How the family works' : 'How it works'}</h3>
      <ul class="facts">
        ${(about.family || [
          `<b>One mark${S.marks.length > 1 ? ' for each family' : ''}.</b> The same outline at every size and in every colour version.`,
          A0 ? '<b>One accent at a time.</b> The accent colours part of the mark and the name\'s second line. Everything else stays white on dark and ink on light.' : '<b>No accent colour.</b> White on dark and black on light, everywhere.',
          HERO ? `<b>Two fonts.</b> ${HERO.family} for the one title, ${fam.name} for everything else.` : fam ? `<b>One font family.</b> ${fam.name}, in ${built.length} weights.` : '',
          '<b>Where the name cannot be read,</b> the mark stands alone.',
        ]).filter(Boolean).map(t => `<li>${t}</li>`).join('')}
      </ul>
    </div>
    <div><h3>Find a file</h3>
      <ul class="finder">
        ${ROLL ? '<li><a href="#rollout">A profile picture, a banner, an icon</a><span>Cut to each platform\'s size</span></li>' : ''}
        ${THINGS.length ? `<li><a href="#items">A card, a bag, a sticker</a><span>${capital(inWords(THINGS.length))} thing${THINGS.length > 1 ? 's' : ''} at real size, each with its print file</span></li>` : ''}
        ${ART ? `<li><a href="#art">A background</a><span>Art for ${BRANDS.length > 1 ? 'each brand' : 'the brand'}, in ${inWords(ART.shapes.length)} shape${ART.shapes.length > 1 ? 's' : ''} and ${inWords(ART.sizes.length)} size${ART.sizes.length > 1 ? 's' : ''}</span></li>` : ''}
        <li><a href="${(file(B0, FLAT) || '').replace('/svg/', '/png/').replace('.svg', '.png')}" download>The mark for a thumbnail or a video</a><span>Flat ${light ? 'black' : 'white'} PNG. The ${light ? 'white' : 'black'} one is next to it</span></li>
        ${motionReady ? `<li><a href="#motion-all">An animated intro or loop</a><span>Every logo, ${inWords(MOTION.formats.length)} sizes${clearReady ? ', also with no background for editing' : ''}</span></li>` : ''}
        ${built.length ? `<li><a href="#type-files">The fonts</a><span>${HERO ? 'The hero font and ' : ''}${built.length} weights of ${fam.name}, TTF and WOFF2</span></li>` : ''}
        <li><a href="tokens/${B.id}.css">Colours and sizes as code</a><span>CSS variables, and <a href="tokens/${B.id}.tokens.json">JSON</a></span></li>
        ${has(`logos/${M0.id}/${M0.id}-master.pdf`) ? `<li><a href="logos/${M0.id}/${M0.id}-master.pdf">Master sheet</a><span>Every main version on one vector page, PDF and <a href="logos/${M0.id}/${M0.id}-master.svg">SVG</a></span></li>` : ''}
        <li><a href="#files">Everything else</a><span>${svgCount} SVG and ${pngCount} PNG logo files</span></li>
      </ul>
    </div>
  </div>`, true);

const colourView = view('colour', 'Colour', `
  <header class="vh"><h1>Colour</h1><p class="lead">${light ? 'Light surfaces, dark text, one accent at a time.' : 'Dark surfaces, light text, one accent at a time.'}</p></header>
  <h2>Neutrals</h2>
  <figure class="mt"><div class="swatches ten">${neutralRow}</div><figcaption>From ink to paper. Token names start with --${P}-, for example --${P}-surface-1.</figcaption></figure>
  <div class="split top mt2">
    <div><h3>On paper</h3><p>${light ? 'The brand is at home on light surfaces. Under paper sit three more greys: a quiet fill, a quiet line and a soft line.' : 'The brand is dark first. For the rare light surface, such as an email, a document or print, three more greys sit under paper: a quiet fill, a quiet line and a soft line.'}${ART ? ' The light <a href="#art">art</a> is drawn with them.' : ''}</p></div>
    <figure><div class="swatches">${paperRow}</div><figcaption>Ink is the text colour on all of them.</figcaption></figure>
  </div>
  ${A0 ? `<h2>Accents</h2>
  <div class="grid g3 mt">
    ${Object.entries(ACCENTS).map(([k, a]) => `<figure><div class="swatches">${a.stops.map((c, i) => `<div class="sw" style="background:${c};color:${contrast(c, WHITE) > contrast(c, INK) ? '#fff' : INK}"><b>${k}-${i + 1}</b><span>${c}</span></div>`).join('')}</div><div class="swatches" style="margin-top:6px">${a.stopsLight.map((c, i) => `<div class="sw" style="background:${c};color:${contrast(c, WHITE) > 3 ? '#fff' : INK};padding-top:18px"><b>${k}-paper-${i + 1}</b><span>${c}</span></div>`).join('')}</div><figcaption>${a.label}${a.use ? `: ${esc(a.use)}` : ''}. Second row: the deeper stops for paper.</figcaption></figure>`).join('')}
  </div>` : ''}
  <h2>Contrast and status</h2>
  <div class="split top mt">
    <div><h3>Contrast</h3><p>Computed with the WCAG formula. Body text needs 4.5:1, large type and marks 3:1.</p><div class="crs">${contrastRows}</div></div>
    <div><h3>Status colours</h3><p>For states only: success, error, information. They never stand in for the accent.</p><div class="swatches">${semanticRow}</div></div>
  </div>`);

// the brand's own characters in the typeface: what is shown, its name, its code
const ch = c => `&#x${c.toString(16).toUpperCase()};`, code = c => 'U+' + c.toString(16).toUpperCase();
const OWNCH = FONT ? FONT.own : [];
const typeView = !built.length ? view('type', 'Type', `
  <header class="vh"><h1>Type</h1><p class="lead">${fam ? `${fam.name} is named in the settings but its files are not built yet: run the fonts step.` : 'The settings name no font family of the brand\'s own. Text is set in the font stack below.'}</p></header>
  <p class="mono mt">${esc(B.type.fallback)}</p>
  <p class="mt">The names in the logo files are outlines, so the logos never depend on a font.</p>`)
: view('type', 'Type', `
  <header class="vh"><h1>Type</h1><p class="lead">${HERO ? `Two fonts. ${HERO.family} sets the title, and ${fam.name} sets everything else.` : `One family, ${fam.name}. Weight and size do the work.`}${SCRIPTS.length > 1 ? ` ${HERO ? 'Both carry' : 'It carries'} ${list(SCRIPTS.map(capital))}.` : ''}</p>
    ${jump([['type-pair', HERO ? 'The pairing' : 'The scale'], HERO && ['type-hero', HERO.family], ['type-now', fam.name], OWNCH.length && ['type-own', 'The brand\'s own characters'], ['type-files', 'Font files']])}
  </header>
  <h2 id="type-pair">${HERO ? 'The pairing' : 'The scale'}</h2>
  <p>${HERO ? 'One line leads and the rest support it. The hero font is for that one line: a title, the words on a thumbnail, a page\'s headline. The general font does all the reading. They share their letters, so they always sit well together: the hero font is the heaviest weight of the general one with its dots turned into ' + DOTS + '.' : 'One line leads and the rest support it: one weight for the title, another for headings, spaced capitals for labels and a third for reading.'}</p>
  <div class="mt">
    <div class="spec"><div class="meta">Hero<br>${HERO ? `${HERO.family}<br>${HERO.weight}, tight` : `${fam.name}<br>${B.type.weights.hero || 800}, tight`}</div><div class="t-hero">${WORDS.latin.d}</div>${second('t-hero', 'd')}</div>
    <div class="spec"><div class="meta">Heading<br>${fam.name} ${B.type.weights.heading}</div><div class="t-heading">${WORDS.latin.h}</div>${second('t-heading', 'h')}</div>
    <div class="spec"><div class="meta">Label<br>${B.type.weights.label}, spaced caps</div><div class="t-label">${WORDS.latin.l}</div>${second('t-label', 'l')}</div>
    <div class="spec"><div class="meta">Body<br>${B.type.weights.body}</div><div class="t-body">${WORDS.latin.b}</div>${second('t-body', 'b')}</div>
  </div>
  ${facts([
    '<b>One hero line to a view.</b> A screen, a picture or a page has one title. If two lines shout, neither leads.',
    HERO ? `<b>Titles only, from 24 px.</b> Never a paragraph, a button, a label or a price. Below 24 px the squares read as plain dots, so use ${fam.name}.` : '<b>The title weight is for titles only.</b> Never a paragraph, a button or a label.',
    BRANDS.length > 1 ? '<b>Every brand uses the same type.</b> Colour says which brand it is. Type says it is the family.' : '',
    '<b>The logos are not set in it.</b> Each name in a logo is its own drawing and stays as it is.',
  ].filter(Boolean), true)}
  ${HERO ? `
  <h2 id="type-hero">${HERO.family}</h2>
  <p>${HERO.from} with one change: every dot is ${DOT}.</p>
  <div class="tile surface herospec mt"><div class="t-hero">Join in: big wins, live!</div>${second('t-hero', 'd')}</div>
  <div class="grid g2 mt">
    ${tile('surface', `<div class="heropair" style="font-weight:${HERO.weight}"><span>Join: fix it!</span></div>`, `${HERO.from}: round dots`)}
    ${tile('surface', `<div class="heropair t-hero"><span>Join: fix it!</span></div>`, `${HERO.family}: ${DOTS}`)}
  </div>
  ${facts([
    `<b>What changes:</b> the dots of the letters, of the punctuation and of the accents, and the bullet. ${HERO.dots} dots are drawn once and show in ${HERO.glyphs} letters and signs.`,
    `<b>What does not:</b> every letter, width and kerning pair is ${HERO.from}'s, so swapping one font for the other never moves a line.`,
    `<b>The squares are a little smaller than the dots,</b> ${Math.round(HERO.share * 100)}% of their area, so letters with several dots keep their gaps and the dot of the i stays clear of its stem.`,
    `<b>It has one weight.</b> A title that needs to be lighter is not a title: set it as a heading in ${fam.name}.`,
  ], true)}` : ''}

  <h2 id="type-now">${fam.name}</h2>
  <p>${FONT.sources.length > 1 ? `The general font: ${list(FONT.sources.map(s => `the ${capital(s.script)} of ${s.name}`))}, joined into one family of ${inWords(built.length)} weights.` : `Built from ${FONT.sources[0].name}, in ${inWords(built.length)} weights, with the brand's own characters added.`} Weight and size do the work.</p>
  <div class="ladder mt">${built.map(([w, s]) => `<div class="lw" style="font-weight:${w}"><span class="meta">${s} ${w}</span><span>${WORDS.latin.w}</span>${SECOND && WORDS[SECOND] ? `<span${RTL ? ' dir="rtl"' : ''}>${WORDS[SECOND].w}</span>` : ''}</div>`).join('')}</div>
  ${facts([
    FONT.sources.length > 1 ? '<b>How it is made:</b> each weight is cut from the source fonts, the second script is joined to the first, and both share one name and one set of line heights.' : '<b>How it is made:</b> each weight is cut from the source font and renamed, and the brand\'s own characters are added.',
    RTL ? `<b>${capital(SECOND)} is never letter-spaced.</b> Spacing breaks the joins. Tight tracking and spaced caps are for Latin only.` : '',
    '<b>Licence:</b> the SIL Open Font License. The family may be used, embedded and changed freely, and its licence text travels with it.',
  ].filter(Boolean), true)}
  ${OWNCH.length ? `
  <h2 id="type-own">The brand's own characters</h2>
  <p>Every weight carries a few characters of the brand's own, so the mark can sit in a line of text, in a subtitle or in an app's own type.</p>
  <div class="own mt">
    ${OWNCH.slice(0, 9).map(o => `<div><div class="own-c">${o.codes.slice(0, 1).map(ch).join(' ')}</div><b>${capital(esc(o.what))}</b><span class="mono">${o.codes.map(code).join(', ')}</span></div>`).join('')}
  </div>
  ${facts([
    '<b>A mark set as a character is in one colour</b>, the colour of the text round it. For the logo itself use the logo files.',
    OWNCH.some(o => o.codes.some(c => c >= 0xE000 && c <= 0xF8FF)) ? '<b>The marks need this font.</b> They have no place in Unicode, so in any other typeface they show as an empty box.' : '',
  ].filter(Boolean), true)}` : ''}

  <h2 id="type-files">Font files</h2>
  <p>Install the TTF files to use the fonts in editing and design apps. The WOFF2 files are for the web.</p>
  <div class="table mt"><table><thead><tr><th>Font</th><th>CSS weight</th><th>Role</th><th>Files</th></tr></thead><tbody>
    ${HERO ? `<tr><td style="font-family:var(--${P}-font-hero);font-weight:${HERO.weight};color:var(--${P}-text);font-size:17px">${HERO.family} ${HERO.style}</td><td>${HERO.weight}</td><td>Titles: the hero font</td><td><span class="dl"><a href="fonts/${HERO.file}.ttf" download>TTF</a><a href="fonts/${HERO.file}.woff2" download>WOFF2</a></span></td></tr>` : ''}
    ${built.map(([w, s]) => `<tr><td style="font-weight:${w};color:var(--${P}-text);font-size:17px">${fam.name} ${s}</td><td>${w}</td><td>${w === B.type.weights.heading ? 'Headings' : w === B.type.weights.label ? 'Labels' : w === B.type.weights.body ? 'Body' : HERO && s === HERO.style ? 'What the hero font is cut from' : ''}</td><td><span class="dl"><a href="fonts/${stem}-${s}.ttf" download>TTF</a><a href="fonts/${stem}-${s}.woff2" download>WOFF2</a></span></td></tr>`).join('')}
  </tbody></table></div>
  <p class="small mt">Licence texts: ${FONT.licences.filter(f => has(`fonts/${f}`)).map(f => `<a href="fonts/${f}">${f}</a>`).join(', ')}. What the fonts are made of: <a href="fonts/README.txt">README.txt</a>.</p>`);

const sumExt = (dir, ext) => has(dir) ? fs.readdirSync(path.join(OUT, dir)).filter(f => f.endsWith(ext)).reduce((n, f) => n + size(`${dir}/${f}`), 0) : 0;
const motionView = !MOTION ? '' : view('motion', 'Motion', `
  <header class="vh"><h1>Motion</h1><p class="lead">Each logo has an intro that comes to rest as the still logo, and a loop that starts and ends on it.</p>
    ${jump([['motion-rules', 'How it moves'], ['motion-all', 'Every animated logo'], ['motion-files', 'Files and formats']])}
  </header>
  <h2 id="motion-rules">How it moves</h2>
  ${facts([
    '<b>Built from its own parts.</b> Nothing is bent or stretched. The shapes of the logo turn or are drawn, and they end as the logo itself.',
    '<b>Nothing is added for show.</b> No glow, no particles, no trails. Fast movement blurs the way a camera would blur it.',
    ...Object.entries(MOTION.words).flatMap(([mid, w]) => { const m = S.mark(mid), l = MOTION.logos.find(x => x.of_mark === mid && !x.named); return [w.intro ? `<b>${esc(m.label)}, the intro.</b> ${w.intro}${l ? ` It is complete after ${l.done.toFixed(1)} seconds.` : ''}` : '', w.loop ? `<b>${esc(m.label)}, the loop.</b> ${w.loop}` : '']; }).filter(Boolean),
    '<b>Loops start and end on the still logo,</b> so an intro cuts straight into its loop and a loop repeats without a jump.',
    NAMED.length ? `<b>Timing:</b> with its name, ${NAMED[0].label} is complete after ${NAMED[0].done.toFixed(1)} seconds. Intros then hold still to the end.` : '',
  ].filter(Boolean), true)}
  <h2 id="motion-all">Every animated logo</h2>
  ${BRANDS.length > 1 ? '<p>Each brand\'s page has its own. This one switches between all of them.</p>' : ''}
  <div class="mt">${player(NAMED[0] && NAMED[0].id, true)}</div>
  <h2 id="motion-files">Files and formats</h2>
  <div class="table mt"><table><thead><tr><th>File</th><th>What it is</th><th>Use it for</th><th>Folder</th><th>${motionReady ? `All ${MOTION.of}` : 'So far'}</th></tr></thead><tbody>
    <tr><td><b>MP4</b></td><td>H.264, on the brand background</td><td>Posting as it is, end cards, streams</td><td class="mono">motion/</td><td>${mb(sumExt('motion', '.mp4'))}</td></tr>
    <tr><td><b>MOV</b></td><td>ProRes 4444, transparent</td><td>Editing: Premiere, DaVinci Resolve, After Effects</td><td class="mono">motion/transparent/</td><td>${mb(sumExt('motion/transparent', '.mov'))}</td></tr>
    <tr><td><b>WebM</b></td><td>VP9, transparent</td><td>The web and stream overlays</td><td class="mono">motion/transparent/</td><td>${mb(sumExt('motion/transparent', '.webm'))}</td></tr>
  </tbody></table></div>
  <p class="small mt">All files run at ${MOTION.fps} frames a second with no sound. The transparent files carry the logo only, so they sit on any footage or colour.</p>
  <div class="table mt"><table><thead><tr><th>Logo</th><th>Version</th>${MOTION.formats.map(f => `<th>${f[0]} x ${f[1]}</th>`).join('')}</tr></thead><tbody>${motionReady ? MOTION.logos.map(l => MOTION.variants.map(v => `<tr><td><b>${esc(l.label || l.of)}</b>${l.named ? '' : ', mark only'}</td><td>${capital(v)}, ${l.duration[v]} s</td>${MOTION.formats.map(f => { const n = `${l.id}-${v}-${f.join('x')}`; return `<td><span class="dl"><a href="motion/${n}.mp4" download>MP4</a>${clearReady ? `<a href="motion/transparent/${n}.mov" download>MOV</a><a href="motion/transparent/${n}.webm" download>WebM</a>` : ''}</span></td>`; }).join('')}</tr>`).join('')).join('') : ''}</tbody></table></div>`);

const artView = !ART || !ART_BRANDS.length ? '' : view('art', 'Art', `
  <header class="vh"><h1>Art</h1><p class="lead">Backgrounds drawn from the mark itself, with nothing written on them: ${list(ART.families.map(f => `${inWords(f.variants.length)} kinds${ART.families.length > 1 ? ` for ${esc(f.label.toLowerCase())}` : ''}`))}, dark and light${artMoving ? ', still and moving' : ''}.</p>
    ${jump([['art-set', 'The pictures'], ['art-where', 'Where a logo goes'], ['art-rules', 'Rules'], ['art-files', 'Sizes and files']])}
  </header>
  <h2 id="art-set">The pictures</h2>
  <p>Pick ${ART_BRANDS.length > 1 ? 'a brand and ' : ''}a shape. Each picture comes dark and light, as a PNG in ${inWords(ART.sizes.length)} size${ART.sizes.length > 1 ? 's' : ''} and as an SVG, with its background or without it.${artMoving ? ` The ${MOVETONE ? 'light' : 'dark'} ones also come as loops, in which light travels along the lines.` : ''}</p>
  <div class="art-box mt">
    <div class="controls">
      ${ART_BRANDS.length > 1 ? `<div class="ctl-row">${ctl('Brand', 'brand', ART_BRANDS.map(b => [b.id, dot(b) + esc(b.label), ` id="art-${b.id}"`]), { wide: true })}</div>` : `<div hidden>${ctl('Brand', 'brand', ART_BRANDS.map(b => [b.id, esc(b.label), ` id="art-${b.id}"`]))}</div>`}
      <div class="ctl-row">${ctl('Shape', 'shape', ART.shapes.map(s => [s.id, shapeIcon(s) + s.label]))}${ctl('Tone', 'tone', ART.tones.map(t => [t.id, t.label]), { on: light && ART.tones.some(t => t.id === 'light') ? 'light' : ART.tones[0].id })}${artMoving ? ctl('Motion', 'mode', [['still', 'Still'], ['moving', 'Moving']], { note: `${MOVETONE ? 'light' : 'dark'} only` }) : ''}${ctl('Background', 'back', [['solid', 'Included'], ['clear', 'Transparent']])}${ctl('Clear area', 'area', [['off', 'Hidden'], ['on', 'Shown']], { end: true })}</div>
    </div>
    ${ART_BRANDS.map((b, bi) => ART.shapes.map((s, si) => artSet(b, s, bi === 0 && si === 0)).join('')).join('')}
  </div>
  <h2 id="art-where">Where a logo goes</h2>
  ${facts([
    '<b>Every picture has one clear area.</b> Switch it on above. A logo, a title or a caption goes inside it and nowhere else.',
    `<b>No line comes near it.</b> Each picture is measured as it is made: nothing is drawn within ${S.CLEARANCE * 100}% of the picture's width of that area.`,
    '<b>Inside the mark or beside it.</b> Some kinds seat a logo in the roomiest place inside the mark. The others keep one side or the top of the picture empty, for a title or a few words.',
    '<b>Words may cross the quiet fills.</b> Shadow and Story are tone on tone, so a title can run over the mark there. A logo still goes in the clear area.',
  ], true)}
  <h2 id="art-rules">Rules</h2>
  ${facts([
    '<b>Art stays behind.</b> It carries no name, so it never stands in for a logo.',
    '<b>One colour to a picture, the brand\'s own.</b>',
    '<b>Never mirrored, turned or stretched.</b> For another size take the SVG, which scales to anything.',
    '<b>The files with no background</b> are for laying over video or another surface of the same tone.',
    light ? '<b>Light first.</b> The dark tone is for dark surfaces: video, apps in dark mode.' : '<b>Dark first.</b> The light tone is for paper: emails, documents and print. There the accents use their deeper stops, and ink takes the place of white.',
    artMoving ? `<b>In the loops nothing moves.</b> Light travels along lines and across shapes that are already there. Each loop lasts ${ARTM.loop} seconds and joins without a seam.` : '',
  ].filter(Boolean), true)}
  <h2 id="art-files">Sizes and files</h2>
  <div class="table mt"><table><thead><tr><th>Shape</th><th>PNG sizes</th>${artMoving ? '<th>Loop</th>' : ''}<th>For</th></tr></thead><tbody>
    ${ART.shapes.map(s => `<tr><td><b>${s.label}</b></td><td>${ART.sizes.map(k => `${s.w * k} x ${s.h * k}`).join(' and ')}</td>${artMoving ? `<td>${small(s).replace('x', ' x ')}</td>` : ''}<td>${esc(s.use || '')}</td></tr>`).join('')}
  </tbody></table></div>
  <p class="small mt">${artFiles} files in <span class="mono">art/</span>. The ones named <span class="mono">-light</span> are the light tone, and the ones named <span class="mono">-clear</span> have no background.${artMoving ? ` The loops are MP4 on the background and WebM with no background, at ${ARTM.fps} frames a second.` : ''}${BANNERS.length ? ' The banners under <a href="#channel-art">Channel art</a> are the Outline picture with a lockup in the middle.' : ''}</p>`);

// ---------------------------------------------------------------- where the brand is seen
// a picture from the upload kit, with its download. crop: the middle part of it that a given screen shows
const shot = (f, alt, cap) => `<figure><img class="shot" src="${f}" alt="${esc(alt)}" loading="lazy"><figcaption class="fc"><span>${cap}</span><span class="dl"><a href="${f}" download>${path.extname(f).slice(1).toUpperCase()}</a></span></figcaption></figure>`;
const crop = (f, w, h, W, cap) => `<figure${w < W ? ` style="width:${r(w / W * 100)}%;justify-self:center"` : ''}><div class="crop" role="img" aria-label="${esc(cap)}" style="aspect-ratio:${w}/${h};background-image:url('${f}');background-size:${r(W / w * 100)}% auto"></div><figcaption>${cap}</figcaption></figure>`;
const dims = f => { const m = f.match(/(\d+)x(\d+)\.png$/); return m ? [+m[1], +m[2]] : null; };
const channelView = !BANNERS.length ? '' : view('channel-art', 'Channel art', `
  <header class="vh"><h1>Channel art</h1><p class="lead">Banners and covers: the lockup, with the mark's outline behind it.</p></header>
  <div class="grid g2 mt">
    ${BANNERS.map(i => { const d = dims(i.file), b = brandOf(i.brand); return shot(i.file, `${i.group}: ${i.what}`, `${esc(i.group)}, ${esc(i.what)}${d ? `, ${d[0]} x ${d[1]}` : ''}`) + (i.safe && d ? crop(i.file, i.safe[0], i.safe[1], d[0], `The middle ${i.safe[0]} x ${i.safe[1]}: the part every screen shows`) : ''); }).join('')}
  </div>
  <h2 id="channel-rules">How they are built</h2>
  ${facts([
    '<b>One lockup, in the middle.</b> No slogan, no second logo, no photo.',
    `<b>The outline fills the rest.</b> It is the mark itself, enlarged until the lockup sits in its roomiest place, further from every line than ${S.CLEARANCE * 100}% of the picture's width.`,
    '<b>The accent part\'s line carries the accent.</b> Every other line stays quiet.',
    '<b>Where a platform has no banner,</b> the profile picture does the work.',
  ], true)}`);
const webView = !(MAIL.length || WEB.length) ? '' : view('email', 'Email and web', `
  <header class="vh"><h1>Email and web</h1><p class="lead">The logo where a page or a mail app shows it: small, on any background, with no font to rely on.</p></header>
  ${MAIL.length ? `<h2 id="email-files">Email</h2>
  <div class="grid g2 mt">${MAIL.filter(i => /\.png$/.test(i.file)).map(i => shot(i.file, i.what, esc(i.what))).join('')}</div>
  ${facts([
    '<b>The logo carries its own background.</b> Many mail apps strip background colours, and some turn an email dark: a logo with nothing behind it can vanish.',
    '<b>Type falls back cleanly.</b> Few mail apps load web fonts, so set a system font after the brand\'s own.',
    MAIL.some(i => /sender/.test(i.file)) ? '<b>The sender logo</b> is the square some mail apps show beside the sender\'s name. Whether it shows is up to each mail app, and it needs the domain to be set up for it.' : '',
  ].filter(Boolean), true)}` : ''}
  ${WEB.length ? `<h2 id="web-files">Website</h2>
  <div class="ready">${WEB.map(i => `<a href="${i.file}" download>${/\.(png|svg)$/.test(i.file) ? img(i.file, i.what, '', 'loading="lazy"') : '<span></span>'}<span><b>${esc(i.what)}</b><span class="mono">${soft(i.file)}</span></span></a>`).join('')}</div>` : ''}`);

const componentsView = view('components', 'Components', `
  <header class="vh"><h1>Components</h1><p class="lead">A small set that shows the tokens at work.</p></header>
  <p class="mt">Buttons and badges are pills, tiles use a ${B.tokens.radius.m} radius, inputs ${B.tokens.radius.s}.${Object.keys(ACCENTS).length > 1 ? ' Switch the accent to see the same parts under each one.' : ''}</p>
  ${Object.keys(ACCENTS).length > 1 ? `<div class="seg mt" id="compAccent">${Object.entries(ACCENTS).map(([k, a], i) => `<button class="pill" data-accent="${k}" aria-pressed="${i === 0}"><i style="background:${a.solid}"></i>${a.label}</button>`).join('')}</div>` : ''}
  <div class="comp mt" id="comp" data-${P}-accent="${A0 || ''}">
    <div class="row"><button class="ds-btn primary">Primary</button><button class="ds-btn secondary">Secondary</button><button class="ds-btn quiet">Quiet</button></div>
    <div class="row"><span class="ds-badge accent">Accent</span><span class="ds-badge success">New</span><span class="ds-badge neutral">Active</span></div>
    <div class="ds-field"><label for="q">Search</label><input id="q" type="search" placeholder="Title, type or tag"></div>
  </div>
  <p class="small mt">The tokens: <a href="tokens/${B.id}.css">tokens/${B.id}.css</a> and <a href="tokens/${B.id}.tokens.json">${B.id}.tokens.json</a>.</p>`);

// do and do not: drawn from the first flat mark
// ---------------------------------------------------------------- items: the brand on things
const itemsView = !THINGS.length ? '' : view('items', 'Items', `
  <header class="vh"><h1>Items</h1><p class="lead">The brand on the things it hands out, wraps, sends and wears: ${list(THINGS.map(i => esc(i.label.toLowerCase())))}.</p></header>
  <p>Each one is drawn at its real size. The picture shows the thing, and the files beside it are what a printer or a maker is given.</p>
  <div class="things mt">${THINGS.map(i => `<figure class="thing" id="item-${i.id}">${i.shown && has(i.shown) ? `<a href="${i.shown}">${img(i.shown, `${i.label}, as it would look`, '', 'loading="lazy"')}</a>` : `<div class="tile ${OWN}">${img(i.faces[0].svg, i.label, '', 'style="max-height:240px"')}</div>`}<figcaption><b>${esc(i.label)}</b>${BRANDS.length > 1 ? ` <span class="small">${esc((brandOf(i.brand) || {}).label || '')}</span>` : ''}<span class="small">${i.size[0]} x ${i.size[1]} ${i.unit}${i.shape === 'circle' ? ', cut round' : ''}${i.bleed ? `. The print file runs ${i.bleed} mm past the cut` : ''}. ${esc(i.note)}</span><span class="dl">${i.faces.map(f => `<a href="${f.svg}" download>${esc(f.label)} SVG</a><a href="${f.png}" download>PNG</a>`).join('')}${i.pdf && has(i.pdf) ? `<a href="${i.pdf}" download>Print PDF</a>` : ''}</span></figcaption></figure>`).join('')}</div>
  ${facts([
    '<b>The print files are PDF,</b> in RGB, with every word turned into outlines, so no font is needed to open them. A printer may ask for its own colour profile: they convert it, or say what they need.',
    THINGS.some(i => ['bag', 'cup', 'box'].includes(i.item)) ? '<b>Bags, cups and boxes are made from the maker\'s own template.</b> These files are the art for their faces: send them with the logo files and let the maker place them.' : '',
    '<b>The pictures are drawings,</b> made to judge a design by. They are not photographs of a finished thing.',
    '<b>A logo keeps its own room here too.</b> Where a thing carries the mark\'s art, the logo sits in the art\'s clear area, as everywhere else.',
  ].filter(Boolean), true)}`);

const usageView = (() => {
  const m = PARTS[0];
  if (!m) return '';
  const b = BRANDS.find(x => x.mark === m), [bx, by, bw, bh] = m.bounds, st = A0 ? ACCENTS[A0].stops : [WHITE, WHITE, WHITE], k2 = Object.keys(ACCENTS)[1];
  const paths = (body, paint) => m.order.map(p => `<path fill="${p.accent ? paint : body}" d="${p.d}"/>`).join('');
  const grad = (gid, stops) => `<defs><linearGradient id="${gid}" gradientUnits="userSpaceOnUse" ${m.AXIS_ATTR}>${S.stopsSvg(stops)}</linearGradient></defs>`;
  const draw = (inner, w = 190) => `<svg viewBox="${r(bx)} ${r(by)} ${r(bw)} ${r(bh)}" style="width:min(100%,${w}px);max-height:130px">${inner}</svg>`;
  const mixed = m.parts.some(p => !p.accent) && m.parts.some(p => p.accent);
  const cells = [
    A0 ? tile('ink', draw(grad('u1', st) + paths('#fff', 'url(#u1)')), `<span class="verdict do">Do</span> ${mixed ? 'White mark, accent part, on dark' : 'The mark in its accent, on dark'}`) : '',
    tile('paper', draw(paths('#000', '#000')), '<span class="verdict do">Do</span> Flat black on light or busy backgrounds'),
    tile('surface', img(file(b, 'avatar'), '', '', 'style="width:96px;border-radius:50%"'), `<span class="verdict do">Do</span> ${Object.keys(ACCENTS).length > 1 ? 'One fixed accent to a brand' : 'The profile picture file, as it is'}`),
    tile('ink', img(file(b, 'mark-white'), '', '', 'style="height:52px"'), '<span class="verdict do">Do</span> The mark alone where the name cannot be read'),
    A0 && mixed ? tile('ink', draw(grad('u2', st) + paths('url(#u2)', '#fff')), '<span class="verdict dont">Do not</span> move the accent to another part') : '',
    k2 && m.parts.length > 1 ? tile('ink', draw(m.order.map((p, i) => `<path fill="${[WHITE, ACCENTS[k2].solid, ACCENTS[A0].solid][i % 3]}" d="${p.d}"/>`).join('')), '<span class="verdict dont">Do not</span> use two accents') : '',
    tile('ink', `<div style="transform:scaleX(1.45);width:120px">${draw(grad('u3', st) + paths('#fff', 'url(#u3)'))}</div>`, '<span class="verdict dont">Do not</span> stretch or rotate'),
    A0 ? tile('ink', `<div style="background:#8f8f96;padding:22px;border-radius:8px">${draw(grad('u4', st) + paths('#fff', 'url(#u4)'), 130)}</div>`, '<span class="verdict dont">Do not</span> put colour on mid-tones. Use flat black or white') : '',
    tile('ink', `<div style="filter:drop-shadow(0 0 14px ${A0 ? ACCENTS[A0].solid : WHITE})">${draw(grad('u5', st) + paths('#fff', 'url(#u5)'), 150)}</div>`, '<span class="verdict dont">Do not</span> add glow, gloss or 3D'),
    tile('ink', `<div style="display:flex;gap:10px;align-items:center;font:400 21px/1 'Courier New',Courier,monospace;color:#fff">${draw(paths('#fff', '#fff'), 90)}<span>${esc(b.word)}</span></div>`, '<span class="verdict dont">Do not</span> retype the name. Use the lockup files'),
  ].filter(Boolean);
  return view('usage', 'Do and do not', `
  <header class="vh"><h1>Do and do not</h1><p class="lead">${capital(inWords(cells.filter(c => c.includes('verdict do"')).length))} ways to use the mark, and ${inWords(cells.filter(c => c.includes('verdict dont')).length)} ways not to.</p></header>
  <div class="pairs mt">${cells.join('')}</div>`);
})();

const rolloutView = !ROLL ? '' : view('rollout', 'Rollout', `
  <header class="vh"><h1>Rollout</h1><p class="lead">${about.rollout || 'Staged, not started.'}</p></header>
  <p class="mt">Every file below is made and waits. Nothing goes live until its owner says so and does it. Go in this order, and tick each one off as it goes live: the ticks are remembered on this computer.</p>
  <div class="ro-groups mt">${rolloutHtml}</div>
  <p class="small mt">Platform sizes come from what was in common use when the engine was written: check each one in its upload dialog.</p>`);

const mark3 = ok => ok === true ? '<span class="verdict do">Passed</span>' : ok === false ? '<span class="verdict dont">Failed</span>' : '<span class="verdict">Not made yet</span>';
const checksView = view('checks', 'Checks', `
  <header class="vh"><h1>Checks</h1><p class="lead">What was tested, and what it showed.</p></header>
  ${CHECKS ? `<p class="small mt">Tested on ${CHECKS.date} by the check step.</p>
  <ul class="facts two mt">${CHECKS.results.map(c => `<li><b>${esc(c.title)}.</b> ${mark3(c.ok)}. ${esc(c.text)}${c.detail.length ? `<br><span class="small">${c.detail.slice(0, 4).map(esc).join('<br>')}</span>` : ''}</li>`).join('')}</ul>` : '<p class="note mt">Nothing has been tested yet: run the check step, then this page again.</p>'}
  ${(about.checks || []).length ? `<h2>Looked up by hand</h2>${facts(about.checks, true)}` : ''}`);

// ---------------------------------------------------------------- files
function listSvg(dir) { const d = path.join(OUT, dir); return fs.existsSync(d) ? fs.readdirSync(d).filter(f => f.endsWith('.svg')).sort() : []; }
const NAMES = { mark: 'marks', icon: 'square icons', avatar: 'profile pictures', favicon: 'favicons' };
const GROUPS = S.marks.flatMap(m => { const root = `logos/${m.id}/svg`, dirs = fs.existsSync(path.join(OUT, root)) ? fs.readdirSync(path.join(OUT, root)).filter(d => fs.statSync(path.join(OUT, root, d)).isDirectory()) : [];
  const label = d => { const b = m.brands.find(x => x.dir === d); return b ? `${b.label} lockups` : `${S.marks.length > 1 ? m.label + ': ' : ''}${NAMES[d] || d}`; };
  return [...Object.keys(NAMES).filter(d => dirs.includes(d)), ...m.brands.map(b => b.dir).filter(d => dirs.includes(d)), ...dirs.filter(d => !NAMES[d] && !m.brands.some(b => b.dir === d))].filter((d, i, a) => a.indexOf(d) === i).map(d => [capital(label(d)), `${root}/${d}`, m.id]); });
const fileGroups = GROUPS.map(([label, dir, mid], gi) => {
  const files = listSvg(dir);
  const items = files.map(f => {
    const dark = /white|on-dark|avatar-.*-dark|favicon|appicon|color/.test(f) && !/on-light|favicon-black/.test(f);
    const pngRel = `${dir.replace('/svg/', '/png/')}/${f.replace('.svg', '.png')}`;
    return `<div class="file"><a class="thumb ${dark ? 'ink' : 'paper'}" href="${dir}/${f}">${img(`${dir}/${f}`, f, '', 'loading="lazy"')}</a><div class="fname">${f.replace(new RegExp(`^${mid}-`), '').replace('.svg', '')}</div><div class="flinks"><a href="${dir}/${f}">SVG</a>${has(pngRel) ? `<a href="${pngRel}">PNG</a>` : ''}</div></div>`;
  }).join('');
  return `<details${gi === 0 ? ' open' : ''}><summary><span>${esc(label)}</span><span class="count">${files.length}</span></summary><div class="files">${items}</div></details>`;
}).join('');
const filesView = view('files', 'Files', `
  <header class="vh"><h1>Files</h1><p class="lead">Everything in the folder, and how to make it again.</p>
    ${jump([['files-logos', 'Logo files'], ['files-other', 'Everything else'], ['files-build', 'Making it again']])}
  </header>
  <h2 id="files-logos">Logo files</h2>
  <p>${svgCount} SVG files with ${pngCount} PNG exports. Open a group, then pick a format.</p>
  <div class="mt">${fileGroups}</div>
  <h2 id="files-other">Everything else</h2>
  <ul class="finder wide mt">
    ${motionReady ? `<li><a href="#motion-files">Animated logos</a><span>${MOTION.of} animations, each as MP4, MOV and WebM, listed under Motion</span></li>` : ''}
    ${built.length ? `<li><a href="#type-files">The fonts</a><span>${HERO ? `${HERO.family} and ` : ''}${built.length} weights of ${fam.name}, as TTF and WOFF2, listed under Type</span></li>` : ''}
    <li><a href="tokens/${B.id}.css">tokens/${B.id}.css</a><span>Colours, type and sizes as CSS variables. The same as <a href="tokens/${B.id}.tokens.json">JSON</a></span></li>
    ${S.marks.filter(m => has(`logos/${m.id}/${m.id}-master.pdf`)).map(m => `<li><a href="logos/${m.id}/${m.id}-master.pdf">${esc(m.label)}: master sheet</a><span>Every main version on one page: PDF and <a href="logos/${m.id}/${m.id}-master.svg">SVG</a></span></li>`).join('')}
    ${ART ? `<li><a href="#art">Art</a><span>${artFiles} background files: PNG and SVG, with and without the background, listed under Art</span></li>` : ''}
    ${THINGS.length ? `<li><a href="#items">Items</a><span>${list(THINGS.map(i => esc(i.label)))}: faces, print files and pictures, listed under Items</span></li>` : ''}
    ${BANNERS.length ? '<li><a href="#channel-art">Channel art</a><span>Banners and covers</span></li>' : ''}
    ${ROLL ? '<li><a href="#rollout">Upload kit</a><span>Every place\'s file at its upload size</span></li>' : ''}
  </ul>
  <h2 id="files-build">Making it again</h2>
  <p>Everything is drawn from <span class="mono">brand/brand.json</span> and <span class="mono">brand/mark.svg</span> by the brand-system engine, so any colour, name, size or timing can be changed and made again. Each line below is <span class="mono">node run.js</span>, then the step, then this brand's folder.</p>
  <div class="table mt"><table><thead><tr><th>Step</th><th>It makes</th><th>Change it in</th></tr></thead><tbody>
    <tr><td class="mono">mark</td><td>The mark's outline, measured, from its drawing</td><td class="mono">brand/mark.svg</td></tr>
    <tr><td class="mono">fonts</td><td>The brand's own font family, with its own characters</td><td class="mono">brand.json: type.family</td></tr>
    <tr><td class="mono">logos</td><td>Every logo file and the tokens</td><td class="mono">brand.json: marks, colours</td></tr>
    <tr><td class="mono">masters</td><td>The master sheets</td><td class="mono">the logo files</td></tr>
    <tr><td class="mono">rollout</td><td>The upload kit: profile pictures, banners, icons</td><td class="mono">brand.json: rollout</td></tr>
    <tr><td class="mono">art</td><td>The background art, in every shape, size and tone</td><td class="mono">brand.json: art, and each mark's art</td></tr>
    <tr><td class="mono">items</td><td>The brand on things: cards, bags, stickers and the rest</td><td class="mono">brand.json: items</td></tr>
    <tr><td class="mono">art-motion</td><td>The art as moving loops</td><td class="mono">the art</td></tr>
    <tr><td class="mono">motion</td><td>The animated logos</td><td class="mono">brand.json: each mark's motion</td></tr>
    <tr><td class="mono">check</td><td>The tests listed under Checks</td><td class="mono">nothing: it only reads</td></tr>
    <tr><td class="mono">page</td><td>This page</td><td class="mono">brand.json: about</td></tr>
  </tbody></table></div>
  ${B.page.credit === false ? '' : `<p class="small mt2">Made with <a href="${ENGINE.homepage}">brand-system</a> ${ENGINE.version}${ENGINE.author ? `, by <a href="${ENGINE.author.url}">${ENGINE.author.name}</a>` : ''}.</p>`}`);

const NAV = [
  [null, [['start', 'Start']]],
  [BRANDS.length > 1 ? 'Brands' : 'Brand', BRANDS.map(b => [b.id, b.label])],
  ['System', [...S.marks.map(m => [`mark-${m.id}`, m.label]), ['colour', 'Colour'], ['type', 'Type'], MOTION && ['motion', 'Motion'], artView && ['art', 'Art'], ['components', 'Components']].filter(Boolean)],
  ['Applications', [channelView && ['channel-art', 'Channel art'], webView && ['email', 'Email and web'], itemsView && ['items', 'Items']].filter(Boolean)],
  ['Use', [usageView && ['usage', 'Do and do not'], ROLL && ['rollout', 'Rollout']].filter(Boolean)],
  ['Reference', [['checks', 'Checks'], ['files', 'Files']]],
].filter(g => g[1].length);
const markViews = S.marks.map(markView).join('');
const picker = PARTS[0] && A0 ? PARTS[0] : null;

const css = `
${fontCss}
:root{color-scheme:dark;--P-body:#fff}
*{box-sizing:border-box}
[hidden]{display:none !important}
html{scroll-padding-top:28px}
body{margin:0;background:var(--P-ink);color:var(--P-text);font:500 16px/1.6 var(--P-font);-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}
img{max-width:100%;display:block}
a{color:var(--P-accent);text-underline-offset:3px}
a:focus-visible,button:focus-visible,input:focus-visible,summary:focus-visible{outline:2px solid var(--P-accent);outline-offset:3px;border-radius:6px}
.shell{display:grid;grid-template-columns:236px minmax(0,1fr);max-width:1500px;margin:0 auto}
.rail{position:sticky;top:0;align-self:start;height:100dvh;padding:24px 18px 24px 30px;display:flex;flex-direction:column;gap:14px;overflow:auto;scrollbar-width:thin}
.rail .logo img{height:26px}
.rail ul{list-style:none;margin:0;padding:0;display:grid;gap:1px}
.rail .grp{font-size:11.5px;line-height:1.4;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--P-text-3);padding:13px 12px 4px}
.rail a{display:block;padding:4.5px 12px;border-radius:var(--P-radius-s);color:var(--P-text-2);text-decoration:none;font-size:14px;line-height:1.4;font-weight:600;transition:color .15s,background .15s}
.rail a:hover{color:var(--P-text);background:var(--P-surface-1)}
.rail a.on{color:var(--P-on-accent);background:var(--P-accent)}
.rail a.logo,.rail a.logo:hover{padding:0 12px;background:none}
main{padding:0 64px 140px 34px;min-width:0}
main > section{padding-top:56px}
h1{font-family:var(--P-font-hero);font-weight:var(--P-weight-hero);letter-spacing:var(--P-track-hero);font-size:clamp(36px,3.8vw,56px);line-height:1.04;margin:0 0 18px}
.hero h1{font-size:clamp(40px,4.6vw,66px)}
h2{font-weight:800;letter-spacing:-0.025em;font-size:clamp(24px,2.3vw,32px);line-height:1.12;margin:76px 0 14px;padding-top:30px;border-top:1px solid var(--P-surface-3)}
h3{font-weight:700;font-size:17px;letter-spacing:-0.01em;margin:0 0 6px}
p{margin:0 0 14px;color:var(--P-text-2);max-width:68ch}
p.lead{font-size:19px;line-height:1.5;color:var(--P-text);max-width:46ch;margin:0 0 14px}
.vh p.lead{margin:0}
.small{font-size:13.5px;color:var(--P-text-3);margin:0}
.mono{font:500 12.5px/1.5 ui-monospace,"Cascadia Code",Consolas,monospace;color:var(--P-text-2);margin:0 0 4px;overflow-wrap:anywhere}
ul.facts{margin:0;padding:0;list-style:none;display:grid;gap:12px;align-content:start}
ul.facts li{color:var(--P-text-2);padding-left:18px;position:relative;max-width:56ch}
ul.facts li::before{content:"";position:absolute;left:0;top:.62em;width:8px;height:2px;background:var(--P-accent)}
ul.facts b{color:var(--P-text);font-weight:700}
ul.facts.two{grid-template-columns:repeat(2,minmax(0,1fr));column-gap:56px}
figure{margin:0}
figcaption{font-size:13px;color:var(--P-text-3);margin-top:10px}
figcaption.fc{display:flex;justify-content:space-between;gap:6px 14px;flex-wrap:wrap}
.dl{display:inline-flex;gap:12px;font-weight:700;white-space:nowrap}
.jump{display:flex;flex-wrap:wrap;gap:8px;margin-top:24px}
.jump a{font-size:13px;font-weight:600;color:var(--P-text-2);text-decoration:none;padding:9px 14px;border-radius:var(--P-radius-pill);background:var(--P-surface-1);transition:color .15s,background .15s}
.jump a:hover{color:var(--P-text);background:var(--P-surface-2)}
.chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:20px}
.fact-chip{font-size:13px;font-weight:600;padding:7px 12px;border-radius:var(--P-radius-pill);box-shadow:inset 0 0 0 1px var(--P-line);color:var(--P-text-2);display:inline-flex;gap:8px;align-items:center}
.fact-chip i{width:12px;height:12px;border-radius:50%}
.tile{border-radius:var(--P-radius-m);display:grid;place-items:center;padding:clamp(22px,3vw,44px);min-height:190px}
.tile.ink{background:var(--P-ink);box-shadow:inset 0 0 0 1px var(--P-surface-3)}
.tile.surface{background:var(--P-surface-1)}
.tile.paper{background:var(--P-paper)}
.tile img{max-height:100%}
.grid{display:grid;gap:16px}
.g2{grid-template-columns:repeat(2,minmax(0,1fr))}
.g3{grid-template-columns:repeat(3,minmax(0,1fr))}
.g4{grid-template-columns:repeat(4,minmax(0,1fr))}
.grid > .tile-wrap,.pairs > .tile-wrap{display:flex;flex-direction:column}
.tile-wrap > .tile{flex:1}
.split{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,1fr);gap:clamp(24px,4vw,64px);align-items:center}
.split.top{align-items:start}
.note{border-radius:var(--P-radius-m);background:var(--P-surface-1);padding:20px 22px;color:var(--P-text-2);max-width:76ch}
.note b{color:var(--P-text)}
.note.warn{box-shadow:inset 3px 0 0 var(--P-accent)}
.mt{margin-top:28px !important}.mt2{margin-top:52px !important}
/* start */
.hero{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.1fr);gap:48px;align-items:center}
.hero .tile{min-height:400px}
.family{display:grid;grid-template-columns:1.5fr 1fr 1fr;gap:16px}
.family a{display:flex;flex-direction:column;gap:10px;text-decoration:none;color:var(--P-text-2);font-size:13.5px;font-weight:600}
.family a:hover{color:var(--P-text)}
.family .wide{grid-row:span 2}
.family .tile{min-height:150px;padding:28px;flex:1;transition:box-shadow .15s}
.family a:hover .tile{box-shadow:inset 0 0 0 1px var(--P-text-3)}
ul.finder{list-style:none;margin:0;padding:0;display:grid}
ul.finder li{display:grid;gap:2px;padding:11px 0;border-bottom:1px solid var(--P-surface-3)}
ul.finder li > a{font-weight:700;text-decoration:none}
ul.finder li > a:hover{text-decoration:underline}
ul.finder span{font-size:13.5px;color:var(--P-text-3)}
ul.finder.wide li{grid-template-columns:minmax(200px,.6fr) 1fr;gap:16px;align-items:baseline}
/* sizes */
.sizes{display:flex;flex-wrap:wrap;align-items:flex-end;gap:22px;padding:22px 26px;border-radius:var(--P-radius-m)}
.sizes.ink{background:var(--P-ink);box-shadow:inset 0 0 0 1px var(--P-surface-3)}.sizes.paper{background:var(--P-paper)}
.px{image-rendering:pixelated}
.things{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:30px 22px}
.thing img{width:100%;border-radius:var(--P-radius-m)}
.thing figcaption{display:grid;gap:6px;margin-top:12px}
.thing figcaption b{color:var(--P-text);font-size:15px}
.thing .dl{flex-wrap:wrap;white-space:normal;gap:6px 14px}
.ready{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px;margin-top:24px}
.ready a{display:grid;grid-template-columns:64px 1fr;gap:14px;align-items:center;padding:12px;border-radius:var(--P-radius-m);background:var(--P-surface-1);text-decoration:none;color:var(--P-text);font-size:14px;transition:background .15s}
.ready a:hover{background:var(--P-surface-2)}
.ready img{width:64px;height:64px;object-fit:contain;border-radius:var(--P-radius-s);background:var(--P-surface-3)}
.ready span{display:grid;gap:2px;min-width:0}
/* accent */
.accent-cards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}
.accent-card{display:grid;gap:14px;align-content:start}
.accent-swatch{height:92px;border-radius:var(--P-radius-m)}
.picker{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(280px,.75fr);gap:16px}
.stage{border-radius:var(--P-radius-m);display:grid;place-items:center;padding:48px;min-height:420px;background:var(--P-ink);box-shadow:inset 0 0 0 1px var(--P-surface-3);transition:background .2s;--P-body:#fff;color:#fff}
.stage[data-bg="paper"]{background:var(--P-paper);--P-body:var(--P-ink);box-shadow:none}
.stage[data-bg="surface"]{background:var(--P-surface-1)}
.stage svg{width:min(100%,520px);max-height:360px}
.panel{border-radius:var(--P-radius-m);background:var(--P-surface-1);padding:22px;display:grid;gap:18px;align-content:start}
.panel .lbl{font-size:13px;font-weight:600;color:var(--P-text-2);display:grid;gap:8px}
.presets,.btns{display:flex;flex-wrap:wrap;gap:8px}
.pill{font:600 13px/1 var(--P-font);padding:10px 14px;border-radius:var(--P-radius-pill);border:1px solid var(--P-line);background:transparent;color:var(--P-text);cursor:pointer;display:inline-flex;align-items:center;gap:8px;transition:background .15s,color .15s,border-color .15s,transform .1s}
.pill:hover{background:var(--P-surface-2)}.pill:active{transform:scale(.98)}
.pill[aria-pressed="true"]{border-color:var(--P-text);background:var(--P-text);color:var(--P-ink)}
.pill i{width:14px;height:14px;border-radius:50%;display:inline-block;flex:none}
.pill[aria-pressed="true"] i{box-shadow:0 0 0 1.5px rgba(12,12,14,.3)}
.pill svg{width:14px;height:14px;flex:none}
.pill:focus-visible,.ds-btn:focus-visible{border-radius:var(--P-radius-pill)}
/* controls: a panel of labelled choices. Each choice is one track with its options in it, and the one in use is filled */
.controls{display:grid;gap:16px;padding:18px 20px;border-radius:var(--P-radius-m);background:var(--P-surface-1)}
.ctl-row{display:flex;flex-wrap:wrap;gap:14px 28px;align-items:flex-end}
.ctl-row + .ctl-row{padding-top:16px;border-top:1px solid var(--P-surface-3)}
.ctl{display:grid;gap:8px;justify-items:start;min-width:0}
.ctl.end{margin-left:auto}
.ctl-l{font-size:11.5px;line-height:1.2;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--P-text-3)}
.ctl-l small{font-size:11.5px;font-weight:500;letter-spacing:.02em;text-transform:none;margin-left:8px}
.seg{display:inline-flex;flex-wrap:wrap;gap:2px;padding:3px;border-radius:var(--P-radius-l);background:var(--P-ink);box-shadow:inset 0 0 0 1px var(--P-surface-3);justify-self:start}
.seg .pill{border-color:transparent;color:var(--P-text-2);padding:9px 14px}
.seg .pill:hover{color:var(--P-text)}
.seg .pill[aria-pressed="true"],.seg .pill[aria-pressed="true"]:hover{color:var(--P-ink);background:var(--P-text)}
.seg .pill i{width:10px;height:10px}
.seg .pill:focus-visible{outline-offset:1px}
.stops{display:flex;gap:10px}
.stops input{width:100%;height:42px;border:1px solid var(--P-line);border-radius:var(--P-radius-s);background:var(--P-surface-2);padding:3px;cursor:pointer}
.readout{font-size:13px;color:var(--P-text-2);margin:0}
.readout b{color:var(--P-text)}
/* components */
.ds-btn{font:700 14px/1 var(--P-font);padding:13px 22px;border-radius:var(--P-radius-pill);border:1px solid transparent;cursor:pointer;transition:transform .1s,filter .15s,background .15s}
.ds-btn:active{transform:translateY(1px)}
.ds-btn.primary{background:var(--P-accent);color:var(--P-on-accent)}.ds-btn.primary:hover{filter:brightness(1.08)}
.ds-btn.secondary{background:var(--P-surface-2);color:var(--P-text);border-color:var(--P-line)}.ds-btn.secondary:hover{background:var(--P-surface-3)}
.ds-btn.quiet{background:transparent;color:var(--P-accent)}.ds-btn.quiet:hover{background:var(--P-surface-2)}
.ds-badge{font:700 11.5px/1 var(--P-font);padding:6px 10px;border-radius:var(--P-radius-pill);display:inline-block}
.ds-badge.accent{background:var(--P-accent);color:var(--P-on-accent)}.ds-badge.success{background:var(--P-success);color:#06301B}.ds-badge.neutral{background:var(--P-surface-3);color:var(--P-text)}
.ds-field{display:grid;gap:8px;max-width:420px}
.ds-field label{font-size:13px;font-weight:600;color:var(--P-text-2)}
.ds-field input{font:500 15px/1 var(--P-font);padding:13px 14px;border-radius:var(--P-radius-s);border:1px solid var(--P-line);background:var(--P-ink);color:var(--P-text)}
.ds-field input::placeholder{color:var(--P-text-3)}
.ds-field input:focus{outline:2px solid var(--P-accent);outline-offset:1px}
.comp{border-radius:var(--P-radius-m);background:var(--P-surface-1);padding:28px;display:grid;gap:26px}
.comp .row{display:flex;flex-wrap:wrap;gap:12px;align-items:center}
/* colour */
.swatches{display:grid;grid-template-columns:repeat(auto-fit,minmax(118px,1fr));border-radius:var(--P-radius-m);overflow:hidden}
.swatches.ten{grid-template-columns:repeat(10,minmax(0,1fr))}
.sw{padding:44px 12px 12px;display:grid;gap:2px;font-size:12.5px}
.sw b{font-weight:700}.sw span{font-family:ui-monospace,Consolas,monospace;opacity:.85}
.crs{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px 28px}
.cr{display:grid;grid-template-columns:auto 1fr auto;gap:12px;align-items:center;font-size:14px;color:var(--P-text-2)}
.cr b{color:var(--P-text);font-variant-numeric:tabular-nums}
.chip{width:44px;height:32px;border-radius:var(--P-radius-s);display:grid;place-items:center;font-weight:800;font-size:14px;box-shadow:inset 0 0 0 1px var(--P-surface-3)}
/* type */
.spec{display:grid;grid-template-columns:130px minmax(0,1.15fr) minmax(0,1fr);gap:8px 32px;align-items:baseline;padding:18px 0;border-bottom:1px solid var(--P-surface-3)}
.meta{font-size:13px;color:var(--P-text-3);font-weight:500}
.t-hero{font-family:var(--P-font-hero);font-weight:var(--P-weight-hero);letter-spacing:var(--P-track-hero);font-size:clamp(30px,3.4vw,48px);line-height:1.06}
.herospec{min-height:0;display:grid;gap:10px;justify-items:start;align-items:start;padding:34px 38px}
.spec .t-hero{font-size:clamp(26px,2.9vw,40px)}
.herospec .t-hero{font-size:clamp(30px,4.4vw,62px);justify-self:stretch}
.heropair{display:grid;gap:6px;justify-items:start;justify-self:stretch;font-size:clamp(28px,3.4vw,46px);line-height:1.25;letter-spacing:var(--P-track-hero)}
.heropair [dir=rtl]{justify-self:stretch}
.t-heading{font-weight:var(--P-weight-heading);font-size:24px;letter-spacing:-0.015em;line-height:1.25}
.t-label{font-weight:var(--P-weight-label);font-size:13px;letter-spacing:var(--P-track-label);text-transform:uppercase}
.t-body{font-weight:var(--P-weight-body);font-size:16px;color:var(--P-text-2)}
[dir=rtl]{letter-spacing:0 !important}
.t-hero[dir=rtl],.t-hero [dir=rtl]{line-height:1.35}.t-heading[dir=rtl]{line-height:1.5}.t-label[dir=rtl]{font-size:15px}
.own{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}
.own > div{border-radius:var(--P-radius-m);background:var(--P-surface-1);padding:20px 22px;display:grid;gap:4px}
.own-c{font-weight:800;font-size:44px;line-height:1.25;color:var(--P-text);white-space:nowrap;overflow:hidden}
.ladder{display:grid}
.lw{display:grid;grid-template-columns:130px minmax(0,1.15fr) minmax(0,1fr);gap:8px 32px;align-items:baseline;padding:9px 0;border-bottom:1px solid var(--P-surface-3);font-size:24px;line-height:1.4}
/* motion */
.motion{display:flex;gap:16px;align-items:flex-start;margin-top:20px}
.motion figure{flex:1 1 0;min-width:0}
.motion figcaption.fc{flex-direction:column;gap:2px}
.vbox{border-radius:var(--P-radius-m);overflow:hidden;background:var(--P-ink);box-shadow:0 0 0 1px var(--P-surface-3)}
.vbox video{display:block;width:100%;height:auto;cursor:pointer}
.shot{width:100%;height:auto;border-radius:var(--P-radius-m);box-shadow:0 0 0 1px var(--P-surface-3)}
.crop{background-position:center;background-repeat:no-repeat;border-radius:var(--P-radius-m);box-shadow:0 0 0 1px var(--P-surface-3)}
.player.clear .vbox,.art-box.clear .art-pic{background:repeating-conic-gradient(#565662 0 25%,#44444e 0 50%) 0 0/28px 28px}
/* art */
.art-set{display:grid;gap:16px;margin-top:20px}
.art-set[data-shape="wide"]{grid-template-columns:repeat(3,minmax(0,1fr))}
.art-set:not([data-shape="wide"]){grid-template-columns:repeat(var(--n),minmax(0,1fr))}
.art-pic{position:relative;border-radius:var(--P-radius-m);overflow:hidden;box-shadow:0 0 0 1px var(--P-surface-3)}
.art-pic img,.art-pic video{display:block;width:100%;height:100%}
.art-box .n-moving,.art-box.moving .n-still{display:none}
.art-box.moving .n-moving{display:inline}
.art-pic i{position:absolute;border:1.5px dashed var(--P-text);border-radius:6px;opacity:0;transition:opacity .15s;pointer-events:none}
.art-box.boxes .art-pic i{opacity:.9}
.art-box.light .art-pic i{border-color:var(--P-ink)}
.art figcaption{display:grid;gap:3px}
.art figcaption b{color:var(--P-text);font-size:14.5px}
.art .dl{display:flex;flex-wrap:wrap;gap:2px 12px;white-space:normal;margin-top:3px}
.art-strip{display:grid;grid-template-columns:repeat(var(--n),minmax(0,1fr));gap:12px}
.art-strip a{display:grid;gap:8px;text-decoration:none;color:var(--P-text-2);font-size:13px;font-weight:600}
.art-strip a:hover{color:var(--P-text)}
.art-strip img{width:100%;border-radius:var(--P-radius-s);box-shadow:0 0 0 1px var(--P-surface-3)}
/* tables */
.table{border-radius:var(--P-radius-m);background:var(--P-surface-1);padding:4px 10px;overflow-x:auto}
table{border-collapse:collapse;width:100%;font-size:14px}
th,td{text-align:left;padding:12px 14px;border-bottom:1px solid var(--P-surface-3);vertical-align:top;color:var(--P-text-2)}
tr:last-child td{border-bottom:0}
th{font-size:12.5px;color:var(--P-text-3);font-weight:600;white-space:nowrap}
td b{color:var(--P-text)}
td.mono{white-space:nowrap}
/* usage */
.pairs{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px}
.pairs .tile{min-height:150px;padding:24px}
.verdict{font-weight:700;color:var(--P-text-3)}
.verdict.do{color:var(--P-success)}.verdict.dont{color:var(--P-danger)}
/* rollout */
.ro-groups{columns:2;column-gap:16px}
.ro-group{border-radius:var(--P-radius-m);background:var(--P-surface-1);padding:22px;display:grid;gap:14px;break-inside:avoid;margin-bottom:16px}
.ro{display:grid;grid-template-columns:20px 1fr;gap:12px;align-items:start;cursor:pointer}
.ro input{width:18px;height:18px;margin:3px 0 0;accent-color:var(--P-accent)}
.ro > span{display:grid;gap:3px;font-size:14.5px}
.ro b{font-weight:600}
/* files */
details{border-radius:var(--P-radius-m);background:var(--P-surface-1);margin-bottom:10px}
summary{cursor:pointer;padding:16px 20px;font-weight:700;display:flex;justify-content:space-between;align-items:center;list-style:none}
summary::-webkit-details-marker{display:none}
summary .count{font-weight:600;font-size:13px;color:var(--P-text-3)}
.files{display:grid;grid-template-columns:repeat(auto-fill,minmax(168px,1fr));gap:14px;padding:4px 20px 22px}
.thumb{display:grid;place-items:center;height:112px;padding:16px;border-radius:var(--P-radius-s)}
.thumb.ink{background:var(--P-ink)}.thumb.paper{background:var(--P-paper)}
.thumb img{max-height:80px}
.fname{font-size:12.5px;color:var(--P-text-2);margin-top:8px;word-break:break-word;line-height:1.35}
.flinks{display:flex;gap:12px;font-size:12.5px;font-weight:700}
@media (max-width:1040px){
  html{scroll-padding-top:76px}
  .shell{grid-template-columns:1fr}
  .rail{position:sticky;top:0;height:auto;flex-direction:row;align-items:center;padding:12px 16px;background:var(--P-ink);z-index:5;gap:14px;box-shadow:0 1px 0 var(--P-surface-2)}
  .rail ul{display:flex;gap:4px;white-space:nowrap;align-items:center}
  .rail li a{padding:8px 12px}
  .controls{padding:16px}
  .seg .pill{padding:11px 14px}
  .ctl.end{margin-left:0}
  .rail .grp{padding:0 4px 0 14px;font-size:10.5px}
  main{padding:0 20px 100px}
  main > section{padding-top:36px}
  .hero,.split,.picker,.family{grid-template-columns:1fr}
  .ro-groups{columns:1}
  .motion{flex-direction:column}
  .motion figure{flex:none !important;width:100%}
  .motion figure:nth-child(2){max-width:300px}.motion figure:nth-child(3){max-width:420px}
  ul.facts.two{grid-template-columns:1fr}
  .hero .tile{min-height:280px}
  .family .wide{grid-row:auto}
  .g3,.g4,.accent-cards,.pairs,.own{grid-template-columns:repeat(2,minmax(0,1fr))}
  .art-set[data-shape="wide"]{grid-template-columns:repeat(2,minmax(0,1fr))}
  .art-set:not([data-shape="wide"]),.art-strip{grid-template-columns:repeat(3,minmax(0,1fr))}
  .swatches.ten{grid-template-columns:repeat(5,minmax(0,1fr))}
  .crs{grid-template-columns:1fr}
  .spec,.lw{grid-template-columns:1fr}
  .lw{font-size:20px}
  h2{margin-top:56px}
  ul.finder.wide li{grid-template-columns:1fr;gap:2px}
}
/* a long row of options that no longer fits on one line is set as an even grid, three across, then two */
@media (max-width:900px){.ctl.wide{width:100%}.ctl.wide .seg{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));width:100%}.ctl.wide .pill{justify-content:center}}
@media (max-width:560px){.g2,.g3,.g4,.accent-cards,.pairs,.own,.things,.art-set[data-shape="wide"]{grid-template-columns:1fr}.grid[style]{grid-template-columns:1fr !important}.art-set:not([data-shape="wide"]),.art-strip{grid-template-columns:repeat(2,minmax(0,1fr))}.ctl.wide .seg{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (prefers-reduced-motion:reduce){*{transition:none !important}}
`.replace(/--P-/g, `--${P}-`);

const favicon = (file(B0, 'favicon') || '').replace('/svg/', '/png/').replace('.svg', '-32.png');
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(B.name)} design system</title>
${has(favicon) ? `<link rel="icon" href="${favicon}">` : ''}
<link rel="stylesheet" href="tokens/${B.id}.css">
<style>${css}</style>
<noscript><style>main > section[hidden]{display:block !important}</style></noscript>
</head>
<body>
<div class="shell">
<nav class="rail" aria-label="Sections">
  <a class="logo" href="#start" aria-label="${esc(B.name)} design system, start">${img(file(B0, 'lockup-white') || file(B0, 'lockup'), B.name)}</a>
  <ul>${NAV.map(([group, items]) => `${group ? `<li class="grp">${group}</li>` : ''}${items.map(([id, label]) => `<li><a href="#${id}">${esc(label)}</a></li>`).join('')}`).join('')}</ul>
</nav>
<main>
${start}${BRANDS.map(brandView).join('')}${markViews}${colourView}${typeView}${motionView}${artView}${componentsView}${channelView}${webView}${itemsView}${usageView}${rolloutView}${checksView}${filesView}
</main>
</div>
<script>
(function () {
  var still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function press(group, b) { group.querySelectorAll('.pill').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); }); }

  // views: the address picks the view, or something inside one
  var views = [].slice.call(document.querySelectorAll('main > section[data-view]')), links = [].slice.call(document.querySelectorAll('.rail li a'));
  function go() {
    var id = decodeURIComponent(location.hash.slice(1)), el = (id && document.getElementById(id)) || views[0], view = el.closest('section[data-view]') || views[0];
    views.forEach(function (v) { v.hidden = v !== view; });
    links.forEach(function (a) { var on = a.getAttribute('href') === '#' + view.id; a.classList.toggle('on', on); if (on) { a.setAttribute('aria-current', 'page'); a.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'instant' }); } else a.removeAttribute('aria-current'); });
    document.title = view.dataset.title + ' | ' + ${JSON.stringify(B.name + ' design system')};
    if (el === view) scrollTo({ top: 0, behavior: 'instant' }); else el.scrollIntoView({ behavior: 'instant' });
  }
  addEventListener('hashchange', go); go();

  // every video plays while it is on screen
  var vids = [].slice.call(document.querySelectorAll('video'));
  function seen(v) { if (!v.offsetParent) return false; var b = v.getBoundingClientRect(); return b.bottom > 0 && b.top < innerHeight; }
  if (still) vids.forEach(function (v) { v.controls = true; });
  else {
    vids.forEach(function (v) { v.addEventListener('click', function () { if (v.paused) v.play().catch(function () {}); else v.pause(); }); });
    var mo = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) e.target.play().catch(function () {}); else e.target.pause(); }); }, { threshold: 0.2 });
    vids.forEach(function (v) { mo.observe(v); });
  }
  // animated logos: the switches pick the logo, the version, with or without the name, and the background
  document.querySelectorAll('.player').forEach(function (p) {
    var mine = [].slice.call(p.querySelectorAll('video'));
    function val(pick) { var b = p.querySelector('[data-pick="' + pick + '"] [aria-pressed="true"]'); return b ? b.dataset.v : null; }
    function show() {
      var lb = p.querySelector('[data-pick="logo"] [aria-pressed="true"]'), logo = lb ? lb.dataset.v : p.dataset.logo, mk = lb ? lb.dataset.mark : p.dataset.mark;
      var id = val('name') === '0' ? mk : logo, clear = val('back') === 'clear';
      p.classList.toggle('clear', clear);
      mine.forEach(function (v) {
        var name = id + '-' + val('variant') + '-' + v.dataset.fmt, src = clear ? 'motion/transparent/' + name + '.webm' : 'motion/' + name + '.mp4';
        v.closest('figure').querySelectorAll('.dl a').forEach(function (a) { a.href = a.dataset.k === 'mp4' ? 'motion/' + name + '.mp4' : 'motion/transparent/' + name + '.' + a.dataset.k; });
        if (v.getAttribute('src') === src) return;
        if (clear) v.removeAttribute('poster'); else v.poster = 'motion/' + name + '.png';
        v.src = src;
        if (!still && seen(v)) v.play().catch(function () {});
      });
    }
    p.querySelectorAll('.seg').forEach(function (g) { g.addEventListener('click', function (e) { var b = e.target.closest('.pill'); if (!b) return; press(g, b); show(); }); });
  });

  // art: the switches pick the brand, the shape, the tone, still or moving, the background, and whether the clear
  // area shows. A picture's files are named from its data-base: -light for the light tone, then the size, then
  // -clear for no background. Only one tone moves, so Moving and the other tone switch each other off
  var artBox = document.querySelector('.art-box'), MOVETONE = ${JSON.stringify(MOVETONE)};
  if (artBox) {
    function artPick(k) { var b = artBox.querySelector('[data-pick="' + k + '"] [aria-pressed="true"]'); return b ? b.dataset.v : ''; }
    function artPress(k, v) { var g = artBox.querySelector('[data-pick="' + k + '"]'); if (g) press(g, g.querySelector('[data-v="' + v + '"]')); }
    function artShow() {
      var brand = artPick('brand'), shape = artPick('shape'), clear = artPick('back') === 'clear', moving = artPick('mode') === 'moving', tone = artPick('tone') ? '-' + artPick('tone') : '', tail = clear ? '-clear' : '';
      artBox.classList.toggle('clear', clear);
      artBox.classList.toggle('boxes', artPick('area') === 'on');
      artBox.classList.toggle('moving', moving);
      artBox.classList.toggle('light', !!tone && !clear);
      artBox.querySelectorAll('.art-set').forEach(function (s) {
        var on = s.dataset.brand === brand && s.dataset.shape === shape, sizes = s.dataset.sizes.split(','), size = sizes[0].replace(/ /g, '');
        s.hidden = !on;
        s.querySelectorAll('.art').forEach(function (f) {
          var base = f.dataset.base, pic = f.querySelector('.art-pic'), im = pic.querySelector('img'), v = pic.querySelector('video'), film = base + tone + '-' + size + (clear ? '-clear.webm' : '.mp4');
          if (v && !(on && moving)) { v.remove(); v = null; }
          im.hidden = on && moving;
          if (!on) return;
          if (moving) {
            if (!v) { v = document.createElement('video'); v.muted = v.loop = v.playsInline = true; v.autoplay = !still; v.controls = still; pic.insertBefore(v, im); }
            if (v.getAttribute('src') !== film) v.src = film;
            f.querySelector('.dl').innerHTML = '<a href="' + film + '" download>' + (clear ? 'WebM ' : 'MP4 ') + sizes[0] + '</a>';
          } else {
            im.src = base + tone + tail + '.svg';
            f.querySelector('.dl').innerHTML = sizes.map(function (z) { return '<a href="' + base + tone + '-' + z.replace(/ /g, '') + tail + '.png" download>PNG ' + z + '</a>'; }).join('') + '<a href="' + base + tone + tail + '.svg" download>SVG</a>';
          }
        });
      });
    }
    artBox.querySelectorAll('.seg').forEach(function (g) { g.addEventListener('click', function (e) {
      var b = e.target.closest('.pill'); if (!b) return;
      press(g, b);
      if (g.dataset.pick === 'mode' && b.dataset.v === 'moving') artPress('tone', MOVETONE);
      if (g.dataset.pick === 'tone' && b.dataset.v !== MOVETONE) artPress('mode', 'still');
      artShow();
    }); });
    // a link to #art-<brand> opens the Art page with that brand picked
    function artLink() { var b = /^#art-/.test(location.hash) && document.getElementById(location.hash.slice(1)); if (b && b.classList.contains('pill')) { press(b.parentNode, b); artShow(); } }
    addEventListener('hashchange', artLink); artLink();
    // a light brand's art opens on its light tone
    if (artPick('tone')) artShow();
  }

  // try a colour
  var stage = document.getElementById('stage');
  if (stage) {
    var PRESETS = ${JSON.stringify(PRESETS)};
    var MARK = ${JSON.stringify(picker ? { parts: picker.order.map(p => ({ d: p.d, accent: !!p.accent })), vb: picker.bounds.map(v => r(v)), axis: picker.AXIS_ATTR, id: picker.id } : null)};
    var BG = { ink: '${INK}', surface: '${NEUTRALS['surface-1']}', paper: '${WHITE}' };
    var inputs = ['s1', 's2', 's3'].map(function (id) { return document.getElementById(id); }), readout = document.getElementById('readout');
    function lum(h) { var v = [1, 3, 5].map(function (i) { return parseInt(h.slice(i, i + 2), 16) / 255; }).map(function (c) { return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; }
    function ratio(a, b) { var l = [lum(a), lum(b)].sort(function (x, y) { return y - x; }); return (l[0] + 0.05) / (l[1] + 0.05); }
    var current = PRESETS[0].k;
    function apply(stops, key) {
      stops.forEach(function (c, i) { stage.style.setProperty('--${P}-accent-' + (i + 1), c); inputs[i].value = c.toLowerCase(); });
      current = key;
      document.querySelectorAll('.picker .presets .pill').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.k === key)); });
      var bg = BG[stage.dataset.bg], rs = stops.map(function (c) { return ratio(c, bg); }), strong = Math.max.apply(null, rs), weak = Math.min.apply(null, rs);
      readout.innerHTML = 'Against this background the strongest stop is <b>' + strong.toFixed(1) + ':1</b> and the weakest <b>' + weak.toFixed(1) + ':1</b>. ' + (strong >= 3 && weak >= 1.5 ? 'Readable.' : 'Too close to the background. Change the stops or use the flat mark.');
    }
    function stops() { return inputs.map(function (i) { return i.value; }); }
    function forBg(p) { return stage.dataset.bg === 'paper' && p.light ? p.light : p.stops; }
    var box = document.getElementById('presets'), examples = document.getElementById('examples');
    PRESETS.forEach(function (p) { var b = document.createElement('button'); b.className = 'pill'; b.dataset.k = p.k; b.innerHTML = '<i style="background:linear-gradient(120deg,' + p.stops.join(',') + ')"></i>' + p.label; b.addEventListener('click', function () { apply(forBg(p), p.k); }); (p.brand ? box : examples).appendChild(b); });
    inputs.forEach(function (i) { i.addEventListener('input', function () { apply(stops(), 'custom'); }); });
    document.querySelectorAll('#bgs .pill').forEach(function (b) { b.addEventListener('click', function () { stage.dataset.bg = b.dataset.bg; press(document.getElementById('bgs'), b); var p = PRESETS.filter(function (q) { return q.k === current; })[0]; apply(p ? forBg(p) : stops(), current); }); });
    function svgText() {
      var s = stops(), body = stage.dataset.bg === 'paper' ? '${INK}' : '#FFFFFF';
      return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + MARK.vb.join(' ') + '"><defs><linearGradient id="accent" gradientUnits="userSpaceOnUse" ' + MARK.axis + '><stop offset="0" stop-color="' + s[0] + '"/><stop offset=".5" stop-color="' + s[1] + '"/><stop offset="1" stop-color="' + s[2] + '"/></linearGradient></defs>' + MARK.parts.map(function (p) { return '<path fill="' + (p.accent ? 'url(#accent)' : body) + '" d="' + p.d + '"/>'; }).join('') + '</svg>';
    }
    var copy = document.getElementById('copy');
    copy.addEventListener('click', function () { navigator.clipboard.writeText(svgText()).then(function () { copy.textContent = 'Copied'; }, function () { copy.textContent = 'Copy blocked'; }).then(function () { setTimeout(function () { copy.textContent = 'Copy SVG'; }, 1600); }); });
    document.getElementById('dl').addEventListener('click', function () { var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([svgText()], { type: 'image/svg+xml' })); a.download = MARK.id + '-mark-' + current + '.svg'; a.click(); URL.revokeObjectURL(a.href); });
    apply(PRESETS[0].stops, PRESETS[0].k);
  }

  var comp = document.getElementById('comp');
  document.querySelectorAll('#compAccent .pill').forEach(function (b) { b.addEventListener('click', function () { comp.setAttribute('data-${P}-accent', b.dataset.accent); press(document.getElementById('compAccent'), b); }); });

  document.querySelectorAll('[data-ro]').forEach(function (c) { var k = '${B.id}-rollout-' + c.dataset.ro; try { c.checked = localStorage.getItem(k) === '1'; } catch (e) {} c.addEventListener('change', function () { try { localStorage.setItem(k, c.checked ? '1' : '0'); } catch (e) {} }); });
})();
</script>
</body>
</html>
`;
for (const w of B.page.banned || []) if (new RegExp(w, 'i').test(html)) throw new Error(`the page holds "${w}", which the settings ask to keep out ("page.banned")`);
S.put('review.html', html);
console.log(`review.html written (${(html.length / 1024).toFixed(0)} KB), ${NAV.reduce((n, g) => n + g[1].length, 0)} views, ${svgCount} svg / ${pngCount} png indexed${built.length ? `, type: ${fam.name}` : ''}${MOTION ? `, motion ${motionReady ? 'ready' : `${MOTION.made} of ${MOTION.of}`}` : ''}${ART ? `, art ${artPictures} pictures${artMoving ? ', moving' : ''}` : ''}`);
