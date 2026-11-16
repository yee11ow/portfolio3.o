#!/usr/bin/env python3
"""Check links, assets, language pairs and document structure without dependencies."""
import json
import re
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlparse

ROOT = Path(__file__).resolve().parents[1] / 'public'
SITE = 'matviiakkuratov.com'


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
        self.feed(path.read_text())

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if a.get('id'): self.ids.append(a['id'])
        if tag == 'html': self.lang = a.get('lang')
        if tag == 'h1': self.h1 += 1
        if tag == 'img': self.images.append(a)
        if tag == 'meta' and a.get('name') == 'description': self.descriptions.append(a.get('content'))
        if tag == 'link' and a.get('rel') == 'canonical': self.canonical.append(a.get('href'))
        if tag == 'link' and a.get('hreflang'): self.languages[a['hreflang']] = a.get('href')
        if tag == 'meta' and a.get('property') in ['og:image', 'og:url'] and a.get('content'):
            self.references.append(a['content'])
        for attr in ['href', 'src']:
            if a.get(attr): self.references.append(a[attr])


pages = {p.resolve(): Page(p) for p in ROOT.rglob('*.html')}
errors = []
for path, page in pages.items():
    label = str(path.relative_to(ROOT))
    def require(condition, message):
        if not condition: errors.append(f'{label}: {message}')
    require(page.h1 == 1, 'expected one H1')
    require(page.lang in ['sv', 'en'], 'missing or unexpected language')
    require(len(page.canonical) == 1, 'expected one canonical')
    require(len(page.descriptions) == 1 and page.descriptions[0], 'expected one nonempty description')
    require(len(page.ids) == len(set(page.ids)), 'duplicate IDs')
    if 'sv' in page.languages:
        require(page.languages.get('x-default') == page.languages['sv'], 'language-pair default differs')
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

# The sitemap must describe the same language choices as each actual page.
by_canonical = {p.canonical[0]: p for p in pages.values() if len(p.canonical) == 1}
for node in ET.parse(ROOT / 'sitemap.xml').getroot():
    url = node.find('{http://www.sitemaps.org/schemas/sitemap/0.9}loc').text
    page = by_canonical.get(url)
    if not page:
        errors.append(f'sitemap.xml: no page has canonical {url}')
        continue
    alternatives = {link.attrib['hreflang']: link.attrib['href'] for link in node.findall('{http://www.w3.org/1999/xhtml}link')}
    if alternatives != page.languages:
        errors.append(f'sitemap.xml: language alternatives differ from {url}')

for path in ROOT.rglob('*.css'):
    for ref in re.findall(r'url\([\'\"]?([^\)\'\"]+)', path.read_text()):
        url = urlparse(ref)
        if url.scheme or url.netloc or not url.path: continue
        destination = ROOT / unquote(url.path).lstrip('/') if url.path.startswith('/') else path.parent / unquote(url.path)
        if not destination.exists():
            errors.append(f'{path.relative_to(ROOT)}: missing CSS asset {ref}')

if errors:
    raise SystemExit('\n'.join(errors))
print(f'PASS: {len(pages)} HTML pages; headings, metadata, sitemap language pairs, first-party links, anchors, image attributes and CSS assets.')
