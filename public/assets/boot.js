/* Applies a stored language choice before paint, to avoid a flash.
   Separate file so CSP can block inline scripts. Swedish is the default;
   browser language is not sniffed. Reads storage, never writes. */
(function () {
  try {
    var stored = localStorage.getItem('lang');
    if (stored === 'sv' || stored === 'en') {
      document.documentElement.setAttribute('lang', stored);
    }
  } catch (e) {}
})();
