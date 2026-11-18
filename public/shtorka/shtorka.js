(() => {
  'use strict';
  const header = document.querySelector('.shtorka-header');
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
})();
