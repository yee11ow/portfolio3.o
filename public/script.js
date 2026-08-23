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

  var pill = document.getElementById('pill');

  if (pill && window.PointerEvent) {
    var pillTime = pill.querySelector('.pill__time');
    var pillNote = pill.querySelector('.pill__note');
    var pillDial = pill.querySelector('.pill__dial');
    var notes = NOTES[document.documentElement.lang] || NOTES.sv;
    var started = Date.now();
    var noteAt = -1;

    function twoDigits(n) { return (n < 10 ? '0' : '') + n; }

    function tick() {
      var secs = Math.floor((Date.now() - started) / 1000);
      pillTime.textContent = Math.floor(secs / 60) + ':' + twoDigits(secs % 60);

      for (var i = notes.length - 1; i >= 0; i--) {
        if (secs >= notes[i][0]) {
          if (i !== noteAt) { pillNote.textContent = notes[i][1]; noteAt = i; }
          break;
        }
      }
    }

    function trackScroll() {
      var room = document.documentElement.scrollHeight - window.innerHeight;
      var pct = room > 0 ? Math.min(100, Math.round((window.scrollY / room) * 100)) : 100;
      pillDial.style.setProperty('--p', pct);
      pill.setAttribute('aria-label', pill.getAttribute('data-label') + ' ' + pct + '%');
    }

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
      if (e.target.closest('.pill__close')) return;
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
      if (moves[e.key]) {
        e.preventDefault();
        placeAt(box.left + moves[e.key][0], box.top + moves[e.key][1]);
      } else if (e.key === 'Escape') {
        pill.hidden = true;
      }
    });

    var pillClose = pill.querySelector('.pill__close');
    if (pillClose) {
      pillClose.addEventListener('click', function () { pill.hidden = true; });
    }

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
