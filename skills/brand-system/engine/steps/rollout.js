// Rollout: the upload kit. For every place the brand is seen (the "rollout" list in brand.json) it makes the files
// that place asks for, at its sizes and under plain names: profile pictures, banners, favicons, email pictures,
// icons. What each place asks for is in platforms.json, and a brand can add places of its own.
// Each picture is laid out from the logo files (so run the logos step first) and Chromium writes it as a PNG.
// Nothing is uploaded anywhere: the files go into final/rollout, ready for a person to upload.
// usage: node run.js rollout <brand folder> [filter]     e.g. node run.js rollout <folder> youtube
const fs = require('fs'), os = require('os'), path = require('path');
const { pathToFileURL } = require('url');
const S = require('../lib/system').open();
const { launch, svgPngs } = require('../lib/browser');
const { INK, WHITE, brand: B, OUT, r, CLEARANCE } = S, only = S.args.rest[0] || '';
const PLATFORMS = { ...JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'platforms.json'), 'utf8')), ...B.platforms };
const light = B.tone === 'light', SURFACE = light ? WHITE : INK;
const url = rel => pathToFileURL(path.join(OUT, rel)).href;

const svgs = [];      // logo files drawn at a width: { src, out, width }
const jobs = [];      // pictures laid out as a page: { out, w, h, html, bg, lock }  (bg null = nothing behind)
const texts = {};     // files written as text: path -> text
const icos = [];      // { out, from: [paths of pictures made here] }
const groups = [];    // what the page lists: [{ label, how, items: [{ what, file, note, brand }] }]

// a logo file in the middle of the picture. w: its width, in pixels or as a share of the picture ('70%')
const center = (rel, w, attr = '') => `<img ${attr}src="${url(rel)}" style="position:absolute;width:${typeof w === 'number' ? w + 'px' : w};left:50%;top:50%;transform:translate(-50%,-50%)">`;
// The mark's line art laid behind a picture, so that the point `spot` of the mark (in the mark's own units) sits at
// `at`. No line may run behind a logo or words: they sit at the mark's inside point, the one furthest from every
// line. Whatever carries data-clear is measured against the lines when the picture is made: a logo file brings its
// own clear space, and a line nearer to it than CLEARANCE (a share of the picture's width) is not allowed.
const CLEAR = 'data-clear ';
function behind(m, w, accent, spot, at, opts = {}) {
  const [bx, by, bw] = m.bounds, k = w / bw;
  return `<div class="lines" style="position:absolute;inset:0"><div style="position:absolute;left:${r(at[0] - (spot[0] - bx) * k)}px;top:${r(at[1] - (spot[1] - by) * k)}px">${m.lineArt(w, accent, opts)}</div></div>`;
}
// A banner: the line art across the whole picture, the lockup in the middle of the mark's roomiest place.
const banner = (m, b, W, H, lockW) => behind(m, W * m.scale.wide, b.accent, m.inside, [W / 2, H / 2], { width: Math.max(2, W / 640) }) + center(source('lockup', b).file, lockW, CLEAR);

