// Fortified stand-up pouch in WebGL (three.js, loaded on demand).
// Shape measured from a 32-photo turntable of the real pouch, then squared up: straight sides,
// flat top seal, lens-shaped cross-section with sealed side seams, full lower body (depth ~0.35 of
// the height), oval base. Front and back artwork are mapped flat onto each face.
// FFPouch3D.mount(el, { three, front, back, base, angle, interactive, auto }) -> Promise<controller>
// Renders only when something changes (angle, size, textures); no idle animation loop.
(function () {
  "use strict";
  var DEPTH = [[0, 0], [0.05, 0], [0.12, 0.1], [0.22, 0.19], [0.32, 0.26], [0.42, 0.31], [0.52, 0.335], [0.65, 0.345], [0.8, 0.35], [1, 0.35]];
  var WIDTH = 0.96;
  function depthAt(t) {
    for (var i = 1; i < DEPTH.length; i++) if (t <= DEPTH[i][0]) { var a = DEPTH[i - 1], b = DEPTH[i], k = (t - a[0]) / (b[0] - a[0]); return a[1] + (b[1] - a[1]) * k; }
    return DEPTH[DEPTH.length - 1][1];
  }
  var threeP = null;
  // Load three.js through a <script type="module"> tag. A plain import() here would be rewritten by
  // Shopify's asset pipeline into require(), which does not exist in browsers.
  function loadThree(url) {
    return threeP || (threeP = new Promise(function (res, rej) {
      if (window.__ffThree) return res(window.__ffThree);
      var tm = setTimeout(function () { rej(new Error("three.js did not load")); }, 20000);
      window.__ffThreeReady = function (T) { clearTimeout(tm); window.__ffThree = T; res(T); };
      var sc = document.createElement("script"); sc.type = "module";
      sc.textContent = "import * as T from " + JSON.stringify(url) + "; window.__ffThreeReady(T);";
      document.head.appendChild(sc);
    }));
  }
  function supported() {
    try { var c = document.createElement("canvas"); return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl"))); } catch (e) { return false; }
  }

  function face(THREE, side, NU, NV) {
    var pos = [], uv = [], idx = [];
    for (var j = 0; j <= NV; j++) {
      var v = j / NV, d = depthAt(1 - v);
      for (var i = 0; i <= NU; i++) {
        var u = i / NU, x = (u - 0.5) * WIDTH, s = 2 * u - 1;
        // keep the faces apart at the seal so the back never shows through the front
        var lens = Math.pow(Math.max(0, 1 - s * s), 0.55);
        // the faces meet exactly at the side seams (no gap edge-on); across the flat top seal they sit a
        // hair apart so the back's print never shows through the front
        var z = side * Math.max(0.004 * lens, (d / 2) * lens);
        pos.push(side > 0 ? x : -x, v - 0.5, z); uv.push(u, v);
      }
    }
    for (j = 0; j < NV; j++) for (i = 0; i < NU; i++) { var a = j * (NU + 1) + i, b = a + 1, c = a + NU + 1, e = c + 1; idx.push(a, b, e, a, e, c); }
    var g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx); g.computeVertexNormals();
    return g;
  }
  function base(THREE, NU) {
    var d = depthAt(1), pts = [], i;
    for (i = 0; i <= NU; i++) { var u = i / NU, s = 2 * u - 1; pts.push(new THREE.Vector2((u - 0.5) * WIDTH, (d / 2) * Math.pow(Math.max(0, 1 - s * s), 0.55))); }
    for (i = NU - 1; i > 0; i--) pts.push(new THREE.Vector2(pts[i].x, -pts[i].y));
    var g = new THREE.ShapeGeometry(new THREE.Shape(pts)); g.rotateX(Math.PI / 2); g.translate(0, -0.5, 0);
    return g;
  }

  function mount(el, o) {
    o = o || {};
    if (!supported()) return Promise.reject(new Error("no webgl"));
    return loadThree(o.three).then(function (THREE) {
      var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      var cv = renderer.domElement;
      cv.className = "p3d__cv"; cv.setAttribute("aria-hidden", "true");
      cv.style.cssText = "display:block;width:100%;height:100%";
      el.appendChild(cv);
      var scene = new THREE.Scene();
      var cam = new THREE.PerspectiveCamera(24, 1, 0.1, 20);
      cam.position.set(0, 0, 3.24); cam.lookAt(0, 0, 0); // framed so the pouch fills the same box as the CSS pouch it replaces
      scene.add(new THREE.HemisphereLight(0xffffff, 0xe6e9ec, 2.5));
      var key = new THREE.DirectionalLight(0xffffff, 1.05); key.position.set(-1.4, 1.9, 2.6); scene.add(key);
      var rim = new THREE.DirectionalLight(0xffffff, 0.45); rim.position.set(2, 0.6, -1.5); scene.add(rim);
      var loader = new THREE.TextureLoader(); loader.setCrossOrigin("anonymous");
      var dirty = false, raf = 0;
      function draw() { if (!dirty) { dirty = true; raf = requestAnimationFrame(function () { dirty = false; renderer.render(scene, cam); }); } }
      var loads = [];
      function tex(u) { var done; loads.push(new Promise(function (r) { done = r; })); var t = loader.load(u, function () { draw(); done(); }, undefined, function () { done(); }); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy()); return t; }
      function mat(map) { return new THREE.MeshStandardMaterial({ map: map, roughness: 0.5, metalness: 0.04, side: THREE.DoubleSide }); }
      var pouch = new THREE.Group();
      var front = new THREE.Mesh(face(THREE, 1, 40, 56), mat(tex(o.front)));
      var back = new THREE.Mesh(face(THREE, -1, 40, 56), mat(tex(o.back || o.front)));
      pouch.add(front, back, new THREE.Mesh(base(THREE, 40), new THREE.MeshStandardMaterial({ color: o.base || 0xe0833c, roughness: 0.7 })));
      scene.add(pouch);
      function size() {
        var w = el.clientWidth, h = el.clientHeight || w; if (!w || !h) return;
        renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); draw();
      }
      var ro = new ResizeObserver(size); ro.observe(el); size();
      var st = { angle: (o.angle || 0) * Math.PI / 180, vel: 0, auto: !!o.auto, drag: false, loop: 0, last: 0 };
      function setRot() { pouch.rotation.y = st.angle; draw(); }
      // Own drag/momentum only when the page does not drive the angle itself.
      function tick(ts) {
        var dt = st.last ? Math.min(0.05, (ts - st.last) / 1000) : 0; st.last = ts;
        var moving = false;
        if (!st.drag && Math.abs(st.vel) > 0.01) { st.angle += st.vel * dt; st.vel *= Math.pow(0.04, dt); moving = true; }
        else if (!st.drag && st.auto) { st.angle += 0.35 * dt; moving = true; }
        setRot();
        st.loop = moving || st.drag ? requestAnimationFrame(tick) : 0; if (!st.loop) st.last = 0;
      }
      function kick() { if (!st.loop) st.loop = requestAnimationFrame(tick); }
      if (o.interactive) {
        var px = 0, pt = 0;
        cv.style.touchAction = "pan-y"; cv.style.cursor = "grab";
        cv.addEventListener("pointerdown", function (e) { st.drag = true; px = e.clientX; pt = e.timeStamp; st.vel = 0; try { cv.setPointerCapture(e.pointerId); } catch (x) {} kick(); });
        cv.addEventListener("pointermove", function (e) { if (!st.drag) return; var dx = e.clientX - px, dtm = Math.max(1, e.timeStamp - pt) / 1000, da = dx / (cv.clientWidth || 300) * Math.PI * 1.6; st.angle += da; st.vel = da / dtm; px = e.clientX; pt = e.timeStamp; });
        var up = function () { st.drag = false; };
        cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up);
      } else { cv.style.pointerEvents = "none"; }
      if (st.auto) kick();
      setRot();
      // resolve once both artwork images are in (or after 6s), so the page never shows a blank pouch
      return Promise.race([Promise.all(loads), new Promise(function (r) { setTimeout(r, 6000); })]).then(function () { return {
        setAngle: function (deg) { st.angle = deg * Math.PI / 180; st.vel = 0; setRot(); },
        setArt: function (f, b) { front.material.map = tex(f); back.material.map = tex(b || f); front.material.needsUpdate = back.material.needsUpdate = true; draw(); },
        setAuto: function (on) { st.auto = !!on; if (on) kick(); },
        destroy: function () { cancelAnimationFrame(raf); cancelAnimationFrame(st.loop); ro.disconnect(); renderer.dispose(); cv.remove(); }
      }; });
    });
  }
  window.FFPouch3D = { mount: mount, supported: supported };
})();
