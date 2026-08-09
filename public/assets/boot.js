/* Runs before paint so the page never flashes the wrong language.
   Kept in its own file rather than inline so the Content-Security-Policy
   can forbid inline scripts outright instead of allowing 'unsafe-inline'.
   Reads the stored preference; never writes one. */
(function () {
  try {
    var stored = localStorage.getItem('lang');
    var lang = stored || ((navigator.language || '').toLowerCase().indexOf('sv') === 0 ? 'sv' : 'en');
    document.documentElement.setAttribute('lang', lang);
  } catch (e) {}
})();
