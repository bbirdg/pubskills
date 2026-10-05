# The second half of the fonts step: the brand's own font family, built from open-licensed fonts.
# Each weight is cut from the variable font of every source. Where there is a second source, its script is joined
# to the first one's. The result is named, given one set of line metrics, and written as TTF and WOFF2, with the
# brand's own characters added to every weight (glyphs.js draws them; the check mark and the cross are drawn here
# in each weight's own stroke). Every source must be under the SIL Open Font License, which allows all of this as
# long as the family is renamed and keeps the licence: its text is written next to the fonts.
# A font for titles can then be cut from the heaviest weight: see "the display cut" below.
# usage: node run.js fonts <brand folder>        needs: fonttools, brotli; glyphs.js runs first and writes the plan
import os, sys, io, json, shutil, re
from math import hypot, sqrt, sin, cos, radians
from fontTools.ttLib import TTFont
from fontTools.ttLib.tables._g_l_y_f import flagOverlapSimple
from fontTools.varLib import instancer
from fontTools import subset, merge
from fontTools.pens.basePen import BasePen
from fontTools.pens.recordingPen import RecordingPen
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.pens.cu2quPen import Cu2QuPen
from fontTools.pens.boundsPen import BoundsPen

def plan_file(argv):
    args = [a for a in argv if not a.startswith('--')]
    out = argv[argv.index('--out') + 1] if '--out' in argv else None
    if out: args = [a for a in args if a != out]
    for flag in ('--with',):
        if flag in argv: args = [a for a in args if a != argv[argv.index(flag) + 1]]
    if not args: sys.exit('give the brand folder: the one that holds brand/brand.json')
    return os.path.join(os.path.abspath(out), '.build', 'font-plan.json') if out else os.path.join(os.path.abspath(args[0]), '.build', 'font-plan.json')

with open(plan_file(sys.argv[1:]), encoding='utf-8') as fh: PLAN = json.load(fh)
OUT = PLAN['out']
FAMILY, VERSION, VENDOR, BRAND = PLAN['family'], PLAN['version'], PLAN['vendor'], PLAN['brand']
NINE = [(100, 'Thin'), (200, 'ExtraLight'), (300, 'Light'), (400, 'Regular'), (500, 'Medium'), (600, 'SemiBold'), (700, 'Bold'), (800, 'ExtraBold'), (900, 'Black')]
# what is taken from a second source: its script with its marks, digits, punctuation and joining controls.
# Arabic is the one this was built and tested for; the others follow the same path
SCRIPTS = {
    'arabic': ([(0x0600, 0x06FF), (0x0750, 0x077F), (0x08A0, 0x08FF), (0xFB50, 0xFDFF), (0xFE70, 0xFEFF)], [0x200C, 0x200D, 0x200E, 0x200F, 0x25CC]),
    'hebrew': ([(0x0590, 0x05FF), (0xFB1D, 0xFB4F)], [0x200E, 0x200F, 0x25CC]),
    'cyrillic': ([(0x0400, 0x052F), (0x2DE0, 0x2DFF), (0xA640, 0xA69F)], []),
    'greek': ([(0x0370, 0x03FF), (0x1F00, 0x1FFF)], []),
    'thai': ([(0x0E00, 0x0E7F)], [0x200B, 0x25CC]),
    'devanagari': ([(0x0900, 0x097F), (0xA8E0, 0xA8FF), (0x1CD0, 0x1CFF)], [0x200C, 0x200D, 0x25CC]),
}
def wanted(face):
    spans, singles = (face['ranges'], []) if face.get('ranges') else SCRIPTS.get(face['script']) or sys.exit(f"fonts: no list of characters for the script \"{face['script']}\". Give the source its own \"ranges\", as pairs of first and last code point")
    return [c for a, b in spans for c in range(a, b + 1)] + singles

def cut(face, weight):
    font = TTFont(face['file'])
    return instancer.instantiateVariableFont(font, {a.axisTag: weight if a.axisTag == 'wght' else a.defaultValue for a in font['fvar'].axes}, inplace=False)

def only(font, chars):
    opts = subset.Options()
    opts.layout_features = ['*']; opts.name_IDs = ['*']; opts.notdef_outline = True; opts.glyph_names = True
    opts.legacy_kern = False; opts.drop_tables += ['STAT', 'MVAR']
    sub = subset.Subsetter(opts)
    sub.populate(unicodes=[c for c in chars if c in font.getBestCmap()])
    sub.subset(font)
    return font

