// Trace: a picture of a logo (PNG, JPG, WebP) turned into an SVG outline, as a start for the mark's drawing.
// It finds the flat colours of the picture, follows the edge of each one to within a fraction of a pixel, keeps
// corners sharp and fits smooth curves between them. Every separate shape becomes one part.
// The result is a faithful outline, not a finished mark: clean it (fewer points, true curves, even gaps), name its
// parts, mark the accent, and save it as brand/mark.svg.
// usage: node run.js trace <picture> [--out=<file.svg>] [--colours=4] [--size=1400] [--smooth=1]
const fs = require('fs'), path = require('path');
const O = require('../lib/outline');
const { paper, n2 } = O;
const { launch } = require('../lib/browser');
const { parse } = require('../lib/system');

const args = parse(process.argv.slice(2));
if (!args.dir) { console.error('usage: node run.js trace <picture> [--out=<file.svg>] [--colours=4] [--size=1400] [--smooth=1]'); process.exit(1); }
const src = path.resolve(args.dir), SIZE = +args.size || 1400, MOST = +args.colours || 4, SMOOTH = +args.smooth || 1;
const out = path.resolve(typeof args.out === 'string' ? args.out : src.replace(/\.[^.]+$/, '') + '-traced.svg');
const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml' };
if (!fs.existsSync(src)) { console.error('no such picture: ' + src); process.exit(1); }
if (!MIME[path.extname(src).toLowerCase()]) { console.error('this step reads PNG, JPG, WebP, GIF and SVG pictures'); process.exit(1); }

// ---- the edge of a field of values, where it passes one half: closed loops of points, placed between pixels
function loops(f, w, h) {
  const val = (x, y) => x < 0 || y < 0 || x >= w || y >= h ? 0 : f[y * w + x], ISO = 0.5, W2 = w + 2;
  // the sides of a cell are numbered by the grid line they lie on: across (0) or down (1), from a pixel
  const key = (x, y, down) => ((y + 1) * W2 + (x + 1)) * 2 + down;
  const link = new Map(), add = (a, b) => { (link.get(a) || link.set(a, []).get(a)).push(b); (link.get(b) || link.set(b, []).get(b)).push(a); };
  for (let y = -1; y < h; y++) for (let x = -1; x < w; x++) {
    const tl = val(x, y) >= ISO, tr = val(x + 1, y) >= ISO, br = val(x + 1, y + 1) >= ISO, bl = val(x, y + 1) >= ISO, c = (tl ? 8 : 0) | (tr ? 4 : 0) | (br ? 2 : 0) | (bl ? 1 : 0);
    if (c === 0 || c === 15) continue;
    const T = key(x, y, 0), R = key(x + 1, y, 1), Bo = key(x, y + 1, 0), L = key(x, y, 1);
    const mid = (val(x, y) + val(x + 1, y) + val(x + 1, y + 1) + val(x, y + 1)) / 4 >= ISO;
    const pairs = { 1: [[L, Bo]], 2: [[Bo, R]], 3: [[L, R]], 4: [[T, R]], 6: [[T, Bo]], 7: [[L, T]], 8: [[T, L]], 9: [[T, Bo]], 11: [[T, R]], 12: [[L, R]], 13: [[Bo, R]], 14: [[L, Bo]],
      5: mid ? [[T, L], [R, Bo]] : [[T, R], [L, Bo]], 10: mid ? [[T, R], [L, Bo]] : [[T, L], [R, Bo]] }[c];
    for (const [a, b] of pairs) add(a, b);
  }
  // where the edge crosses a side: between its two pixels, nearer the one whose value is nearer one half
  const at = k => {
    const down = k & 1, i = k >> 1, x = i % W2 - 1, y = Math.floor(i / W2) - 1, a = val(x, y), b = down ? val(x, y + 1) : val(x + 1, y), t = (ISO - a) / (b - a);
    return down ? [x + 0.5, y + t + 0.5] : [x + t + 0.5, y + 0.5];
  };
  const seen = new Set(), found = [];
  for (const start of link.keys()) {
    if (seen.has(start)) continue;
    const pts = [];
    let prev = -1, k = start;
    for (;;) {
      seen.add(k); pts.push(at(k));
      const next = link.get(k).find(n => n !== prev && !seen.has(n));
      if (next === undefined) break;
      prev = k; k = next;
    }
    if (pts.length >= 8) found.push(pts);
  }
  return found;
}
const area = pts => { let a = 0; for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; a += p[0] * q[1] - q[0] * p[1]; } return a / 2; };
const holds = (pts, [x, y]) => { let inside = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const a = pts[i], b = pts[j]; if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside; } return inside; };

