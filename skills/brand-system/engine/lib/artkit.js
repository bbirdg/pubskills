// What every kind of mark draws its background art with: the two tones, the measuring of the area that is kept
// clear for a logo or words, and the lights that travel through a picture when it is animated.
// usage: const K = require('../artkit')(S)
const paper = require('paper');
const { PaperOffset } = require('paperjs-offset');

module.exports = S => {
  if (S.artkit) return S.artkit;
  const { NEUTRALS, PAPER, INK, WHITE, CLEARANCE, r } = S;
  paper.setup(new paper.Size(100, 100));

  // each shape is drawn at its large size; the PNG files come at that size and at the smaller ones
  const SHAPES = S.brand.art.shapes, SIZES = S.brand.art.sizes;
  // What a picture is drawn in. line: a quiet line, soft: a stronger one, lit: what stands in for the accent where a
  // brand has none, body and mark: the two quiet fills, low: how strong an accent is inside a quiet fill, frame: how
  // strong the Story frame is with an accent and without, glow: the light behind the Story mark, from its middle out
  const THEMES = [
    { id: '', label: 'Dark', back: INK, line: NEUTRALS['surface-3'], soft: NEUTRALS['text-3'], lit: WHITE, body: NEUTRALS['surface-1'], mark: NEUTRALS['surface-2'], low: 0.2, frame: [0.6, 0.5], stops: a => a.stops, glow: [NEUTRALS['surface-2'], INK, S.brand.colours.deep] },
    { id: 'light', label: 'Light', back: WHITE, line: PAPER['paper-line'], soft: PAPER['paper-soft'], lit: INK, body: NEUTRALS['paper-2'], mark: PAPER['paper-3'], low: 0.3, frame: [0.85, 0.9], stops: a => a.stopsLight, glow: [WHITE, NEUTRALS['paper-2'], PAPER['paper-3']] },
  ];

  const item = d => new paper.CompoundPath({ pathData: d, insert: false });
  // points along the edges of a shape, in its own units
  const edge = (it, step = 2) => { const out = []; for (const c of it.children && it.children.length ? it.children : [it]) for (let t = 0; t <= c.length; t += step) { const p = c.getPointAt(t); out.push([p.x, p.y]); } return out; };
  const tidy = d => d.replace(/-?\d+\.\d{3,}/g, n => String(+(+n).toFixed(2)));
  // a mark laid on the picture: its point `spot` (in its own units) lands on `to`, at k picture pixels per unit
  const lay = (spot, to, k) => ({ k, x: to[0] - spot[0] * k, y: to[1] - spot[1] * k });
  const put = (t, inner, extra = '') => `<g transform="translate(${r(t.x)} ${r(t.y)}) scale(${r(t.k, 5)})"${extra}>${inner}</g>`;
  const moved = (pts, t, shows = 1) => pts.map(([x, y]) => [x * t.k + t.x, y * t.k + t.y, shows]);
  const weight = (W, H) => Math.min(W, H) / 360;                 // line weight: 6 px on a 2160 side
  const clamp = v => Math.max(0, Math.min(1, v));
  const ease = v => v * v * (3 - 2 * v);
  // how far a point is from a box [x, y, w, h]
  const reach = ([x, y], [bx, by, bw, bh]) => Math.hypot(Math.max(bx - x, 0, x - bx - bw), Math.max(by - y, 0, y - by - bh));
  // the largest box of one proportion round a point that keeps every line at a distance (a little more than the check asks)
  function grow(edges, [cx, cy], aspect, W, H) {
    const m = W * CLEARANCE * 1.3, fits = w => { const b = [cx - w / 2, cy - w / aspect / 2, w, w / aspect]; return b[0] >= m && b[1] >= m && b[0] + b[2] <= W - m && b[1] + b[3] <= H - m && edges.every(p => reach(p, b) >= m); };
    let lo = 0, hi = W;
    for (let i = 0; i < 24; i++) { const w = (lo + hi) / 2; if (fits(w)) lo = w; else hi = w; }
    return [cx - lo / 2, cy - lo / aspect / 2, lo, lo / aspect];
  }
  // lines that die away towards the clear area: nothing shows at `off`, everything at `on` (two points of the picture)
  const fading = (off, on) => { const d = [on[0] - off[0], on[1] - off[1]], n = d[0] * d[0] + d[1] * d[1]; return ([x, y]) => clamp(((x - off[0]) * d[0] + (y - off[1]) * d[1]) / n); };
  // the same fade as a paint for strokes drawn inside a laid mark (the paint is given in the mark's own units)
  const fadePaint = (id, colour, off, on, t) => `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${r((off[0] - t.x) / t.k)}" y1="${r((off[1] - t.y) / t.k)}" x2="${r((on[0] - t.x) / t.k)}" y2="${r((on[1] - t.y) / t.k)}"><stop offset="0" stop-color="${colour}" stop-opacity="0"/><stop offset="1" stop-color="${colour}"/></linearGradient>`;

  // Light: where the light goes when a picture is animated. Nothing in a picture moves: light travels along lines and
  // across shapes that are already there. t: the laid mark the path belongs to (none: the picture itself).
  //   run: along one line, `laps` times in a loop, starting `phase` of the way round, with `len` of the line lit
  //   ripple: through a set of lines one after another, from the first to the last, `waves` times in a loop
  //   sheen: a band of light crossing a filled shape, from one point to another
  //   hop: one shape lit in several places, one place after another
  const run = (d, t, o = {}) => ({ run: d, t, sw: o.sw, paint: o.paint || WHITE, glow: o.glow || o.paint || WHITE, op: o.op || 0.5, laps: o.laps || 1, phase: o.phase || 0, len: o.len || 0.12 });

  // A thin frame just inside the picture's edges: its line, its points and the light that runs round it.
  // stops: the accent it runs through (none: one quiet tone)
  function frame(W, H, stops, th) {
    const m = Math.min(W, H), inset = m * 0.026, rx = m * 0.009, sw = weight(W, H) * 0.7, w = W - inset * 2, h = H - inset * 2, pts = [];
    for (let i = 0; i <= 200; i++) { const u = i / 200; pts.push([inset + w * u, inset, 1], [inset + w * u, H - inset, 1], [inset, inset + h * u, 1], [W - inset, inset + h * u, 1]); }
    return {
      defs: stops ? `<linearGradient id="edge" gradientUnits="userSpaceOnUse" x1="0" y1="${H}" x2="${W}" y2="0">${S.stopsSvg(stops)}</linearGradient>` : '',
      line: `<rect x="${r(inset)}" y="${r(inset)}" width="${r(w)}" height="${r(h)}" rx="${r(rx)}" fill="none" stroke="${stops ? 'url(#edge)' : th.soft}" stroke-opacity="${th.frame[stops ? 0 : 1]}" stroke-width="${r(sw)}"/>`, pts,
      light: run(`M${r(inset + rx)} ${r(inset)}h${r(w - rx * 2)}a${r(rx)} ${r(rx)} 0 0 1 ${r(rx)} ${r(rx)}v${r(h - rx * 2)}a${r(rx)} ${r(rx)} 0 0 1 ${r(-rx)} ${r(rx)}h${r(rx * 2 - w)}a${r(rx)} ${r(rx)} 0 0 1 ${r(-rx)} ${r(-rx)}v${r(rx * 2 - h)}a${r(rx)} ${r(rx)} 0 0 1 ${r(rx)} ${r(-rx)}z`, null, { sw, op: 0.8, glow: stops ? 'url(#edge)' : WHITE, len: 0.1 }),
    };
  }

  // the picture as a file. back: with its background. lights: what is put in place of the lit parts when it is animated
  const svg = (W, H, p, back, lights) => `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><defs>${back ? back.defs : ''}${p.defs}</defs>${back ? back.rect + (p.under || '') : ''}${p.body}${lights === undefined ? p.top || '' : lights}</svg>\n`;
  // how near the nearest line that shows comes to the clear area
  const nearest = (p, s) => p.edges.reduce((n, e) => e[2] < 0.05 || e[0] < 0 || e[1] < 0 || e[0] > s.w || e[1] > s.h ? n : Math.min(n, reach(e, p.clear)), Infinity);
  // each mark's kind gives a family of pictures: { id, label, colours, back(theme), variants: [{ id, label, draw, note, light }] }
  const families = () => S.marks.map(m => m.art).filter(Boolean);
  const stem = (f, v, c, s, th) => [f.id, v.id, c.id, s.id, th.id].filter(Boolean).join('-');
  // every picture: family, kind, colour, shape and tone
  const pictures = () => families().flatMap(f => f.variants.flatMap(v => SHAPES.flatMap(s => f.colours.flatMap(c => THEMES.map(th => ({ f, v, s, c, th, name: stem(f, v, c, s, th), dir: `art/${f.id}` }))))));

  return S.artkit = { paper, PaperOffset, SHAPES, SIZES, THEMES, item, edge, tidy, lay, put, moved, weight, clamp, ease, reach, grow, fading, fadePaint, run, frame, svg, nearest, families, stem, pictures };
};
