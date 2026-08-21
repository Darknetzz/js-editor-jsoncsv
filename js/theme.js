/* Dark/light theme toggle. Defaults to the OS preference, persisted in localStorage. */

'use strict';

(function () {
  var KEY = 'theme';
  var btn = document.getElementById('themeBtn');
  var mq = window.matchMedia('(prefers-color-scheme: dark)');

  function stored() {
    var v = null;
    try { v = localStorage.getItem(KEY); } catch (e) {}
    return v;
  }

  function apply(theme) {
    document.documentElement.dataset.theme = theme;
    btn.textContent = theme === 'dark' ? 'Light mode' : 'Dark mode';
  }

  function current() {
    var s = stored();
    if (s === 'dark' || s === 'light') return s;
    return mq.matches ? 'dark' : 'light';
  }

  btn.addEventListener('click', function () {
    var next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem(KEY, next); } catch (e) {}
    apply(next);
  });

  if (typeof mq.addEventListener === 'function') {
    mq.addEventListener('change', function (e) {
      if (!stored()) apply(e.matches ? 'dark' : 'light');
    });
  }

  apply(current());
})();