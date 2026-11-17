/* SOPACOM — Page « Comprendre le fonctionnement » : convives, agents, plateaux, casiers et simulation d'un service.
   Démonstration pédagogique : les durées et vitesses sont des vitesses d'animation, pas des cadences ni des performances.
   Toute la simulation est une fonction du temps (reprise, pause, réinitialisation et vitesse sans dérive). */
(function () {
  'use strict';
  var T = window.THREE; if (!T || !window.SF) return;
  var SF = window.SF, PI = Math.PI;

  SF.attachActors = function (W) {
    var scene = W.scene, M = W.M, low = W.low, B = W.B, Y = W.Y_TC;
    var anim = { t: 0 };
    var sim = W.sim = { t: 0, dur: 100, playing: false, speed: 1, started: false, done: false, onChange: null };

    /* ---------- aléatoire reproductible ---------- */
    var seedv = 20240611; function rnd() { seedv |= 0; seedv = seedv + 0x6D2B79F5 | 0; var t = Math.imul(seedv ^ seedv >>> 15, 1 | seedv); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }
    function pick(a) { return a[Math.floor(rnd() * a.length)]; }
    function lerp(a, b, u) { return a + (b - a) * u; }
    function sstep(u) { u = Math.min(1, Math.max(0, u)); return u * u * (3 - 2 * u); }
    function angd(a, b) { var d = (b - a) % (2 * PI); if (d > PI) d -= 2 * PI; if (d < -PI) d += 2 * PI; return d; }

    /* ---------- matériaux de personnages ---------- */
    var mc = {};
    function pm(c, r) { var k = c + '_' + (r || 0); return mc[k] || (mc[k] = new T.MeshStandardMaterial({ color: c, roughness: r || 0.85, metalness: 0, envMapIntensity: 0.25 })); }
    var SKIN = [0xf0c8a0, 0xdcae82, 0xb98458, 0x8d5d3c], HAIR = [0x1c1612, 0x3b2a1e, 0x6b4a2b, 0xb9a27a, 0x8f8f8f], SHIRT = [0x5b7fa6, 0x8a5a5a, 0x4f7a64, 0xc9a14a, 0x6b6f9c, 0xa6a29a, 0x3f4a5e, 0xb5654a, 0x7a8f6a], PANTS = [0x2b2d33, 0x3b4a63, 0x5a4a3a, 0x45484f, 0x6b6558];
    var G = {
      torso: new T.BoxGeometry(0.36, 0.52, 0.2), head: new T.SphereGeometry(0.105, 12, 10), hair: new T.SphereGeometry(0.112, 10, 8),
      up: new T.CylinderGeometry(0.042, 0.048, 0.3, 8).translate(0, -0.15, 0), fo: new T.CylinderGeometry(0.036, 0.04, 0.28, 8).translate(0, -0.14, 0), hand: new T.SphereGeometry(0.04, 8, 6),
      th: new T.CylinderGeometry(0.062, 0.07, 0.44, 8).translate(0, -0.22, 0), sh: new T.CylinderGeometry(0.045, 0.055, 0.44, 8).translate(0, -0.22, 0), foot: new T.BoxGeometry(0.09, 0.06, 0.22).translate(0, -0.03, 0.05),
      apron: new T.BoxGeometry(0.33, 0.4, 0.012), cap: new T.CylinderGeometry(0.113, 0.118, 0.07, 12), toque: new T.CylinderGeometry(0.1, 0.12, 0.1, 12)
    };
    var persons = [];
    function makePerson(o) {
      var root = new T.Group(), hips = new T.Group(), up = new T.Group(), head = new T.Group(), owner = { steps: o.steps || null };
      hips.position.y = 0.94; root.add(hips); hips.add(up); up.add(head); head.position.set(0, 0.57, 0);
      function mesh(geo, mat, parent, x, y, z, sh) { var m = new T.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = !low && !!sh; parent.add(m); W.reg(m, 'people', owner); return m; }
      var shirt = pm(o.shirt), skin = pm(o.skin, 0.7), pants = pm(o.pants);
      mesh(G.torso, shirt, up, 0, 0.26, 0, true); mesh(G.head, skin, head, 0, 0.115, 0, true);
      var hr = mesh(G.hair, pm(o.hair), head, 0, 0.145, -0.012); hr.scale.set(1, 0.72, 1.02);
      if (o.agent) { mesh(G.apron, pm(0xf4f3ee), up, 0, 0.24, 0.106); var cp = mesh(G.cap, pm(0xf4f3ee), head, 0, 0.2, 0); cp.scale.set(1, 0.9, 1); mesh(G.toque, pm(0xf4f3ee), head, 0, 0.26, 0); if (o.hat === 'cap') cp.scale.set(1, 0.9, 1); }
      var P = { root: root, hips: hips, up: up, head: head, seed: rnd() * 6.28, o: o, arm: [], leg: [], vis: true, steps: o.steps };
      [-1, 1].forEach(function (s, i) {
        var sh = new T.Group(); sh.position.set(s * 0.215, 0.49, 0); up.add(sh); mesh(G.up, o.agent ? pm(o.shirt) : shirt, sh, 0, 0, 0);
        var el = new T.Group(); el.position.y = -0.3; sh.add(el); mesh(G.fo, skin, el, 0, 0, 0); 
        P.arm.push({ sh: sh, el: el });
        var hp = new T.Group(); hp.position.set(s * 0.09, 0, 0); hips.add(hp); mesh(G.th, pants, hp, 0, 0, 0, true);
        var kn = new T.Group(); kn.position.y = -0.44; hp.add(kn); mesh(G.sh, pants, kn, 0, 0, 0); mesh(G.foot, pm(0x1b1c1f), kn, 0, -0.44, 0);
        P.leg.push({ hp: hp, kn: kn });
      });
      var s = o.h || 1; root.scale.set(s, s, s); scene.add(root); persons.push(P); return P;
    }

    /* ---------- poses ---------- */
    function set(P, hipY, lean, th, kn, sh, el, hd, hy) {
      P.hips.position.y = hipY; P.up.rotation.x = lean;
      P.leg[0].hp.rotation.x = th[0]; P.leg[1].hp.rotation.x = th[1]; P.leg[0].kn.rotation.x = kn[0]; P.leg[1].kn.rotation.x = kn[1];
      P.arm[0].sh.rotation.x = sh[0]; P.arm[1].sh.rotation.x = sh[1]; P.arm[0].el.rotation.x = el[0]; P.arm[1].el.rotation.x = el[1];
      P.head.rotation.x = hd || 0; P.head.rotation.y = hy || 0;
    }
    var SIT_TH = [-PI / 2, -PI / 2], SIT_KN = [PI / 2, PI / 2], ZERO = [0, 0];
    function pose(P, name, s, u) {
      var sd = P.seed, t = anim.t, ph = s * 4.5;
      switch (name) {
        case 'sit': {                                        // repas : manger, boire, discuter (cycle propre à chaque convive)
          var c = (t + sd * 3) % 14, eat = c < 8, drink = c >= 8 && c < 10.5, e = 0.5 + 0.5 * Math.sin(t * 2.3 + sd);
          var sh = [-0.38, -0.38], el = [-1.25, -1.25], lean = 0.08, hd = 0.08, hy = 0;
          if (eat) { sh[1] = -0.45 - 0.2 * e; el[1] = -1.2 - 1.15 * e; lean = 0.1 + 0.08 * e; hd = 0.1 + 0.1 * e; el[0] = -1.25 - 0.15 * Math.sin(t * 1.1 + sd); }
          else if (drink) { var d = sstep((c - 8) / 0.7) * (1 - sstep((c - 9.8) / 0.7)); sh[1] = -0.38 - 0.35 * d; el[1] = -1.25 - 1.3 * d; hd = 0.08 - 0.3 * d; }
          else { hy = Math.sin(t * 0.7 + sd) * 0.5; sh[0] = -0.45 - 0.2 * Math.max(0, Math.sin(t * 1.6 + sd)); el[0] = -1.25 - 0.5 * Math.max(0, Math.sin(t * 1.6 + sd)); }
          set(P, 0.52, lean, SIT_TH, SIT_KN, sh, el, hd, hy); break; }
        case 'rise': { var e2 = sstep(u); set(P, lerp(0.52, 0.94, e2), 0.5 * Math.sin(PI * e2), [-PI / 2 * (1 - e2), -PI / 2 * (1 - e2)], [PI / 2 * (1 - e2), PI / 2 * (1 - e2)], [lerp(-0.38, 0.04, e2), lerp(-0.38, 0.04, e2)], [lerp(-1.25, -0.15, e2), lerp(-1.25, -0.15, e2)], 0, 0); break; }
        case 'walk': case 'carry': case 'push': {
          var A = 0.5, sw = Math.sin(ph), kn0 = 0.45 * Math.max(0, Math.cos(ph)), kn1 = 0.45 * Math.max(0, -Math.cos(ph));
          var sh2 = name === 'walk' ? [0.5 * sw, -0.5 * sw] : (name === 'carry' ? [-0.7, -0.7] : [-1.15, -1.15]), el2 = name === 'walk' ? [-0.25, -0.25] : (name === 'carry' ? [-0.95, -0.95] : [-0.3, -0.3]);
          set(P, 0.94 - 0.015 * Math.abs(Math.cos(ph)), name === 'push' ? 0.12 : 0.03, [-A * sw, A * sw], [kn0, kn1], sh2, el2, 0, 0); break; }
        case 'place': set(P, 0.94, 0.28, ZERO, ZERO, [-1.15, -1.15], [-0.25, -0.25], 0.1, 0); break;
        case 'carrystand': set(P, 0.94, 0.03, ZERO, ZERO, [-0.7, -0.7], [-0.95, -0.95], 0, 0); break;
        case 'work': {                                       // agent : manipule plateaux, casiers, déchets
          var w = Math.sin(t * 3.0 + sd), w2 = Math.sin(t * 3.0 + sd + 2.2);
          set(P, 0.94, 0.2 + 0.05 * w, ZERO, ZERO, [-0.95 + 0.35 * w, -0.9 + 0.35 * w2], [-0.75 + 0.3 * w2, -0.8 + 0.3 * w], 0.15, 0.15 * w); break; }
        default: { var b = Math.sin(t * 1.3 + sd);                // idle / surveillance
          set(P, 0.94, 0.02 + 0.012 * b, ZERO, ZERO, [0.06, 0.06 + 0.04 * b], [-0.2, -0.25], 0, 0.25 * Math.sin(t * 0.35 + sd)); }
      }
    }

    /* ---------- trajectoires par images clés ---------- */
    function PB(P, x, z, ry, pose0) { this.P = P; this.k = [{ t: 0, x: x, z: z, ry: ry, pose: pose0, s: 0, vis: 1 }]; }
    PB.prototype.last = function () { return this.k[this.k.length - 1]; };
    PB.prototype.seg = function (dt, x, z, ry, pose, dist, vis) { var l = this.last(); l.pose = pose; this.k.push({ t: l.t + Math.max(0.0001, dt), x: x, z: z, ry: ry, pose: pose, s: l.s + (dist || 0), vis: vis == null ? l.vis : vis }); return this; };
    PB.prototype.hold = function (dt, pose) { var l = this.last(); return this.seg(dt, l.x, l.z, l.ry, pose || l.pose); };
    PB.prototype.until = function (t, pose) { var l = this.last(); if (t > l.t) this.hold(t - l.t, pose); return this; };
    PB.prototype.turn = function (ry, pose) { var l = this.last(); if (Math.abs(angd(l.ry, ry)) > 0.05) this.seg(0.3 + 0.2 * Math.abs(angd(l.ry, ry)) / PI, l.x, l.z, l.ry + angd(l.ry, ry), pose); return this; };
    PB.prototype.walk = function (x, z, v, pose) { var l = this.last(), dx = x - l.x, dz = z - l.z, d = Math.hypot(dx, dz); if (d < 1e-4) return this; var h = Math.atan2(dx, dz); this.turn(h, pose === 'carry' ? 'carrystand' : 'idle'); l = this.last(); return this.seg(d / v, x, z, l.ry, pose || 'walk', d); };
    PB.prototype.face = function (ry, pose) { return this.turn(ry, pose || 'idle'); };
    PB.prototype.sample = function (t) {
      var k = this.k, n = k.length; if (t <= k[0].t) return { x: k[0].x, z: k[0].z, ry: k[0].ry, pose: k[0].pose, s: k[0].s, u: 0, vis: k[0].vis };
      if (t >= k[n - 1].t) { var q = k[n - 1]; return { x: q.x, z: q.z, ry: q.ry, pose: q.pose, s: q.s, u: 1, vis: q.vis }; }
      var i = 0; while (i < n - 2 && t >= k[i + 1].t) i++; var a = k[i], b = k[i + 1], u = (t - a.t) / (b.t - a.t);
      return { x: lerp(a.x, b.x, u), z: lerp(a.z, b.z, u), ry: a.ry + (b.ry - a.ry) * u, pose: a.pose, s: lerp(a.s, b.s, u), u: u, vis: a.vis };
    };
    var pbs = [];
    function newPB(P, x, z, ry, pose0) { var b = new PB(P, x, z, ry, pose0); pbs.push(b); return b; }

    /* ---------- vaisselle : plateau, pièces, casiers ---------- */
    var geo = {
      tray: new T.BoxGeometry(0.45, 0.02, 0.33), plate: new T.CylinderGeometry(0.105, 0.09, 0.014, 14), food: new T.SphereGeometry(0.06, 8, 6), glass: new T.CylinderGeometry(0.032, 0.026, 0.09, 10),
      liq: new T.CylinderGeometry(0.026, 0.023, 0.05, 8), cut: new T.BoxGeometry(0.17, 0.006, 0.02), nap: new T.BoxGeometry(0.11, 0.004, 0.09), pot: new T.CylinderGeometry(0.034, 0.03, 0.05, 10)
    };
    function gm(g, mat, owner, dyn) { var m = new T.Mesh(g, mat); m.castShadow = false; scene.add(m); W.reg(m, 'goods', owner || null); m.userData.dyn = dyn !== false; if (dyn === false) m.matrixAutoUpdate = false; return m; }
    function Tray(seat, full) {
      this.base = gm(geo.tray, M.tray); this.base.castShadow = !low;
      var o = [['plate', geo.plate, M.plate, -0.1, 0.017, 0], ['food', geo.food, M.food, -0.1, 0.034, 0, [1, 0.35, 1]], ['glass', geo.glass, M.glass, 0.13, 0.055, -0.08], ['liq', geo.liq, M.liquid, 0.13, 0.04, -0.08], ['cut', geo.cut, M.cutlery, 0.05, 0.013, 0.12], ['nap', geo.nap, M.napkin, 0.14, 0.012, 0.09]];
      if (full) o.push(['pot', geo.pot, M.pot, 0.04, 0.035, -0.1]);
      this.parts = {}; var me = this;
      o.forEach(function (d) { var m = gm(d[1], d[2]); if (d[6]) m.scale.set(d[6][0], d[6][1], d[6][2]); me.parts[d[0]] = { m: m, off: [d[3], d[4], d[5]], fl: null, vis: 1 }; });
      this.segs = []; this.rest = null;
    }
    Tray.prototype.seg = function (t0, t1, fn) { this.segs.push({ t0: t0, t1: t1, fn: fn }); return this; };
    Tray.prototype.pos = function (t) {
      var s = this.segs; if (!s.length) return this.rest;
      if (t <= s[0].t0) return s[0].fn(s[0].t0);
      for (var i = 0; i < s.length; i++) { if (t < s[i].t1 || i === s.length - 1) return s[i].fn(Math.min(Math.max(t, s[i].t0), s[i].t1 === Infinity ? t : s[i].t1)); }
    };
    var Ry = new T.Vector3();
    function offW(p, off) { var c = Math.cos(p[3]), sn = Math.sin(p[3]); return [p[0] + off[0] * c + off[2] * sn, p[1] + off[1], p[2] - off[0] * sn + off[2] * c]; }
    Tray.prototype.update = function (t) {
      var p = this.pos(t), b = this.base; b.position.set(p[0], p[1], p[2]); b.rotation.y = p[3];
      for (var k in this.parts) {
        var pt = this.parts[k], w = offW(p, pt.off), m = pt.m, rotY = p[3];
        if (pt.fl) {
          var f = pt.fl;
          if (t >= f.t1) { var e = f.target(t); w = e; rotY = f.ry == null ? p[3] : f.ry; }
          else if (t > f.t0) { var p0 = this.pos(f.t0), a = offW(p0, pt.off), e2 = f.target(t), u = sstep((t - f.t0) / (f.t1 - f.t0)); w = [lerp(a[0], e2[0], u), lerp(a[1], e2[1], u) + f.arc * Math.sin(PI * u), lerp(a[2], e2[2], u)]; }
        }
        m.position.set(w[0], w[1], w[2]); m.rotation.y = rotY;
      }
    };
    Tray.prototype.setVisible = function (v) { this.base.visible = v; for (var k in this.parts) this.parts[k].m.visible = v; };
    var trays = [];

    function Rack(owner) {
      var g = new T.Group(); scene.add(g); this.g = g; this.segs = []; this.owner = owner;
      function b(w, h, d, x, y, z, mat) { var m = new T.Mesh(new T.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = !low; g.add(m); W.reg(m, 'goods', null); }
      b(0.5, 0.02, 0.5, 0, -0.07, 0, M.crate); b(0.5, 0.15, 0.02, 0, 0, 0.24, M.crate); b(0.5, 0.15, 0.02, 0, 0, -0.24, M.crate); b(0.02, 0.15, 0.5, 0.24, 0, 0, M.crate); b(0.02, 0.15, 0.5, -0.24, 0, 0, M.crate);
    }
    Rack.prototype.pos = function (t) {
      var s = this.segs; if (!s.length) return [0, 0, 0, 0];
      if (t <= s[0].t0) return s[0].fn(s[0].t0);
      for (var i = 0; i < s.length; i++) { if (t < s[i].t1 || i === s.length - 1) return s[i].fn(Math.min(Math.max(t, s[i].t0), s[i].t1)); }
    };
    Rack.prototype.update = function (t) { var p = this.pos(t); this.g.position.set(p[0], p[1], p[2]); this.g.rotation.y = p[3] || 0; };
    var racks = [];

    /* ---------- bases de temps / chemins ---------- */
    var PT = W.PATH_T, LT = W.pathLen(PT), PRR = [[17.43, -0.45]].concat(W.PATH_R), LRR = W.pathLen(PRR);
    var CV = 1.35, TFV = 0.85, MV = 0.65, RV = 0.8, WALK = 1.4;
    function lin(t0, t1, a, b) { return function (t) { var u = Math.min(1, Math.max(0, (t - t0) / (t1 - t0))); return [lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u), lerp(a[3], b[3], u)]; }; }
    function arcLin(t0, t1, a, b, h) { return function (t) { var u = Math.min(1, Math.max(0, (t - t0) / (t1 - t0))); return [lerp(a[0], b[0], u), lerp(a[1], b[1], u) + h * Math.sin(PI * u), lerp(a[2], b[2], u), lerp(a[3], b[3], u)]; }; }
    function kfFn(kfs, f) { return function (t) { var n = kfs.length; if (t <= kfs[0].t) return f(kfs[0].s); if (t >= kfs[n - 1].t) return f(kfs[n - 1].s); var i = 0; while (i < n - 2 && t >= kfs[i + 1].t) i++; var u = (t - kfs[i].t) / (kfs[i + 1].t - kfs[i].t); return f(lerp(kfs[i].s, kfs[i + 1].s, u)); }; }
    function timeAtS(kfs, s) { for (var i = 1; i < kfs.length; i++) { if (kfs[i].s > kfs[i - 1].s && s >= kfs[i - 1].s - 1e-9 && s <= kfs[i].s + 1e-9) return lerp(kfs[i - 1].t, kfs[i].t, (s - kfs[i - 1].s) / (kfs[i].s - kfs[i - 1].s)); } return kfs[kfs.length - 1].t; }
    function sAtZ(path, z) { var s = 0; for (var i = 1; i < path.length; i++) { var a = path[i - 1], b = path[i], l = Math.hypot(b[0] - a[0], b[1] - a[1]); if (b[1] >= z && a[1] < z) return s + l * (z - a[1]) / (b[1] - a[1]); s += l; } return W.pathLen(path); }

    /* =====================================================================
       DISTRIBUTION DES RÔLES
       ===================================================================== */
    var S = W.seats;
    function seatI(ci, ri, k) { return (ri * 3 + ci) * 4 + k; }
    var LEAVE = [seatI(2, 0, 2), seatI(2, 0, 3), seatI(2, 1, 0), seatI(2, 1, 1), seatI(1, 0, 2), seatI(1, 0, 3), seatI(1, 1, 0), seatI(1, 1, 1)];
    var COMP = [seatI(2, 0, 0), seatI(2, 0, 1), seatI(2, 1, 2), seatI(2, 1, 3), seatI(1, 0, 0), seatI(1, 0, 1), seatI(1, 1, 2), seatI(1, 1, 3)];
    var OTHER = []; [0, 1, 2].forEach(function (ri) { for (var k = 0; k < 4; k++) OTHER.push(seatI(0, ri, k)); }); OTHER.push(seatI(1, 2, 0), seatI(1, 2, 3), seatI(2, 2, 1));
    if (low) OTHER = OTHER.slice(0, 5);
    var diners = [];
    function addDiner(si, leaver) {
      var s = S[si], P = makePerson({ skin: pick(SKIN), hair: pick(HAIR), shirt: pick(SHIRT), pants: pick(PANTS), h: 0.94 + rnd() * 0.12, steps: [1, 2] });
      P.root.position.set(s.x, 0, s.z); P.root.rotation.y = s.ry;
      var pb = newPB(P, s.x, s.z, s.ry, 'sit'); var d = { P: P, seat: s, pb: pb, leaver: leaver, tray: null };
      d.tray = new Tray(s, true); var tp = [s.x, 0.77, s.tz + s.side * 0.2, 0]; d.tray.rest = tp; d.tray.seg(0, Infinity, function () { return tp; });
      if (!leaver) { d.tray.update(0); d.tray.base.matrixAutoUpdate = false; d.tray.base.updateMatrix(); for (var k in d.tray.parts) { d.tray.parts[k].m.matrixAutoUpdate = false; d.tray.parts[k].m.updateMatrix(); } }
      diners.push(d); if (leaver) trays.push(d.tray); return d;
    }
    COMP.concat(OTHER).forEach(function (si) { addDiner(si, false); });
    var leavers = LEAVE.map(function (si) { return addDiner(si, true); });

    // agents : réception, débarrassage, tri, préparation des casiers, alimentation machine, récupération, acheminement
    var AG = [
      { id: 'A1', role: 'Réception des plateaux', x: -1.2, z: -2.5, ry: PI, steps: [2], c: 0x4f6d8c },
      { id: 'A2', role: 'Débarrassage', x: 1.4, z: -1.95, ry: PI, steps: [3], c: 0x4f6d8c },
      { id: 'A3', role: 'Tri des déchets', x: 3.4, z: -1.95, ry: PI, steps: [3], c: 0x4f6d8c },
      { id: 'A4', role: 'Préparation des casiers', x: 8.55, z: 0.35, ry: PI, steps: [4], c: 0x4f6d8c },
      { id: 'A5', role: 'Alimentation de la machine', x: 12.77, z: 0.35, ry: PI, steps: [6, 7], c: 0x4f6d8c },
      { id: 'A6', role: 'Récupération des équipements propres', x: 17.43, z: 0.35, ry: PI, steps: [8], c: 0x4f6d8c },
      { id: 'A7', role: 'Stockage et retour en salle', x: 18.85, z: 2.85, ry: PI / 2, steps: [9, 10], c: 0x4f6d8c }
    ];
    var agents = AG.map(function (a) {
      var P = makePerson({ skin: pick(SKIN), hair: pick(HAIR), shirt: 0xe9eef2, pants: 0x2f3b52, agent: true, h: 0.96 + rnd() * 0.08, steps: a.steps });
      P.root.position.set(a.x, 0, a.z); P.root.rotation.y = a.ry; a.P = P; a.pb = newPB(P, a.x, a.z, a.ry, 'idle'); a.win = []; return a;
    });
    W.agents = agents; W.persons = persons;
    function ag(id) { return agents.filter(function (a) { return a.id === id; })[0]; }

    /* =====================================================================
       SCÉNARIO : un service du midi (huit convives quittent la salle)
       ===================================================================== */
    var DROP = [-5.75, -3.4], GAPZ = -3.35, trayStart = [-5.25, Y + 0.03, -3.4];
    var stops = [{ x: -1.2, s: -1.2 + 5.0, d: 1.6, k: 'recep' }, { x: 1.43, s: 1.43 + 5.0, d: 2.6, k: 'deb' }, { x: 3.43, s: 3.43 + 5.0, d: 2.6, k: 'tri' }, { s: LT, d: 2.0, k: 'prep' }];
    var tPrepArr = [], tPrepLeave = [];
    leavers.forEach(function (d, i) {
      var s = d.seat, pb = d.pb, tFin = 3 + 4.6 * i;
      pb.until(tFin, 'sit').seg(1.2, s.x, s.z, s.ry, 'rise');
      var sx = s.x + (s.x > s.tx ? 0.62 : -0.62);
      var tPick = pb.last().t;
      pb.walk(sx, s.z, WALK, 'carry').walk(sx, GAPZ, WALK, 'carry').walk(DROP[0], GAPZ, WALK, 'carry').walk(DROP[0], DROP[1], WALK, 'carry').face(PI / 2, 'carry');
      var tArr = pb.last().t, tPlace = tArr + 0.9;
      pb.seg(0.9, DROP[0], DROP[1], PI / 2, 'place');
      // sortie : retour vers la porte de la salle
      var l = pb.last(); pb.seg(0.1, l.x, l.z, l.ry, 'idle');
      pb.walk(-4.3, -2.6, WALK, 'walk').walk(-4.3, 1.9, WALK, 'walk').walk(-15.6, 1.9, WALK, 'walk').walk(-16.9, 1.9, WALK, 'walk');
      pb.seg(0.2, -16.9, 1.9, pb.last().ry, 'walk', 0, 0);
      // plateau : sur la table → porté → posé → convoyeur
      var tr = d.tray, tx = [s.x, 0.77, s.tz + s.side * 0.2, 0];
      var segs = tr.segs; segs.length = 0;
      var carryFn = function (t) { var q = pb.sample(t), c = Math.sin(q.ry), sn = Math.cos(q.ry); return [q.x + c * 0.46, 1.08, q.z + sn * 0.46, q.ry]; };
      segs.push({ t0: 0, t1: tPick + 0.5, fn: function () { return tx; } });
      segs.push({ t0: tPick + 0.5, t1: tPick + 1.3, fn: function (t) { var u = sstep((t - tPick - 0.5) / 0.8), a = tx, b = carryFn(tPick + 1.3); return [lerp(a[0], b[0], u), lerp(a[1], b[1], u) + 0.1 * Math.sin(PI * u), lerp(a[2], b[2], u), lerp(a[3], b[3], u)]; } });
      segs.push({ t0: tPick + 1.3, t1: tPlace, fn: carryFn });
      var cStart = carryFn(tPlace), tE = tPlace + 0.5, ts0 = [trayStart[0], trayStart[1], trayStart[2], PI / 2 - PI / 2 + 0];
      segs.push({ t0: tPlace, t1: tE, fn: arcLin(tPlace, tE, cStart, [trayStart[0], trayStart[1], trayStart[2], 0], 0.06) });
      // calendrier le long du convoyeur
      var kfs = [{ t: tE, s: 0 }], tc = tE, sc = 0;
      stops.forEach(function (st) { tc += (st.s - sc) / CV; sc = st.s; kfs.push({ t: tc, s: sc }); st.ta = tc; tc += st.d; kfs.push({ t: tc, s: sc }); });
      var tEnd = tc; d.times = { tE: tE, recep: stops[0].ta, deb: stops[1].ta, tri: stops[2].ta, prep: stops[3].ta, leave: tEnd };
      d.kfs = kfs; segs.push({ t0: tE, t1: tEnd, fn: kfFn(kfs, function (s) { var q = W.pathAt(PT, s); return [q[0], Y + 0.03, q[1], q[2] - PI / 2]; }) });
      tPrepArr.push(stops[3].ta);
    });
    // fenêtres de travail des agents
    leavers.forEach(function (d) {
      ag('A1').win.push([d.times.recep, d.times.recep + 1.6]); ag('A2').win.push([d.times.deb + 0.2, d.times.deb + 2.5]); ag('A3').win.push([d.times.tri + 0.2, d.times.tri + 2.5]); ag('A4').win.push([d.times.prep, d.times.prep + 2.0]);
    });

    /* — envols de pièces : couverts (extracteur), restes, emballages — */
    var BINPOS = { G: [1.95, 0.6, -1.55], Y: [2.45, 0.6, -1.55], C: [0.0, 0.66, -2.55] };
    function flight(tray, key, t0, t1, tgt, arcH, ry) { tray.parts[key].fl = { t0: t0, t1: t1, target: typeof tgt === 'function' ? tgt : function () { return tgt; }, arc: arcH, ry: ry }; }
    leavers.forEach(function (d, i) {
      var tr = d.tray, tm = d.times;
      var tH = timeAtS(d.kfs, 5.0);                                       // passage sous l'extracteur (x = 0)
      flight(tr, 'cut', tH, tH + 0.7, BINPOS.C, 0.45);
      flight(tr, 'nap', tm.deb + 0.5, tm.deb + 1.2, [BINPOS.G[0] - 0.04, BINPOS.G[1], BINPOS.G[2]], 0.4);
      flight(tr, 'food', tm.deb + 1.3, tm.deb + 2.0, [BINPOS.G[0] + 0.04, BINPOS.G[1], BINPOS.G[2] + 0.04], 0.45);
      flight(tr, 'pot', tm.tri + 0.6, tm.tri + 1.3, BINPOS.Y, 0.45);
    });

    /* — casiers : deux casiers de quatre plateaux — */
    var PREPR = [[8.85, 0.99, -0.45], [8.25, 0.99, -0.45]];
    var rackLeft = [], rackSlots = [];
    var rk = [0, 1].map(function (r) { var R = new Rack(); racks.push(R); return R; });
    var tRackReady = [], tRackFull = [];
    [0, 1].forEach(function (r) {
      var R = rk[r], g = leavers.slice(r * 4, r * 4 + 4), tFull = Math.max.apply(null, g.map(function (d) { return d.times.prep; })) + 1.9;
      tRackReady[r] = tFull + 0.4;
      // glissement du casier n°2 vers le poste de chargement une fois le casier n°1 parti
      g.forEach(function (d, j) {
        var tr = d.tray, tp = d.times.prep, sx = (j % 2) * 0.2 - 0.1, sz = Math.floor(j / 2) * 0.2 - 0.1;
        var base = function (t) { var p = R.pos(t); return p; };
        var plateT = function (t) { var p = R.pos(t); return [p[0] + sx, p[1] - 0.04, p[2] + sz]; };
        var glassT = function (t) { var p = R.pos(t); return [p[0] + sx + 0.06, p[1] - 0.025, p[2] + sz + 0.05]; };
        flight(tr, 'plate', tp + 0.3, tp + 1.0, plateT, 0.35, 0); flight(tr, 'glass', tp + 0.5, tp + 1.2, glassT, 0.4, 0);
        d.lastSeg = d.tray.segs[d.tray.segs.length - 1];
        // plateau vide : empilé sur le casier
        d.tray.segs.push({ t0: tp + 1.0, t1: tp + 1.8, fn: function (t) { var u = sstep((t - tp - 1.0) / 0.8), q = W.pathAt(PT, LT), a = [q[0], Y + 0.03, q[1], q[2] - PI / 2], p = R.pos(t), b = [p[0], p[1] + 0.09 + 0.022 * j, p[2], 0]; return [lerp(a[0], b[0], u), lerp(a[1], b[1], u) + 0.18 * Math.sin(PI * u), lerp(a[2], b[2], u), lerp(a[3], b[3], u)]; } });
        d.tray.segs.push({ t0: tp + 1.8, t1: Infinity, fn: function (t) { var p = R.pos(t); return [p[0], p[1] + 0.09 + 0.022 * j, p[2], 0]; } });
        // le plateau cesse de suivre le convoyeur à l'arrivée en bout de ligne
        d.tray.segs.forEach(function (sg) { if (sg.t1 > tp + 1.0 && sg.t0 < tp + 1.0 && sg.t1 !== Infinity && sg.fn) { sg.t1 = Math.min(sg.t1, tp + 1.0); } });
      });
    });
    // trajectoires des casiers
    var rackPath = function (r) {
      var R = rk[r], segs = R.segs, t0 = 0, tr = tRackReady[r];
      if (r === 0) {
        segs.push({ t0: 0, t1: tr, fn: function () { return [PREPR[0][0], PREPR[0][1], PREPR[0][2], 0]; } });
        var tA = tr + (12.77 - 8.85) / TFV;
        segs.push({ t0: tr, t1: tA, fn: lin(tr, tA, [8.85, 0.99, -0.45, 0], [12.77, 0.99, -0.45, 0]) });
        var tB = tA + 1.8, tC = tB + (17.43 - 12.77) / MV;
        segs.push({ t0: tA, t1: tB, fn: function () { return [12.77, 0.99, -0.45, 0]; } });
        segs.push({ t0: tB, t1: tC, fn: lin(tB, tC, [12.77, 0.99, -0.45, 0], [17.43, 0.99, -0.45, 0]) });
        var tD = tC + 1.8; segs.push({ t0: tC, t1: tD, fn: function () { return [17.43, 0.99, -0.45, 0]; } });
        var sd = sAtZ(PRR, 1.85), tE1 = tD + sd / RV, tF1 = tE1 + 2.4, tG1 = tF1 + (LRR - sd) / RV;
        var ptf = function (s) { var q = W.pathAt(PRR, s); return [q[0], 0.99, q[1], 0]; };
        segs.push({ t0: tD, t1: tE1, fn: lin(tD, tE1, ptf(0), ptf(sd)) }); segs.push({ t0: tE1, t1: tF1, fn: function () { return ptf(sd); } });
        segs.push({ t0: tF1, t1: tG1, fn: function (t) { var u = (t - tF1) / (tG1 - tF1); return ptf(lerp(sd, LRR, u)); } });
        R.times = { ready: tr, entry: tA, machOut: tC, exit: tD, dry: tE1, end: tG1 };
        // Technilift : glisse sur le chariot, monte, glisse sur la mezzanine
        var LXc = W.LIFT.x, LZc = W.LIFT.z, t1 = tG1 + 1.2, t2 = t1 + 1.6, t3 = t2 + 6.5, t4 = t3 + 2.4;
        segs.push({ t0: tG1, t1: t1, fn: function () { return [LXc, 0.99, 3.0, 0]; } });
        segs.push({ t0: t1, t1: t2, fn: lin(t1, t2, [LXc, 0.99, 3.0, 0], [LXc, 0.99, LZc, 0]) });
        segs.push({ t0: t2, t1: t3, fn: lin(t2, t3, [LXc, 0.99, LZc, 0], [LXc, 2.38, LZc, 0]) });
        segs.push({ t0: t3, t1: t4, fn: lin(t3, t4, [LXc, 2.38, LZc, 0], [18.2, 2.38, LZc, 0]) });
        segs.push({ t0: t4, t1: Infinity, fn: function () { return [18.2, 2.38, LZc, 0]; } });
        R.times.lift = [t1, t2, t3, t4];
      } else {
        segs.push({ t0: 0, t1: tRackReady[0], fn: function () { return [PREPR[1][0], PREPR[1][1], PREPR[1][2], 0]; } });
        var tS = tRackReady[0] + 1.5; segs.push({ t0: tRackReady[0], t1: tS, fn: lin(tRackReady[0], tS, [PREPR[1][0], 0.99, -0.45, 0], [PREPR[0][0], 0.99, -0.45, 0]) });
        var tr1 = Math.max(tS, tr);
        segs.push({ t0: tS, t1: tr1, fn: function () { return [PREPR[0][0], 0.99, -0.45, 0]; } });
        var tA = tr1 + (12.77 - 8.85) / TFV; segs.push({ t0: tr1, t1: tA, fn: lin(tr1, tA, [8.85, 0.99, -0.45, 0], [12.77, 0.99, -0.45, 0]) });
        var tB = tA + 1.8, tC = tB + (17.43 - 12.77) / MV; segs.push({ t0: tA, t1: tB, fn: function () { return [12.77, 0.99, -0.45, 0]; } });
        segs.push({ t0: tB, t1: tC, fn: lin(tB, tC, [12.77, 0.99, -0.45, 0], [17.43, 0.99, -0.45, 0]) });
        var tD = tC + 1.8; segs.push({ t0: tC, t1: tD, fn: function () { return [17.43, 0.99, -0.45, 0]; } });
        var sd = sAtZ(PRR, 1.85), tE1 = tD + sd / RV, tF1 = tE1 + 2.4, tG1 = tF1 + (LRR - sd) / RV;
        var ptf = function (s) { var q = W.pathAt(PRR, s); return [q[0], 0.99, q[1], 0]; };
        segs.push({ t0: tD, t1: tE1, fn: lin(tD, tE1, ptf(0), ptf(sd)) }); segs.push({ t0: tE1, t1: tF1, fn: function () { return ptf(sd); } });
        segs.push({ t0: tF1, t1: tG1, fn: function (t) { var u = (t - tF1) / (tG1 - tF1); return ptf(lerp(sd, LRR, u)); } });
        R.times = { ready: tr1, entry: tA, machOut: tC, exit: tD, dry: tE1, end: tG1 };
        // chargement sur le chariot (agent 7), puis acheminement vers la ligne de dressage
        var tL = tG1 + 1.0, tL1 = tL + 1.1, TRP0 = [18.2, 2.85];
        var trolleyAt = function (t) { return trolley.pos(t); };
        segs.push({ t0: tG1, t1: tL, fn: function () { return [W.RX, 0.99, 3.0, 0]; } });
        segs.push({ t0: tL, t1: tL1, fn: function (t) { var u = sstep((t - tL) / (tL1 - tL)), a = [W.RX, 0.99, 3.0], b = trolleyAt(t); return [lerp(a[0], b[0], u), lerp(a[1], 0.82, u) + 0.3 * Math.sin(PI * u), lerp(a[2], b[2], u), 0]; } });
        R.times.load = [tL, tL1];
        R.followFrom = tL1;
      }
    };
    // chariot de transport (agent 7)
    var trolley = { g: new T.Group(), segs: [] }; scene.add(trolley.g);
    (function () {
      function b(w, h, d, x, y, z, mat) { var m = new T.Mesh(new T.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = !low; trolley.g.add(m); W.reg(m, 'goods', null); }
      b(0.8, 0.03, 0.5, 0, 0.3, 0, M.steel); b(0.8, 0.03, 0.5, 0, 0.72, 0, M.steel);
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (o) { b(0.03, 0.75, 0.03, o[0] * 0.38, 0.38, o[1] * 0.23, M.steelD); b(0.06, 0.06, 0.06, o[0] * 0.38, 0.03, o[1] * 0.23, M.rubber); });
      b(0.03, 0.4, 0.5, -0.4, 0.9, 0, M.steelD);
    })();
    trolley.pos = function (t) { var s = trolley.segs; if (!s.length) return [18.2, 0, 2.85, 0]; if (t <= s[0].t0) return s[0].fn(s[0].t0); for (var i = 0; i < s.length; i++) { if (t < s[i].t1 || i === s.length - 1) return s[i].fn(Math.min(Math.max(t, s[i].t0), s[i].t1)); } };
    var P_TR = [[18.2, 2.85], [17.4, 2.6], [0.5, 2.6], [-0.2, 3.7], [-2.0, 3.7], [-3.4, 4.4], [-3.4, 5.9]], L_TR = W.pathLen(P_TR);
    W.PATH_TROLLEY = P_TR;
    rackPath(0); rackPath(1);
    // chariot : attend, puis suit son chemin
    var tGo = rk[1].times.load[1] + 0.3, V_TR = 1.5, tArrTR = tGo + L_TR / V_TR;
    function trH(s) { var a = W.pathAt(P_TR, Math.max(0, s - 0.5)), b = W.pathAt(P_TR, Math.min(L_TR, s + 0.5)); return Math.atan2(b[0] - a[0], b[1] - a[1]) - PI / 2; }
    trolley.segs.push({ t0: 0, t1: tGo, fn: function () { return [18.2, 0, 2.85, trH(0)]; } });
    trolley.segs.push({ t0: tGo, t1: tArrTR, fn: function (t) { var s = (t - tGo) * V_TR, q = W.pathAt(P_TR, s); return [q[0], 0, q[1], trH(s)]; } });
    trolley.segs.push({ t0: tArrTR, t1: Infinity, fn: function () { var q = W.pathAt(P_TR, L_TR); return [q[0], 0, q[1], trH(L_TR)]; } });
    // casier n°2 : suit le chariot, puis est déposé sur la table de réception de la ligne de dressage
    (function () {
      var R = rk[1], segs = R.segs, last = segs[segs.length - 1], tL1 = R.times.load[1];
      var tPut = tArrTR + 0.6, tPut1 = tPut + 1.4, DIST_T = [W.DIST.x1 + 0.35, 0.98, W.DIST.z, 0];
      segs.push({ t0: tL1, t1: tPut, fn: function (t) { var p = trolley.pos(t); return [p[0], 0.82, p[2], 0]; } });
      segs.push({ t0: tPut, t1: tPut1, fn: function (t) { var u = sstep((t - tPut) / (tPut1 - tPut)), p = trolley.pos(tPut); return [lerp(p[0], DIST_T[0], u), lerp(0.82, DIST_T[1], u) + 0.3 * Math.sin(PI * u), lerp(p[2], DIST_T[2], u), 0]; } });
      segs.push({ t0: tPut1, t1: Infinity, fn: function () { return DIST_T; } });
      R.times.put = [tPut, tPut1];
      // deux plateaux propres passent sur la ligne de dressage (Technicord de préparation)
      var t2 = tPut1 + 0.8, ptsD = [[W.DIST.x1 - 0.1, W.DIST.z], [W.DIST.x0 + 1.4, W.DIST.z]], LD = W.pathLen(ptsD);
      [2, 3].forEach(function (j, n) {
        var d = leavers[4 + j], tr = d.tray, tq = t2 + n * 2.6, tq1 = tq + 0.8;
        var sg = tr.segs; // ajuste : le plateau suit le casier jusqu'à tq
        var lastSeg = sg[sg.length - 1]; lastSeg.t1 = tq; var fl = lastSeg.fn;
        sg.push({ t0: tq, t1: tq1, fn: function (t) { var u = sstep((t - tq) / (tq1 - tq)), a = fl(tq), b = [ptsD[0][0], Y + 0.03, ptsD[0][1], 0]; return [lerp(a[0], b[0], u), lerp(a[1], b[1], u) + 0.2 * Math.sin(PI * u), lerp(a[2], b[2], u), 0]; } });
        var tr2 = tq1 + LD / 0.45; sg.push({ t0: tq1, t1: tr2, fn: function (t) { var q = W.pathAt(ptsD, (t - tq1) * 0.45); return [q[0], Y + 0.03, q[1], 0]; } });
        sg.push({ t0: tr2, t1: Infinity, fn: function () { var q = W.pathAt(ptsD, LD); return [q[0], Y + 0.03, q[1], 0]; } });
        R.times.endLine = tr2;
      });
    })();
    // chaque plateau « suit le casier » : ajustement final pour les plateaux 4..7 (les segments sont ajoutés avant la liste)
    // casier n°1 : plateau final reste attaché (déjà géré par les segments « suivre »)
    // agent 7 : charge puis pousse
    (function () {
      var A7 = ag('A7'), pb = A7.pb, tL = rk[1].times.load[0];
      pb.until(tL - 0.3, 'idle'); pb.seg(1.5, 18.85, 2.85, PI / 2, 'work'); pb.seg(0.3, 18.85, 2.85, PI / 2, 'idle');
      var tg = tGo, Pk = P_TR, off = 0.85, pt0 = pb.last();
      pb.until(tg - 0.2, 'idle');
      // pousse : l'agent reste derrière le chariot
      for (var i = 1; i < Pk.length; i++) {
        var a = Pk[i - 1], b = Pk[i], d = Math.hypot(b[0] - a[0], b[1] - a[1]), h = Math.atan2(b[0] - a[0], b[1] - a[1]), ex = b[0] - Math.sin(h) * off, ez = b[1] - Math.cos(h) * off;
        if (i === 1) { var l = pb.last(); pb.seg(0.4, a[0] - Math.sin(h) * off, a[1] - Math.cos(h) * off, h, 'idle'); }
        var cur = pb.last(); if (Math.abs(angd(cur.ry, h)) > 0.05) pb.seg(0.25, cur.x, cur.z, cur.ry + angd(cur.ry, h), 'push');
        pb.seg(d / V_TR, ex, ez, h, 'push', d);
      }
      pb.hold(1.4, 'work'); pb.hold(2.0, 'idle');
      A7.win = [];
    })();
    // fenêtres des agents 5 et 6 (casiers à l'entrée / à la sortie de machine)
    rk.forEach(function (R) { ag('A5').win.push([R.times.entry - 0.6, R.times.entry + 2.2]); ag('A6').win.push([R.times.exit - 0.4, R.times.exit + 2.2]); });
    agents.forEach(function (a) {
      if (a.id === 'A7') return; var pb = a.pb, ws = a.win.slice().sort(function (p, q) { return p[0] - q[0]; });
      ws.forEach(function (w) { pb.until(w[0], 'idle'); if (w[1] > pb.last().t) pb.hold(w[1] - pb.last().t, 'work'); });
      pb.hold(0.01, 'idle');
    });
    // rampe de levage du Technilift
    var rt = rk[0].times.lift, liftKf = [{ t: 0, y: Y - 0.04 }, { t: rt[1], y: Y - 0.04 }, { t: rt[2], y: 2.3 - 0.025 }, { t: rt[3], y: 2.3 - 0.025 }, { t: rt[3] + 6.5, y: Y - 0.04 }];
    function liftY(t) { var k = liftKf, n = k.length; if (t <= k[0].t) return k[0].y; if (t >= k[n - 1].t) return k[n - 1].y; var i = 0; while (i < n - 2 && t >= k[i + 1].t) i++; var u = sstep((t - k[i].t) / (k[i + 1].t - k[i].t)); return lerp(k[i].y, k[i + 1].y, u); }
    // fin de simulation
    sim.dur = Math.ceil(Math.max(rk[1].times.endLine || 0, tArrTR + 6) + 3);
    W.simInfo = { leavers: leavers.length, racks: 2, tPrepArr: tPrepArr, drops: leavers.map(function (d) { return d.times.tE; }), recep: leavers.map(function (d) { return d.times.recep; }), deb: leavers.map(function (d) { return d.times.deb; }), rackTimes: rk.map(function (r) { return r.times; }), trolley: [tGo, tArrTR] };

    /* =====================================================================
       Mise à jour : fonction pure du temps de simulation
       ===================================================================== */
    var tmp = new T.Vector3();
    function updateAll() {
      var t = sim.t;
      pbs.forEach(function (b) {
        var q = b.sample(t), P = b.P;
        P.root.position.set(q.x, 0, q.z); P.root.rotation.y = q.ry; P.root.visible = q.vis > 0.5;
        pose(P, q.pose, q.s, q.u);
      });
      trays.forEach(function (tr) { tr.update(t); });
      racks.forEach(function (R) { R.update(t); });
      var tp = trolley.pos(t); trolley.g.position.set(tp[0], 0, tp[2]); trolley.g.rotation.y = tp[3];
      if (W.liftCar) W.liftCar.position.y = liftY(t);
      // vapeur de la machine : visible quand un casier est dans la machine
      var inM = false; rk.forEach(function (R) { var tm = R.times; if (t > tm.entry + 1 && t < tm.machOut + 1) inM = true; }); W.machineBusy = inM;
    }
    // seated non-leavers & other static items still animate (pose via anim.t) → handled by pbs with fixed keyframes
    pbs.forEach(function (b) { if (b.k.length === 1) b.k.push({ t: 1e6, x: b.k[0].x, z: b.k[0].z, ry: b.k[0].ry, pose: b.k[0].pose, s: 0, vis: 1 }); });

    /* vapeur (sprites légers) */
    var steam = []; (function () {
      var tex = (function () { var c = document.createElement('canvas'); c.width = c.height = 64; var g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 2, 32, 32, 30); gr.addColorStop(0, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new T.CanvasTexture(c); })();
      var n = low ? 4 : 10, x0 = W.MACH.x1 - 0.8, x1 = W.MACH.x0 + 0.8;
      for (var i = 0; i < n; i++) { var sp = new T.Sprite(new T.SpriteMaterial({ map: tex, transparent: true, opacity: 0, depthWrite: false })); sp.scale.set(0.7, 0.7, 0.7); sp.userData = { x: i % 2 ? x0 : x1, ph: i / n }; scene.add(sp); steam.push(sp); }
    })();

    /* =====================================================================
       Contrôles de simulation
       ===================================================================== */
    function emit() { if (sim.onChange) sim.onChange({ t: sim.t, dur: sim.dur, playing: sim.playing, speed: sim.speed, started: sim.started, done: sim.done }); }
    sim.start = function () { sim.t = 0; sim.started = true; sim.done = false; sim.playing = true; emit(); };
    sim.play = function () { if (sim.done) { sim.t = 0; sim.done = false; } sim.started = true; sim.playing = true; emit(); };
    sim.pause = function () { sim.playing = false; emit(); };
    sim.toggle = function () { sim.playing ? sim.pause() : sim.play(); };
    sim.reset = function () { sim.t = 0; sim.playing = false; sim.started = false; sim.done = false; updateAll(); emit(); };
    sim.setSpeed = function (s) { sim.speed = s; emit(); };
    sim.seek = function (t) { sim.t = Math.max(0, Math.min(sim.dur, t)); sim.started = true; updateAll(); emit(); };
    sim.freezeAt = function (t) { sim.t = t; updateAll(); };
    var lastEmit = 0;
    W.tickers.push(function (dt, tt) {
      anim.t += dt;
      if (sim.playing) { sim.t += dt * sim.speed; if (sim.t >= sim.dur) { sim.t = sim.dur; sim.playing = false; sim.done = true; emit(); } else if (tt - lastEmit > 0.25) { lastEmit = tt; emit(); } }
      updateAll();
      steam.forEach(function (sp) { var u = (anim.t * 0.35 + sp.userData.ph) % 1; sp.position.set(sp.userData.x, 2.5 + u * 1.3, W.MACH.z); var o = W.machineBusy ? 0.5 * Math.sin(PI * u) : 0; sp.material.opacity += (o - sp.material.opacity) * 0.1; sp.scale.setScalar(0.6 + u * 0.8); });
    });
    updateAll();

    /* position d'étiquette d'un agent (au-dessus de la tête) */
    W.agentAnchor = function (a) { var p = a.P.root.position; return [p.x, 2.0, p.z]; };
    return W;
  };
})();
