#!/usr/bin/env node
// The one way into the engine. It keeps the libraries the steps need outside this folder (in ~/.brand-system, or
// where the environment variable BRAND_SYSTEM_HOME points), so the engine itself can be installed, updated or
// copied without them. BRAND_SYSTEM_DEBUG=1 makes a step that fails show its whole error.
//   node run.js setup                      install what the steps need, once for each computer
//   node run.js doctor                     say what is installed and what is missing, and change nothing
//   node run.js init <brand folder>        start a brand folder: brand/brand.json and the folders round it
//   node run.js <step> <brand folder> ...  run one step (the list is under `node run.js help`)
//   node run.js all <brand folder>         every still step in order; --motion adds the animated logos, --art-motion the moving art
//   node run.js discard <brand folder> ... move options that were not chosen to the computer's bin (--left: what the check found left from an earlier build)
const fs = require('fs'), os = require('os'), path = require('path');
const { spawnSync } = require('child_process');

const HERE = __dirname, WIN = process.platform === 'win32';
const HOME = path.resolve(process.env.BRAND_SYSTEM_HOME || path.join(os.homedir(), '.brand-system'));
const PKG = JSON.parse(fs.readFileSync(path.join(HERE, 'package.json'), 'utf8'));
const MODULES = path.join(HOME, 'node_modules'), PYLIB = path.join(HOME, 'pylib');

// what each step runs, and what it needs
const STEPS = {
  trace: { run: [['node', 'steps/trace.js']], what: 'turn a picture of a logo (PNG, JPG, WebP) into an SVG outline to clean up' },
  mark: { run: [['node', 'steps/mark.js']], what: 'read brand/mark.svg, measure it and write brand/mark.json' },
  typeface: { run: [['node', 'steps/typeface.js']], what: 'find an open typeface and, with --yes, fetch it into brand/fonts with its licence (needs the network)' },
  typesheet: { run: [['node', 'steps/typesheet.js']], what: 'the brand\'s real lockup set in several typefaces, side by side, to choose its type by looking' },
  fonts: { run: [['node', 'steps/glyphs.js'], ['python', 'steps/fonts.py']], what: 'build the brand\'s own font family from open-licensed fonts (needs Python)' },
  logos: { run: [['node', 'steps/logos.js']], what: 'every logo file as SVG and PNG, and the design tokens' },
  masters: { run: [['node', 'steps/masters.js']], what: 'one vector page with every main version of each mark (SVG and PDF)' },
  rollout: { run: [['node', 'steps/rollout.js']], what: 'the upload kit: profile pictures, banners, favicons and icons at each platform\'s size' },
  art: { run: [['node', 'steps/art.js']], what: 'background art drawn from the mark, in three shapes and two tones' },
  items: { run: [['node', 'steps/items.js']], what: 'the brand on things: cards, bags, cups, stickers, at real size with a print file and a picture of each' },
  'art-motion': { run: [['node', 'steps/artmotion.js']], what: 'the art as seamless loops (needs ffmpeg; slow)' },
  motion: { run: [['node', 'steps/motion.js']], what: 'the animated logos as MP4, ProRes 4444 and WebM (needs ffmpeg; slow)' },
  page: { run: [['node', 'steps/page.js']], what: 'final/review.html: the design system as one page to review and approve' },
  check: { run: [['node', 'steps/check.js']], what: 'test what was made: sizes, contrast, clear areas, links, loops' },
  sheet: { run: [['node', 'steps/sheet.js']], what: 'lay options side by side on one page, for a decision' },
  look: { run: [['node', 'steps/look.js']], what: 'pictures of the page, one for each view, to look at without a browser' },
};
const STILL = ['mark', 'fonts', 'logos', 'masters', 'rollout', 'art'];

const say = s => process.stdout.write(s + '\n');
const sh = (cmd, args, opts = {}) => spawnSync(cmd, args, { stdio: 'inherit', ...opts });
const quiet = (cmd, args, opts = {}) => spawnSync(cmd, args, { encoding: 'utf8', ...opts });
const first = out => (out.stdout || out.stderr || '').trim().split(/\r?\n/)[0] || '';
// Where BRAND_SYSTEM_HOME is given, the browser goes there too, so that everything the engine installs is in the
// one folder (a project folder, say, for a tool that may not write anywhere else)
const BROWSERS = process.env.BRAND_SYSTEM_HOME && !process.env.PLAYWRIGHT_BROWSERS_PATH ? { PLAYWRIGHT_BROWSERS_PATH: path.join(HOME, 'browsers') } : {};
const env = () => ({ ...process.env, ...BROWSERS, BRAND_SYSTEM_HOME: HOME, NODE_PATH: [MODULES, process.env.NODE_PATH].filter(Boolean).join(path.delimiter), PYTHONPATH: [PYLIB, process.env.PYTHONPATH].filter(Boolean).join(path.delimiter), PYTHONIOENCODING: 'utf-8' });

