// Outlines: reading shapes as paths, writing them back as plain path data, and measuring them. Used by the mark
// step (which reads a mark's SVG) and the trace step (which turns a picture into one).
const paper = require('paper');
const { PaperOffset } = require('paperjs-offset');
paper.setup(new paper.Size(100, 100));

const n2 = v => +v.toFixed(2);
// One closed path as path data in absolute coordinates with two decimals: M, then L for straight edges and C for
// curves, then Z. A closing point that repeats the first one is merged, so every corner has one node.
function contour(p) {
  const first = p.firstSegment, last = p.lastSegment;
  if (p.segments.length > 2 && first.point.getDistance(last.point) < 0.01) { first.handleIn = last.handleIn; last.remove(); }
  const s = p.segments, k = s.length;
  let d = `M${n2(s[0].point.x)} ${n2(s[0].point.y)}`;
  for (let i = 1; i <= k; i++) {
    const a = s[i - 1], b = s[i % k];
    if (a.handleOut.isZero() && b.handleIn.isZero()) { if (i < k) d += `L${n2(b.point.x)} ${n2(b.point.y)}`; continue; }
    const c1 = a.point.add(a.handleOut), c2 = b.point.add(b.handleIn);
    d += `C${n2(c1.x)} ${n2(c1.y)} ${n2(c2.x)} ${n2(c2.y)} ${n2(b.point.x)} ${n2(b.point.y)}`;
  }
  return d + 'Z';
}
const children = it => it.children && it.children.length ? it.children : [it];
// a shape (one path or several, such as a shape with a hole) as path data
const toD = it => children(it).filter(c => c.segments.length > 1).map(contour).join('');
const item = d => new paper.CompoundPath({ pathData: d, insert: false });
// points along the edges of a shape, `step` units apart
function sample(it, step = 2) {
  const out = [];
  for (const c of children(it)) for (let t = 0; t <= c.length; t += step) { const p = c.getPointAt(t); out.push([p.x, p.y]); }
  return out;
}
// the two points of a set that are furthest apart (the long way across a shape)
function farthest(pts) {
  // the pair is found among the points furthest out in 32 directions, which is where it has to be
  const rim = new Set();
  for (let i = 0; i < 32; i++) { const a = i * Math.PI / 16, ux = Math.cos(a), uy = Math.sin(a); let best = 0, at = -Infinity; pts.forEach((p, j) => { const v = p[0] * ux + p[1] * uy; if (v > at) { at = v; best = j; } }); rim.add(best); }
  const r = [...rim].map(j => pts[j]);
  let pair = [r[0], r[0]], far = -1;
  for (const a of r) for (const b of r) { const d = Math.hypot(a[0] - b[0], a[1] - b[1]); if (d > far) { far = d; pair = [a, b]; } }
  return pair;
}
// how near two sets of points come to each other
function gap(a, b) {
  let near = Infinity;
  for (const p of a) for (const q of b) { const d = (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2; if (d < near) near = d; }
  return Math.sqrt(near);
}
// The roomiest place in a shape: the point inside any of `shapes` that is furthest from every edge point, found on
// a grid and then looked at more closely twice. Returns { at: [x, y], radius }.
function roomiest(shapes, edges, bounds) {
  const [bx, by, bw, bh] = bounds, inside = (x, y) => { const pt = new paper.Point(x, y); return shapes.some(s => s.contains(pt)); };
  const dist = (x, y) => { let near = Infinity; for (const e of edges) { const d = (e[0] - x) ** 2 + (e[1] - y) ** 2; if (d < near) near = d; } return Math.sqrt(near); };
  let best = { at: [bx + bw / 2, by + bh / 2], radius: 0 }, box = [bx, by, bw, bh], n = 72;
  for (let pass = 0; pass < 3; pass++) {
    const [x0, y0, w, h] = box;
    for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) {
      const x = x0 + w * i / n, y = y0 + h * j / n;
      if (!inside(x, y)) continue;
      const d = dist(x, y);
      if (d > best.radius) best = { at: [x, y], radius: d };
    }
    const w2 = w / n * 4, h2 = h / n * 4;
    box = [best.at[0] - w2 / 2, best.at[1] - h2 / 2, w2, h2]; n = 24;
  }
  return { at: best.at.map(n2), radius: n2(best.radius) };
}

// The roomiest place for a lockup: the middle of the widest box, `aspect` times as wide as it is high, that lies
// inside one of `shapes` with no edge point in it. Returns { at: [x, y], width }.
function roomiestBox(shapes, edges, bounds, aspect) {
  const [bx, by, bw, bh] = bounds, inside = (x, y) => { const pt = new paper.Point(x, y); return shapes.some(s => s.contains(pt)); };
  // a box of width w round (x, y) holds an edge point unless w is at most the larger of twice its distance across and 2 * aspect times its distance up
  const widest = (x, y) => { let w = Infinity; for (const e of edges) { const v = Math.max(2 * Math.abs(e[0] - x), 2 * aspect * Math.abs(e[1] - y)); if (v < w) w = v; } return w; };
  let best = { at: [bx + bw / 2, by + bh / 2], width: 0 }, box = [bx, by, bw, bh], n = 72;
  for (let pass = 0; pass < 3; pass++) {
    const [x0, y0, w, h] = box;
    for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) {
      const x = x0 + w * i / n, y = y0 + h * j / n;
      if (!inside(x, y)) continue;
      const v = widest(x, y);
      if (v > best.width) best = { at: [x, y], width: v };
    }
    const w2 = w / n * 4, h2 = h / n * 4;
    box = [best.at[0] - w2 / 2, best.at[1] - h2 / 2, w2, h2]; n = 24;
  }
  return { at: best.at.map(n2), width: n2(best.width) };
}

module.exports = { paper, PaperOffset, n2, contour, toD, item, children, sample, farthest, gap, roomiest, roomiestBox };
