#!/usr/bin/env python3
"""Build the bilingual, crawlable project directory without client-side rendering."""
import json
from html import escape as e
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
COPY = {
    'en': {'home':'/en/','projects':'/en/projects/','web':'/en/web-design/','work':'Projects','about':'About','contact':'Get in touch','eyebrow':'Selected projects / 03','heading':'Mac apps.<br>Websites with <em>intent.</em>','intro':'Nova is my current macOS project. Alongside it, I explore website design through independent UX studies for professional firms.','nova':'Nova for Mac','nova_body':'A developer panel for Mac, currently in development. Explore the visual concept and request early access by email.','status':'In development','app_cta':'Explore Nova & early access','audit':'FB Revision','audit_type':'Audit firm website · UX case study','audit_body':'An independent website concept for an audit and accountancy firm in Uppsala. Follow the route from requirements and enquiry flows to responsive interface design.','law':'Nordström Advokater','law_type':'Law firm website & portal · UX case study','law_body':'An independent law-firm website and bankruptcy intake concept. Explore task-based navigation, user flows, interface decisions and the working prototype.','case_cta':'Read the UX case study','case_status':'Independent concept · Not commissioned','service':'Web design for your firm','service_body':'See how I approach website projects, what the process includes and how to get in touch.','service_cta':'Explore web design','footer':'Independent macOS developer & designer','privacy':'Legal & privacy'},
    'sv': {'home':'/','projects':'/projects/','web':'/web-design/','work':'Projekt','about':'Om mig','contact':'Ta kontakt','eyebrow':'Utvalda projekt / 03','heading':'Mac-appar.<br>Webbplatser med <em>omtanke.</em>','intro':'Nova är mitt aktuella macOS-projekt. Vid sidan av det utforskar jag webbdesign genom egna UX-studier för professionella tjänsteföretag.','nova':'Nova för Mac','nova_body':'En panel för utvecklare på Mac, just nu under utveckling. Utforska det visuella konceptet och anmäl ditt intresse för tidig tillgång via e-post.','status':'Under utveckling','app_cta':'Utforska Nova & tidig tillgång','audit':'FB Revision','audit_type':'Webbplats för revisionsbyrå · UX-fallstudie','audit_body':'Ett eget webbplatskoncept för en revisions- och redovisningsbyrå i Uppsala. Följ arbetet från krav och kontaktflöden till responsiv gränssnittsdesign.','law':'Nordström Advokater','law_type':'Advokatwebbplats & portal · UX-fallstudie','law_body':'Ett eget koncept för en advokatwebbplats och en konkursportal. Utforska uppgiftsbaserad navigering, användarflöden, gränssnittsbeslut och prototypen.','case_cta':'Läs UX-fallstudien','case_status':'Eget koncept · Ej beställt','service':'Webbdesign för er byrå','service_body':'Läs om mitt arbetssätt för webbprojekt, vad processen omfattar och hur ni kontaktar mig.','service_cta':'Utforska webbdesign','footer':'Oberoende macOS-utvecklare & designer','privacy':'Juridik & integritet'},
}


def render(lang):
    d = COPY[lang]
    cases = json.loads((ROOT / 'content/case-studies.json').read_text())['cases']
    cards = []
    for i, key in enumerate(['audit', 'law']):
        case = cases[i]
        shot = case['shots'][0]
        cards.append(f'''<li class="directory-card"><a class="directory-image" href="/{case[lang]['path'].replace('index.html','')}"><img src="/assets/{shot[0]}" width="{shot[1]}" height="{shot[2]}" alt="{e(d[key+'_type'])}" loading="lazy"></a><div class="directory-copy"><p class="eyebrow">0{i+2} / {e(d[key+'_type'])}</p><h2><a href="/{case[lang]['path'].replace('index.html','')}">{e(d[key])}</a></h2><p>{e(d[key+'_body'])}</p><p class="directory-status">{e(d['case_status'])}</p><a class="project-link" href="/{case[lang]['path'].replace('index.html','')}">{e(d['case_cta'])}<span aria-hidden="true">↗</span></a></div></li>''')
    return f'''<!doctype html>
<html lang="{lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><title>{d['work']} | Matvii Akkuratov</title><meta name="description" content="{e(d['intro'])}"><meta name="theme-color" content="#101210"><link rel="icon" href="/assets/developer-icon.svg" type="image/svg+xml"><link rel="stylesheet" href="/assets/fonts/fonts.css"><link rel="stylesheet" href="/developer.css"></head>
<body><a class="skip" href="#main">{'Skip to content' if lang=='en' else 'Hoppa till innehållet'}</a><header class="dev-header shell"><a class="wordmark" href="{d['home']}" aria-label="Matvii Akkuratov"><span class="monogram" aria-hidden="true">ma<span>↗</span></span><span>Matvii<br>Akkuratov</span></a><nav class="dev-nav" aria-label="{'Primary' if lang=='en' else 'Huvudmeny'}"><a href="{d['projects']}" aria-current="page">{d['work']}</a><a href="{d['home']}#about">{d['about']}</a><a href="{d['home']}#contact">{d['contact']} ↗</a></nav><div class="languages" aria-label="{'Language' if lang=='en' else 'Språk'}"><a href="/projects/" lang="sv" hreflang="sv"{' aria-current="page"' if lang=='sv' else ''}>SV</a><a href="/en/projects/" lang="en" hreflang="en"{' aria-current="page"' if lang=='en' else ''}>EN</a></div></header>
<main id="main" tabindex="-1"><section class="projects-page shell"><p class="eyebrow">{d['eyebrow']}</p><h1>{d['heading']}</h1><p class="directory-intro">{d['intro']}</p><ul class="project-directory"><li class="directory-card directory-app"><div class="directory-copy"><p class="eyebrow">01 / macOS · {d['status']}</p><h2><a href="/nova/" hreflang="en">{d['nova']}</a></h2><p>{d['nova_body']}</p><a class="project-link" href="/nova/" hreflang="en">{d['app_cta']}<span aria-hidden="true">↗</span></a></div><div class="directory-app-art" aria-hidden="true"><span class="app-icon nova-icon">n</span><span>Nova / macOS</span></div></li>{''.join(cards)}</ul><div class="directory-service"><h2>{d['service']}</h2><p>{d['service_body']}</p><a class="project-link" href="{d['web']}">{d['service_cta']}<span aria-hidden="true">↗</span></a></div></section></main>
<footer class="dev-footer shell"><p>Matvii Akkuratov<span>{d['footer']}</span></p><div><a href="mailto:hello@matviiakkuratov.com">{'Email' if lang=='en' else 'E-post'}</a><a href="https://github.com/yee11ow">GitHub ↗</a><a href="{d['web']}">{d['service_cta']}</a><a href="{'/en/legal' if lang=='en' else '/legal'}">{d['privacy']}</a></div></footer></body></html>'''


if __name__ == '__main__':
    for lang, path in [('sv', 'public/projects/index.html'), ('en', 'public/en/projects/index.html')]:
        target = ROOT / path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(render(lang))
        print(path)
