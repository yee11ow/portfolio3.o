/* Runs before paint so the page never flashes the wrong language.
   Kept in its own file rather than inline so the Content-Security-Policy
   can forbid inline scripts outright instead of allowing 'unsafe-inline'.

   Swedish is the default: the clients are Swedish firms. English is there as
   a choice, not as a guess about the visitor. Reads a stored preference if
   there is one; never writes. */
(function () {
  try {
    var stored = localStorage.getItem('lang');
    if (stored === 'sv' || stored === 'en') {
      document.documentElement.setAttribute('lang', stored);
    }
  } catch (e) {}
})();
