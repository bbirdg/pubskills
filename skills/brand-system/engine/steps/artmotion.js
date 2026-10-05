// Art in motion: the art as seamless loops, in the brand's own tone. Nothing in a picture moves: light runs along
// its lines and across its shapes, where each kind of picture says it does. Each loop comes as an MP4 on its
// background and as a transparent WebM (the files named -clear), at the smaller of the art's sizes, next to the stills.
// usage: node run.js art-motion <brand folder> [filter]     e.g. node run.js art-motion <folder> echo
const fs = require('fs'), os = require('os'), path = require('path');
const { spawn } = require('child_process');
const S = require('../lib/system').open();
const A = require('../lib/artkit')(S);
const { launchFilm } = require('../lib/browser');

const LOOP = 10, FPS = 60;      // seconds in a loop, frames in a second
const TONE = A.THEMES[S.brand.tone === 'light' ? 1 : 0], SIZE = A.SIZES[A.SIZES.length - 1];

// The page: the picture with its lights. seek(t) lights it as it is t seconds into the loop.
function client(c) {
  const NS = 'http://www.w3.org/2000/svg', svg = document.querySelector('svg'), defs = svg.querySelector('defs');
  const make = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); parent.appendChild(e); return e; };
  const laid = (t, parent) => make('g', t ? { transform: `translate(${t.x} ${t.y}) scale(${t.k})` } : {}, parent);
  const frac = v => v - Math.floor(v), ease = v => v * v * (3 - 2 * v), clamp = v => Math.max(0, Math.min(1, v));
  // light spreads a little beyond its line
  make('feGaussianBlur', { stdDeviation: c.blur }, make('filter', { id: 'lightglow', filterUnits: 'userSpaceOnUse', x: 0, y: 0, width: c.W, height: c.H }, defs));
  const top = make('g', { fill: 'none', 'stroke-linejoin': 'round' }, svg), glow = make('g', { filter: 'url(#lightglow)' }, top), core = make('g', {}, top);
  const TAIL = 8, acts = [];
  c.lights.forEach((l, n) => {
    if (l.run) {
      // a lit stretch of the line with a tail: strokes of growing length that all end at the head
      const each = 1 - Math.pow(1 - l.op, 1 / TAIL), g = laid(l.t, core);
      const tail = Array.from({ length: TAIL }, (_, k) => make('path', { d: l.run, pathLength: 1000, stroke: l.paint, 'stroke-opacity': each, 'stroke-width': l.sw * 1.15 }, g));
      const halo = make('path', { d: l.run, pathLength: 1000, stroke: l.glow, 'stroke-opacity': l.op * 0.7, 'stroke-width': l.sw * 5 }, laid(l.t, glow));
      acts.push(u => {
        const head = frac(l.phase + l.laps * u) * 1000;
        tail.forEach((p, k) => { const len = l.len * 1000 * (k + 1) / TAIL; p.setAttribute('stroke-dasharray', `${len} ${1000 - len}`); p.setAttribute('stroke-dashoffset', len - head); });
        const len = l.len * 500; halo.setAttribute('stroke-dasharray', `${len} ${1000 - len}`); halo.setAttribute('stroke-dashoffset', len - head);
      });
    } else if (l.ripple) {
      // each line brightens a moment after the one before it
      const g = laid(l.t, core), lines = l.ripple.map(o => make('path', { d: o.d, stroke: l.paint, 'stroke-width': l.sw * 1.15 }, g)), span = 0.6, wide = 0.24;
      acts.push(u => lines.forEach((p, i) => { const at = frac(u * l.waves - i / lines.length * span); p.setAttribute('opacity', at < wide ? l.op * l.ripple[i].shows * Math.pow(Math.sin(Math.PI * at / wide), 2) : 0); }));
    } else if (l.sheen) {
      // a soft band of light, as wide as `width` of the way across, passes from one end to the other and rests
      const id = 'sheen' + n, grad = make('linearGradient', { id, gradientUnits: 'userSpaceOnUse' }, defs), dir = [l.to[0] - l.from[0], l.to[1] - l.from[1]];
      [[0, 0], [0.5, l.op], [1, 0]].forEach(([o, a]) => make('stop', { offset: o, 'stop-color': l.paint, 'stop-opacity': a }, grad));
      make('path', { d: l.sheen, fill: `url(#${id})` }, laid(l.t, top));
      acts.push(u => { const e = -0.5 + 2.1 * ease(clamp(u / 0.75)), a = e - l.width / 2, b = e + l.width / 2; grad.setAttribute('x1', l.from[0] + dir[0] * a); grad.setAttribute('y1', l.from[1] + dir[1] * a); grad.setAttribute('x2', l.from[0] + dir[0] * b); grad.setAttribute('y2', l.from[1] + dir[1] * b); });
    } else if (l.hop) {
      // the shape is lit in one place, then the next, with the two overlapping as the light passes over
      const places = l.hop.map(at => make('path', { d: l.d, transform: at, fill: l.paint }, top)), K = places.length;
      acts.push(u => places.forEach((p, j) => { const x = (u * K - j + 0.5 + K) % K; p.setAttribute('opacity', x < 0.3 ? ease(x / 0.3) : x < 1 ? 1 : x < 1.3 ? 1 - ease((x - 1) / 0.3) : 0); }));
    }
  });
  window.seek = t => { const u = frac(t / c.loop); acts.forEach(a => a(u)); };
  window.seek(0);
}

