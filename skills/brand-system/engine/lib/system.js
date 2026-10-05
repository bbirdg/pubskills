// Shared definitions for one brand folder: its settings, its colours, the fonts its name is set in, the lockup
// layout and the SVG helpers every step uses. A step starts with `const S = require('../lib/system').open()`.
const fs = require('fs'), path = require('path');
const brand = require('./brand');

// <brand folder> [more words] [--out <folder>] [--with <settings laid over brand.json>] [--flags]
function parse(argv) {
  const a = { dir: null, rest: [], with: [], out: null };
  for (let i = 0; i < argv.length; i++) {
    const v = argv[i];
    if (v === '--with') a.with.push(argv[++i]);
    else if (v === '--out') a.out = argv[++i];
    else if (v.startsWith('--')) { const [k, val] = v.slice(2).split('='); a[k] = val === undefined ? true : val; }
    else if (!a.dir) a.dir = v;
    else a.rest.push(v);
  }
  return a;
}

function open(argv = process.argv.slice(2)) {
  const args = parse(argv);
  if (!args.dir) throw new Error('give the brand folder: the one that holds brand/brand.json');
  const dir = path.resolve(args.dir), B = brand.load(dir, args.with.map(f => path.resolve(f)));
  // everything a step makes goes into final/. Its own notes (what the page reads back) go into .build/
  const OUT = path.resolve(args.out || path.join(dir, 'final')), BUILD = args.out ? path.join(OUT, '.build') : path.join(dir, '.build');
  const { ink: INK, white: WHITE, accents: ACCENTS, neutrals: NEUTRALS, paper: PAPER, semantic: SEMANTIC } = B.colours;

  const r = (v, d = 2) => +(+v).toFixed(d);
  const stopsSvg = s => s.map((c, i) => `<stop offset="${r(i / (s.length - 1), 3)}" stop-color="${c}"/>`).join('');

  // ---- type: the name beside the mark is set in a font file and turned into outlines, so a logo needs no font
  const fontFile = spec => {
    if (!/^family:/.test(spec)) return path.resolve(dir, 'brand', spec);
    if (!B.type.family) throw new Error(`"${spec}" asks for a weight of the brand's own font family, but "type.family" is not set: name a font file instead, or set the family and run the fonts step`);
    const name = `${B.type.family.name.replace(/ /g, '')}-${spec.slice(7)}.ttf`, found = [path.join(OUT, 'fonts', name), path.join(dir, 'final', 'fonts', name)].find(f => fs.existsSync(f));
    if (!found) throw new Error(`the name is set in ${name}, which is not built yet: run the fonts step first`);
    return found;
  };
  const loadFont = spec => { const b = fs.readFileSync(fontFile(spec)); return require('opentype.js').parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)); };
  const held = {};
  const FONTS = { get word() { return held.word || (held.word = loadFont(B.type.wordmark.font)); }, get desc() { return held.desc || (held.desc = loadFont(B.type.descriptor.font)); } };
  // opentype.js's own toPathData() emits NaN for some coordinates, so the commands are serialised here
  function pathData(p, d = 2) {
    const n = v => +v.toFixed(d);
    return p.commands.map(c => c.type === 'Z' ? 'Z' : c.type === 'C' ? `C${n(c.x1)} ${n(c.y1)} ${n(c.x2)} ${n(c.y2)} ${n(c.x)} ${n(c.y)}` : c.type === 'Q' ? `Q${n(c.x1)} ${n(c.y1)} ${n(c.x)} ${n(c.y)}` : `${c.type}${n(c.x)} ${n(c.y)}`).join('');
  }
  // text converted to outlines; baseline at y = 0
  function outline(font, text, size, tracking = 0) {
    const p = font.getPath(text, 0, 0, size, { kerning: true, letterSpacing: tracking });
    const b = p.getBoundingBox();
    return { d: pathData(p), x1: b.x1, x2: b.x2, y1: b.y1, y2: b.y2, w: b.x2 - b.x1 };
  }
  // the same text as separate glyph outlines, laid out exactly as outline() lays them out (motion: letters arrive one by one)
  function glyphs(font, text, size, tracking = 0) {
    const list = font.getPaths(text, 0, 0, size, { kerning: true, letterSpacing: tracking }).map(p => pathData(p)).filter(Boolean);
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
  const put = (rel, data) => { const f = path.join(OUT, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, data); };

  let count = 0;
  const S = {
    args, dir, OUT, BUILD, brand: B, INK, WHITE, ACCENTS, NEUTRALS, PAPER, SEMANTIC, r, stopsSvg, pathData, FONTS, outline, glyphs, svgDoc, lockupLayout, lockups,
    contrast: brand.contrast, SIZE, WORD_TRACK, read, save, put, uid: () => count++,
    // no line of a background may come nearer to a logo, to words or to a clear area than this share of the picture's width
    CLEARANCE: 0.02,
    get CAP() { return cap(); },
    // what background art is drawn with, for a kind of mark that a brand writes itself
    art: () => require('./artkit')(S),
  };
  // each mark is drawn by its kind: the built-in one for a flat mark made of parts, or a module of the brand's own
  S.marks = B.marks.map(def => (def.kind === 'parts' ? require('./kinds/parts') : require(path.resolve(dir, 'brand', def.kind)))(def, S));
  S.mark = id => S.marks.find(m => m.id === id);
  S.brands = S.marks.flatMap(m => m.brands.map(b => ({ ...b, mark: m })));
  return S;
}

module.exports = { open, parse };
