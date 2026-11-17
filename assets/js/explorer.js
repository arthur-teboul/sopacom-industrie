/* SOPACOM — Page « Comprendre le fonctionnement » : branchement de l'explorateur sur le module Laverie3D */
(function () {
  'use strict';
  var stage = document.getElementById('exStage');
  if (!stage) return;
  var STEPS = window.SOPA_EX || [], info = document.getElementById('exInfo');
  var btns = [].slice.call(document.querySelectorAll('#exSteps button'));
  function setInfo(i) {
    var s = STEPS[i]; if (!s) return;
    info.innerHTML = '<p><strong>' + s.n + ' — ' + s.t + '</strong></p><p>' + s.txt + '</p>' + (s.src ? '<span class="src">Source : ' + s.src + '</span>' : '') +
      (s.links && s.links.length ? '<p style="margin-top:10px">' + s.links.map(function (l) { return '<a class="link" href="' + l[1] + '">' + l[0] + ' →</a>'; }).join(' &nbsp; ') + '</p>' : '');
    btns.forEach(function (b) { b.setAttribute('aria-pressed', +b.dataset.step === i); });
  }
  setInfo(0);
  var api = window.Laverie3D && window.Laverie3D(stage, { theme: 'dark', bright: true, labels: document.getElementById('exLabels'), clickableLabels: true, onStep: setInfo });
  var ld = document.getElementById('exLoading'); if (ld) ld.remove();
  if (!api) { document.documentElement.classList.add('no-webgl'); btns.forEach(function (b) { b.addEventListener('click', function () { setInfo(+b.dataset.step); }); }); return; }
  btns.forEach(function (b) { b.addEventListener('click', function () { api.select(+b.dataset.step, true); history.replaceState(null, '', '#etape-' + b.dataset.step); }); });
  [].forEach.call(document.querySelectorAll('.ex-tools button'), function (b) {
    b.addEventListener('click', function () {
      var t = b.dataset.tool;
      if (t === 'reset') { api.tool('reset'); return; }
      var on = b.getAttribute('aria-pressed') !== 'true'; b.setAttribute('aria-pressed', on);
      if (t === 'pause') b.textContent = on ? 'Reprendre' : 'Pause';
      api.tool(t, on);
    });
  });
  var m = /etape-(\d)/.exec(location.hash);
  if (m) api.select(Math.min(+m[1], STEPS.length - 1), true);
})();
