// Reads a brand folder's settings (brand/brand.json), fills in everything they leave out and checks what they say.
// A settings file can be as short as a name, one mark and one colour: the rest has a default, written out here.
const fs = require('fs'), path = require('path');

const slug = s => String(s).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const isHex = c => typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c);
const fail = msg => { throw new Error('brand.json: ' + msg); };

// ---- colour. Lightness is changed in OKLab, where a step looks the same size in every hue.
const lin = c => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4, gam = c => c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
function toLab(hex) {
  const [r, g, b] = [1, 3, 5].map(i => lin(parseInt(hex.slice(i, i + 2), 16) / 255));
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b), m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b), s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}
function toHex([L, a, b]) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3, m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3, s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const rgb = [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
  return '#' + rgb.map(c => Math.round(Math.max(0, Math.min(1, gam(c))) * 255).toString(16).padStart(2, '0')).join('').toUpperCase();
}
// WCAG contrast ratio between two hex colours
function contrast(a, b) {
  const lum = h => { const v = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(c => c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; };
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}
const mix = (a, b, k = 0.5) => { const p = toLab(a), q = toLab(b); return toHex(p.map((v, i) => v + (q[i] - v) * k)); };
// the same colour made darker, a step at a time, until it stands `ratio` to 1 against `on`
function deepen(hex, ratio, on) {
  const lab = toLab(hex);
  for (let i = 0; i < 80 && contrast(toHex(lab), on) < ratio; i++) { lab[0] -= 0.01; lab[1] *= 0.995; lab[2] *= 0.995; }
  return toHex(lab);
}

// ---- defaults
const NEUTRALS = { 'surface-1': '#13131A', 'surface-2': '#1B1B24', 'surface-3': '#262631', line: '#30303C', 'text-3': '#7C7C8A', 'text-2': '#B4B4C0', text: '#F4F4F6', 'paper-2': '#F4F4F1' };
const PAPER = { 'paper-3': '#E8E8E4', 'paper-line': '#D3D3D9', 'paper-soft': '#A7A7B3' };
const SEMANTIC = { success: '#2BD67B', danger: '#FF4D4D', info: '#3EA0FF' };
const SHAPES = [
  { id: 'wide', label: 'Wide', w: 3840, h: 2160, use: 'Videos, end cards, streams, desktops' },
  { id: 'tall', label: 'Tall', w: 2160, h: 3840, use: 'Shorts, reels, stories, phones' },
  { id: 'square', label: 'Square', w: 2160, h: 2160, use: 'Posts' },
];
const TOKENS = {
  radius: { s: '8px', m: '14px', l: '22px', pill: '999px' },
  space: ['4px', '8px', '12px', '16px', '24px', '32px', '48px', '72px'],
};

function accent(key, a, colours) {
  if (typeof a === 'string' || Array.isArray(a)) a = { stops: a };
  let stops = [].concat(a.stops || a.solid || []);
  if (!stops.length || !stops.every(isHex)) fail(`accent "${key}" needs one to three colours such as "#FF7A00" in "stops"`);
  if (stops.length === 1) stops = [stops[0], stops[0], stops[0]];
  if (stops.length === 2) stops = [stops[0], mix(stops[0], stops[1]), stops[1]];
  if (stops.length !== 3) fail(`accent "${key}" has ${stops.length} stops: give one, two or three`);
  const solid = a.solid || stops[1], white = colours.white, ink = colours.ink;
  // on paper the pale end of an accent fades out, so the stops are deepened together until the strongest reads
  let light = a.stopsLight;
  if (!light) { light = stops.slice(); for (let i = 0; i < 60 && Math.max(...light.map(c => contrast(c, white))) < 3.2; i++) light = light.map(c => { const l = toLab(c); l[0] -= 0.01; return toHex(l); }); }
  return {
    label: a.label || key[0].toUpperCase() + key.slice(1), use: a.use || '', stops: stops.map(c => c.toUpperCase()), stopsLight: light.map(c => c.toUpperCase()), solid: solid.toUpperCase(),
    onLight: (a.onLight || deepen(solid, 3.2, white)).toUpperCase(),
    onAccent: a.onAccent === 'white' ? white : a.onAccent === 'ink' ? ink : a.onAccent || (contrast(ink, solid) >= contrast(white, solid) ? ink : white),
  };
}

// one object laid over another: lists are replaced whole, objects are merged key by key
function over(base, top) {
  if (top === undefined) return base;
  if (!base || !top || typeof base !== 'object' || typeof top !== 'object' || Array.isArray(base) || Array.isArray(top)) return top;
  const out = { ...base };
  for (const k of Object.keys(top)) out[k] = over(base[k], top[k]);
  return out;
}

// dir: the brand folder (it holds brand/brand.json). overlays: files or objects laid over the settings, for trying an option
function load(dir, overlays = []) {
  const file = path.join(dir, 'brand', 'brand.json');
  if (!fs.existsSync(file)) throw new Error(`no settings at ${file}. Start a brand folder with: run.js init <folder>`);
  let raw;
  try { raw = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { fail(`not valid JSON (${e.message})`); }
  for (const o of overlays) raw = over(raw, typeof o === 'string' ? JSON.parse(fs.readFileSync(o, 'utf8')) : o);
  if (!raw.name) fail('"name" is missing: the name of the brand, as it is written');

  const B = { ...raw };
  B.id = raw.id || slug(raw.name);
  if (!/^[a-z0-9][a-z0-9-]*$/.test(B.id)) fail(`"id" must be lower-case letters, digits and hyphens: ${B.id}`);
  const caps = raw.name.replace(/[^A-Z]/g, '');
  B.prefix = raw.prefix || (caps.length >= 2 ? caps.slice(0, 3) : B.id.replace(/-/g, '').slice(0, 2)).toLowerCase();
  if (!/^[a-z][a-z0-9]*$/.test(B.prefix)) fail(`"prefix" starts the names of the CSS variables, so it must be letters and digits: ${B.prefix}`);
  B.tone = raw.tone || 'dark';
  if (!['dark', 'light'].includes(B.tone)) fail('"tone" is "dark" or "light": the surface the brand is at home on');
  B.url = raw.url || '';
  B.year = raw.year || new Date().getFullYear();

  // colours
  const c = raw.colours || raw.colors || {};
  const ink = c.ink || '#0C0C0E', white = c.white || '#FFFFFF';
  for (const [k, v] of Object.entries({ ink, white, ...c.neutrals, ...c.paper, ...c.semantic })) if (!isHex(v)) fail(`colour "${k}" is not a six-digit hex colour: ${v}`);
  B.colours = { ink: ink.toUpperCase(), white: white.toUpperCase() };
  B.colours.neutrals = { ink: B.colours.ink, ...NEUTRALS, ...(c.neutrals || {}), paper: B.colours.white };
  B.colours.paper = { ...PAPER, ...(c.paper || {}) };
  B.colours.semantic = { ...SEMANTIC, ...(c.semantic || {}) };
  B.colours.accents = {};
  for (const [k, a] of Object.entries(c.accents || {})) {
    if (!/^[a-z][a-z0-9]*$/.test(k)) fail(`an accent's key is used in file names, so it must be lower-case letters and digits: "${k}"`);
    if (['black', 'white', 'color', 'colour'].includes(k)) fail(`"${k}" cannot be an accent's key: it names a colourway already`);
    B.colours.accents[k] = accent(k, a, B.colours);
  }
  const accents = Object.keys(B.colours.accents);

  // marks, and the brands that wear each one
  if (!Array.isArray(raw.marks) || !raw.marks.length) fail('"marks" is missing: a list with at least one mark, each with the brands that use it');
  const seen = new Set();
  B.marks = raw.marks.map((m, mi) => {
    const mark = { ...m, id: m.id || (mi === 0 ? B.id : fail(`mark ${mi + 1} needs an "id"`)), kind: m.kind || 'parts', file: m.file || 'mark.svg' };
    mark.label = m.label || 'The mark';
    mark.geometry = m.geometry || mark.file.replace(/\.svg$/i, '') + '.json';
    if (!Array.isArray(m.brands) || !m.brands.length) fail(`mark "${mark.id}" has no "brands": list at least one, with the word that is written beside the mark`);
    mark.brands = m.brands.map((b, bi) => {
      if (!b.word) fail(`brand ${bi + 1} of mark "${mark.id}" has no "word": the name as it is written in the logo`);
      const desc = b.desc || null, label = b.label || (desc ? `${b.word} ${desc[0].toUpperCase()}${desc.slice(1).toLowerCase()}` : b.word);
      const id = b.id || slug(label);
      if (seen.has(id)) fail(`two brands share the id "${id}": give one of them its own "id"`);
      seen.add(id);
      // a brand takes the first accent unless it names one, or names none with "accent": null
      const acc = b.accent === undefined ? accents[0] || null : b.accent;
      if (acc && !B.colours.accents[acc]) fail(`brand "${id}" names the accent "${acc}", which "colours.accents" does not have`);
      const tail = b.tail || 0;
      if (tail < 0 || tail >= [...b.word].length) fail(`brand "${id}": "tail" is how many of the word's last letters take the accent, so it must be less than the word's length`);
      return { ...b, id, label, word: b.word, desc, tail, accent: acc, dir: b.dir || (mi === 0 && bi === 0 ? 'lockup' : `lockup-${id}`), motion: b.motion !== false };
    });
    return mark;
  });
  for (const [k, a] of Object.entries(B.colours.accents)) if (!a.use) a.use = B.marks.flatMap(m => m.brands).filter(b => b.accent === k).map(b => b.label).join(' and ');

  // type
  const t = raw.type || {};
  B.type = {
    wordmark: { font: 'family:ExtraBold', tracking: -0.03, size: 200, cap: 'H', ...(t.wordmark || {}) },
    descriptor: { font: 'family:SemiBold', tracking: 0.42, scale: 0.32, cap: 'H', ...(t.descriptor || {}) },
    family: t.family || null,
    weights: { heading: 700, label: 600, body: 500, ...(t.weights || {}) },
    tracking: { hero: '-0.02em', label: '0.14em', ...(t.tracking || {}) },
    fallback: t.fallback || '"Segoe UI", system-ui, sans-serif',
  };
  if (B.type.family) {
    const f = B.type.family;
    if (!f.name) fail('"type.family" needs a "name": what the brand\'s own font family is called');
    if (!Array.isArray(f.sources) || !f.sources.length) fail('"type.family.sources" is missing: the open-licensed fonts the family is built from');
    for (const s of f.sources) if (!s.file) fail('every source in "type.family.sources" needs a "file"');
    B.type.family = { version: '1.000', vendor: B.id.replace(/-/g, '').slice(0, 4).toUpperCase().padEnd(4, ' '), own: ['marks', 'star', 'check', 'cross'], ...f };
  }

  B.art = { shapes: SHAPES, sizes: [1, 0.5], ...(raw.art || {}) };
  B.motion = { fps: 60, formats: [[1920, 1080], [1080, 1920], [1080, 1080]], variants: ['intro', 'loop'], ...(raw.motion || {}) };
  B.tokens = { ...TOKENS, ...(raw.tokens || {}) };
  B.rollout = raw.rollout || [];
  B.platforms = raw.platforms || {};
  B.about = raw.about || {};
  B.page = raw.page || {};
  return B;
}

module.exports = { load, over, slug, contrast, mix, deepen, toLab, toHex };
