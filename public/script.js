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