// the Python that runs the font step: `python`, `python3` or the Windows launcher, whichever is version 3.9 or later
function python() {
  for (const [cmd, pre] of [['python', []], ['python3', []], ['py', ['-3']]]) {
    const out = quiet(cmd, [...pre, '-c', 'import sys; print(sys.version_info[0] * 100 + sys.version_info[1])']);
    if (out.status === 0 && +first(out) >= 309) return { cmd, pre, version: `${Math.floor(first(out) / 100)}.${first(out) % 100}` };
  }
  return null;
}
function state() {
  const py = python(), node = process.versions.node;
  const lib = n => { try { return JSON.parse(fs.readFileSync(path.join(MODULES, n, 'package.json'), 'utf8')).version; } catch (e) { return null; } };
  const libs = Object.fromEntries(Object.keys(PKG.dependencies).map(n => [n, lib(n)]));
  const fonttools = py ? quiet(py.cmd, [...py.pre, '-c', 'import fontTools, brotli; print(fontTools.version)'], { env: env() }) : null;
  const ff = quiet('ffmpeg', ['-version']), probe = quiet('ffprobe', ['-version']), enc = ff.status === 0 ? quiet('ffmpeg', ['-hide_banner', '-encoders']) : null;
  // the films are written as H.264, ProRes and VP9: a build of ffmpeg without one of them cannot make them
  const lacks = enc && enc.status === 0 ? [['libx264', 'H.264'], ['prores_ks', 'ProRes'], ['libvpx-vp9', 'VP9']].filter(([e]) => !new RegExp('\\b' + e + '\\b').test(enc.stdout)).map(x => x[1]) : [];
  let chromium = null;
  if (libs.playwright) { const out = quiet(process.execPath, ['-e', 'const f=require("playwright").chromium.executablePath();console.log(require("fs").existsSync(f)?f:"")'], { env: env() }); chromium = out.status === 0 && first(out) ? first(out) : null; }
  return { node, nodeOk: +node.split('.')[0] >= 18, libs, libsOk: Object.entries(PKG.dependencies).every(([n, v]) => libs[n] === v), chromium, python: py, fonttools: fonttools && fonttools.status === 0 ? first(fonttools) : null, ffmpeg: ff.status === 0 ? first(ff).replace(/ Copyright.*/, '') : null, ffprobe: probe.status === 0, lacks };
}
function report(s) {
  const row = (ok, name, text) => say(`  ${ok ? 'ok     ' : 'MISSING'}  ${name.padEnd(12)} ${text}`);
  say(`brand-system engine ${PKG.version}, libraries in ${HOME}`);
  row(s.nodeOk, 'node', `${s.node}${s.nodeOk ? '' : ' (18 or later is needed)'}`);
  for (const [n, v] of Object.entries(PKG.dependencies)) row(s.libs[n] === v, n, s.libs[n] ? `${s.libs[n]}${s.libs[n] === v ? '' : ` (the engine was made with ${v})`}` : 'every step needs it');
  row(!!s.chromium, 'chromium', s.chromium ? 'installed' : 'every step that makes a picture needs it');
  row(!!s.python, 'python', s.python ? `${s.python.version} (${s.python.cmd})` : 'only the fonts step needs it: Python 3.9 or later');
  row(!!s.fonttools, 'fonttools', s.fonttools || 'only the fonts step needs it (with brotli)');
  row(!!s.ffmpeg && s.ffprobe && !s.lacks.length, 'ffmpeg', s.ffmpeg ? (s.lacks.length ? `${s.ffmpeg}, but it cannot write ${s.lacks.join(' or ')}: install a full build` : s.ffmpeg) : 'only the motion and art-motion steps need it. Install: ' + (WIN ? 'winget install Gyan.FFmpeg' : process.platform === 'darwin' ? 'brew install ffmpeg' : 'sudo apt install ffmpeg'));
  const still = s.nodeOk && s.libsOk && s.chromium;
  say(still ? `ready: logos, masters, rollout, art, items, page, check${s.fonttools ? ', fonts' : ''}${s.ffmpeg && !s.lacks.length ? ', motion, art-motion' : ''}` : 'not ready: run `node run.js setup`');
  return still;
}

