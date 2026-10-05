// Shared definitions for one brand folder: its settings, its colours, the fonts its name is set in, the lockup
// layout and the SVG helpers every step uses. A step starts with `const S = require('../lib/system').open()`.
const fs = require('fs'), path = require('path');
const brand = require('./brand');

// <brand folder> [more words] [--out <folder>] [--with <settings laid over brand.json>] [--flags]
function parse(argv) {
  const a = { dir: null, rest: [], with: [], out: null };
  for (let i = 0; i < argv.length; i++) {
    const v = argv[i];
    // --with file and --with=file both work, and so do --out folder and --out=folder
    if (v === '--with') a.with.push(argv[++i]);
    else if (v.startsWith('--with=')) a.with.push(v.slice(7));
    else if (v === '--out') a.out = argv[++i];
    else if (v.startsWith('--')) { const at = v.indexOf('='), k = at < 0 ? v.slice(2) : v.slice(2, at); a[k] = at < 0 ? true : v.slice(at + 1); }
    else if (!a.dir) a.dir = v;
    else a.rest.push(v);
  }
  return a;
}

// A step that cannot go on says why in one plain line and stops: wrong settings are the commonest reason, and a
// stack of the engine's own lines helps nobody. BRAND_SYSTEM_DEBUG=1 shows the whole error.
if (!process.env.BRAND_SYSTEM_DEBUG) for (const kind of ['uncaughtException', 'unhandledRejection']) process.on(kind, e => { console.error(e && e.message ? e.message : String(e)); process.exit(1); });
function open(argv = process.argv.slice(2)) {
  if (process.env.BRAND_SYSTEM_DEBUG) return build(argv);
  try { return build(argv); } catch (e) { console.error(e.message); process.exit(1); }
}
const inside = (root, file) => path.resolve(file) === path.resolve(root) || path.resolve(file).startsWith(path.resolve(root) + path.sep);
// A path given after the brand folder (--out, --with) is taken from the brand folder, wherever the command is run
// from: `--out options/type/a` is that brand's options/type/a. A settings file that is not there is looked for from here
const from = (dir, f) => path.isAbsolute(f) ? f : path.resolve(dir, f);
const settings = (dir, f) => !path.isAbsolute(f) && !fs.existsSync(path.resolve(dir, f)) && fs.existsSync(path.resolve(f)) ? path.resolve(f) : from(dir, f);

