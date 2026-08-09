/* =========================================================
   Matvii — site interactions
   ========================================================= */
(function () {
  'use strict';

  var root = document.documentElement;
  var SUPPORTED = ['en', 'sv'];

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
    return SUPPORTED.indexOf(l) === -1 ? 'en' : l;
  }

  /* ---------- Language toggle ----------
     `persist` is only true when the visitor actually picks a language. Writing
     to storage on every page load would mean storing something on their device
     without them asking, which is exactly what the ePrivacy rules are about.
     Chosen preferences are fine; silent ones are not. */
  function setLang(lang, persist) {
    if (SUPPORTED.indexOf(lang) === -1) lang = 'en';
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
  setLang(root.getAttribute('lang') || 'en', false);

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