// ---- a loop of points as a path: corners kept, smooth curves fitted between them
function fit(pts) {
  const n = pts.length, K = 5, turn = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const a = pts[(i - K + n) % n], b = pts[i], c = pts[(i + K) % n];
    const u = [b[0] - a[0], b[1] - a[1]], v = [c[0] - b[0], c[1] - b[1]];
    turn[i] = Math.abs(Math.atan2(u[0] * v[1] - u[1] * v[0], u[0] * v[0] + u[1] * v[1])) * 180 / Math.PI;
  }
  // a corner: the edge turns by more than 48 degrees over a few pixels, and more here than just beside
  const corners = [];
  for (let i = 0; i < n; i++) { if (turn[i] < 48) continue; let top = true; for (let d = -K; d <= K; d++) if (turn[(i + d + n) % n] > turn[i] || (turn[(i + d + n) % n] === turn[i] && d < 0)) { top = false; break; } if (top) corners.push(i); }
  if (!corners.length) { const p = new paper.Path({ segments: pts, closed: true, insert: false }); p.simplify(SMOOTH); return p; }
  const whole = new paper.Path({ closed: true, insert: false });
  corners.forEach((from, ci) => {
    const to = corners[(ci + 1) % corners.length], run = [];
    for (let i = from; ; i = (i + 1) % n) { run.push(pts[i]); if (i === to && run.length > 1) break; }
    const a = run[0], b = run[run.length - 1], len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    // a run that never leaves the straight line between its ends is a straight edge
    const bow = Math.max(...run.map(p => Math.abs((b[0] - a[0]) * (a[1] - p[1]) - (a[0] - p[0]) * (b[1] - a[1])) / len));
    const piece = new paper.Path({ segments: bow < 0.8 ? [a, b] : run, insert: false });
    if (bow >= 0.8) piece.simplify(SMOOTH);
    // the run starts where the last one ended: that point is one corner, with the curve of each side
    piece.segments.forEach((s, si) => {
      if (si === 0 && whole.segments.length) { whole.lastSegment.handleOut = s.handleOut; return; }
      whole.add(s.clone());
    });
  });
  // the last run ends on the first corner again
  if (whole.segments.length > 2 && whole.firstSegment.point.getDistance(whole.lastSegment.point) < 0.01) { whole.firstSegment.handleIn = whole.lastSegment.handleIn; whole.lastSegment.remove(); }
  // Anti-aliasing rounds a corner off. Where two edges meet at one, the corner is put back where their lines cross
  const segs = whole.segments, m = segs.length;
  for (let i = 0; i < m; i++) {
    const s = segs[i], inDir = s.handleIn.isZero() ? s.point.subtract(segs[(i - 1 + m) % m].point) : s.handleIn.multiply(-1), outDir = s.handleOut.isZero() ? segs[(i + 1) % m].point.subtract(s.point) : s.handleOut;
    if (Math.abs(inDir.getDirectedAngle(outDir)) < 40) continue;
    const a = s.point.subtract(inDir.normalize(4)), b = s.point.add(outDir.normalize(4)), u = inDir.normalize(), v = outDir.normalize(), det = u.x * v.y - u.y * v.x;
    if (Math.abs(det) < 0.2) continue;
    const t = ((b.x - a.x) * v.y - (b.y - a.y) * v.x) / det, x = a.add(u.multiply(t));
    if (x.getDistance(s.point) < 3) s.point = x;
  }
  return whole;
}

