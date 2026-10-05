// Logos: every logo file of the brand as SVG and PNG, and the design tokens (colours, type and sizes as code).
// For each mark: the mark alone, square icons, profile pictures and favicons in every colourway, then a horizontal
// and a stacked lockup for each brand that wears it.
// usage: node run.js logos <brand folder> [--marks]     --marks makes the mark's own files only, which need no font
const fs = require('fs'), path = require('path');
const S = require('../lib/system').open();
const { launch, svgPngs } = require('../lib/browser');
const { ACCENTS, brand: B, OUT } = S, P = B.prefix;

const svgs = {};   // path under the output folder -> svg text
const pngs = [];   // { src: svg text, out: path of the png, width }
const toPng = rel => rel.replace('/svg/', '/png/').replace(/\.svg$/, '.png');

for (const m of S.marks) {
  const at = `logos/${m.id}`;
  const api = {
    add: (rel, svg, width) => { svgs[`${at}/svg/${rel}`] = svg; if (width) pngs.push({ src: svg, out: toPng(`${at}/svg/${rel}`), width }); },
    raw: (rel, svg) => { svgs[`${at}/svg/${rel}`] = svg; },
    png: (svg, rel, width) => pngs.push({ src: svg, out: `${at}/png/${rel}`, width }),
  };
  m.stills(api);
  // --marks: the mark's own files only. They need no font, so they can be made before the name's type is chosen
  if (!S.args.marks) for (const b of m.brands) for (const name of m.lockupNames(b)) {
    const s = m.lockupScheme(name), l = S.lockups((x, y, w) => m.draw(s.mark, x, y, w), m.aspect, b.word, b.desc, s, b.tail);
    api.add(`${b.dir}/${b.id}-horizontal-${name}.svg`, l.horizontal, 2400);
    api.add(`${b.dir}/${b.id}-stacked-${name}.svg`, l.stacked, 1600);
  }
}

// ================================== tokens ==================================
// what the fonts step built, if it has run: the general family and, where the brand has one, the font for titles
const FONT = S.read('fonts'), fam = B.type.family, hero = FONT && FONT.display, keys = Object.keys(ACCENTS), k0 = keys[0];
const scripts = FONT ? FONT.sources.map(s => s.script[0].toUpperCase() + s.script.slice(1)) : [], both = scripts.join(' and ');
const general = fam ? `"${fam.name}", ${B.type.fallback}` : B.type.fallback;
const point = k => `--${P}-accent-1: var(--${P}-${k}-1); --${P}-accent-2: var(--${P}-${k}-2); --${P}-accent-3: var(--${P}-${k}-3); --${P}-accent: var(--${P}-${k}); --${P}-on-accent: var(--${P}-on-${k}); --${P}-accent-gradient: var(--${P}-${k}-gradient);`;
const css = [
  `/* ${B.name} design tokens. Made from brand/brand.json: change that file, not this one. */`,
  ':root {',
  ...Object.entries(S.NEUTRALS).map(([k, v]) => `  --${P}-${k}: ${v};`),
  '  /* on paper, for the rare light surface: a quiet fill, a quiet line, a soft line */',
  ...Object.entries(S.PAPER).map(([k, v]) => `  --${P}-${k}: ${v};`),
  ...Object.entries(ACCENTS).flatMap(([k, a]) => [
    ...a.stops.map((c, i) => `  --${P}-${k}-${i + 1}: ${c};`),
    ...a.stopsLight.map((c, i) => `  --${P}-${k}-paper-${i + 1}: ${c};`),
    `  --${P}-${k}: ${a.solid};`, `  --${P}-${k}-on-light: ${a.onLight};`, `  --${P}-on-${k}: ${a.onAccent};`,
    `  --${P}-${k}-gradient: linear-gradient(120deg, ${a.stops.join(', ')});`]),
  ...Object.entries(S.SEMANTIC).map(([k, v]) => `  --${P}-${k}: ${v};`),
  ...(k0 ? [`  /* the accent in use: point these at one family (${k0} by default) */`, ...point(k0).split(` --${P}-accent: `).map((l, i) => i ? `  --${P}-accent: ${l}` : '  ' + l)]
    : [`  --${P}-accent: var(--${P}-text); --${P}-on-accent: var(--${P}-ink);`]),
  ...(hero ? [`  /* two fonts${scripts.length > 1 ? `, each one family for ${both}` : ''}: the hero font for the title, the general font for the rest.`,
    `     Load fonts/${hero.file}.woff2 and the weights you need from fonts/${fam.stem}-*.woff2 */`,
    `  --${P}-font-hero: "${hero.family}", ${general};`]
    : fam ? [`  /* one font family${scripts.length > 1 ? ` for ${both}` : ''}. Load the weights you need from fonts/${fam.stem}-*.woff2 */`, `  --${P}-font-hero: ${general};`] : [`  --${P}-font-hero: ${general};`]),
  `  --${P}-font: ${general};`,
  ...(scripts.length > 1 ? ['  ' + scripts.map(s => `--${P}-font-${s.toLowerCase()}: var(--${P}-font);`).join(' ')] : []),
  `  --${P}-weight-hero: ${hero ? hero.weight : B.type.weights.hero || 800}; --${P}-weight-heading: ${B.type.weights.heading}; --${P}-weight-label: ${B.type.weights.label}; --${P}-weight-body: ${B.type.weights.body};`,
  `  --${P}-track-hero: ${B.type.tracking.hero}; --${P}-track-label: ${B.type.tracking.label};`,
  '  ' + Object.entries(B.tokens.radius).map(([k, v]) => `--${P}-radius-${k}: ${v};`).join(' '),
  '  ' + B.tokens.space.map((v, i) => `--${P}-space-${i + 1}: ${v};`).join(' '),
  '}',
  ...keys.slice(1).map(k => `[data-${P}-accent="${k}"] { ${point(k)} }`),
  ''].join('\n');
