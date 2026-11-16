#!/usr/bin/env python3
"""Check links, assets, language pairs and document structure without dependencies."""
import json
import re
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlparse
from urllib.robotparser import RobotFileParser
from build_shtorka import load_release

ROOT = Path(__file__).resolve().parents[1] / 'public'
SITE = 'matviiakkuratov.com'
SHTORKA_RELEASE = load_release()


class Page(HTMLParser):
    def __init__(self, path):
        super().__init__()
        self.path = path
        self.ids = []
        self.references = []
        self.h1 = 0
        self.lang = None
        self.canonical = []
        self.languages = {}
        self.descriptions = []
        self.images = []
        self.metadata = {}
        self.titles = []
        self.title_buffer = None
        self.script_buffer = None
        self.structured = []
        self.schema_errors = []
        self.anchor_references = []
        self.faq_questions = 0
        self.feed(path.read_text())

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if a.get('id'): self.ids.append(a['id'])
        if tag == 'html': self.lang = a.get('lang')
        if tag == 'h1': self.h1 += 1
        if tag == 'title': self.title_buffer = ''
        if tag == 'script' and a.get('type') == 'application/ld+json': self.script_buffer = ''
        if tag == 'meta' and (a.get('name') or a.get('property')):
            self.metadata.setdefault(a.get('name') or a.get('property'), []).append(a.get('content', ''))
        if tag == 'a' and a.get('href'): self.anchor_references.append(a['href'])
        if tag == 'h2' and 'qa__q' in a.get('class', '').split(): self.faq_questions += 1
        if tag == 'img': self.images.append(a)
        if tag == 'meta' and a.get('name') == 'description': self.descriptions.append(a.get('content'))
        if tag == 'link' and a.get('rel') == 'canonical': self.canonical.append(a.get('href'))
        if tag == 'link' and a.get('hreflang'): self.languages[a['hreflang']] = a.get('href')
        if tag == 'meta' and a.get('property') in ['og:image', 'og:url'] and a.get('content'):
            self.references.append(a['content'])
        for attr in ['href', 'src']:
            if a.get(attr): self.references.append(a[attr])

    def handle_data(self, data):
        if self.title_buffer is not None: self.title_buffer += data
        if self.script_buffer is not None: self.script_buffer += data

    def handle_endtag(self, tag):
        if tag == 'title' and self.title_buffer is not None:
            self.titles.append(self.title_buffer.strip())
            self.title_buffer = None
        if tag == 'script' and self.script_buffer is not None:
            try: self.structured.append(json.loads(self.script_buffer))
            except ValueError as error: self.schema_errors.append(str(error))
            self.script_buffer = None


pages = {p.resolve(): Page(p) for p in ROOT.rglob('*.html')}
errors = []
for path, page in pages.items():
    label = str(path.relative_to(ROOT))
    def require(condition, message):
        if not condition: errors.append(f'{label}: {message}')
    require(page.h1 == 1, 'expected one H1')
    require(len(page.titles) == 1 and bool(page.titles[0]), 'expected one nonempty title')
    require(page.lang in ['sv', 'en'], 'missing or unexpected language')
    require(len(page.canonical) == 1, 'expected one canonical')
    require(len(page.descriptions) == 1 and page.descriptions[0], 'expected one nonempty description')
    require(len(page.ids) == len(set(page.ids)), 'duplicate IDs')
    require(not re.search(r'\bnova\b', path.read_text().replace('id="get-nova"', ''), re.I), 'retired product name or link remains in the published page')
    if page.languages:
        require(page.languages.get(page.lang) == page.canonical[0], 'hreflang must point to its own canonical language version')
        require(page.languages.get('x-default') == page.languages.get('en'), 'English must be the configured fallback language')
    require(not page.schema_errors, f'invalid structured-data JSON: {page.schema_errors}')
    for img in page.images:
        require('alt' in img and img.get('width') and img.get('height'), 'image needs alt and dimensions')
    for ref in page.references:
        url = urlparse(ref)
        if url.netloc and url.hostname != SITE: continue
        if url.scheme and url.scheme not in ['https', 'http']: continue
        destination = (ROOT / unquote(url.path).lstrip('/') if url.path.startswith('/') else path.parent / unquote(url.path)) if url.path else path
        if destination.is_dir(): destination /= 'index.html'
        if not destination.exists() and not destination.suffix:
            destination = destination.with_suffix('.html')
        require(destination.exists(), f'missing reference {ref}')
        target = pages.get(destination.resolve())
        if url.fragment and target:
            require(unquote(url.fragment) in target.ids, f'missing anchor {ref}')

