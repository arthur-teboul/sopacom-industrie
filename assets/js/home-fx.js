/* SOPACOM — Accueil : teaser « Fonctionnement » — mini-scène 3D légère (Three.js r128 déjà chargé par le hero).
   Contenu : un tronçon de convoyeur Technicord, des plateaux, une station de tri inox (TRISTA3), une table Tabling,
   un agent. Emprises en plan : blocs DWG A2010 (0,41 m), TRISTA3d (1,855 × 0,565 m), TL1150 (1,16 × 0,56 m).
   Hauteurs, matières et silhouette : représentation de principe. La scène n'est initialisée qu'à l'approche de la section
   et se met en pause hors écran. Sans WebGL : photo Sopacom ; « réduire les animations » : image fixe. */
(function () {
  'use strict';
  var stage = document.getElementById('hfxStage'); if (!stage) return;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* S3 : le conteneur d'aperçu des secteurs (app.js) crée une <img> sans src ; on lui donne une source vide valide. */
  var BLANK = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
  function fixBlank() { document.querySelectorAll('.hover-img img:not([src]), .lb img:not([src])').forEach(function (i) { i.src = BLANK; }); }
  document.addEventListener('DOMContentLoaded', fixBlank); window.addEventListener('load', fixBlank); if (document.readyState === 'complete') fixBlank();

  function webgl() { try { var c = document.createElement('canvas'); return !!(c.getContext('webgl') || c.getContext('experimental-webgl')); } catch (e) { return false; } }
  if (!webgl()) { stage.classList.add('hfx-nogl'); return; }           // photo Sopacom existante
  if (reduce) { stage.classList.add('hfx-still'); return; }            // image fixe
  var started = false;
  function go() { if (started) return; started = true; if (window.THREE) init(); else { var s = document.createElement('script'); s.src = 'assets/vendor/three.min.js'; s.onload = init; s.onerror = function () { stage.classList.add('hfx-nogl'); }; document.head.appendChild(s); } }
  if ('IntersectionObserver' in window) { var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { io.disconnect(); go(); } }, { rootMargin: '420px 0px' }); io.observe(stage); } else go();

  function init() {
    var T = window.THREE, PI = Math.PI, renderer;
    try { renderer = new T.WebGLRenderer({ antialias: true, powerPreference: 'default' }); } catch (e) { stage.classList.add('hfx-nogl'); return; }
    var small = window.innerWidth < 760;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, small ? 1.25 : 1.6));
    renderer.toneMapping = T.NoToneMapping; renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
    renderer.domElement.setAttribute('aria-hidden', 'true'); stage.appendChild(renderer.domElement);
    var BG = 0x0d0e11, scene = new T.Scene(); scene.background = new T.Color(BG); scene.fog = new T.Fog(BG, 14, 30);
    var camera = new T.PerspectiveCamera(30, 1.6, 0.1, 60);

    /* lumière naturelle : ciel et sol chauds, soleil bas côté fenêtre, reflets d'inox par environnement neutre */
    var pm = new T.PMREMGenerator(renderer), env = new T.Scene();
    env.add(new T.Mesh(new T.BoxGeometry(30, 30, 30), new T.MeshBasicMaterial({ color: 0x2c2d32, side: T.BackSide })));
    function soft(w, h, k, x, y, z, col) { var m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ color: new T.Color(col || 0xffffff).multiplyScalar(k), side: T.DoubleSide })); m.position.set(x, y, z); m.lookAt(0, 0, 0); env.add(m); }
    soft(14, 9, 4.2, -12, 6, 4, 0xfff3e2); soft(18, 3, 3.0, 0, 13, 0, 0xffffff); soft(8, 7, 1.4, 12, 3, -4, 0xdfe6ee); soft(16, 2, 1.1, 0, 2.5, 12, 0xffffff);
    scene.environment = pm.fromScene(env, 0.04).texture;
    scene.add(new T.HemisphereLight(0xfff4e4, 0x4a4338, 0.38));
    var sun = new T.DirectionalLight(0xfff0d8, 1.7); sun.position.set(-6, 7, 5); sun.castShadow = true; sun.shadow.mapSize.set(small ? 1024 : 2048, small ? 1024 : 2048);
    var sc = sun.shadow.camera; sc.left = -7; sc.right = 7; sc.top = 5; sc.bottom = -5; sc.near = 1; sc.far = 24; sun.shadow.bias = -0.0006; sun.shadow.radius = 4; sun.shadow.normalBias = 0.02;
    sun.target.position.set(0.8, 0, 0); scene.add(sun, sun.target);

    function S(c, r, m, o) { var q = { color: c, roughness: r, metalness: m || 0, envMapIntensity: (m || 0) > 0.5 ? 1.15 : 0.35 }; if (o) for (var k in o) q[k] = o[k]; return new T.MeshStandardMaterial(q); }
    var M = { inox: S(0xeef0f3, 0.22, 0.96, { envMapIntensity: 1.5 }), inoxD: S(0xc2c7cd, 0.32, 0.92, { envMapIntensity: 1.3 }), cord: S(0x24262b, 0.65, 0.1), floor: S(0x26272b, 0.62, 0, { envMapIntensity: 0.6 }), wall: S(0x7a7c83, 0.92, 0), tray: S(0x4a4e57, 0.55, 0.05), plate: S(0xf4f3ef, 0.3, 0), glass: S(0xbcd3e0, 0.1, 0.1, { transparent: true, opacity: 0.45 }), crate: S(0x7d858f, 0.6, 0.05), dark: S(0x1f2125, 0.6, 0.3), orange: S(0xe06f0a, 0.55, 0.05), sky: new T.MeshBasicMaterial({ color: 0xf5eedd }), skin: S(0xdcae82, 0.7, 0), white: S(0xf1f1ee, 0.8, 0), navy: S(0x2f3b52, 0.85, 0), hair: S(0x3b2a1e, 0.9, 0), shoe: S(0x1b1c1f, 0.8, 0) };
    function box(w, h, d, x, y, z, m, par, sh) { var o = new T.Mesh(new T.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.castShadow = sh !== false; o.receiveShadow = true; (par || scene).add(o); return o; }
    function cyl(r, h, x, y, z, m, par, ax) { var o = new T.Mesh(new T.CylinderGeometry(r, r, h, 12), m); if (ax === 'x') o.rotation.z = PI / 2; o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; (par || scene).add(o); return o; }

    /* sol, mur arrière avec fenêtre (lumière du jour) */
    var fl = new T.Mesh(new T.PlaneGeometry(40, 20), M.floor); fl.rotation.x = -PI / 2; fl.receiveShadow = true; scene.add(fl);
    box(18, 4.2, 0.2, 0, 2.1, -3.1, M.wall, null, false); box(18, 0.12, 0.05, 0, 0.06, -2.97, M.inoxD, null, false);
    (function () {   // halo de lumière du jour sur le mur (fenêtre), simple dégradé radial
      var c = document.createElement('canvas'); c.width = c.height = 128; var g = c.getContext('2d'), r = g.createRadialGradient(64, 64, 4, 64, 64, 62); r.addColorStop(0, 'rgba(255,236,200,.55)'); r.addColorStop(1, 'rgba(255,236,200,0)'); g.fillStyle = r; g.fillRect(0, 0, 128, 128);
      var m = new T.Mesh(new T.PlaneGeometry(7, 4.4), new T.MeshBasicMaterial({ map: new T.CanvasTexture(c), transparent: true, depthWrite: false })); m.position.set(-2.2, 2.0, -2.95); scene.add(m);
    })();
    box(2.6, 1.7, 0.05, -2.4, 2.1, -2.97, M.sky, null, false); box(2.7, 0.06, 0.08, -2.4, 1.24, -2.94, M.inoxD, null, false); box(0.05, 1.7, 0.08, -2.4, 2.1, -2.94, M.inoxD, null, false);

    /* Technicord : poutre (largeur du bloc A2010 : 0,41 m) et deux cordes Ø 15 mm */
    var YC = 0.93, W = 0.41, LEN = 11, X0 = -5.5;
    box(LEN, 0.07, W, X0 + LEN / 2, YC - 0.07, 0, M.inox); box(LEN, 0.05, 0.025, X0 + LEN / 2, YC - 0.015, W / 2 - 0.0125, M.inoxD); box(LEN, 0.05, 0.025, X0 + LEN / 2, YC - 0.015, -W / 2 + 0.0125, M.inoxD);
    [-0.09, 0.09].forEach(function (z) { cyl(0.012, LEN, X0 + LEN / 2, YC - 0.005, z, M.cord, null, 'x'); });
    for (var i = 0; i <= 7; i++) box(0.05, YC - 0.1, 0.05, X0 + 0.7 + i * 1.5, (YC - 0.1) / 2, 0, M.inoxD);

    /* station de tri TRISTA3 (1,855 × 0,565 m) : plan, trois casiers, bac */
    var SL = 1.855, SW = 0.565, sx = 0.2 + SL / 2, sz = -(W / 2 + 0.06 + SW / 2);
    box(SL, 0.04, SW, sx, 0.82, sz, M.inox); box(SL - 0.04, 0.03, SW - 0.06, sx, 0.35, sz, M.inoxD);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (o) { box(0.05, 0.8, 0.05, sx + o[0] * (SL / 2 - 0.05), 0.4, sz + o[1] * (SW / 2 - 0.05), M.inoxD); });
    for (var k = 0; k < 3; k++) { var kx = sx - SL / 2 + 0.3 + k * 0.5; box(0.44, 0.28, SW - 0.1, kx, 0.98, sz, M.crate); box(0.4, 0.02, SW - 0.16, kx, 1.12, sz, M.dark); }
    box(0.42, 0.3, SW - 0.1, sx + SL / 2 - 0.3, 0.97, sz, M.inoxD);

    /* table Tabling (1,16 × 0,56 m) avec un casier de vaisselle */
    var TLn = 1.1605, TLw = 0.56, tx = 3.55, tz = sz - 0.05;
    box(TLn, 0.04, TLw, tx, 0.9, tz, M.inox); box(TLn - 0.06, 0.025, TLw - 0.06, tx, 0.22, tz, M.inoxD);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (o) { box(0.045, 0.88, 0.045, tx + o[0] * (TLn / 2 - 0.04), 0.44, tz + o[1] * (TLw / 2 - 0.04), M.inoxD); });
    box(0.5, 0.02, 0.5, tx, 0.94, tz, M.crate); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (o) { box(0.02, 0.15, 0.02, tx + o[0] * 0.24, 1.01, tz + o[1] * 0.24, M.crate); });
    [[-0.12, -0.12], [0.12, -0.12], [-0.12, 0.12], [0.12, 0.12]].forEach(function (o) { cyl(0.1, 0.014, tx + o[0], 0.96, tz + o[1], M.plate); });

    /* plateaux : sur la poutre, défilement continu (hors cadre aux extrémités) */
    var trays = [];
    for (var n = 0; n < 8; n++) {
      var g = new T.Group(); g.add(new T.Mesh(new T.BoxGeometry(0.45, 0.02, 0.33), M.tray)); g.children[0].castShadow = true;
      var pl = new T.Mesh(new T.CylinderGeometry(0.105, 0.09, 0.014, 14), M.plate); pl.position.set(-0.1, 0.017, 0); pl.castShadow = true; g.add(pl);
      var gl = new T.Mesh(new T.CylinderGeometry(0.032, 0.026, 0.09, 10), M.glass); gl.position.set(0.13, 0.055, -0.08); g.add(gl);
      if (n % 2) { var nap = new T.Mesh(new T.BoxGeometry(0.11, 0.004, 0.09), M.white); nap.position.set(0.14, 0.012, 0.09); g.add(nap); }
      g.position.y = YC + 0.025; g.userData.off = n * (LEN / 8); scene.add(g); trays.push(g);
    }

    /* agent de laverie : silhouette simple (tunique, tablier, coiffe) devant la station */
    var ag = new T.Group(); ag.position.set(1.15, 0, -1.5); ag.rotation.y = 0.12; scene.add(ag);
    var hips = new T.Group(); hips.position.y = 0.94; ag.add(hips);
    function pm_(g, geo, m, x, y, z, sh) { var o = new T.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = !!sh; g.add(o); return o; }
    var up = new T.Group(); hips.add(up); pm_(up, new T.BoxGeometry(0.36, 0.52, 0.2), M.white, 0, 0.26, 0, true); pm_(up, new T.BoxGeometry(0.33, 0.4, 0.012), M.white, 0, 0.24, 0.106);
    var head = new T.Group(); head.position.y = 0.57; up.add(head); pm_(head, new T.SphereGeometry(0.105, 12, 10), M.skin, 0, 0.115, 0, true); var hr = pm_(head, new T.SphereGeometry(0.112, 10, 8), M.hair, 0, 0.145, -0.012); hr.scale.set(1, 0.72, 1.02);
    pm_(head, new T.CylinderGeometry(0.113, 0.118, 0.07, 12), M.white, 0, 0.2, 0); pm_(head, new T.CylinderGeometry(0.1, 0.12, 0.1, 12), M.white, 0, 0.26, 0);
    var arms = [-1, 1].map(function (s) { var sh = new T.Group(); sh.position.set(s * 0.215, 0.49, 0); up.add(sh); var u = pm_(sh, new T.CylinderGeometry(0.042, 0.048, 0.3, 8), M.white, 0, -0.15, 0, false); var el = new T.Group(); el.position.y = -0.3; sh.add(el); pm_(el, new T.CylinderGeometry(0.036, 0.04, 0.28, 8), M.skin, 0, -0.14, 0); return { sh: sh, el: el }; });
    [-1, 1].forEach(function (s) { var th = pm_(hips, new T.CylinderGeometry(0.062, 0.07, 0.44, 8), M.navy, s * 0.09, -0.22, 0, true); var sh2 = pm_(hips, new T.CylinderGeometry(0.045, 0.055, 0.44, 8), M.navy, s * 0.09, -0.66, 0, false); pm_(hips, new T.BoxGeometry(0.09, 0.06, 0.22), M.shoe, s * 0.09, -0.91, 0.05); });

    /* cadrage : léger balancement de caméra, pas de rotation complète */
    var tgt = new T.Vector3(1.2, 0.95, -0.55), t0 = 0;
    function cam(t) { var az = Math.sin(t * 0.14) * 0.2, d = 6.4; camera.position.set(tgt.x + Math.sin(az - 0.55) * d, 1.75 + Math.sin(t * 0.1) * 0.12, tgt.z + Math.cos(az - 0.55) * d); camera.lookAt(tgt); }
    function size() { var w = stage.clientWidth || 640, h = stage.clientHeight || 400; renderer.setSize(w, h, false); renderer.domElement.style.width = '100%'; renderer.domElement.style.height = '100%'; camera.aspect = w / h; camera.fov = w / h < 1.3 ? 38 : 30; camera.updateProjectionMatrix(); }
    if (window.ResizeObserver) new ResizeObserver(size).observe(stage); else window.addEventListener('resize', size); size();

    var vis = true, clock = new T.Clock(), tt = 0;
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { vis = es[0].isIntersecting; }, { rootMargin: '60px' }).observe(stage);
    function frame() {
      requestAnimationFrame(frame); if (!vis || document.hidden) { clock.getDelta(); return; }
      var dt = Math.min(0.1, clock.getDelta()); tt += dt;
      trays.forEach(function (g) { var x = X0 + ((g.userData.off + tt * 0.55) % LEN); g.position.x = x; });
      var w1 = Math.sin(tt * 1.7), w2 = Math.sin(tt * 1.7 + 2.0);         // l'agent saisit et dépose
      up.rotation.x = 0.2 + 0.05 * w1; arms[0].sh.rotation.x = -0.95 + 0.35 * w1; arms[1].sh.rotation.x = -0.9 + 0.35 * w2; arms[0].el.rotation.x = -0.7 + 0.3 * w2; arms[1].el.rotation.x = -0.8 + 0.3 * w1; head.rotation.y = 0.15 * Math.sin(tt * 0.6);
      cam(tt); renderer.render(scene, camera); stage.__frames = (stage.__frames || 0) + 1;
      if (!stage.classList.contains('ready')) stage.classList.add('ready');
    }
    cam(0); frame();
  }
})();