const tokens = {
  color: { neutral: S.NEUTRALS, paper: S.PAPER, semantic: S.SEMANTIC, accent: ACCENTS },
  type: {
    ...(hero ? { hero: { family: `${hero.family} (SIL OFL 1.1), for titles: ${hero.from} with its dots as ${hero.lean === 0 ? 'diamonds' : hero.lean === 45 ? 'upright squares' : `squares leaning ${hero.lean} degrees`}`, files: `fonts/${hero.file}.ttf and .woff2` } } : {}),
    ...(FONT ? { general: { family: `${fam.name} (SIL OFL 1.1), ${scripts.length > 1 ? `one family for ${both}, built from ${FONT.sources.map(s => `${s.name} (${s.script[0].toUpperCase() + s.script.slice(1)})`).join(' and ')}` : `built from ${FONT.sources[0].name}`}`, files: `fonts/${fam.stem}-<Weight>.ttf and .woff2` } } : {}),
    weights: { ...(hero ? { hero: hero.weight } : {}), ...B.type.weights }, tracking: B.type.tracking,
  },
  logo: {},
};
// what each mark adds: its own colours, its smallest sizes
for (const m of S.marks) { const t = m.tokens ? m.tokens() : {}; Object.assign(tokens.color, t.color || {}); tokens.logo = S.marks.length > 1 ? { ...tokens.logo, [m.id]: t.logo || {} } : t.logo || {}; }
if (B.tokens.logo) tokens.logo = B.tokens.logo;

(async () => {
  for (const [rel, svg] of Object.entries(svgs)) S.put(rel, svg);
  S.put(`tokens/${B.id}.css`, css);
  S.put(`tokens/${B.id}.tokens.json`, JSON.stringify(tokens, null, 2) + '\n');
  const browser = await launch();
  await svgPngs(browser, pngs, OUT);
  await browser.close();
  console.log(`${Object.keys(svgs).length} svg, ${pngs.length} png, tokens -> ${OUT}${S.args.marks ? ' (the mark alone: no lockups were made)' : ''}`);
})().catch(e => { console.error(e.message); process.exit(1); });
