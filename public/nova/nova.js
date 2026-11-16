(() => {
  'use strict';
  const header = document.querySelector('.nova-header');
  if (header && 'ResizeObserver' in window) {
    new ResizeObserver(() => {
      const height = getComputedStyle(header).position === 'sticky' ? header.getBoundingClientRect().height : 0;
      document.documentElement.style.setProperty('--header-height', `${height}px`);
    }).observe(header);
  }
  const copy = document.querySelector('[data-copy-email]');
  const copyStatus = document.querySelector('[data-copy-status]');
  if (copy && copyStatus && navigator.clipboard && window.isSecureContext) {
    copy.hidden = false;
    copy.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(copy.dataset.email);
        copyStatus.textContent = 'Email address copied.';
      } catch {
        copyStatus.textContent = 'Please copy the email address shown above.';
      }
    });
  }
  const stage = document.querySelector('[data-stage]');
  const toggle = document.querySelector('[data-curtain-toggle]');
  const message = document.getElementById('curtain-message');
  if (!stage || !toggle || !message) return;
  const label = toggle.querySelector('[data-toggle-label]');
  const icon = toggle.querySelector('[data-toggle-icon]');
  toggle.hidden = false;
  toggle.addEventListener('click', () => {
    const expanded = toggle.getAttribute('aria-expanded') !== 'true';
    toggle.setAttribute('aria-expanded', String(expanded));
    stage.classList.toggle('curtain-open', expanded);
    message.hidden = !expanded;
    label.textContent = expanded ? 'Lower the curtain' : 'Lift the curtain';
    icon.textContent = expanded ? '↓' : '↑';
  });
})();
