// Look: pictures of the page, one for each view, so that the page can be looked at without opening a browser.
// An assistant cannot see final/review.html as a person does: it reads these pictures instead, before it says the
// page is ready. They go into .build/page, numbered in the order of the page's menu.
// usage: node run.js look <brand folder> [view] [--phone]     e.g. node run.js look <folder> colour
const fs = require('fs'), path = require('path');
const { pathToFileURL } = require('url');
const S = require('../lib/system').open();
const { launch } = require('../lib/browser');

(async () => {
  const html = path.join(S.OUT, 'review.html'), filter = S.args.rest[0] || '', phone = !!S.args.phone;
  if (!fs.existsSync(html)) throw new Error('the page is not written yet: run the page step first');
  const [w, h] = phone ? [390, 844] : [1440, 900], out = path.join(S.BUILD, 'page'), base = pathToFileURL(html).href;
  const browser = await launch(), page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  await page.goto(base);
  const all = await page.$$eval('main > section[data-view]', ss => ss.map(s => s.id)), ids = all.filter(id => id.includes(filter));
  if (!ids.length) { await browser.close(); throw new Error(`the page has no view with "${filter}" in its name. Its views are: ${all.join(', ')}`); }
  fs.mkdirSync(out, { recursive: true });
  const made = [];
  for (const id of ids) {
    await page.setViewportSize({ width: w, height: h });
    await page.goto(base + '#' + id);
    // every picture of the view is loaded before it is photographed: the ones further down load as they are scrolled to
    const tall = await page.evaluate(async () => {
      await document.fonts.ready;
      for (let y = 0; y < document.documentElement.scrollHeight; y += 700) { scrollTo(0, y); await new Promise(r => setTimeout(r, 30)); }
      await Promise.all([...document.querySelectorAll('main > section:not([hidden]) img')].filter(i => !i.complete).map(i => new Promise(r => { i.onload = i.onerror = r; setTimeout(r, 4000); })));
      scrollTo(0, 0);
      return document.documentElement.scrollHeight;
    });
    // a very long view (the list of every file) is cut off at 8000 px, which is as much as can be looked at
    const file = path.join(out, `${String(all.indexOf(id) + 1).padStart(2, '0')}-${id}${phone ? '-phone' : ''}.png`);
    await page.setViewportSize({ width: w, height: Math.max(h, Math.min(tall, 8000)) });
    await page.waitForTimeout(120);
    await page.screenshot({ path: file });
    made.push(`${path.basename(file)}${tall > 8000 ? ' (the first 8000 px of ' + tall + ')' : ''}`);
  }
  await browser.close();
  console.log(`${made.length} view${made.length > 1 ? 's' : ''} at ${w} px wide -> ${out}\n  ${made.join('\n  ')}`);
})().catch(e => { console.error(e.message); process.exit(1); });
