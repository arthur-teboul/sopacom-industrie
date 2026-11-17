/* SOPACOM — Page « Comprendre le fonctionnement » : scène 3D réfectoire + laverie (Three.js r128).
   Module propre à cette page : n'est chargé par aucune autre page, ne modifie pas laverie3d.js.
   Emprises en plan des équipements Sopacom : mesurées sur les blocs DWG de la bibliothèque CAO
   (window.SOPA_FX.dims, en mètres). Hauteurs, matières et détails : représentation de principe. */
(function () {
  'use strict';
  var T = window.THREE; if (!T) return;
  var SF = window.SF = window.SF || {};
  var PI = Math.PI, DIMS = (window.SOPA_FX && window.SOPA_FX.dims) || {};
  function cad(code, fw, fl) { var d = DIMS[code]; if (!d) return { w: fw, l: fl }; return { w: Math.min(d[0], d[1]), l: Math.max(d[0], d[1]) }; }

  /* ---- Repère : 1 unité = 1 m ; x vers l'est, z vers le visiteur (sud), y vers le haut ---- */
  var B = { x0: -17, x1: 20.5, z0: -7.5, z1: 7.5, H: 4.0, PX: -2 };
  SF.B = B;
  var Y_TC = 0.93;                          // hauteur de travail de principe des convoyeurs
  SF.Y_TC = Y_TC;

  SF.create = function (stage, opt) {
    opt = opt || {};
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var small = window.innerWidth < 760, low = small || !!opt.low;
    var renderer;
    try { renderer = new T.WebGLRenderer({ antialias: !low, powerPreference: 'high-performance' }); } catch (e) { return null; }
    if (!renderer.getContext()) return null;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, low ? 1.25 : 1.75));
    renderer.toneMapping = T.NoToneMapping;
    renderer.shadowMap.enabled = !low; renderer.shadowMap.type = T.PCFSoftShadowMap;
    renderer.localClippingEnabled = false;
    stage.insertBefore(renderer.domElement, stage.firstChild);
    renderer.domElement.setAttribute('aria-hidden', 'true');

    var BG = 0x0d0e11;
    var scene = new T.Scene(); scene.background = new T.Color(BG); scene.fog = new T.Fog(BG, 150, 300);
    var camera = new T.PerspectiveCamera(32, 1, 0.1, 420);
    var controls = new T.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.dampingFactor = 0.07; controls.minDistance = 1.2; controls.maxDistance = 170;
    controls.maxPolarAngle = PI * 0.495; controls.screenSpacePanning = true; controls.zoomSpeed = 0.9;
    if (!window.matchMedia('(pointer: fine)').matches) controls.rotateSpeed = 0.7;

    var W = { THREE: T, scene: scene, camera: camera, controls: controls, renderer: renderer, low: low, reduce: reduce, B: B, Y_TC: Y_TC, cad: cad,
      paused: false, mode: 'normal', iso: null, tickers: [], ITEMS: {}, all: [], flows: [], labels: [], explodables: [], exploded: 0, exTarget: 0 };

    /* ---------- environnement (reflets) ---------- */
    var pm = new T.PMREMGenerator(renderer), env = new T.Scene();
    env.add(new T.Mesh(new T.BoxGeometry(40, 40, 40), new T.MeshBasicMaterial({ color: 0x4a4b52, side: T.BackSide })));
    function soft(w, h, k, x, y, z, col) { var m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ color: new T.Color(col || 0xffffff).multiplyScalar(k), side: T.DoubleSide })); m.position.set(x, y, z); m.lookAt(0, 0, 0); env.add(m); }
    soft(22, 6, 3.4, 0, 15, 0); soft(12, 9, 1.8, -15, 5, 6); soft(8, 10, 1.5, 15, 4, -6, 0xF68E1D); soft(16, 4, 1.4, 0, 3, -15); soft(14, 5, 1.2, 0, 4, 15);
    scene.environment = pm.fromScene(env, 0.04).texture;

    scene.add(new T.HemisphereLight(0xffffff, 0x2a2b30, 0.55));
    var sun = new T.DirectionalLight(0xfff4e6, 1.0); sun.position.set(-8, 30, 18);
    if (!low) {
      sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
      var sc = sun.shadow.camera; sc.left = -27; sc.right = 27; sc.top = 14; sc.bottom = -14; sc.near = 5; sc.far = 80;
      sun.shadow.bias = -0.0006; sun.shadow.radius = 3; sun.shadow.normalBias = 0.02;
    }
    sun.target.position.set(1.75, 0, 0); scene.add(sun, sun.target);
    var fill = new T.DirectionalLight(0xdfe8ff, 0.3); fill.position.set(20, 14, -12); scene.add(fill);

    /* ---------- matériaux partagés ---------- */
    function S(c, r, m, extra) { var o = { color: c, roughness: r, metalness: m || 0, envMapIntensity: (m || 0) > 0.5 ? 0.9 : 0.3 }; if (extra) for (var k in extra) o[k] = extra[k]; return new T.MeshStandardMaterial(o); }
    var M = {
      steel: S(0xdfe3e7, 0.3, 0.85), steelD: S(0xa9afb6, 0.4, 0.8), steelB: S(0x8a9098, 0.5, 0.7),
      orange: S(0xE06F0A, 0.55, 0.05), cord: S(0x2a2c31, 0.6, 0.1), belt: S(0x3c3f46, 0.7, 0.05),
      floorR: S(0x7f786c, 0.85, 0), floorL: S(0x565b62, 0.6, 0.05), ground: S(0x14151a, 1, 0), slab: S(0x2a2c32, 0.9, 0),
      wall: S(0xc9c5bc, 0.92, 0), wallD: S(0xb9b5ac, 0.9, 0), glass: S(0xbcd3e0, 0.1, 0.1, { transparent: true, opacity: 0.35 }),
      sky: new T.MeshBasicMaterial({ color: 0xcfe3f3 }), lamp: new T.MeshBasicMaterial({ color: 0xfff1d6 }),
      wood: S(0xa98558, 0.7, 0), chair: S(0x383b43, 0.7, 0.05), dark: S(0x24262b, 0.6, 0.3), crate: S(0x7f8892, 0.6, 0.05),
      white: S(0xf1f0ec, 0.5, 0), plate: S(0xf6f5f1, 0.3, 0), tray: S(0x4b4f58, 0.6, 0.05), food: S(0x9a6a35, 0.8, 0), foodG: S(0x6f9a45, 0.8, 0),
      napkin: S(0xf7f2e4, 0.9, 0), pot: S(0xe3b93a, 0.6, 0), cutlery: S(0xd5d9de, 0.25, 0.9), liquid: S(0x7aa7c7, 0.2, 0, { transparent: true, opacity: 0.55 }),
      binG: S(0x2f8f46, 0.6, 0), binY: S(0xe0b419, 0.6, 0), binR: S(0xa7373a, 0.6, 0), binGr: S(0x6a6f77, 0.6, 0), binC: S(0x9aa1a9, 0.4, 0.5),
      water: S(0x5d93b5, 0.15, 0, { transparent: true, opacity: 0.8 }), panel: S(0x1d1f23, 0.4, 0.3), rubber: S(0x1b1c1f, 0.9, 0),
      machine: S(0xcfd4d9, 0.35, 0.8, { side: T.DoubleSide }), machineD: S(0x9aa1a8, 0.45, 0.7, { side: T.DoubleSide }),
      plan: null
    };
    W.M = M;

    /* ---------- registre & style ---------- */
    var ghostA = new T.MeshBasicMaterial({ color: 0x4d535c, transparent: true, opacity: 0.1, depthWrite: false });
    var ghostB = new T.MeshBasicMaterial({ color: 0x8e96a0, transparent: true, opacity: 0.26, depthWrite: false });
    var glowCache = {};
    function glowOf(m) { var k = m.uuid; if (!glowCache[k]) { var c = m.clone(); if (c.emissive) { c.emissive = new T.Color(0xF68E1D); c.emissiveIntensity = 0.28; } glowCache[k] = c; } return glowCache[k]; }
    function styleFor(e) {
      var iso = W.iso, act = !iso || !e.owner || !e.owner.steps || e.owner.steps.some(function (s) { return iso[s]; });
      var c = e.cat, m = W.mode;
      if (c === 'shell') return m === 'tech' || m === 'flux' ? ghostB : e.mat0;
      if (!act) return ghostA;
      if (m === 'tech') return c === 'sopa' ? glowOf(e.mat0) : (c === 'third' ? ghostB : ghostA);
      if (m === 'flux') return c === 'env' || c === 'people' ? ghostB : e.mat0;
      return e.mat0;
    }
    W.restyle = function () { W.all.forEach(function (e) { var mt = styleFor(e); if (e.mesh.material !== mt) e.mesh.material = mt; }); };
    W.setMode = function (m) { W.mode = m; W.restyle(); };
    W.setIso = function (stepSet) { W.iso = stepSet; W.restyle(); };

    var cur = null;                          // élément (groupe) en cours de construction
    function begin(name, cat, steps) { var g = new T.Group(); g.name = name; scene.add(g); cur = { g: g, name: name, cat: cat, steps: steps || null }; W.ITEMS[name] = cur; return cur; }
    function end() { cur = null; }
    function reg(mesh, cat, owner) { W.all.push({ mesh: mesh, cat: cat, owner: owner, mat0: mesh.material }); }
    W.reg = reg;
    var GEO = {};
    function geoBox(w, h, d) { var k = w + ',' + h + ',' + d; return GEO[k] || (GEO[k] = new T.BoxGeometry(w, h, d)); }
    function geoCyl(r, h, s) { var k = 'c' + r + ',' + h + ',' + s; return GEO[k] || (GEO[k] = new T.CylinderGeometry(r, r, h, s || 12)); }
    W.geoBox = geoBox; W.geoCyl = geoCyl;
    function place(m, parent, opts) {
      opts = opts || {};
      m.castShadow = !low && opts.sh !== false; m.receiveShadow = !low && opts.rs !== false;
      var p = parent || cur.g; p.add(m);
      reg(m, (cur && cur.cat) || 'env', cur);
      if (!opts.dyn) { m.matrixAutoUpdate = false; m.updateMatrix(); }
      return m;
    }
    function box(w, h, d, x, y, z, mat, o, parent) { var m = new T.Mesh(geoBox(w, h, d), mat); m.position.set(x, y, z); if (o && o.ry) m.rotation.y = o.ry; return place(m, parent, o); }
    function cyl(r, h, x, y, z, mat, o, parent) { var m = new T.Mesh(geoCyl(r, h, o && o.seg), mat); m.position.set(x, y, z); if (o && o.ax === 'x') m.rotation.z = PI / 2; if (o && o.ax === 'z') m.rotation.x = PI / 2; return place(m, parent, o); }
    W.box = box; W.cyl = cyl;
    function imesh(geo, mat, list, parent, o) {
      var im = new T.InstancedMesh(geo, mat, list.length), d = new T.Object3D();
      list.forEach(function (p, i) { d.position.set(p.x, p.y, p.z); d.rotation.set(p.rx || 0, p.ry || 0, p.rz || 0); d.scale.set(p.sx || 1, p.sy || 1, p.sz || 1); d.updateMatrix(); im.setMatrixAt(i, d.matrix); });
      im.instanceMatrix.needsUpdate = true; im.castShadow = !low && !(o && o.sh === false); im.receiveShadow = !low;
      (parent || cur.g).add(im); reg(im, cur.cat, cur); im.matrixAutoUpdate = false; im.updateMatrix(); im.frustumCulled = false; return im;
    }
    function sub(name, off) {               // sous-ensemble déplaçable en vue éclatée
      var g = new T.Group(); g.name = name; cur.g.add(g);
      if (off) W.explodables.push({ o: g, base: g.position.clone(), off: new T.Vector3(off[0], off[1], off[2]) });
      return g;
    }
    function pathLen(pts) { var L = 0; for (var i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return L; }
    W.pathLen = pathLen;
    W.pathAt = function (pts, s) {            // position le long d'une polyligne [[x,z]...]
      var acc = 0; for (var i = 1; i < pts.length; i++) {
        var a = pts[i - 1], b = pts[i], l = Math.hypot(b[0] - a[0], b[1] - a[1]);
        if (s <= acc + l || i === pts.length - 1) { var u = l ? Math.min(1, Math.max(0, (s - acc) / l)) : 0; return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, Math.atan2(b[0] - a[0], b[1] - a[1])]; }
        acc += l;
      } return [pts[0][0], pts[0][1], 0];
    };
    function arc(cx, cz, r, a0, a1, n) { var o = []; for (var i = 0; i <= n; i++) { var a = a0 + (a1 - a0) * i / n; o.push([cx + r * Math.cos(a), cz + r * Math.sin(a)]); } return o; }
    function joinPts() { var o = []; [].slice.call(arguments).forEach(function (p) { p.forEach(function (q) { var l = o[o.length - 1]; if (!l || Math.hypot(l[0] - q[0], l[1] - q[1]) > 1e-6) o.push(q); }); }); return o; }

    /* ---------- textures animées (cordes, chaîne) ---------- */
    function stripeTex(kind) {
      var c = document.createElement('canvas'); c.width = 64; c.height = 64; var g = c.getContext('2d');
      if (kind === 'cord') { g.fillStyle = '#2a2c31'; g.fillRect(0, 0, 64, 64); g.fillStyle = '#6a6e77'; g.fillRect(0, 0, 64, 10); }
      else { g.fillStyle = '#3a3d44'; g.fillRect(0, 0, 64, 64); g.fillStyle = '#6b707a'; for (var i = 0; i < 2; i++) { g.beginPath(); g.arc(32 + i * 0, 8 + i * 32, 13, Math.PI, 0, false); g.lineTo(45, 30 + i * 32); g.lineTo(19, 30 + i * 32); g.fill(); } }
      var t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; return t;
    }
    var cordTex = stripeTex('cord'), beltTex = stripeTex('belt');
    var cordMat = new T.MeshStandardMaterial({ map: cordTex, roughness: 0.6, metalness: 0.1 });
    var beltMat = new T.MeshStandardMaterial({ map: beltTex, roughness: 0.65, metalness: 0.05 });
    W.tickers.push(function (dt) { if (W.paused) return; cordTex.offset.y -= dt * 0.9; beltTex.offset.x -= dt * 0.55; });

    /* =====================================================================
       BÂTIMENT
       ===================================================================== */
    var wallGroups = [];
    function wallGroup(name, nx, nz, kind, cx, cz) { var g = new T.Group(); g.name = name; g.userData = { n: [nx, nz], kind: kind, c: [cx, cz], s: 1 }; scene.add(g); wallGroups.push(g); return g; }
    function wseg(g, x0, z0, x1, z1, y0, y1, th, mat) {    // segment de mur plein (axe x ou z)
      var w = Math.abs(x1 - x0) || th, d = Math.abs(z1 - z0) || th, m = new T.Mesh(geoBox(w, y1 - y0, d), mat);
      m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); m.castShadow = !low; m.receiveShadow = !low; g.add(m); W.all.push({ mesh: m, cat: 'shell', owner: null, mat0: mat }); return m;
    }
    function wallWithOpenings(g, axis, fixed, a0, a1, th, ops, mat) {   // ops: [{a,b,y0,y1}]
      var H = B.H; ops = ops.slice().sort(function (p, q) { return p.a - q.a; });
      var pos = a0;
      ops.forEach(function (o) {
        if (o.a > pos) seg(pos, o.a, 0, H);
        if (o.y0 > 0) seg(o.a, o.b, 0, o.y0);
        if (o.y1 < H) seg(o.a, o.b, o.y1, H);
        pos = o.b;
      });
      if (pos < a1) seg(pos, a1, 0, H);
      function seg(p, q, y0, y1) { if (axis === 'x') wseg(g, p, fixed - th / 2, q, fixed + th / 2, y0, y1, th, mat); else wseg(g, fixed - th / 2, p, fixed + th / 2, q, y0, y1, th, mat); }
    }
    begin('shell', 'shell', null);
    var gx = B.x1 - B.x0, gz = B.z1 - B.z0, cxm = (B.x0 + B.x1) / 2;
    box(gx + 14, 0.2, gz + 14, cxm, -0.3, 0, M.ground, { sh: false });
    box(gx + 0.8, 0.2, gz + 0.8, cxm, -0.1, 0, M.slab);
    var fr = new T.Mesh(new T.PlaneGeometry(B.PX - B.x0, gz), M.floorR); fr.rotation.x = -PI / 2; fr.position.set((B.x0 + B.PX) / 2, 0.005, 0); fr.receiveShadow = !low; scene.add(fr); reg(fr, 'shell', null);
    var fl = new T.Mesh(new T.PlaneGeometry(B.x1 - B.PX, gz), M.floorL); fl.rotation.x = -PI / 2; fl.position.set((B.PX + B.x1) / 2, 0.005, 0); fl.receiveShadow = !low; scene.add(fl); reg(fl, 'shell', null);
    // joints de carrelage (laverie) et de revêtement (réfectoire)
    var gdL = new T.GridHelper(B.x1 - B.PX, Math.round((B.x1 - B.PX) / 0.6), 0x6c727a, 0x6c727a); gdL.scale.z = gz / (B.x1 - B.PX); gdL.position.set((B.PX + B.x1) / 2, 0.012, 0); gdL.material.transparent = true; gdL.material.opacity = 0.3; scene.add(gdL);
    W.tickers.push(function () { gdL.visible = camera.position.distanceTo(controls.target) < 58; });   // évite le moiré des joints de carrelage en vue lointaine
    // bandeau orange de la laverie (repère visuel de zone)
    box(B.x1 - B.PX - 0.2, 0.01, 0.12, (B.PX + B.x1) / 2 + 0.1, 0.013, B.z1 - 0.6, M.orange, { sh: false });
    end();

    var ext = {
      N: wallGroup('murN', 0, -1, 'ext', cxm, B.z0), S: wallGroup('murS', 0, 1, 'ext', cxm, B.z1),
      W: wallGroup('murO', -1, 0, 'ext', B.x0, 0), E: wallGroup('murE', 1, 0, 'ext', B.x1, 0), P: wallGroup('cloison', 0, 0, 'int', B.PX, 0)
    };
    wallWithOpenings(ext.N, 'x', B.z0, B.x0, B.x1, 0.25, [], M.wall);
    wallWithOpenings(ext.S, 'x', B.z1, B.x0, B.x1, 0.25, [], M.wall);
    wallWithOpenings(ext.E, 'z', B.x1, B.z0, B.z1, 0.25, [], M.wall);
    wallWithOpenings(ext.W, 'z', B.x0, B.z0, B.z1, 0.25, [{ a: 1.2, b: 2.8, y0: 0, y1: 2.3 }], M.wall);
    wallWithOpenings(ext.P, 'z', B.PX, B.z0, B.z1, 0.2, [{ a: -4.2, b: -2.6, y0: 0.55, y1: 2.3 }, { a: 3.0, b: 4.4, y0: 0, y1: 2.3 }], M.wall);
    // fenêtres (réfectoire) : bandeaux vitrés sur les murs nord et ouest
    function win(g, x, y, z, w, h, d) { var m = new T.Mesh(geoBox(w, h, d), M.sky); m.position.set(x, y, z); g.add(m); W.all.push({ mesh: m, cat: 'shell', owner: null, mat0: M.sky }); }
    [-14.2, -10.2, -6.2].forEach(function (x) { win(ext.N, x, 2.2, B.z0 + 0.16, 2.6, 1.5, 0.05); });
    [-5.2, 5.4].forEach(function (z) { win(ext.W, B.x0 + 0.16, 2.2, z, 0.05, 1.5, 2.4); });
    [2.5, 8, 13.5].forEach(function (x) { win(ext.N, x, 2.6, B.z0 + 0.16, 2.4, 1.0, 0.05); });
    // plinthe orange sur la cloison (côté laverie)
    var plin = new T.Mesh(geoBox(0.04, 0.12, gz - 0.4), M.orange); plin.position.set(B.PX + 0.12, 0.06, 0); ext.P.add(plin); W.all.push({ mesh: plin, cat: 'shell', owner: null, mat0: M.orange });
    // porte de la salle (ouverture) : seuil
    // toit visible uniquement depuis l'intérieur (vue immersive)
    var roof = new T.Group(); scene.add(roof); roof.visible = false;
    var rf = new T.Mesh(geoBox(gx + 0.5, 0.14, gz + 0.5), M.wall); rf.position.set(cxm, B.H + 0.07, 0); roof.add(rf); W.all.push({ mesh: rf, cat: 'shell', owner: null, mat0: M.wall });
    [[-13, -4], [-9, -4], [-5, -4], [-13, 1], [-9, 1], [-5, 1], [-13, 5], [-9, 5], [-5, 5], [2, -4], [8, -4], [14, -4], [2, 1], [8, 1], [14, 1], [2, 5], [8, 5], [14, 5]].forEach(function (p) {
      var l = new T.Mesh(geoBox(2.4, 0.05, 0.3), M.lamp); l.position.set(p[0], B.H - 0.03, p[1]); roof.add(l);
    });
    W.roof = roof;

    /* =====================================================================
       RÉFECTOIRE : tables et chaises (instanciées)
       ===================================================================== */
    var COLS = [-13.5, -10, -6.5], ROWS = [-4.6, -2.0, 0.6, 3.2, 5.8];
    W.tables = []; W.seats = [];
    var tops = [], legsT = [], seatsI = [], backs = [], legsC = [];
    ROWS.forEach(function (rz, ri) { COLS.forEach(function (cx, ci) {
      var t = { x: cx, z: rz, ci: ci, ri: ri }; W.tables.push(t);
      tops.push({ x: cx, y: 0.75, z: rz });
      [[-0.72, -0.34], [0.72, -0.34], [-0.72, 0.34], [0.72, 0.34]].forEach(function (o) { legsT.push({ x: cx + o[0], y: 0.37, z: rz + o[1] }); });
      [[-0.4, -1], [0.4, -1], [-0.4, 1], [0.4, 1]].forEach(function (o) {
        var sx = cx + o[0], sz = rz + o[1] * 0.78, ry = o[1] > 0 ? PI : 0;       // le convive fait face à la table
        seatsI.push({ x: sx, y: 0.44, z: sz });
        backs.push({ x: sx, y: 0.7, z: sz + o[1] * 0.2 });
        [[-0.19, -0.19], [0.19, -0.19], [-0.19, 0.19], [0.19, 0.19]].forEach(function (l) { legsC.push({ x: sx + l[0], y: 0.21, z: sz + l[1] }); });
        W.seats.push({ x: sx, z: sz, ry: ry, ti: W.tables.length - 1, side: o[1], tx: cx, tz: rz });
      });
    }); });
    begin('refectoire', 'env', [1]);
    imesh(geoBox(1.6, 0.04, 0.8), M.wood, tops);
    imesh(geoBox(0.05, 0.74, 0.05), M.steelD, legsT);
    imesh(geoBox(0.42, 0.05, 0.42), M.chair, seatsI);
    imesh(geoBox(0.42, 0.34, 0.04), M.chair, backs.map(function (b, i) { return { x: b.x, y: b.y, z: b.z }; }));
    imesh(geoBox(0.03, 0.42, 0.03), M.steelD, legsC);
    // ligne de distribution / dressage (Technicord de préparation) le long du mur sud — emplacement de principe
    end();

    /* =====================================================================
       ÉQUIPEMENTS SOPACOM
       ===================================================================== */
    function tcPath(parent, pts, y, width, withLegs) {   // poutre Technicord + deux cordes, d'après le bloc A2010 (largeur)
      var legs = [];
      for (var i = 1; i < pts.length; i++) {
        var a = pts[i - 1], b = pts[i], dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz); if (L < 1e-4) continue;
        var g = new T.Group(); g.position.set((a[0] + b[0]) / 2, 0, (a[1] + b[1]) / 2); g.rotation.y = -Math.atan2(dz, dx); parent.add(g); g.matrixAutoUpdate = false; g.updateMatrix();
        box(L + 0.012, 0.07, width, 0, y - 0.07, 0, M.steel, null, g);
        box(L + 0.012, 0.05, 0.025, 0, y - 0.015, width / 2 - 0.0125, M.steelD, null, g);
        box(L + 0.012, 0.05, 0.025, 0, y - 0.015, -width / 2 + 0.0125, M.steelD, null, g);
        [-0.09, 0.09].forEach(function (zz) {
          var cg = new T.CylinderGeometry(0.0075 * 1.6, 0.0075 * 1.6, L, 8); var uv = cg.attributes.uv; for (var k = 0; k < uv.count; k++) uv.setY(k, uv.getY(k) * L * 6);
          var m = new T.Mesh(cg, cordMat); m.rotation.z = PI / 2; m.position.set(0, y - 0.005, zz); g.add(m); reg(m, cur.cat, cur); m.matrixAutoUpdate = false; m.updateMatrix();
        });
        if (withLegs !== false) { var n = Math.max(1, Math.round(L / 1.5)); for (var k = 0; k < n; k++) { var u = (k + 0.5) / n; legs.push({ x: a[0] + dx * u, y: (y - 0.1) / 2, z: a[1] + dz * u }); } }
      }
      if (legs.length) imesh(geoBox(0.05, y - 0.1, 0.05), M.steelD, legs, parent);
    }

    /* — Technicord : dépose, convoyage (blocs A2010 / A2VI90d) — */
    var A2 = cad('A2010', 0.41, 1.0), VI = cad('A2VI90d', 0.5894, 0.5744), RB = Math.max(0.2, VI.l - A2.w / 2);   // rayon de ligne moyenne déduit du bloc de virage
    var PATH_T = joinPts([[-5.0, -3.4], [B.PX - 3.0, -3.4], [7.0, -3.4]], arc(7.0, -3.4 + RB, RB, -PI / 2, 0, 8), [[7.0 + RB, -0.3]]);
    W.PATH_T = PATH_T;
    begin('technicord', 'sopa', [2, 5]); tcPath(cur.g, PATH_T, Y_TC, A2.w, true); end();
    // guichet de dépose à l'entrée (extrémité de la dépose côté salle)
    begin('depose', 'sopa', [2]);
    box(0.5, 0.05, 0.9, -5.35, 0.9, -3.4, M.steel);                       // plan de dépose
    box(0.04, 0.5, 0.9, -5.6, 1.15, -3.4, M.steelD);
    box(0.5, 0.5, 0.04, -5.35, 1.15, -2.95, M.steelD);
    end();

    /* — Tri sélectif : stations TRISTA3 (bloc TRISTA3d), extracteur H10, bac G20 — */
    var TS = cad('TRISTA3d', 0.5646, 1.855), H10 = cad('H10', 0.5, 0.76), G20 = cad('G20', 0.715, 0.759);
    begin('tri', 'sopa', [3]);
    [0.5, 2.5].forEach(function (x0) {
      var cx = x0 + TS.l / 2, cz = -3.4 + A2.w / 2 + 0.06 + TS.w / 2, g = sub('station');
      box(TS.l, 0.04, TS.w, cx, 0.82, cz, M.steel, null, g);
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (o) { box(0.05, 0.8, 0.05, cx + o[0] * (TS.l / 2 - 0.05), 0.4, cz + o[1] * (TS.w / 2 - 0.05), M.steelD, null, g); });
      box(TS.l - 0.04, 0.03, TS.w - 0.06, cx, 0.35, cz, M.steelD, null, g);
      for (var i = 0; i < 3; i++) { var kx = cx - TS.l / 2 + 0.3 + i * 0.5; box(0.44, 0.28, TS.w - 0.1, kx, 0.98, cz, M.crate, null, g); box(0.4, 0.02, TS.w - 0.16, kx, 1.12, cz, M.dark, null, g); }
      box(0.42, 0.3, TS.w - 0.1, cx + TS.l / 2 - 0.3, 0.97, cz, M.binC, null, g);           // bac (à droite)
    });
    // extracteur magnétique de couverts (H10) en pont au-dessus de la dépose + bac mobile G20 dessous
    (function () { var g = sub('extracteur', [0, 1.2, 0]), x = 0.0;
      box(0.04, 0.5, 0.04, x, 1.25, -3.4 - 0.26, M.steelD, null, g); box(0.04, 0.5, 0.04, x, 1.25, -3.4 + 0.26, M.steelD, null, g);
      box(H10.l * 0.5, 0.06, A2.w + 0.1, x, 1.52, -3.4, M.steel, null, g); box(H10.l * 0.5 - 0.1, 0.03, 0.2, x, 1.46, -3.4, M.orange, null, g); })();
    box(G20.l, 0.62, G20.w, 0.0, 0.31, -2.55, M.binC); box(G20.l - 0.06, 0.02, G20.w - 0.06, 0.0, 0.63, -2.55, M.dark);
    [[-.3, -.3], [.3, -.3], [-.3, .3], [.3, .3]].forEach(function (o) { cyl(0.04, 0.05, o[0], 0.03, -2.55 + o[1], M.rubber); });
    end();
    // bacs de tri (400 × 400 du catalogue CAO) : déchets alimentaires, emballages, autres — équipements de principe
    begin('bacs', 'env', [3]);
    [[1.95, M.binG], [2.45, M.binY], [2.95, M.binGr]].forEach(function (b) { box(0.4, 0.5, 0.4, b[0], 0.28, -1.55, b[1]); box(0.42, 0.04, 0.42, b[0], 0.54, -1.55, M.dark); });
    end();

    /* — Tabling : table de préparation (TL1150), table entrée machine (TL0644d), table sortie (TL1150) — */
    var TL = cad('TL1150', 0.56, 1.1605), TE = cad('TL0644d', 0.6605, 0.728);
    function table(parent, cx, cz, l, w, y, withBac) {
      var g = new T.Group(); parent.add(g);
      box(l, 0.04, w, cx, y, cz, M.steel, null, g); box(l, 0.06, 0.03, cx, y - 0.04, cz + w / 2 - 0.015, M.steelD, null, g); box(l, 0.06, 0.03, cx, y - 0.04, cz - w / 2 + 0.015, M.steelD, null, g);
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (o) { box(0.045, y - 0.02, 0.045, cx + o[0] * (l / 2 - 0.04), (y - 0.02) / 2, cz + o[1] * (w / 2 - 0.04), M.steelD, null, g); });
      box(l - 0.06, 0.025, w - 0.06, cx, 0.22, cz, M.steelD, null, g);
      if (withBac) box(0.4, 0.3, 0.4, cx + l / 2 - 0.25, y - 0.17, cz + w / 2 - 0.25, M.binC, null, g);
      return g;
    }
    var PREP = { x: 8.55, z: -0.45 }, ENTRY = { x: 12.77, z: -0.45 }, EXIT = { x: 17.43, z: -0.45 };
    W.PREP = PREP; W.ENTRY = ENTRY; W.EXIT = EXIT;
    begin('tabling', 'sopa', [4, 6, 8]);
    table(cur.g, PREP.x, PREP.z, TL.l, TL.w, 0.9, false);
    table(cur.g, ENTRY.x, ENTRY.z, TE.l, TE.w, 0.9, true);
    table(cur.g, EXIT.x, EXIT.z, TL.l, TL.w, 0.9, false);
    end();

    /* — Transflex : convoyeur à palettes (chaîne demi-lune), largeur de principe — */
    begin('transflex', 'sopa', [6]);
    (function () {
      var x0 = PREP.x + TL.l / 2 + 0.02, x1 = ENTRY.x - TE.l / 2 - 0.02, L = x1 - x0, cz = -0.45, wd = 0.4;
      box(L, 0.1, wd + 0.06, (x0 + x1) / 2, 0.84, cz, M.steelD);
      var pg = new T.PlaneGeometry(L, wd); var uv = pg.attributes.uv; for (var k = 0; k < uv.count; k++) uv.setX(k, uv.getX(k) * L * 5);
      var m = new T.Mesh(pg, beltMat); m.rotation.x = -PI / 2; m.position.set((x0 + x1) / 2, 0.895, cz); m.receiveShadow = !low; cur.g.add(m); reg(m, 'sopa', cur); m.matrixAutoUpdate = false; m.updateMatrix();
      box(L, 0.05, 0.025, (x0 + x1) / 2, 0.915, cz + wd / 2 + 0.0125, M.steel); box(L, 0.05, 0.025, (x0 + x1) / 2, 0.915, cz - wd / 2 - 0.0125, M.steel);
      var lg = []; for (var i = 0; i < Math.max(2, Math.round(L / 1.4)); i++) { lg.push({ x: x0 + (i + 0.5) * L / Math.max(2, Math.round(L / 1.4)), y: 0.4, z: cz }); }
      imesh(geoBox(0.05, 0.8, wd), M.steelD, lg);
      W.TF = { x0: x0, x1: x1, z: cz };
    })();
    end();

    /* — Machine de lavage : équipement tiers, représentation de principe — */
    var MX0 = ENTRY.x + TE.l / 2 + 0.07, MX1 = EXIT.x - TL.l / 2 - 0.05, MZ = -0.45; W.MACH = { x0: MX0, x1: MX1, z: MZ };
    begin('machine', 'third', [7]);
    (function () {
      var L = MX1 - MX0, cx = (MX0 + MX1) / 2, base = sub('machine-base'), hood = sub('machine-capot', [0, 1.7, 0]);
      box(L, 0.9, 0.9, cx, 0.45, MZ, M.machine, { sh: true }, base);
      box(L + 0.02, 0.12, 0.92, cx, 0.96, MZ, M.machineD, null, base);
      box(L - 0.1, 0.95, 0.84, cx, 1.5, MZ, M.machine, null, hood);
      box(L - 0.2, 0.05, 0.8, cx, 2.0, MZ, M.machineD, null, hood);
      cyl(0.16, 0.5, MX0 + 0.8, 2.27, MZ, M.machineD, null, hood); cyl(0.16, 0.5, MX1 - 0.8, 2.27, MZ, M.machineD, null, hood);
      box(0.5, 0.42, 0.04, MX0 + 1.0, 1.55, MZ + 0.47, M.panel, null, hood); box(0.3, 0.04, 0.045, MX0 + 1.0, 1.4, MZ + 0.47, M.orange, null, hood);
      [MX0 + 0.04, MX1 - 0.04].forEach(function (x) { box(0.05, 0.42, 0.62, x, 1.18, MZ, M.panel, null, base); box(0.06, 0.45, 0.64, x, 1.12, MZ, M.rubber, null, base); });   // ouvertures / rideaux
      // intérieur (visible en vue en coupe) : rampes de lavage, bac d'eau
      [0.28, 0.5, 0.72].forEach(function (u) {
        var x = MX0 + L * u; cyl(0.018, 0.7, x, 1.35, MZ, M.steelD, { ax: 'z' }, base); cyl(0.018, 0.7, x, 1.0, MZ, M.steelD, { ax: 'z' }, base);
        for (var k = -2; k <= 2; k++) { cyl(0.01, 0.06, x, 1.3, MZ + k * 0.15, M.orange, null, base); cyl(0.01, 0.06, x, 1.05, MZ + k * 0.15, M.orange, null, base); }
      });
      box(L - 0.3, 0.05, 0.7, cx, 0.82, MZ, M.water, { sh: false }, base);
      box(L - 0.2, 0.03, 0.55, cx, 0.88, MZ, M.steelB, { sh: false }, base);
      var legs = []; [[MX0 + 0.1, 0.4], [MX1 - 0.1, 0.4]].forEach(function (p) { legs.push({ x: p[0], y: 0.04, z: MZ - 0.38 }, { x: p[0], y: 0.04, z: MZ + 0.38 }); }); imesh(geoBox(0.08, 0.08, 0.08), M.rubber, legs, base);
    })();
    end();

    /* — Transroll : tables à rouleaux (blocs TR2010, TR20090), tunnel de séchage (TPL060) — */
    var TR = cad('TR2010', 0.58, 0.97), TB = cad('TR20090', 1.11, 1.11), TD = cad('TPL060', 0.65, 0.65), RR = Math.max(0.3, TB.l - TR.w / 2);
    var TRX = EXIT.x + TL.l / 2 + 0.02;
    var PATH_R = joinPts([[TRX, -0.45], [TRX + 0.5, -0.45]], arc(TRX + 0.5, -0.45 + RR, RR, -PI / 2, 0, 10), [[TRX + 0.5 + RR, 3.0]]);
    W.PATH_R = PATH_R; W.RX = TRX + 0.5 + RR;
    begin('transroll', 'sopa', [8, 9]);
    (function () {
      var rl = [], rails = [], total = pathLen(PATH_R), n = Math.round(total / 0.12);
      for (var i = 0; i <= n; i++) { var p = W.pathAt(PATH_R, total * i / n); rl.push({ x: p[0], y: 0.87, z: p[1], rz: PI / 2, ry: p[2] + PI / 2, sx: 1 }); }
      var rg = new T.CylinderGeometry(0.022, 0.022, TR.w - 0.04, 8);
      // axes : cylindre d'axe Z local orienté perpendiculairement au sens de marche
      var im = new T.InstancedMesh(rg, M.steel, rl.length), d = new T.Object3D();
      var q1 = new T.Quaternion().setFromEuler(new T.Euler(0, 0, PI / 2)), yAx = new T.Vector3(0, 1, 0);
      rl.forEach(function (p, i) { d.position.set(p.x, p.y, p.z); d.quaternion.setFromAxisAngle(yAx, p.ry - PI / 2).multiply(q1); d.updateMatrix(); im.setMatrixAt(i, d.matrix); });
      im.instanceMatrix.needsUpdate = true; im.castShadow = !low; cur.g.add(im); reg(im, 'sopa', cur); im.frustumCulled = false;
      // longerons
      for (var j = 1; j < PATH_R.length; j++) {
        var a = PATH_R[j - 1], b = PATH_R[j], dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz), ang = -Math.atan2(dz, dx), g = new T.Group(); g.position.set((a[0] + b[0]) / 2, 0, (a[1] + b[1]) / 2); g.rotation.y = ang; cur.g.add(g); g.matrixAutoUpdate = false; g.updateMatrix();
        box(L + 0.01, 0.06, 0.03, 0, 0.86, TR.w / 2, M.steelD, null, g); box(L + 0.01, 0.06, 0.03, 0, 0.86, -TR.w / 2, M.steelD, null, g);
      }
      var lg = []; for (var k = 1; k < PATH_R.length; k += 3) { lg.push({ x: PATH_R[k][0] + 0.2, y: 0.42, z: PATH_R[k][1] }, { x: PATH_R[k][0] - 0.2, y: 0.42, z: PATH_R[k][1] }); } imesh(geoBox(0.04, 0.84, 0.04), M.steelD, lg);
    })();
    // tunnel de séchage (2 modules de 0,65 m, nombre de modules de principe)
    (function () { var g = sub('sechage', [0, 1.4, 0]), z0 = 1.2, nm = 2;
      for (var i = 0; i < nm; i++) { var zc = z0 + (i + 0.5) * TD.l; box(0.04, 0.6, TD.l, W.RX - TD.w / 2 - 0.04, 1.2, zc, M.machine, null, g); box(0.04, 0.6, TD.l, W.RX + TD.w / 2 + 0.04, 1.2, zc, M.machine, null, g); box(TD.w + 0.12, 0.04, TD.l, W.RX, 1.52, zc, M.machineD, null, g); }
      cyl(0.09, 0.3, W.RX, 1.7, z0 + TD.l, M.machineD, null, g); })();
    end();

    /* — Technilift : élévateur vertical vers la mezzanine de stockage (bloc DC pour l'emprise) — */
    var DC = cad('DC', 0.82, 1.1541), LX = W.RX, LZ = 4.2, MEZ = 2.3;
    W.LIFT = { x: LX, z: LZ, y0: Y_TC, y1: MEZ + 0.1 };
    begin('technilift', 'sopa', [9]);
    (function () {
      var hw = DC.w / 2, hl = DC.l / 2, g = sub('tour');
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (o) { box(0.07, 3.5, 0.07, LX + o[0] * hw, 1.75, LZ + o[1] * hl, M.steel, null, g); });
      box(DC.w + 0.07, 0.07, 0.07, LX, 3.5, LZ - hl, M.steelD, null, g); box(DC.w + 0.07, 0.07, 0.07, LX, 3.5, LZ + hl, M.steelD, null, g);
      box(0.07, 0.07, DC.l, LX - hw, 3.5, LZ, M.steelD, null, g); box(0.07, 0.07, DC.l, LX + hw, 3.5, LZ, M.steelD, null, g);
      box(0.2, 0.3, 0.2, LX + hw + 0.12, 0.3, LZ, M.orange, null, g);           // armoire de commande
      var car = new T.Group(); car.position.set(LX, W.LIFT.y0 - 0.04, LZ); cur.g.add(car); W.liftCar = car;
      box(TR.w - 0.02, 0.05, 0.7, 0, 0, 0, M.steel, { dyn: true }, car); [-0.2, -0.1, 0, 0.1, 0.2].forEach(function (z) { cyl(0.02, TR.w - 0.06, 0, 0.04, z, M.steelD, { ax: 'x', dyn: true }, car); });
      box(0.04, 0.2, 0.7, -hw + 0.1, 0.1, 0, M.steelD, { dyn: true }, car);
    })();
    end();
    // mezzanine de stockage (structure de principe)
    begin('mezzanine', 'env', [9]);
    (function () {
      var x0 = 15.9, x1 = 18.9, z0 = 3.5, z1 = 7.3;
      box(x1 - x0, 0.1, z1 - z0, (x0 + x1) / 2, MEZ - 0.05, (z0 + z1) / 2, M.steelB);
      [[x0 + .1, z0 + .1], [x1 - .1, z0 + .1], [x0 + .1, z1 - .1], [x1 - .1, z1 - .1], [(x0 + x1) / 2, z1 - .1], [(x0 + x1) / 2, z0 + .1]].forEach(function (p) { box(0.1, MEZ - 0.1, 0.1, p[0], (MEZ - 0.1) / 2, p[1], M.steelD); });
      box(x1 - x0, 0.04, 0.04, (x0 + x1) / 2, MEZ + 1.0, z0 + 0.02, M.steel); box(0.04, 0.04, z1 - z0, x0 + 0.02, MEZ + 1.0, (z0 + z1) / 2, M.steel); box(x1 - x0, 0.04, 0.04, (x0 + x1) / 2, MEZ + 0.5, z0 + 0.02, M.steel); box(0.04, 0.04, z1 - z0, x0 + 0.02, MEZ + 0.5, (z0 + z1) / 2, M.steel);
      var pp = []; for (var i = 0; i <= 8; i++) pp.push({ x: x0 + 0.02 + (x1 - x0) * i / 8, y: MEZ + 0.5, z: z0 + 0.02 }); for (var j = 1; j <= 8; j++) pp.push({ x: x0 + 0.02, y: MEZ + 0.5, z: z0 + (z1 - z0) * j / 8 }); imesh(geoBox(0.03, 1.0, 0.03), M.steel, pp);
      [[x0 + 1.0, z0 + 2.6], [x0 + 1.7, z0 + 2.6], [x0 + 1.0, z0 + 3.3], [x0 + 1.7, z0 + 3.3], [x0 + 2.4, z0 + 3.3]].forEach(function (q) { box(0.5, 0.15, 0.5, q[0], MEZ + 0.085, q[1], M.crate); box(0.4, 0.02, 0.4, q[0], MEZ + 0.17, q[1], M.plate); });   // casiers stockés (principe)
    })();
    end();

    /* — Technicord de préparation (dressage / distribution) le long du mur sud : emplacement et longueur de principe (1 à 8 m documentés) — */
    var DZ = 6.55, DX0 = -9.0, DX1 = -4.0; W.DIST = { x0: DX0, x1: DX1, z: DZ };
    begin('prep', 'sopa', [10]);
    box(DX1 - DX0, 0.78, 0.6, (DX0 + DX1) / 2, 0.39, DZ + 0.1, M.steel);
    tcPath(cur.g, [[DX0, DZ], [DX1, DZ]], 0.93, 0.41, false);
    box(DX1 - DX0, 0.05, 0.3, (DX0 + DX1) / 2, 0.93 - 0.03, DZ - 0.33, M.steelD);
    box(0.5, 0.12, 0.7, DX1 + 0.35, 0.84, DZ, M.steelD);                         // table de réception des équipements propres
    end();

    /* — stockage au sol (étagères D400, 1,15 × 0,58) : décor de principe — */
    var SH = cad('D400', 0.5811, 1.15);
    begin('stockage', 'env', [9, 10]);
    [3.0, 4.3, 5.6, 6.9, 8.2].forEach(function (x) {
      box(SH.l, 0.03, SH.w, x, 0.3, 7.05, M.steel); box(SH.l, 0.03, SH.w, x, 0.85, 7.05, M.steel); box(SH.l, 0.03, SH.w, x, 1.4, 7.05, M.steel);
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (o) { box(0.04, 1.4, 0.04, x + o[0] * (SH.l / 2 - 0.03), 0.7, 7.05 + o[1] * (SH.w / 2 - 0.03), M.steelD); });
    });
    end();

    /* =====================================================================
       FLUX (chevrons animés)
       ===================================================================== */
    W.FLOWCOL = { convives: 0x8fb8ff, plateaux: 0xF68E1D, dechets: 0xe5484d, vaisselle: 0xf2c230, propre: 0x34c3a0, operateurs: 0xece7dd };
    var flowGroup = new T.Group(); scene.add(flowGroup); W.flowGroup = flowGroup;
    var chevGeo = new T.ConeGeometry(0.075, 0.22, 3); chevGeo.rotateX(PI / 2); chevGeo.rotateY(0);
    function addFlow(id, pts, y, opt) {
      opt = opt || {};
      var col = W.FLOWCOL[id], L = pathLen(pts), n = Math.max(2, Math.round(L / (opt.gap || 1.3)));
      var mat = new T.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.95 });
      var im = new T.InstancedMesh(chevGeo, mat, n); im.frustumCulled = false; im.renderOrder = 5; flowGroup.add(im);
      var lp = []; pts.forEach(function (p) { lp.push(new T.Vector3(p[0], y + 0.01, p[1])); });
      var line = new T.Line(new T.BufferGeometry().setFromPoints(lp), new T.LineBasicMaterial({ color: col, transparent: true, opacity: 0.45 })); flowGroup.add(line);
      var f = { id: id, pts: pts, y: y, L: L, n: n, im: im, mat: mat, line: line, speed: opt.speed || 0.7, on: 1 }; W.flows.push(f); return f;
    }
    var dummy = new T.Object3D();
    W.tickers.push(function (dt, t) {
      W.flows.forEach(function (f) {
        if (!flowGroup.visible) return;
        for (var i = 0; i < f.n; i++) {
          var s = ((i / f.n) * f.L + t * f.speed) % f.L, p = W.pathAt(f.pts, s);
          dummy.position.set(p[0], f.y, p[1]); dummy.rotation.set(0, p[2], 0); dummy.updateMatrix(); f.im.setMatrixAt(i, dummy.matrix);
        }
        f.im.instanceMatrix.needsUpdate = true;
      });
    });
    var yF = 0.05;
    addFlow('convives', [[-6.9, -3.95], [-6.9, -3.3], [-5.6, -3.3]], yF, { gap: 0.9 });
    addFlow('convives', [[-5.6, -3.3], [-4.3, -2.5], [-4.3, 1.9], [-15.5, 1.9], [-16.6, 1.9]], yF, { gap: 1.4 });
    addFlow('plateaux', PATH_T, Y_TC + 0.07, { speed: 0.8, gap: 1.2 });
    addFlow('dechets', [[1.45, -2.2], [1.95, -1.9], [2.45, -1.7]], 1.2, { gap: 0.5 });
    addFlow('vaisselle', [[PREP.x, PREP.z], [W.TF.x1, PREP.z], [ENTRY.x, ENTRY.z], [MX0, MZ], [MX1, MZ], [EXIT.x, EXIT.z]], Y_TC + 0.07, { speed: 0.6, gap: 1.0 });
    addFlow('propre', joinPts([[EXIT.x, EXIT.z]], PATH_R), Y_TC + 0.07, { speed: 0.6, gap: 1.0 });
    addFlow('propre', [[18.2, 2.85], [17.4, 2.6], [0.5, 2.6], [-0.2, 3.7], [-2.0, 3.7], [-3.4, 4.4], [-3.4, 5.9]], yF, { gap: 1.5, speed: 0.9 });
    addFlow('operateurs', [[-1.2, -2.2], [1.4, -1.6], [3.4, -1.6]], yF + 0.02, { gap: 1.4, speed: 0.5 });
    addFlow('operateurs', [[8.55, 0.75], [12.77, 0.75], [17.43, 0.75]], yF + 0.02, { gap: 1.6, speed: 0.5 });
    W.setFlowsVisible = function (v) { flowGroup.visible = !!v; };
    W.dimFlows = function (ids) { W.flows.forEach(function (f) { var on = !ids || ids.indexOf(f.id) >= 0; f.mat.opacity = on ? 0.95 : 0.18; f.line.material.opacity = on ? 0.5 : 0.1; }); };

    /* =====================================================================
       PLANS CAO AU SOL (vue technique) — gabarits issus des SVG convertis des DWG
       ===================================================================== */
    var planGroup = new T.Group(); planGroup.visible = false; scene.add(planGroup); W.planGroup = planGroup;
    W.planLoaded = 0;
    function planTex(code, long, short, cb) {
      var img = new Image(); img.onload = function () {
        try {
          var cw = 1024, ch = Math.max(64, Math.round(1024 * short / long)), c = document.createElement('canvas'); c.width = cw; c.height = ch; var g = c.getContext('2d');
          var vertical = img.height > img.width && long >= short;
          if (vertical) { g.translate(cw / 2, ch / 2); g.rotate(-PI / 2); g.drawImage(img, -ch / 2, -cw / 2, ch, cw); } else g.drawImage(img, 0, 0, cw, ch);
          var tx = new T.CanvasTexture(c); tx.anisotropy = 4; cb(tx);
        } catch (e) { /* canvas contaminé (file://) : pas de gabarit */ }
      }; img.src = 'assets/img/cao-hd/' + code + '.svg';
    }
    W.addPlan = function (code, cx, cz, long, short, axisX) {
      var d = DIMS[code]; if (!d) return;
      planTex(code, long, short, function (tx) {
        var m = new T.Mesh(new T.PlaneGeometry(long, short), new T.MeshBasicMaterial({ map: tx, transparent: true, depthWrite: false, opacity: 0.95 }));
        m.rotation.x = -PI / 2; if (!axisX) m.rotation.z = PI / 2; m.position.set(cx, 0.03, cz); m.renderOrder = 4; planGroup.add(m); W.planLoaded++;
      });
    };
    [0.5, 2.5].forEach(function (x0) { W.addPlan('TRISTA3d', x0 + TS.l / 2, -3.4 + A2.w / 2 + 0.06 + TS.w / 2, TS.l, TS.w, true); });
    W.addPlan('TL1150', PREP.x, PREP.z, TL.l, TL.w, true); W.addPlan('TL0644d', ENTRY.x, ENTRY.z, TE.l, TE.w, true); W.addPlan('TL1150', EXIT.x, EXIT.z, TL.l, TL.w, true);
    W.addPlan('A2VI90d', 7.0 + RB / 2 + 0.1, -3.4 + RB / 2, VI.l, VI.w, true);
    W.addPlan('G20', 0.0, -2.55, G20.l, G20.w, true); W.addPlan('H10', 0.0, -3.4, H10.l, H10.w, true);
    W.addPlan('DC', LX, LZ, DC.l, DC.w, false);
    W.addPlan('D400', 3.0, 7.05, SH.l, SH.w, true);

    /* =====================================================================
       MURS (découpe automatique) + ROOT-LOOP
       ===================================================================== */
    var camV = new T.Vector3();
    W.updateWalls = function (dt) {
      var p = camera.position, inside = p.x > B.x0 && p.x < B.x1 && p.z > B.z0 && p.z < B.z1 && p.y < B.H - 0.3;
      W.inside = inside; roof.visible = inside;
      wallGroups.forEach(function (g) {
        var tgt = 1;
        if (!inside) {
          var n = g.userData.n, c = g.userData.c;
          if (g.userData.kind === 'ext') { var dv = n[0] * (p.x - c[0]) + n[1] * (p.z - c[1]); if (dv > 0) tgt = 0.07; if (p.y > 36) tgt = 0.07; }
          else if (p.y > 14) tgt = 0.3;
        }
        g.userData.s += (tgt - g.userData.s) * Math.min(1, dt * 6); g.scale.y = Math.max(0.02, g.userData.s);
      });
    };

    /* éclaté */
    W.setExplode = function (on) { W.exTarget = on ? 1 : 0; };
    W.tickers.push(function (dt) {
      if (Math.abs(W.exTarget - W.exploded) > 0.001) {
        W.exploded += (W.exTarget - W.exploded) * Math.min(1, dt * 4);
        W.explodables.forEach(function (e) { e.o.position.copy(e.base).addScaledVector(e.off, W.exploded); });
      }
    });

    /* coupe : plan de coupe global */
    var clipPlane = new T.Plane(new T.Vector3(0, 0, -1), 0);
    W.setClip = function (zc) { renderer.clippingPlanes = zc == null ? [] : [clipPlane]; if (zc != null) clipPlane.constant = zc; renderer.localClippingEnabled = false; };

    /* caméra animée (jamais bloquante) */
    var fly = null;
    function ease(u) { return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; }
    W.flyTo = function (pos, tgt, dur, after) {
      if (reduce) dur = 0.01;
      W.lastFly = { p: pos.slice ? pos.slice() : pos, t: tgt.slice ? tgt.slice() : tgt };
      fly = { p0: camera.position.clone(), t0: controls.target.clone(), p1: new T.Vector3().fromArray(pos), t1: new T.Vector3().fromArray(tgt), u: 0, dur: dur || 1.8, after: after };
    };
    controls.addEventListener('start', function () { fly = null; W.userActed = true; if (W.onUser) W.onUser(); });
    W.tickers.push(function (dt) {
      if (!fly) return;
      fly.u += dt / fly.dur; var k = ease(Math.min(1, fly.u));
      camera.position.lerpVectors(fly.p0, fly.p1, k); controls.target.lerpVectors(fly.t0, fly.t1, k);
      if (fly.u >= 1) { var a = fly.after; fly = null; if (a) a(); }
    });

    /* projection des étiquettes DOM */
    W.project = function (x, y, z) { camV.set(x, y, z).project(camera); return camV; };

    /* sélection par clic (équipements) */
    var ray = new T.Raycaster(), ndc = new T.Vector2();
    W.pick = function (clientX, clientY) {
      var r = renderer.domElement.getBoundingClientRect();
      ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, camera);
      var objs = []; W.all.forEach(function (e) { if (e.cat === 'sopa' || e.cat === 'third') objs.push(e.mesh); });
      var hit = ray.intersectObjects(objs, false)[0]; if (!hit) return null;
      for (var i = 0; i < W.all.length; i++) if (W.all[i].mesh === hit.object) return W.all[i].owner ? W.all[i].owner.name : null;
      return null;
    };


    /* ---------- fusion des maillages statiques (réduit le nombre d'appels de rendu) ---------- */
    W.mergeStatic = function () {
      scene.updateMatrixWorld(true);
      var roots = [], rootSet = {};
      Object.keys(W.ITEMS).forEach(function (k) { roots.push(W.ITEMS[k].g); });
      W.explodables.forEach(function (e) { roots.push(e.o); });
      roots.forEach(function (r) { rootSet[r.uuid] = r; });
      function rootOf(o) { var p = o.parent; while (p) { if (rootSet[p.uuid]) return p; p = p.parent; } return null; }
      var groups = {}, inv = new T.Matrix4(), rel = new T.Matrix4();
      W.all.forEach(function (e) {
        var m = e.mesh; if (m.isInstancedMesh || m.isSprite || m.matrixAutoUpdate !== false || m.userData.dyn || !m.geometry || !m.geometry.attributes.position) return;
        var r = rootOf(m); if (!r) return;
        var k = r.uuid + '|' + e.mat0.uuid + '|' + e.cat + '|' + (e.owner && e.owner.name || '') + '|' + (m.castShadow ? 1 : 0) + (m.receiveShadow ? 1 : 0);
        (groups[k] = groups[k] || { root: r, list: [] }).list.push(e);
      });
      var removed = {}, added = [];
      Object.keys(groups).forEach(function (k) {
        var g = groups[k], L = g.list; if (L.length < 3) return;
        var nv = 0, ni = 0; L.forEach(function (e) { var ge = e.mesh.geometry; nv += ge.attributes.position.count; ni += ge.index ? ge.index.count : ge.attributes.position.count; });
        var pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), uv = new Float32Array(nv * 2), idx = new (nv > 65000 ? Uint32Array : Uint16Array)(ni), vo = 0, io = 0;
        inv.copy(g.root.matrixWorld).invert();
        var nm = new T.Matrix3();
        L.forEach(function (e) {
          var m = e.mesh, ge = m.geometry; rel.multiplyMatrices(inv, m.matrixWorld); nm.getNormalMatrix(rel);
          var P = ge.attributes.position, N = ge.attributes.normal, U = ge.attributes.uv, v = new T.Vector3();
          for (var i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i).applyMatrix4(rel); pos[(vo + i) * 3] = v.x; pos[(vo + i) * 3 + 1] = v.y; pos[(vo + i) * 3 + 2] = v.z; if (N) { v.fromBufferAttribute(N, i).applyMatrix3(nm).normalize(); nor[(vo + i) * 3] = v.x; nor[(vo + i) * 3 + 1] = v.y; nor[(vo + i) * 3 + 2] = v.z; } if (U) { uv[(vo + i) * 2] = U.getX(i); uv[(vo + i) * 2 + 1] = U.getY(i); } }
          if (ge.index) for (var j = 0; j < ge.index.count; j++) idx[io + j] = ge.index.getX(j) + vo; else for (var j2 = 0; j2 < P.count; j2++) idx[io + j2] = vo + j2;
          vo += P.count; io += ge.index ? ge.index.count : P.count; removed[m.uuid] = 1; m.parent.remove(m);
        });
        var bg = new T.BufferGeometry(); bg.setAttribute('position', new T.BufferAttribute(pos, 3)); bg.setAttribute('normal', new T.BufferAttribute(nor, 3)); bg.setAttribute('uv', new T.BufferAttribute(uv, 2)); bg.setIndex(new T.BufferAttribute(idx, 1)); bg.computeBoundingSphere();
        var e0 = L[0], mm = new T.Mesh(bg, e0.mat0); mm.castShadow = e0.mesh.castShadow; mm.receiveShadow = e0.mesh.receiveShadow; mm.matrixAutoUpdate = false; g.root.add(mm);
        added.push({ mesh: mm, cat: e0.cat, owner: e0.owner, mat0: e0.mat0 });
      });
      W.all = W.all.filter(function (e) { return !removed[e.mesh.uuid]; }).concat(added);
      W.restyle();
    };

    /* ---------- boucle ---------- */
    function resize() {
      var w = stage.clientWidth || 800, h = stage.clientHeight || 500;
      renderer.setSize(w, h, false); renderer.domElement.style.width = '100%'; renderer.domElement.style.height = '100%';
      camera.aspect = w / h; camera.updateProjectionMatrix(); W.aspect = w / h;
    }
    if (window.ResizeObserver) new ResizeObserver(resize).observe(stage); else window.addEventListener('resize', resize);
    resize();
    var visible = true; if (window.IntersectionObserver) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }).observe(stage);
    var clock = new T.Clock(), tt = 0, ready = false;
    W.frameCount = 0;
    function loop() {
      requestAnimationFrame(loop);
      if (!visible || document.hidden) { clock.getDelta(); return; }
      var dt = Math.min(0.25, clock.getDelta()); if (W.paused) dt = 0; tt += dt; W.time = tt;
      W.tickers.forEach(function (f) { f(dt, tt); });
      controls.update(); W.updateWalls(Math.min(0.05, dt || 0.016)); W.adapt(dt);
      renderer.render(scene, camera); W.frameCount++;
    }
    var slow = 0, nAd = 0;
    W.adapt = function (dt) {        // qualité adaptative : si l'appareil est lent, on retire ombres et haute définition
      if (W.degraded || !dt) return; nAd++; if (nAd < 40) return;
      if (dt > 0.045) slow++; else slow = Math.max(0, slow - 1);
      if (slow > 70) { W.degraded = true; renderer.setPixelRatio(1); renderer.shadowMap.enabled = false; W.all.forEach(function (e) { if (e.mesh.material) e.mesh.material.needsUpdate = true; }); }
    };
    W.start = function () { if (!ready) { ready = true; loop(); } };
    W.dispose = function () { ready = false; };
    W.setPaused = function (p) { W.paused = !!p; };
    W.begin = begin; W.end = end; W.place = place;
    W.mergeStatic();
    return W;
  };
})();
