/* SOPACOM — Scène 3D de laverie complète (Three.js r128), module partagé.
   Maquette de principe : ne reproduit pas un modèle Sopacom.
   window.Laverie3D(stage, { theme:'dark'|'light', labels:HTMLElement, clickableLabels:bool,
                              autoTour:bool, viewOffset:number, onStep:fn, zoom:bool }) */
(function () {
  'use strict';
  window.Laverie3D = function (stage, opt) {
    opt = opt || {};
    var T = window.THREE, dark = opt.theme === 'dark', br = !!opt.bright;
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var fine = window.matchMedia('(pointer: fine)').matches;
    var renderer;
    try { if (!T) throw 0; renderer = new T.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' }); }
    catch (e) { return null; }

    var small = window.innerWidth < 760;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, small ? 1.5 : 1.75));
    renderer.toneMapping = T.NoToneMapping;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFSoftShadowMap;
    stage.insertBefore(renderer.domElement, stage.firstChild);

    var BG = dark ? 0x0c0c0d : 0xF4F0E8;
    var scene = new T.Scene();
    scene.background = new T.Color(BG);
    scene.fog = new T.Fog(BG, dark ? 26 : 38, dark ? 58 : 70);
    var camera = new T.PerspectiveCamera(30, 1, 0.1, 200);
    var controls = new T.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.dampingFactor = 0.07;
    controls.minDistance = 6; controls.maxDistance = 48;
    controls.maxPolarAngle = Math.PI * 0.47;
    controls.screenSpacePanning = true;
    if (opt.zoom === false) { controls.enableZoom = false; controls.enablePan = false; controls.enableRotate = fine; }

    /* ---------- Environnement (reflets de l'inox) ---------- */
    var pm = new T.PMREMGenerator(renderer), env = new T.Scene();
    env.add(new T.Mesh(new T.BoxGeometry(40, 40, 40), new T.MeshBasicMaterial({ color: dark ? (br ? 0x3a3a41 : 0x26262a) : 0xa39d92, side: T.BackSide })));
    function soft(w, h, col, k, x, y, z) { var m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ color: new T.Color(col).multiplyScalar(k), side: T.DoubleSide })); m.position.set(x, y, z); m.lookAt(0, 0, 0); env.add(m); }
    if (dark) { soft(22, 6, 0xffffff, 3.6, 0, 15, 0); soft(12, 9, 0xffffff, 1.7, -15, 5, 6); soft(8, 10, 0xF68E1D, 2.0, 15, 4, -6); soft(16, 4, 0xffffff, 1.2, 0, 3, -15); soft(14, 5, 0xffffff, 1.0, 0, 4, 15); }
    else { soft(20, 6, 0xffffff, 1.6, 0, 15, 0); soft(12, 8, 0xffffff, .9, -15, 5, 6); soft(10, 8, 0xffffff, .35, 15, 6, -6); soft(16, 4, 0xffffff, .6, 0, 4, 15); }
    scene.environment = pm.fromScene(env, 0.04).texture;

    scene.add(new T.HemisphereLight(0xffffff, dark ? (br ? 0x2a2a2e : 0x101012) : 0xcfc6b6, dark ? (br ? 0.95 : 0.42) : 0.5));
    var sun = new T.DirectionalLight(0xfff6ea, dark ? (br ? 1.6 : 1.25) : 0.62);
    sun.position.set(-6, 16, 10); sun.castShadow = true;
    sun.shadow.mapSize.set(small ? 1024 : 2048, small ? 1024 : 2048);
    var sc = sun.shadow.camera; sc.left = -16; sc.right = 16; sc.top = 12; sc.bottom = -12; sc.near = 1; sc.far = 50;
    sun.shadow.bias = -0.0005; sun.shadow.radius = 5;
    scene.add(sun);
    if (dark) {
      var warm = new T.PointLight(0xF68E1D, 1.6, 14, 2); warm.position.set(8.2, 3.2, 3.6); scene.add(warm);
      var rim = new T.DirectionalLight(0xcfe0ff, br ? 0.6 : 0.35); rim.position.set(8, 6, -12); scene.add(rim);
      if (br) { var fill = new T.DirectionalLight(0xffffff, 0.6); fill.position.set(12, 9, 14); scene.add(fill); }
    }

    /* ---------- Sol ---------- */
    if (dark) {
      var fl = new T.Mesh(new T.PlaneGeometry(120, 120), new T.MeshStandardMaterial({ color: br ? 0x1f2024 : 0x121214, metalness: 0.12, roughness: 0.7, envMapIntensity: 0.1 }));
      fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true; scene.add(fl);
      var gd = new T.GridHelper(80, 80, br ? 0x6a4216 : 0x3a2410, br ? 0x34353b : 0x1f1f22); gd.position.y = 0.002; gd.material.transparent = true; gd.material.opacity = 0.7; scene.add(gd);
    } else {
      var fl2 = new T.Mesh(new T.PlaneGeometry(120, 120), new T.ShadowMaterial({ opacity: 0.16 }));
      fl2.rotation.x = -Math.PI / 2; fl2.receiveShadow = true; scene.add(fl2);
      var gd2 = new T.GridHelper(60, 60, 0xd8d0c1, 0xe3dccf); gd2.position.y = 0.002; scene.add(gd2);
      var slab = new T.Mesh(new T.BoxGeometry(24, 0.06, 9), new T.MeshStandardMaterial({ color: 0xd9d1c3, roughness: 0.95 }));
      slab.position.set(2.2, 0.03, -0.6); slab.receiveShadow = true; scene.add(slab);
    }

    /* ---------- Matériaux par groupe (pour l'isolement) ---------- */
    function M(group) {
      var mats = {
        steel: new T.MeshStandardMaterial({ color: dark ? 0xe6e9ec : 0xe2e5e8, metalness: dark ? 0.9 : 0.6, roughness: dark ? 0.24 : 0.3 }),
        steelD: new T.MeshStandardMaterial({ color: dark ? 0xb4b9bf : 0xb4b9be, metalness: dark ? 0.85 : 0.6, roughness: dark ? 0.34 : 0.42 }),
        orange: new T.MeshStandardMaterial({ color: 0xE06F0A, metalness: 0.05, roughness: 0.55 }),
        dark: new T.MeshStandardMaterial({ color: 0x2f3034, metalness: 0.3, roughness: 0.6 }),
        wall: new T.MeshStandardMaterial({ color: dark ? (br ? 0x45464c : 0x2a2b2f) : 0xf2eee6, roughness: 0.9 }),
        red: new T.MeshStandardMaterial({ color: 0xc0392b, roughness: 0.5 }),
        yellow: new T.MeshStandardMaterial({ color: 0xe0b419, roughness: 0.5 }),
        green: new T.MeshStandardMaterial({ color: 0x2f9e44, roughness: 0.5 }),
        glass: new T.MeshStandardMaterial({ color: 0x9fb6c2, metalness: 0.1, roughness: 0.1, transparent: true, opacity: 0.3 }),
        glow: new T.MeshBasicMaterial({ color: 0xff9a2e })
      };
      group.userData.mats = [];
      Object.keys(mats).forEach(function (k) { mats[k].userData.base = mats[k].opacity; group.userData.mats.push(mats[k]); });
      return mats;
    }
    function box(g, w, h, d, x, y, z, m, sh) { var o = new T.Mesh(new T.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.castShadow = sh !== false; o.receiveShadow = true; g.add(o); return o; }
    function cyl(g, r, h, x, y, z, m, ax, seg) { var o = new T.Mesh(new T.CylinderGeometry(r, r, h, seg || 16), m); if (ax === 'x') o.rotation.z = Math.PI / 2; if (ax === 'z') o.rotation.x = Math.PI / 2; o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; g.add(o); return o; }
    var explodables = [];
    function explode(o, dx, dy, dz) { explodables.push({ o: o, base: o.position.clone(), off: new T.Vector3(dx, dy, dz) }); }
    function legs(g, m, x0, x1, z, w, h, n) { var k = n || Math.max(2, Math.round((x1 - x0) / 1.8) + 1), p = []; for (var i = 0; i < k; i++) { var x = x0 + (x1 - x0) * i / (k - 1); p.push(cyl(g, .035, h, x, h / 2, z - w / 2 + .06, m), cyl(g, .035, h, x, h / 2, z + w / 2 - .06, m)); } return p; }
    function glowLine(g, m, x0, z0, x1, z1) { if (!dark) return; var L = Math.hypot(x1 - x0, z1 - z0), o = box(g, L, 0.012, 0.02, (x0 + x1) / 2, 0.02, (z0 + z1) / 2, m, false); o.rotation.y = -Math.atan2(z1 - z0, x1 - x0); }

    var groups = [];
    function G(i) { var g = new T.Group(); g.userData.step = i; scene.add(g); groups[i] = g; return g; }
    var Z = -2.4, H = 0.9, wallZ = -3.05, wins = [-7, -5, -3], TRX = 8.25, LZ = 2.45, LH = 3.3, TOP = 2.9;

    /* 01 — Dépose */
    var g1 = G(1), m1 = M(g1);
    var xs = [-8.6, -7.55, -6.45, -5.55, -4.45, -3.55, -2.45, -1.6];
    for (var i = 0; i < xs.length - 1; i += 2) box(g1, xs[i + 1] - xs[i], 2.6, 0.12, (xs[i] + xs[i + 1]) / 2, 1.3, wallZ, m1.wall);
    wins.forEach(function (wx) { box(g1, .9, .9, .12, wx, .45, wallZ, m1.wall); box(g1, .9, 1.1, .12, wx, 2.05, wallZ, m1.wall); box(g1, .95, .04, .5, wx, .92, wallZ + .1, m1.steel); });
    box(g1, 7.4, .12, .62, -4.9, H - .06, Z, m1.steel);
    var sk = box(g1, 7.4, .22, .02, -4.9, H - .2, Z + .31, m1.steelD);
    var cA = cyl(g1, .022, 7.3, -4.9, H + .02, Z - .2, m1.orange, 'x', 10), cB = cyl(g1, .022, 7.3, -4.9, H + .02, Z + .2, m1.orange, 'x', 10);
    explode(cA, 0, .55, -.2); explode(cB, 0, .55, .2); explode(sk, 0, -.1, .5);
    legs(g1, m1.steelD, -8.4, -1.4, Z, .5, H - .12).forEach(function (p) { explode(p, 0, -.35, 0); });
    glowLine(g1, m1.glow, -8.4, Z + .5, -1.4, Z + .5);

    /* 02 — Tri sélectif */
    var g2 = G(2), m2 = M(g2);
    box(g2, 1.5, .06, 1.1, -.45, H, Z - .1, m2.steel);
    [[-.95, m2.red], [-.45, m2.yellow], [.05, m2.green]].forEach(function (b) { var bin = cyl(g2, .19, .62, b[0], H - .36, Z - .35, b[1], null, 20); explode(bin, 0, -.5, -.4); cyl(g2, .2, .03, b[0], H + .035, Z - .35, m2.dark, null, 20); });
    legs(g2, m2.steelD, -1.1, .2, Z - .1, 1.0, H - .03, 2);
    var th = box(g2, 1.5, .05, .5, -.45, 1.9, Z - .55, m2.steelD); explode(th, 0, .6, 0);
    cyl(g2, .03, 1.0, -1.15, 1.4, Z - .55, m2.steelD); cyl(g2, .03, 1.0, .25, 1.4, Z - .55, m2.steelD);

    /* 03 — Transport : convoyeur à palettes */
    var g3 = G(3), m3 = M(g3);
    box(g3, 3.0, .16, .66, 1.95, H - .1, Z, m3.steel);
    box(g3, 3.0, .12, .03, 1.95, H + .04, Z - .34, m3.steelD); box(g3, 3.0, .12, .03, 1.95, H + .04, Z + .34, m3.steelD);
    legs(g3, m3.steelD, .6, 3.3, Z, .55, H - .18, 3);
    var pal = new T.Group(); g3.add(pal);
    var PAL = 22, palGeo = new T.CylinderGeometry(.11, .11, .025, 20, 1, false, 0, Math.PI);
    for (var p = 0; p < PAL; p++) { var pp = new T.Mesh(palGeo, m3.orange); pp.rotation.y = Math.PI / 2; pp.castShadow = true; pp.position.set(.5 + p * .135, H + .005, Z); pp.scale.set(1, 1, 2.4); pal.add(pp); }
    explode(pal, 0, .5, 0);
    glowLine(g3, m3.glow, .4, Z + .5, 3.4, Z + .5);

    /* 04 — Lavage */
    var g4 = G(4), m4 = M(g4);
    box(g4, 4.1, 1.15, 1.0, 5.55, 1.0, Z, m4.steel);
    var hood = new T.Group(); g4.add(hood);
    box(hood, 4.1, .75, 1.05, 5.55, 1.95, Z, m4.steel); box(hood, .9, .35, .6, 4.6, 2.5, Z, m4.steelD); cyl(hood, .18, .4, 6.6, 2.5, Z, m4.steelD);
    explode(hood, 0, 1.6, 0);
    box(g4, 4.1, .42, 1.0, 5.55, .21, Z, m4.steelD);
    box(g4, .02, .5, .62, 3.49, H + .25, Z, m4.dark, false); box(g4, .02, .5, .62, 7.61, H + .25, Z, m4.dark, false);
    box(g4, .5, .35, .06, 6.9, 1.55, Z + .53, m4.dark);
    if (dark) box(g4, .3, .04, .01, 6.9, 1.62, Z + .565, m4.glow, false);
    var tabIn = box(g4, .5, .05, 1.0, 3.25, H - .02, Z + .95, m4.steel); legs(g4, m4.steelD, 3.1, 3.4, Z + .95, .9, H - .05, 2); explode(tabIn, 0, 0, .5);
    glowLine(g4, m4.glow, 3.5, Z + .55, 7.6, Z + .55);

    /* 05 — Sortie, élévateur, stockage */
    var g5 = G(5), m5 = M(g5);
    var rf = new T.Group(); g5.add(rf);
    box(rf, .05, .12, 4.4, TRX - .36, H - .04, -.3, m5.steel); box(rf, .05, .12, 4.4, TRX + .36, H - .04, -.3, m5.steel);
    var rollers = new T.Group(); g5.add(rollers);
    for (var r = 0; r < 26; r++) cyl(rollers, .035, .68, TRX, H, Z + .15 + r * .16, m5.steelD, 'x', 12);
    explode(rollers, 0, .45, 0);
    for (var lz = -2.2; lz <= 1.8; lz += 2) { cyl(g5, .035, H - .08, TRX - .32, (H - .08) / 2, lz, m5.steelD); cyl(g5, .035, H - .08, TRX + .32, (H - .08) / 2, lz, m5.steelD); }
    box(g5, .66, .06, .7, TRX, H - .03, Z, m5.steel);
    var posts = new T.Group(); g5.add(posts);
    [[-.42, -.42], [.42, -.42], [-.42, .42], [.42, .42]].forEach(function (c) { box(posts, .08, LH, .08, TRX + c[0], LH / 2, LZ + c[1], m5.steel); });
    box(posts, .95, .1, .95, TRX, LH + .05, LZ, m5.steelD);
    if (dark) { box(posts, .025, LH - .3, .025, TRX + .47, LH / 2, LZ - .42, m5.glow, false); box(posts, .025, LH - .3, .025, TRX + .47, LH / 2, LZ + .42, m5.glow, false); }
    explode(posts, 0, 0, .9);
    var cab = new T.Group(); g5.add(cab);
    box(cab, .72, .05, .72, 0, 0, 0, m5.dark); box(cab, .72, .05, .05, 0, .12, .34, m5.orange);
    cab.position.set(TRX, H, LZ);
    var mz = box(g5, 2.6, .08, 1.2, TRX + 1.9, TOP - .04, LZ, m5.steelD);
    [[.75, -.55], [3.05, -.55], [.75, .55], [3.05, .55]].forEach(function (c) { cyl(g5, .04, TOP - .08, TRX + c[0], (TOP - .08) / 2, LZ + c[1], m5.steelD); });
    box(g5, 2.6, .5, .03, TRX + 1.9, TOP + .25, LZ - .6, m5.glass);
    explode(mz, .6, .4, 0);
    glowLine(g5, m5.glow, TRX + .55, Z, TRX + .55, LZ - .6);

    /* ---------- Objets mobiles ---------- */
    var mov = new T.Group(); scene.add(mov);
    var mTray = new T.MeshStandardMaterial({ color: 0xf7f5f0, roughness: .4 }), mPlate = new T.MeshStandardMaterial({ color: 0xffffff, roughness: .15 });
    var mRA = new T.MeshStandardMaterial({ color: 0xE06F0A, roughness: .55 }), mRB = new T.MeshStandardMaterial({ color: dark ? 0x8a9097 : 0x6b7178, roughness: .55 });
    function tray() { var g = new T.Group(), t = new T.Mesh(new T.BoxGeometry(.46, .025, .34), mTray); t.castShadow = true; g.add(t); var pl = new T.Mesh(new T.CylinderGeometry(.1, .08, .02, 24), mPlate); pl.position.set(-.08, .025, 0); pl.castShadow = true; g.add(pl); var gl = new T.Mesh(new T.CylinderGeometry(.03, .025, .08, 12), mPlate); gl.position.set(.14, .05, .08); g.add(gl); return g; }
    function rack(m) {
      var g = new T.Group(), s = .5, h = .18, b = .025;
      [[0, b / 2, s / 2 - b / 2, s, b, b], [0, b / 2, -s / 2 + b / 2, s, b, b], [s / 2 - b / 2, b / 2, 0, b, b, s], [-s / 2 + b / 2, b / 2, 0, b, b, s], [0, h, s / 2 - b / 2, s, b, b], [0, h, -s / 2 + b / 2, s, b, b], [s / 2 - b / 2, h, 0, b, b, s], [-s / 2 + b / 2, h, 0, b, b, s]].forEach(function (q) { var o = new T.Mesh(new T.BoxGeometry(q[3], q[4], q[5]), m); o.position.set(q[0], q[1], q[2]); o.castShadow = true; g.add(o); });
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (c) { var o = new T.Mesh(new T.BoxGeometry(b, h, b), m); o.position.set(c[0] * (s / 2 - b / 2), h / 2, c[1] * (s / 2 - b / 2)); g.add(o); });
      for (var k = 0; k < 5; k++) { var pl = new T.Mesh(new T.CylinderGeometry(.09, .08, .012, 20), mPlate); pl.rotation.z = Math.PI / 2 - .1; pl.position.set(-.16 + k * .08, .1, 0); g.add(pl); }
      return g;
    }
    var PATH = [[.55, H + .02, Z, 3.2], [3.45, H + .02, Z, 4.6], [7.65, H + .02, Z, .9], [TRX, H + .02, Z, 4.2], [TRX, H + .02, LZ - .05, .6], [TRX, H + .05, LZ, 3.0], [TRX, TOP + .02, LZ, 1.0], [TRX + 1.1, TOP + .02, LZ, 2.4], [TRX + 3.0, TOP + .02, LZ, 0]];
    var segT = [], tot = 0; PATH.forEach(function (q) { segT.push(tot); tot += q[3]; }); var RT = tot;
    function rackPos(t, o) { for (var i = 0; i < PATH.length - 1; i++) { var a = PATH[i], b = PATH[i + 1]; if (t <= segT[i] + a[3] || i === PATH.length - 2) { var k = Math.min(1, Math.max(0, (t - segT[i]) / a[3])); return o.set(a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k); } } return o; }
    var racks = [], trays = [];
    for (var q = 0; q < 6; q++) { var rk = rack(q % 2 ? mRB : mRA); rk.userData.t = -q * (RT / 6); mov.add(rk); racks.push(rk); }
    for (var w = 0; w < 7; w++) { var tr = tray(); tr.userData.x = wins[w % 3]; tr.userData.d = w * 1.15; mov.add(tr); trays.push(tr); }

    /* ---------- Flèches de flux ---------- */
    var flow = new T.Group(); scene.add(flow);
    var aMat = new T.MeshBasicMaterial({ color: 0xF68E1D, transparent: true, opacity: .9 }), aGeo = new T.ConeGeometry(.07, .18, 3); aGeo.rotateZ(-Math.PI / 2);
    var FP = [[-7.6, Z + .55], [-.8, Z + .55], [.4, Z + .55], [7.8, Z + .55], [TRX + .55, Z + .55], [TRX + .55, LZ - .6]], FL = [], ft = 0;
    for (var f = 0; f < FP.length - 1; f++) { FL.push(Math.hypot(FP[f + 1][0] - FP[f][0], FP[f + 1][1] - FP[f][1])); ft += FL[f]; }
    var arrows = []; for (var a = 0; a < 46; a++) { var ar = new T.Mesh(aGeo, aMat); ar.userData.s = a / 46 * ft; flow.add(ar); arrows.push(ar); }
    function flowAt(s, o) { s = ((s % ft) + ft) % ft; for (var i = 0; i < FL.length; i++) { if (s <= FL[i]) { var A = FP[i], B = FP[i + 1], k = s / FL[i]; o.position.set(A[0] + (B[0] - A[0]) * k, .05, A[1] + (B[1] - A[1]) * k); o.rotation.y = -Math.atan2(B[1] - A[1], B[0] - A[0]); return; } s -= FL[i]; } }

    /* ---------- Étiquettes ---------- */
    var LABELS = [[1, 'Dépose', -5, 2.9, wallZ], [2, 'Tri sélectif', -.45, 2.3, Z - .5], [3, 'Transport', 1.95, 1.5, Z], [4, 'Lavage', 5.55, 3.0, Z], [5, 'Sortie & stockage', TRX + .8, TOP + .9, LZ]];
    var labelEls = [];
    if (opt.labels) labelEls = LABELS.map(function (L) {
      var el = document.createElement(opt.clickableLabels ? 'button' : 'span');
      el.innerHTML = '<b>0' + L[0] + '</b> ' + L[1];
      if (opt.clickableLabels) { el.type = 'button'; el.setAttribute('aria-label', 'Étape 0' + L[0] + ' : ' + L[1]); el.addEventListener('click', function () { api.select(L[0], true); }); }
      opt.labels.appendChild(el); return el;
    });
    var tv = new T.Vector3();

    /* ---------- Caméra ---------- */
    var VIEWS = [{ p: [-4.5, 19, 25], t: [2.8, .6, -.2] }, { p: [-8.2, 5.4, 6.2], t: [-4.6, .9, -2.6] }, { p: [-3.6, 5.0, 4.6], t: [-.4, 1.0, -2.4] }, { p: [-.6, 5.0, 5.2], t: [2.2, .9, -2.4] }, { p: [2.0, 6.0, 7.2], t: [5.6, 1.3, -2.2] }, { p: [4.4, 6.6, 8.2], t: [9.0, 1.6, .4] }];
    var tw = null;
    if (opt.overview) VIEWS[0] = opt.overview;
    function viewFor(i) { var v0 = VIEWS[i] || VIEWS[0], k = (i ? 1.65 : 1) * (camera.aspect < 1 ? (i ? 1.9 : 1.35) : camera.aspect < 1.3 ? (i ? 1.3 : 1.12) : 1) * (opt.viewScale || 1); return { t: v0.t, p: v0.p.map(function (c, j) { return v0.t[j] + (c - v0.t[j]) * k; }) }; }
    function goView(i, inst) {
      var v = viewFor(i);
      if (!window.gsap || reduce || inst) { camera.position.set(v.p[0], v.p[1], v.p[2]); controls.target.set(v.t[0], v.t[1], v.t[2]); controls.update(); return; }
      if (tw) tw.forEach(function (x) { x.kill(); });
      tw = [gsap.to(camera.position, { x: v.p[0], y: v.p[1], z: v.p[2], duration: 1.8, ease: 'power3.inOut' }),
            gsap.to(controls.target, { x: v.t[0], y: v.t[1], z: v.t[2], duration: 1.8, ease: 'power3.inOut' })];
    }

    /* ---------- État ---------- */
    var st = { step: 0, flow: true, isolate: !!opt.isolateOnSelect, explode: 0, labels: true, paused: false };
    function isolation() {
      groups.forEach(function (g, i) { if (!g) return; var dim = st.isolate && st.step > 0 && i !== st.step;
        g.userData.mats.forEach(function (m) { var t = dim ? .1 : m.userData.base; m.transparent = dim || m.userData.base < 1; m.depthWrite = !dim; if (window.gsap && !reduce) gsap.to(m, { opacity: t, duration: .6 }); else m.opacity = t; }); });
    }
    function applyExplode(k) { explodables.forEach(function (e) { e.o.position.copy(e.base).addScaledVector(e.off, k); }); }

    /* ---------- Redimensionnement ---------- */
    function resize() {
      var w = stage.clientWidth, h = stage.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h;
      var off = opt.viewOffset || 0, narrow = w / h < 1.05;
      if (off && !narrow) camera.setViewOffset(w, h, -w * off, 0, w, h); else camera.clearViewOffset();
      camera.updateProjectionMatrix();
    }
    window.addEventListener('resize', resize); resize();

    /* ---------- Visite automatique ---------- */
    var idle = 0, tourT = 0, tourIdx = 0, userActed = false;
    controls.addEventListener('start', function () { idle = 0; userActed = true; });

    /* ---------- Boucle ---------- */
    var clock = new T.Clock(), t = 0, visible = true;
    if ('IntersectionObserver' in window) new IntersectionObserver(function (e) { visible = e[0].isIntersecting; }).observe(stage);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) clock.getDelta(); });
    function update(dt) {
      if (!st.paused && !reduce) t += dt;
      pal.children.forEach(function (x, i) { x.position.x = .5 + ((i * .135 + t * .6) % (PAL * .135)); });
      rollers.children.forEach(function (x) { x.rotation.x = -t * 4; });
      trays.forEach(function (tr) {
        var life = t - tr.userData.d; if (life < 0) { tr.visible = false; return; }
        var span = (-.95 - tr.userData.x) / .85 + 1.2, k = life % (span + 1.2), x = tr.userData.x + Math.max(0, k - .4) * .85;
        tr.visible = x < -.9; tr.position.set(Math.min(x, -.95), H + .04 + (k < .4 ? (.4 - k) * .6 : 0), k < .4 ? wallZ + .35 + k * 1.6 : Z);
      });
      var liftY = H;
      racks.forEach(function (rk) { var lt = ((t + rk.userData.t) % (RT + 2) + (RT + 2)) % (RT + 2); rk.visible = lt <= RT; rackPos(lt, rk.position); if (rk.position.x === TRX && rk.position.z === LZ) liftY = Math.max(liftY, rk.position.y - .02); });
      cab.position.y += (liftY - cab.position.y) * .12;
      if (st.flow) arrows.forEach(function (ar) { flowAt(ar.userData.s + t * 1.2, ar); });
      if (opt.autoTour && !reduce) {
        idle += dt;
        if (st.step === 0 && idle > 2) { // légère rotation lente en vue d'ensemble
          var ang = Math.sin(t * .08) * .0009; camera.position.applyAxisAngle(new T.Vector3(0, 1, 0), ang);
        }
        tourT += dt;
        if (idle > (userActed ? 14 : 3) && tourT > 6.5) { tourT = 0; tourIdx = (tourIdx + 1) % 6; api.select(tourIdx, false); }
      }
      if (labelEls.length && st.labels) {
        var w = stage.clientWidth, h = stage.clientHeight;
        LABELS.forEach(function (L, k) { tv.set(L[2], L[3], L[4]).project(camera); var el = labelEls[k], px = (tv.x + 1) / 2 * w, vis = tv.z < 1 && Math.abs(tv.x) < 1.05 && Math.abs(tv.y) < 1.05 && !(opt.labelMinX && w / h >= 1.05 && px < w * opt.labelMinX);
          el.style.opacity = vis ? (st.step && L[0] !== st.step ? (br ? .78 : .35) : 1) : 0; el.style.pointerEvents = vis ? '' : 'none';
          el.style.transform = 'translate(' + ((tv.x + 1) / 2 * w) + 'px,' + ((1 - tv.y) / 2 * h) + 'px) translate(-50%,-140%)'; el.classList.toggle('on', L[0] === st.step); });
      }
    }
    function loop() { requestAnimationFrame(loop); var dt = Math.min(clock.getDelta(), .05); if (!visible || document.hidden) return; controls.update(); update(dt); renderer.render(scene, camera); }

    var api = {
      select: function (i, byUser, inst) {
        if (byUser) { idle = 0; userActed = true; tourIdx = i; tourT = 0; }
        st.step = i; goView(i, inst); isolation(); if (opt.onStep) opt.onStep(i, byUser);
      },
      tool: function (name, on) {
        if (name === 'flow') { st.flow = on; flow.visible = on; }
        if (name === 'isolate') { st.isolate = on; isolation(); }
        if (name === 'explode') { var o = { k: st.explode }; st.explode = on ? 1 : 0; if (window.gsap && !reduce) gsap.to(o, { k: st.explode, duration: 1.4, ease: 'power3.inOut', onUpdate: function () { applyExplode(o.k); } }); else applyExplode(st.explode); }
        if (name === 'labels') { st.labels = on; if (opt.labels) opt.labels.style.display = on ? '' : 'none'; }
        if (name === 'pause') st.paused = on;
        if (name === 'reset') goView(st.step);
      },
      get step() { return st.step; }
    };
    goView(0, true);
    loop();
    return api;
  };
})();
