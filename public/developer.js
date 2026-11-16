(() => {
  'use strict';
  const announce = document.querySelector('[data-announcement]');
  const say = text => { if (announce) announce.textContent = text; };

  // The clock uses the browser's timezone data; no request or storage is needed.
  const clock = document.querySelector('[data-clock]');
  if (clock) {
    const formatter = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Stockholm', hour: '2-digit', minute: '2-digit', hour12: false });
    const update = () => { clock.textContent = formatter.format(new Date()); clock.dateTime = new Date().toISOString(); };
    update();
    let timer = setInterval(update, 30000);
    document.addEventListener('visibilitychange', () => {
      clearInterval(timer);
      if (!document.hidden) { update(); timer = setInterval(update, 30000); }
    });
  }

  const motion = document.querySelector('[data-motion]');
  if (motion) {
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    let paused = preference.matches;
    const renderMotion = () => {
      document.body.classList.toggle('motion-paused', paused);
      document.body.classList.toggle('motion-enabled', !paused);
      motion.setAttribute('aria-pressed', String(paused));
      motion.setAttribute('aria-label', paused ? motion.dataset.resume : motion.dataset.pause);
      motion.title = motion.getAttribute('aria-label');
      motion.textContent = paused ? '▷' : 'Ⅱ';
    };
    renderMotion();
    motion.hidden = false;
    motion.addEventListener('click', () => { paused = !paused; renderMotion(); say(paused ? motion.dataset.off : motion.dataset.on); });
    preference.addEventListener('change', event => { paused = event.matches; renderMotion(); });
  }

  const panel = document.querySelector('[data-panel]');
  const handle = document.querySelector('[data-panel-handle]');
  const playground = document.querySelector('[data-playground]');
  const reset = document.querySelector('[data-reset]');
  if (panel && handle && playground) {
    let x = 0, y = 0, drag = null;
    const place = (nextX, nextY) => {
      const limitX = Math.max(0, (playground.clientWidth - panel.offsetWidth) / 2 - 10);
      const limitY = Math.max(0, (playground.clientHeight - panel.offsetHeight) / 2 - 55);
      x = Math.min(limitX, Math.max(-limitX, nextX));
      y = Math.min(limitY, Math.max(-limitY, nextY));
      panel.style.setProperty('--panel-x', `${x}px`);
      panel.style.setProperty('--panel-y', `${y}px`);
    };
    handle.addEventListener('pointerdown', event => {
      if (!event.isPrimary || event.button !== 0) return;
      drag = { id: event.pointerId, startX: event.clientX, startY: event.clientY, x, y };
      handle.setPointerCapture(event.pointerId);
    });
    handle.addEventListener('pointermove', event => {
      if (!drag || event.pointerId !== drag.id) return;
      place(drag.x + event.clientX - drag.startX, drag.y + event.clientY - drag.startY);
    });
    const endDrag = event => { if (drag && event.pointerId === drag.id) drag = null; };
    handle.addEventListener('pointerup', endDrag);
    handle.addEventListener('pointercancel', endDrag);
    handle.addEventListener('lostpointercapture', endDrag);
    handle.addEventListener('keydown', event => {
      const directions = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
      if (!directions[event.key]) return;
      event.preventDefault();
      const [dx, dy] = directions[event.key];
      place(x + dx * (event.shiftKey ? 32 : 12), y + dy * (event.shiftKey ? 32 : 12));
    });
    if (reset) { reset.hidden = false; reset.addEventListener('click', () => place(0, 0)); }
    new ResizeObserver(() => place(x, y)).observe(playground);
  }

  const dialog = document.querySelector('.command-dialog');
  const launch = document.querySelector('[data-command]');
  if (dialog && launch && typeof dialog.showModal === 'function') {
    launch.hidden = false;
    const open = () => { if (!dialog.open) dialog.showModal(); };
    launch.addEventListener('click', open);
    document.querySelector('[data-command-close]').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => { if (event.target === dialog) { const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); } });
    dialog.querySelectorAll('a').forEach(link => link.addEventListener('click', () => dialog.close()));
    document.addEventListener('keydown', event => {
      if (event.key.toLowerCase() !== 'k' || !(event.metaKey || event.ctrlKey)) return;
      if (event.target instanceof HTMLElement && (event.target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName))) return;
      event.preventDefault();
      if (dialog.open) dialog.close(); else open();
    });
  }

  const copy = document.querySelector('[data-copy]');
  if (copy && navigator.clipboard && window.isSecureContext) {
    copy.hidden = false;
    copy.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText('hello@matviiakkuratov.com'); say(copy.dataset.copied); }
      catch { say(copy.dataset.error); }
    });
  }
})();
