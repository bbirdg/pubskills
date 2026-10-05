// Type sheet: the brand's real lockup set in several typefaces, side by side, so that its type is chosen by looking.
// Each font file given becomes one option. A variable font with a weight axis is built into a small trial of the
// brand's own family (only the weights the logo needs); a font with one weight sets the name as it is.
// Everything goes into options/type: a folder and a settings file for each option, and the sheet.
// usage: node run.js typesheet <brand folder> <font file> <font file> ... [--title="..."]
//   a font file is given as it would be in brand.json (from brand/), or from the brand folder, or as a full path.
//   @Weight after a variable font sets the name in that weight, so one typeface can be shown light and heavy:
//   how heavy the name is changes a logo as much as the typeface does
//   e.g. node run.js typesheet . "fonts/Bitter[wght].ttf" "fonts/Nunito[wght].ttf" "fonts/Raleway[wght].ttf@Regular"
// To take one: copy the "type" block of options/type/<letter>.with.json into brand/brand.json, without its
// "weights" line (so that every weight is built), then run the fonts and logos steps and discard options/type.
const fs = require('fs'), path = require('path');
const { spawnSync } = require('child_process');
const S = require('../lib/system').open();
const { brand: B, dir } = S;

const NINE = [[100, 'Thin'], [200, 'ExtraLight'], [300, 'Light'], [400, 'Regular'], [500, 'Medium'], [600, 'SemiBold'], [700, 'Bold'], [800, 'ExtraBold'], [900, 'Black']];
if (!S.args.rest.length) { console.error('usage: node run.js typesheet <brand folder> <font file> <font file> ... [--title="..."]\n  after a variable font, @Weight sets the name in that weight: "fonts/Some[wght].ttf@Regular"'); process.exit(1); }
const opentype = require('opentype.js');
const run = (...a) => { const out = spawnSync(process.execPath, [path.join(__dirname, '..', 'run.js'), ...a], { stdio: ['ignore', 'pipe', 'inherit'], encoding: 'utf8' }); if (out.status !== 0) { process.stdout.write(out.stdout || ''); throw new Error(`the ${a[0]} step did not finish for this option`); } return out.stdout; };
// the weight a setting such as "family:ExtraBold" asks for, or the default where the name is set in a file of its own
const asked = (spec, fallback) => { const hit = /^family:/.test(spec) && NINE.find(n => n[1] === spec.slice(7)); return hit ? hit[0] : fallback; };
const nearest = (w, lo, hi) => NINE.filter(n => n[0] >= lo && n[0] <= hi).reduce((a, b) => Math.abs(b[0] - w) < Math.abs(a[0] - w) ? b : a, NINE.filter(n => n[0] >= lo && n[0] <= hi)[0]);

const b0 = S.brands[0], m0 = b0.mark, root = path.join(dir, 'options', 'type');
const scheme = t => b0.accent ? `${b0.accent}-on-${t}` : t === 'dark' ? 'white' : 'black';
fs.mkdirSync(root, { recursive: true });
const letter = i => String.fromCharCode(97 + i), shown = [];

S.args.rest.forEach((whole, i) => {
  // file@Weight: the weight by its name (Regular) or its number (400)
  const at = whole.lastIndexOf('@'), want = at > 0 ? NINE.find(n => n[1].toLowerCase() === whole.slice(at + 1).toLowerCase() || String(n[0]) === whole.slice(at + 1)) : null, given = want ? whole.slice(0, at) : whole;
  if (at > 0 && !want && !fs.existsSync(path.resolve(dir, 'brand', whole)) && !fs.existsSync(path.resolve(whole))) throw new Error(`"${whole.slice(at + 1)}" is not a weight. The weights are: ${NINE.map(n => n[1]).join(', ')}`);
  const file = [path.resolve(dir, 'brand', given), path.resolve(dir, given), path.resolve(given)].find(f => fs.existsSync(f));
  if (!file) throw new Error(`no such font file: ${given} (looked in ${path.join(dir, 'brand')}, in ${dir} and from here)`);
  const data = fs.readFileSync(file), font = opentype.parse(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength));
  const name = (font.getEnglishName('preferredFamily') || font.getEnglishName('fontFamily') || path.basename(file).replace(/[\[\-_.].*$/, '')).replace(/\s+(Thin|ExtraLight|Light|Regular|Medium|SemiBold|Bold|ExtraBold|Black|Variable)$/i, '');
  const rel = path.relative(path.join(dir, 'brand'), file).replace(/\\/g, '/'), wght = font.tables.fvar && font.tables.fvar.axes.find(a => a.tag === 'wght');
  const l = letter(i), out = path.join('options', 'type', l), settings = path.join(root, `${l}.with.json`);
  let type, said;
  if (wght) {
    // the licence that came with the font, where it lies beside it
    const beside = fs.readdirSync(path.dirname(file)).find(f => new RegExp(`^OFL-${name.replace(/[^A-Za-z0-9]+/g, '')}\\.txt$`, 'i').test(f)), licence = beside ? path.posix.join(path.posix.dirname(rel), beside) : undefined;
    const word = nearest(want ? want[0] : asked(B.type.wordmark.font, 800), wght.minValue, wght.maxValue), desc = nearest(asked(B.type.descriptor.font, 600), wght.minValue, wght.maxValue);
    type = { wordmark: { font: `family:${word[1]}` }, descriptor: { font: `family:${desc[1]}` }, family: { name: B.type.family ? B.type.family.name : `${B.name} Sans`, sources: [{ script: 'latin', name, file: rel, ...(licence ? { licence } : {}) }], weights: [...new Set([word[0], desc[0]])], display: null } };
    said = `${name}, ${word[1]} (it has ${nearest(100, wght.minValue, wght.maxValue)[1]} to ${nearest(900, wght.minValue, wght.maxValue)[1]})`;
  } else {
    type = { wordmark: { font: rel }, descriptor: { font: rel } };
    said = `${name} ${font.getEnglishName('preferredSubfamily') || font.getEnglishName('fontSubfamily') || ''}`.trim() + ', the one weight of this file';
  }
  fs.writeFileSync(settings, JSON.stringify({ comment: `A trial: ${B.name} set in ${name}. To take it, copy "type" into brand/brand.json${wght ? ' without "weights" (so that every weight is built) and without "display": null' : ''}.`, type }, null, 2) + '\n');
  if (wght) run('fonts', dir, '--with', settings, '--out', path.join(dir, out));
  run('logos', dir, '--with', settings, '--out', path.join(dir, out));
  const lock = t => `${out.replace(/\\/g, '/')}/logos/${m0.id}/svg/${b0.dir}/${b0.id}-horizontal-${scheme(t)}.svg`;
  shown.push({ name, said, option: `${want && wght ? `${name} ${type.wordmark.font.slice(7)}` : name}=${lock('dark')}|${lock('light')}` });
  console.log(`${l.toUpperCase()}  ${said}`);
});

process.stdout.write(run('sheet', dir, ...shown.map(s => s.option), `--title=${typeof S.args.title === 'string' ? S.args.title : `${b0.label} in ${shown.length} typeface${shown.length > 1 ? 's' : ''}`}`, '--out=options/type/sheet', `--cols=${shown.length <= 2 ? shown.length : shown.length === 4 ? 2 : 3}`));
console.log(`each option's settings: options/type/<letter>.with.json. When one is chosen, copy its "type" into brand/brand.json and discard options/type`);