(async () => {
  const browser = await launch(), page = await browser.newPage();
  const url = `data:${MIME[path.extname(src).toLowerCase()]};base64,${fs.readFileSync(src).toString('base64')}`;
  const pic = await page.evaluate(async ({ url, size }) => {
    const img = new Image(); img.src = url; await img.decode();
    const iw = img.naturalWidth || 1000, ih = img.naturalHeight || 1000, k = size / Math.max(iw, ih), w = Math.round(iw * k), h = Math.round(ih * k);
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(img, 0, 0, w, h);
    const d = g.getImageData(0, 0, w, h).data;
    let s = ''; for (let i = 0; i < d.length; i += 0x8000) s += String.fromCharCode.apply(null, d.subarray(i, i + 0x8000));
    return { w, h, iw, ih, data: btoa(s) };
  }, { url, size: SIZE });
  await browser.close();
  const { w, h } = pic, d = Buffer.from(pic.data, 'base64'), N = w * h;

  // ---- what is behind the logo: nothing (a see-through picture), or the colour round the picture's edge
  const rim = [];
  for (let x = 0; x < w; x++) rim.push(x, (h - 1) * w + x);
  for (let y = 0; y < h; y++) rim.push(y * w, y * w + w - 1);
  const clear = rim.reduce((n, i) => n + d[i * 4 + 3], 0) / rim.length < 128;
  const med = c => { const v = rim.map(i => d[i * 4 + c]).sort((a, b) => a - b); return v[v.length >> 1]; };
  const bg = clear ? null : [med(0), med(1), med(2)];
  const far = (i, c) => Math.hypot(d[i * 4] - c[0], d[i * 4 + 1] - c[1], d[i * 4 + 2] - c[2]);
  const solid = i => clear ? d[i * 4 + 3] > 230 : far(i, bg) > 40;

  // ---- its flat colours: counted where a pixel and its neighbours agree, so that soft edges do not count
  const bins = new Map();
  for (let y = 1; y < h - 1; y += 2) for (let x = 1; x < w - 1; x += 2) {
    const i = y * w + x;
    if (!solid(i) || !solid(i + 1) || !solid(i + w)) continue;
    const c = [d[i * 4], d[i * 4 + 1], d[i * 4 + 2]];
    if (far(i + 1, c) > 14 || far(i + w, c) > 14) continue;
    const k = (c[0] >> 4) << 8 | (c[1] >> 4) << 4 | c[2] >> 4, b = bins.get(k) || bins.set(k, { n: 0, r: 0, g: 0, b: 0 }).get(k);
    b.n++; b.r += c[0]; b.g += c[1]; b.b += c[2];
  }
  const flat = [...bins.values()].map(b => ({ n: b.n, c: [b.r / b.n, b.g / b.n, b.b / b.n] })).sort((a, b) => b.n - a.n), all = flat.reduce((n, b) => n + b.n, 0);
  if (!all) throw new Error('nothing but the background was found in the picture. If the logo is pale on a pale background, give a picture with more contrast');
  const palette = [];
  for (const b of flat) {
    const like = palette.find(p => Math.hypot(p.c[0] - b.c[0], p.c[1] - b.c[1], p.c[2] - b.c[2]) < 44);
    if (like) { like.c = like.c.map((v, i) => (v * like.n + b.c[i] * b.n) / (like.n + b.n)); like.n += b.n; } else palette.push({ n: b.n, c: b.c.slice() });
  }
  const colours = palette.filter(p => p.n / all >= 0.006).sort((a, b) => b.n - a.n).slice(0, MOST);
  const hex = c => '#' + c.map(v => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase();

  // ---- how much of each pixel each colour covers
  const fields = colours.map(() => new Float32Array(N));
  for (let i = 0; i < N; i++) {
    const p = [d[i * 4], d[i * 4 + 1], d[i * 4 + 2]], al = d[i * 4 + 3] / 255;
    if (clear) {
      if (al <= 0) continue;
      let best = 0, at = Infinity;
      colours.forEach((c, k) => { const v = Math.hypot(p[0] - c.c[0], p[1] - c.c[1], p[2] - c.c[2]); if (v < at) { at = v; best = k; } });
      fields[best][i] = al;
      continue;
    }
    // a pixel on a soft edge lies between the background and one colour: how far along says how much it covers
    let best = -1, share = 0, off = 30;
    colours.forEach((c, k) => {
      const v = [c.c[0] - bg[0], c.c[1] - bg[1], c.c[2] - bg[2]], q = [p[0] - bg[0], p[1] - bg[1], p[2] - bg[2]], t = Math.max(0, Math.min(1, (q[0] * v[0] + q[1] * v[1] + q[2] * v[2]) / (v[0] * v[0] + v[1] * v[1] + v[2] * v[2])));
      const miss = Math.hypot(q[0] - v[0] * t, q[1] - v[1] * t, q[2] - v[2] * t);
      if (miss < off) { off = miss; best = k; share = t; }
    });
    if (best >= 0) { fields[best][i] = share; continue; }
    let near = -1, at = Math.hypot(p[0] - bg[0], p[1] - bg[1], p[2] - bg[2]);
    colours.forEach((c, k) => { const v = Math.hypot(p[0] - c.c[0], p[1] - c.c[1], p[2] - c.c[2]); if (v < at) { at = v; near = k; } });
    if (near >= 0) fields[near][i] = 1;
  }

  // ---- each colour's shapes: an outer edge with the holes inside it
  const parts = [];
  colours.forEach((c, k) => {
    const ls = loops(fields[k], w, h).map(pts => ({ pts, area: Math.abs(area(pts)) })).filter(l => l.area > N * 0.00006).sort((a, b) => b.area - a.area);
    // how many larger loops of the same colour hold this one: none or two is a shape, one or three is a hole in one
    ls.forEach((l, i) => { l.depth = 0; l.inside = -1; for (let j = i - 1; j >= 0; j--) if (holds(ls[j].pts, l.pts[0])) { l.depth++; if (l.inside < 0) l.inside = j; } });
    ls.forEach((l, i) => {
      if (l.depth % 2) return;
      const shape = new paper.CompoundPath({ children: [fit(l.pts), ...ls.filter(x => x.depth === l.depth + 1 && x.inside === i).map(x => fit(x.pts))], insert: false });
      parts.push({ fill: hex(c.c), d: O.toD(shape), area: l.area, nodes: shape.children.reduce((n, ch) => n + ch.segments.length, 0), holes: shape.children.length - 1 });
    });
  });
  if (!parts.length) throw new Error('no shape was found in the picture');
  parts.sort((a, b) => b.area - a.area);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">\n  <!-- Traced from ${path.basename(src)}. A faithful outline, not a finished mark: clean it, name its parts (id) and mark the accent (class="accent"). -->\n${parts.map((p, i) => `  <path id="part-${i + 1}" fill="${p.fill}" d="${p.d}"/>`).join('\n')}\n</svg>\n`);
  console.log(`${path.basename(src)} (${pic.iw} x ${pic.ih}), ${clear ? 'on nothing' : 'on ' + hex(bg)}: ${colours.length} colour${colours.length > 1 ? 's' : ''} (${colours.map(c => hex(c.c)).join(', ')}), ${parts.length} shape${parts.length > 1 ? 's' : ''}`);
  parts.forEach((p, i) => console.log(`  part-${i + 1}  ${p.fill}  ${p.nodes} points${p.holes ? `, ${p.holes} hole${p.holes > 1 ? 's' : ''}` : ''}  ${(p.area / N * 100).toFixed(1)}% of the picture`));
  if (flat.length > 60) console.log('  note: the picture has many shades (a gradient, a photo or a shadow). They were traced as flat colours');
  if (parts.length > 12) console.log('  note: many shapes were found. Text beside the logo is traced too: delete what is not the mark');
  console.log(`written: ${out}`);
})().catch(e => { console.error(e.message); process.exit(1); });
