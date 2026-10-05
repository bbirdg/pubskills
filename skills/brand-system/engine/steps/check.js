// Check: tests what the other steps made and says plainly what it found. Nothing is changed.
//   logos     every logo file is there and is what the settings would make today
//   colour    text and accents stand out enough from what is behind them (WCAG contrast)
//   rollout   every file of the upload kit is there, at the size its name says
//   art       every background is there, at the size its name says
//   items     every face, print file and picture of the things the brand is put on
//   fonts     the family's files, its own characters, and a display cut that sets as wide as the weight it is cut from
//   motion    every animated logo and moving background: size, frame rate, length, and loops that end where they start
//   page      every view opens at desktop and phone width, with no error, no sideways scroll and no link that leads nowhere
// A file in the output that the settings no longer make (a kind of art that is now skipped, a place taken off the
// list, a family that was renamed) fails its test: the list goes into .build/left.json, and
// `node run.js discard <brand folder> --left` moves those files to the bin.
// It writes .build/checks.json, which the page shows under Checks, and ends with an error code if a test failed.
// usage: node run.js check <brand folder> [--only=page] [--skip=page,motion]
const fs = require('fs'), path = require('path');
const { execFileSync } = require('child_process');
const { pathToFileURL } = require('url');
const S = require('../lib/system').open();
const { launch, pngSize } = require('../lib/browser');
const { OUT, brand: B, ACCENTS, NEUTRALS, INK, WHITE, contrast } = S;
const only = typeof S.args.only === 'string' ? S.args.only.split(',') : null, skip = typeof S.args.skip === 'string' ? S.args.skip.split(',') : [];
const want = id => (!only || only.includes(id)) && !skip.includes(id);
const has = f => fs.existsSync(path.join(OUT, f));
const walk = d => fs.existsSync(d) ? fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]) : [];
const few = (list, n = 6) => list.slice(0, n).join(', ') + (list.length > n ? ` and ${list.length - n} more` : '');
// a size in a file's name: ...-1920x1080.png, ...-800.png
const named = f => { const m = path.basename(f).match(/(\d+)x(\d+)(?:-clear)?\.png$/); if (m) return [+m[1], +m[2]]; const s = path.basename(f).match(/-(\d+)\.png$/); return s ? [+s[1], null] : null; };
function sizes(files) {
  const bad = [];
  let n = 0;
  for (const f of files) { const w = named(f); if (!w) continue; n++; const [x, y] = pngSize(path.join(OUT, f)); if (x !== w[0] || (w[1] !== null && y !== w[1])) bad.push(`${f} is ${x} x ${y}`); }
  return { n, bad };
}
const probe = file => JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-count_packets', '-show_entries', 'stream=codec_name,profile,width,height,pix_fmt,r_frame_rate,nb_read_packets:format=duration', '-of', 'json', file]).toString());
const ffprobe = (() => { try { execFileSync('ffprobe', ['-version'], { stdio: 'ignore' }); return true; } catch (e) { return false; } })();

// what is in a folder of the output that the settings do not make today. `also` lets a file through that is welcome there
const left = [];
const extra = (folder, made, also = () => false) => { const x = walk(path.join(OUT, folder)).map(f => path.relative(OUT, f).replace(/\\/g, '/')).filter(f => !made.has(f) && !also(f)); left.push(...x); return x; };
const leftText = x => `${x.length} ${x.length > 1 ? 'files are' : 'file is'} left from an earlier build and not made by the settings any more (${few(x, 3)}). Look at the list in .build/left.json, then move ${x.length > 1 ? 'them' : 'it'} to the bin: node run.js discard <brand folder> --left`;
const older = x => x.map(f => 'left from an earlier build: ' + f);

const results = [];
// ok: true passed, false failed, null not made yet (nothing to test)
const say = (id, title, ok, text, detail = []) => results.push({ id, title, ok, text, detail });

