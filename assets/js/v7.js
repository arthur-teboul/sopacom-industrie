/* SOPACOM v7 — interactions « produits » : intro, curseur, sélection ♥, sélecteur de zones, rail de chapitres, bandeau */
(function () {
  'use strict';
  var d = document, root = d.documentElement;
  var $ = function (s, c) { return (c || d).querySelector(s); };
  var $$ = function (s, c) { return [].slice.call((c || d).querySelectorAll(s)); };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasG = !!window.gsap;
  var fine = window.matchMedia('(pointer: fine)').matches;
  function ss(k, v) { try { if (v === undefined) return sessionStorage.getItem(k); sessionStorage.setItem(k, v); } catch (e) { return null; } }

  /* ---------- Écran d'intro (une fois par session) ---------- */
  if (!reduce && !ss('sopa-intro') && !/[?&]nointro/.test(location.search)) {
    ss('sopa-intro', '1');
    var L = d.createElement('div'); L.className = 'intro'; L.setAttribute('aria-hidden', 'true');
    L.innerHTML = '<img src="assets/img/logo/logo-officiel-fond-sombre.png" alt="" width="180" height="108"><div class="intro-bar"><i></i></div><span class="intro-n">000</span>';
    d.body.appendChild(L);
    var n = $('.intro-n', L), bar = $('.intro-bar i', L), t0 = performance.now(), dur = 1100;
    (function tick(t) {
      var p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      n.textContent = String(Math.round(e * 100)).padStart(3, '0'); bar.style.transform = 'scaleX(' + e + ')';
      if (p < 1) requestAnimationFrame(tick);
      else { L.classList.add('out'); setTimeout(function () { L.remove(); }, 800); }
    })(t0);
  }

  /* ---------- Curseur avec étiquette ---------- */
  var cur = $('.cur');
  if (cur && fine && !reduce) {
    root.classList.add('has-cur');
    var lab = $('.cur-lab', cur), x = innerWidth / 2, y = innerHeight / 2, cx = x, cy = y;
    d.addEventListener('mousemove', function (e) { x = e.clientX; y = e.clientY; cur.classList.add('on'); }, { passive: true });
    d.addEventListener('mouseleave', function () { cur.classList.remove('on'); });
    (function loop() { cx += (x - cx) * .22; cy += (y - cy) * .22; cur.style.transform = 'translate3d(' + cx + 'px,' + cy + 'px,0)'; requestAnimationFrame(loop); })();
    d.addEventListener('mouseover', function (e) {
      var el = e.target.closest && e.target.closest('[data-cursor], a, button, input[type=range], select, label');
      var t = el && el.getAttribute('data-cursor');
      cur.classList.toggle('big', !!t); cur.classList.toggle('link', !!el && !t);
      if (t) lab.textContent = t;
    });
  }

  /* ---------- Ma sélection (♥) ---------- */
  var KEY = 'sopa-selection';
  function load() { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { return []; } }
  function save(a) { try { localStorage.setItem(KEY, JSON.stringify(a)); } catch (e) {} }
  var sel = load();
  var Sel = window.SopaSel = {
    has: function (id) { return sel.some(function (s) { return s.id === id; }); },
    toggle: function (item) {
      if (Sel.has(item.id)) sel = sel.filter(function (s) { return s.id !== item.id; });
      else { sel.push(item); pulse(); }
      save(sel); sync(); return Sel.has(item.id);
    },
    remove: function (id) { sel = sel.filter(function (s) { return s.id !== id; }); save(sel); sync(); },
    all: function () { return sel.slice(); }, sync: function () { sync(); }
  };
  var btn = $('#selBtn'), drawer = $('#selDrawer'), veil = $('#selVeil'), list = $('#selList'), cnt = $('#selN');
  function pulse() { if (btn) { btn.classList.remove('pulse'); void btn.offsetWidth; btn.classList.add('pulse'); } }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function sync() {
    if (cnt) cnt.textContent = sel.length;
    if (btn) btn.classList.toggle('has', sel.length > 0);
    if (list) {
      list.innerHTML = sel.map(function (s) {
        return '<li><a href="' + esc(s.h) + '" class="sd-img' + (s.cad ? ' cad' : '') + '"><img src="' + esc(s.img) + '" alt="" loading="lazy"></a><div><span class="num">' + esc(s.s || '') + '</span><a href="' + esc(s.h) + '">' + esc(s.t) + '</a></div><button aria-label="Retirer ' + esc(s.t) + '" data-rm="' + esc(s.id) + '">×</button></li>';
      }).join('');
      $('#selEmpty').hidden = sel.length > 0; $('.sd-foot', drawer).hidden = !sel.length;
    }
    $$('[data-fav]').forEach(function (b) {
      var on = Sel.has(b.dataset.fav); b.setAttribute('aria-pressed', on);
      var fl = $('.fl', b); if (fl) fl.textContent = on ? 'Dans ma sélection' : 'Ajouter à ma sélection';
    });
    d.dispatchEvent(new CustomEvent('sopa:sel'));
  }
  function openD(on) {
    if (!drawer) return;
    root.classList.toggle('sel-open', on); drawer.setAttribute('aria-hidden', !on); btn.setAttribute('aria-expanded', on);
    if (window.sopaLock) window.sopaLock(on);
    if (on) setTimeout(function () { var c = $('.sd-close', drawer); if (c) c.focus(); }, 50); else btn.focus({ preventScroll: true });
  }
  if (btn) btn.addEventListener('click', function () { openD(!root.classList.contains('sel-open')); });
  if (veil) veil.addEventListener('click', function () { openD(false); });
  if (drawer) {
    $('.sd-close', drawer).addEventListener('click', function () { openD(false); });
    drawer.addEventListener('click', function (e) { var r = e.target.closest('[data-rm]'); if (r) Sel.remove(r.dataset.rm); });
    $('#selClear').addEventListener('click', function () { sel = []; save(sel); sync(); });
    $('#selQuote').addEventListener('click', function () { openD(false); });
  }
  d.addEventListener('keydown', function (e) { if (e.key === 'Escape' && root.classList.contains('sel-open')) openD(false); });
  d.addEventListener('click', function (e) {
    var b = e.target.closest('[data-fav]'); if (!b || b.id === 'bdFav') return;
    Sel.toggle({ id: b.dataset.fav, t: b.dataset.favT, s: b.dataset.favS, img: b.dataset.favImg, h: b.dataset.favH, cad: b.dataset.favCad === '1' });
  });
  window.addEventListener('storage', function (e) { if (e.key === KEY) { sel = load(); sync(); } });
  sync();

  /* Contact : reprise de la sélection */
  var selIn = $('#selection'), msg = $('#f-msg');
  if (selIn && msg) {
    var fill = function () {
      selIn.hidden = !sel.length;
      $('#selInList').innerHTML = sel.map(function (s) { return '<li>' + esc(s.t) + ' <span class="num">' + esc(s.s || '') + '</span></li>'; }).join('');
      var txt = 'Ma sélection :\n' + sel.map(function (s) { return '- ' + s.t + (s.s ? ' (' + s.s + ')' : ''); }).join('\n') + '\n\n';
      msg.value = msg.value.replace(/^Ma sélection :\n[\s\S]*?\n\n/, '');
      if (sel.length) msg.value = txt + msg.value;
    };
    fill(); d.addEventListener('sopa:sel', fill);
    if (sel.length) { var o = $('#f-obj'); if (o) o.value = 'Demande de tarif'; }
  }

  /* ---------- Sélecteur de zones sur le rendu réel ---------- */
  var pick = $('#isoPick');
  if (pick) {
    var zones = $$('g', pick), hots = $$('.hot');
    var hl = function (i) { zones.forEach(function (z) { z.classList.toggle('hov', +z.dataset.step === i); }); hots.forEach(function (h) { h.classList.toggle('hov', +h.dataset.step === i); }); };
    var syncOn = function () { setTimeout(function () { zones.forEach(function (z) { var h = $('.hot[data-step="' + z.dataset.step + '"]'); z.classList.toggle('on', !!h && h.classList.contains('on')); }); }, 0); };
    zones.forEach(function (z) {
      z.addEventListener('mouseenter', function () { hl(+z.dataset.step); });
      z.addEventListener('mouseleave', function () { hl(-1); });
      z.addEventListener('click', function () { var h = $('.hot[data-step="' + z.dataset.step + '"]'); if (h) h.click(); });
    });
    hots.forEach(function (h) { h.addEventListener('mouseenter', function () { hl(+h.dataset.step); }); h.addEventListener('mouseleave', function () { hl(-1); }); });
    $$('.hot, .steps-bar button').forEach(function (b) { b.addEventListener('click', syncOn); });
    d.addEventListener('keydown', function (e) { if (e.key === 'Escape') syncOn(); });
    // invitation : les zones s'éclairent une à une à l'arrivée
    if (hasG && window.ScrollTrigger && !reduce) ScrollTrigger.create({ trigger: '#iso', start: 'top 70%', once: true, onEnter: function () {
      zones.forEach(function (z, i) { setTimeout(function () { z.classList.add('wave'); setTimeout(function () { z.classList.remove('wave'); }, 700); }, 250 + i * 260); });
    } });
  }

  /* ---------- Rail de chapitres (accueil) ---------- */
  var rail = $('#rail');
  if (rail) {
    var links = $$('a', rail), railN = $('#railN');
    var targets = links.map(function (a) { var t = d.getElementById(a.getAttribute('href').slice(1)); return t && (t.closest('section') || t); });
    var setAct = function (i) { links.forEach(function (a, k) { a.classList.toggle('on', k === i); if (k === i) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); }); railN.textContent = String(i).padStart(2, '0'); };
    var onScroll = function () {
      var mid = innerHeight * .45, best = 0;
      targets.forEach(function (t, i) { if (t && t.getBoundingClientRect().top < mid) best = i; });
      setAct(best);
      rail.classList.toggle('show', scrollY > 40);
    };
    addEventListener('scroll', onScroll, { passive: true }); onScroll();
    links.forEach(function (a, i) { a.addEventListener('click', function (e) {
      var t = targets[i]; if (!t) return; e.preventDefault();
      if (window.sopaLenis) window.sopaLenis.scrollTo(t, { offset: i ? -60 : 0, duration: 1.4 }); else t.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
    }); });
  }

  /* ---------- Bandeau plein cadre : ouverture + lignes ---------- */
  var cb = $('.clipband');
  if (cb && hasG && window.ScrollTrigger && !reduce) {
    gsap.fromTo($('.cb-img', cb), { clipPath: 'inset(18% 22% 18% 22%)' }, { clipPath: 'inset(0% 0% 0% 0%)', ease: 'none', scrollTrigger: { trigger: cb, start: 'top 85%', end: 'center 50%', scrub: true } });
    gsap.fromTo($('.cb-img img', cb), { scale: 1.25 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: cb, start: 'top bottom', end: 'bottom top', scrub: true } });
    gsap.from($$('.rev-lines span', cb), { yPercent: 105, duration: 1.2, stagger: .14, ease: 'power4.out', scrollTrigger: { trigger: cb, start: 'center 70%' } });
  }
  /* tuiles CAO : entrée en cascade */
  if (hasG && window.ScrollTrigger && !reduce) $$('.cao-strip').forEach(function (s) {
    gsap.from($$('.cao-tile', s), { opacity: 0, y: 30, duration: .9, stagger: .06, ease: 'power3.out', scrollTrigger: { trigger: s, start: 'top 85%' } });
  });
})();
