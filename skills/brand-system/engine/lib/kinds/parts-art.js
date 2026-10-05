// Background art for a flat mark made of parts: six kinds of picture drawn from the mark itself, with nothing
// written on them. Each names the area where a logo or words may go, and says where its light runs when it is
// animated. The layouts were set on a wide mark; a square or tall one is drawn smaller where it would crowd the
// clear area, and the art step measures every picture, so a line near that area stops the run.
module.exports = (kind, S) => {
  const K = require('../artkit')(S);
  const { item, edge, tidy, lay, put, moved, weight, clamp, ease, reach, grow, fading, fadePaint, run, frame, PaperOffset } = K;
  const { ACCENTS, NEUTRALS, WHITE, CLEARANCE, r, brand: B } = S;
  const [bx, by, bw, bh] = kind.bounds, INSIDE = kind.inside, AXIS = kind.AXIS;
  const U = kind.U;
  const PARTS = kind.order.map(p => item(p.d)), EDGE = PARTS.flatMap(p => edge(p));
  const LIT = kind.order.filter(p => p.accent), QUIET = kind.order.filter(p => !p.accent), LIT_D = LIT.map(p => p.d).join('');
  const LIT_ITEMS = LIT.map(p => item(p.d)), LB = LIT_ITEMS.map(i => i.bounds).reduce((a, b) => a.unite(b));      // the accent parts, and the box round them
  // its colours: plain, where a brand has no accent, then one for each accent its brands wear
  const plain = kind.brands.filter(b => !b.accent).map(b => b.id);
  const COLOURS = [
    ...(plain.length || !kind.accents.length ? [{ id: 'plain', label: B.tone === 'light' ? 'Ink' : 'White', accent: null, brands: plain }] : []),
    ...kind.accents.map(k => ({ id: k, label: ACCENTS[k].label, accent: k, brands: kind.brands.filter(b => b.accent === k).map(b => b.id) })),
  ];
  // the accent as a paint along its line of the mark, in the mark's own units
  const accent = (c, th) => c.accent ? `<linearGradient id="acc" gradientUnits="userSpaceOnUse" ${kind.AXIS_ATTR}>${S.stopsSvg(th.stops(ACCENTS[c.accent]))}</linearGradient>` : '';
  // the accent, or what stands in for it where a brand has none (white on dark, ink on light)
  const lit = (c, th) => c.accent ? 'url(#acc)' : th.lit;
  // the mark as lines. line: the paint of the quiet parts, strong: the paint of the accent parts
  const strokes = (sw, line, strong) => `<g fill="none" stroke-width="${r(sw, 3)}" stroke-linejoin="round">${kind.order.map(p => `<path ${p.accent ? strong : line} d="${p.d}"/>`).join('')}</g>`;
  // light along the mark's outlines: quiet on the quiet parts, strong on the accent parts, each starting a little later
  const runs = (t, sw, c, th, quiet = 0.45, strong = 0.8) => [
    ...QUIET.map((p, i) => run(p.d, t, { sw, op: quiet, phase: i * 0.55 % 1 })),
    ...LIT.map((p, i) => run(p.d, t, { sw, op: strong, glow: lit(c, th), phase: (0.3 + i * 0.55) % 1 }))];

  // Outline: the mark's outline, drawn so large that its roomiest place is empty. The quiet parts in a quiet line,
  // the accent parts' line in the accent, or in white. The banners are this picture with a lockup in the middle.
  function outline(W, H, c, th) {
    const tall = H > W, to = [W / 2, H * (tall ? 0.42 : 0.5)], t = lay(INSIDE, to, W * (tall ? kind.scale.tall : kind.scale.wide) / bw), edges = moved(EDGE, t), sw = weight(W, H) / t.k;
    return { defs: accent(c, th), body: put(t, strokes(sw, `stroke="${th.line}"`, `stroke="${lit(c, th)}"`)), edges, clear: grow(edges, to, tall ? 2.4 : 3.6, W, H), lights: runs(t, sw, c, th) };
  }

  // Echo: the outline with its contours spreading out from it, each further and fainter than the last
  let rings;
  const contours = () => rings || (rings = Array.from({ length: 12 }, (_, i) => {
    const u = PARTS.map(p => PaperOffset.offset(p, (26 * 1.3 ** i + 14 * i) * U, { join: 'round', insert: false })).reduce((a, b) => a.unite(b, { insert: false }));
    return { d: tidy(u.pathData), pts: edge(u, 4), shows: (1 - i / 12) ** 1.1 };      // shows: how strong the line is, 1 for the nearest
  }));
  function echo(W, H, c, th) {
    const wide = W > H, t = lay([bx + bw / 2, by + bh / 2], wide ? [W * 0.71, H * 0.5] : [W * 0.5, H * 0.68], Math.min(W * (wide ? 0.44 : 0.66) / bw, H * (wide ? 0.62 : 0.5) / bh));
    const off = wide ? [W * 0.44, 0] : [0, H * 0.38], on = wide ? [W * 0.58, 0] : [0, H * 0.52], shows = fading(off, on), sw = weight(W, H) / t.k;
    const edges = [...moved(EDGE, t), ...contours().flatMap(o => moved(o.pts, t).map(p => [p[0], p[1], o.shows * shows(p)]))];
    return {
      defs: accent(c, th) + fadePaint('fade', th.soft, off, on, t) + fadePaint('fadelit', WHITE, off, on, t),
      body: put(t, `<g fill="none" stroke="url(#fade)" stroke-width="${r(sw * 0.75, 3)}">${contours().map(o => `<path opacity="${r(o.shows * 0.72, 3)}" d="${o.d}"/>`).join('')}</g>` + strokes(sw, `stroke="${th.soft}" stroke-opacity="0.7"`, `stroke="${lit(c, th)}"`)),
      edges, clear: wide ? [W * 0.07, H * 0.3, W * 0.32, H * 0.4] : [W * 0.12, H * 0.1, W * 0.76, H * (H > W ? 0.2 : 0.22)],
      lights: [{ ripple: contours().map(o => ({ d: o.d, shows: o.shows })), t, sw: sw * 0.75, paint: 'url(#fadelit)', op: 0.6, waves: 2 }, ...LIT.map(p => run(p.d, t, { sw, op: 0.8, glow: lit(c, th) }))],
    };
  }

  // Sweep: the accent parts alone, as one sweep of the accent across the picture
  function sweep(W, H, c, th) {
    // wide: the sweep fills the left, the right is clear. Tall and square: it fills the bottom, the top is clear
    const tall = H > W, wide = W > H;
    const t = lay([LB.x, LB.y], tall ? [W * -0.1, H * 0.42] : wide ? [W * -0.04, H * 0.14] : [W * -0.04, H * 0.34], Math.min(H * (tall ? 0.74 : wide ? 1.18 : 0.92) / LB.height, W * (tall ? 1.3 : wide ? 0.66 : 1.1) / LB.width));
    return {
      defs: accent(c, th), body: put(t, LIT.map(p => `<path fill="${lit(c, th)}" d="${p.d}"/>`).join('')), edges: LIT_ITEMS.flatMap(i => moved(edge(i), t)),
      clear: tall ? [W * 0.12, H * 0.1, W * 0.76, H * 0.2] : wide ? [W * 0.66, H * 0.28, W * 0.28, H * 0.44] : [W * 0.12, H * 0.08, W * 0.76, H * 0.18],
      // on a white sweep the light shows as a soft shade, since nothing is lighter than white
      lights: [{ sheen: LIT_D, t, from: AXIS.slice(0, 2), to: AXIS.slice(2), paint: c.accent ? WHITE : NEUTRALS['text-2'], op: c.accent ? 0.4 : 0.75, width: 0.5 }],
    };
  }

  // Pattern: small marks in rows, all in one quiet tone, thinning out round the clear area. One has its accent lit.
  function pattern(W, H, c, th) {
    const pitch = Math.min(W, H) / 5.2, rowH = pitch * 0.6, k = Math.min(pitch * 0.5 / bw, rowH * 0.58 / bh), bwp = bw * k, bhp = bh * k, m = W * CLEARANCE * 1.3;
    const clear = W > H ? [W * 0.31, H * 0.36, W * 0.38, H * 0.28] : H > W ? [W * 0.14, H * 0.4, W * 0.72, H * 0.2] : [W * 0.2, H * 0.38, W * 0.6, H * 0.24];
    const first = W > H ? [W * 0.77, H * 0.26] : H > W ? [W * 0.68, H * 0.22] : [W * 0.74, H * 0.2];
    const marks = [];
    for (let j = -1, rows = Math.ceil(H / rowH) + 1; j <= rows; j++) for (let i = -1, cols = Math.ceil(W / pitch) + 1; i <= cols; i++) {
      // the rows are centred on the picture, and every other row is moved half a step along
      const x = W / 2 + (i - Math.round(W / pitch / 2)) * pitch + (j % 2 ? pitch / 2 : 0) - bwp / 2, y = H / 2 + (j - Math.round(H / rowH / 2)) * rowH - bhp / 2;
      const d = reach([x, y], [clear[0] - bwp, clear[1] - bhp, clear[2] + bwp, clear[3] + bhp]);      // from the mark's own box to the clear area
      if (d < m) continue;
      const shows = ease(clamp((d - m) / (pitch * 1.5)));
      if (shows >= 0.06) marks.push({ x, y, shows, at: [x + bwp / 2, y + bhp / 2] });
    }
    const far = (a, b) => Math.hypot(a.at[0] - b.at[0], a.at[1] - b.at[1]);
    const one = marks.reduce((a, b) => far(b, { at: first }) < far(a, { at: first }) ? b : a);
    // when it is animated the light passes round the picture: six whole marks as far from each other as they can be
    const whole = marks.filter(b => b.shows > 0.98 && b.x > 0 && b.y > 0 && b.x + bwp < W && b.y + bhp < H), tour = [one];
    while (tour.length < 6 && whole.some(b => !tour.includes(b))) tour.push(whole.filter(b => !tour.includes(b)).reduce((a, b) => Math.min(...tour.map(o => far(b, o))) > Math.min(...tour.map(o => far(a, o))) ? b : a));
    const turn = b => Math.atan2(b.at[1] - H / 2, b.at[0] - W / 2), from = turn(one);
    tour.sort((a, b) => ((turn(a) - from + 7) % (2 * Math.PI)) - ((turn(b) - from + 7) % (2 * Math.PI)));
    const at = b => `translate(${r(b.x - bx * k)} ${r(b.y - by * k)}) scale(${r(k, 5)})`;
    return {
      defs: accent(c, th) + `<g id="f" fill="${th.line}">${kind.order.map(p => `<path d="${p.d}"/>`).join('')}</g>`,
      body: marks.map(b => `<use xlink:href="#f" transform="${at(b)}"${b.shows < 1 && b !== one ? ` opacity="${r(b.shows, 3)}"` : ''}/>`).join(''),
      top: `<path transform="${at(one)}" fill="${lit(c, th)}" d="${LIT_D}"/>`,
      edges: marks.flatMap(b => [[b.x, b.y], [b.x + bwp, b.y], [b.x, b.y + bhp], [b.x + bwp, b.y + bhp]].map(p => [p[0], p[1], b.shows])), clear,
      lights: [{ hop: tour.map(at), d: LIT_D, paint: lit(c, th) }],
    };
  }

  // Shadow: the mark close up and filled, tone on tone: the quiet parts a shade above the background, the accent parts a low accent
  // the mark filled in one quiet tone, its accent parts a low accent, or `plain` where the brand has none
  const fills = (c, th, tone, plain) => kind.order.map(p => p.accent ? `<path fill="${c.accent ? 'url(#acc)' : plain}"${c.accent ? ` fill-opacity="${th.low}"` : ''} d="${p.d}"/>` : `<path fill="${tone}" d="${p.d}"/>`).join('');
  function shadow(W, H, c, th) {
    const tall = H > W, to = tall ? [W * 0.5, H * 0.34] : [W * 0.52, H * 0.4], t = lay(INSIDE, to, W * (tall ? 3 * (kind.scale.tall / 1.9) : (W > H ? 1.75 : 2.3) * (kind.scale.wide / 1.29)) / bw), edges = moved(EDGE, t);
    return { defs: accent(c, th), body: put(t, fills(c, th, th.body, th.line)), edges, clear: grow(edges, to, tall ? 2.2 : 3.2, W, H), lights: runs(t, weight(W, H) * 0.8 / t.k, c, th, 0.22, 0.55) };
  }

  // Story: the mark very large and in one quiet tone, running off the left edge, a soft light behind it, and a thin
  // frame in the accent just inside the picture's edges.
  function story(W, H, c, th) {
    const wide = W > H, tall = H > W, f = frame(W, H, c.accent && th.stops(ACCENTS[c.accent]), th);
    // the middle of the mark's right edge lands on a point of the picture
    const k = wide ? W * 0.6 / bw : Math.min(W * (tall ? 1.55 : 1) / bw, H * (tall ? 0.6 : 0.7) / bh);
    const t = lay([bx + bw, by + bh / 2], wide ? [W * 0.44, H * 0.52] : tall ? [W * 0.9, H * 0.52] : [W * 0.76, H * 0.58], k), at = [t.x + bw * 0.7 * t.k, t.y + bh * 0.5 * t.k];
    return {
      defs: accent(c, th) + f.defs + `<radialGradient id="glow" gradientUnits="userSpaceOnUse" cx="${r(at[0])}" cy="${r(at[1])}" r="${r(Math.max(W, H) * 0.7)}">${[0, 0.5, 1].map((o, i) => `<stop offset="${o}" stop-color="${th.glow[i]}"/>`).join('')}</radialGradient>`,
      under: '<rect width="100%" height="100%" fill="url(#glow)"/>',
      body: put(t, fills(c, th, th.mark, th.mark)) + f.line,
      edges: [...moved(EDGE, t), ...f.pts], clear: wide ? [W * 0.56, H * 0.25, W * 0.36, H * 0.5] : [W * 0.12, H * 0.07, W * 0.76, H * (tall ? 0.12 : 0.13)],
      lights: [f.light, ...runs(t, weight(W, H) * 0.8 / t.k, c, th, 0.18, 0.45)],
    };
  }

  const all = [
    { id: 'outline', label: 'Outline', draw: outline, note: 'The mark\'s outline, drawn large. The banners are this picture with a lockup in the middle.', light: 'Light runs along the outline, on the accent in its colour.' },
    { id: 'echo', label: 'Echo', draw: echo, note: 'The outline with its contours spreading out and fading.', light: 'Light ripples outward through the contours.' },
    { id: 'sweep', label: 'Sweep', draw: sweep, note: 'The accent part alone, as one sweep of colour.', light: 'A sheen passes along it.' },
    { id: 'pattern', label: 'Pattern', draw: pattern, note: 'Small marks in rows, in one quiet tone. One has its accent lit.', light: 'The lit accent passes from mark to mark.' },
    { id: 'shadow', label: 'Shadow', draw: shadow, note: 'The mark close up, tone on tone.', light: 'Light runs along the mark\'s edge.' },
    { id: 'story', label: 'Story', draw: story, note: 'The mark very large and quiet at the left edge, inside a thin frame.', light: 'Light runs round the frame and along the mark\'s edge.' },
  ];
  // a mark's settings may leave kinds out ("art": { "skip": ["pattern"] }) or put its own words on one
  const skip = (kind.def.art && kind.def.art.skip) || [], words = (kind.def.art && kind.def.art.words) || {};
  return {
    id: kind.id, label: kind.label, colours: COLOURS, back: th => ({ defs: '', rect: `<rect width="100%" height="100%" fill="${th.back}"/>` }),
    // a mark with no roomy place inside has no Outline or Shadow: both seat a logo inside the mark
    variants: all.filter(v => !skip.includes(v.id) && (kind.roomy || !['outline', 'shadow'].includes(v.id))).map(v => ({ ...v, ...(words[v.id] || {}) })),
  };
};
