#!/usr/bin/env python3
"""Render the bilingual developer home. Static output needs no build at deploy."""
from html import escape as e
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
COPY = {
    'en': {
        'home': '/en/', 'web': '/en/web-design/', 'legal': '/en/legal', 'projects': '/en/projects/', 'allProjects': 'All projects',
        'title': 'Matvii Akkuratov · Independent macOS developer',
        'description': 'Independent macOS developer building SHTORKA, a panel for developers on Mac. Explore my work, interface experiments and web design.',
        'skip': 'Skip to content', 'work': 'Work', 'about': 'About', 'contact': 'Get in touch',
        'role': 'Independent macOS developer & designer', 'location': 'Based in Sweden',
        'headline': 'Made for Mac.<br>Built with <em>care.</em>',
        'intro': 'I’m Matvii. I build macOS apps, explore how interfaces feel, and turn ideas into things you can use.',
        'cta': 'Explore my work', 'mail': 'Say hello', 'hint': 'A little craft. A lot of curiosity.',
        'lab': 'Interface playground', 'labHint': 'Grab the panel. Make yourself at home.',
        'drag': 'Move this panel with the arrow keys, or drag its handle',
        'motion': 'Pause animation', 'resume': 'Resume animation', 'reset': 'Reset panel',
        'panelTitle': 'Currently in my orbit', 'panelSub': 'Two ways I make things.',
        'shtorkaSub': 'A developer panel for Mac', 'webSub': 'Selected websites & case studies',
        'projectsLabel': '01 / Selected work', 'projectsTitle': 'Ideas, becoming real.',
        'projectsIntro': 'An app in the making. A practice in web design. Different surfaces, the same attention to detail.',
        'development': 'In development', 'shtorkaDescription': 'A panel for developers on Mac. My current macOS project, taking shape one detail at a time.',
        'shtorkaLink': 'Meet SHTORKA', 'concept': 'Visual concept', 'webTitle': 'Web design',
        'webDescription': 'Websites for professional firms. Explore the design process and two independent concepts for an audit firm and a law firm.',
        'webLink': 'Explore web design', 'webTag': 'Design & development', 'webConcept': 'Independent concept',
        'aboutLabel': '02 / Behind the work', 'aboutTitle': 'Developer’s mind.<br>Designer’s eye.',
        'aboutBody': 'I’m Matvii Akkuratov, an independent developer and designer based in Sweden. My focus is macOS software, with web design as a complementary practice.',
        'aboutBody2': 'I’m interested in the small things that make a tool feel right: a clear hierarchy, a useful shortcut, a transition that knows when to get out of the way.',
        'principles': ['Useful by intention', 'Considered in detail', 'Built to be used'],
        'contactLabel': '03 / Start a conversation', 'contactTitle': 'Have something<br>in <em>mind?</em>',
        'contactBody': 'A Mac app, a website, or a question about SHTORKA. I’d like to hear it.',
        'copy': 'Copy email', 'copied': 'Email copied', 'copyError': 'Select and copy the email above.',
        'footer': 'Independent by design.', 'privacy': 'Privacy & legal',
        'command': 'Command menu', 'commandTitle': 'Where would you like to go?', 'close': 'Close',
        'commandHint': 'Use Tab to navigate · Escape to close', 'webCommand': 'Web design & case studies',
        'shtorkaCommand': 'SHTORKA · In development', 'animationOff': 'Animation is paused.', 'animationOn': 'Animation is running.',
    },
    'sv': {
        'home': '/', 'web': '/web-design/', 'legal': '/legal', 'projects': '/projects/', 'allProjects': 'Alla projekt',
        'title': 'Matvii Akkuratov · Oberoende macOS-utvecklare',
        'description': 'Oberoende macOS-utvecklare som bygger SHTORKA, en panel för utvecklare på Mac. Utforska mina projekt, gränssnitt och webbdesign.',
        'skip': 'Hoppa till innehållet', 'work': 'Projekt', 'about': 'Om mig', 'contact': 'Ta kontakt',
        'role': 'Oberoende macOS-utvecklare & designer', 'location': 'Baserad i Sverige',
        'headline': 'Skapat för Mac.<br>Byggt med <em>omsorg.</em>',
        'intro': 'Jag heter Matvii. Jag bygger macOS-appar, utforskar hur gränssnitt känns och gör idéer till något du kan använda.',
        'cta': 'Utforska mina projekt', 'mail': 'Säg hej', 'hint': 'Lite hantverk. Mycket nyfikenhet.',
        'lab': 'En lekplats för gränssnitt', 'labHint': 'Ta tag i panelen. Känn dig som hemma.',
        'drag': 'Flytta panelen med piltangenterna eller dra i handtaget',
        'motion': 'Pausa animationen', 'resume': 'Starta animationen', 'reset': 'Återställ panelen',
        'panelTitle': 'I min omloppsbana just nu', 'panelSub': 'Två sätt att skapa.',
        'shtorkaSub': 'En panel för utvecklare på Mac', 'webSub': 'Utvalda webbplatser & designprocess',
        'projectsLabel': '01 / Utvalda projekt', 'projectsTitle': 'Idéer som tar form.',
        'projectsIntro': 'En app under utveckling. Ett arbete med webbdesign. Olika ytor, samma omsorg om detaljerna.',
        'development': 'Under utveckling', 'shtorkaDescription': 'En panel för utvecklare på Mac. Mitt aktuella macOS-projekt, som tar form en detalj i taget.',
        'shtorkaLink': 'Upptäck SHTORKA', 'concept': 'Visuellt koncept', 'webTitle': 'Webbdesign',
        'webDescription': 'Webbplatser för professionella tjänsteföretag. Utforska processen och två egna koncept för en revisionsbyrå och en advokatbyrå.',
        'webLink': 'Utforska webbdesign', 'webTag': 'Design & utveckling', 'webConcept': 'Eget koncept',
        'aboutLabel': '02 / Bakom arbetet', 'aboutTitle': 'Utvecklarens logik.<br>Designerns blick.',
        'aboutBody': 'Jag är Matvii Akkuratov, oberoende utvecklare och designer i Sverige. Jag fokuserar på macOS-appar och arbetar även med webbdesign.',
        'aboutBody2': 'Jag intresserar mig för detaljerna som får ett verktyg att kännas rätt: en tydlig hierarki, ett användbart kortkommando och en övergång som vet när den ska hålla sig undan.',
        'principles': ['Användbart från grunden', 'Genomtänkt i detalj', 'Byggt för att användas'],
        'contactLabel': '03 / Börja ett samtal', 'contactTitle': 'Har du något<br>i <em>tankarna?</em>',
        'contactBody': 'En Mac-app, en webbplats eller en fråga om SHTORKA. Jag lyssnar gärna.',
        'copy': 'Kopiera e-post', 'copied': 'E-postadressen kopierad', 'copyError': 'Markera och kopiera e-postadressen ovan.',
        'footer': 'Oberoende, med avsikt.', 'privacy': 'Integritet & juridik',
        'command': 'Kommandomeny', 'commandTitle': 'Vart vill du gå?', 'close': 'Stäng',
        'commandHint': 'Navigera med Tab · Stäng med Escape', 'webCommand': 'Webbdesign & designprocess',
        'shtorkaCommand': 'SHTORKA · Under utveckling', 'animationOff': 'Animationen är pausad.', 'animationOn': 'Animationen är igång.',
    },
}

