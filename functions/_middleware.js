/**
 * Sends visitors who do not read Swedish to the English page instead.
 *
 * Only the ten Swedish URLs are wired up here; `public/_routes.json` keeps
 * every other request (English pages, fonts, images, CSS) away from this
 * function entirely, so the CDN serves them untouched.
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
  '/arbeten/': '/en/work/',
  '/arbeten/revisionsbyra/': '/en/work/audit-firm/',
  '/arbeten/advokatbyra/': '/en/work/law-firm/',
  '/granska-er-webbplats/': '/en/check-your-website/',
  '/om-mig/': '/en/about/',
  '/arbetssatt/': '/en/process/',
  '/vanliga-fragor/': '/en/faq/',
  '/kontakt/': '/en/contact/',
  '/legal.html': '/en/legal.html',
};

const BOT = /bot|crawl|spider|slurp|google|bing|yandex|baidu|duckduck|facebookexternalhit|whatsapp|telegram|lighthouse|validator|curl|wget|headless|preview/i;

export async function onRequest(context) {
  const { request, next } = context;

  try {
    const url = new URL(request.url);
    const target = SV_TO_EN[url.pathname];

    // Not a Swedish page, or an explicit "give me Swedish" override.
    if (!target || url.searchParams.get('lang') === 'sv') return next();

    // Crawlers and link unfurlers see exactly what they asked for.
    if (BOT.test(request.headers.get('user-agent') || '')) return next();

    // Arrived by clicking a link on this same site: they chose this page.
    const from = request.headers.get('sec-fetch-site');
    if (from === 'same-origin') return next();
    if (!from) {
      // Older browsers send no Sec-Fetch-Site, so fall back to the referrer.
      const ref = request.headers.get('referer') || '';
      if (ref && new URL(ref).origin === url.origin) return next();
    }

    // Reads Swedish, or is sitting in Sweden.
    const accepts = (request.headers.get('accept-language') || '').toLowerCase();
    if (/\bsv\b/.test(accepts)) return next();
    if ((request.cf && request.cf.country) === 'SE') return next();

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
