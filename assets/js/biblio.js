/* SOPACOM — Bibliothèque technique : filtres (gamme, famille, longueur), recherche, tri, fiche avec plan zoomable */
(function () {
  'use strict';
  var d = document, DATA = window.SOPA_CAO || [];
  var $ = function (s, c) { return (c || d).querySelector(s); };
  var $$ = function (s, c) { return [].slice.call((c || d).querySelectorAll(s)); };
  var grid = $('#bibGrid'); if (!grid) return;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var st = { g: '', f: '', q: '', lo: null, hi: null, nolen: true, sort: 'cat' };
  var R = $('#bibLen'), ins = $$('input[type=range]', R), fillEl = $('.r2-fill', R), out = $('#bibLenO');
  var MIN = +R.dataset.min, MAX = +R.dataset.max;
  DATA.forEach(function (c, i) { c.i = i; c.fam = c.p[0] || ''; c.txt = (c.c + ' ' + c.l + ' ' + c.g + ' ' + c.p.join(' ')).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); });
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function fmt(v) { return (Math.round(v * 100) / 100).toString().replace('.', ',') + ' m'; }
  function fav(c) { return { id: 'c-' + c.c, t: c.c + ' — ' + c.s, s: 'Bloc CAO · ' + c.g, img: 'assets/img/cao-hd/' + c.c + '.svg', h: 'bibliotheque-technique.html#' + c.c, cad: true }; }

  /* cartes */
  grid.innerHTML = DATA.map(function (c) {
    return '<article class="bib-card" data-i="' + c.i + '"><button class="bc-open" data-open="' + c.i + '" data-cursor="Voir le plan" aria-label="Voir le plan ' + esc(c.c) + ' — ' + esc(c.s) + '">' +
      '<span class="bc-img"><img src="assets/img/cao-hd/' + esc(c.c) + '.svg" alt="" loading="lazy" decoding="async"></span>' +
      '<span class="bc-m"><span class="num">' + esc(c.g) + (c.fam ? ' · ' + esc(c.fam) : '') + '</span><b>' + esc(c.c) + '</b><span class="bc-l">' + esc(c.s) + '</span></span></button>' +
      (c.len ? '<span class="bc-len mono">' + fmt(c.len) + '</span>' : '') +
      '<button class="bc-fav" data-fav="c-' + esc(c.c) + '" data-fav-t="' + esc(c.c + ' — ' + c.s) + '" data-fav-s="Bloc CAO · ' + esc(c.g) + '" data-fav-img="assets/img/cao-hd/' + esc(c.c) + '.svg" data-fav-h="bibliotheque-technique.html#' + esc(c.c) + '" data-fav-cad="1" aria-pressed="false" aria-label="Ajouter ' + esc(c.c) + ' à ma sélection" data-cursor="Ma sélection"><span class="hrt" aria-hidden="true">♥</span></button></article>';
  }).join('');
  var cards = $$('.bib-card', grid);
  if (window.SopaSel) window.SopaSel.sync();

  /* familles selon la gamme */
  var sub = $('#bibSub');
  function buildSub() {
    var fams = []; DATA.forEach(function (c) { if ((!st.g || c.g === st.g) && c.fam && fams.indexOf(c.fam) < 0) fams.push(c.fam); });
    sub.innerHTML = st.g && fams.length > 1 ? '<button aria-pressed="' + (!st.f) + '" data-f="">Toutes les familles</button>' + fams.map(function (f) {
      return '<button aria-pressed="' + (st.f === f) + '" data-f="' + esc(f) + '">' + esc(f) + ' <sup>' + DATA.filter(function (c) { return c.g === st.g && c.fam === f; }).length + '</sup></button>';
    }).join('') : '';
  }

  /* curseur double */
  function rangeUI() {
    var a = +ins[0].value, b = +ins[1].value;
    if (a > b) { var t = a; a = b; b = t; }
    st.lo = a; st.hi = b;
    fillEl.style.left = ((a - MIN) / (MAX - MIN) * 100) + '%'; fillEl.style.right = (100 - (b - MIN) / (MAX - MIN) * 100) + '%';
    out.textContent = fmt(a) + ' — ' + fmt(b);
  }
  ins.forEach(function (i) { i.addEventListener('input', function () { rangeUI(); apply(); }); });
  $('#bibLenAll').addEventListener('change', function (e) { st.nolen = e.target.checked; apply(); });

  var nEl = $('#bibN'), none = $('#bibNone'), shown = [];
  function apply(anim) {
    var q = st.q.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
    var full = st.lo <= MIN + 1e-9 && st.hi >= MAX - 1e-9;
    var list = DATA.filter(function (c) {
      if (st.g && c.g !== st.g) return false;
      if (st.f && c.fam !== st.f) return false;
      if (q && q.split(/\s+/).some(function (w) { return c.txt.indexOf(w) < 0; })) return false;
      if (c.len == null) return st.nolen || false;
      if (!full || !st.nolen) return c.len >= st.lo - 1e-9 && c.len <= st.hi + 1e-9;
      return true;
    });
    var key = { cat: function (c) { return c.i; }, code: function (c) { return c.c.toLowerCase(); }, lab: function (c) { return c.s.toLowerCase(); }, len: function (c) { return c.len == null ? 1e9 : c.len; } }[st.sort];
    list.sort(function (a, b) { var x = key(a), y = key(b); return x < y ? -1 : x > y ? 1 : a.i - b.i; });
    shown = list.map(function (c) { return c.i; });
    cards.forEach(function (el) { el.hidden = true; });
    list.forEach(function (c) { var el = cards[c.i]; el.hidden = false; grid.appendChild(el); });
    nEl.textContent = list.length; none.hidden = list.length > 0;
    if (anim !== false && window.gsap && !reduce) gsap.fromTo(list.slice(0, 24).map(function (c) { return cards[c.i]; }), { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: .5, stagger: .02, ease: 'power3.out', overwrite: true });
    if (window.ScrollTrigger) ScrollTrigger.refresh();
    var u = new URL(location.href); if (st.g) u.searchParams.set('g', st.g); else u.searchParams.delete('g');
    history.replaceState(null, '', u.pathname + u.search + location.hash);
  }

  $$('.bib-chips button').forEach(function (b) { b.addEventListener('click', function () {
    st.g = b.dataset.g; st.f = '';
    $$('.bib-chips button').forEach(function (x) { x.setAttribute('aria-pressed', x === b); });
    buildSub(); apply();
  }); });
  sub.addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; st.f = b.dataset.f; buildSub(); apply(); });
  var qi = $('#bq'), qt; qi.addEventListener('input', function () { clearTimeout(qt); qt = setTimeout(function () { st.q = qi.value; apply(); }, 120); });
  $('#bsort').addEventListener('change', function (e) { st.sort = e.target.value; apply(); });
  $('#bibReset').addEventListener('click', function () {
    st = { g: '', f: '', q: '', lo: MIN, hi: MAX, nolen: true, sort: 'cat' }; qi.value = ''; ins[0].value = MIN; ins[1].value = MAX; $('#bibLenAll').checked = true; $('#bsort').value = 'cat';
    $$('.bib-chips button').forEach(function (x) { x.setAttribute('aria-pressed', x.dataset.g === ''); }); buildSub(); rangeUI(); apply();
  });

  /* paramètres d'URL : ?g=Technicord ou ?g=tri (recherche libre) */
  var g0 = new URLSearchParams(location.search).get('g');
  rangeUI();
  if (g0) {
    var chip = $$('.bib-chips button').filter(function (b) { return b.dataset.g.toLowerCase() === g0.toLowerCase(); })[0];
    if (chip) { st.g = chip.dataset.g; $$('.bib-chips button').forEach(function (x) { x.setAttribute('aria-pressed', x === chip); }); }
    else { st.q = g0; qi.value = g0; }
  }
  buildSub(); apply(false);

  /* ---------- fiche : plan zoomable ---------- */
  var dlg = $('#bibDlg'), plan = $('#bdPlan'), img = $('#bdImg'), cur = -1, z = { s: 1, x: 0, y: 0 }, lastFocus;
  function setZ() { img.style.transform = 'translate(' + z.x + 'px,' + z.y + 'px) scale(' + z.s + ')'; }
  function zoomAt(f, px, py) {
    var r = plan.getBoundingClientRect(); px = px == null ? r.width / 2 : px; py = py == null ? r.height / 2 : py;
    var ns = Math.min(8, Math.max(1, z.s * f)); f = ns / z.s;
    z.x = px - (px - z.x) * f; z.y = py - (py - z.y) * f; z.s = ns;
    if (ns === 1) { z.x = 0; z.y = 0; } setZ();
  }
  function open(i, fromUser) {
    var c = DATA[i]; if (!c) return; cur = i;
    lastFocus = lastFocus || d.activeElement;
    z = { s: 1, x: 0, y: 0 }; setZ();
    img.src = 'assets/img/cao-hd/' + c.c + '.svg'; img.alt = 'Plan du bloc ' + c.c + ' — ' + c.s;
    $('#bdT').textContent = c.s; $('#bdC').textContent = 'Bloc ' + c.c;
    $('#bdPath').textContent = [c.g].concat(c.p).join(' › ');
    $('#bdDl').innerHTML = '<dt>Code bloc</dt><dd>' + esc(c.c) + '</dd><dt>Libellé catalogue</dt><dd>' + esc(c.l) + '</dd><dt>Gamme</dt><dd>' + esc(c.g) + '</dd>' +
      (c.len ? '<dt>Longueur (libellé)</dt><dd>' + fmt(c.len) + '</dd>' : '') + '<dt>Format</dt><dd>DWG (AutoCAD)</dd>';
    var dw = $('#bdDwg'); if (c.dwg) { dw.href = 'assets/cao/' + c.c + '.dwg'; dw.hidden = false; } else dw.hidden = true;
    var fb = $('#bdFav'); fb.dataset.fav = 'c-' + c.c; fb.setAttribute('aria-pressed', window.SopaSel && SopaSel.has('c-' + c.c));
    $('.fl', fb).textContent = window.SopaSel && SopaSel.has('c-' + c.c) ? 'Dans ma sélection' : 'Ajouter à ma sélection';
    var k = shown.indexOf(i); $('#bdIdx').textContent = (k + 1) + ' / ' + shown.length;
    if (dlg.hidden) {
      dlg.hidden = false; d.documentElement.classList.add('dlg-open'); if (window.sopaLock) sopaLock(true);
      if (window.gsap && !reduce) { gsap.fromTo($('.bd-box', dlg), { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: .6, ease: 'power3.out' }); gsap.fromTo($('.bd-veil', dlg), { opacity: 0 }, { opacity: 1, duration: .4 }); }
      setTimeout(function () { $('.bd-x', dlg).focus(); }, 30);
    } else if (window.gsap && !reduce) gsap.fromTo(img, { opacity: 0 }, { opacity: 1, duration: .4 });
    if (fromUser !== false) history.replaceState(null, '', location.pathname + location.search + '#' + c.c);
  }
  function close() {
    dlg.hidden = true; d.documentElement.classList.remove('dlg-open'); if (window.sopaLock) sopaLock(false);
    history.replaceState(null, '', location.pathname + location.search);
    if (lastFocus) { lastFocus.focus({ preventScroll: true }); lastFocus = null; }
  }
  function step(n) { var k = shown.indexOf(cur); if (k < 0) k = 0; k = (k + n + shown.length) % shown.length; open(shown[k]); }
  grid.addEventListener('click', function (e) { var b = e.target.closest('[data-open]'); if (b) { lastFocus = b; open(+b.dataset.open); } });
  $$('[data-close]', dlg).forEach(function (b) { b.addEventListener('click', close); });
  $('#bdPrev').addEventListener('click', function () { step(-1); }); $('#bdNext').addEventListener('click', function () { step(1); });
  $('#bdFav').addEventListener('click', function () {
    var c = DATA[cur]; if (!window.SopaSel) return; var on = SopaSel.toggle(fav(c));
    this.setAttribute('aria-pressed', on); $('.fl', this).textContent = on ? 'Dans ma sélection' : 'Ajouter à ma sélection';
  });
  $$('.bd-zoom button', dlg).forEach(function (b) { b.addEventListener('click', function () { var v = +b.dataset.z; if (!v) { z = { s: 1, x: 0, y: 0 }; setZ(); } else zoomAt(v > 0 ? 1.5 : 1 / 1.5); }); });
  plan.addEventListener('wheel', function (e) { e.preventDefault(); var r = plan.getBoundingClientRect(); zoomAt(e.deltaY < 0 ? 1.18 : 1 / 1.18, e.clientX - r.left, e.clientY - r.top); }, { passive: false });
  var drag = null;
  plan.addEventListener('pointerdown', function (e) { if (e.target.closest('button')) return; drag = { x: e.clientX - z.x, y: e.clientY - z.y }; plan.setPointerCapture(e.pointerId); plan.classList.add('drag'); });
  plan.addEventListener('pointermove', function (e) { if (!drag || z.s === 1) return; z.x = e.clientX - drag.x; z.y = e.clientY - drag.y; setZ(); });
  plan.addEventListener('pointerup', function () { drag = null; plan.classList.remove('drag'); });
  plan.addEventListener('dblclick', function (e) { var r = plan.getBoundingClientRect(); zoomAt(z.s > 2 ? 1 / z.s : 2, e.clientX - r.left, e.clientY - r.top); });
  d.addEventListener('keydown', function (e) {
    if (dlg.hidden) return;
    if (e.key === 'Escape') close(); else if (e.key === 'ArrowRight') step(1); else if (e.key === 'ArrowLeft') step(-1);
    else if (e.key === '+' || e.key === '=') zoomAt(1.5); else if (e.key === '-') zoomAt(1 / 1.5);
    else if (e.key === 'Tab') { var f = $$('button:not([hidden]), a[href]:not([hidden])', dlg).filter(function (x) { return x.offsetParent; }); if (!f.length) return; var a = f[0], z2 = f[f.length - 1]; if (e.shiftKey && d.activeElement === a) { e.preventDefault(); z2.focus(); } else if (!e.shiftKey && d.activeElement === z2) { e.preventDefault(); a.focus(); } }
  });
  /* lien direct : bibliotheque-technique.html#A2VI90g */
  var h = decodeURIComponent(location.hash.slice(1));
  if (h) { var c0 = DATA.filter(function (c) { return c.c === h; })[0]; if (c0) setTimeout(function () { open(c0.i, false); }, 300); }
})();
