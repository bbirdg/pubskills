// Master sheets: every main version of each mark on one vector page (SVG and PDF), for Illustrator or print.
// Run the logos step first: the sheets are laid out from its files.
// usage: node run.js masters <brand folder>
const fs = require('fs'), path = require('path');
const S = require('../lib/system').open();
const { launch } = require('../lib/browser');
const { OUT, INK, WHITE } = S;
const CW = 800, CH = 500, PAD = 90;

let uid = 0;
// place one generated svg file inside a cell, with its ids made unique
function cell(file, col, row, bg) {
  if (!fs.existsSync(path.join(OUT, file))) throw new Error(`${file} is not made yet: run the logos step first`);
  const src = fs.readFileSync(path.join(OUT, file), 'utf8');
  const [, , vw, vh] = src.match(/viewBox="([^"]+)"/)[1].split(' ').map(Number);
  let inner = src.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
  const n = uid++;
  inner = inner.replace(/id="([^"]+)"/g, (m, id) => `id="${id}-${n}"`).replace(/url\(#([^)]+)\)/g, (m, id) => `url(#${id}-${n})`);
  const k = Math.min((CW - PAD * 2) / vw, (CH - PAD * 2) / vh), x = col * CW + (CW - vw * k) / 2, y = row * CH + (CH - vh * k) / 2;
  return `<rect x="${col * CW}" y="${row * CH}" width="${CW}" height="${CH}" fill="${bg}"/><g transform="translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${k.toFixed(5)})">${inner}</g>`;
}
function sheet(rows) {
  const cols = Math.max(...rows.map(r => r.length));
  const body = rows.map((r, ri) => r.map(([f, bg], ci) => cell(f, ci, ri, bg)).join('')).join('');
  const w = cols * CW, h = rows.length * CH;
  return { w, h, svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${body}</svg>\n` };
}
// a mark's kind says which files go on its sheet, row by row, and whether each stands on dark, on light or on a colour of its own
const SHEETS = S.marks.filter(m => m.masterRows).map(m => [`logos/${m.id}/${m.id}-master`, sheet(m.masterRows().map(row => row.map(([file, on]) => [`logos/${m.id}/svg/${file}`, on === true ? INK : on === false ? WHITE : on])))]);

(async () => {
  const browser = await launch();
  const page = await browser.newPage();
  for (const [name, s] of SHEETS) {
    S.put(name + '.svg', s.svg);
    await page.setContent(`<style>@page{size:${s.w}px ${s.h}px;margin:0}html,body{margin:0}svg{display:block}</style>${s.svg}`);
    await page.pdf({ path: path.join(OUT, name + '.pdf'), width: s.w + 'px', height: s.h + 'px', printBackground: true, pageRanges: '1' });
    console.log(name, `${s.w}x${s.h}`, (fs.statSync(path.join(OUT, name + '.pdf')).size / 1024).toFixed(0) + ' KB pdf');
  }
  await browser.close();
})().catch(e => { console.error(e.message); process.exit(1); });
