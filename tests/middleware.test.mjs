import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const code = await readFile(new URL('../functions/_middleware.js', import.meta.url), 'utf8');
const { onRequest } = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));
const routes = JSON.parse(await readFile(new URL('../public/_routes.json', import.meta.url), 'utf8'));
const paths = [
  ['/arbeten/revisionsbyra/', '/en/work/audit-firm/'],
  ['/arbeten/advokatbyra/', '/en/work/law-firm/'],
  ['/granska-er-webbplats/', '/en/check-your-website/'],
];

async function run(path, headers = {}, country) {
  const request = new Request('https://matviiakkuratov.com' + path, {
    headers: { 'user-agent': 'Mozilla/5.0', 'accept-language': 'en-GB', ...headers },
  });
  if (country) Object.defineProperty(request, 'cf', { value: { country } });
  return onRequest({ request, next: () => new Response('original page') });
}

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
