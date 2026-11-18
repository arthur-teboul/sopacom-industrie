/* SOPACOM — Accueil : hero 3D sombre, visite automatique des étapes */
(function () {
  'use strict';
  var stage = document.getElementById('heroStage');
  if (!stage) return;
  var sec = stage.closest('.h3d'), card = document.getElementById('heroCard');
  var STEPS = window.SOPA_STEPS || [];
  var btns = [].slice.call(sec.querySelectorAll('.h3d-steps button'));
  function show(i) {
    btns.forEach(function (b) { b.setAttribute('aria-pressed', +b.dataset.step === i); });
    sec.classList.toggle('step-on', !!i);
    if (!i) { card.classList.remove('on'); return; }
    var s = STEPS[i - 1];
    card.innerHTML = '<span class="num">Étape ' + s.n + '</span><h2>' + s.t + '</h2><p>' + s.txt + '</p>' +
      '<div class="lk">' + s.links.map(function (l) { return '<a href="' + l[1] + '">' + l[0] + ' →</a>'; }).join('') + '<a href="fonctionnement.html#etape-' + i + '">Explorer en 3D →</a></div>';
    card.classList.remove('on'); void card.offsetWidth; card.classList.add('on');
  }
  var api = window.Laverie3D && window.Laverie3D(stage, {
    theme: 'dark', labels: document.getElementById('heroLabels'), clickableLabels: true,
    autoTour: true, labelMinX: 0.46, viewOffset: 0.19, zoom: false, viewScale: 1.05, onStep: show,
    overview: { p: [-3.4, 11.8, 18.5], t: [3.6, 0.8, -0.4] }
  });
  /* Un clic (ou une touche) sur la représentation ouvre la visite « Comprendre le fonctionnement » ; un glisser pivote la scène. */
  var fb = sec.querySelector('.h3d-fallback'), dn = null;     // le calque de repli recouvre la scène : on écoute les deux
  [stage, fb].forEach(function (el) {
    if (!el) return; el.style.cursor = 'pointer'; el.setAttribute('data-cursor', 'Explorer');
    el.addEventListener('pointerdown', function (e) { dn = { x: e.clientX, y: e.clientY, t: performance.now() }; });
    el.addEventListener('pointerup', function (e) {
      var d0 = dn; dn = null; if (!d0 || e.target.closest('button, a')) return;
      if (Math.hypot(e.clientX - d0.x, e.clientY - d0.y) < 6 && performance.now() - d0.t < 600) location.href = 'fonctionnement.html';
    });
  });
  if (!api) { sec.classList.add('no-webgl'); btns.forEach(function (b) { b.addEventListener('click', function () { show(+b.dataset.step); }); }); return; }
  sec.classList.add('ready');
  btns.forEach(function (b) { b.addEventListener('click', function () { api.select(+b.dataset.step, true); }); });

  /* Étiquettes 3D masquées seulement lorsqu'elles passent sous la fiche d'étape */
  var labWrap = document.getElementById('heroLabels');
  var obst = [].slice.call(sec.querySelectorAll('.h3d-copy .display, .h3d-copy .lede, .h3d-copy .btns, .h3d-steps'));
  setInterval(function () {
    if (!labWrap) return;
    var rs = obst.map(function (o) { return o.getBoundingClientRect(); });
    if (card.classList.contains('on')) rs.push(card.getBoundingClientRect());
    [].forEach.call(labWrap.children, function (l) {
      l.classList.remove('occl');
      var r = l.getBoundingClientRect(); if (!r.width) return;
      var hit = rs.some(function (c) { return c.width && !(r.right < c.left - 8 || r.left > c.right + 8 || r.bottom < c.top - 8 || r.top > c.bottom + 8); });
      l.classList.toggle('occl', hit);
    });
  }, 120);

  /* Défilement : la section est épinglée et le défilement parcourt les étapes 00 → 05 (écrans larges) */
  var prog = document.getElementById('h3dProg');
  var wide = window.matchMedia('(min-width: 1021px) and (min-height: 620px)').matches;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hh = function () { var h = document.querySelector('.site-header'); return h ? h.offsetHeight : 0; };
  // épinglage seulement si la section tient entièrement dans la fenêtre (sinon le bas serait inaccessible)
  function setupPin() {
    if (!(window.ScrollTrigger && wide && !reduce)) { if (prog) prog.parentNode.style.display = 'none'; return; }
    sec.classList.add('pinned'); // mise en page compacte, puis vérification
    if (sec.offsetHeight > window.innerHeight - hh() + 2) { sec.classList.remove('pinned'); if (prog) prog.parentNode.style.display = 'none'; return; }
    var last = -1;
    ScrollTrigger.create({
      trigger: sec, start: function () { return 'top ' + hh() + 'px'; }, end: '+=' + (STEPS.length * 70) + '%', pin: true, pinSpacing: true, anticipatePin: 1,
      onUpdate: function (self) {
        if (prog) prog.style.transform = 'scaleX(' + self.progress + ')';
        var i = Math.min(STEPS.length, Math.floor(self.progress * (STEPS.length + 1) * 0.999));
        if (self.progress > 0.001 && i !== last) { last = i; api.select(i, true); }
      },
      onLeaveBack: function () { last = -1; }
    });
    ScrollTrigger.refresh();
  }
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(function () { setTimeout(setupPin, 50); });

})();