# The sitemap contains every indexable canonical exactly once, and no utility pages.
by_canonical = {p.canonical[0]: p for p in pages.values() if len(p.canonical) == 1}
sitemap_urls = []
for node in ET.parse(ROOT / 'sitemap.xml').getroot():
    url = node.find('{http://www.sitemaps.org/schemas/sitemap/0.9}loc').text
    sitemap_urls.append(url)
    page = by_canonical.get(url)
    if not page:
        errors.append(f'sitemap.xml: no page has canonical {url}')
        continue
    alternatives = {link.attrib['hreflang']: link.attrib['href'] for link in node.findall('{http://www.w3.org/1999/xhtml}link')}
    if alternatives != page.languages:
        errors.append(f'sitemap.xml: language alternatives differ from {url}')

catalogue = json.loads((ROOT.parent / 'content/seo.json').read_text())
records = catalogue['pages']
expected_files = {(ROOT / p['file']).resolve() for p in records}
if expected_files != set(pages): errors.append('SEO catalogue does not cover exactly the published HTML files')
expected_urls = {catalogue['site_url'] + p['url'] for p in records if p.get('index', True)}
if set(sitemap_urls) != expected_urls or len(sitemap_urls) != len(set(sitemap_urls)):
    errors.append('sitemap.xml: must contain every indexable canonical once, without noindex pages')

