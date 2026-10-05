// The headless browser that turns drawings into pictures. Chromium comes with the playwright library, which
// `run.js setup` installs.
const fs = require('fs'), path = require('path');

function chromium() {
  try { return require('playwright').chromium; }
  catch (e) { throw new Error('the playwright library is not installed: run `node run.js setup` first'); }
}
const launch = (opts = {}) => chromium().launch(opts).catch(e => { throw new Error(`Chromium did not start (${e.message.split('\n')[0]}): run \`node run.js setup\` to install it`); });
// for moving pictures: no waiting for the screen, and colours as written
const launchFilm = () => launch({ args: ['--disable-gpu-vsync', '--force-color-profile=srgb'] });

// SVG drawings as PNG files. jobs: { src: the svg text, out: the path under `root`, width }. The height follows
// the drawing's own proportions, and nothing is painted behind it
async function svgPngs(browser, jobs, root) {
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  for (const p of jobs) {
    const [, , vw, vh] = p.src.match(/viewBox="([^"]+)"/)[1].split(' ').map(Number);
    const w = p.width, h = Math.round(w * vh / vw);
    await page.setViewportSize({ width: w, height: h });
    await page.setContent(`<body style="margin:0">${p.src.replace(/ width="[\d.]+" height="[\d.]+"/, '').replace('<svg ', `<svg width="${w}" height="${h}" style="display:block" `)}</body>`);
    const f = path.join(root, p.out); fs.mkdirSync(path.dirname(f), { recursive: true });
    await page.screenshot({ path: f, omitBackground: true, clip: { x: 0, y: 0, width: w, height: h } });
  }
  await page.close();
}

// the width and height a PNG file says it has
function pngSize(file) {
  const b = Buffer.alloc(24), fd = fs.openSync(file, 'r');
  fs.readSync(fd, b, 0, 24, 0); fs.closeSync(fd);
  if (b.toString('latin1', 1, 4) !== 'PNG') throw new Error('not a PNG file: ' + file);
  return [b.readUInt32BE(16), b.readUInt32BE(20)];
}

module.exports = { launch, launchFilm, svgPngs, pngSize };