(async () => {
  // ---------------------------------------------------------------- logos
  if (want('logos')) {
    const svgs = {}, made = new Set(), toPng = f => f.replace('/svg/', '/png/').replace(/\.svg$/, '.png');
    for (const m of S.marks) {
      const at = `logos/${m.id}/svg`, api = { add: (rel, svg, width) => { svgs[`${at}/${rel}`] = svg; if (width) made.add(toPng(`${at}/${rel}`)); }, raw: (rel, svg) => { svgs[`${at}/${rel}`] = svg; }, png: (svg, rel) => { made.add(`logos/${m.id}/png/${rel}`); } };
      m.stills(api);
      for (const b of m.brands) for (const name of m.lockupNames(b)) {
        const s = m.lockupScheme(name), l = S.lockups((x, y, w) => m.draw(s.mark, x, y, w), m.aspect, b.word, b.desc, s, b.tail);
        for (const k of ['horizontal', 'stacked']) { const f = `${at}/${b.dir}/${b.id}-${k}-${name}.svg`; svgs[f] = l[k]; made.add(toPng(f)); }
      }
    }
    const all = Object.keys(svgs), missing = all.filter(f => !has(f)), stale = all.filter(f => has(f) && fs.readFileSync(path.join(OUT, f), 'utf8') !== svgs[f]);
    all.forEach(f => made.add(f));
    // the master sheets stand beside the logos, in whatever formats they were saved
    const over = missing.length === all.length ? [] : extra('logos', made, f => /^logos\/[^/]+\/[^/]+-master\.[a-z]+$/.test(f));
    const pngs = walk(path.join(OUT, 'logos')).filter(f => f.endsWith('.png')).length;
    if (missing.length === all.length) say('logos', 'Logo files', null, 'Not made yet: run the logos step.');
    else say('logos', 'Logo files', !missing.length && !stale.length && !over.length, missing.length || stale.length ? `${missing.length} missing, ${stale.length} older than the settings: run the logos step again.` : over.length ? leftText(over) : `${all.length} SVG files, each exactly what the settings make today, with ${pngs} PNG exports.`, [...missing.map(f => 'missing: ' + f), ...stale.map(f => 'older than the settings: ' + f), ...older(over)].slice(0, 12));
  }

  // ---------------------------------------------------------------- colour
  if (want('colour')) {
    const pairs = [['Text on ink', NEUTRALS.text, INK, 4.5], ['Secondary text on ink', NEUTRALS['text-2'], INK, 4.5], ['Tertiary text on ink', NEUTRALS['text-3'], INK, 3], ['Text on surface-1', NEUTRALS.text, NEUTRALS['surface-1'], 4.5], ['Ink on paper', INK, WHITE, 4.5]];
    for (const [k, a] of Object.entries(ACCENTS)) {
      pairs.push([`${a.label} on ink`, a.solid, INK, 3], [`${a.label} for paper, on paper`, a.onLight, WHITE, 3], [`Text on ${a.label}`, a.onAccent, a.solid, 4.5]);
      pairs.push([`${a.label}, its strongest stop on ink`, a.stops.reduce((x, y) => contrast(x, INK) > contrast(y, INK) ? x : y), INK, 3], [`${a.label} for paper, its strongest stop on paper`, a.stopsLight.reduce((x, y) => contrast(x, WHITE) > contrast(y, WHITE) ? x : y), WHITE, 3]);
    }
    const rows = pairs.map(([n, a, b, need]) => ({ n, ratio: +contrast(a, b).toFixed(2), need })), weak = rows.filter(r => r.ratio < r.need);
    say('colour', 'Colour contrast', !weak.length, weak.length ? `${weak.length} of ${rows.length} pairs are too close: ${weak.map(r => `${r.n} ${r.ratio}:1 (needs ${r.need}:1)`).join('; ')}.` : `${rows.length} pairs of text, accent and background, all at or above what they need (4.5:1 for text, 3:1 for marks and large type). The lowest is ${rows.reduce((a, b) => a.ratio / a.need < b.ratio / b.need ? a : b).n.toLowerCase()} at ${rows.reduce((a, b) => a.ratio / a.need < b.ratio / b.need ? a : b).ratio}:1.`, weak.map(r => `${r.n}: ${r.ratio}:1, needs ${r.need}:1`));
  }

  // ---------------------------------------------------------------- the upload kit
  if (want('rollout')) {
    const R = S.read('rollout');
    if (!B.rollout.length) say('rollout', 'Upload kit', null, 'The settings list no place the brand is seen ("rollout"), so there is no upload kit.');
    else if (!R) say('rollout', 'Upload kit', null, 'Not made yet: run the rollout step.');
    else {
      const files = walk(path.join(OUT, 'rollout')).map(f => path.relative(OUT, f).replace(/\\/g, '/')), listed = R.groups.flatMap(g => g.items).filter(i => i.file), missing = listed.filter(i => !has(i.file)).map(i => i.file), z = sizes(files.filter(f => f.endsWith('.png')));
      const over = R.files ? extra('rollout', new Set(R.files)) : [];
      say('rollout', 'Upload kit', !missing.length && !z.bad.length && !over.length, missing.length || z.bad.length ? `${missing.length} files missing, ${z.bad.length} not the size their name says.` : over.length ? leftText(over) : `${files.length} files for ${R.groups.length} places. All ${z.n} pictures with a size in their name have that size. Platform sizes change: check each one in its upload dialog.`, [...missing.map(f => 'missing: ' + f), ...z.bad, ...older(over).slice(0, 8)]);
    }
  }

  // ---------------------------------------------------------------- art
  if (want('art')) {
    const A = S.read('art');
    if (!A) say('art', 'Background art', null, 'Not made yet: run the art step.');
    else {
      const need = [], bases = [];
      for (const f of A.families) for (const v of f.variants) for (const c of f.colours) for (const s of A.shapes) for (const t of A.tones) {
        const base = `art/${f.id}/${[f.id, v.id, c.id, s.id, t.id].filter(Boolean).join('-')}`;
        bases.push(base + '-');
        need.push(base + '.svg', base + '-clear.svg');
        for (const k of A.sizes) need.push(`${base}-${s.w * k}x${s.h * k}.png`, `${base}-${s.w * k}x${s.h * k}-clear.png`);
      }
      const missing = need.filter(f => !has(f)), z = sizes(need.filter(f => f.endsWith('.png') && has(f)));
      // the loops of the art-motion step stand beside the pictures they are made from
      const over = extra('art', new Set(need), f => /\.(mp4|webm)$/.test(f) && bases.some(b => f.startsWith(b)));
      say('art', 'Background art', !missing.length && !z.bad.length && !over.length, missing.length || z.bad.length ? `${missing.length} of ${need.length} files missing, ${z.bad.length} not the size their name says.` : over.length ? leftText(over) : `${need.length} files, each at the size in its name. Every picture was measured as it was made: no line comes nearer to its clear area than ${S.CLEARANCE * 100}% of the picture's width.`, [...missing.slice(0, 8).map(f => 'missing: ' + f), ...z.bad, ...older(over).slice(0, 8)]);
    }
  }

  // ---------------------------------------------------------------- items
  if (want('items')) {
    const I = S.read('items');
    if (!B.items.length) say('items', 'Items', null, 'The settings list no things the brand is put on ("items"), so there are none.');
    else if (!I) say('items', 'Items', null, 'Not made yet: run the items step.');
    else {
      const missing = I.files.filter(f => !has(f)), z = sizes(I.files.filter(f => f.endsWith('.png') && has(f))), lost = B.items.length - I.items.length, over = extra('items', new Set(I.files));
      say('items', 'Items', !missing.length && !z.bad.length && !over.length && !lost, missing.length || z.bad.length || lost ? `${missing.length} files missing, ${z.bad.length} not the size their name says${lost ? `, and ${lost} of the items in the settings not drawn yet` : ''}: run the items step again.` : over.length ? leftText(over) : `${I.items.length} thing${I.items.length > 1 ? 's' : ''} (${I.items.map(i => i.label.toLowerCase()).join(', ')}) in ${I.files.length} files: each face as SVG and PNG, a print file with ${S.read('items').items.some(i => i.bleed) ? 'bleed' : 'every face'} for each, and a picture of the thing. The print files are in RGB with every word as outlines: a printer may ask for its own colour profile or template.`, [...missing.map(f => 'missing: ' + f), ...z.bad, ...older(over).slice(0, 8)]);
    }
  }

  // ---------------------------------------------------------------- fonts
  if (want('fonts')) {
    const F = S.read('fonts');
    if (!B.type.family) say('fonts', 'Fonts', null, 'The settings name no font family to build, so there are no font files.');
    else if (!F) say('fonts', 'Fonts', null, 'Not built yet: run the fonts step.');
    else {
      const opentype = require('opentype.js'), stem = B.type.family.stem, bad = [];
      const open = f => { const b = fs.readFileSync(path.join(OUT, 'fonts', f)); return opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)); };
      for (const [w, s] of F.weights) for (const ext of ['ttf', 'woff2']) if (!has(`fonts/${stem}-${s}.${ext}`)) bad.push(`missing: fonts/${stem}-${s}.${ext}`);
      for (const l of F.licences) if (!has(`fonts/${l}`)) bad.push(`missing: fonts/${l}, the licence that must travel with the fonts`);
      const codes = F.own.flatMap(o => o.codes);
      for (const [w, s] of F.weights) { if (!has(`fonts/${stem}-${s}.ttf`)) continue; const font = open(`${stem}-${s}.ttf`), lost = codes.filter(c => font.charToGlyphIndex(String.fromCodePoint(c)) === 0); if (lost.length) bad.push(`${s} lacks ${lost.map(c => 'U+' + c.toString(16).toUpperCase()).join(', ')}`); const called = font.getEnglishName('fontFamily') || ''; if (called.indexOf(F.family) !== 0) bad.push(`${s} is named "${called}"`); }
      let cut = '';
      if (F.display && has(`fonts/${F.display.file}.ttf`) && has(`fonts/${stem}-${F.display.style}.ttf`)) {
        // the display cut changes dots only: every character is as wide as in the weight it is cut from
        const a = open(`${F.display.file}.ttf`), b = open(`${stem}-${F.display.style}.ttf`);
        let moved = 0;
        if (a.glyphs.length !== b.glyphs.length) bad.push(`${F.display.family} has ${a.glyphs.length} glyphs, ${F.family} ${F.display.style} has ${b.glyphs.length}`);
        else for (let i = 0; i < a.glyphs.length; i++) if (a.glyphs.get(i).advanceWidth !== b.glyphs.get(i).advanceWidth) moved++;
        if (moved) bad.push(`${moved} characters of ${F.display.family} are not as wide as in ${F.family} ${F.display.style}`);
        cut = ` ${F.display.family} sets every character as wide as ${F.family} ${F.display.style}: only its ${F.display.dots} dots differ.`;
      } else if (F.display) bad.push(`missing: fonts/${F.display.file}.ttf`);
      const over = extra('fonts', new Set(['fonts/README.txt', ...F.licences.map(l => `fonts/${l}`), ...[...F.weights.map(w => `${stem}-${w[1]}`), ...(F.display ? [F.display.file] : [])].flatMap(f => [`fonts/${f}.ttf`, `fonts/${f}.woff2`])]));
      bad.push(...older(over));
      say('fonts', 'Fonts', !bad.length, bad.length ? over.length === bad.length ? leftText(over) : `${bad.length} problems with the font files.` : `${F.family}, ${F.weights.length} weights as TTF and WOFF2, built from ${F.sources.map(s => s.name).join(' and ')} under the SIL Open Font License, with the licence text beside them.${codes.length ? ` Every weight carries the brand's ${codes.length} own characters.` : ''}${cut}`, bad);
    }
  }

  // ---------------------------------------------------------------- moving pictures
  if (want('motion')) {
    const M = S.read('motion'), AM = S.read('art-motion'), browser = null;
    if (!M) say('motion', 'Animated logos', null, 'Not rendered yet: run the motion step (it needs ffmpeg, and takes a while).');
    else {
      const bad = [], lacking = new Set(), made = new Set();
      let n = 0, total = 0;
      for (const l of M.logos) for (const v of M.variants) for (const [w, h] of M.formats) {
        const name = `${l.id}-${v}-${w}x${h}`, want = l.duration[v];
        total++; made.add(`motion/${name}.png`);
        for (const [f, codec] of [[`motion/${name}.mp4`, 'h264'], [`motion/transparent/${name}.mov`, 'prores'], [`motion/transparent/${name}.webm`, 'vp9']]) {
          made.add(f);
          if (!has(f)) { lacking.add(name); continue; }
          if (!ffprobe) continue;
          const p = probe(path.join(OUT, f)), s = p.streams[0]; n++;
          if (s.codec_name !== codec || s.width !== w || s.height !== h || s.r_frame_rate !== `${M.fps}/1` || +s.nb_read_packets !== Math.round(want * M.fps)) bad.push(`${f}: ${s.codec_name} ${s.width} x ${s.height}, ${s.r_frame_rate} frames a second, ${s.nb_read_packets} frames (wanted ${codec} ${w} x ${h}, ${Math.round(want * M.fps)} frames)`);
        }
        if (!has(`motion/${name}.png`)) lacking.add(name);
      }
      // a loop ends on the frame it starts on, which is the still logo
      let loops = 0;
      if (M.variants.includes('loop') && !lacking.size) {
        const film = require('./motion'), br = await launch({ args: ['--disable-gpu-vsync', '--force-color-profile=srgb'] });
        for (const j of film.jobs().filter(j => j.variant === 'loop' && j.W === j.H)) {
          const page = await br.newPage({ viewport: { width: j.W, height: j.H }, deviceScaleFactor: 1 });
          await page.setContent(film.sceneHtml(j.logo, j.variant, j.W, j.H));
          // the built-in loop rests before it ends, so its last frame is the still logo; a kind of the brand's own is asked for the same frame a whole loop later
          const same = await page.evaluate(([last, fps]) => window.still(0) === window.still(last ? window.scene.duration - 1 / fps : window.scene.duration), [j.logo.kind.motion.kind === 'parts', M.fps]);
          if (!same) bad.push(`${j.name}: the loop does not end on the frame it starts on`); else loops++;
          await page.close();
        }
        await br.close();
      }
      const over = extra('motion', made);
      bad.push(...older(over));
      // a film that was rendered from other settings than today's
      const stale = M.scenes ? require('./motion').jobs().filter(j => M.scenes[j.name] && has(`motion/${j.name}.mp4`) && require('./motion').print(j) !== M.scenes[j.name]).map(j => j.name) : [];
      if (stale.length) bad.push(`${stale.length} ${stale.length > 1 ? 'animations were' : 'animation was'} rendered before the settings changed (${few(stale, 3)}): run the motion step again`);
      // a set that is partly rendered is not a failure: one animation is looked at before the rest are rendered
      if (!bad.length && lacking.size) say('motion', 'Animated logos', null, `${total - lacking.size} of ${total} animations are rendered so far${ffprobe && n ? ', and their files are sound' : ''}. Run the motion step to render the rest.`);
      else say('motion', 'Animated logos', !bad.length, bad.length ? over.length === bad.length ? leftText(over) : `${bad.length} problems with the animated logos.` : `${M.logos.length * M.variants.length * M.formats.length} animations, each as MP4, ProRes 4444 and WebM with a poster.${ffprobe ? ` All ${n} files were probed for size, ${M.fps} frames a second and length.` : ' ffprobe was not found, so the files were not probed.'}${loops ? ` All ${loops} loops end on the frame they start on.` : ''}`, bad.slice(0, 12));
    }
    if (AM) {
      const A = require('./artmotion'), bad = [], whole = A.jobs().filter(j => has(j.file + '.mp4') && has(j.file + '-clear.webm')).length;
      let n = 0;
      for (const j of A.jobs()) for (const f of [j.file + '.mp4', j.file + '-clear.webm']) {
        if (!has(f)) continue;
        if (!ffprobe) continue;
        const s = probe(path.join(OUT, f)).streams[0]; n++;
        if (s.width !== j.w || s.height !== j.h || +s.nb_read_packets !== A.LOOP * A.FPS) bad.push(`${f}: ${s.width} x ${s.height}, ${s.nb_read_packets} frames`);
      }
      if (!bad.length && whole < A.jobs().length) say('art-motion', 'Moving backgrounds', null, `${whole} of ${A.jobs().length} loops are rendered so far. Run the art-motion step to render the rest.`);
      else say('art-motion', 'Moving backgrounds', !bad.length, bad.length ? `${bad.length} problems with the moving backgrounds.` : `${A.jobs().length} loops of ${A.LOOP} seconds, each as MP4 and as transparent WebM.${ffprobe ? ` All ${n} files were probed for size and length.` : ''} Their light is a function of the place in the loop, so each one closes without a jump.`, bad.slice(0, 12));
    }
  }

  // ---------------------------------------------------------------- the page
  if (want('page')) {
    if (!has('review.html')) say('page', 'The page', null, 'Not written yet: run the page step.');
    else {
      const html = path.join(OUT, 'review.html'), base = pathToFileURL(html).href, bad = [], text = fs.readFileSync(html, 'utf8');
      for (const w of B.page.banned || []) if (new RegExp(w, 'i').test(text)) bad.push(`the page holds "${w}", which the settings ask to keep out`);
      const browser = await launch();
      let views = 0, links = 0;
      for (const [name, w, h] of [['desktop', 1440, 900], ['phone', 390, 844]]) {
        const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 }), errors = [];
        page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
        page.on('pageerror', e => errors.push(e.message));
        await page.goto(base); await page.waitForTimeout(400);
        const ids = await page.$$eval('main > section[data-view]', ss => ss.map(s => s.id));
        if (name === 'desktop') {
          // every link: a place on the page, or a file that is there
          const hrefs = [...new Set(await page.$$eval('a[href]', as => as.map(a => a.getAttribute('href'))))], idsAll = new Set(await page.$$eval('[id]', es => es.map(e => e.id)));
          for (const hr of hrefs) {
            if (hr.startsWith('#')) { if (!idsAll.has(hr.slice(1))) bad.push('a link leads to no place on the page: ' + hr); }
            else if (!/^(https?:|mailto:)/.test(hr) && !fs.existsSync(path.join(OUT, decodeURIComponent(hr)))) bad.push('a link leads to no file: ' + hr);
          }
          links = hrefs.length; views = ids.length;
          for (const m of new Set(await page.$$eval('video', vs => vs.flatMap(v => [v.getAttribute('src'), v.getAttribute('poster')])))) if (m && !has(m)) bad.push('a film is missing: ' + m);
        }
        for (const id of ids) {
          await page.goto(base + '#' + id); await page.waitForTimeout(120);
          await page.evaluate(async () => { await document.fonts.ready; for (let y = 0; y < document.documentElement.scrollHeight; y += 900) { scrollTo(0, y); await new Promise(r => setTimeout(r, 25)); } scrollTo(0, 0); });
          await page.waitForTimeout(80);
          const s = await page.evaluate(() => ({ showing: [...document.querySelectorAll('main > section[data-view]')].filter(v => !v.hidden).map(v => v.id), over: document.documentElement.scrollWidth - document.documentElement.clientWidth, broken: [...document.querySelectorAll('main > section:not([hidden]) img')].filter(i => i.complete && !i.naturalWidth).map(i => i.getAttribute('src')) }));
          if (s.showing.length !== 1 || s.showing[0] !== id) bad.push(`${name}, ${id}: the views showing are ${s.showing.join(', ') || 'none'}`);
          if (s.over > 0) bad.push(`${name}, ${id}: the page scrolls sideways by ${s.over} px`);
          if (s.broken.length) bad.push(`${name}, ${id}: pictures that did not load: ${few(s.broken, 3)}`);
        }
        const lost = await page.evaluate(async () => { await document.fonts.ready; return [...document.fonts].filter(f => f.status === 'error').map(f => `${f.family} ${f.weight}`); });
        if (lost.length) bad.push(`${name}: fonts that did not load: ${few(lost, 4)}`);
        if (errors.length) bad.push(`${name}: ${few([...new Set(errors)], 3)}`);
        await page.close();
      }
      await browser.close();
      say('page', 'The page', !bad.length, bad.length ? `${bad.length} problems on the page.` : `All ${views} views open at desktop and at phone width with no error, no sideways scroll and every picture loaded. All ${links} links lead to a place on the page or to a file that is there.`, bad.slice(0, 16));
    }
  }

  // the files left from an earlier build, for `discard --left`
  if (['logos', 'fonts', 'rollout', 'art', 'items', 'motion'].some(want)) S.save('left', { comment: 'Written by the check step: files in the output that the settings no longer make. `node run.js discard <brand folder> --left` moves them to the bin.', files: left });
  // what was tested before and not this time is kept
  const before = (S.read('checks') || { results: [] }).results.filter(r => !results.some(x => x.id === r.id));
  const order = ['logos', 'colour', 'fonts', 'rollout', 'art', 'items', 'motion', 'art-motion', 'page'], all = [...before, ...results].sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
  S.save('checks', { comment: 'Written by the check step: what was tested and what it showed.', date: new Date().toISOString().slice(0, 10), results: all });
  for (const r of results) { console.log(`${r.ok === true ? 'ok     ' : r.ok === false ? 'FAILED ' : 'not yet'}  ${r.title}: ${r.text}`); for (const d of r.detail) console.log('           ' + d); }
  if (results.some(r => r.ok === false)) process.exit(1);
})().catch(e => { console.error(e.message); process.exit(1); });
