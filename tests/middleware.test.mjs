import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const code = await readFile(new URL('../functions/_middleware.js', import.meta.url), 'utf8');
const { onRequest } = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));
const routes = JSON.parse(await readFile(new URL('../public/_routes.json', import.meta.url), 'utf8'));
const paths = [
  ['/projects/', '/en/projects/'],
  ['/web-design/', '/en/web-design/'],
  ['/arbeten/revisionsbyra/', '/en/work/audit-firm/'],
  ['/arbeten/advokatbyra/', '/en/work/law-firm/'],
  ['/granska-er-webbplats/', '/en/check-your-website/'],
  ['/legal', '/en/legal'],
];

async function run(path, headers = {}, country) {
  const request = new Request('https://matviiakkuratov.com' + path, {
    headers: { 'user-agent': 'Mozilla/5.0', 'accept-language': 'en-GB', ...headers },
  });
  if (country) Object.defineProperty(request, 'cf', { value: { country } });
  return onRequest({ request, next: () => new Response('original page') });
}

test('Consolidates www and the production Pages hostname without losing the query', async () => {
  for (const host of ['www.matviiakkuratov.com', 'portfolio-rwb.pages.dev']) {
    const request = new Request(`https://${host}/en/projects/?from=search`);
    const response = await onRequest({ request, next: () => new Response('original') });
    assert.equal(response.status, 301);
    assert.equal(response.headers.get('Location'), 'https://matviiakkuratov.com/en/projects/?from=search');
  }
});

test('Preview HTML is accessible and explicitly excluded from indexing', async () => {
  const request = new Request('https://feature.portfolio-rwb.pages.dev/en/projects/');
  const response = await onRequest({ request, next: () => new Response('preview') });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('X-Robots-Tag'), 'noindex');
  assert.equal(await response.text(), 'preview');
});

test('Retired Nova links redirect straight to SHTORKA, including assets and query strings', async () => {
  assert.ok(routes.include.includes('/nova') && routes.include.includes('/nova/*'));
  const moved = [
    ['/nova', '/shtorka/'], ['/nova/', '/shtorka/'], ['/nova/index.html', '/shtorka/'],
    ['/nova/privacy', '/shtorka/privacy'], ['/nova/privacy.html', '/shtorka/privacy'], ['/nova/privacy/', '/shtorka/privacy'],
    ['/nova/nova.css', '/shtorka/shtorka.css'], ['/nova/nova.js', '/shtorka/shtorka.js'],
    ['/nova/assets/nova.svg', '/shtorka/assets/shtorka.svg'], ['/nova/assets/nova-og.png', '/shtorka/assets/shtorka-og.png'],
    ['/nova/assets/fonts/inter-var-latin.woff2', '/shtorka/assets/fonts/inter-var-latin.woff2'],
    ['/assets/developer-og.png', '/assets/developer-og-shtorka.png'], ['/assets/developer-og.svg', '/assets/developer-og-shtorka.svg'],
  ];
  for (const host of ['matviiakkuratov.com', 'www.matviiakkuratov.com', 'portfolio-rwb.pages.dev', 'feature.portfolio-rwb.pages.dev']) {
    for (const [old, current] of moved) {
      const request = new Request(`https://${host}${old}?utm_campaign=launch&source=old-link`, {headers: {'User-Agent': 'Googlebot'}});
      const response = await onRequest({request, next: () => {throw new Error('Legacy links must not render stale content');}});
      const targetHost = ['www.matviiakkuratov.com', 'portfolio-rwb.pages.dev'].includes(host) ? 'matviiakkuratov.com' : host;
      assert.equal(response.status, 301, host + old);
      assert.equal(response.headers.get('Location'), `https://${targetHost}${current}?utm_campaign=launch&source=old-link`, host + old);
    }
  }
});

test('Every catalogue document route is covered, canonical and readable by crawlers', async () => {
  const catalogue = JSON.parse(await readFile(new URL('../content/seo.json', import.meta.url), 'utf8')).pages;
  for (const page of catalogue) {
    assert.ok(routes.include.includes(page.url), page.url);
    const response = await run(page.url, { 'user-agent': 'Googlebot' });
    assert.equal(response.status, 200, page.url);
    assert.equal(await response.text(), 'original page');
    const alias = '/' + page.file;
    assert.ok(routes.include.includes(alias), alias);
    if (alias === page.url) continue;
    const redirect = await run(alias, { 'user-agent': 'Googlebot' });
    assert.equal(redirect.status, 308, alias);
    assert.equal(redirect.headers.get('Location'), 'https://matviiakkuratov.com' + page.url, alias);
  }
});

for (const [source, target] of paths) {
  test(`Cloudflare routes and redirects ${source}`, async () => {
    assert.ok(routes.include.includes(source));
    const response = await run(source + '?from=portfolio');
    assert.equal(response.status, 302);
    assert.equal(response.headers.get('Location'), 'https://matviiakkuratov.com' + target + '?from=portfolio');
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
  });
}
for (const [name, path, headers, country] of [
  ['Swedish readers', paths[0][0], {'accept-language':'sv-SE, en;q=0.8'}],
  ['visitors in Sweden', paths[0][0], {}, 'SE'],
  ['explicit Swedish choice', paths[0][0]+'?lang=sv', {}],
  ['same-site navigation', paths[1][0], {'sec-fetch-site':'same-origin'}],
  ['same-site referrer', paths[1][0], {referer:'https://matviiakkuratov.com/en/work/'}],
  ['search crawlers', paths[1][0], {'user-agent':'Googlebot'}],
  ['English pages', '/en/work/law-firm/', {}],
  ['assets', '/assets/law-concept-desktop.jpg', {}],
]) {
  test(`Keeps the requested page for ${name}`, async () => {
    const response = await run(path, headers, country);
    assert.equal(response.status, 200);
    assert.equal(await response.text(), 'original page');
  });
}