const sceneHtml = (x, p, w, h) => `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;background:transparent}svg{display:block}</style></head><body>${A.svg(x.s.w, x.s.h, p, null, '').replace(`width="${x.s.w}" height="${x.s.h}"`, `width="${w}" height="${h}"`)}<script>(${client.toString()})(${JSON.stringify({ W: x.s.w, H: x.s.h, loop: LOOP, blur: Math.min(x.s.w, x.s.h) / 240, lights: p.lights })})</script></body></html>`;

// every picture of the brand's tone, as a loop
const jobs = () => A.pictures().filter(x => x.th === TONE).map(x => ({ ...x, w: x.s.w * SIZE, h: x.s.h * SIZE })).map(x => ({ ...x, file: `${x.dir}/${x.name}-${x.w}x${x.h}` }));

async function render(browser, x, OUT) {
  const p = x.v.draw(x.s.w, x.s.h, x.c, x.th), { w, h } = x;
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  // the background alone, as a picture the frames are laid over
  const bg = path.join(os.tmpdir(), `brand-art-${x.name}-${process.pid}.png`);
  await page.setContent(`<!doctype html><html><body style="margin:0">${A.svg(x.s.w, x.s.h, { defs: p.defs, under: p.under, body: '' }, x.f.back(x.th), '').replace(`width="${x.s.w}" height="${x.s.h}"`, `width="${w}" height="${h}" style="display:block"`)}</body></html>`);
  fs.writeFileSync(bg, await page.screenshot({ type: 'png' }));
  await page.setContent(sceneHtml(x, p, w, h));
  // the frames are transparent. MP4: laid over the background, sRGB to BT.709, tagged. WebM: as they are, for the web
  const tags = ['-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv'], to709 = 'scale=in_range=pc:out_range=tv:out_color_matrix=bt709';
  const mp4 = path.join(OUT, x.file + '.mp4'), webm = path.join(OUT, x.file + '-clear.webm');
  fs.mkdirSync(path.dirname(mp4), { recursive: true });
  const graph = `[0:v]split=2[a][w];[1:v][a]overlay=shortest=1:format=gbrp,${to709},format=yuv420p[m];[w]${to709},format=yuva420p[v]`;
  const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-', '-loop', '1', '-framerate', String(FPS), '-i', bg, '-filter_complex', graph,
    '-map', '[m]', '-c:v', 'libx264', '-preset', 'slow', '-crf', '15', ...tags, '-movflags', '+faststart', mp4,
    '-map', '[v]', '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '26', '-auto-alt-ref', '0', '-row-mt', '1', '-deadline', 'good', '-cpu-used', '4', ...tags, webm], { stdio: ['pipe', 'inherit', 'inherit'] });
  let stopped = false;
  const done = new Promise((res, rej) => { ff.on('error', () => rej(new Error('ffmpeg did not start: it is needed for moving pictures (see `node run.js doctor`)'))); ff.on('close', code => { stopped = true; code === 0 ? res() : rej(new Error(`ffmpeg stopped with code ${code} while writing ${x.name}: its message is above. A build of ffmpeg without the H.264 or VP9 encoders cannot write these files`)); }); });
  ff.stdin.on('error', () => {});      // ffmpeg stopping early closes its pipe: the reason comes from its exit, above
  done.catch(() => {});
  const frames = LOOP * FPS;
  for (let i = 0; i < frames && !stopped; i++) {
    await page.evaluate(t => window.seek(t), i / FPS);
    const shot = await page.screenshot({ type: 'png', omitBackground: true });
    if (!ff.stdin.write(shot)) await Promise.race([new Promise(res => ff.stdin.once('drain', res)), done.catch(() => {})]);
  }
  ff.stdin.end();
  try { await done; } finally { if (fs.existsSync(bg)) fs.unlinkSync(bg); }
  await page.close();
  if (errors.length) throw new Error(`${x.name}: ${errors[0]}`);
  return mp4;
}

async function main() {
  const OUT = S.OUT, filter = S.args.rest[0] || '';
  const list = jobs().filter(j => j.name.includes(filter));
  if (!list.length) throw new Error(`no moving background has "${filter}" in its name. The names start with: ${[...new Set(jobs().map(j => j.name.split('-').slice(0, 2).join('-')))].join(', ')}`);
  const browser = await launchFilm(), t0 = Date.now();
  let next = 0;
  await Promise.all(Array.from({ length: 3 }, async () => {
    while (next < list.length) {
      const x = list[next++], mp4 = await render(browser, x, OUT);
      console.log(`${x.name}-${x.w}x${x.h}  ${(fs.statSync(mp4).size / 1024).toFixed(0)} KB`);
    }
  }));
  await browser.close();
  S.save('art-motion', { comment: 'Written by the art-motion step: which loops are made.', loop: LOOP, fps: FPS, tone: TONE.id, size: SIZE, made: jobs().filter(j => fs.existsSync(path.join(OUT, j.file + '.mp4'))).length, of: jobs().length });
  console.log(`${list.length} loops of ${LOOP} s at ${FPS} fps in ${((Date.now() - t0) / 60000).toFixed(1)} min`);
}
module.exports = { LOOP, FPS, jobs, sceneHtml };
if (require.main === module) main().catch(e => { console.error(e.message); process.exit(1); });
