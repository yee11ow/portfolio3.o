/**
 * Consolidates document URLs, the previous product name and host aliases,
 * then sends visitors who do not read Swedish to the English page.
 * Current assets stay on the CDN; retired asset URLs redirect once.
 *
 * Four things are deliberately left alone:
 *
 *   Crawlers.        Googlebot crawls from US addresses. Redirecting it would
 *                    hide the Swedish pages from the Swedish index, which is
 *                    where the work of the last weeks went. Bots always get
 *                    the page they asked for.
 *   Our own links.   Sec-Fetch-Site says whether the click came from this site.
 *                    Without that check, clicking SV in the header from the
 *                    English page would bounce straight back to English.
 *   Swedish readers. Accept-Language carrying sv wins over everything.
 *   Sweden itself.   Plenty of Swedish firms run their browsers in English.
 *                    Inside SE the Swedish page is the better guess.
 *
 * The redirect is a 302 and is never cached, so nothing can pin one visitor's
 * language onto another's.
 */

const SV_TO_EN = {
  '/': '/en/',
  '/projects/': '/en/projects/',
  '/web-design/': '/en/web-design/',
  '/arbeten/': '/en/work/',
  '/arbeten/revisionsbyra/': '/en/work/audit-firm/',
  '/arbeten/advokatbyra/': '/en/work/law-firm/',
  '/granska-er-webbplats/': '/en/check-your-website/',
  '/om-mig/': '/en/about/',
  '/arbetssatt/': '/en/process/',
  '/vanliga-fragor/': '/en/faq/',
  '/kontakt/': '/en/contact/',
  '/legal': '/en/legal',
};

const CANONICAL_PATHS = new Set([...Object.keys(SV_TO_EN), ...Object.values(SV_TO_EN), '/shtorka/', '/shtorka/privacy', '/partners', '/404']);

function canonicalPath(path) {
  let candidate = path;
  if (candidate.endsWith('/index.html')) candidate = candidate.slice(0, -10);
  else if (candidate.endsWith('.html')) candidate = candidate.slice(0, -5);
  if (candidate.endsWith('/') && CANONICAL_PATHS.has(candidate.slice(0, -1))) candidate = candidate.slice(0, -1);
  if (!CANONICAL_PATHS.has(candidate) && CANONICAL_PATHS.has(candidate + '/')) candidate += '/';
  return CANONICAL_PATHS.has(candidate) ? candidate : path;
}

const RETIRED_ASSETS = {
  '/assets/developer-og.png': '/assets/developer-og-shtorka.png',
  '/assets/developer-og.svg': '/assets/developer-og-shtorka.svg',
};

function renamedPath(path) {
  if (RETIRED_ASSETS[path]) return RETIRED_ASSETS[path];
  if (path === '/nova') return '/shtorka/';
  if (!path.startsWith('/nova/')) return path;
  const suffix = path.slice('/nova/'.length);
  const assets = {
    'nova.css': 'shtorka.css',
    'nova.js': 'shtorka.js',
    'assets/nova.svg': 'assets/shtorka.svg',
    'assets/nova-og.png': 'assets/shtorka-og.png',
    'assets/nova-og.svg': 'assets/shtorka-og.svg',
  };
  return '/shtorka/' + (assets[suffix] || suffix);
}

const BOT = /bot|crawl|spider|slurp|google|bing|yandex|baidu|duckduck|facebookexternalhit|whatsapp|telegram|lighthouse|validator|curl|wget|headless|preview/i;

export async function onRequest(context) {
  const { request, next } = context;

  try {
    const url = new URL(request.url);
    const renamed = renamedPath(url.pathname);
    const path = canonicalPath(renamed);
    // Consolidate the public host aliases before applying language preferences.
    if (url.hostname === 'www.matviiakkuratov.com' || url.hostname === 'portfolio-rwb.pages.dev') {
      return Response.redirect('https://matviiakkuratov.com' + path + url.search, 301);
    }
    if (renamed !== url.pathname) return Response.redirect(new URL(path + url.search, url.origin).href, 301);
    if (path !== url.pathname) return Response.redirect(new URL(path + url.search, url.origin).href, 308);
    const serve = async () => {
      const response = await next();
      if (!url.hostname.endsWith('.pages.dev')) return response;
      const headers = new Headers(response.headers);
      headers.set('X-Robots-Tag', 'noindex');
      return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
    };
    const target = SV_TO_EN[url.pathname];

    // Not a Swedish page, or an explicit "give me Swedish" override.
    if (!target || url.searchParams.get('lang') === 'sv') return serve();

    // Crawlers and link unfurlers see exactly what they asked for.
    if (BOT.test(request.headers.get('user-agent') || '')) return serve();

    // Arrived by clicking a link on this same site: they chose this page.
    const from = request.headers.get('sec-fetch-site');
    if (from === 'same-origin') return serve();
    if (!from) {
      // Older browsers send no Sec-Fetch-Site, so fall back to the referrer.
      const ref = request.headers.get('referer') || '';
      if (ref && new URL(ref).origin === url.origin) return serve();
    }

    // Reads Swedish, or is sitting in Sweden.
    const accepts = (request.headers.get('accept-language') || '').toLowerCase();
    if (/\bsv\b/.test(accepts)) return serve();
    if ((request.cf && request.cf.country) === 'SE') return serve();

    const to = new URL(target + url.search, url.origin);
    return new Response(null, {
      status: 302,
      headers: {
        Location: to.toString(),
        'Cache-Control': 'no-store',
        Vary: 'Accept-Language, Sec-Fetch-Site',
      },
    });
  } catch (err) {
    // A broken guess must never cost someone the page.
    return next();
  }
}
