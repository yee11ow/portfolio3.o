#!/usr/bin/env python3
"""Apply the SEO catalogue to static pages, visible navigation and sitemap."""
import json
import re
import xml.etree.ElementTree as ET
from html import escape, unescape
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlparse, urlunparse
from build_shtorka import load_release, view_model

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / 'public'
CONFIG = json.loads((ROOT / 'content/seo.json').read_text())
SHTORKA_RELEASE = load_release()
SITE = CONFIG['site_url']
PERSON = SITE + '/#person'
WEBSITE = SITE + '/#website'
SCHEMA_RE = re.compile(r'<script\b(?=[^>]*\btype=[\'\"]application/ld\+json[\'\"])[^>]*>.*?</script>\s*', re.I | re.S)


def catalogue():
    cases = json.loads((ROOT / 'content/case-studies.json').read_text())['cases']
    pages = [dict(p) for p in CONFIG['pages']]
    for page in pages:
        if page['kind'] == 'application' and SHTORKA_RELEASE['mode'] == 'released':
            action = view_model(SHTORKA_RELEASE)['primary_label']
            page['title'] = action + ' | SHTORKA File Shelf for Mac'
            page['description'] = f'Get SHTORKA, a compact file shelf for Mac by Matvii Akkuratov. Version {SHTORKA_RELEASE["version"]} for macOS {SHTORKA_RELEASE["minimum_macos"]} or later. See download and purchase details.'
        if page['kind'] == 'case':
            case = cases[page['case']]
            copy = case[page['lang']]
            page.update(title=copy['meta_title'] + ' | Matvii Akkuratov', description=copy['meta_description'], live=case['live'])
        page.setdefault('index', True)
        page.setdefault('image', '/assets/developer-og-shtorka.png')
        page.setdefault('image_alt', page['title'])
        page.setdefault('image_width', 1200)
        page.setdefault('image_height', 630)
    return pages


class Document(HTMLParser):
    def __init__(self, html):
        super().__init__()
        self.capture = None
        self.buffer = []
        self.question = ''
        self.faq = []
        self.feed(html)

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == 'h2' and 'qa__q' in a.get('class', '').split():
            self.capture, self.buffer = 'question', []
        elif tag == 'p' and 'qa__a' in a.get('class', '').split():
            self.capture, self.buffer = 'answer', []
        elif tag == 'br' and self.capture:
            self.buffer.append(' ')

    def handle_data(self, text):
        if self.capture:
            self.buffer.append(text)

    def handle_endtag(self, tag):
        if (self.capture, tag) not in [('question', 'h2'), ('answer', 'p')]:
            return
        text = ' '.join(''.join(self.buffer).split())
        if self.capture == 'question':
            self.question = text
        else:
            self.faq.append({'@type': 'Question', 'name': self.question, 'acceptedAnswer': {'@type': 'Answer', 'text': text}})
        self.capture, self.buffer = None, []


def alternatives(page, pages):
    if not page.get('pair'):
        return {}
    result = {p['lang']: SITE + p['url'] for p in pages if p.get('pair') == page['pair']}
    result['x-default'] = result[CONFIG['default_language']]
    return result


def breadcrumbs(page, pages):
    if page['kind'] == 'home' or not page['index']:
        return []
    by_url = {p['url']: p for p in pages}
    chain, current = [], page
    seen = set()
    while current['url'] not in seen:
        seen.add(current['url'])
        chain.insert(0, current)
        if current['kind'] == 'home':
            break
        parent = current.get('parent', '/en/' if page['lang'] == 'en' else '/')
        current = by_url[parent]
    return chain


def selected_projects(page, pages):
    lang = page['lang']
    return [next(p for p in pages if p['kind'] == 'application')] + [p for p in pages if p['kind'] == 'case' and p['lang'] == lang]