// what an item asks for by name: one of the brand's logo files, or a path under the output folder
function source(name, b) {
  const s = name.includes('/') ? { file: name } : b.mark.source(name, b);
  if (!s) throw new Error(`"${name}" is not something the upload kit knows how to take from the mark "${b.mark.id}"`);
  if (s.file && !fs.existsSync(path.join(OUT, s.file))) throw new Error(`${s.file} is not made yet: run the logos step first`);
  return s;
}
// the logo that mail apps show beside the sender: the SVG profile they ask for (tiny-ps), square, no effects, on a
// solid colour, with its size in pixels and a description, which Gmail asks for
function senderLogo(m, title, desc) {
  if (!m.flat) throw new Error(`the mark "${m.id}" cannot be written as a sender logo: its kind has no flat outline`);
  const [bx, by, bw, bh] = m.bounds, size = 900, k = size * 0.62 / bw, x = (size - bw * k) / 2 - bx * k, y = (size - bh * k) / 2 - by * k;
  const fit = d => d.replace(/(-?\d*\.?\d+) (-?\d*\.?\d+)/g, (s, a, b) => `${r(a * k + x)} ${r(b * k + y)}`);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" version="1.2" baseProfile="tiny-ps" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">\n  <title>${title}</title>\n  <desc>${desc || `The ${title} logo: the mark in ${light ? 'black on white' : 'white on black'}`}</desc>\n  <rect width="${size}" height="${size}" fill="${SURFACE}"/>\n  <path fill="${light ? INK : WHITE}" d="${m.flat().map(fit).join('')}"/>\n</svg>\n`;
}

const once = new Set();
for (const entry of B.rollout) {
  const p = PLATFORMS[entry.platform];
  if (!p) throw new Error(`"rollout" names the place "${entry.platform}", which is not in platforms.json or under "platforms" in brand.json. Known: ${Object.keys(PLATFORMS).filter(k => k !== 'comment').join(', ')}`);
  const b = entry.brand ? S.brands.find(x => x.id === entry.brand) : S.brands[0];
  if (!b) throw new Error(`"rollout" names the brand "${entry.brand}", which no mark has`);
  const m = b.mark, handle = entry.handle || b.id, folder = `rollout/${entry.folder || p.folder || entry.platform}`;
  const fill = t => t.replace(/\{handle\}/g, handle).replace(/\{at\}/g, '@' + handle).replace(/\{brand\}/g, b.label).replace(/\{id\}/g, b.id).replace(/\{mark\}/g, m.id);
  const label = entry.label || p.label, group = groups.find(g => g.label === label) || groups[groups.push({ label, how: entry.how || p.how || '', items: [] }) - 1];
  for (const item of p.items) {
    if (entry.only && !entry.only.includes(item.id)) continue;
    const out = `${folder}/${fill(item.file)}`;
    if (item.once) { if (once.has(out)) continue; once.add(out); }
    if (item.svg) { const s = source(fill(item.svg), b); svgs.push({ src: s.svg || fs.readFileSync(path.join(OUT, s.file), 'utf8'), out, width: item.width }); }
    else if (item.banner) jobs.push({ out, w: item.banner[0], h: item.banner[1], bg: SURFACE, lock: entry.lock && entry.lock[item.id] || item.lock, make: lockW => banner(m, b, item.banner[0], item.banner[1], lockW) });
    else if (item.picture) {
      const [w, h] = item.picture, bg = item.bg === undefined || item.bg === 'surface' ? SURFACE : item.bg === 'ink' ? INK : item.bg === 'white' ? WHITE : item.bg;
      // a width may be pixels, a share of the picture, or 'fit:0.6': that share of the widest the mark can be in the picture
      const width = v => typeof v === 'string' && v.startsWith('fit:') ? r(Math.min(w, h * m.aspect) * v.slice(4)) : v;
      const html = (item.fill ? `<div style="position:absolute;inset:0;background:${item.fill}"></div>` : '') + (item.place || []).map(([name, v, more]) => center(source(fill(name), b).file, width(v), more && more.clear ? CLEAR : '')).join('');
      jobs.push({ out, w, h, bg, make: () => html });
    }
    else if (item.text) texts[out] = item.text === 'sender' ? senderLogo(m, fill(item.title || B.name), item.desc && fill(item.desc)) : item.text.startsWith('cropped:') ? m.cropped(item.text.slice(8)) : (() => { throw new Error(`unknown text file "${item.text}" in the place "${entry.platform}"`); })();
    else if (item.ico) icos.push({ out, from: item.ico.map(f => `${folder}/${fill(f)}`) });
    else throw new Error(`the item "${item.id}" of the place "${entry.platform}" says nothing to make: give it "svg", "banner", "picture", "text" or "ico"`);
    if (!item.quiet) group.items.push({ what: fill(item.what || item.id), file: out, note: fill(item.note || ''), brand: b.id, kind: item.banner ? 'banner' : item.svg === 'avatar' ? 'avatar' : 'file', safe: item.safe });
  }
  // steps a person does by hand, with no file: [{ what, note }]
  for (const s of entry.steps || []) group.items.push({ what: fill(s.what), file: s.file ? fill(s.file) : '', note: fill(s.note || ''), brand: b.id, kind: 'step' });
}

// an .ico file holding several PNG pictures
function ico(list) {
  const head = Buffer.alloc(6); head.writeUInt16LE(1, 2); head.writeUInt16LE(list.length, 4);
  let at = 6 + 16 * list.length;
  const dirs = list.map(([size, png]) => { const d = Buffer.alloc(16); d.writeUInt8(size, 0); d.writeUInt8(size, 1); d.writeUInt16LE(1, 4); d.writeUInt16LE(32, 6); d.writeUInt32LE(png.length, 8); d.writeUInt32LE(at, 12); at += png.length; return d; });
  return Buffer.concat([head, ...dirs, ...list.map(x => x[1])]);
}

(async () => {
  const todo = jobs.filter(j => j.out.includes(only)), made = {};
  const tmp = path.join(os.tmpdir(), `brand-rollout-${process.pid}.html`);
  const browser = await launch();
  await svgPngs(browser, svgs.filter(j => j.out.includes(only)), OUT);
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  const errors = [], tooNear = [], shrunk = [];
  page.on('requestfailed', q => errors.push(q.url()));
  for (const j of todo) {
    // a banner's lockup is as wide as the place allows. Where the mark leaves less room than that, it is made
    // narrower, a twentieth at a time, until every line keeps its distance
    let near = Infinity, lockW = j.lock;
    for (let step = 0; ; step++) {
      fs.writeFileSync(tmp, `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0}body{width:${j.w}px;height:${j.h}px;position:relative;overflow:hidden;background:${j.bg || 'transparent'}}img{display:block}</style></head><body>${j.make(lockW)}</body></html>`);
      await page.setViewportSize({ width: j.w, height: j.h });
      await page.goto(pathToFileURL(tmp).href);
      // everything marked data-clear is measured against the lines
      near = await page.evaluate(async () => {
        await Promise.all([...document.images].map(i => i.decode().catch(() => {})));
        const clear = [...document.querySelectorAll('[data-clear]')].map(e => e.getBoundingClientRect());
        let near = Infinity;
        for (const box of document.querySelectorAll('.lines')) {
          const frame = box.getBoundingClientRect();
          for (const line of box.querySelectorAll('path')) {
            const m = line.getScreenCTM(), n = line.getTotalLength();
            for (let d = 0; d <= n; d += 2) {
              const q = line.getPointAtLength(d), x = q.x * m.a + q.y * m.c + m.e, y = q.x * m.b + q.y * m.d + m.f;
              if (x < frame.left || y < frame.top || x > frame.right || y > frame.bottom) continue;
              for (const c of clear) near = Math.min(near, Math.hypot(Math.max(c.left - x, 0, x - c.right), Math.max(c.top - y, 0, y - c.bottom)));
            }
          }
        }
        return near;
      });
      if (near >= j.w * CLEARANCE || !j.lock || step >= 12) break;
      lockW = Math.round(lockW * 0.95);
    }
    if (near < j.w * CLEARANCE) tooNear.push(`${j.out} (${Math.round(near)} px)`);
    if (j.lock && lockW !== j.lock) shrunk.push(`${j.out}: the lockup is ${lockW} px wide, not ${j.lock}`);
    if (only && near < Infinity) console.log(`${j.out}: the nearest line is ${Math.round(near)} px from a logo or words (${(near / j.w * 100).toFixed(1)}% of the width)`);
    const png = await page.screenshot({ omitBackground: !j.bg, clip: { x: 0, y: 0, width: j.w, height: j.h } });
    S.put(j.out, png); made[j.out] = png;
  }
  await browser.close();
  if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
  let others = 0;
  for (const i of icos) { if (!i.from.every(f => made[f])) continue; S.put(i.out, ico(i.from.map(f => [+(f.match(/(\d+)x\d+\.png$/) || f.match(/(\d+)\.png$/))[1], made[f]]))); others++; }
  if (!only) for (const [rel, text] of Object.entries(texts)) { S.put(rel, text); others++; }
  if (!only) S.save('rollout', { comment: 'Written by the rollout step: the upload kit as the page lists it, place by place.', groups });
  if (errors.length) throw new Error('could not load: ' + [...new Set(errors)].join(', '));
  if (tooNear.length) throw new Error('a line of the line art runs too near a logo or words in: ' + tooNear.join(', ') + '. Draw the mark larger behind it ("scale" in the mark\'s settings) or move its inside point');
  for (const s of shrunk) console.log(s);
  console.log(`${todo.length + svgs.filter(j => j.out.includes(only)).length} pictures${only ? '' : `, ${others} other files`} -> ${path.join(OUT, 'rollout')}`);
})().catch(e => { console.error(e.message); process.exit(1); });
