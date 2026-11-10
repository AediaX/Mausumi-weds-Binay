/* =====================================================================
   RoseKit - procedural, realistic 3D roses (Three.js). Every petal is its own
   curved mesh: wrapped bud petals, cupped inner petals, reflexed outer petals,
   ruffled edges, vein bump texture, vertex-colour depth and baked-in occlusion.
   Used at runtime for the envelope roses / falling roses, and by tools/bake.html
   to bake the photographic rose images in /img.
   ===================================================================== */
(function (root) {
  "use strict";
  const T = root.THREE;
  const TAU = Math.PI * 2, GOLDEN = 2.399963;
  const sstep = (a, b, x) => { x = Math.min(1, Math.max(0, (x - a) / (b - a))); return x * x * (3 - 2 * x); };
  const mix = (a, b, t) => a + (b - a) * t;
  function rng(seed) { let a = seed | 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const C = (h) => new T.Color(h);

  const SCHEMES = {
    pink:  { base: "#C0577A", mid: "#F0A3B8", tip: "#FBD3DD" },
    blush: { base: "#D3748F", mid: "#F6BCC8", tip: "#FDE6EA" },
    ivory: { base: "#E4B7A6", mid: "#F9EADF", tip: "#FFFAF4" },
    deep:  { base: "#9C3558", mid: "#D2607F", tip: "#F096B0" },
  };

  /* ---------- one petal ---------- */
  function petalData(p, nu, nv, rand, S) {
    const pos = [], col = [], uv = [], idx = [];
    const cb = C(S.base), cm = C(S.mid), ct = C(S.tip), tmp = new T.Color();
    // centre line in the (radius, height) plane
    const line = [];
    let r = p.r0, y = p.y0;
    for (let j = 0; j <= nv; j++) {
      const v = j / nv; line.push([r, y]);
      const phi = p.tilt + p.curl * Math.pow(v, p.curlPow || 1.6);
      r += Math.sin(phi) * p.len / nv; y += Math.cos(phi) * p.len / nv;
    }
    const ph1 = rand() * TAU, ph2 = rand() * TAU, lean = (rand() - 0.5) * 0.25;
    for (let j = 0; j <= nv; j++) {
      const v = j / nv, [rc, yc] = line[j];
      const vt = 0.4, cap = v > vt ? Math.sqrt(Math.max(0, 1 - Math.pow((v - vt) / (1 - vt), 2))) : 1;
      const hw = p.W * (0.22 + 0.78 * Math.pow(sstep(0, 0.5, v), 0.8)) * Math.pow(cap, 0.85);
      for (let i = 0; i <= nu; i++) {
        const u = (i / nu) * 2 - 1, s = u * hw, au = Math.abs(u);
        const R0 = Math.max(rc, p.rmin || 0.07);
        const th = s / R0 + lean * v;
        // cup (edges curve toward the axis) then lip roll (edges flick outward at the top)
        let R = rc - p.cup * s * s * (1 - 0.65 * v) + p.roll * sstep(0.62, 1, v) * Math.pow(au, 2.2);
        // soft ruffle along the free edge
        const ruf = p.ruffle * sstep(0.45, 1, v) * (Math.sin(u * 5.2 + ph1) * 0.6 + Math.sin(u * 11 + ph2) * 0.4) * (0.35 + au);
        R += ruf * 0.55;
        const Y = yc + ruf * 0.6 - p.droop * au * au * v * 0.3 + p.tipLift * sstep(0.8, 1, v) * (1 - au) * 0.4;
        const a = p.az + th;
        pos.push(Math.cos(a) * R, Y, Math.sin(a) * R);
        // colour: deep heart -> body -> pale translucent tip, lighter thin edges, occlusion near the base
        tmp.copy(cb).lerp(cm, sstep(0, 0.5, v)).lerp(ct, sstep(0.5, 1, v) * 0.9);
        tmp.lerp(ct, Math.pow(au, 3) * 0.35 * sstep(0.2, 1, v));
        const ao = p.ao * (0.4 + 0.6 * sstep(0, 0.7, v)) * (1 - 0.18 * Math.pow(au, 2) * (1 - v)) * (1 - 0.1 * (Math.sin(u * 14 + ph1) * 0.5 + 0.5));
        tmp.multiplyScalar(ao);
        col.push(tmp.r, tmp.g, tmp.b);
        uv.push(i / nu, v);
      }
    }
    for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
      const a = j * (nu + 1) + i, b = a + 1, c = a + nu + 1, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
    return { pos, col, uv, idx };
  }

  function merge(list) {
    const pos = [], col = [], uv = [], idx = []; let off = 0;
    list.forEach((d) => {
      for (let k = 0; k < d.pos.length; k++) pos.push(d.pos[k]);
      for (let k = 0; k < d.col.length; k++) col.push(d.col[k]);
      for (let k = 0; k < d.uv.length; k++) uv.push(d.uv[k]);
      for (let k = 0; k < d.idx.length; k++) idx.push(d.idx[k] + off);
      off += d.pos.length / 3;
    });
    const g = new T.BufferGeometry();
    g.setAttribute("position", new T.Float32BufferAttribute(pos, 3));
    g.setAttribute("color", new T.Float32BufferAttribute(col, 3));
    g.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
    g.setIndex(idx); g.computeVertexNormals();
    return g;
  }

  /* layers: [count, tilt0, curl, len, W, cup, roll, ruffle, r0, ao, rmin] */
  const LAYERS = [
    [3, 0.04, 0.08, 0.50, 0.24, 0.0, 0.0, 0.000, 0.035, 0.55, 0.07],
    [5, 0.08, 0.14, 0.66, 0.40, 0.8, 0.0, 0.004, 0.065, 0.62, 0.10],
    [6, 0.16, 0.30, 0.86, 0.58, 1.0, 0.03, 0.010, 0.100, 0.70, 0.14],
    [7, 0.32, 0.50, 1.02, 0.74, 0.9, 0.07, 0.018, 0.140, 0.80, 0.19],
    [8, 0.55, 0.62, 1.16, 0.80, 0.7, 0.12, 0.030, 0.190, 0.90, 0.26],
    [9, 0.82, 0.60, 1.26, 0.86, 0.5, 0.16, 0.040, 0.240, 1.00, 0.33],
  ];

  /* roseGeometry({ scheme, open: 0..1, layers: 3..6, seed, nu, nv }) */
  function roseGeometry(o) {
    o = o || {};
    const S = SCHEMES[o.scheme || "pink"], rand = rng(o.seed || 7), nu = o.nu || 12, nv = o.nv || 9;
    const open = o.open == null ? 1 : o.open, nl = Math.min(6, o.layers || 6);
    const parts = []; let gi = 0;
    for (let L = 0; L < nl; L++) {
      const [n, t0, cu, len, W, cup, roll, ruf, r0, ao, rmin] = LAYERS[L];
      const k = L / 5;                                   // how "outer" this layer is
      for (let q = 0; q < n; q++, gi++) {
        const jit = () => (rand() - 0.5);
        parts.push(petalData({
          az: gi * GOLDEN + jit() * 0.3,
          r0: r0 * (1 + jit() * 0.1), y0: -0.02 * L + 0.01 * q / n,
          len: len * (1 + jit() * 0.12),
          tilt: t0 * mix(0.45, 1, open) + jit() * 0.07 * (1 + k),
          curl: cu * mix(0.3, 1, open) * (1 + jit() * 0.2),
          W: W * (1 + jit() * 0.15), cup, roll: roll * open, ruffle: ruf * (0.7 + open * 0.6),
          droop: 0.5 * k, tipLift: 0.3 * (1 - k), ao: ao * (1 + jit() * 0.06), rmin,
          curlPow: 1.5 + k, tipPow: 4 + 3 * (1 - k),
        }, nu, nv, rand, S));
      }
    }
    return merge(parts);
  }

  /* ---------- calyx + hip + short stem (for buds seen from the side) ---------- */
  function calyxGeometry(seed) {
    const rand = rng(seed || 3), parts = [], S = { base: "#2F5A3A", mid: "#4F7F4C", tip: "#7BA364" };
    for (let i = 0; i < 5; i++) parts.push(petalData({ az: i * TAU / 5 + rand() * 0.3, r0: 0.14, y0: -0.12, len: 0.55, tilt: 1.9, curl: -0.6, W: 0.09, cup: 0, roll: 0, ruffle: 0.01, droop: 0, tipLift: 0, ao: 1, rmin: 0.1, curlPow: 1.2, tipPow: 2 }, 4, 6, rand, S));
    const g = merge(parts); return g;
  }

  /* ---------- leaf (serrated, creased along the midrib) ---------- */
  function leafGeometry(seed) {
    const rand = rng(seed || 5), nu = 8, nv = 22, pos = [], col = [], uv = [], idx = [];
    const a = C("#2C5637"), b = C("#5E8F55"), c = C("#8DB26F"), tmp = new T.Color();
    const len = 1, W = 0.26;
    for (let j = 0; j <= nv; j++) {
      const v = j / nv, hw = W * Math.pow(Math.sin(Math.PI * Math.pow(v, 0.78)), 0.85) * (1 - 0.1 * v);
      for (let i = 0; i <= nu; i++) {
        const u = (i / nu) * 2 - 1, au = Math.abs(u), tooth = 1 + 0.045 * Math.sin(v * 60) * sstep(0.3, 1, au);
        const x = u * hw * tooth, y = v * len, z = au * hw * 0.55 + 0.2 * v * v - 0.02 * Math.sin(v * 18 + u * 3);
        pos.push(x, y, z); uv.push(i / nu, v);
        tmp.copy(a).lerp(b, 0.3 + 0.5 * (1 - au)).lerp(c, sstep(0.65, 1, v) * 0.5 + (au < 0.08 ? 0.3 : 0));
        col.push(tmp.r, tmp.g, tmp.b);
      }
    }
    for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) { const p = j * (nu + 1) + i, q = p + 1, r = p + nu + 1, s = r + 1; idx.push(p, r, q, q, r, s); }
    const g = new T.BufferGeometry();
    g.setAttribute("position", new T.Float32BufferAttribute(pos, 3)); g.setAttribute("color", new T.Float32BufferAttribute(col, 3));
    g.setAttribute("uv", new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
  }

  /* ---------- a single loose petal ---------- */
  function loosePetalGeometry(scheme, seed) {
    const rand = rng(seed || 11), S = SCHEMES[scheme || "pink"];
    const d = petalData({ az: 0, r0: 1.5, y0: 0, len: 1, tilt: 0.0, curl: 0.16, W: 0.5, cup: 1.1, roll: 0.06, ruffle: 0.02, droop: 0.1, tipLift: 0.1, ao: 1.0, rmin: 1.5, curlPow: 1.8, tipPow: 4 }, 16, 14, rand, S);
    return merge([d]);
  }

  /* ---------- vein / grain texture (bump + colour modulation) ---------- */
  function veinTexture(kind) {
    const W = 128, H = 128, c = document.createElement("canvas"); c.width = W; c.height = H;
    const g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, W, H);
    const r = rng(kind === "leaf" ? 9 : 4);
    if (kind === "leaf") {
      g.strokeStyle = "rgba(0,0,0,.28)"; g.lineWidth = 2; g.beginPath(); g.moveTo(W / 2, 0); g.lineTo(W / 2, H); g.stroke();
      g.lineWidth = 1; g.strokeStyle = "rgba(0,0,0,.18)";
      for (let k = 0; k < 14; k++) { const y = k * H / 14; g.beginPath(); g.moveTo(W / 2, y); g.quadraticCurveTo(W * 0.75, y + 14, W - 4, y + 34); g.moveTo(W / 2, y); g.quadraticCurveTo(W * 0.25, y + 14, 4, y + 34); g.stroke(); }
    } else {
      for (let k = 0; k < 46; k++) {
        const x = r() * W; g.strokeStyle = "rgba(0,0,0," + (0.025 + r() * 0.05).toFixed(3) + ")"; g.lineWidth = 0.6 + r() * 1.1;
        g.beginPath(); g.moveTo(W / 2 + (x - W / 2) * 0.35, 0); g.bezierCurveTo(x, H * 0.3, x + (r() - 0.5) * 14, H * 0.65, x + (r() - 0.5) * 24, H); g.stroke();
      }
    }
    const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.ClampToEdgeWrapping; t.colorSpace = T.SRGBColorSpace; return t;
  }

  function material(kind, opt) {
    opt = opt || {}; const tex = veinTexture(kind);
    const m = new T.MeshPhysicalMaterial({
      vertexColors: true, map: tex, bumpMap: tex, bumpScale: kind === "leaf" ? 0.6 : 0.45,
      roughness: kind === "leaf" ? 0.5 : 0.62, metalness: 0, side: T.DoubleSide,
      sheen: kind === "leaf" ? 0.2 : 1, sheenRoughness: 0.45, sheenColor: C(kind === "leaf" ? "#cfe6c0" : "#ffe4ea"),
      emissive: C(kind === "leaf" ? "#10301a" : "#8a2a45"), emissiveIntensity: kind === "leaf" ? 0.1 : 0.1,
      envMapIntensity: opt.env == null ? 0.8 : opt.env,
    });
    return m;
  }

  root.RoseKit = { SCHEMES, roseGeometry, calyxGeometry, leafGeometry, loosePetalGeometry, material, rng };
})(typeof window !== "undefined" ? window : globalThis);