def graph(page, pages, document):
    url = SITE + page['url']
    person = {'@type': 'Person', '@id': PERSON, 'name': 'Matvii Akkuratov', 'url': SITE + '/en/', 'jobTitle': 'Independent macOS developer and web designer', 'email': 'hello@matviiakkuratov.com', 'homeLocation': {'@type': 'Country', 'name': 'Sweden'}, 'knowsAbout': ['macOS development', 'Developer tools', 'UI/UX design', 'Web design'], 'sameAs': ['https://github.com/yee11ow', 'https://www.linkedin.com/in/matvii-akkuratov-20a91b283']}
    website = {'@type': 'WebSite', '@id': WEBSITE, 'url': SITE + '/', 'name': CONFIG['site_name'], 'inLanguage': ['sv', 'en'], 'publisher': {'@id': PERSON}}
    image = {'@type': 'ImageObject', '@id': url + '#image', 'url': SITE + page['image'], 'width': page['image_width'], 'height': page['image_height'], 'caption': page['image_alt']}
    types = {'home': 'WebPage', 'projects': 'CollectionPage', 'work': 'CollectionPage', 'profile': 'ProfilePage', 'contact': 'ContactPage', 'faq': 'FAQPage'}
    web_page = {'@type': types.get(page['kind'], 'WebPage'), '@id': url + '#webpage', 'url': url, 'name': page['title'], 'description': page['description'], 'inLanguage': page['lang'], 'isPartOf': {'@id': WEBSITE}, 'author': {'@id': PERSON}, 'primaryImageOfPage': {'@id': image['@id']}}
    nodes = [person, website, image, web_page]
    chain = breadcrumbs(page, pages)
    if chain:
        crumb = {'@type': 'BreadcrumbList', '@id': url + '#breadcrumb', 'itemListElement': [{'@type': 'ListItem', 'position': i + 1, 'name': p['label'], 'item': SITE + p['url']} for i, p in enumerate(chain)]}
        web_page['breadcrumb'] = {'@id': crumb['@id']}
        nodes.append(crumb)
    kind = page['kind']
    if kind in ['home', 'profile']:
        web_page['about'] = {'@id': PERSON}
        if kind == 'profile':
            web_page['mainEntity'] = {'@id': PERSON}
    elif kind == 'application':
        app = {'@type': 'SoftwareApplication', '@id': url + '#software', 'name': 'SHTORKA', 'url': url, 'description': page['description'], 'operatingSystem': 'macOS', 'applicationCategory': 'ProductivityApplication', 'creativeWorkStatus': 'In development', 'inLanguage': 'en', 'author': {'@id': PERSON}, 'image': {'@id': image['@id']}, 'mainEntityOfPage': {'@id': web_page['@id']}}
        if SHTORKA_RELEASE['mode'] == 'released':
            app.update(creativeWorkStatus='Released', softwareVersion=SHTORKA_RELEASE['version'], downloadUrl=SHTORKA_RELEASE['download_url'], operatingSystem='macOS ' + SHTORKA_RELEASE['minimum_macos'] + '+', processorRequirements=SHTORKA_RELEASE['processors'])
            if SHTORKA_RELEASE.get('price') is not None:
                app['offers'] = {'@type': 'Offer', 'url': SHTORKA_RELEASE['checkout_url'], 'price': str(SHTORKA_RELEASE['price']), 'priceCurrency': SHTORKA_RELEASE['currency'], 'description': {'one-time': 'One-time payment', 'monthly': 'Monthly subscription', 'yearly': 'Yearly subscription'}[SHTORKA_RELEASE['billing']]}
        web_page['mainEntity'] = {'@id': app['@id']}
        nodes.append(app)
    elif kind == 'case':
        project = {'@type': 'CreativeWork', '@id': url + '#project', 'name': page['title'].split(' | ')[0], 'description': page['description'], 'url': url, 'genre': 'Independent UX case study', 'creativeWorkStatus': 'Independent concept; not commissioned by the firm', 'inLanguage': page['lang'], 'author': {'@id': PERSON}, 'image': {'@id': image['@id']}, 'mainEntityOfPage': {'@id': web_page['@id']}, 'workExample': {'@type': 'WebSite', 'name': page['label'] + ' — independent interface prototype', 'url': page['live']}}
        web_page['mainEntity'] = {'@id': project['@id']}
        nodes.append(project)
    elif kind in ['projects', 'work']:
        projects = selected_projects(page, pages)
        if kind == 'work':
            projects = [p for p in projects if p['kind'] == 'case']
        listing = {'@type': 'ItemList', '@id': url + '#projects', 'name': page['label'], 'numberOfItems': len(projects), 'itemListElement': [{'@type': 'ListItem', 'position': i + 1, 'item': {'@type': 'WebPage', '@id': SITE + p['url'] + '#webpage', 'url': SITE + p['url'], 'name': p['label']}} for i, p in enumerate(projects)]}
        web_page['mainEntity'] = {'@id': listing['@id']}
        nodes.append(listing)
    elif kind == 'service':
        service = {'@type': 'Service', '@id': url + '#service', 'name': page['title'].split(' | ')[0], 'url': url, 'description': page['description'], 'serviceType': 'Web design and front-end development', 'provider': {'@id': PERSON}, 'areaServed': {'@type': 'Country', 'name': 'Sweden'}}
        web_page['mainEntity'] = {'@id': service['@id']}
        nodes.append(service)
    elif kind == 'faq':
        web_page['mainEntity'] = document.faq
    elif kind == 'guide':
        article = {'@type': 'Article', '@id': url + '#guide', 'headline': page['title'].split(' | ')[0], 'description': page['description'], 'url': url, 'inLanguage': page['lang'], 'author': {'@id': PERSON}, 'image': SITE + page['image'], 'mainEntityOfPage': {'@id': web_page['@id']}}
        web_page['mainEntity'] = {'@id': article['@id']}
        nodes.append(article)
    return {'@context': 'https://schema.org', '@graph': nodes}


