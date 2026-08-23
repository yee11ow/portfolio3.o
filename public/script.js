/* =========================================================
   Site interactions
   ========================================================= */
(function () {
  'use strict';

  var header = document.querySelector('.site');
  var toggle = document.querySelector('.nav__toggle');
  var menu = document.querySelector('.nav__menu');

  /* ---------- Sticky header background on scroll ---------- */
  function onScroll() {
    if (header) header.classList.toggle('scrolled', window.scrollY > 8);
  }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---------- Mobile menu ---------- */
  function setMenu(open) {
    if (!menu || !toggle) return;
    menu.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  if (toggle && menu) {
    toggle.addEventListener('click', function () {
      setMenu(!menu.classList.contains('is-open'));
    });

    var desktop = window.matchMedia('(min-width: 1024px)');
    function onBreakpoint() {
      if (desktop.matches) setMenu(false);
    }
    if (desktop.addEventListener) {
      desktop.addEventListener('change', onBreakpoint);
    } else if (desktop.addListener) {
      desktop.addListener(onBreakpoint); // Safari < 14
    }

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menu.classList.contains('is-open')) {
        setMenu(false);
        toggle.focus();
      }
    });
  }

  /* ---------- AI assistant, loaded on request ----------
     The widget is not on the page. The click fetches it, and is the consent.
     Nothing third-party is contacted before that. */
  var ASSIST = {
    sv: {
      loading: 'Laddar assistenten…',
      ready: 'Assistenten är igång. Den öppnas nere till höger.',
      error: 'Assistenten gick inte att ladda. Mejla gärna hello@matviiakkuratov.com i stället.'
    },
    en: {
      loading: 'Loading the assistant…',
      ready: 'The assistant is running. It opens at the bottom right.',
      error: 'The assistant could not load. Email hello@matviiakkuratov.com instead.'
    }
  };

  var startBtn = document.getElementById('assistant-start');
  var statusEl = document.getElementById('assistant-status');

  if (startBtn && statusEl) {
    var t = ASSIST[startBtn.getAttribute('data-lang')] || ASSIST.sv;

    startBtn.addEventListener('click', function () {
      startBtn.disabled = true;
      statusEl.textContent = t.loading;

      var s = document.createElement('script');
      s.src = 'https://unpkg.com/@elevenlabs/convai-widget-embed';
      s.async = true;

      s.onload = function () {
        var el = document.createElement('elevenlabs-convai');
        el.setAttribute('agent-id', startBtn.getAttribute('data-agent-id'));
        (document.getElementById('assistant-mount') || document.body).appendChild(el);
        statusEl.textContent = t.ready;
        startBtn.hidden = true;
      };

      s.onerror = function () {
        statusEl.textContent = t.error;
        startBtn.disabled = false;
      };

      document.head.appendChild(s);
    });
  }

  /* ---------- Reading pill ----------
     Time spent here and how far down the page you are. Nothing is written to
     the browser, which is the whole point of the privacy page, so the count is
     per page and the position resets when you move on. The note changes as the
     minutes add up. */
  var NOTES = {
    sv: [[0, 'på den här sidan'], [120, 'du läser fortfarande'],
         [300, 'noggrann läsare'], [600, 'nu är jag smickrad']],
    en: [[0, 'on this page'], [120, 'still reading'],
         [300, 'thorough reader'], [600, 'now I am flattered']]
  };

  /* ---------- The funnel the pill opens into ----------
     Two questions, then a line that answers the one they picked and the three
     ways onward. Nothing is sent anywhere: the answers only choose which
     sentence and which button to lead with. */
  var FUNNEL = {
    sv: {
      invite: 'har ni en fråga?',
      open: 'Öppna frågepanelen', close: 'Stäng frågepanelen', back: '← Tillbaka',
      steps: [
        { q: 'Vad är ni för byrå?',
          a: ['Advokatbyrå', 'Revisions- eller redovisningsbyrå', 'Konsultbolag', 'Något annat'] },
        { q: 'Vad är det som skaver?',
          a: ['Sajten ser föråldrad ut', 'Ingen hör av sig', 'Vi har ingen sajt än', 'Jag bara tittar'] }
      ],
      ends: [
        { t: 'Vanligaste fallet. Oftast behövs ingen ombyggnad, utan struktur och typografi. Tjugo minuter räcker för att säga vilket det är hos er.', lead: 'book' },
        { t: 'Då sitter problemet sällan i designen, utan i vägen fram till kontakt. Det är där jag brukar börja.', lead: 'book' },
        { t: 'Bra läge, faktiskt. Då slipper vi riva något först och kan lägga strukturen rätt från början.', lead: 'book' },
        { t: 'Helt okej. Då är priserna och vanliga frågor det mest användbara härifrån, inget samtal behövs.', lead: 'faq' }
      ],
      book: 'Boka 20 minuter', ask: 'Fråga Alex', mail: 'Mejla mig', faq: 'Se priserna',
      links: { faq: '/vanliga-fragor/', assistant: '/kontakt/#assistent' }
    },
    en: {
      invite: 'have a question?',
      open: 'Open the question panel', close: 'Close the question panel', back: '← Back',
      steps: [
        { q: 'What kind of firm are you?',
          a: ['Law firm', 'Audit or accountancy firm', 'Consultancy', 'Something else'] },
        { q: 'What is not working?',
          a: ['The site looks dated', 'Nobody gets in touch', 'We have no site yet', 'Just looking'] }
      ],
      ends: [
        { t: 'The common one. Usually it needs no rebuild, only structure and typography. Twenty minutes is enough to say which it is for you.', lead: 'book' },
        { t: 'Then the problem is rarely the design, it is the path to getting in touch. That is where I start.', lead: 'book' },
        { t: 'Good position, actually. Nothing to tear down first, so the structure can be right from the start.', lead: 'book' },
        { t: 'Fair enough. The prices and the FAQ are the most useful thing from here, no call needed.', lead: 'faq' }
      ],
      book: 'Book 20 minutes', ask: 'Ask Alex', mail: 'Email me', faq: 'See the prices',
      links: { faq: '/en/faq/', assistant: '/en/contact/#assistent' }
    }
  };

  var CAL = 'https://cal.com/matviiakkuratov/quick-intro';
  var MAIL = 'mailto:hello@matviiakkuratov.com';
  var OPEN_AFTER = 60; // seconds on the page before it opens itself
  var SEEN = 'matvii.panel';

  function stored(key) {
    // Private mode and locked-down browsers throw on the accessor itself.
    try { return sessionStorage.getItem(key); } catch (e) { return null; }
  }
  function store(key, value) {
    try { sessionStorage.setItem(key, value); } catch (e) { /* nothing to do */ }
  }

  var pill = document.getElementById('pill');

  if (pill && window.PointerEvent) {
    var pillTime = pill.querySelector('.pill__time');
    var pillNote = pill.querySelector('.pill__note');
    var pillDial = pill.querySelector('.pill__dial');
    var lang = document.documentElement.lang === 'en' ? 'en' : 'sv';
    var notes = NOTES[lang];
    var F = FUNNEL[lang];
    var panel = pill.querySelector('.pill__panel');
    var toggle = pill.querySelector('.pill__toggle');
    var started = Date.now();
    var noteAt = -1;
    var seen = false;   // the panel has been opened at least once on this page

    function twoDigits(n) { return (n < 10 ? '0' : '') + n; }

    function tick() {
      var secs = Math.floor((Date.now() - started) / 1000);
      pillTime.textContent = Math.floor(secs / 60) + ':' + twoDigits(secs % 60);

      // Once the panel has been through, the note becomes the way back to it.
      if (!seen) {
        for (var i = notes.length - 1; i >= 0; i--) {
          if (secs >= notes[i][0]) {
            if (i !== noteAt) { pillNote.textContent = notes[i][1]; noteAt = i; }
            break;
          }
        }
      }

      if (secs >= OPEN_AFTER && !seen && !stored(SEEN)) openPanel(true);
    }

    function trackScroll() {
      var room = document.documentElement.scrollHeight - window.innerHeight;
      var pct = room > 0 ? Math.min(100, Math.round((window.scrollY / room) * 100)) : 100;
      pillDial.style.setProperty('--p', pct);
      pill.setAttribute('aria-label', pill.getAttribute('data-label') + ' ' + pct + '%');
    }

    /* --- building the funnel --- */
    function el(tag, cls, text) {
      var n = document.createElement(tag);
      if (cls) n.className = cls;
      if (text != null) n.textContent = text;
      return n;
    }

    function link(cls, href, text, blank) {
      var a = el('a', cls, text);
      a.href = href;
      if (blank) { a.target = '_blank'; a.rel = 'noopener'; }
      return a;
    }

    var picked = [];

    function drawStep(n) {
      panel.textContent = '';
      var step = F.steps[n];
      panel.appendChild(el('p', 'pill__q', step.q));

      var list = el('div', 'pill__opts');
      step.a.forEach(function (label, i) {
        var b = el('button', 'pill__opt', label);
        b.type = 'button';
        b.addEventListener('click', function () {
          picked[n] = i;
          if (n + 1 < F.steps.length) drawStep(n + 1); else drawEnd();
          panel.querySelector('button, a').focus();
        });
        list.appendChild(b);
      });
      panel.appendChild(list);

      if (n > 0) {
        var back = el('button', 'pill__back', F.back);
        back.type = 'button';
        back.addEventListener('click', function () {
          drawStep(n - 1);
          panel.querySelector('button').focus();
        });
        panel.appendChild(back);
      }
    }

    function drawEnd() {
      var end = F.ends[picked[F.steps.length - 1]] || F.ends[0];
      panel.textContent = '';
      panel.appendChild(el('p', 'pill__a', end.t));

      var acts = el('div', 'pill__acts');
      if (end.lead === 'faq') {
        acts.appendChild(link('pill__cta', F.links.faq, F.faq));
        acts.appendChild(link('pill__alt', CAL, F.book, true));
      } else {
        acts.appendChild(link('pill__cta', CAL, F.book, true));
        acts.appendChild(link('pill__alt', F.links.assistant, F.ask));
      }
      acts.appendChild(link('pill__alt', MAIL, F.mail));
      panel.appendChild(acts);

      var back = el('button', 'pill__back', F.back);
      back.type = 'button';
      back.addEventListener('click', function () {
        drawStep(F.steps.length - 1);
        panel.querySelector('button').focus();
      });
      panel.appendChild(back);
    }

    function openPanel(auto) {
      if (!panel.hidden) return;
      if (!seen) { picked = []; drawStep(0); }
      seen = true;
      store(SEEN, '1');
      panel.hidden = false;
      pill.classList.add('is-open');
      toggle.setAttribute('aria-expanded', 'true');
      toggle.setAttribute('aria-label', F.close);
      pillNote.textContent = F.invite;
      // Growing upward from the corner is free, but a dragged pill can grow
      // off-screen, so re-clamp whenever it has been moved.
      if (pill.style.left) {
        var box = pill.getBoundingClientRect();
        placeAt(box.left, box.top);
      }
      if (!auto) panel.querySelector('button, a').focus();
    }

    function closePanel() {
      panel.hidden = true;
      pill.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', F.open);
      pillNote.textContent = F.invite;
    }

    toggle.addEventListener('click', function () {
      if (panel.hidden) openPanel(false); else closePanel();
    });

    tick();
    trackScroll();
    setInterval(tick, 1000);
    window.addEventListener('scroll', trackScroll, { passive: true });
    window.addEventListener('resize', trackScroll, { passive: true });
    pill.hidden = false;

    /* Drag with a pointer, or nudge with the arrow keys once focused, because
       a drag on its own would leave keyboard users without a way to move it. */
    var dragging = false, grabX = 0, grabY = 0;

    function placeAt(x, y) {
      var box = pill.getBoundingClientRect();
      var maxX = window.innerWidth - box.width - 8;
      var maxY = window.innerHeight - box.height - 8;
      pill.style.left = Math.max(8, Math.min(x, maxX)) + 'px';
      pill.style.top = Math.max(8, Math.min(y, maxY)) + 'px';
      pill.style.right = 'auto';
      pill.style.bottom = 'auto';
    }

    pill.addEventListener('pointerdown', function (e) {
      // Only the dial and clock drag. The rest of the pill is buttons, and the
      // panel below it has to stay usable.
      if (!e.target.closest('.pill__grab')) return;
      var box = pill.getBoundingClientRect();
      grabX = e.clientX - box.left;
      grabY = e.clientY - box.top;
      dragging = true;
      pill.setPointerCapture(e.pointerId);
      pill.classList.add('is-dragging');
    });

    pill.addEventListener('pointermove', function (e) {
      if (dragging) placeAt(e.clientX - grabX, e.clientY - grabY);
    });

    function endDrag() {
      dragging = false;
      pill.classList.remove('is-dragging');
    }
    pill.addEventListener('pointerup', endDrag);
    pill.addEventListener('pointercancel', endDrag);

    pill.addEventListener('keydown', function (e) {
      var step = e.shiftKey ? 48 : 16;
      var box = pill.getBoundingClientRect();
      var moves = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
      // Arrows move the pill, but only from the pill itself. Inside the panel
      // they belong to whatever the reader is focused on.
      if (moves[e.key] && e.target === pill) {
        e.preventDefault();
        placeAt(box.left + moves[e.key][0], box.top + moves[e.key][1]);
      } else if (e.key === 'Escape') {
        if (panel.hidden) pill.hidden = true; else { closePanel(); toggle.focus(); }
      }
    });

    // The cross closes whatever is currently showing: the panel if it is open,
    // otherwise the pill itself.
    pill.querySelector('.pill__close').addEventListener('click', function () {
      if (panel.hidden) pill.hidden = true; else { closePanel(); toggle.focus(); }
    });

    window.addEventListener('resize', function () {
      if (pill.style.left) placeAt(pill.getBoundingClientRect().left, pill.getBoundingClientRect().top);
    }, { passive: true });
  }

  /* ---------- One question at the end of the page ----------
     Answering swaps the buttons for a line and a link onward. */
  var ask = document.querySelector('[data-ask]');

  if (ask) {
    var opts = ask.querySelector('.ask__opts');

    ask.addEventListener('click', function (e) {
      var btn = e.target.closest('.ask__opt');
      if (!btn) return;
      var reply = ask.querySelector('.ask__reply[data-reply="' + btn.getAttribute('data-reply') + '"]');
      if (!reply) return;
      opts.hidden = true;
      reply.hidden = false;
      ask.classList.add('is-answered');
    });
  }

  /* ---------- Reveal on scroll ---------- */
  var revealEls = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealEls.forEach(function (el) { el.classList.add('in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.08 });
    revealEls.forEach(function (el) { io.observe(el); });
  }
})();