function build(argv) {
  const args = parse(argv);
  if (!args.dir) throw new Error('give the brand folder: the one that holds brand/brand.json');
  const dir = path.resolve(args.dir), B = brand.load(dir, args.with.map(f => settings(dir, f)));
  // everything a step makes goes into final/. Its own notes (what the page reads back) go into .build/
  const OUT = args.out ? from(dir, args.out) : path.join(dir, 'final'), BUILD = args.out ? path.join(OUT, '.build') : path.join(dir, '.build');
  const { ink: INK, white: WHITE, accents: ACCENTS, neutrals: NEUTRALS, paper: PAPER, semantic: SEMANTIC } = B.colours;

  const r = (v, d = 2) => +(+v).toFixed(d);
  const stopsSvg = s => s.map((c, i) => `<stop offset="${r(i / (s.length - 1), 3)}" stop-color="${c}"/>`).join('');

  // ---- type: the name beside the mark is set in a font file and turned into outlines, so a logo needs no font
  const fontFile = spec => {
    if (!/^family:/.test(spec)) return path.resolve(dir, 'brand', spec);
    if (!B.type.family) throw new Error(`"${spec}" asks for a weight of the brand's own font family, but "type.family" is not set: name a font file instead, or set the family and run the fonts step`);
    const name = `${B.type.family.stem}-${spec.slice(7)}.ttf`, found = [path.join(OUT, 'fonts', name), path.join(dir, 'final', 'fonts', name)].find(f => fs.existsSync(f));
    if (!found) {
      // the family is built, but its source does not reach that weight: many open fonts stop at Bold
      const notes = [note('fonts'), path.join(dir, '.build', 'fonts.json')].find(f => fs.existsSync(f)), has = notes ? JSON.parse(fs.readFileSync(notes, 'utf8')).weights.map(w => w[1]) : null, style = spec.slice(7);
      throw new Error(has && !has.includes(style) ? `the name is set in the ${style} weight, which ${B.type.family.name} does not have: its source gives ${has[0]} to ${has[has.length - 1]}. Under "type", give "wordmark" (and "descriptor") a "font" such as "family:${has[has.length - 1]}"` : `the name is set in ${name}, which is not built yet: run the fonts step first`);
    }
    return found;
  };
  const loadFont = spec => { const b = fs.readFileSync(fontFile(spec)); return require('opentype.js').parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)); };
  const held = {};
  const FONTS = { get word() { return held.word || (held.word = loadFont(B.type.wordmark.font)); }, get desc() { return held.desc || (held.desc = loadFont(B.type.descriptor.font)); } };
  // any weight of the brand's own family (the nearest one it has), for words set on a card or a label. A brand with
  // no family of its own sets them in the font of its name
  const NINE = [[100, 'Thin'], [200, 'ExtraLight'], [300, 'Light'], [400, 'Regular'], [500, 'Medium'], [600, 'SemiBold'], [700, 'Bold'], [800, 'ExtraBold'], [900, 'Black']];
  const font = weight => {
    if (!B.type.family) return FONTS.word;
    const notes = [note('fonts'), path.join(dir, '.build', 'fonts.json')].find(f => fs.existsSync(f)), has = notes ? JSON.parse(fs.readFileSync(notes, 'utf8')).weights : NINE;
    const [, style] = has.reduce((a, b) => Math.abs(b[0] - weight) < Math.abs(a[0] - weight) ? b : a);
    return held[style] || (held[style] = loadFont(`family:${style}`));
  };
  // opentype.js's own toPathData() emits NaN for some coordinates, so the commands are serialised here
  function pathData(p, d = 2) {
    const n = v => +v.toFixed(d);
    return p.commands.map(c => c.type === 'Z' ? 'Z' : c.type === 'C' ? `C${n(c.x1)} ${n(c.y1)} ${n(c.x2)} ${n(c.y2)} ${n(c.x)} ${n(c.y)}` : c.type === 'Q' ? `Q${n(c.x1)} ${n(c.y1)} ${n(c.x)} ${n(c.y)}` : `${c.type}${n(c.x)} ${n(c.y)}`).join('');
  }
  // A word is laid out one glyph to a character, with the font's own kerning. opentype.js's own shaping is kept
  // out of it: it applies a font's ligature and composition rules and stops at kinds of rule it cannot read, which
  // many typefaces have, so a name with an "fi" in it or a typeface with richer rules would end the step. A logo's
  // lettering is tracked, and tracked type takes no ligatures anyway. Scripts that are written right to left or
  // whose letters join or stack (Arabic, Hebrew, Thai and others) cannot be set that way: they go through the
  // library's shaping, and say so plainly if the font is beyond it.
  const SIMPLE = /^[\u0000-\u058F\u1E00-\u1FFF\u2000-\u2BFF\uE000-\uF8FF]*$/;
  const laid = (font, how, text, size, tracking) => {
    const o = { kerning: true, letterSpacing: tracking };
    if (!SIMPLE.test(text)) {
      try { return font[how](text, 0, 0, size, o); }
      catch (e) { throw new Error(`"${text}" cannot be set in this font: its rules for joining letters are of a kind the engine cannot read (${e.message}). Set the name in another typeface`); }
    }
    const shaping = font.stringToGlyphs, notdef = font.glyphs.get(0);
    font.stringToGlyphs = s => [...s].map(ch => font.glyphs.get(font.charToGlyphIndex(ch)) || notdef);
    try { return font[how](text, 0, 0, size, o); } finally { font.stringToGlyphs = shaping; }
  };
  // text converted to outlines; baseline at y = 0
  function outline(font, text, size, tracking = 0) {
    const p = laid(font, 'getPath', text, size, tracking);
    const b = p.getBoundingBox();
    return { d: pathData(p), x1: b.x1, x2: b.x2, y1: b.y1, y2: b.y2, w: b.x2 - b.x1 };
  }
  // the same text as separate glyph outlines, laid out exactly as outline() lays them out (motion: letters arrive one by one)
  function glyphs(font, text, size, tracking = 0) {
    const list = laid(font, 'getPaths', text, size, tracking).map(p => pathData(p)).filter(Boolean);
    if (list.join('') !== outline(font, text, size, tracking).d) throw new Error('glyph outlines do not add up to the word outline: ' + text);
    return list;
  }
  const SIZE = B.type.wordmark.size;                       // wordmark size in lockup units
  const WORD_TRACK = B.type.wordmark.tracking, DESC_TRACK = B.type.descriptor.tracking, DESC_SCALE = B.type.descriptor.scale;
  const cap = () => held.cap || (held.cap = -outline(FONTS.word, B.type.wordmark.cap, SIZE).y1);   // cap height of the wordmark

  // wordmark with an optional tracked descriptor under it. wordAt / descAt give the translation of each outline
  // when the block's top left corner is at x, y (the lockups and the animated logos both place the text with them).
  // tail: how many of the word's last letters take the accent colour where there is one
  function textBlock(wordText, desc, tail = 0) {
    const CAP = cap(), word = outline(FONTS.word, wordText, SIZE, WORD_TRACK), parts = tail ? glyphs(FONTS.word, wordText, SIZE, WORD_TRACK) : null;
    const wordAt = (x, y) => [x - word.x1, y + CAP];
    const wordSvg = (s, x, y) => {
      const [tx, ty] = wordAt(x, y), at = `transform="translate(${r(tx)} ${r(ty)})"`;
      if (!tail || s.desc === s.text) return `<path fill="${s.text}" ${at} d="${word.d}"/>`;
      return `<path fill="${s.text}" ${at} d="${parts.slice(0, -tail).join('')}"/><path fill="${s.desc}" ${at} d="${parts.slice(-tail).join('')}"/>`;
    };
    if (!desc) return { w: word.w, h: CAP, svg: wordSvg, word, wordAt, wordText, tail };
    const dSize = SIZE * DESC_SCALE;
    const d = outline(FONTS.desc, desc, dSize, DESC_TRACK);
    const dCap = -outline(FONTS.desc, B.type.descriptor.cap, dSize).y1, gap = CAP * 0.34;
    const descAt = (x, y, align = 'left') => [(align === 'center' ? x + (word.w - d.w) / 2 : x + SIZE * 0.012) - d.x1, y + CAP + gap + dCap];
    return {
      w: Math.max(word.w, d.w), h: CAP + gap + dCap, word, wordAt, wordText, desc: d, descAt, descCap: dCap,
      svg: (s, x, y, align = 'left') => { const [tx, ty] = descAt(x, y, align); return wordSvg(s, x, y) + `<path fill="${s.desc}" transform="translate(${r(tx)} ${r(ty)})" d="${d.d}"/>`; },
    };
  }

  function svgDoc(w, h, body, bg, extra = '') {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${r(w)} ${r(h)}" width="${r(w)}" height="${r(h)}"${extra}>${bg ? `<rect width="100%" height="100%" fill="${bg}"/>` : ''}${body}</svg>\n`;
  }

  // where the mark and the text sit in each lockup: { w, h, mark: [x, y, width], text: [x, y, align] }, padding included
  function lockupLayout(aspect, wordText, desc, tail = 0) {
    const CAP = cap(), tb = textBlock(wordText, desc, tail), p = CAP * 0.6;
    const mH = desc ? tb.h * 1.22 : CAP * 1.75, mW = mH * aspect, gapH = CAP * 0.62, H = Math.max(mH, tb.h);
    const sW = tb.w * 0.66, sH = sW / aspect, gapV = CAP * 0.55;
    return {
      tb, pad: p,
      horizontal: { w: p * 2 + mW + gapH + tb.w, h: p * 2 + H, mark: [p, p + (H - mH) / 2, mW], text: [p + mW + gapH, p + (H - tb.h) / 2, 'left'] },
      // stacked: the word is centred under the mark, and the descriptor is centred on the word
      stacked: { w: p * 2 + tb.w, h: p * 2 + sH + gapV + tb.h, mark: [p + (tb.w - sW) / 2, p, sW], text: [p + (tb.w - tb.word.w) / 2, p + sH + gapV, 'center'] },
    };
  }
  // horizontal + stacked lockups for any mark
  function lockups(markFn, aspect, wordText, desc, s, tail = 0) {
    const L = lockupLayout(aspect, wordText, desc, tail);
    const doc = a => svgDoc(a.w, a.h, markFn(...a.mark) + L.tb.svg(s, ...a.text));
    return { horizontal: doc(L.horizontal), stacked: doc(L.stacked) };
  }

  // a step's notes for the steps after it
  const note = name => path.join(BUILD, name + '.json');
  const read = name => fs.existsSync(note(name)) ? JSON.parse(fs.readFileSync(note(name), 'utf8')) : null;
  const save = (name, data) => { fs.mkdirSync(BUILD, { recursive: true }); fs.writeFileSync(note(name), JSON.stringify(data, null, 1) + '\n'); };
  // nothing is written outside the output folder, whatever a name in the settings says
  const put = (rel, data) => { const f = path.resolve(OUT, rel); if (!inside(OUT, f)) throw new Error(`"${rel}" would be written outside ${OUT}: a name in the settings holds ".." or a full path`); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, data); };
  // a file of the brand's own that the engine runs (a kind of mark, a motion, more characters) must be in the brand folder
  const own = (file, what) => { const f = path.resolve(dir, 'brand', file); if (!inside(dir, f)) throw new Error(`${what} names the file "${file}", which is outside the brand folder. The engine only runs code that is inside it`); if (!fs.existsSync(f)) throw new Error(`${what} names the file "${file}", which is not in the brand folder's brand/`); return f; };
  // On Windows many programs cannot open a file whose whole path is longer than 260 characters, and the browser
  // that draws the pictures is one of them. The engine writes such a file without trouble, so the fault shows
  // late, as a picture that will not load: this says why
  const deep = file => process.platform === 'win32' && path.resolve(file).length >= 259;
  const DEEP = 'Its path is longer than the 260 characters that Windows lets a browser open: move the brand folder nearer the top of the drive, or give it a shorter name';
  const xml = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  let count = 0;
  const S = {
    args, dir, OUT, BUILD, brand: B, INK, WHITE, ACCENTS, NEUTRALS, PAPER, SEMANTIC, r, stopsSvg, pathData, FONTS, font, outline, glyphs, svgDoc, lockupLayout, lockups,
    contrast: brand.contrast, SIZE, WORD_TRACK, read, save, put, own, xml, inside, deep, DEEP, uid: () => count++,
    // no line of a background may come nearer to a logo, to words or to a clear area than this share of the picture's width
    CLEARANCE: 0.02,
    get CAP() { return cap(); },
    // what background art is drawn with, for a kind of mark that a brand writes itself
    art: () => require('./artkit')(S),
  };
  // each mark is drawn by its kind: the built-in one for a flat mark made of parts, or a module of the brand's own
  S.marks = B.marks.map(def => (def.kind === 'parts' ? require('./kinds/parts') : require(own(def.kind, `the mark "${def.id}"`)))(def, S));
  S.mark = id => S.marks.find(m => m.id === id);
  S.brands = S.marks.flatMap(m => m.brands.map(b => ({ ...b, mark: m })));
  return S;
}

module.exports = { open, parse, inside, settings };
