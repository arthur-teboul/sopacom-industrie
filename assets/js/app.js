/* SOPACOM INDUSTRIE — interactions communes
   GSAP + ScrollTrigger (animations), Lenis (défilement fluide). Tout est facultatif : sans ces
   bibliothèques ou avec « réduire les animations », le contenu reste entièrement visible. */
(function () {
  'use strict';
  var d = document, root = d.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var hasG = !!(window.gsap && window.ScrollTrigger);
  if (!hasG) root.classList.remove('js');
  if (hasG) gsap.registerPlugin(ScrollTrigger);
  function $(s, c) { return (c || d).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || d).querySelectorAll(s)); }

  /* ---------- Défilement fluide (Lenis) ---------- */
  var lenis = null;
  if (window.Lenis && hasG && !reduce) {
    lenis = new Lenis({ lerp: 0.11, smoothWheel: true, wheelMultiplier: 1, touchMultiplier: 1.4 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
    root.classList.add('lenis-on'); window.sopaLenis = lenis;
    // ancres internes
    $$('a[href^="#"], a[href*=".html#"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var h = a.getAttribute('href'), parts = h.split('#'), here = location.pathname.split('/').pop() || 'index.html';
        if (parts[0] && parts[0] !== here) return;
        var el = parts[1] && d.getElementById(parts[1]); if (!el) return;
        e.preventDefault(); lenis.scrollTo(el, { offset: -100, duration: 1.4 }); history.replaceState(null, '', '#' + parts[1]);
      });
    });
    if (location.hash) { var tgt = d.getElementById(location.hash.slice(1)); if (tgt) setTimeout(function () { lenis.scrollTo(tgt, { offset: -100, immediate: true }); }, 60); }
  }
  function lockScroll(on) { if (lenis) on ? lenis.stop() : lenis.start(); }
  window.sopaLock = lockScroll;

  /* ---------- Transition entre les pages ---------- */
  var pt = $('.pt');
  if (pt) {
    if (hasG && !reduce) gsap.fromTo(pt, { scaleY: 1 }, { scaleY: 0, transformOrigin: 'top', duration: .75, ease: 'power3.inOut', delay: .05 });
    else pt.style.transform = 'scaleY(0)';
    window.addEventListener('pageshow', function (e) { if (e.persisted) gsap.set(pt, { scaleY: 0 }); });
    d.addEventListener('click', function (e) {
      var a = e.target.closest('a'); if (!a || reduce || !hasG) return;
      var h = a.getAttribute('href') || '';
      if (a.target || a.hasAttribute('download') || e.metaKey || e.ctrlKey || e.shiftKey || /^(https?:|mailto:|tel:|#)/.test(h) || !/\.html(#.*)?$/.test(h)) return;
      var same = h.split('#')[0] === (location.pathname.split('/').pop() || 'index.html'); if (same) return;
      e.preventDefault();
      gsap.fromTo(pt, { scaleY: 0 }, { scaleY: 1, transformOrigin: 'bottom', duration: .5, ease: 'power3.in', onComplete: function () { location.href = h; } });
    });
  }

  /* ---------- En-tête : état au défilement ---------- */
  var hdr = $('.site-header');
  function onS(y) { if (hdr) hdr.classList.toggle('scrolled', y > 40); }
  if (lenis) lenis.on('scroll', function (e) { onS(e.scroll); }); else window.addEventListener('scroll', function () { onS(window.scrollY); }, { passive: true });

  /* ---------- Menu ---------- */
  var burger = $('.burger');
  if (burger) burger.addEventListener('click', function () { var open = root.classList.toggle('nav-open'); burger.setAttribute('aria-expanded', open); lockScroll(open); });
  $$('.nav a').forEach(function (a) { a.addEventListener('click', function () { root.classList.remove('nav-open'); lockScroll(false); if (burger) burger.setAttribute('aria-expanded', 'false'); }); });

  /* ---------- Titres : apparition mot à mot ---------- */
  function splitWords(el) {
    var out = '';
    el.innerHTML.split(/(<[^>]+>|\s+)/).filter(Boolean).forEach(function (t) {
      out += /^\s+$/.test(t) ? ' ' : /^</.test(t) ? t : '<span class="wm"><span>' + t + '</span></span>';
    });
    el.innerHTML = out;
  }
  if (hasG && !reduce) {
    $$('.h2.rv, .display.rv, .pn .h2').forEach(function (h) {
      h.classList.remove('rv'); splitWords(h);
      gsap.from($$('.wm > span', h), { yPercent: 105, duration: 1.05, ease: 'power4.out', stagger: .045, scrollTrigger: { trigger: h, start: 'top 88%', once: true } });
    });
    ScrollTrigger.batch('.rv', { start: 'top 90%', once: true, onEnter: function (els) { gsap.to(els, { opacity: 1, y: 0, duration: 1, ease: 'power3.out', stagger: .07, overwrite: true }); } });
    // Lignes de rubrique qui se tracent
    $$('.label').forEach(function (l) { gsap.from(l, { '--lw': 0, duration: 1.2, ease: 'power2.out', scrollTrigger: { trigger: l, start: 'top 92%', once: true } }); });
    // Images : dévoilement + léger parallaxe (images principales uniquement)
    $$('.fig.crop .ph, .gallery .fig .ph, .masonry .fig .ph').forEach(function (ph) {
      gsap.fromTo(ph, { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: 1.25, ease: 'power3.inOut', scrollTrigger: { trigger: ph, start: 'top 90%', once: true } });
    });
    $$('.p-img img, .range .fig img, .hero-stage img').forEach(function (img) {
      gsap.fromTo(img, { scale: 1.1 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: img, start: 'top bottom', end: 'bottom top', scrub: .6 } });
    });
    var flow = $('#flow');
    if (flow) gsap.from($$('li', flow), { opacity: 0, x: -20, duration: .8, stagger: .1, ease: 'power3.out', scrollTrigger: { trigger: flow, start: 'top 85%', once: true } });
    // Bandeau défilant : vitesse liée au défilement
    var mq = $('.marquee .track');
    if (mq) { var tw = gsap.to(mq, { xPercent: -50, duration: 40, ease: 'none', repeat: -1 }); mq.style.animation = 'none';
      if (lenis) lenis.on('scroll', function (e) { gsap.to(tw, { timeScale: 1 + Math.min(Math.abs(e.velocity) / 6, 5), duration: .3, overwrite: true }); gsap.to(tw, { timeScale: 1, duration: 1.2, delay: .3 }); }); }
  } else {
    $$('.rv').forEach(function (e) { e.style.opacity = 1; e.style.transform = 'none'; });
  }

  /* ---------- Boutons magnétiques ---------- */
  if (fine && !reduce && hasG) $$('.btn').forEach(function (b) {
    var xs = gsap.quickTo(b, 'x', { duration: .45, ease: 'power3.out' }), ys = gsap.quickTo(b, 'y', { duration: .45, ease: 'power3.out' });
    b.addEventListener('pointermove', function (e) { var r = b.getBoundingClientRect(); xs((e.clientX - r.left - r.width / 2) * .18); ys((e.clientY - r.top - r.height / 2) * .3); });
    b.addEventListener('pointerleave', function () { xs(0); ys(0); });
  });

  /* ---------- Hero : séquence d'entrée ---------- */
  var heroTitle = $('#h-hero');
  if (heroTitle && hasG && !reduce) {
    gsap.timeline({ defaults: { ease: 'power4.out' }, delay: .35 })
      .from($$('.line-mask > span', heroTitle), { yPercent: 110, duration: 1.3, stagger: .1 })
      .from($$('.hero-in'), { opacity: 0, y: 22, duration: 1, stagger: .12 }, '-=.8')
      .from('#heroStage', { opacity: 0, duration: 2, ease: 'power2.out' }, 0)
      .from($$('.h3d-steps button'), { opacity: 0, y: 16, duration: .7, stagger: .06 }, '-=.9');
    gsap.to('.h3d-copy', { yPercent: -18, opacity: .2, ease: 'none', scrollTrigger: { trigger: '.h3d', start: 'top top', end: 'bottom top', scrub: true } });
  }

  /* ---------- Rendu réel : annotations et « caméra » ---------- */
  var iso = $('#iso'), cam = $('#isoCam'), panel = $('#stepPanel');
  if (iso && window.SOPA_STEPS) {
    var steps = window.SOPA_STEPS, current = -1, defaultPanel = panel.innerHTML;
    function render(i) {
      var s = steps[i];
      panel.innerHTML = '<div class="sp-k"><span class="num">Étape ' + s.n + '</span><h2 class="h3">' + s.t + '</h2></div>' +
        '<div class="sp-t"><p>' + s.txt + '</p><span class="src">Source : ' + s.src + '</span></div>' +
        '<div class="sp-l">' + s.links.map(function (l) { return '<a href="' + l[1] + '"><span>' + l[0] + '</span><span>→</span></a>'; }).join('') +
        '<a href="fonctionnement.html#etape-' + (i + 1) + '"><span>Voir en 3D</span><span>→</span></a></div>';
      if (hasG && !reduce) gsap.from($$('#stepPanel > *'), { opacity: 0, y: 14, duration: .55, stagger: .07, ease: 'power3.out' });
    }
    function focus(i) {
      $$('.hot').forEach(function (h) { h.classList.toggle('on', +h.dataset.step === i); });
      $$('.steps-bar button').forEach(function (b) { b.setAttribute('aria-pressed', +b.dataset.step === i); });
      var W = iso.clientWidth, Hh = iso.clientHeight;
      if (i < 0) { iso.classList.remove('focused'); if (hasG) gsap.to(cam, { x: 0, y: 0, scale: 1, duration: reduce ? 0 : 1.3, ease: 'power3.inOut' }); else cam.style.transform = ''; panel.innerHTML = defaultPanel; current = -1; return; }
      var z = steps[i].z, S = 1.75, px = z.x / 100 * W, py = z.y / 100 * Hh;
      var tx = Math.min(0, Math.max(W - W * S, W / 2 - px * S)), ty = Math.min(0, Math.max(Hh - Hh * S, Hh / 2 - py * S));
      var dim = $('#isoDim'); dim.style.setProperty('--fx', z.x + '%'); dim.style.setProperty('--fy', z.y + '%'); dim.style.setProperty('--fr', (z.r / 1.75) + 'px');
      iso.classList.add('focused');
      if (hasG) gsap.to(cam, { x: tx, y: ty, scale: S, duration: reduce ? 0 : 1.4, ease: 'power3.inOut' }); else cam.style.transform = 'translate(' + tx + 'px,' + ty + 'px) scale(' + S + ')';
      render(i); current = i;
    }
    $$('.hot, .steps-bar button').forEach(function (b) { b.addEventListener('click', function () { var i = +b.dataset.step; focus(i === current ? -1 : i); }); });
    d.addEventListener('keydown', function (e) { if (e.key === 'Escape' && current > -1) focus(-1); });
    window.addEventListener('resize', function () { if (current > -1) focus(current); });
  }

  /* ---------- Compteurs ---------- */
  $$('[data-count]').forEach(function (el) {
    var to = +el.dataset.count, from = +(el.dataset.from || 0), sep = !!el.dataset.sep;
    function fmt(n) { return sep ? Math.round(n).toLocaleString('fr-FR') : String(Math.round(n)); }
    if (!hasG || reduce) { el.textContent = fmt(to); return; }
    var o = { v: from }; el.textContent = fmt(from);
    gsap.to(o, { v: to, duration: 2, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 90%', once: true }, onUpdate: function () { el.textContent = fmt(o.v); } });
  });

  /* ---------- Secteurs : image au survol ---------- */
  var list = $('.sector-list');
  if (list && fine && hasG) {
    var hv = d.createElement('div'); hv.className = 'hover-img'; hv.innerHTML = '<img alt="">'; d.body.appendChild(hv);
    var hvImg = $('img', hv), qx = gsap.quickTo(hv, 'left', { duration: .5, ease: 'power3.out' }), qy = gsap.quickTo(hv, 'top', { duration: .5, ease: 'power3.out' });
    $$('a', list).forEach(function (a) {
      a.addEventListener('mouseenter', function () { hvImg.src = a.dataset.img; hv.classList.add('on'); });
      a.addEventListener('mouseleave', function () { hv.classList.remove('on'); });
    });
    list.addEventListener('mousemove', function (e) { qx(e.clientX + 190); qy(e.clientY); });
  }

  /* ---------- Frise horizontale (entreprise) ---------- */
  var tlTrack = $('#tlTrack');
  if (tlTrack && hasG && !reduce && window.innerWidth > 1020) {
    var tsec = tlTrack.closest('section');
    gsap.to(tlTrack, { x: function () { return -(tlTrack.scrollWidth - tlTrack.parentNode.clientWidth); }, ease: 'none',
      scrollTrigger: { trigger: tsec, start: 'top top', end: function () { return '+=' + (tlTrack.scrollWidth - tlTrack.parentNode.clientWidth); }, pin: true, scrub: .8, invalidateOnRefresh: true, onUpdate: function (s) { $('#tlBar').style.width = (s.progress * 100) + '%'; } } });
  } else if (tlTrack) { tlTrack.style.flexWrap = 'wrap'; tlTrack.style.rowGap = '40px'; }

  /* ---------- Secteurs : navigation active ---------- */
  var snav = $$('.sec-nav a');
  if (snav.length && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (en) { en.forEach(function (e) { if (e.isIntersecting) snav.forEach(function (a) { a.classList.toggle('on', a.getAttribute('href') === '#' + e.target.id); }); }); }, { rootMargin: '-40% 0px -55% 0px' });
    $$('.universe').forEach(function (u) { io.observe(u); });
  }

  /* ---------- Visionneuse d'images ---------- */
  $$('[data-lb]').forEach(function (box) {
    var figs = $$('.fig', box); if (!figs.length) return;
    var lb = d.createElement('div'); lb.className = 'lb'; lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-modal', 'true');
    lb.innerHTML = '<button class="x" aria-label="Fermer">×</button><button class="p" aria-label="Précédente">‹</button><img alt=""><p class="cap"></p><button class="n" aria-label="Suivante">›</button>';
    d.body.appendChild(lb);
    var im = $('img', lb), cap = $('.cap', lb), cur = 0;
    function vis() { return figs.filter(function (f) { return !f.classList.contains('hide'); }); }
    function show(f) { var v = vis(); cur = v.indexOf(f); var i = $('img', f); im.src = i.src; im.alt = i.alt; var c = $('figcaption', f); cap.textContent = c ? c.textContent : '';
      if (!lb.classList.contains('on')) { lb.classList.add('on'); lockScroll(true); if (hasG && !reduce) gsap.fromTo(lb, { opacity: 0 }, { opacity: 1, duration: .35 }); }
      if (hasG && !reduce) gsap.fromTo(im, { opacity: 0, scale: .97 }, { opacity: 1, scale: 1, duration: .45, ease: 'power3.out' }); $('.x', lb).focus(); }
    function close() { lb.classList.remove('on'); lockScroll(false); }
    function step(k) { var v = vis(); show(v[(cur + k + v.length) % v.length]); }
    figs.forEach(function (f) { f.addEventListener('click', function () { show(f); }); });
    $('.x', lb).onclick = close; $('.p', lb).onclick = function () { step(-1); }; $('.n', lb).onclick = function () { step(1); };
    lb.addEventListener('click', function (e) { if (e.target === lb) close(); });
    d.addEventListener('keydown', function (e) { if (!lb.classList.contains('on')) return; if (e.key === 'Escape') close(); if (e.key === 'ArrowRight') step(1); if (e.key === 'ArrowLeft') step(-1); });
  });

  /* ---------- Filtres réalisations ---------- */
  var mas = $('.masonry');
  if (mas) $$('.filters button[data-f]').forEach(function (b) {
    b.addEventListener('click', function () {
      $$('.filters button[data-f]').forEach(function (x) { x.setAttribute('aria-pressed', x === b); });
      var figs = $$('.fig', mas);
      figs.forEach(function (f) { f.classList.toggle('hide', b.dataset.f !== 'all' && f.dataset.cat !== b.dataset.f); });
      if (hasG && !reduce) { gsap.fromTo($$('.fig:not(.hide)', mas), { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: .6, stagger: .03, ease: 'power3.out' }); $$('.fig .ph', mas).forEach(function (p) { p.style.clipPath = 'none'; }); }
      if (hasG) ScrollTrigger.refresh();
    });
  });

  /* ---------- Bibliothèque documentaire ---------- */
  var q = $('#q');
  if (q) {
    var fa = 'all', fl = null;
    function apply() {
      var t = q.value.trim().toLowerCase(), n = 0;
      $$('.doc').forEach(function (doc) { var ok = (!t || doc.dataset.s.indexOf(t) > -1) && (fa === 'all' || doc.dataset.a.split(' ').indexOf(fa) > -1) && (!fl || doc.dataset.l === fl);
        doc.classList.toggle('hide', !ok); if (ok) { n++; doc.style.opacity = 1; doc.style.transform = 'none'; } });
      $$('.lib-group').forEach(function (g) { g.style.display = $$('.doc:not(.hide)', g).length ? '' : 'none'; });
      $('#count').textContent = n + ' document' + (n > 1 ? 's' : '');
      if (hasG) ScrollTrigger.refresh();
    }
    q.addEventListener('input', apply);
    $$('.filters button[data-a]').forEach(function (b) { b.addEventListener('click', function () { fa = b.dataset.a; $$('.filters button[data-a]').forEach(function (x) { x.setAttribute('aria-pressed', x === b); }); apply(); }); });
    $$('.filters button[data-l]').forEach(function (b) { b.addEventListener('click', function () { var on = b.getAttribute('aria-pressed') !== 'true'; $$('.filters button[data-l]').forEach(function (x) { x.setAttribute('aria-pressed', 'false'); }); b.setAttribute('aria-pressed', on); fl = on ? b.dataset.l : null; apply(); }); });
    apply();
  }
  /* Visionneuse PDF */
  var pm = $('#pdfModal');
  if (!pm && $('[data-pdf]')) {
    pm = d.createElement('div'); pm.className = 'modal'; pm.id = 'pdfModal'; pm.setAttribute('role', 'dialog'); pm.setAttribute('aria-modal', 'true');
    pm.innerHTML = '<div class="modal-box"><div class="modal-bar"><span class="mono" id="pdfTitle"></span><div class="btns" style="gap:8px"><a class="btn" id="pdfDl" href="#" download style="padding:9px 14px">Télécharger</a><button class="modal-close" aria-label="Fermer">×</button></div></div><iframe id="pdfFrame" title="Document PDF"></iframe></div>';
    d.body.appendChild(pm);
  }
  if (pm) {
    pm.setAttribute('data-lenis-prevent', '');
    $$('[data-pdf]').forEach(function (b) { b.addEventListener('click', function () { $('#pdfFrame').src = b.dataset.pdf; $('#pdfTitle').textContent = b.dataset.title; $('#pdfDl').href = b.dataset.pdf; pm.classList.add('on'); lockScroll(true); $('.modal-close', pm).focus(); }); });
    function closeM() { pm.classList.remove('on'); lockScroll(false); $('#pdfFrame').src = 'about:blank'; }
    $('.modal-close', pm).onclick = closeM;
    pm.addEventListener('click', function (e) { if (e.target === pm) closeM(); });
    d.addEventListener('keydown', function (e) { if (e.key === 'Escape' && pm.classList.contains('on')) closeM(); });
  }

  /* ---------- Contact ---------- */
  var form = $('#contactForm');
  if (form) form.addEventListener('submit', function (e) {
    e.preventDefault(); if (!form.checkValidity()) { form.reportValidity(); return; }
    var f = form.elements;
    var body = 'Nom : ' + f.nom.value + '\nÉtablissement : ' + f.etablissement.value + '\nE-mail : ' + f.email.value + '\nTéléphone : ' + f.telephone.value + '\nSecteur : ' + f.secteur.value + '\n\n' + f.message.value;
    location.href = 'mailto:sopacom-industrie@wanadoo.fr?subject=' + encodeURIComponent('[Site] ' + f.objet.value) + '&body=' + encodeURIComponent(body);
  });

  /* ---------- Avant / Après ---------- */
  $$('.ba input').forEach(function (inp) { inp.addEventListener('input', function () { inp.parentNode.style.setProperty('--x', inp.value + '%'); }); });
  $$('.ba-tabs button').forEach(function (b) { b.addEventListener('click', function () { $$('.ba-tabs button').forEach(function (x) { x.classList.toggle('on', x === b); }); $$('.ba').forEach(function (x) { x.classList.toggle('on', x.dataset.k === b.dataset.k); }); }); });
  var ba0 = $('.ba.on');
  if (ba0 && hasG && !reduce) { var o = { v: 50 }; gsap.to(o, { v: 22, duration: 1.1, yoyo: true, repeat: 1, ease: 'power2.inOut', delay: .9, onUpdate: function () { ba0.style.setProperty('--x', o.v + '%'); $('input', ba0).value = o.v; } }); }

  if (hasG) window.addEventListener('load', function () { ScrollTrigger.refresh(); });
})();