def reload(font):
    buf = io.BytesIO(); font.save(buf); buf.seek(0)
    return buf

# what the source says about itself: its version, copyright line, designer and licence
def credit(face):
    font = TTFont(face['file']); n = font['name'].getDebugName
    if 'fvar' not in font or not any(a.axisTag == 'wght' for a in font['fvar'].axes):
        sys.exit(f"fonts: {os.path.basename(face['file'])} is not a variable font with a weight axis. Use the family's variable file, the one with [wght] in its name")
    if 'glyf' not in font: sys.exit(f"fonts: {os.path.basename(face['file'])} has no TrueType outlines. Use the family's .ttf variable file")
    text = ''
    if face.get('licence'):
        with open(face['licence'], encoding='utf-8') as fh: text = fh.read()
    said = ' '.join([n(13) or '', text])
    if 'Open Font License' not in said and 'OPEN FONT LICENSE' not in said:
        sys.exit(f"fonts: {face['name']} does not say it is under the SIL Open Font License. Only fonts under that licence may be renamed, joined and given new characters, so the family is not built. Use the font as it is, or choose an open one")
    wght = next(a for a in font['fvar'].axes if a.axisTag == 'wght')
    # a name the licence keeps for the original: the new family may not use it
    kept = [m.strip() for m in re.findall(r'Reserved Font Names?\s+["“]?([^."”\n]+)', ' '.join([n(0) or '', text]))]
    for name in kept:
        for word in re.split(r'\s+and\s+|,\s*', name):
            word = word.strip().strip('"\'')
            if word and word.lower() in FAMILY.lower(): sys.exit(f"fonts: the licence of {face['name']} keeps the name \"{word}\" for the original, so the new family cannot be called \"{FAMILY}\". Choose another name")
    return {'script': face['script'], 'name': face['name'], 'version': n(5), 'copyright': (n(0) or '').strip(), 'designer': (n(9) or n(8) or '').strip(), 'text': text, 'range': (wght.minValue, wght.maxValue)}

Script = lambda c: c['script'][0].upper() + c['script'][1:]

def names(font, style, credits, family=FAMILY, about=PLAN['about']):
    table = font['name']; table.names = []
    linked = style in ('Regular', 'Bold')
    ps = f"{family.replace(' ', '')}-{style}"
    if len(credits) > 1:
        designers = ' '.join(f"{c['designer']} ({Script(c)})." for c in credits) + f' Joined and mastered for {BRAND}.'
        made = f"{about}: the {Script(credits[0])} of {credits[0]['name']} with " + ' and '.join(f"the {Script(c)} of {c['name']}" for c in credits[1:]) + f", as one family for {'both' if len(credits) == 2 else 'all its'} scripts."
    else:
        designers = f"{credits[0]['designer']}. Renamed and mastered for {BRAND}."
        made = f"{about}: {credits[0]['name']}, renamed, with the brand's own characters."
    rec = {
        0: f"Copyright {PLAN['year']} The {FAMILY} Project Authors. " + ' '.join(c['copyright'] for c in credits),
        1: family if linked else f'{family} {style}', 2: style if linked else 'Regular',
        3: f'{VERSION};{VENDOR};{ps}', 4: f'{family} {style}', 5: f'Version {VERSION}', 6: ps,
        8: BRAND, 9: designers, 10: made, 11: PLAN['url'],
        13: 'This Font Software is licensed under the SIL Open Font License, Version 1.1. This license is available with a FAQ at: https://openfontlicense.org',
        14: 'https://openfontlicense.org',
    }
    if not rec[11]: del rec[11]
    if not linked: rec[16], rec[17] = family, style
    for nid, text in rec.items(): table.setName(text, nid, 3, 1, 0x409)