function setup() {
  if (+process.versions.node.split('.')[0] < 18) { say(`Node ${process.versions.node} is too old: install Node 18 or later, then run setup again`); return 1; }
  fs.mkdirSync(HOME, { recursive: true });
  fs.writeFileSync(path.join(HOME, 'package.json'), JSON.stringify({ name: 'brand-system-home', private: true, description: 'Libraries for the brand-system engine. Safe to delete: `node run.js setup` puts them back.', dependencies: PKG.dependencies }, null, 2) + '\n');
  say(`1/3  the engine's libraries, into ${HOME}`);
  if (sh('npm', ['install', '--no-audit', '--no-fund', '--loglevel=error'], { cwd: HOME, shell: WIN }).status !== 0) { say('npm install failed: see the message above'); return 1; }
  say('2/3  Chromium, the browser that draws the pictures (a download of a few hundred MB the first time, about 700 MB on disk)');
  if (sh(process.execPath, [path.join(MODULES, 'playwright', 'cli.js'), 'install', 'chromium'], { cwd: HOME, env: env() }).status !== 0) { say('Chromium did not install: see the message above'); return 1; }
  say('3/3  the font tools, for the fonts step');
  const py = python();
  if (!py) say('     Python 3.9 or later was not found. Everything but the fonts step works without it. Install Python, then run setup again');
  else if (quiet(py.cmd, [...py.pre, '-c', 'import fontTools, brotli'], { env: env() }).status !== 0) {
    if (sh(py.cmd, [...py.pre, '-m', 'pip', 'install', '--quiet', '--disable-pip-version-check', '--upgrade', '--target', PYLIB, '-r', path.join(HERE, 'requirements.txt')]).status !== 0) say('     the font tools did not install: see the message above. Everything but the fonts step works without them');
  }
  const s = state();
  fs.writeFileSync(path.join(HOME, 'setup.json'), JSON.stringify({ engine: PKG.version, date: new Date().toISOString().slice(0, 10), node: s.node, libs: s.libs, python: s.python && s.python.version, fonttools: s.fonttools, ffmpeg: s.ffmpeg }, null, 2) + '\n');
  say('');
  return report(s) ? 0 : 1;
}

function init(args) {
  const dir = args.find(a => !a.startsWith('--')), named = args.find(a => a.startsWith('--name='));
  if (!dir) { say('usage: node run.js init <brand folder> [--name="The Name"]'); return 1; }
  const root = path.resolve(dir), name = named ? named.slice(7) : path.basename(root);
  for (const d of ['brand', 'concept', 'options', 'final']) fs.mkdirSync(path.join(root, d), { recursive: true });
  const made = [];
  for (const [from, to] of [['brand.json', 'brand/brand.json'], ['notes.md', 'brand/notes.md']]) {
    const f = path.join(root, to);
    if (fs.existsSync(f)) continue;
    // in the settings the name sits inside quotes, so a quote or a backslash in it is written the way JSON asks
    const shown = from.endsWith('.json') ? JSON.stringify(name).slice(1, -1) : name;
    fs.writeFileSync(f, fs.readFileSync(path.join(HERE, '..', 'templates', from), 'utf8').replace(/\{\{name\}\}/g, () => shown).replace(/\{\{date\}\}/g, new Date().toISOString().slice(0, 10)));
    made.push(to);
  }
  say(`${root}\n  brand/     the settings (brand.json), the mark (mark.svg) and the notes: the only place to change things\n  concept/   what you start from: the logo as it is, references\n  options/   choices laid side by side for a decision, removed once it is made\n  final/     everything the engine makes\n${made.length ? 'written: ' + made.join(', ') : 'nothing was overwritten'}`);
  return 0;
}

function step(name, args) {
  if (!fs.existsSync(path.join(MODULES, 'playwright'))) { say('the engine\'s libraries are not installed yet: run `node run.js setup` first'); return 1; }
  for (const [kind, file] of STEPS[name].run) {
    let cmd = process.execPath, pre = [];
    if (kind === 'python') { const py = python(); if (!py) { say('this step needs Python 3.9 or later, which was not found'); return 1; } cmd = py.cmd; pre = py.pre; }
    const out = spawnSync(cmd, [...pre, path.join(HERE, file), ...args], { stdio: 'inherit', env: env() });
    if (out.status !== 0) return out.status || 1;
  }
  return 0;
}

