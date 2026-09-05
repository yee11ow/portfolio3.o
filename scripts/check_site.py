#!/usr/bin/env python3
"""Check links, assets, language pairs and document structure without dependencies."""
import json
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlparse

ROOT = Path(__file__).resolve().parents[1] / 'public'


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
        if url.scheme or url.netloc: continue
        destination = (ROOT / unquote(url.path).lstrip('/') if url.path.startswith('/') else path.parent / unquote(url.path)) if url.path else path
        if destination.is_dir(): destination /= 'index.html'
        if not destination.exists() and not destination.suffix:
            destination = destination.with_suffix('.html')
        require(destination.exists(), f'missing reference {ref}')
        target = pages.get(destination.resolve())
        if url.fragment and target:
            require(unquote(url.fragment) in target.ids, f'missing anchor {ref}')

if errors:
    raise SystemExit('\n'.join(errors))
print(f'PASS: {len(pages)} HTML pages; headings, metadata, language defaults, local links, anchors and image attributes.')