def normalize_links(html, page, pages):
    aliases = {}
    for p in pages:
        aliases[p['url']] = p['url']
        aliases['/' + p['file']] = p['url']

    def replace(match):
        ref = unescape(match.group(2))
        if ref.startswith('#'):
            return match.group(0)
        url = urlparse(urljoin(SITE + page['url'], ref))
        if url.scheme not in ['http', 'https'] or url.hostname not in ['matviiakkuratov.com', 'www.matviiakkuratov.com']:
            return match.group(0)
        if url.path not in aliases:
            return match.group(0)
        target = urlunparse(('', '', aliases[url.path], '', url.query, url.fragment))
        return match.group(1) + escape(target, quote=True) + match.group(3)
    return re.sub(r'(\bhref=[\'\"])([^\'\"]+)([\'\"])', replace, html)


def visible_navigation(page, pages):
    chain = breadcrumbs(page, pages)
    if not chain:
        return '', ''
    en = page['lang'] == 'en'
    items = ''.join('<li>' + (f'<span aria-current="page">{escape(p["label"])}</span>' if i == len(chain)-1 else f'<a href="{SITE + p["url"]}">{escape(p["label"])}</a>') + '</li>' for i, p in enumerate(chain))
    crumb = f'<!-- seo:breadcrumbs:start --><nav class="seo-breadcrumb" aria-label="{"Breadcrumb" if en else "Brödsmulor"}"><ol>{items}</ol></nav><!-- seo:breadcrumbs:end -->'
    if page['kind'] == 'projects':
        return crumb, ''
    lang = page['lang']
    targets = [p for p in pages if p['lang'] == lang and p['kind'] in ['projects', 'service', 'case'] and p['url'] != page['url'] and p['file'] != 'partners.html']
    if page['kind'] == 'case':
        targets = sorted(targets, key=lambda p: p['kind'] != 'case')
    elif page['kind'] == 'application':
        targets = sorted(targets, key=lambda p: p['kind'] != 'projects')
    targets = targets[:3]
    links = ''.join(f'<li><a href="{SITE + p["url"]}">{escape(p["label"])} <span aria-hidden="true">↗</span></a></li>' for p in targets)
    related = f'<!-- seo:related:start --><nav class="seo-related" aria-labelledby="related-projects"><h2 id="related-projects">{"Explore more work" if en else "Utforska fler projekt"}</h2><ul>{links}</ul></nav><!-- seo:related:end -->'
    return crumb, related


