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

async function load(page, path = 'web-design/index.html') {
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
  assert.ok(result.scrollWidth <= result.width + 1, `${label}: page scrolls horizontally (${result.scrollWidth} > ${result.width}); overflowing content: ${JSON.stringify(result.escaped)}`);
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

async function capture(page, path) {
  // Full-page captures do not automatically load offscreen lazy images.
  await page.evaluate(async () => {
    await Promise.all([...document.images].map(async img => {
      img.loading = 'eager';
      try { await img.decode(); } catch { /* Missing assets are checked separately. */ }
    }));
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    window.scrollTo({ top: 0, behavior: 'instant' });
  });
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await page.screenshot({ path, fullPage: true });
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
          await capture(page, `${artifacts}/${engineName}-home-${width}.png`);
        }
        console.log(`PASS ${engineName} ${width}×${height}: ${pages.length} pages, navigation and contact panel`);
      }

      // The developer homepage has its own navigation and draggable workspace.
      await page.setViewportSize({ width: 1366, height: 1024 });
      await load(page, 'en/index.html');
      await page.locator('[data-command]').click();
      assert.equal(await page.locator('.command-dialog').evaluate(el => el.open), true);
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('.command-dialog').evaluate(el => el.open), false);
      assert.equal(await page.locator('[data-command]').evaluate(el => el === document.activeElement), true, 'Dialog did not restore keyboard focus');
      // The keyboard shortcut must also restore focus when nothing was focused.
      await page.evaluate(() => document.activeElement.blur());
      await page.keyboard.press('Control+k');
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => document.activeElement === document.querySelector('[data-command]'));
      await page.keyboard.press('Control+k');
      assert.equal(await page.locator('.command-dialog').evaluate(el => el.open), true);
      await page.locator('.command-dialog a[href="#contact"]').click();
      assert.equal(await page.locator('.command-dialog').evaluate(el => el.open), false);
      await page.waitForFunction(() => document.activeElement === document.querySelector('#contact h2'));
      await page.keyboard.press('Tab');
      assert.equal(await page.locator('.email-link').evaluate(el => el === document.activeElement), true, 'Command navigation did not continue at the destination');
      const motion = page.locator('[data-motion]');
      assert.equal(await motion.getAttribute('aria-pressed'), 'true', 'Reduced-motion setting was not respected');
      assert.equal(await page.locator('.orbit-satellite').evaluate(el => getComputedStyle(el).animationName), 'none');
      await motion.click();
      assert.equal(await motion.getAttribute('aria-pressed'), 'false');
      assert.equal(await page.locator('.orbit-satellite').evaluate(el => getComputedStyle(el).animationName), 'orbit-rotate', 'An explicit opt-in should enable animation');
      await motion.click();
      assert.equal(await motion.getAttribute('aria-pressed'), 'true');
      await page.locator('[data-panel-handle]').press('Shift+ArrowRight');
      await page.locator('[data-panel-handle]').press('Shift+ArrowDown');
      assert.notEqual(await page.locator('[data-panel]').evaluate(el => el.style.getPropertyValue('--panel-x')), '0px');
      for (const [width, height] of [[320, 568], [820, 1180], [1366, 1024]]) {
        await page.setViewportSize({ width, height });
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        const contained = await page.locator('[data-panel]').evaluate(panel => {
          const p = panel.getBoundingClientRect(), r = panel.closest('[data-playground]').getBoundingClientRect();
          return p.left >= r.left && p.right <= r.right && p.top >= r.top && p.bottom <= r.bottom;
        });
        assert.ok(contained, `${engineName} ${width}: workspace panel escaped its playground`);
        await capture(page, `${artifacts}/${engineName}-developer-${width}.png`);
      }
      await page.locator('[data-reset]').click();
      assert.equal(await page.locator('[data-panel]').evaluate(el => el.style.getPropertyValue('--panel-x')), '0px');
      const handle = page.locator('[data-panel-handle]');
      await handle.scrollIntoViewIfNeeded();
      const grab = await handle.boundingBox();
      await page.mouse.move(grab.x + grab.width / 2, grab.y + grab.height / 2);
      await page.mouse.down();
      await page.mouse.move(grab.x + grab.width / 2 + 25, grab.y + grab.height / 2 + 15, { steps: 4 });
      await page.mouse.up();
      assert.notEqual(await page.locator('[data-panel]').evaluate(el => el.style.getPropertyValue('--panel-x')), '0px', 'Dragging did not move the workspace panel');
      await page.locator('[data-reset]').click();

      await load(page, 'nova/index.html');
      const curtain = page.locator('[data-curtain-toggle]');
      await curtain.click();
      assert.equal(await curtain.getAttribute('aria-expanded'), 'true');
      assert.equal(await page.locator('#curtain-message').isVisible(), true);
      await capture(page, `${artifacts}/${engineName}-nova-open.png`);
      await curtain.press('Enter');
      assert.equal(await curtain.getAttribute('aria-expanded'), 'false');
      assert.equal(await page.locator('#curtain-message').isVisible(), false);
      for (const width of [390, 1366]) {
        await page.setViewportSize({ width, height: 900 });
        await capture(page, `${artifacts}/${engineName}-nova-${width}.png`);
      }

      for (const width of [390, 1366]) {
        await page.setViewportSize({ width, height: 900 });
        await load(page, 'en/projects/index.html');
        await capture(page, `${artifacts}/${engineName}-projects-${width}.png`);
      }

      // Resize the same page with the menu and a moved panel already in use.
      await page.setViewportSize({ width: 820, height: 1180 });
      await load(page, 'en/web-design/index.html');
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
      for (const path of ['index.html', 'en/index.html', 'projects/index.html', 'en/projects/index.html', 'nova/index.html', 'en/web-design/index.html', 'en/faq/index.html', 'en/work/law-firm/index.html', 'arbeten/advokatbyra/index.html', 'partners.html']) {
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

      // Core navigation and email enquiries must remain usable without scripts.
      const plain = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
      await plain.route('**/*', route => route.request().url().startsWith(base + '/') ? route.continue() : route.abort());
      const plainPage = await plain.newPage();
      for (const path of ['index.html', 'en/index.html', 'projects/index.html', 'en/projects/index.html', 'nova/index.html', 'en/web-design/index.html']) {
        await load(plainPage, path);
        assert.equal(await plainPage.locator('h1').isVisible(), true);
        assert.equal(await plainPage.locator('a[href^="mailto:"]').first().isVisible(), true);
        await checkLayout(plainPage, `${engineName} without JavaScript ${path}`);
      }
      await plain.close();
    } catch (error) {
      await page.screenshot({ path: `${artifacts}/${engineName}-failure.png`, fullPage: true });
      throw error;
    } finally { await browser.close(); }
  }
  console.log(`PASS: ${checked} page/viewport checks in Chromium and WebKit; resize continuity, touch controls and enlarged text.`);
} finally { await new Promise(resolve => server.close(resolve)); }