function all(args) {
  // the moving steps are slow, so each is asked for by name: --motion for the animated logos, --art-motion for the art as loops
  const moving = ['motion', 'art-motion'].filter(s => args.includes('--' + s)), rest = args.filter(a => a !== '--motion' && a !== '--art-motion'), dir = rest.find(a => !a.startsWith('--'));
  if (!dir) { say('usage: node run.js all <brand folder> [--motion] [--art-motion]'); return 1; }
  let settings;
  try { settings = JSON.parse(fs.readFileSync(path.join(dir, 'brand', 'brand.json'), 'utf8')); }
  catch (e) { say(e.code === 'ENOENT' ? `no settings at ${path.join(path.resolve(dir), 'brand', 'brand.json')}. Start a brand folder with: node run.js init <folder>` : `brand.json is not valid JSON (${e.message})`); return 1; }
  // the checks run before the page, which shows what they found. The page itself is tested once it is written, and
  // written once more so that its Checks view says how that went
  const todo = [...STILL.filter(s => s !== 'fonts' || (settings.type && settings.type.family)), ...(Array.isArray(settings.items) && settings.items.length ? ['items'] : []), ...moving, ['check', '--skip=page'], 'page', ['check', '--only=page'], 'page'];
  for (const item of todo) {
    const [s, ...more] = [].concat(item); say(`\n== ${[s, ...more].join(' ')}`);
    const code = step(s, [...rest, ...more]);
    if (code && more[0] === '--only=page') step('page', rest);
    if (code) { say(`stopped at ${s}`); return code; }
  }
  return 0;
}

// What was not chosen leaves the options folder for the computer's bin, where it can still be found: nothing is
// deleted outright. Only things inside the brand folder's options/ and final/ can be discarded this way.
// --left takes the files the check step found left from an earlier build (.build/left.json).
function discard(args) {
  let [dir, ...rest] = args.filter(a => !a.startsWith('--'));
  if (dir && args.includes('--left')) {
    const list = path.join(path.resolve(dir), '.build', 'left.json');
    if (!fs.existsSync(list)) { say('no list of files left from an earlier build: run the check step first'); return 1; }
    rest = JSON.parse(fs.readFileSync(list, 'utf8')).files.map(f => path.join('final', f));
    if (!rest.length) { say('nothing is left from an earlier build'); return 0; }
  }
  if (!dir || !rest.length) { say('usage: node run.js discard <brand folder> <file or folder inside its options/ or final/> ...\n       node run.js discard <brand folder> --left     what the check step found left from an earlier build'); return 1; }
  const options = path.resolve(dir, 'options') + path.sep, final = path.resolve(dir, 'final') + path.sep, stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  for (const r of rest) {
    const p = path.resolve(dir, r);
    if (!p.startsWith(options) && !p.startsWith(final)) { say(`not discarded: ${p} is not inside ${options} or ${final}`); return 1; }
    if (!fs.existsSync(p)) { say(`already gone: ${p}`); continue; }
    let binned = false;
    if (WIN) binned = quiet('powershell', ['-NoProfile', '-NonInteractive', '-Command', "Add-Type -AssemblyName Microsoft.VisualBasic; $p = $env:BRAND_DISCARD; if (Test-Path -LiteralPath $p -PathType Container) { [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteDirectory($p, 'OnlyErrorDialogs', 'SendToRecycleBin') } else { [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteFile($p, 'OnlyErrorDialogs', 'SendToRecycleBin') }"], { env: { ...process.env, BRAND_DISCARD: p } }).status === 0 && !fs.existsSync(p);
    else if (process.platform === 'darwin') binned = quiet('osascript', ['-e', `tell application "Finder" to delete POSIX file ${JSON.stringify(p)}`]).status === 0 && !fs.existsSync(p);
    else binned = quiet('gio', ['trash', p]).status === 0 && !fs.existsSync(p);
    if (binned) { say(`to the bin: ${p}`); continue; }
    // no bin to be had: set aside inside options/, for the person to delete
    const aside = path.join(options, '.discarded', `${stamp}-${path.basename(p)}`);
    fs.mkdirSync(path.dirname(aside), { recursive: true }); fs.renameSync(p, aside);
    say(`set aside (this computer's bin could not be used): ${aside}`);
  }
  return 0;
}

const [cmd, ...args] = process.argv.slice(2);
let code = 0;
if (cmd === 'setup') code = setup();
else if (cmd === 'doctor') code = report(state()) ? 0 : 1;
else if (cmd === 'init') code = init(args);
else if (cmd === 'all') code = all(args);
else if (cmd === 'discard') code = discard(args);
else if (cmd === 'version') say(PKG.version);
else if (STEPS[cmd]) code = step(cmd, args);
else {
  say('usage: node run.js <command> [brand folder] [options]\n\n  setup        install what the steps need, once for each computer\n  doctor       say what is installed and what is missing\n  init         start a brand folder\n  all          every still step in order, then the checks and the page (--motion adds the animated logos, --art-motion the moving art)\n  discard      move options that were not chosen, or files left from an earlier build (--left), to the recycle bin\n');
  for (const [n, s] of Object.entries(STEPS)) say(`  ${n.padEnd(12)} ${s.what}`);
  say('\nAfter the brand folder, most steps take a word that picks a few files (for example `art <folder> outline`),\n--out <folder> to write somewhere else, and --with <file.json> to lay other settings over brand.json for a trial.');
  code = cmd && cmd !== 'help' ? 1 : 0;
}
process.exit(code);