def master(font, weight, style, lines, scripts):
    os2, hhea, head, post = font['OS/2'], font['hhea'], font['head'], font['post']
    os2.usWeightClass = weight; os2.achVendID = VENDOR
    os2.fsSelection = (os2.fsSelection & ~0b1100001) | 0x80 | (0x20 if style == 'Bold' else 0x40 if style == 'Regular' else 0)   # use typo metrics
    head.macStyle = 1 if style == 'Bold' else 0
    head.fontRevision = float(VERSION)
    # one set of line metrics for every script; the window values are tall enough that no mark is ever clipped
    os2.sTypoAscender, os2.sTypoDescender, os2.sTypoLineGap = lines['asc'], lines['desc'], 0
    hhea.ascent, hhea.descent, hhea.lineGap = lines['asc'], lines['desc'], 0
    os2.usWinAscent, os2.usWinDescent = lines['winAsc'], lines['winDesc']
    for script, bit in (('arabic', 6), ('hebrew', 5), ('cyrillic', 2), ('greek', 3), ('thai', 16)):      # the code page of each joined script, next to the first one's
        if script in scripts: os2.ulCodePageRange1 |= (1 << bit)
    post.italicAngle = 0
    for tag in ('STAT', 'MVAR', 'avar', 'fvar', 'gvar', 'HVAR'):
        if tag in font: del font[tag]

# ---- the brand's own characters
# an outline from the plan as a glyph: its curves are turned into the kind a TrueType font holds. The plan draws
# for capitals 700 units high; k makes the outline as large as this font's own capitals are
def drawn(contours, k=1):
    pen = TTGlyphPen(None); q = Cu2QuPen(pen, 0.5 * k)
    z = (lambda v: v) if k == 1 else (lambda v: v * k)
    for c in contours:
        for s in c:
            if s[0] == 'M': q.moveTo((z(s[1]), z(s[2])))
            elif s[0] == 'L': q.lineTo((z(s[1]), z(s[2])))
            else: q.curveTo((z(s[1]), z(s[2])), (z(s[3]), z(s[4])), (z(s[5]), z(s[6])))
        q.closePath()
    return pen.glyph()

# straight-edged shapes, each a list of points, as a glyph. They are turned clockwise, as outer contours must be
def cornered(shapes):
    pen = TTGlyphPen(None)
    for pts in shapes:
        if sum(a[0] * b[1] - b[0] * a[1] for a, b in zip(pts, pts[1:] + pts[:1])) > 0: pts = pts[::-1]
        pen.moveTo(pts[0])
        for p in pts[1:]: pen.lineTo(p)
        pen.closePath()
    return pen.glyph()

# a stroke `w` thick through the points, with square ends and sharp corners
def stroke(pts, w):
    def side(s):
        lines = []
        for a, b in zip(pts, pts[1:]):
            n = hypot(b[0] - a[0], b[1] - a[1]); o = (-(b[1] - a[1]) / n * s, (b[0] - a[0]) / n * s)
            lines.append(((a[0] + o[0], a[1] + o[1]), (b[0] + o[0], b[1] + o[1])))
        out = [lines[0][0]]
        for (p1, p2), (p3, p4) in zip(lines, lines[1:]):      # where two offset edges meet
            d = (p1[0] - p2[0]) * (p3[1] - p4[1]) - (p1[1] - p2[1]) * (p3[0] - p4[0])
            t = ((p1[0] - p3[0]) * (p3[1] - p4[1]) - (p1[1] - p3[1]) * (p3[0] - p4[0])) / d
            out.append((p1[0] + t * (p2[0] - p1[0]), p1[1] + t * (p2[1] - p1[1])))
        return out + [lines[-1][1]]
    return [(round(x), round(y)) for x, y in side(w / 2) + side(-w / 2)[::-1]]

