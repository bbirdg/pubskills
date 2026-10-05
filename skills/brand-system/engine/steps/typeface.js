// Typeface: finds an open typeface in the Google Fonts collection and, once the person has agreed, fetches it into
// the brand folder with its licence. Everything under ofl/ in that collection is under the SIL Open Font License,
// the one licence the fonts step builds a family from.
// Without --yes nothing is downloaded: the step says what it would fetch (file names, sizes, where from), which is
// what the person is asked about first. With --yes the files go into brand/fonts.
// usage: node run.js typeface <brand folder> "<Family>" ["<Family>" ...] [--yes] [--file=<one static file's name>]
//   e.g. node run.js typeface . "Bitter" "Nunito"            what would be fetched
//        node run.js typeface . "Bitter" "Nunito" --yes      fetch them
const fs = require('fs'), path = require('path');
const { parse } = require('../lib/system');

const args = parse(process.argv.slice(2));
if (!args.dir || !args.rest.length) { console.error('usage: node run.js typeface <brand folder> "<Family>" ["<Family>" ...] [--yes] [--file=<one static file\'s name>]'); process.exit(1); }
const into = path.join(path.resolve(args.dir), 'brand', 'fonts');
const bare = s => s.normalize('NFKD').replace(/[^A-Za-z0-9]+/g, '');
const kb = n => n >= 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB';
const headers = { 'User-Agent': 'brand-system', Accept: 'application/vnd.github+json', ...(process.env.GITHUB_TOKEN ? { Authorization: 'Bearer ' + process.env.GITHUB_TOKEN } : {}) };
const reach = async (url, opts) => { try { return await fetch(url, opts); } catch (e) { throw new Error(`could not reach ${new URL(url).host} (${(e.cause && e.cause.code) || e.message}). This step needs the network: is the computer online, and may this program use it?`); } };

// what the collection holds for a family: its folder is the family's name in lower case, letters and digits only
async function listing(family) {
  const slug = bare(family).toLowerCase(), url = `https://api.github.com/repos/google/fonts/contents/ofl/${slug}`, res = await reach(url, { headers });
  if (res.status === 404) return null;
  if (res.status === 403 || res.status === 429) throw new Error('GitHub asks this computer to wait before it lists more folders (it allows about 60 an hour). Try again later, or fetch the family by hand from fonts.google.com: the variable .ttf file and OFL.txt, into brand/fonts');
  if (!res.ok) throw new Error(`GitHub answered ${res.status} for ${url}`);
  const files = (await res.json()).filter(f => f.type === 'file'), ttf = files.filter(f => /\.ttf$/i.test(f.name));
  // the variable file with a weight axis, upright: the one the fonts step cuts every weight from
  const variable = ttf.filter(f => /\[[^\]]*wght[^\]]*\]/.test(f.name) && !/italic/i.test(f.name));
  return { slug, page: `https://github.com/google/fonts/tree/main/ofl/${slug}`, variable: variable[0] || null, statics: ttf.filter(f => !/\[/.test(f.name)), licence: files.find(f => /^OFL\.txt$/i.test(f.name)) || null };
}
async function fetchTo(f, name) {
  const res = await reach(f.download_url, { headers: { 'User-Agent': 'brand-system' } });
  if (!res.ok) throw new Error(`${f.name} did not download (${res.status})`);
  const data = Buffer.from(await res.arrayBuffer());
  if (data.length !== f.size) throw new Error(`${f.name} came as ${data.length} bytes, not the ${f.size} the collection lists: nothing was written`);
  fs.mkdirSync(into, { recursive: true });
  fs.writeFileSync(path.join(into, name), data);
  return data;
}

(async () => {
  let fetched = 0, shown = 0;
  for (const family of args.rest) {
    const L = await listing(family);
    console.log(`\n${family}`);
    if (!L) { console.log('  not among the open typefaces of the Google Fonts collection under that name. Check the spelling at fonts.google.com: only families under the SIL Open Font License can be built into a brand\'s own family'); continue; }
    if (!L.licence) { console.log(`  its folder holds no OFL.txt, so it is not fetched: ${L.page}`); continue; }
    const one = typeof args.file === 'string' ? L.statics.find(f => f.name === args.file) : null, font = one || L.variable;
    if (typeof args.file === 'string' && !one) { console.log(`  no file called ${args.file}. It has: ${L.statics.map(f => f.name).join(', ') || 'no static files at the top of its folder'}`); continue; }
    if (!font) {
      console.log(`  has no variable file with a weight axis, so a family of weights cannot be cut from it. One of its files can still set the name in the logo ("type.wordmark.font"):\n  ${L.statics.map(f => `${f.name} (${kb(f.size)})`).join(', ') || 'none at the top of its folder: see ' + L.page}\n  fetch one with --file=<name>`);
      continue;
    }
    const licence = `OFL-${bare(family)}.txt`;
    console.log(`  ${font.name.padEnd(34)} ${kb(font.size).padStart(7)}   ${one ? 'one weight: enough for the name in the logo' : 'the variable file: every weight is cut from it'}`);
    console.log(`  ${'OFL.txt'.padEnd(34)} ${kb(L.licence.size).padStart(7)}   its licence, the SIL Open Font License (saved as ${licence})`);
    console.log(`  from ${L.page}`);
    shown++;
    if (!args.yes) continue;
    const data = await fetchTo(font, font.name);
    await fetchTo(L.licence, licence);
    fetched++;
    // what the file says about itself, and the lines for the settings
    let range = '';
    try { const f = require('opentype.js').parse(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength)), w = f.tables.fvar && f.tables.fvar.axes.find(a => a.tag === 'wght'); if (w) range = `, weights ${w.minValue} to ${w.maxValue}`; } catch (e) { /* the fonts step reads it properly */ }
    console.log(`  fetched into ${into}${range}`);
    console.log(one ? `  in brand.json:  "type": { "wordmark": { "font": "fonts/${font.name}" } }` : `  in brand.json:  "sources": [ { "script": "latin", "name": "${family}", "file": "fonts/${font.name}", "licence": "fonts/${licence}" } ]`);
  }
  if (shown && !args.yes) console.log('\nNothing was downloaded. Tell the person these file names, their sizes and where they come from. When they agree, run the same command with --yes');
  if (fetched) console.log(`\n${fetched} fetched. Set the name in each of them, side by side: node run.js typesheet <brand folder> <font file> <font file> ...`);
  if (!shown) process.exit(1);
})().catch(e => { console.error(e.message); process.exit(1); });