ORBIT = '''<svg class="orbit-art" viewBox="0 0 600 600" fill="none" aria-hidden="true">
  <defs><radialGradient id="orbit-glow"><stop stop-color="#c8fa72" stop-opacity=".13"/><stop offset="1" stop-color="#c8fa72" stop-opacity="0"/></radialGradient></defs>
  <circle cx="300" cy="300" r="285" fill="url(#orbit-glow)"/>
  <g class="orbit-lines" stroke="currentColor" stroke-width=".75">
    <circle cx="300" cy="300" r="218"/><circle cx="300" cy="300" r="185" stroke-dasharray="2 8"/>
    <ellipse cx="300" cy="300" rx="218" ry="84" transform="rotate(-38 300 300)"/>
    <ellipse cx="300" cy="300" rx="218" ry="84" transform="rotate(38 300 300)"/>
    <ellipse cx="300" cy="300" rx="84" ry="218"/>
    <path d="M300 54v36M300 510v36M54 300h36M510 300h36"/>
  </g>
  <g class="orbit-satellite"><circle cx="300" cy="82" r="5" fill="#c8fa72"/><circle cx="300" cy="82" r="12" stroke="#c8fa72" stroke-opacity=".3"/></g>
</svg>'''


def render(lang):
    d = COPY[lang]
    canonical = 'https://matviiakkuratov.com' + d['home']
    title, desc = e(d['title']), e(d['description'], quote=True)
    language_links = ''.join(f'<a href="{COPY[l]["home"]}" lang="{l}" hreflang="{l}"'+(' aria-current="page"' if l == lang else '')+f'>{l.upper()}</a>' for l in ['sv', 'en'])
    principles = ''.join(f'<li><span aria-hidden="true">0{i+1}</span>{e(p)}</li>' for i, p in enumerate(d['principles']))
    return f'''<!doctype html>
<html lang="{lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>{title}</title>
  <meta name="description" content="{desc}">
  <meta name="theme-color" content="#101210">
  <link rel="canonical" href="{canonical}">
  <link rel="alternate" hreflang="sv" href="https://matviiakkuratov.com/">
  <link rel="alternate" hreflang="en" href="https://matviiakkuratov.com/en/">
  <link rel="alternate" hreflang="x-default" href="https://matviiakkuratov.com/">
  <meta property="og:type" content="website">
  <meta property="og:title" content="{title}">
  <meta property="og:description" content="{desc}">
  <meta property="og:url" content="{canonical}">
  <meta property="og:image" content="https://matviiakkuratov.com/assets/developer-og-shtorka.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="icon" href="/assets/developer-icon.svg" type="image/svg+xml">
  <link rel="preload" href="/assets/fonts/inter-var-latin.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="/assets/fonts/fonts.css">
  <link rel="stylesheet" href="/developer.css">
  <script src="/developer.js" defer></script>
</head>
<body>
<a class="skip" href="#main">{d['skip']}</a>
<header class="dev-header shell" id="top">
  <a class="wordmark" href="{d['home']}" aria-label="Matvii Akkuratov"><span class="monogram" aria-hidden="true">ma<span>↗</span></span><span>Matvii<br>Akkuratov</span></a>
  <nav class="dev-nav" aria-label="{'Primary' if lang == 'en' else 'Huvudmeny'}">
    <a href="{d['projects']}">{d['work']}</a><a href="#about">{d['about']}</a><a href="#contact">{d['contact']} <span aria-hidden="true">↗</span></a>
  </nav>
  <div class="header-tools"><div class="languages" aria-label="{'Language' if lang == 'en' else 'Språk'}">{language_links}</div><button class="command-launch" data-command hidden aria-label="{d['command']}"><span aria-hidden="true">⌘ K</span></button></div>
</header>
<main id="main" tabindex="-1">
  <section class="dev-hero shell">
    <div class="hero-copy">
      <p class="eyebrow"><span class="status-dot" aria-hidden="true"></span>{d['role']}</p>
      <h1>{d['headline']}</h1>
      <p class="hero-intro">{d['intro']}</p>
      <div class="actions"><a class="action action-primary" href="#work">{d['cta']} <span aria-hidden="true">↗</span></a><a class="action action-quiet" href="mailto:hello@matviiakkuratov.com">{d['mail']} <span aria-hidden="true">↗</span></a></div>
      <p class="small-note">{d['hint']}</p>
    </div>
    <div class="playground" data-playground>
      <div class="playground-label"><span>⌘ / {d['lab']}</span><span aria-hidden="true">001</span></div>
      {ORBIT}
      <div class="orbit-cross orbit-cross-a" aria-hidden="true">+</div><div class="orbit-cross orbit-cross-b" aria-hidden="true">+</div>
      <div class="orbit-panel" data-panel>
        <div class="panel-handle" data-panel-handle tabindex="0" role="group" aria-label="{d['drag']}"><span class="panel-lights" aria-hidden="true"><i></i><i></i><i></i></span><span>matvii / workspace</span><span aria-hidden="true">⠿</span></div>
        <div class="panel-content"><p class="panel-kicker">{d['panelTitle']}</p><p class="panel-sub">{d['panelSub']}</p>
          <a class="panel-project" href="/shtorka/"><span class="app-icon shtorka-icon" aria-hidden="true">S</span><span><strong>SHTORKA</strong><small>{d['shtorkaSub']}</small></span><span aria-hidden="true">↗</span></a>
          <a class="panel-project" href="{d['web']}"><span class="app-icon web-icon" aria-hidden="true">↔</span><span><strong>{d['webTitle']}</strong><small>{d['webSub']}</small></span><span aria-hidden="true">↗</span></a>
        </div>
        <div class="panel-footer"><span class="status-dot" aria-hidden="true"></span><span>{d['development']} / SHTORKA</span><span aria-hidden="true">↗</span></div>
      </div>
      <div class="playground-tools"><span>{d['labHint']}</span><div><button data-reset hidden aria-label="{d['reset']}" title="{d['reset']}">↺</button><button data-motion hidden aria-pressed="false" data-pause="{d['motion']}" data-resume="{d['resume']}" data-off="{d['animationOff']}" data-on="{d['animationOn']}" aria-label="{d['motion']}" title="{d['motion']}">Ⅱ</button></div></div>
    </div>
  </section>
  <div class="location-strip shell"><span>{d['location']} <span aria-hidden="true">↗</span></span><span>Stockholm <time data-clock aria-label="{'Current time in Stockholm' if lang == 'en' else 'Aktuell tid i Stockholm'}">CET</time></span><a href="#work" aria-label="{d['cta']}">↓</a></div>
  <section class="work-section shell" id="work">
    <div class="section-heading"><div><p class="eyebrow">{d['projectsLabel']}</p><h2>{d['projectsTitle']}</h2></div><p>{d['projectsIntro']}</p></div>
    <article class="project shtorka-project">
      <div class="project-copy"><div class="project-meta"><span>01 / macOS</span><span class="development-tag"><span class="status-dot" aria-hidden="true"></span>{d['development']}</span></div><h3>SHTORKA<span class="title-period">.</span></h3><p>{d['shtorkaDescription']}</p><a class="project-link" href="/shtorka/">{d['shtorkaLink']} <span aria-hidden="true">↗</span></a></div>
      <div class="shtorka-visual" role="img" aria-label="{d['concept']}: SHTORKA"><div class="shtorka-visual-grid"></div><div class="shtorka-sheet"><span aria-hidden="true">S</span><div class="sheet-line"></div><div class="sheet-line"></div><div class="sheet-line"></div></div><span class="visual-note">SHTORKA / {d['concept']}</span></div>
    </article>
    <article class="project web-project">
      <div class="project-copy"><div class="project-meta"><span>02 / Web</span><span>{d['webTag']}</span></div><h3>{d['webTitle']}<span class="title-period">.</span></h3><p>{d['webDescription']}</p><a class="project-link" href="{d['web']}">{d['webLink']} <span aria-hidden="true">↗</span></a></div>
      <a class="web-visual" href="{d['web']}" aria-label="{d['webLink']}"><div class="browser-top" aria-hidden="true"><span>● ● ●</span><span>FB Revision / {d['webConcept']}</span></div><img src="/assets/fbrevision-hero.png" width="1440" height="940" alt="{'Independent website concept for FB Revision' if lang == 'en' else 'Eget webbplatskoncept för FB Revision'}" loading="lazy"></a>
    </article>
    <a class="work-directory" href="{d['projects']}">{d['allProjects']} <span aria-hidden="true">↗</span></a>
  </section>
  <section class="about-section shell" id="about"><div class="about-heading"><p class="eyebrow">{d['aboutLabel']}</p><h2>{d['aboutTitle']}</h2></div><div class="about-copy"><p>{d['aboutBody']}</p><p>{d['aboutBody2']}</p><ul class="principles">{principles}</ul></div></section>
  <section class="contact-section shell" id="contact"><p class="eyebrow">{d['contactLabel']}</p><div class="contact-grid"><h2>{d['contactTitle']}</h2><div><p>{d['contactBody']}</p><a class="email-link" href="mailto:hello@matviiakkuratov.com"><span class="email-address">hello@matviiakkuratov.com</span><span aria-hidden="true">↗</span></a><button class="copy-email" data-copy data-copied="{d['copied']}" data-error="{d['copyError']}" hidden>{d['copy']} <span aria-hidden="true">⧉</span></button></div></div></section>
</main>
<footer class="dev-footer shell"><p>© {__import__('datetime').date.today().year} Matvii Akkuratov <span>{d['footer']}</span></p><div><a href="{d['projects']}">{d['allProjects']}</a><a href="https://github.com/yee11ow">GitHub ↗</a><a href="{d['web']}">{d['webTitle']} ↗</a><a href="{d['legal']}">{d['privacy']}</a><a href="#top" aria-label="{'Back to top' if lang == 'en' else 'Till toppen'}">↑</a></div></footer>
<dialog class="command-dialog" aria-labelledby="command-title"><div class="command-top"><h2 id="command-title">{d['commandTitle']}</h2><button data-command-close aria-label="{d['close']}">Esc</button></div><nav aria-label="{d['command']}"><a href="#work">{d['work']}<span>01 ↗</span></a><a href="/shtorka/">{d['shtorkaCommand']}<span>02 ↗</span></a><a href="{d['web']}">{d['webCommand']}<span>03 ↗</span></a><a href="#contact">{d['contact']}<span>04 ↗</span></a></nav><p>{d['commandHint']}</p></dialog>
<p class="sr-only" role="status" data-announcement></p>
</body>
</html>
'''


if __name__ == '__main__':
    for lang, path in [('sv', 'public/index.html'), ('en', 'public/en/index.html')]:
        (ROOT / path).write_text(render(lang))
        print(path)