def brand(font):
    glyf, hmtx, gs = font['glyf'], font['hmtx'], font.getGlyphSet()
    pen = BoundsPen(gs); gs[font.getBestCmap()[ord('I')]].draw(pen)
    stem = pen.bounds[2] - pen.bounds[0]                       # how thick this weight's upright strokes are
    pen = BoundsPen(gs); gs[font.getBestCmap()[ord('H')]].draw(pen)
    k = pen.bounds[3] / PLAN['cap']                            # this font's capitals against the 700 units the plan draws for
    if abs(k - 1) < 0.002: k = 1
    side = PLAN['side'] * k; at = (lambda x, y: (x, y)) if k == 1 else (lambda x, y: (x * k, y * k))
    def add(name, glyph, advance, codes):
        glyf[name] = glyph
        if name not in font.getGlyphOrder(): font.setGlyphOrder(font.getGlyphOrder() + [name])
        glyph.recalcBounds(glyf)
        hmtx[name] = (advance, glyph.xMin)
        for table in font['cmap'].tables:
            if table.isUnicode():
                for c in codes: table.cmap[c] = name
    w = max(stem, 24 * k); wide = (lambda v: v) if k == 1 else (lambda v: round(v * k))
    for g in PLAN['own']:
        if g['type'] == 'drawn': add(g['name'], drawn(g['contours'], k), wide(g['advance']), g['codes'])
        elif g['type'] == 'weighted':      # drawn in several thicknesses: the one nearest to this weight's strokes
            step = min(g['steps'], key=lambda s: abs(s['stroke'] * k - stem))
            add(g['name'], drawn(step['contours'], k), wide(step['advance']), g['codes'])
        # a check mark and a cross, in strokes as thick as the weight's own, standing on the baseline
        elif g['type'] == 'check': add(g['name'], cornered([stroke([(side + at(40, 330)[0], at(40, 330)[1]), (side + at(250, 110)[0], at(250, 110)[1]), (side + at(640, 640)[0], at(640, 640)[1])], w)]), wide(640) + side * 2 if k == 1 else round(640 * k + side * 2), g['codes'])
        elif g['type'] == 'cross': add(g['name'], cornered([stroke([(side + at(60, 100)[0], at(60, 100)[1]), (side + at(560, 600)[0], at(560, 600)[1])], w), stroke([(side + at(60, 600)[0], at(60, 600)[1]), (side + at(560, 100)[0], at(560, 100)[1])], w)]), wide(620) + side * 2 if k == 1 else round(620 * k + side * 2), g['codes'])
    return len(PLAN['own'])

# ---- the display cut: a font for titles
# The heaviest weight with every round dot turned into a square that leans LEAN degrees to the right (0 stands it on
# a corner, as a diamond). A dot is a contour on its own that is an oval to within a twentieth and about the size of
# the full stop: the dots of every script, of the punctuation and of the accents, and the bullet. Each square keeps
# its dot's middle and SHARE of its area: at the full area the letters with three dots and the i crowd. Nothing else
# is touched, so a line sets exactly as wide as in the weight it is cut from. No square may stand nearer than ROOM
# units to the rest of its letter, unless the round dot already did. ALSO: characters drawn as one shape that take
# the lean too (the Arabic zero, where a typeface draws it as a square).
D = PLAN['display'] or {}
HERO, CUT, LEAN, SHARE, ROOM, ALSO = D.get('name'), D.get('cut'), D.get('lean'), D.get('share'), D.get('room'), D.get('also', [])
# what the dots become, in words: a square on its corner is a diamond
DOTS = 'diamonds' if LEAN == 0 else 'squares' if LEAN == 45 else 'leaning squares'
DOT = 'a diamond, which is a square standing on a corner' if LEAN == 0 else 'an upright square' if LEAN == 45 else f'a square that leans {LEAN} degrees to the right'

