(() => {
  'use strict';
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
