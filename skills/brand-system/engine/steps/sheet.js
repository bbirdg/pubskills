// Sheet: options laid side by side on one page, so that a choice is made by looking, not by reading. Each option
// gets a letter. It writes an HTML page (videos play in it) and a PNG picture of it to show in a chat.
// usage: node run.js sheet <brand folder> <option> <option> ... [--title="What is being chosen"] [--out=<file without extension>] [--on=both|dark|light] [--cols=3] [--with <settings>]
//   an option is a file (SVG, PNG, JPG, WebP, MP4, WebM), or name=file to give it a name, or a folder: every picture in it.
//   Two files joined by | are one option with a file for each panel: the first is shown on dark, the second on light
//   (a white logo cannot be seen on light, so give its dark twin there).
//   --on picks the panels (both by default), --cols the columns, --out where the page and its picture go (options/sheet
//   by default), and --with lays trial settings over brand.json, so the panels take a trial ink or white
//   e.g. node run.js sheet . "Kite=options/mark/a.svg" "Sail=options/mark/b.svg" --title="The mark: two directions"
//        node run.js sheet . "A=options/a/white.svg|options/a/black.svg" "B=options/b/white.svg|options/b/black.svg"
const fs = require('fs'), path = require('path');
const { pathToFileURL } = require('url');
const brand = require('../lib/brand');
const { launch } = require('../lib/browser');
const { parse, settings } = require('../lib/system');

const args = parse(process.argv.slice(2));
if (!args.dir || !args.rest.length) { console.error('usage: node run.js sheet <brand folder> <option> <option> ... [--title="..."] [--out=<file>] [--on=both|dark|light] [--cols=3] [--with <settings>]\n  an option: a file, name=file, a folder of pictures, or "name=on-dark.svg|on-light.svg" for a file on each panel'); process.exit(1); }
const dir = path.resolve(args.dir);
let ink = '#0C0C0E', white = '#FFFFFF', tone = 'dark';
// a sheet can be made before there are settings. Trial settings that were asked for must load, though
try { const B = brand.load(dir, args.with.map(f => settings(dir, f))); ink = B.colours.ink; white = B.colours.white; tone = B.tone; } catch (e) { if (args.with.length) { console.error(e.message); process.exit(1); } }
const PICTURE = /\.(svg|png|jpe?g|webp|gif)$/i, FILM = /\.(mp4|webm)$/i;
const options = [];
for (const a of args.rest) {
  // name=file, and file|file for a picture on each panel: the first on dark, the second on light
  const named = a.match(/^([^=|]+)=(.+)$/), name = named ? named[1] : null, files = (named ? named[2] : a).split('|').map(f => path.resolve(dir, f)), file = files[0];
  for (const f of files) if (!fs.existsSync(f)) { console.error('no such option: ' + f); process.exit(1); }
  if (files.length > 2) { console.error(`an option is one file, or two joined by | (on dark, then on light): ${a}`); process.exit(1); }
  if (files.length === 1 && fs.statSync(file).isDirectory()) for (const f of fs.readdirSync(file).filter(f => PICTURE.test(f) || FILM.test(f)).sort()) options.push({ name: name ? `${name}: ${f}` : f.replace(/\.[^.]+$/, ''), file: path.join(file, f) });
  else options.push({ name: name || path.basename(file).replace(/\.[^.]+$/, ''), file, light: files[1] });
}
if (!options.length) { console.error('no picture or film was found among the options'); process.exit(1); }
const on = args.on || 'both', sides = on === 'both' ? (tone === 'light' ? ['light', 'dark'] : ['dark', 'light']) : [on];
const cols = +args.cols || (options.length <= 2 ? options.length : options.length === 4 ? 2 : 3), title = typeof args.title === 'string' ? args.title : 'Options';
// --out names the page without its ending: one that was given is taken off, so the files are not called sheet.html.html
const out = path.resolve(dir, typeof args.out === 'string' ? args.out.replace(/\.(html|png)$/i, '') : path.join('options', 'sheet'));
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const letter = i => String.fromCharCode(65 + i % 26) + (i >= 26 ? Math.floor(i / 26) : '');
// the page sits beside its options, so its links to them are short and it can be sent with them
const rel = f => path.relative(path.dirname(out), f).replace(/\\/g, '/').split('/').map(encodeURIComponent).join('/');
const show = (o, side) => { const f = side === 'light' && o.light ? o.light : o.file; return FILM.test(f) ? `<video src="${rel(f)}" muted loop autoplay playsinline></video>` : `<img src="${rel(f)}" alt="${esc(o.name)}">`; };
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(title)}</title><style>
body{margin:0;background:#131318;color:#F4F4F6;font:500 16px/1.5 "Segoe UI",system-ui,sans-serif;padding:28px}
h1{font-size:26px;font-weight:800;letter-spacing:-0.02em;margin:0 0 6px}p{margin:0 0 22px;color:#B4B4C0}
.grid{display:grid;grid-template-columns:repeat(${cols},minmax(0,1fr));gap:18px}
figure{margin:0;display:grid;gap:10px;align-content:start}
.t{display:grid;place-items:center;border-radius:14px;padding:26px;min-height:200px}
.dark{background:${ink};box-shadow:inset 0 0 0 1px #262631}.light{background:${white}}
.t img,.t video{max-width:100%;max-height:340px;display:block}
figcaption{display:flex;gap:12px;align-items:baseline;font-weight:600}
figcaption b{display:inline-grid;place-items:center;min-width:34px;height:34px;border-radius:999px;background:#F4F4F6;color:#0C0C0E;font-size:17px;font-weight:800}
</style></head><body><h1>${esc(title)}</h1><p>Pick one by its letter. ${sides.length > 1 ? 'Each is shown on dark and on light.' : ''}</p>
<div class="grid">${options.map((o, i) => `<figure><figcaption><b>${letter(i)}</b><span>${esc(o.name)}</span></figcaption>${sides.map(s => `<div class="t ${s}">${show(o, s)}</div>`).join('')}</figure>`).join('')}</div>
</body></html>
`;
(async () => {
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out + '.html', html);
  const browser = await launch(), page = await browser.newPage({ viewport: { width: Math.min(1800, 260 + cols * 480), height: 900 }, deviceScaleFactor: 1 });
  await page.goto(pathToFileURL(out + '.html').href);
  await page.evaluate(async () => { await Promise.all([...document.images].map(i => i.decode().catch(() => {}))); await Promise.all([...document.querySelectorAll('video')].map(v => v.readyState >= 2 ? 0 : new Promise(r => { v.onloadeddata = r; v.onerror = r; setTimeout(r, 3000); }))); });
  await page.screenshot({ path: out + '.png', fullPage: true });
  await browser.close();
  console.log(`${options.length} options: ${options.map((o, i) => `${letter(i)} ${o.name}`).join(', ')}\nwritten: ${out}.html and ${out}.png`);
})().catch(e => { console.error(e.message); process.exit(1); });
