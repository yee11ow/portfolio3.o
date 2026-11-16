#!/usr/bin/env python3
"""Build Nova's acquisition page from one checked release configuration."""
from decimal import Decimal, InvalidOperation
from html import escape
import json
from pathlib import Path
import re
from string import Template
from urllib.parse import urlencode, urlparse

ROOT = Path(__file__).resolve().parents[1]


def validate_release(config):
    if config.get('mode') not in ['early-access', 'released']:
        raise ValueError('Nova mode must be early-access or released')
    if not re.fullmatch(r'[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}', config.get('email', '')):
        raise ValueError('Nova needs a valid contact email')
    if config['mode'] == 'early-access':
        if any(config.get(key) is not None for key in ['download_url', 'checkout_url', 'price', 'trial_days']):
            raise ValueError('Keep unreleased downloads, prices and checkout out of the public configuration')
        return config
    for key in ['version', 'minimum_macos', 'processors', 'download_url']:
        if not isinstance(config.get(key), str) or not config[key].strip():
            raise ValueError('A release requires verified ' + key)
    for key in ['download_url', 'checkout_url', 'terms_url']:
        if config.get(key):
            url = urlparse(config[key])
            if url.scheme != 'https' or not url.hostname or url.username or url.password:
                raise ValueError(key + ' must be an absolute HTTPS URL without credentials')
    if config.get('price') is None:
        if any(config.get(key) is not None for key in ['checkout_url', 'currency', 'billing', 'trial_days']):
            raise ValueError('A free release cannot show a checkout or paid trial')
        return config
    try:
        amount = Decimal(str(config['price']))
        if not amount.is_finite() or amount <= 0:
            raise InvalidOperation
    except InvalidOperation as error:
        raise ValueError('A paid release needs a positive, confirmed price') from error
    if not re.fullmatch(r'[A-Z]{3}', config.get('currency') or ''):
        raise ValueError('A paid release needs an ISO currency code')
    if config.get('billing') not in ['one-time', 'monthly', 'yearly']:
        raise ValueError('A paid release needs explicit billing terms')
    if not config.get('checkout_url') or not config.get('terms_url'):
        raise ValueError('A paid release needs real checkout and purchase-terms URLs')
    days = config.get('trial_days')
    if days is not None and (type(days) is not int or days < 1):
        raise ValueError('Trial length must be a confirmed positive number of days')
    return config


def load_release():
    return validate_release(json.loads((ROOT / 'content/nova-release.json').read_text()))


def view_model(config):
    validate_release(config)
    email = config['email']
    mail = 'mailto:' + email + '?' + urlencode({
        'subject': 'Nova early access',
        'body': "Hi Matvii,\n\nI'd like to request early access to Nova.\n\nHere's how I work on my Mac:\n",
    })
    if config['mode'] == 'early-access':
        return {
            'status': 'In development', 'primary_label': 'Request early access',
            'primary_url': mail, 'secondary_action': '',
            'hero_note': 'Opens email · In development · No payment required',
            'access_eyebrow': 'Early access', 'access_title': 'Be there<br><em>from the beginning.</em>',
            'access_copy': 'Interested in a developer panel for your Mac? Send Matvii a short email to register your interest in Nova.',
            'offer': '<p class="offer-line">Not available to download yet.</p>',
            'action_note': 'Opens your email app. Your request is sent only when you send the email.',
            'availability_answer': 'Nova is in development and is not available to download yet. You can request early access by email. A release date has not been announced.',
            'price_answer': 'Pricing and the purchase model are still being decided. Requesting early access does not involve a payment or a purchase commitment.',
            'compatibility_answer': 'Nova is being developed for macOS. The minimum macOS version and supported processors will be confirmed before a download is offered.',
            'next_answer': 'Your email goes directly to Matvii, the maker of Nova. He can reply about the project and your interest in testing it. This is a personal enquiry, not an automatic account or a confirmed beta invitation.',
        }
    paid = config.get('price') is not None
    trial = config.get('trial_days')
    price = (str(config['price']) + ' ' + config['currency']) if paid else 'Free'
    billing = {'one-time': 'one-time payment', 'monthly': 'billed monthly', 'yearly': 'billed yearly'}.get(config.get('billing'), '')
    buy_first = paid and not trial
    label = 'Buy Nova' if buy_first else 'Download for Mac'
    href = config['checkout_url'] if buy_first else config['download_url']
    secondary = ''
    if paid:
        other_label = 'Already purchased? Download Nova' if buy_first else 'Buy Nova · ' + price
        other_url = config['download_url'] if buy_first else config['checkout_url']
        secondary = f'<a class="secondary-action" data-secondary-action href="{escape(other_url, quote=True)}">{escape(other_label)} <span aria-hidden="true">↗</span></a>'
    terms = f'<a href="{escape(config["terms_url"], quote=True)}">Purchase terms</a>' if paid else ''
    offer = f'<p class="offer-price">{escape(price)} <span>{escape(billing)}</span></p>'
    if trial:
        offer += f'<p class="offer-line">{trial}-day trial. {terms}</p>'
    elif terms:
        offer += f'<p class="offer-line">{terms}</p>'
    return {
        'status': 'Available for Mac', 'primary_label': label, 'primary_url': href,
        'secondary_action': secondary, 'hero_note': f'macOS {config["minimum_macos"]}+ · {config["processors"]} · Version {config["version"]}',
        'access_eyebrow': 'Get Nova', 'access_title': 'Your Mac.<br><em>Meet Nova.</em>',
        'access_copy': 'Download Nova for your Mac.' if not buy_first else 'Purchase Nova, then download the app for your Mac.',
        'offer': offer, 'action_note': 'Final total and any applicable tax are shown at checkout.' if paid else 'Download the macOS installer.',
        'availability_answer': 'Nova is available for Mac. Use the download link on this page to get the installer.',
        'price_answer': f'{price}, {billing}. See the purchase terms and final total at checkout.' if paid else 'Nova is free to download.',
        'compatibility_answer': f'Version {config["version"]} requires macOS {config["minimum_macos"]} or later. Supported processors: {config["processors"]}.',
        'next_answer': f'{trial}-day trial available. After trying Nova, use the purchase link for the paid license. Questions can be sent to {email}.' if trial else f'Follow the instructions supplied with your download or purchase. For help, contact {email}.',
    }


def render(config):
    data = view_model(config)
    # Only these two values contain intentional, generated HTML.
    html_keys = {'access_title', 'offer', 'secondary_action'}
    data = {key: value if key in html_keys else escape(value, quote=True) for key, value in data.items()}
    data['email'] = escape(config['email'], quote=True)
    return Template((ROOT / 'templates/nova.html').read_text()).substitute(data)


if __name__ == '__main__':
    output = ROOT / 'public/nova/index.html'
    output.write_text(render(load_release()))
    print('public/nova/index.html')