EM = 1                               # the font's units to a thousandth of its em: distances below are in thousandths
class Tracer(BasePen):               # a contour as points: about 6 thousandths apart along straight edges, 8 to a curve
    def _moveTo(self, p): self.pts = [p]
    def _lineTo(self, p):
        a = self._getCurrentPoint(); n = max(1, int(hypot(p[0] - a[0], p[1] - a[1]) // (6 * EM)))
        self.pts += [(a[0] + (p[0] - a[0]) * k / n, a[1] + (p[1] - a[1]) * k / n) for k in range(1, n + 1)]
    def _qCurveToOne(self, c, p):
        a = self._getCurrentPoint()
        self.pts += [((1 - t) ** 2 * a[0] + 2 * (1 - t) * t * c[0] + t * t * p[0], (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * c[1] + t * t * p[1]) for t in (k / 8 for k in range(1, 9))]
    def _closePath(self):
        if self.pts[-1] != self.pts[0]: self._lineTo(self.pts[0])
        self.pts.pop()

def rings(gs, name):                 # the contours of a drawn glyph, each as its pen moves
    pen = RecordingPen(); gs[name].draw(pen)
    out = [[]]
    for move in pen.value:
        out[-1].append(move)
        if move[0] == 'closePath': out.append([])
    return out[:-1]

def replay(ring, pen):
    for op, args in ring: getattr(pen, op)(*args)
    return pen

def traced(ring): return replay(ring, Tracer(None)).pts

def box(pts):                        # left, bottom, right, top, area
    xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
    return min(xs), min(ys), max(xs), max(ys), abs(sum(a[0] * b[1] - b[0] * a[1] for a, b in zip(pts, pts[1:] + pts[:1]))) / 2

def holds(a, b): return a[0] <= b[0] + 1 and a[1] <= b[1] + 1 and a[2] >= b[2] - 1 and a[3] >= b[3] - 1
def near(a, b): return a[0] < b[2] + 100 * EM and b[0] < a[2] + 100 * EM and a[1] < b[3] + 100 * EM and b[1] < a[3] + 100 * EM
def gap(a, b): return min(hypot(p[0] - q[0], p[1] - q[1]) for p in a for q in b)

# the leaning square of that area round the middle of a box, as pen moves, clockwise from its top corner. Whole
# numbers are used for the middle and for the reach of the corners, so every square of one size is the same square
def leaning(b, area):
    d = sqrt(area / 2); x, y = round((b[0] + b[2]) / 2), round((b[1] + b[3]) / 2)
    dx, dy = round(d * sin(radians(LEAN))), round(d * cos(radians(LEAN)))
    pts = [(x + dx, y + dy), (x + dy, y - dx), (x - dx, y - dy), (x - dy, y + dx)]
    return [('moveTo', (pts[0],))] + [('lineTo', (p,)) for p in pts[1:]] + [('closePath', ())]

def hero(font):
    global EM
    EM = font['head'].unitsPerEm / 1000; room = ROOM * EM
    glyf, hmtx, gs, cmap, order = font['glyf'], font['hmtx'], font.getGlyphSet(), font.getBestCmap(), font.getGlyphOrder()
    if any(hasattr(part, 'transform') or not hasattr(part, 'x') for n in order if glyf[n].isComposite() for part in glyf[n].components):
        raise SystemExit('display cut: a glyph uses a part that is turned, mirrored, scaled or placed by its points; a square in it would lean the wrong way')
    stop = box(traced(rings(gs, cmap[ord('.')])[0])); stop = stop[2] - stop[0]
    left = {n: glyf[n].xMin for n in order if glyf[n].numberOfContours}
    also = {cmap.get(c) for c in ALSO}
    was, now, dots = {}, {}, {}        # every drawn glyph's contours as points, before and after, and which of them are dots
    for name in order:
        g = glyf[name]
        if g.isComposite() or g.numberOfContours <= 0: continue
        rs = rings(gs, name); was[name] = now[name] = [traced(r) for r in rs]; bs = [box(p) for p in was[name]]
        def dot(i):
            b = bs[i]; w, h = b[2] - b[0], b[3] - b[1]; cx, cy = (b[0] + b[2]) / 2, (b[1] + b[3]) / 2
            return (0.3 * stop <= w <= 1.6 * stop and 0.8 < w / h < 1.25
                    and all(0.95 < hypot((x - cx) / w * 2, (y - cy) / h * 2) < 1.05 for x, y in was[name][i])
                    and not any(holds(bs[j], b) or holds(b, bs[j]) for j in range(len(bs)) if j != i))
        area = {i: bs[i][4] * SHARE for i in range(len(bs)) if dot(i)}
        if not area and name in also and len(bs) == 1: area = {0: bs[0][4]}
        if not area: continue
        rs = [leaning(bs[i], area[i]) if i in area else r for i, r in enumerate(rs)]
        pen = TTGlyphPen(None)
        for r in rs: replay(r, pen)
        new = pen.glyph(); new.flags[0] |= g.flags[0] & flagOverlapSimple
        glyf[name], dots[name], now[name] = new, set(area), [traced(r) for r in rs]
    for name in left:                  # a left side bearing says where the outline starts, so it moves with the outline
        g = glyf[name]; g.recalcBounds(glyf)
        if g.xMin != left[name]: hmtx[name] = (hmtx[name][0], hmtx[name][1] + g.xMin - left[name])
    # the room round every dot wherever it is used: a glyph's contours with those of its parts, each (points, is it a dot)
    def laid(name, drawn, dx=0, dy=0):
        g = glyf[name]
        if g.isComposite(): return [c for part in g.components for c in laid(part.glyphName, drawn, dx + part.x, dy + part.y)]
        return [([(x + dx, y + dy) for x, y in pts], i in dots.get(name, ())) for i, pts in enumerate(drawn.get(name, []))]
    def rooms(drawn):
        out = {}
        for name in order:
            cs = laid(name, drawn)
            if not any(d for _, d in cs): continue
            bs = [box(p) for p, _ in cs]
            for i, (pts, d) in enumerate(cs):
                if d: out[name, i] = min((gap(pts, cs[j][0]) for j in range(len(cs)) if j != i and near(bs[i], bs[j])), default=100 * EM)
        return out
    old, new = rooms(was), rooms(now)
    if not new: raise SystemExit('display cut: no round dot was found in the heaviest weight, so there is nothing to cut. Leave "display" out of the settings')
    crowded = sorted({f'{n} {new[n, i] / EM:.0f} (round dot {old[n, i] / EM:.0f})' for n, i in new if new[n, i] < room <= old[n, i]})
    if crowded: raise SystemExit(f'display cut: with "share" at {SHARE}, squares come too near the rest of their letters (thousandths of the em, at least {ROOM} wanted): ' + ', '.join(crowded[:8]) + (f' and {len(crowded) - 8} more' if len(crowded) > 8 else '') + '. Make "share" smaller, or "lean" nearer 45, which stands the squares upright')
    least = min((k for k in new if old[k] >= room), key=new.get)
    return {'dots': sum(len(v) for v in dots.values()), 'drawn': len(dots), 'glyphs': len(set(n for n, _ in new)),
            'room': round(new[least] / EM), 'roundRoom': round(old[least] / EM), 'tightest': least[0],
            'joined': sorted({n for n, i in new if old[n, i] < room})}      # where the source's own dot already runs into its letter

def build():
    faces = PLAN['sources']; credits = [credit(f) for f in faces]; scripts = [f['script'] for f in faces]
    lo, hi = max(c['range'][0] for c in credits), min(c['range'][1] for c in credits)
    weights = [(w, s) for w, s in NINE if lo <= w <= hi and (not PLAN['weights'] or w in PLAN['weights'])]
    if not weights: sys.exit(f'fonts: the sources share no weight between {lo:g} and {hi:g}')
    os.makedirs(OUT, exist_ok=True)
    report, built, display = [], [], None
    for weight, style in weights:
        cuts = [cut(faces[0], weight)] + [only(cut(f, weight), wanted(f)) for f in faces[1:]]
        lines = {'asc': max(c['hhea'].ascent for c in cuts), 'desc': min(c['hhea'].descent for c in cuts),
                 'winAsc': max(c['OS/2'].usWinAscent for c in cuts), 'winDesc': max(c['OS/2'].usWinDescent for c in cuts)}
        counts = [len(c.getGlyphOrder()) for c in cuts]
        font = TTFont(reload(merge.Merger(options=merge.Options(drop_tables=['STAT', 'MVAR', 'vhea', 'vmtx'])).merge([reload(c) for c in cuts]))) if len(cuts) > 1 else TTFont(reload(cuts[0]))
        nb = brand(font)
        names(font, style, credits); master(font, weight, style, lines, scripts)
        base = os.path.join(OUT, f"{FAMILY.replace(' ', '')}-{style}")
        font.flavor = None; font.save(base + '.ttf')
        font.flavor = 'woff2'; font.save(base + '.woff2')
        cmap = TTFont(base + '.ttf').getBestCmap()
        built.append([weight, style])
        report.append(f"{style:<11} {weight}  glyphs {' + '.join(str(n) for n in counts)} + {nb} = {len(font.getGlyphOrder())}  characters {len(cmap)}  ttf {os.path.getsize(base + '.ttf') // 1024} KB  woff2 {os.path.getsize(base + '.woff2') // 1024} KB")
        if HERO and style == CUT:
            font = TTFont(base + '.ttf'); c = hero(font)
            names(font, style, credits, HERO, f'The {BRAND} hero typeface for titles, {FAMILY} {CUT} with its dots as {DOTS}')
            file = f"{HERO.replace(' ', '')}-{style}"; base = os.path.join(OUT, file)
            font.save(base + '.ttf'); font.flavor = 'woff2'; font.save(base + '.woff2')
            report.append(f"{HERO} {style}: {c['dots']} dots in {c['drawn']} drawn glyphs, seen in {c['glyphs']} glyphs. Least room round a square {c['room']} units "
                          f"({c['tightest']}, round dot {c['roundRoom']}); left as the source has them, the dot running into its letter: {' '.join(c['joined']) or 'none'}. "
                          f"ttf {os.path.getsize(base + '.ttf') // 1024} KB  woff2 {os.path.getsize(base + '.woff2') // 1024} KB")
            display = {'family': HERO, 'style': style, 'weight': weight, 'file': file, 'from': f'{FAMILY} {style}', 'lean': LEAN, 'share': SHARE, 'minRoom': ROOM, **c}
    if HERO and not display: sys.exit(f'fonts: the display cut is taken from the {CUT} weight, which the sources do not reach')
    # the licence of each source travels with the fonts: its own file, or its own copyright line over the licence's text
    licences = []
    for f, c in zip(faces, credits):
        name = f"OFL-{c['name'].replace(' ', '')}.txt"; licences.append(name)
        if f.get('licence'): shutil.copy(f['licence'], os.path.join(OUT, os.path.basename(f['licence']) if os.path.basename(f['licence']).startswith('OFL') else name)); licences[-1] = os.path.basename(f['licence']) if os.path.basename(f['licence']).startswith('OFL') else name
        else:
            with open(PLAN['ofl'], encoding='utf-8') as fh: text = fh.read()
            with open(os.path.join(OUT, name), 'w', encoding='utf-8', newline='\n') as fh: fh.write(c['copyright'] + '\n' + text)
    own = [{'name': g['name'], 'codes': g['codes'], 'what': g.get('what', g['name'])} for g in PLAN['own']]
    code = lambda g: ', '.join(f'U+{c:04X}' for c in g['codes'])
    private = [g for g in own if any(0xE000 <= c <= 0xF8FF for c in g['codes'])]
    with open(os.path.join(OUT, 'README.txt'), 'w', encoding='utf-8', newline='\n') as fh:
        fh.write(f"{FAMILY}{' and ' + HERO if HERO else ''} {VERSION}\n\n")
        fh.write(f"{FAMILY}: the {BRAND} brand typeface{', one family for ' + ' and '.join(Script(c) for c in credits) if len(credits) > 1 else ''}, in {len(built)} weights ({built[0][1]} {built[0][0]} to {built[-1][1]} {built[-1][0]}).\n")
        if HERO: fh.write(f"{HERO}: the hero font for titles, one weight ({CUT} {display['weight']}). Everything else is set in {FAMILY}.\n")
        fh.write('TTF for apps, video tools and games. WOFF2 for the web.\n\nWhat it is made of\n')
        for c in credits: fh.write(f"  {Script(c):<8}{c['name']} ({c['version']}){', unchanged outlines and spacing' if c is credits[0] else ''}.\n")
        fh.write('What was changed\n')
        if len(credits) > 1: fh.write('  Each weight was cut from the variable fonts, the second script (letters, marks, digits, punctuation) was joined to\n  the first, the family was renamed, and the scripts were given one set of line metrics.\n')
        else: fh.write('  Each weight was cut from the variable font, and the family was renamed.\n')
        if own:
            fh.write("What was added: the brand's own characters, in every weight\n")
            for g in own: fh.write(f"  {code(g):<18}{g['what']}\n")
            if private: fh.write(f"  {'The marks have' if len(private) > 1 else 'The mark has'} no place in Unicode, so {'they sit' if len(private) > 1 else 'it sits'} in its private use area: text that uses {'them' if len(private) > 1 else 'it'} needs this font.\n")
        if HERO:
            fh.write(f"What {HERO} is\n  {FAMILY} {CUT} with every round dot turned into {DOT}: the dots of the\n  letters, of the punctuation and of the accents, and the bullet. Each square holds {SHARE} of its dot's area and keeps\n  its middle. Nothing else is changed, so a line sets exactly as wide as in {FAMILY} {CUT}, and the brand's own\n  characters are all there. It is for titles: from about 24 px up, never for running text.\n")
        fh.write(f"\nLicence\n  {'Every source is' if len(credits) > 1 else 'The source is'} under the SIL Open Font License 1.1, so this family is too: it may be used, embedded, changed and\n  shared freely, but not sold on its own. The licence {'files' if len(licences) > 1 else 'file'} next to this note must travel with the fonts.\n")
        fh.write('\nRebuild: node run.js fonts <brand folder>   (needs Python with fonttools and brotli)\n')
    # what the other steps and the page read back
    with open(PLAN['report'], 'w', encoding='utf-8', newline='\n') as fh:
        json.dump({'family': FAMILY, 'version': VERSION, 'sources': [{k: c[k] for k in ('script', 'name', 'version', 'copyright', 'designer')} for c in credits],
                   'licences': licences, 'weights': built, 'own': own, 'display': display}, fh, indent=1); fh.write('\n')
    print(f"{FAMILY} from {' + '.join(c['name'] for c in credits)}"); print('\n'.join(report))

if __name__ == '__main__':
    build()
