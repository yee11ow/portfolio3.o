// Browser regression checks run in GitHub Actions against the static output.
// Viewports are layout stress cases, not claims of physical-device certification.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, readdir, stat, mkdir } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { chromium, webkit } from 'playwright';

const root = resolve('public');
const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp' };
const server = createServer(async (req, res) => {
  try {
    let file = resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
    if (file !== root && !file.startsWith(root + sep)) throw new Error('Invalid path');
    if ((await stat(file)).isDirectory()) file = resolve(file, 'index.html');
    res.setHeader('Content-Type', mime[extname(file)] || 'application/octet-stream');
    res.end(await readFile(file));
  } catch { res.writeHead(404); res.end('Not found'); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const pages = (await readdir(root, { recursive: true })).filter(p => p.endsWith('.html')).sort();
const viewports = [
  [320, 568], [360, 800], [390, 844], [466, 678], [626, 890],
  [740, 360], [768, 1024], [820, 1180], [1024, 768], [1180, 820], [1366, 1024],
];
const artifacts = resolve('responsive-results');
await mkdir(artifacts, { recursive: true });
let checked = 0;

async function load(page, path = 'index.html') {
  const response = await page.goto(`${base}/${path}`, { waitUntil: 'load' });
  assert.equal(response.status(), 200, path);
  await page.evaluate(() => document.fonts.ready);
}

async function checkLayout(page, label) {
  const result = await page.evaluate(() => {
    const width = document.documentElement.clientWidth;
    const escaped = [...document.querySelectorAll('main h1, main h2, main p, main .btn, footer a')]
      .filter(el => getComputedStyle(el).visibility !== 'hidden' && el.getClientRects().length)
      .filter(el => { const r = el.getBoundingClientRect(); return r.left < -1 || r.right > width + 1 || el.scrollWidth > el.clientWidth + 2; })
      .map(el => `${el.tagName}.${el.className}: ${el.textContent.trim().slice(0, 60)}`);
    return { width, scrollWidth: document.documentElement.scrollWidth, escaped };
  });
  assert.ok(result.scrollWidth <= result.width + 1, `${label}: page scrolls horizontally (${result.scrollWidth} > ${result.width})`);
  assert.deepEqual(result.escaped, [], `${label}: clipped or overflowing content`);
  checked++;
}

async function checkPill(page, label) {
  const result = await page.locator('#pill').evaluate(el => {
    const r = el.getBoundingClientRect();
    return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: innerWidth, height: innerHeight };
  });
  assert.ok(result.left >= 0 && result.top >= 0 && result.right <= result.width + 1 && result.bottom <= result.height + 1, `${label}: panel outside viewport: ${JSON.stringify(result)}`);
}

try {
  for (const [engineName, engine] of Object.entries({ chromium, webkit })) {
    const browser = await engine.launch();
    const context = await browser.newContext({ hasTouch: true, reducedMotion: 'reduce' });
    // Never contact booking, analytics or the optional voice widget in a layout test.
    await context.route('**/*', route => route.request().url().startsWith(base + '/') ? route.continue() : route.abort());
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.setDefaultTimeout(8000);

    try {
      for (const [width, height] of viewports) {
        await page.setViewportSize({ width, height });
        for (const path of pages) {
          await load(page, path);
          await checkLayout(page, `${engineName} ${width}×${height} ${path}`);
        }
        await load(page);
        const toggle = page.locator('.nav__toggle');
        if (await toggle.isVisible()) {
          await toggle.click();
          assert.equal(await toggle.getAttribute('aria-expanded'), 'true');
          const menu = page.locator('.nav__menu');
          await menu.locator('.nav__cta').scrollIntoViewIfNeeded();
          const cta = await menu.locator('.nav__cta').boundingBox();
          assert.ok(cta.y >= 0 && cta.y + cta.height <= height + 1, `${engineName} ${width}: menu's last action is unreachable`);
          await toggle.press('Escape');
          assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
        }
        await page.locator('.pill__toggle').click();
        await checkPill(page, `${engineName} ${width}: open`);
        await page.locator('.pill__opt').first().click();
        await page.locator('.pill__opt').first().click();
        await page.locator('.pill__acts a').last().scrollIntoViewIfNeeded();
        await checkPill(page, `${engineName} ${width}: final step`);
        if ([320, 768, 1024].includes(width)) {
          await page.locator('.pill__close').click();
          await page.screenshot({ path: `${artifacts}/${engineName}-home-${width}.png`, fullPage: true });
        }
        console.log(`PASS ${engineName} ${width}×${height}: ${pages.length} pages, navigation and contact panel`);
      }

      // Resize the same page with the menu and a moved panel already in use.
      await page.setViewportSize({ width: 820, height: 1180 });
      await load(page, 'en/index.html');
      await page.locator('.pill__toggle').click();
      await page.locator('.pill__opt').first().click();
      const question = await page.locator('.pill__q').textContent();
      await page.locator('#pill').press('Shift+ArrowRight');
      for (const [width, height] of [[1366, 1024], [320, 568], [740, 360], [820, 1180]]) {
        await page.setViewportSize({ width, height });
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        await checkPill(page, `${engineName} transition ${width}×${height}`);
        assert.equal(await page.locator('.pill__q').textContent(), question, 'Resizing reset the visitor answers');
      }
      await page.locator('.pill__close').click();
      await page.locator('.nav__toggle').click();
      await page.setViewportSize({ width: 1366, height: 1024 });
      // matchMedia changes are delivered on a rendering frame. Do not fold
      // back within the same frame before the desktop state was rendered.
      await page.waitForFunction(() => document.querySelector('.nav__toggle').getAttribute('aria-expanded') === 'false');
      await page.setViewportSize({ width: 820, height: 1180 });
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      assert.equal(await page.locator('.nav__toggle').getAttribute('aria-expanded'), 'false', 'Menu reopens after returning from desktop');

      // 200% text, a narrow split-view pane and simulated display insets.
      for (const path of ['index.html', 'en/faq/index.html', 'en/work/law-firm/index.html', 'partners.html']) {
        await page.setViewportSize({ width: 320, height: 568 });
        await load(page, path);
        await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
        await checkLayout(page, `${engineName} enlarged text ${path}`);
      }
      await page.setViewportSize({ width: 740, height: 360 });
      await load(page);
      await page.evaluate(() => {
        for (const [edge, pixels] of Object.entries({ left: 44, right: 44, top: 20, bottom: 24 })) {
          document.documentElement.style.setProperty(`--safe-${edge}`, `${pixels}px`);
        }
      });
      await page.locator('.pill__toggle').click();
      await page.locator('#pill').press('Shift+ArrowRight');
      await page.locator('#pill').press('Shift+ArrowDown');
      await checkPill(page, `${engineName} safe areas`);
      assert.deepEqual(errors, [], `${engineName}: uncaught JavaScript errors`);
    } catch (error) {
      await page.screenshot({ path: `${artifacts}/${engineName}-failure.png`, fullPage: true });
      throw error;
    } finally { await browser.close(); }
  }
  console.log(`PASS: ${checked} page/viewport checks in Chromium and WebKit; resize continuity, touch controls and enlarged text.`);
} finally { await new Promise(resolve => server.close(resolve)); }