def render(page, pages):
    path = PUBLIC / page['file']
    html = path.read_text()
    document = Document(html)
    html = SCHEMA_RE.sub('', html)
    html = re.sub(r'<!-- seo:(breadcrumbs|related):start -->.*?<!-- seo:\1:end -->\s*', '', html, flags=re.S)
    html = normalize_links(html, page, pages)
    head_match = re.search(r'<head>(.*?)</head>', html, re.S | re.I)
    head = head_match.group(1)

    def clean_meta(match):
        tag = match.group(0)
        key = re.search(r'\b(?:name|property)=[\'\"]([^\'\"]+)', tag, re.I)
        if key and (key[1] in ['description', 'robots'] or key[1].startswith(('og:', 'twitter:', 'article:'))):
            return ''
        return tag

    head = re.sub(r'<meta\b[^>]*>', clean_meta, head, flags=re.I)
    head = re.sub(r'<link\b[^>]*(?:rel=[\'\"]canonical[\'\"]|hreflang=[\'\"][^\'\"]+[\'\"]|href=[\'\"]/seo\.css[\'\"])[^>]*>', '', head, flags=re.I)
    head = re.sub(r'<title>.*?</title>', lambda _: '<title>' + escape(page['title']) + '</title>', head, flags=re.S | re.I)
    url = SITE + page['url']
    metadata = [f'<meta name="description" content="{escape(page["description"], quote=True)}">', f'<meta name="robots" content="{"index, follow, max-image-preview:large" if page["index"] else "noindex, follow"}">', f'<link rel="canonical" href="{url}">']
    for lang, target in alternatives(page, pages).items():
        metadata.append(f'<link rel="alternate" hreflang="{lang}" href="{target}">')
    social = {'og:type': 'article' if page['kind'] == 'case' else 'website', 'og:site_name': 'SHTORKA' if page['kind'] == 'application' else CONFIG['site_name'], 'og:title': page['title'], 'og:description': page['description'], 'og:url': url, 'og:locale': 'sv_SE' if page['lang'] == 'sv' else 'en_GB', 'og:image': SITE + page['image'], 'og:image:width': page['image_width'], 'og:image:height': page['image_height'], 'og:image:alt': page['image_alt']}
    metadata += [f'<meta property="{name}" content="{escape(str(value), quote=True)}">' for name, value in social.items()]
    for lang in alternatives(page, pages):
        if lang not in [page['lang'], 'x-default']:
            metadata.append(f'<meta property="og:locale:alternate" content="{"sv_SE" if lang == "sv" else "en_GB"}">')
    for name, value in {'card': 'summary_large_image', 'title': page['title'], 'description': page['description'], 'image': SITE + page['image'], 'image:alt': page['image_alt']}.items():
        metadata.append(f'<meta name="twitter:{name}" content="{escape(value, quote=True)}">')
    metadata.append('<link rel="stylesheet" href="/seo.css">')
    if page['kind'] != 'error':
        data = json.dumps(graph(page, pages, document), ensure_ascii=False, separators=(',', ':')).replace('<', '\\u003c')
        metadata.append('<script type="application/ld+json" id="page-schema">' + data + '</script>')
    head = re.sub(r'\n[ \t]*\n(?:[ \t]*\n)+', '\n\n', head).rstrip() + '\n  ' + '\n  '.join(metadata) + '\n'
    head = '\n'.join(line.rstrip() for line in head.splitlines()) + '\n'
    html = html[:head_match.start(1)] + head + html[head_match.end(1):]
    crumb, related = visible_navigation(page, pages)
    if crumb:
        html = re.sub(r'(<main\b[^>]*>)\s*', lambda m: m[1] + '\n' + crumb + '\n', html, count=1)
    if related:
        html = html.replace('</main>', related + '\n</main>', 1)
    path.write_text(html)


def sitemap(pages):
    ns, xhtml = 'http://www.sitemaps.org/schemas/sitemap/0.9', 'http://www.w3.org/1999/xhtml'
    ET.register_namespace('', ns)
    ET.register_namespace('xhtml', xhtml)
    root = ET.Element('{' + ns + '}urlset')
    for page in pages:
        if not page['index']:
            continue
        node = ET.SubElement(root, '{' + ns + '}url')
        ET.SubElement(node, '{' + ns + '}loc').text = SITE + page['url']
        for lang, target in alternatives(page, pages).items():
            ET.SubElement(node, '{' + xhtml + '}link', rel='alternate', hreflang=lang, href=target)
    ET.indent(root, space='  ')
    ET.ElementTree(root).write(PUBLIC / 'sitemap.xml', encoding='utf-8', xml_declaration=True)
    (PUBLIC / 'robots.txt').write_text('User-agent: *\nAllow: /\n\nSitemap: ' + SITE + '/sitemap.xml\n')
    # Current assets bypass Functions; retired brand/image URLs redirect once.
    routes = {'/nova', '/nova/*', '/assets/developer-og.png', '/assets/developer-og.svg'}
    for page in pages:
        routes.add(page['url'])
        routes.add('/' + page['file'])
        if page['url'] != '/' and page['url'].endswith('/'):
            routes.add(page['url'].rstrip('/'))
        elif page['url'] != '/':
            routes.add(page['url'] + '/')
    (PUBLIC / '_routes.json').write_text(json.dumps({'version': 1, 'include': sorted(routes), 'exclude': []}, indent=2) + '\n')


if __name__ == '__main__':
    pages = catalogue()
    for page in pages:
        render(page, pages)
    sitemap(pages)
    print(f'SEO: {len(pages)} pages; {sum(p["index"] for p in pages)} indexable canonical URLs.')
