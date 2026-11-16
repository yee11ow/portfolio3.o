#!/usr/bin/env python3
"""Notify IndexNow after the checked canonical pages are actually deployed."""
import argparse
from concurrent.futures import ThreadPoolExecutor
import json
from pathlib import Path
import re
import time
from urllib.error import HTTPError
from urllib.parse import urlparse
from urllib.request import HTTPRedirectHandler, Request, build_opener
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / 'public'
ENDPOINT = 'https://api.indexnow.org/indexnow'


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, *args):
        return None


def prepare():
    config = json.loads((ROOT / 'content/seo.json').read_text())
    host = urlparse(config['site_url']).hostname
    key_path = PUBLIC / config['indexnow_key_file']
    key = key_path.read_text().strip()
    if not re.fullmatch(r'[a-f0-9]{32}', key) or key_path.name != key + '.txt':
        raise ValueError('Invalid local IndexNow ownership file')
    ns = '{http://www.sitemaps.org/schemas/sitemap/0.9}'
    urls = [node.find(ns + 'loc').text for node in ET.parse(PUBLIC / 'sitemap.xml').getroot()]
    if not urls or len(urls) != len(set(urls)) or any(urlparse(url).hostname != host for url in urls):
        raise ValueError('IndexNow may only receive unique canonical URLs on the configured host')
    expected = {config['site_url'] + p['url'] for p in config['pages'] if p.get('index', True)}
    if set(urls) != expected:
        raise ValueError('Sitemap and indexable catalogue differ')
    return config, key, urls


def request(url, data=None):
    headers = {'User-Agent': 'MatviiSEOCheckerBot/1.0', 'Accept': 'application/json' if data else '*/*'}
    if data is not None:
        headers['Content-Type'] = 'application/json; charset=utf-8'
    return build_opener(NoRedirect()).open(Request(url, data=data, headers=headers), timeout=20)


def verify_deployment(config, key):
    with request(config['site_url'] + '/' + config['indexnow_key_file']) as response:
        if response.status != 200 or response.read().decode().strip() != key:
            raise ValueError('The IndexNow ownership file is not deployed')
    records = [p for p in config['pages'] if p.get('index', True)]
    def verify(page):
        with request(config['site_url'] + page['url']) as response:
            body = response.read()
            if response.status != 200 or 'noindex' in response.headers.get('X-Robots-Tag', '').lower():
                raise ValueError('Canonical URL is redirected or not indexable: ' + page['url'])
            if body != (PUBLIC / page['file']).read_bytes():
                raise ValueError('The expected page is not deployed: ' + page['url'])
    with ThreadPoolExecutor(max_workers=4) as pool:
        list(pool.map(verify, records))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--submit', action='store_true', help='Send a notification after verifying production')
    parser.add_argument('--wait-seconds', type=int, default=0, help='Wait up to this many seconds for deployment')
    args = parser.parse_args()
    config, key, urls = prepare()
    if not args.submit:
        print(f'IndexNow dry run: {len(urls)} canonical URLs; local ownership file is valid. No request sent.')
        return
    deadline = time.monotonic() + max(0, args.wait_seconds)
    while True:
        try:
            verify_deployment(config, key)
            break
        except (HTTPError, OSError, ValueError) as error:
            if time.monotonic() >= deadline:
                raise RuntimeError('Production verification failed; no search notification was sent: ' + str(error)) from error
            print('Waiting for the checked production pages to be available…', flush=True)
            time.sleep(min(10, max(0, deadline-time.monotonic())))
    payload = {'host': urlparse(config['site_url']).hostname, 'key': key, 'keyLocation': config['site_url'] + '/' + config['indexnow_key_file'], 'urlList': urls}
    try:
        with request(ENDPOINT, json.dumps(payload).encode()) as response:
            status = response.status
    except HTTPError as error:
        raise RuntimeError(f'IndexNow rejected the request (HTTP {error.code}); do not report submission as successful') from error
    if status not in [200, 202]:
        raise RuntimeError(f'Unexpected IndexNow response: HTTP {status}')
    print(f'IndexNow received {len(urls)} canonical URLs (HTTP {status}).' + (' Ownership verification is pending.' if status == 202 else ''))
    print('A notification is not a guarantee of crawling or indexing.')


if __name__ == '__main__':
    main()