robots = RobotFileParser()
robots.parse((ROOT / 'robots.txt').read_text().splitlines())
seen_titles, seen_descriptions = set(), set()
for record in records:
    page = pages.get((ROOT / record['file']).resolve())
    if not page: continue
    label = record['file']
    canonical = catalogue['site_url'] + record['url']
    def require(condition, message):
        if not condition: errors.append(f'{label}: {message}')
    require(page.canonical == [canonical], 'canonical differs from the public clean URL')
    directives = page.metadata.get('robots', [])
    require(len(directives) == 1, 'expected one robots meta directive')
    indexed = record.get('index', True)
    require(('noindex' not in ','.join(directives)) == indexed, 'indexability differs from the page purpose')
    if indexed:
        require(robots.can_fetch('Googlebot', canonical) and robots.can_fetch('bingbot', canonical), 'robots.txt blocks an indexable page')
        require(page.titles[0] not in seen_titles, 'duplicate indexable title')
        require(page.descriptions[0] not in seen_descriptions, 'duplicate indexable description')
        seen_titles.add(page.titles[0]); seen_descriptions.add(page.descriptions[0])
    for key in ['og:title', 'og:description', 'og:url', 'og:image', 'og:image:alt', 'og:image:width', 'og:image:height', 'twitter:card', 'twitter:title', 'twitter:description', 'twitter:image', 'twitter:image:alt']:
        require(len(page.metadata.get(key, [])) == 1 and bool(page.metadata[key][0]), f'missing or duplicated social metadata {key}')
    require(page.metadata.get('og:url') == [canonical], 'social URL differs from canonical')
    require(page.metadata.get('og:title') == page.titles, 'social title differs from search title')
    require(page.metadata.get('og:description') == page.descriptions, 'social description differs from search description')
    if record['kind'] == 'error': continue
    require(len(page.structured) == 1, 'expected one connected structured-data graph')
    if not page.structured: continue
    data = page.structured[0]
    require(data.get('@context') == 'https://schema.org', 'unexpected schema context')
    nodes = data.get('@graph', [])
    require(len({n.get('@id') for n in nodes}) == len(nodes), 'duplicate structured-data identifiers')
    document = next((n for n in nodes if n.get('@id') == canonical + '#webpage'), {})
    require(document.get('url') == canonical and document.get('inLanguage') == record['lang'], 'structured page URL or language differs')
    require(any(n.get('@type') == 'Person' and n.get('name') == 'Matvii Akkuratov' for n in nodes), 'missing author identity')
    for node in nodes:
        if node.get('@type') == 'BreadcrumbList':
            items = node['itemListElement']
            require([i['position'] for i in items] == list(range(1, len(items)+1)), 'breadcrumb positions are invalid')
            require(items[-1]['item'] == canonical, 'breadcrumb does not end on the current page')
        if node.get('@type') == 'ItemList':
            require(node.get('numberOfItems') == len(node['itemListElement']), 'project list count differs')
            for item in node['itemListElement']:
                target = item['item']['url']
                require(any(urlparse(ref).path == urlparse(target).path for ref in page.anchor_references), f'project markup has no visible link to {target}')
        if node.get('@type') == 'FAQPage':
            require(len(node.get('mainEntity', [])) == page.faq_questions and page.faq_questions > 0, 'FAQ markup differs from the visible question count')
        if node.get('@type') == 'SoftwareApplication':
            require(node.get('name') == 'SHTORKA' and node.get('operatingSystem', '').startswith('macOS'), 'application identity differs from SHTORKA')
            require(not any(key in node for key in ['aggregateRating', 'review']), 'unverified app review data')
            if SHTORKA_RELEASE['mode'] == 'early-access':
                require(node.get('creativeWorkStatus') == 'In development', 'application release status is inaccurate')
                require(not any(key in node for key in ['offers', 'downloadUrl', 'softwareVersion']), 'unverified app release or price data')
            else:
                require(node.get('creativeWorkStatus') == 'Released', 'application release status is inaccurate')
                require(node.get('downloadUrl') == SHTORKA_RELEASE['download_url'] and node.get('softwareVersion') == SHTORKA_RELEASE['version'], 'app schema differs from release configuration')
                if SHTORKA_RELEASE.get('price') is not None:
                    require(node.get('offers', {}).get('url') == SHTORKA_RELEASE['checkout_url'] and node.get('offers', {}).get('price') == str(SHTORKA_RELEASE['price']) and node.get('offers', {}).get('priceCurrency') == SHTORKA_RELEASE['currency'], 'app offer differs from purchase details')

# Project and service pages must be discoverable through actual links, not only XML.
by_path = {urlparse(url).path: p for url, p in by_canonical.items()}
reached, queue = set(), ['/', '/en/']
while queue:
    path = queue.pop(0)
    if path in reached or path not in by_path: continue
    reached.add(path)
    for ref in by_path[path].anchor_references:
        url = urlparse(ref)
        if url.netloc and url.hostname != SITE: continue
        if url.scheme and url.scheme not in ['https', 'http']: continue
        target = url.path or path
        if target in by_path and target not in reached: queue.append(target)
for url in expected_urls:
    if urlparse(url).path not in reached: errors.append(f'{url}: indexable page has no crawlable route from the homepage')

for path in ROOT.rglob('*.css'):
    for ref in re.findall(r'url\([\'\"]?([^\)\'\"]+)', path.read_text()):
        url = urlparse(ref)
        if url.scheme or url.netloc or not url.path: continue
        destination = ROOT / unquote(url.path).lstrip('/') if url.path.startswith('/') else path.parent / unquote(url.path)
        if not destination.exists():
            errors.append(f'{path.relative_to(ROOT)}: missing CSS asset {ref}')

if errors:
    raise SystemExit('\n'.join(errors))
print(f'PASS: {len(pages)} HTML pages, {len(expected_urls)} indexable URLs; metadata, schema graphs, sitemap, language pairs, crawlable links and assets.')
