#!/usr/bin/env python3
"""Render the four bilingual case bodies without changing their site navigation."""
import json
import re
from html import escape as e
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
COPY = json.loads((ROOT / 'content/case-studies.json').read_text())


def tag(name, text, css=''):
    return f'<{name}' + (f' class="{css}"' if css else '') + f'>{e(text)}</{name}>'


def render(case, lang):
    d = case[lang]
    ui = COPY['labels'][lang]
    work = '/en/work/' if lang == 'en' else '/arbeten/'
    faq = '/en/faq/' if lang == 'en' else '/vanliga-fragor/'
    out = ['<main id="main"><article class="cs cs--ux page-top"><div class="wrap cs__wrap">']
    out += [f'<a class="cs__back" href="{work}">{e(ui["back"])}</a>', tag('p', ui['eyebrow'], 'eyebrow'), tag('h1', d['title'], 'cs__title'), tag('p', d['intro'], 'cs__intro')]
    out += ['<dl class="cs__summary">']
    for title, value in zip(ui['summary'], [d['role'], d['scope'], ui['status']]):
        out += [f'<div><dt>{e(title)}</dt><dd>{e(value)}</dd></div>']
    out += ['</dl>', tag('p', ui['disclaimer'], 'cs__notice')]
    out += [f'<a class="link-out cs__live" href="{case["live"]}" target="_blank" rel="noopener">{e(ui["live"])}</a>', f'<nav class="cs__toc" aria-label="{e(ui["contents"])}">']
    for anchor, name in zip(['evidence', 'people', 'flow', 'wireframes', 'interface', 'validation'], ui['toc']):
        out += [f'<a href="#{anchor}">{e(name)}</a>']
    out += ['</nav>']
    out += ['<section id="evidence" class="cs__section">', tag('p', '01 / '+ui['toc'][0], 'eyebrow'), tag('h2', d['problem_title'], 'cs__h'), tag('p', d['problem'], 'cs__p'), tag('p', ui['evidence_note'], 'cs__caption'), '<div class="cs__evidence">']
    for title, body, decision in d['evidence']:
        out += [f'<div class="cs__evidence-row"><h3>{e(title)}</h3><p>{e(body)}</p><p><strong>{e(ui["decision"])}</strong> {e(decision)}</p></div>']
    out += ['</div>', tag('p', d['question'], 'cs__question'), '</section>']
    out += ['<section id="people" class="cs__section">', tag('p', '02 / '+ui['toc'][1], 'eyebrow'), tag('h2', ui['people_title'], 'cs__h'), tag('p', ui['people_note'], 'cs__p'), '<div class="cs__people">']
    for person, task, need in d['people']:
        out += ['<div class="cs__person">', tag('h3', person), tag('p', task, 'cs__task'), tag('p', need), '</div>']
    out += ['</div>', tag('p', d['constraints'], 'cs__p'), '</section>']
    out += ['<section id="flow" class="cs__section">', tag('p', '03 / '+ui['toc'][2], 'eyebrow'), tag('h2', d['flow_title'], 'cs__h'), tag('p', d['flow_note'], 'cs__p'), '<div class="cs__flows">']
    for i, (title, steps, fallback) in enumerate(d['flows']):
        out += [f'<details class="cs__flow"'+(' open' if i == 0 else '')+f'><summary>{e(title)}</summary><ol class="cs__path">']
        for step in steps:
            out += [tag('li', step)]
        out += ['</ol>', tag('p', fallback, 'cs__fallback'), '</details>']
    out += ['</div>', '</section>']
    out += ['<section id="wireframes" class="cs__section">', tag('p', '04 / '+ui['toc'][3], 'eyebrow'), tag('h2', ui['wire_title'], 'cs__h'), tag('p', ui['wire_note'], 'cs__p'), '<div class="cs__wires">']
    for i, (title, blocks, why) in enumerate(d['wires']):
        out += ['<figure class="cs__wire">', f'<div class="cs__wire-screen"><span class="cs__wire-top">{e(ui["wire_label"])} / 0{i+1}</span>']
        for j, block in enumerate(blocks):
            out += [tag('div', block, 'cs__wire-block'+(' cs__wire-block--action' if j == len(blocks)-1 else ''))]
        out += ['</div>', f'<figcaption><strong>{e(title)}</strong><span>{e(why)}</span></figcaption>', '</figure>']
    out += ['</div>', '</section>']
    out += ['<section id="interface" class="cs__section">', tag('p', '05 / '+ui['toc'][4], 'eyebrow'), tag('h2', ui['interface_title'], 'cs__h'), '<ol class="cs__moves">']
    for i, (title, why) in enumerate(d['decisions']):
        out += [f'<li class="cs__move"><span class="cs__num" aria-hidden="true">0{i+1}</span><div>{tag("h3", title, "cs__lead")}{tag("p", why, "cs__why")}</div></li>']
    out += ['</ol>', '<div class="cs__screens">']
    for shot, caption in zip(case['shots'], d['captions']):
        out += [f'<figure class="cs__screen"><a href="/assets/{shot[0]}" target="_blank" rel="noopener" aria-label="{e(ui["enlarge"]+": "+caption)}"><img src="/assets/{shot[0]}" width="{shot[1]}" height="{shot[2]}" alt="{e(caption)}" loading="lazy" /></a><figcaption>{e(caption)}</figcaption></figure>']
    out += ['</div>', tag('p', ui['screen_note'], 'cs__caption'), '</section>']
    out += ['<section id="validation" class="cs__section">', tag('p', '06 / '+ui['toc'][5], 'eyebrow'), tag('h2', ui['validation_title'], 'cs__h'), tag('p', ui['validation_note'], 'cs__p'), '<div class="cs__validation">']
    for title, body in d['tests']:
        out += ['<div>', tag('h3', title), tag('p', body), '</div>']
    out += ['</div>', tag('h3', ui['learning_title'], 'cs__subh'), tag('p', d['learning'], 'cs__p'), tag('h3', ui['next_title'], 'cs__subh'), tag('p', d['next'], 'cs__p'), '</section>']
    out += ['<div class="cs__close">', tag('h2', ui['cta_title'], 'cs__closeh'), tag('p', ui['cta_body'], 'cs__p'), '<div class="cs__cta">', f'<a class="btn btn--primary" href="https://cal.com/matviiakkuratov/quick-intro" target="_blank" rel="noopener">{e(ui["book"])}</a>', f'<a class="btn btn--ghost" href="{faq}">{e(ui["faq"])}</a>', '</div></div>', '</div></article></main>']
    return '\n'.join(out)


for case in COPY['cases']:
    for lang in ['en', 'sv']:
        path = ROOT / 'public' / case[lang]['path']
        original = path.read_text()
        output = re.sub(r'<main id="main">.*?</main>', lambda _: render(case, lang), original, flags=re.S)
        if 'href="/cases.css"' not in output:
            output = output.replace('</head>', '  <link rel="stylesheet" href="/cases.css" />\n</head>')
        title = case[lang]['meta_title']+' | Matvii'
        description = case[lang]['meta_description']
        output = re.sub(r'<title>.*?</title>', lambda _: tag('title', title), output)
        for attr, key, value in [('name', 'description', description), ('property', 'og:title', title), ('property', 'og:description', description)]:
            output = re.sub(fr'<meta {attr}="{key}" content="[^"]*"\s*/>', lambda _, a=attr, k=key, v=value: f'<meta {a}="{k}" content="{e(v, quote=True)}" />', output)
        path.write_text(output)
        print(path.relative_to(ROOT))
