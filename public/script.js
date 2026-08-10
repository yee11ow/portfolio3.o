/* =========================================================
   Matvii — site interactions
   ========================================================= */
(function () {
  'use strict';

  var root = document.documentElement;
  var SUPPORTED = ['sv', 'en'];
  var DEFAULT_LANG = 'sv';

  var langButtons = Array.prototype.slice.call(document.querySelectorAll('.lang__btn'));
  var navEl = document.querySelector('.nav');
  var langGroup = document.querySelector('.lang');
  var toggle = document.querySelector('.nav__toggle');
  var menu = document.querySelector('.nav__menu');
  var header = document.querySelector('.site');

  /* aria-labels are invisible, so the CSS that hides the inactive language
     can't swap them. They have to be set here, or a Swedish visitor gets an
     English-sounding page read out to them. */
  var ARIA = {
    en: { nav: 'Primary', menu: 'Menu', close: 'Close menu', lang: 'Language' },
    sv: { nav: 'Huvudmeny', menu: 'Meny', close: 'Stäng menyn', lang: 'Språk' }
  };

  function currentLang() {
    var l = root.getAttribute('lang');
    return SUPPORTED.indexOf(l) === -1 ? DEFAULT_LANG : l;
  }

  /* ---------- Language toggle ----------
     `persist` is only true when the visitor actually picks a language. Writing
     to storage on every page load would mean storing something on their device
     without them asking, which is exactly what the ePrivacy rules are about.
     Chosen preferences are fine; silent ones are not. */
  function setLang(lang, persist) {
    if (SUPPORTED.indexOf(lang) === -1) lang = DEFAULT_LANG;
    root.setAttribute('lang', lang);
    if (persist) {
      try { localStorage.setItem('lang', lang); } catch (e) {}
    }

    langButtons.forEach(function (btn) {
      var active = btn.getAttribute('data-lang') === lang;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });

    var t = ARIA[lang];
    if (navEl) navEl.setAttribute('aria-label', t.nav);
    if (langGroup) langGroup.setAttribute('aria-label', t.lang);
    if (toggle) {
      toggle.setAttribute('aria-label',
        toggle.getAttribute('aria-expanded') === 'true' ? t.close : t.menu);
    }
  }

  langButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      setLang(btn.getAttribute('data-lang'), true);
    });
  });

  // Sync with the language already set in <head>. Reads storage, never writes.
  setLang(root.getAttribute('lang') || DEFAULT_LANG, false);

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
    toggle.setAttribute('aria-label', ARIA[currentLang()][open ? 'close' : 'menu']);
  }

  if (toggle && menu) {
    toggle.addEventListener('click', function () {
      setMenu(!menu.classList.contains('is-open'));
    });

    // Close after following an in-page link.
    menu.querySelectorAll('a[href^="#"]').forEach(function (link) {
      link.addEventListener('click', function () { setMenu(false); });
    });

    // Reset when crossing back to the desktop layout.
    var desktop = window.matchMedia('(min-width: 880px)');
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

  /* ---------- AI assistant, loaded only on request ----------
     The whole site otherwise makes zero third-party requests, and the privacy
     page says so. So the ElevenLabs widget is not on the page: pressing the
     button is what fetches it, and that press is the consent. Nothing is
     contacted before it. */
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
    startBtn.addEventListener('click', function () {
      var t = ASSIST[currentLang()];
      startBtn.disabled = true;
      statusEl.textContent = t.loading;

      var s = document.createElement('script');
      s.src = 'https://unpkg.com/@elevenlabs/convai-widget-embed';
      s.async = true;

      s.onload = function () {
        var el = document.createElement('elevenlabs-convai');
        el.setAttribute('agent-id', startBtn.getAttribute('data-agent-id'));
        (document.getElementById('assistant-mount') || document.body).appendChild(el);
        statusEl.textContent = ASSIST[currentLang()].ready;
        startBtn.hidden = true;
      };

      s.onerror = function () {
        statusEl.textContent = ASSIST[currentLang()].error;
        startBtn.disabled = false;
      };

      document.head.appendChild(s);
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
