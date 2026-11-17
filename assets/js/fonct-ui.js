/* SOPACOM — Page « Comprendre le fonctionnement » : interface (étapes, vues, simulation, panneaux, étiquettes).
   Conserve les interactions de l'ancien explorateur : rotation, zoom, déplacement, étapes, flux animés, isolement,
   vue éclatée, étiquettes, pause, recentrage, souris et tactile. */
(function () {
  'use strict';
  var root = document.getElementById('fx'); if (!root) return;
  /* S3 : la visionneuse d'images d'app.js (partagée) crée une <img> sans src ; on lui donne une source vide valide une fois le DOM prêt. */
  function fixBlank() { document.querySelectorAll('.lb img:not([src]), .hover-img img:not([src])').forEach(function (i) { i.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'; }); }
  document.addEventListener('DOMContentLoaded', fixBlank); window.addEventListener('load', fixBlank); if (document.readyState === 'complete') fixBlank();
  var D = window.SOPA_FX || {}, STEPS = D.steps || [], EQ = D.equip || {};
  var $ = function (s, c) { return (c || root).querySelector(s); }, $$ = function (s, c) { return [].slice.call((c || root).querySelectorAll(s)); };
  var stage = $('#fxStage'), reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function fm(v) { return (Math.round(v * 100) / 100).toString().replace('.', ','); }

  /* ---------- caméras des étapes (mètres) ---------- */
  var CAMS = [
    { p: [1.75, 33, 31.5], t: [1.75, 0, 0.6] },            // 00 vue générale
    { p: [-10.5, 11, 15], t: [-10, 0.6, 0.4] },          // 01 réfectoire
    { p: [-3.2, 5.2, 4.2], t: [-3.6, 0.9, -3.3] },       // 02 retour et dépose
    { p: [2.4, 5.2, 4.0], t: [2.2, 0.9, -2.6] },         // 03 tri sélectif
    { p: [8.4, 5.0, 5.0], t: [8.2, 0.9, -0.3] },         // 04 préparation et agents
    { p: [3.5, 10, 12], t: [3.2, 0.8, -2.4] },           // 05 convoyage mécanisé
    { p: [11.8, 5.0, 4.8], t: [11.2, 0.9, -0.45] },      // 06 alimentation de la zone de lavage
    { p: [15.0, 6.2, 6.5], t: [15.0, 1.1, -0.45] },      // 07 lavage
    { p: [17.2, 5.2, 5.2], t: [18.0, 0.9, 0.9] },        // 08 sortie
    { p: [12.5, 9.5, 13.0], t: [18.2, 1.4, 3.6] },       // 09 séchage et stockage
    { p: [7.5, 17, 19.5], t: [6.0, 0.4, 4.2] }           // 10 retour à disposition
  ];
  var VIEWS = {
    general: { p: [1.75, 33, 31.5], t: [1.75, 0, 0.6], mode: 'normal', n: 'Vue générale' },
    aerienne: { p: [1.75, 52, 7], t: [1.75, 0, 0.3], mode: 'normal', n: 'Vue aérienne' },
    coupe: { p: [15.4, 5.0, 9.0], t: [15.2, 1.0, -0.5], mode: 'normal', clip: -0.45, n: 'Vue en coupe' },
    immersive: { p: [-8.2, 1.65, -3.3], t: [2.0, 1.15, -3.3], mode: 'normal', n: 'Vue immersive' },
    technique: { p: [9.5, 17, 19], t: [9.5, 0.6, -0.5], mode: 'tech', plans: true, n: 'Vue technique' },
    eclatee: { p: [12.5, 12, 15], t: [12.5, 1.4, -0.4], mode: 'normal', explode: true, n: 'Vue éclatée' },
    flux: { p: [1.75, 36, 22], t: [1.75, 0, 0.5], mode: 'flux', flows: true, n: 'Vue des flux' }
  };
  var LABELS = [
    { t: 'Réfectoire', n: '01', p: [-10, 2.4, 0.4], step: 1 },
    { t: 'Dépose · Technicord', n: '02', p: [-4.7, 1.7, -3.4], step: 2, eq: 'technicord' },
    { t: 'Tri sélectif', n: '03', p: [2.4, 2.3, -2.9], step: 3, eq: 'tri' },
    { t: 'Préparation · Tabling', n: '04', p: [8.55, 2.2, -0.45], step: 4, eq: 'tabling' },
    { t: 'Convoyage · Technicord', n: '05', p: [6.4, 1.4, -3.4], step: 5, eq: 'technicord' },
    { t: 'Transflex', n: '06', p: [10.9, 1.3, -0.45], step: 6, eq: 'transflex' },
    { t: 'Lavage', n: '07', p: [15.0, 3.2, -0.45], step: 7, eq: 'machine' },
    { t: 'Sortie · Tabling', n: '08', p: [17.43, 1.5, -0.45], step: 8, eq: 'tabling' },
    { t: 'Séchage · Transroll', n: '09', p: [19.35, 2.1, 1.9], step: 9, eq: 'transroll' },
    { t: 'Stockage · Technilift', n: '09', p: [19.35, 4.0, 4.2], step: 9, eq: 'technilift' },
    { t: 'Retour en salle · Technicord de préparation', n: '10', p: [-6.5, 1.7, 6.55], step: 10, eq: 'prep' }
  ];

  /* ---------- cadrage adaptatif : l'installation entière tient dans la vue ---------- */
  var TH = window.THREE;
  function reserve() {
    var sr = stage.getBoundingClientRect(), top = 10, bot = 10, vb = $('.fx-views-wrap'), dk = $('.fx-dock');
    if (vb && vb.offsetParent) top = Math.max(top, vb.getBoundingClientRect().bottom - sr.top + 10);
    if (dk && dk.offsetParent && !root.classList.contains('fx-panel-open')) bot = Math.max(bot, sr.bottom - dk.getBoundingClientRect().top + 8);
    return { top: top, bot: bot, side: 12 };
  }
  function fitView(pitchDeg, tgtZ) {
    var B = window.SF.B, w = stage.clientWidth || 800, h = stage.clientHeight || 500, rv = reserve(), pitch = pitchDeg * Math.PI / 180;
    var cam = new TH.PerspectiveCamera(32, w / h, 0.1, 500), tgt = new TH.Vector3((B.x0 + B.x1) / 2, 0, tgtZ == null ? 0.6 : tgtZ), pts = [];
    [B.x0, B.x1].forEach(function (x) { [B.z0, B.z1].forEach(function (z) { pts.push(new TH.Vector3(x, 0, z)); pts.push(new TH.Vector3(x, z === B.z0 ? B.H : 1.2, z)); if (x === B.x1) pts.push(new TH.Vector3(x, 3.7, z)); }); });
    function tryAz(dir) {
      for (var d = 14; d <= 165; d += 0.75) {
        cam.position.copy(tgt).addScaledVector(dir, d); cam.lookAt(tgt); cam.updateMatrixWorld(true); cam.updateProjectionMatrix(); var ok = true;
        for (var i = 0; i < pts.length; i++) { var v = pts[i].clone().project(cam), px = (v.x * 0.5 + 0.5) * w, py = (-v.y * 0.5 + 0.5) * h; if (px < rv.side || px > w - rv.side || py < rv.top || py > h - rv.bot) { ok = false; break; } }
        if (ok) return d * 1.02;
      } return 165;
    }
    var dS = tryAz(new TH.Vector3(0, Math.sin(pitch), Math.cos(pitch))), dE = tryAz(new TH.Vector3(Math.cos(pitch), Math.sin(pitch), 0.0001));
    var useE = dE < dS * 0.88, d = useE ? dE : dS, dir = useE ? new TH.Vector3(Math.cos(pitch), Math.sin(pitch), 0.0001) : new TH.Vector3(0, Math.sin(pitch), Math.cos(pitch));
    return { p: tgt.clone().addScaledVector(dir, d).toArray(), t: tgt.toArray() };
  }
  function refit() {
    if (!W) return; var g = fitView(47);
    CAMS[0] = g; VIEWS.general.p = g.p; VIEWS.general.t = g.t;
    var a = fitView(80, 0.3); VIEWS.aerienne.p = a.p; VIEWS.aerienne.t = a.t;
    var f = fitView(56); VIEWS.flux.p = f.p; VIEWS.flux.t = f.t;
  }

  /* ---------- repli sans WebGL ---------- */
  var W = null;
  try { W = window.SF && SF.create(stage, {}); if (W) { SF.attachActors(W); } } catch (e) { console.error(e); W = null; }
  if (!W) { root.classList.add('fx-nowebgl'); document.documentElement.classList.add('no-webgl'); }

  function setHH() { var h = document.querySelector('.site-header'); if (h) root.style.setProperty('--fx-hh', Math.round(h.getBoundingClientRect().height) + 'px'); }
  setHH();

  /* ---------- état ---------- */
  var st = { step: 0, view: 'general', iso: false, flows: true, labels: true, explode: false, paused: false };
  var infoEl = $('#fxInfo'), stepBtns = $$('#fxSteps button');

  function setInfo(i) {
    var s = STEPS[i]; if (!s) return;
    var h = '<p class="fx-k">Étape ' + esc(s.n) + '</p><h2 class="fx-h" id="fxInfoT">' + esc(s.t) + '</h2><p>' + esc(s.txt) + '</p>';
    if (s.tech) h += '<p class="fx-tech"><b>Repère technique</b> ' + esc(s.tech) + '</p>';
    if (i === 4 || i === 3 || i === 2 || i === 6 || i === 8 || i === 9 || i === 10) { var ag = (W && W.agents ? W.agents : []).filter(function (a) { return a.steps.indexOf(i) >= 0; }); if (ag.length) h += '<p class="fx-roles"><b>Postes</b> ' + ag.map(function (a) { return esc(a.role); }).join(' · ') + '</p>'; }
    if (s.equip && s.equip.length) h += '<p class="fx-eq">' + s.equip.map(function (id) { return EQ[id] ? '<button type="button" class="fx-chip" data-eq="' + id + '">' + esc(EQ[id].short || EQ[id].name) + '</button>' : ''; }).join('') + '</p>';
    if (s.links && s.links.length) h += '<p class="fx-links">' + s.links.map(function (l) { return '<a class="link" href="' + esc(l[1]) + '">' + esc(l[0]) + ' <span class="arr">→</span></a>'; }).join('') + '</p>';
    if (s.src) h += '<p class="fx-src">Source : ' + esc(s.src) + '</p>';
    infoEl.innerHTML = h;
    stepBtns.forEach(function (b) { b.setAttribute('aria-pressed', +b.dataset.step === i); });
    var live = $('#fxLive'); if (live) live.textContent = 'Étape ' + s.n + ' : ' + s.t;
  }

  function flowsForStep(i) { var s = STEPS[i]; return s && s.flows ? s.flows : null; }
  function applyIso() { if (!W) return; if (st.iso && st.step > 0) { var o = {}; o[st.step] = 1; W.setIso(o); } else W.setIso(null); }
  function fly(c, dur) { if (W) W.flyTo(c.p, c.t, dur || 1.9); }

  function select(i, byUser) {
    i = Math.max(0, Math.min(STEPS.length - 1, i)); st.step = i; setInfo(i);
    if (W) {
      if (st.view !== 'general' && byUser !== 'keep') { setViewState('general', true); }
      var cams = CAMS[i], f = W.camera.aspect < 1.2 ? 1.5 : 1, tg = cams.t, p = cams.p, dx = p[0] - tg[0], dy = p[1] - tg[1], dz = p[2] - tg[2];
      if (i === 1) f *= 1; var pp = [tg[0] + dx * f, tg[1] + dy * f, tg[2] + dz * f];
      if (i !== 0 && W.aspect < 1.2) { pp = [tg[0] + dx * 1.5, tg[1] + dy * 1.5, tg[2] + dz * 1.5]; }
      if (i === 0) refit();
      W.flyTo(i === 0 ? CAMS[0].p : pp, i === 0 ? CAMS[0].t : cams.t, 2.0);
      applyIso(); W.dimFlows(i === 0 ? null : flowsForStep(i));
    }
    updateLabels(); if (byUser === true) { try { history.replaceState(null, '', '#etape-' + (i < 10 ? '0' + i : i)); } catch (e) { } }
  }
  stepBtns.forEach(function (b) { b.addEventListener('click', function () { select(+b.dataset.step, true); }); });
  infoEl.addEventListener('click', function (e) { var c = e.target.closest('[data-eq]'); if (c) openPanel(c.dataset.eq); });

  /* ---------- vues ---------- */
  function setViewState(name, silent) {
    var v = VIEWS[name]; if (!v || !W) return; st.view = name;
    $$('.fx-views button').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.view === name); });
    W.setMode(v.mode || 'normal'); W.setClip(v.clip != null ? v.clip : null);
    st.explode = !!v.explode; W.setExplode(st.explode); syncTool('explode', st.explode);
    W.planGroup.visible = !!v.plans;
    if (v.flows) { W.setFlowsVisible(true); st.flows = true; syncTool('flow', true); }
    if (name === 'general' || name === 'aerienne' || name === 'flux') refit();
    if (!silent) { var pp = v.p, tg = v.t; if (W.aspect < 1.2 && name !== 'immersive' && name !== 'general' && name !== 'aerienne' && name !== 'flux') { var f = 1.45; pp = [tg[0] + (pp[0] - tg[0]) * f, tg[1] + (pp[1] - tg[1]) * f, tg[2] + (pp[2] - tg[2]) * f]; } W.flyTo(pp, tg, 2.0); }
    var live = $('#fxLive'); if (live && !silent) live.textContent = v.n;
    updateLabels();
  }
  $$('.fx-views button').forEach(function (b) { b.addEventListener('click', function () { setViewState(b.dataset.view); if (b.dataset.view !== 'general') { st.step = st.step; } else { select(0, 'keep'); } }); });

  var vWrap = $('.fx-views-wrap'), vScr = $('.fx-views'), vNext = $('.fx-views-next');
  function vUpd() { if (!vScr) return; var max = vScr.scrollWidth - vScr.clientWidth; vWrap.classList.toggle('has-more', max > 2 && vScr.scrollLeft < max - 2); vWrap.classList.toggle('has-less', vScr.scrollLeft > 2); }
  if (vScr) {
    vScr.addEventListener('scroll', vUpd, { passive: true }); window.addEventListener('resize', vUpd); setTimeout(vUpd, 50);
    if (vNext) vNext.addEventListener('click', function () { vScr.scrollBy({ left: Math.max(120, vScr.clientWidth * 0.6), behavior: reduce ? 'auto' : 'smooth' }); });
    $$('.fx-views button').forEach(function (b) { b.addEventListener('click', function () { var l = b.offsetLeft - 24; if (vScr.scrollWidth > vScr.clientWidth + 2) vScr.scrollTo({ left: Math.max(0, l), behavior: reduce ? 'auto' : 'smooth' }); }); });
    if (!reduce) setTimeout(function () { if (vScr.scrollWidth > vScr.clientWidth + 8 && vScr.scrollLeft < 2) { vScr.scrollTo({ left: 70, behavior: 'smooth' }); setTimeout(function () { vScr.scrollTo({ left: 0, behavior: 'smooth' }); }, 900); } }, 1500);
  }

  /* ---------- outils (existants) ---------- */
  function syncTool(t, on) { var b = $('.fx-tools [data-tool="' + t + '"]'); if (b) b.setAttribute('aria-pressed', on); }
  $$('.fx-tools button').forEach(function (b) {
    b.addEventListener('click', function () {
      if (!W) return; var t = b.dataset.tool;
      if (t === 'reset') { W.flyTo(CAMS[0].p, CAMS[0].t, 1.6); W.controls.reset && 0; return; }
      var on = b.getAttribute('aria-pressed') !== 'true'; b.setAttribute('aria-pressed', on);
      if (t === 'flow') { st.flows = on; W.setFlowsVisible(on); }
      else if (t === 'isolate') { st.iso = on; applyIso(); }
      else if (t === 'explode') { st.explode = on; W.setExplode(on); }
      else if (t === 'labels') { st.labels = on; updateLabels(); }
      else if (t === 'pause') { st.paused = on; W.setPaused(on); b.textContent = on ? 'Reprendre' : 'Pause'; }
    });
  });
  $$('.fx-zoom button').forEach(function (b) {
    b.addEventListener('click', function () {
      if (!W) return; var k = +b.dataset.z, c = W.camera, tg = W.controls.target, v = c.position.clone().sub(tg), d = v.length(), nd = Math.min(75, Math.max(2, d * (k > 0 ? 0.78 : 1.28)));
      W.flyTo(tg.clone().add(v.setLength(nd)).toArray(), tg.toArray(), 0.5);
    });
  });

  /* ---------- étiquettes DOM : anti-collision, maintien dans le cadre, traits de rappel ---------- */
  var labW = $('#fxLabels'), labEls = [], agEls = [], lead = null, NS = 'http://www.w3.org/2000/svg';
  function mkLabel(o) { var b = document.createElement('button'); b.type = 'button'; b.className = 'fx-lab'; b.innerHTML = '<b>' + o.n + '</b><span class="fx-lt">' + esc(o.t) + '</span>'; b.setAttribute('aria-label', 'Étape ' + o.n + ' : ' + o.t); b.addEventListener('click', function () { select(o.step, true); if (o.eq) openPanel(o.eq); }); labW.appendChild(b); return b; }
  function mkLead() { var g = document.createElementNS(NS, 'g'), l = document.createElementNS(NS, 'line'), c = document.createElementNS(NS, 'circle'); c.setAttribute('r', '2.6'); g.appendChild(l); g.appendChild(c); lead.appendChild(g); return { g: g, l: l, c: c }; }
  if (W) {
    lead = document.createElementNS(NS, 'svg'); lead.setAttribute('class', 'fx-lead'); lead.setAttribute('aria-hidden', 'true'); labW.appendChild(lead);
    LABELS.forEach(function (o) { var e = mkLabel(o); labEls.push({ o: o, el: e, ld: mkLead(), w: 0, h: 0, key: '' }); });
    (W.agents || []).forEach(function (a) { var s = document.createElement('span'); s.className = 'fx-lab fx-ag'; s.textContent = a.role; labW.appendChild(s); agEls.push({ a: a, el: s, ld: mkLead(), w: 0, h: 0, key: '' }); });
  }
  function updateLabels() {
    labEls.forEach(function (l) { l.on = st.labels && (st.view !== 'immersive'); l.act = st.step === l.o.step; l.el.classList.toggle('on', l.act); l.el.classList.toggle('dim', st.step !== 0 && !l.act); l.key = ''; });
  }
  var frameN = 0, resv = [], srect = null, pinsOn = null;
  function relRect(el) { var r = el.getBoundingClientRect(); return { l: r.left - srect.left, t: r.top - srect.top, r: r.right - srect.left, b: r.bottom - srect.top }; }
  function hit(a, b) { return a.l < b.r + 2 && b.l < a.r + 2 && a.t < b.b + 2 && b.t < a.b + 2; }
  function hideL(l) { l.el.style.opacity = '0'; l.el.style.pointerEvents = 'none'; l.ld.g.style.display = 'none'; }
  if (W) W.tickers.push(function () {
    var w = stage.clientWidth, h = stage.clientHeight; if (!w || !h) return;
    var pins = w < 640; if (pins !== pinsOn) { pinsOn = pins; labW.classList.toggle('pins', pins); labEls.forEach(function (l) { l.key = ''; }); }
    if (frameN % 30 === 29) { labEls.forEach(function (l) { l.key = ''; }); agEls.forEach(function (l) { l.key = ''; }); }   // remesure (chargement tardif des polices)
    if (frameN++ % 12 === 0 || !srect) {
      srect = stage.getBoundingClientRect(); resv = [];
      ['.fx-views-wrap', '.fx-zoom', '.fx-hint', '.fx-dock', '.fx-panel:not([hidden])'].forEach(function (s) { var e = $(s); if (e && e.offsetParent !== null) resv.push(relRect(e)); });
    }
    var items = [];
    labEls.forEach(function (l) {
      var v = W.project(l.o.p[0], l.o.p[1], l.o.p[2]), ax = (v.x * 0.5 + 0.5) * w, ay = (-v.y * 0.5 + 0.5) * h, inside = ax >= 0 && ax <= w && ay >= 0 && ay <= h;
      if (l.on && v.z < 1 && (inside || l.act)) items.push({ l: l, ax: Math.min(w - 4, Math.max(4, ax)), ay: Math.min(h - 4, Math.max(4, ay)), pr: l.act ? 0 : 2 + Math.abs(l.o.step - st.step) * 0.01 }); else hideL(l);
    });
    agEls.forEach(function (l) {
      var on = st.labels && l.a.steps.indexOf(st.step) >= 0 && st.view !== 'immersive' && w >= 480, a = W.agentAnchor(l.a), v = W.project(a[0], a[1], a[2]), ax = (v.x * 0.5 + 0.5) * w, ay = (-v.y * 0.5 + 0.5) * h;
      if (on && v.z < 1 && ax >= 0 && ax <= w && ay >= 0 && ay <= h) items.push({ l: l, ax: ax, ay: ay, pr: 1, ag: true }); else hideL(l);
    });
    items.sort(function (p, q) { return p.pr - q.pr; });
    var placed = resv.slice();
    items.forEach(function (it) {
      var l = it.l, key = (pinsOn ? 'p' : 'f') + (l.el.classList.contains('on') ? '1' : '0');
      if (l.key !== key || !l.w) { l.key = key; l.w = l.el.offsetWidth; l.h = l.el.offsetHeight; }
      var bw = l.w, bh = l.h, g = 3, bx = it.ax - bw / 2, up = it.ay - bh - 18, dn = it.ay + 16, c = [], k, sg;
      for (k = 0; k < 8; k++) c.push([bx, up - k * (bh + g)]);
      for (k = 0; k < 6; k++) c.push([bx, dn + k * (bh + g)]);
      [1, -1].forEach(function (s) { for (k = 1; k < 4; k++) { c.push([bx + s * k * bw * 0.55, up]); c.push([bx + s * k * bw * 0.55, up - bh - g]); c.push([bx + s * k * bw * 0.55, dn]); } });
      var pos = null, i;
      for (i = 0; i < c.length; i++) {
        var x = Math.min(w - bw - 4, Math.max(4, c[i][0])), y = Math.min(h - bh - 4, Math.max(4, c[i][1])), r = { l: x, t: y, r: x + bw, b: y + bh }, free = true;
        for (var j = 0; j < placed.length; j++) if (hit(r, placed[j])) { free = false; break; }
        if (free) { pos = r; break; }
      }
      if (!pos && it.pr === 0) { var x0 = Math.min(w - bw - 4, Math.max(4, bx)), y0 = Math.min(h - bh - 4, Math.max(4, up)); pos = { l: x0, t: y0, r: x0 + bw, b: y0 + bh }; }
      if (!pos) { hideL(l); return; }
      placed.push(pos);
      l.el.style.opacity = ''; l.el.style.pointerEvents = it.ag ? 'none' : ''; l.el.style.transform = 'translate(' + Math.round(pos.l) + 'px,' + Math.round(pos.t) + 'px)';
      var px = Math.min(pos.r - 4, Math.max(pos.l + 4, it.ax)), py = it.ay > (pos.t + pos.b) / 2 ? pos.b : pos.t;
      l.ld.g.style.display = ''; l.ld.l.setAttribute('x1', px.toFixed(1)); l.ld.l.setAttribute('y1', py.toFixed(1)); l.ld.l.setAttribute('x2', it.ax.toFixed(1)); l.ld.l.setAttribute('y2', it.ay.toFixed(1)); l.ld.c.setAttribute('cx', it.ax.toFixed(1)); l.ld.c.setAttribute('cy', it.ay.toFixed(1));
      l.ld.g.setAttribute('class', (l.act || it.ag) ? 'act' : '');
    });
  });

  /* ---------- panneau d'équipement ---------- */
  var panel = $('#fxPanel'), lastFocus = null;
  function dimTxt(code) { var d = (D.dims || {})[code]; if (!d) return ''; var a = Math.max(d[0], d[1]), b = Math.min(d[0], d[1]); return fm(a) + ' × ' + fm(b) + ' m'; }
  function openPanel(id, noFocus) {
    var e = EQ[id]; if (!e || !panel) return; lastFocus = document.activeElement;
    var h = '<div class="fx-p-top"><span class="fx-k">' + (e.third ? 'Équipement tiers · représentation de principe' : (e.sopa === false ? 'Aménagement de principe' : 'Solution Sopacom')) + '</span><button type="button" class="fx-x" aria-label="Fermer le panneau">×</button></div>';
    h += '<h2 class="fx-h" id="fxPT">' + esc(e.name) + '</h2>';
    if (e.fn) h += '<h3>Fonction</h3><p>' + esc(e.fn) + '</p>';
    if (e.usage) h += '<h3>Utilisation dans l’installation</h3><p>' + esc(e.usage) + '</p>';
    if (e.tech && e.tech.length) h += '<h3>Explication technique</h3><ul>' + e.tech.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>';
    if (e.cao && e.cao.length) {
      h += '<h3>Bibliothèque CAO exploitée</h3><div class="fx-cao">' + e.cao.map(function (c) { var dm = dimTxt(c.code); return '<a class="fx-cao-i" href="bibliotheque-technique.html#' + esc(c.code) + '"><span class="fx-cao-img"><img src="assets/img/cao-hd/' + esc(c.code) + '.svg" alt="Plan du bloc ' + esc(c.code) + '" loading="lazy"></span><span><b>' + esc(c.code) + '</b>' + esc(c.label || '') + (dm ? '<em>Emprise du bloc DWG : ' + dm + '</em>' : '') + '</span></a>'; }).join('') + '</div>';
    }
    if (e.note) h += '<p class="fx-note">' + esc(e.note) + '</p>';
    var lk = []; if (e.link) lk.push('<a class="btn solid" href="' + esc(e.link[1]) + '">' + esc(e.link[0]) + ' <span class="arr">→</span></a>'); if (e.cao && e.cao.length) lk.push('<a class="btn" href="bibliotheque-technique.html?g=' + encodeURIComponent(e.lib || '') + '">Bibliothèque technique <span class="arr">→</span></a>');
    if (lk.length) h += '<div class="btns">' + lk.join('') + '</div>';
    panel.innerHTML = h; panel.hidden = false; root.classList.add('fx-panel-open'); panel.scrollTop = 0;
    if (W) W.userActed = true;
    if (!noFocus) { var x = $('.fx-x', panel); if (x) x.focus({ preventScroll: true }); }
  }
  function closePanel() { if (!panel || panel.hidden) return; panel.hidden = true; root.classList.remove('fx-panel-open'); if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true }); }
  if (panel) { panel.addEventListener('click', function (e) { if (e.target.closest('.fx-x')) closePanel(); }); }
  root.addEventListener('keydown', function (e) { if (e.key === 'Escape') closePanel(); });

  /* clic sur un équipement dans la scène */
  var down = null;
  stage.addEventListener('pointerdown', function (e) { down = { x: e.clientX, y: e.clientY, t: performance.now() }; });
  stage.addEventListener('pointerup', function (e) {
    if (!W || !down || e.target.closest('button, a, .fx-panel, .fx-sim, .fx-views')) { down = null; return; }
    var moved = Math.hypot(e.clientX - down.x, e.clientY - down.y), dt = performance.now() - down.t; down = null;
    if (moved > 6 || dt > 600) return;
    var it = W.pick(e.clientX, e.clientY); if (!it) return; var map = { depose: 'technicord' }, id = map[it] || it;
    if (EQ[id]) { openPanel(id, true); var s = (STEPS.filter(function (s) { return s.equip && s.equip.indexOf(id) >= 0; })[0]); }
  });

  /* ---------- simulation ---------- */
  var simBtn = $('#fxSimStart'), playBtn = $('#fxSimPlay'), resetBtn = $('#fxSimReset'), prog = $('#fxSimProg'), cap = $('#fxSimCap'), timeEl = $('#fxSimTime'), speedBtns = $$('.fx-speed button');
  function captionFor(t) {
    var I = W.simInfo; if (!I) return '';
    var r0 = I.rackTimes[0], r1 = I.rackTimes[1], first = 3, d0 = I.drops[0], rc0 = I.recep[0], de0 = I.deb[0], pr0 = I.tPrepArr[0];
    var list = [[0, '1 · Les convives prennent leur repas.'], [first, '2 · Certains terminent leur déjeuner et se lèvent.'], [d0 - 1, '3 · Les plateaux sont déposés sur le convoyeur Technicord.'], [rc0, '4 · Les agents réceptionnent les plateaux.'], [de0 + 0.5, '5 · Les déchets sont séparés de la vaisselle (circuit distinct).'], [pr0, '6 · Les casiers sont préparés à la table.'], [r0.ready, '7 · Le convoyeur Transflex achemine le casier.'], [r0.entry - 1, '8 · La zone de lavage est alimentée.'], [r0.exit - 1, '9 · Les équipements propres sont récupérés (séchage Transroll).'], [r0.end + 0.5, '10 · Stockage (Technilift) puis retour à disposition pour un nouveau service.']];
    var out = list[0][1]; list.forEach(function (x) { if (t >= x[0]) out = x[1]; }); if (t >= r1.put[0] - 4) out = '10 · Les équipements propres rejoignent la ligne de dressage pour le service suivant.'; return out;
  }
  function fmtT(s) { s = Math.round(s); return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2); }
  function simUI(s) {
    if (!W) return;
    simBtn.hidden = s.started; playBtn.hidden = !s.started; resetBtn.hidden = !s.started;
    playBtn.setAttribute('aria-pressed', s.playing); playBtn.textContent = s.done ? 'Rejouer' : (s.playing ? 'Pause' : 'Reprendre');
    prog.max = Math.round(s.dur); if (document.activeElement !== prog) prog.value = Math.round(s.t); prog.style.setProperty('--p', (s.t / s.dur * 100) + '%');
    timeEl.textContent = fmtT(s.t) + ' / ' + fmtT(s.dur); cap.textContent = s.started ? captionFor(s.t) : 'Simulation pédagogique d’un service du midi — non contractuelle.';
    speedBtns.forEach(function (b) { b.setAttribute('aria-pressed', +b.dataset.v === s.speed); });
    root.classList.toggle('fx-sim-on', s.started);
  }
  if (W) {
    W.sim.onChange = simUI; simUI({ t: 0, dur: W.sim.dur, playing: false, speed: 1, started: false, done: false });
    simBtn.addEventListener('click', function () {
      if (st.view !== 'general' && st.view !== 'aerienne' && st.view !== 'flux') setViewState('general');
      if (!W.userActed || W.camera.position.length() < 20) { var c = CAMS[0]; W.flyTo(c.p, c.t, 2.2); }
      W.sim.start();
    });
    playBtn.addEventListener('click', function () { W.sim.toggle(); });
    resetBtn.addEventListener('click', function () { W.sim.reset(); });
    prog.addEventListener('input', function () { var v = +prog.value; W.sim.pause(); W.sim.seek(v); });
    speedBtns.forEach(function (b) { b.addEventListener('click', function () { W.sim.setSpeed(+b.dataset.v); }); });
    if (reduce) { $('#fxSimNote').hidden = false; }
  }

  /* ---------- clavier : navigation dans la liste d'étapes ---------- */
  $('#fxSteps').addEventListener('keydown', function (e) {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return; e.preventDefault();
    var cb = e.target.closest('button'), base = cb ? +cb.dataset.step : st.step, n = Math.max(0, Math.min(STEPS.length - 1, base + (e.key === 'ArrowDown' ? 1 : -1))); select(n, true); stepBtns[n].focus();
  });
  stage.addEventListener('keydown', function (e) {
    if (!W) return; var k = e.key;
    if (k === ' ') { e.preventDefault(); W.sim.started ? W.sim.toggle() : simBtn.click(); }
    else if (k === '+' || k === '=') $('.fx-zoom [data-z="1"]').click(); else if (k === '-') $('.fx-zoom [data-z="-1"]').click();
    else if (k === '0') $('.fx-tools [data-tool="reset"]').click();
  });

  /* ---------- démarrage ---------- */
  function parseHash() {
    var m = /^#etape-(\d{1,2})$/.exec(location.hash); if (!m) return null; var n = +m[1];
    if (m[1].length === 1) { var legacy = { 1: 2, 2: 3, 3: 6, 4: 7, 5: 8 }; return legacy[n] != null ? legacy[n] : (n <= 9 ? n : 0); }   // anciens liens (explorateur à 5 étapes)
    return n <= STEPS.length - 1 ? n : 0;
  }
  setInfo(0); updateLabels();
  if (W) {
    refit(); W.camera.position.set.apply(W.camera.position, CAMS[0].p); W.controls.target.set.apply(W.controls.target, CAMS[0].t); W.controls.update();
    W.start(); var ld = $('#fxLoading'); if (ld) ld.remove();
    var h0 = parseHash(); if (h0 != null && h0 > 0) setTimeout(function () { select(h0, true); }, 500);
    var rsT = 0, rs = function () {
      W.aspect = stage.clientWidth / Math.max(1, stage.clientHeight); setHH(); srect = null; labEls.forEach(function (l) { l.key = ''; });
      clearTimeout(rsT); rsT = setTimeout(function () { refit(); if (st.view === 'general' && st.step === 0 && !W.userActed) { W.camera.position.fromArray(CAMS[0].p); W.controls.target.fromArray(CAMS[0].t); W.controls.update(); } vUpd(); }, 150);
    }; window.addEventListener('resize', rs); if (window.ResizeObserver) new ResizeObserver(rs).observe(stage);
    window.SOPA_FX_WORLD = W; W.CAMS = CAMS; W.VIEWS = VIEWS;   // utile pour les tests
  } else {
    var h1 = parseHash(); if (h1 != null) setInfo(h1);
    stepBtns.forEach(function (b) { b.addEventListener('click', function () { setInfo(+b.dataset.step); }); });
    var ld2 = $('#fxLoading'); if (ld2) ld2.remove();
  }
  window.addEventListener('hashchange', function () { var h = parseHash(); if (h != null && W) select(h, true); });
})();
