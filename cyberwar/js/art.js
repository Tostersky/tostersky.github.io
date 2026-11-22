// Procedural cyberpunk art: every building and unit is drawn with code.
// Static parts are baked once into sprite caches; animated parts are drawn each frame by A.anim().
(function () {
  const TW = G.TW, TH = G.TH, SS = 2, HEAD = 190, PADX = 22;
  const A = G.Art = {};
  const cache = new Map();
  // neon trim colour per level (1..8)
  const TRIM = ['#2be3ff', '#39ff88', '#ff2bd6', '#ffe14d', '#ff5a3c', '#b26bff', '#ffffff', '#ffb000'];
  A.TRIM = TRIM;

  function mk(w, h, ss) {
    const c = document.createElement('canvas');
    c.width = Math.ceil(w * ss); c.height = Math.ceil(h * ss);
    const x = c.getContext('2d'); x.scale(ss, ss); x.lineJoin = 'round'; x.lineCap = 'round';
    return [c, x];
  }
  function hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function shade(hex, f) {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.min(255, Math.round((n >> 16 & 255) * f)), g = Math.min(255, Math.round((n >> 8 & 255) * f)), b = Math.min(255, Math.round((n & 255) * f));
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }
  A.shade = shade;
  const pal = (hex) => ({ top: shade(hex, 1.3), left: shade(hex, 0.7), right: shade(hex, 0.95), edge: shade(hex, 1.8) });
  const P = (ox, oy, tx, ty) => [ox + (tx - ty) * TW / 2, oy + (tx + ty) * TH / 2];
  const up = (p, z) => [p[0], p[1] - z];
  function poly(x, pts, fill, stroke, lw) {
    x.beginPath(); pts.forEach((p, i) => (i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1]))); x.closePath();
    if (fill) { x.fillStyle = fill; x.fill(); }
    if (stroke) { x.strokeStyle = stroke; x.lineWidth = lw || 0.7; x.stroke(); }
  }
  // isometric box over tile rect [tx0,ty0]-[tx1,ty1], heights z0..z1; side faces get a depth gradient
  function box(x, ox, oy, tx0, ty0, tx1, ty1, z0, z1, c, flat) {
    const a = P(ox, oy, tx0, ty0), b = P(ox, oy, tx1, ty0), cc = P(ox, oy, tx1, ty1), d = P(ox, oy, tx0, ty1);
    const L = [up(d, z0), up(cc, z0), up(cc, z1), up(d, z1)], R = [up(cc, z0), up(b, z0), up(b, z1), up(cc, z1)];
    poly(x, L, c.left); poly(x, R, c.right);
    const hz = z1 - z0;
    if (!flat && hz > 4) {
      // light from the top-left: soft sky bounce at the top, ambient occlusion near the ground
      const g = x.createLinearGradient(0, cc[1] - z1, 0, cc[1] - z0);
      g.addColorStop(0, 'rgba(255,255,255,.10)'); g.addColorStop(0.35, 'rgba(255,255,255,0)'); g.addColorStop(0.8, 'rgba(0,0,0,.12)'); g.addColorStop(1, 'rgba(0,0,0,.42)');
      poly(x, L, g); poly(x, R, g);
      // cool reflected light on the left face, warmer street glow on the right face
      const gl = x.createLinearGradient(d[0], 0, cc[0], 0); gl.addColorStop(0, 'rgba(120,90,255,.10)'); gl.addColorStop(1, 'rgba(0,0,0,0)'); poly(x, L, gl);
      const gr = x.createLinearGradient(cc[0], 0, b[0], 0); gr.addColorStop(0, 'rgba(0,0,0,.10)'); gr.addColorStop(1, 'rgba(255,60,200,.06)'); poly(x, R, gr);
      // panel seams on taller walls
      if (hz > 14 && !c.smooth) {
        const step = hz > 40 ? 10 : 7;
        for (let z = z0 + step; z < z1 - 3; z += step) {
          x.strokeStyle = 'rgba(0,0,0,.22)'; x.lineWidth = 0.5;
          x.beginPath(); x.moveTo(...up(d, z)); x.lineTo(...up(cc, z)); x.lineTo(...up(b, z)); x.stroke();
          x.strokeStyle = 'rgba(255,255,255,.05)';
          x.beginPath(); x.moveTo(d[0], d[1] - z - 0.6); x.lineTo(cc[0], cc[1] - z - 0.6); x.lineTo(b[0], b[1] - z - 0.6); x.stroke();
        }
      }
      // contact shadow line where the wall meets the ground
      x.strokeStyle = 'rgba(0,0,0,.45)'; x.lineWidth = 1;
      x.beginPath(); x.moveTo(...up(d, z0 + 0.4)); x.lineTo(...up(cc, z0 + 0.4)); x.lineTo(...up(b, z0 + 0.4)); x.stroke();
    }
    if (c.edge) { poly(x, L, null, c.edge, 0.6); poly(x, R, null, c.edge, 0.6); }
    const T = [up(a, z1), up(b, z1), up(cc, z1), up(d, z1)];
    poly(x, T, c.top, c.edge, 0.6);
    if (!flat) { // roof sheen: brighter at the back corner, darker toward the front
      const gt = x.createLinearGradient(0, a[1] - z1, 0, cc[1] - z1);
      gt.addColorStop(0, 'rgba(255,255,255,.14)'); gt.addColorStop(1, 'rgba(0,0,0,.10)'); poly(x, T, gt);
    }
    // bright rim on the front-top edges + highlight on the front vertical corner
    x.strokeStyle = 'rgba(255,255,255,.22)'; x.lineWidth = 0.8;
    x.beginPath(); x.moveTo(...up(d, z1)); x.lineTo(...up(cc, z1)); x.lineTo(...up(b, z1)); x.stroke();
    if (hz > 6) {
      const gv = x.createLinearGradient(0, cc[1] - z1, 0, cc[1] - z0); gv.addColorStop(0, 'rgba(255,255,255,.35)'); gv.addColorStop(1, 'rgba(255,255,255,0)');
      x.strokeStyle = gv; x.lineWidth = 0.9; x.beginPath(); x.moveTo(...up(cc, z1)); x.lineTo(...up(cc, z0)); x.stroke();
    }
    return { a, b, c: cc, d, z0, z1 };
  }
  function glow(x, c, b) { x.shadowColor = c; x.shadowBlur = b; }
  function noglow(x) { x.shadowBlur = 0; }
  function line(x, p1, p2, color, w, g) {
    if (g) glow(x, color, g);
    x.strokeStyle = color; x.lineWidth = w; x.beginPath(); x.moveTo(p1[0], p1[1]); x.lineTo(p2[0], p2[1]); x.stroke();
    if (g) noglow(x);
  }
  function faceLines(x, f, z, color, w) {
    glow(x, color, 6);
    x.strokeStyle = color; x.lineWidth = w || 1.2;
    x.beginPath(); x.moveTo(f.d[0], f.d[1] - z); x.lineTo(f.c[0], f.c[1] - z); x.lineTo(f.b[0], f.b[1] - z); x.stroke();
    noglow(x);
  }
  function cyl(x, cx, cy, r, z0, z1, side, top) {
    const g = x.createLinearGradient(cx - r, 0, cx + r, 0);
    g.addColorStop(0, shade(side, 0.6)); g.addColorStop(0.45, shade(side, 1.15)); g.addColorStop(1, shade(side, 0.45));
    x.fillStyle = g;
    x.beginPath(); x.moveTo(cx + r, cy - z0); x.ellipse(cx, cy - z0, r, r / 2, 0, 0, Math.PI, false);
    x.lineTo(cx - r, cy - z1); x.lineTo(cx + r, cy - z1); x.closePath(); x.fill();
    x.fillStyle = top; x.beginPath(); x.ellipse(cx, cy - z1, r, r / 2, 0, 0, Math.PI * 2); x.fill();
  }
  function dot(x, cx, cy, r, color, g) { glow(x, color, g || 8); x.fillStyle = color; x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fill(); noglow(x); }
  function pad(x, ox, oy, s, L) {
    // two-step concrete foundation: dark kerb, lighter slab with a recessed inner plate
    box(x, ox, oy, 0.04, 0.04, s - 0.04, s - 0.04, 0, 2, { top: '#16132b', left: '#0a0915', right: '#100e20', edge: '#2a2450' }, true);
    box(x, ox, oy, 0.14, 0.14, s - 0.14, s - 0.14, 2, 3.4, { top: '#211d3e', left: '#0d0b19', right: '#151229', edge: '#3c3370' }, true);
    const g = x.createLinearGradient(0, P(ox, oy, 0, 0)[1], 0, P(ox, oy, s, s)[1]);
    g.addColorStop(0, 'rgba(140,120,255,.10)'); g.addColorStop(1, 'rgba(0,0,0,.18)');
    poly(x, [up(P(ox, oy, 0.14, 0.14), 3.4), up(P(ox, oy, s - 0.14, 0.14), 3.4), up(P(ox, oy, s - 0.14, s - 0.14), 3.4), up(P(ox, oy, 0.14, s - 0.14), 3.4)], g);
    // hazard stripes on the front kerbs
    const a = P(ox, oy, 0.04, s - 0.04), c = P(ox, oy, s - 0.04, s - 0.04), b = P(ox, oy, s - 0.04, 0.04);
    x.save(); x.globalAlpha = 0.55;
    for (const [p1, p2] of [[a, c], [c, b]]) for (let k = 0.04; k < 0.98; k += 0.08) {
      const q1 = [p1[0] + (p2[0] - p1[0]) * k, p1[1] + (p2[1] - p1[1]) * k], q2 = [p1[0] + (p2[0] - p1[0]) * (k + 0.035), p1[1] + (p2[1] - p1[1]) * (k + 0.035)];
      poly(x, [up(q1, 0.3), up(q2, 0.3), up(q2, 1.8), up(q1, 1.8)], '#e8b820');
    }
    x.restore();
    // glowing corner markers + bolts
    for (const p of [P(ox, oy, 0.22, s - 0.22), P(ox, oy, s - 0.22, s - 0.22), P(ox, oy, s - 0.22, 0.22)]) dot(x, p[0], p[1] - 3.6, 1.1, 'rgba(255,225,77,.95)', 6);
    x.fillStyle = 'rgba(200,190,255,.25)';
    for (let k = 0.15; k < 0.9; k += 0.18) { const q = P(ox, oy, 0.3 + k * (s - 0.6), s - 0.3), q2 = P(ox, oy, s - 0.3, 0.3 + k * (s - 0.6)); x.fillRect(q[0] - 0.5, q[1] - 4, 1, 1); x.fillRect(q2[0] - 0.5, q2[1] - 4, 1, 1); }
    if (!L) return;
    const tr = TRIM[L - 1];
    // level 5+: a glowing strip along the front kerbs in the level colour; level 8 gets gold
    if (L >= 5) {
      const col = L >= 8 ? '#ffd24a' : tr;
      glow(x, col, L >= 8 ? 10 : 6); x.strokeStyle = col; x.lineWidth = L >= 8 ? 1.3 : 0.9;
      x.beginPath(); x.moveTo(...up(a, 2.2)); x.lineTo(...up(c, 2.2)); x.lineTo(...up(b, 2.2)); x.stroke(); noglow(x);
    }
    // level 7+: small light pylons on the two front corners
    if (L >= 7) for (const p of [P(ox, oy, 0.14, s - 0.14), P(ox, oy, s - 0.14, 0.14)]) {
      x.fillStyle = '#2a2448'; x.fillRect(p[0] - 1.3, p[1] - 11, 2.6, 9);
      x.fillStyle = 'rgba(255,255,255,.2)'; x.fillRect(p[0] - 1.3, p[1] - 11, 1, 9);
      dot(x, p[0], p[1] - 11.5, 1.6, L >= 8 ? '#ffd24a' : tr, 9);
    }
    // level lights: one per level along the front-right kerb
    for (let i = 0; i < L; i++) { const k = 0.3 + i * (0.55 / 7), q = [c[0] + (b[0] - c[0]) * k, c[1] + (b[1] - c[1]) * k]; dot(x, q[0], q[1] - 1.1, 0.8, tr, 4); }
  }
  // ---- colony helpers: sandstone slab, white domes, teal light ----
  const CTEAL = '#2be3c8';
  const CPAL = { stone: { top: '#c9a77a', left: '#7a5a3a', right: '#9a744c', edge: '#e8cfa0' }, stoneHi: { top: '#d8bc90', left: '#8a6a48', right: '#a8845a', edge: '#f0dcb4' } };
  function colPad(x, ox, oy, s, L) {
    box(x, ox, oy, 0.04, 0.04, s - 0.04, s - 0.04, 0, 2.4, { top: '#5a4230', left: '#2e2218', right: '#3e2e20', edge: '#8a6a48' }, true);
    box(x, ox, oy, 0.16, 0.16, s - 0.16, s - 0.16, 2.4, 3.4, { top: '#8a6a4a', left: '#4a3828', right: '#5a4430', edge: '#b8946a' }, true);
    // teal guide lights on the front kerbs, one per level
    const a = P(ox, oy, 0.04, s - 0.04), c = P(ox, oy, s - 0.04, s - 0.04), b = P(ox, oy, s - 0.04, 0.04);
    for (const p of [a, c, b]) dot(x, p[0], p[1] - 2.6, 1.1, CTEAL, 6);
    for (let i = 0; i < L; i++) { const k = 0.3 + i * (0.55 / 7), q = [c[0] + (b[0] - c[0]) * k, c[1] + (b[1] - c[1]) * k]; dot(x, q[0], q[1] - 1.6, 0.8, L >= 8 ? '#ffd24a' : TRIM[L - 1], 4); }
    if (L >= 5) { glow(x, CTEAL, 6); x.strokeStyle = CTEAL; x.lineWidth = 0.8; x.beginPath(); x.moveTo(a[0], a[1] - 2.4); x.lineTo(c[0], c[1] - 2.4); x.lineTo(b[0], b[1] - 2.4); x.stroke(); noglow(x); }
  }
  // white habitat dome: cx,cy = centre of its base, R = radius, h = height
  function dome(x, cx, cy, R, h, L, cargo) {
    const g = x.createRadialGradient(cx - R * 0.35, cy - h * 0.8, 3, cx, cy - h * 0.3, R * 1.1);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.45, cargo ? '#d8cbb0' : '#dfe6ea'); g.addColorStop(1, cargo ? '#7a6a52' : '#7a8a94');
    x.fillStyle = g; x.beginPath(); x.moveTo(cx - R, cy);
    x.bezierCurveTo(cx - R, cy - h * 1.1, cx + R, cy - h * 1.1, cx + R, cy); x.ellipse(cx, cy, R, R / 2, 0, 0, Math.PI); x.fill();
    // panel ribs
    x.strokeStyle = 'rgba(60,70,80,.35)'; x.lineWidth = 0.7;
    for (let k = -0.66; k <= 0.67; k += 0.33) { x.beginPath(); x.moveTo(cx + k * R, cy + Math.sqrt(1 - k * k) * R / 2); x.quadraticCurveTo(cx + k * R * 0.9, cy - h * 0.9, cx, cy - h * 0.83); x.stroke(); }
    for (const f of [0.3, 0.6]) { x.beginPath(); x.ellipse(cx, cy - h * f, R * (1 - f * 0.45), R * (1 - f * 0.45) / 2, 0, 0, Math.PI); x.stroke(); }
    x.fillStyle = 'rgba(255,255,255,.35)'; x.beginPath(); x.ellipse(cx - R * 0.35, cy - h * 0.6, R * 0.18, h * 0.12, -0.5, 0, Math.PI * 2); x.fill();
  }
  // soft shadow cast toward the bottom-left
  function shadow(x, ox, oy, s, h) {
    return; // shadows switched off (player feedback: they got in the way)
    const k = Math.min(1.2, h / 60);
    const off = [-10 * k, 6 * k];
    x.save();
    glow(x, 'rgba(0,0,0,.85)', 14);
    poly(x, [P(ox, oy, 0.2, 0.2), P(ox, oy, s - 0.2, 0.2), P(ox, oy, s - 0.2, s - 0.2), P(ox, oy, 0.2, s - 0.2)].map((p, i) => (i === 3 || i === 2 ? [p[0] + off[0], p[1] + off[1]] : p)), 'rgba(0,0,0,.45)');
    noglow(x);
    // ambient occlusion: darker ground right around the footprint
    const c = P(ox, oy, s / 2, s / 2), rg = x.createRadialGradient(c[0], c[1], 4, c[0], c[1], s * TW * 0.62);
    rg.addColorStop(0, 'rgba(0,0,0,.35)'); rg.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = rg; x.beginPath(); x.ellipse(c[0], c[1], s * TW * 0.62, s * TH * 0.62, 0, 0, Math.PI * 2); x.fill();
    x.restore();
  }
  // point on a face: face 'L' runs d→c, 'R' runs c→b; k = 0..1 along, z = height
  const fp = (f, face, k, z) => face === 'L'
    ? [f.d[0] + (f.c[0] - f.d[0]) * k, f.d[1] + (f.c[1] - f.d[1]) * k - z]
    : [f.c[0] + (f.b[0] - f.c[0]) * k, f.c[1] + (f.b[1] - f.c[1]) * k - z];
  // lit windows on a face
  function windows(x, f, face, z0, z1, rows, cols, r, warm) {
    for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) {
      const k = (j + 0.5) / cols, z = z0 + (z1 - z0) * (i + 0.5) / rows;
      const p = fp(f, face, k, z);
      const on = r() < 0.7, col = warm || (r() < 0.75 ? 'rgba(255,205,120,.92)' : 'rgba(120,230,255,.88)');
      const sk = face === 'L' ? 0.5 : -0.5;
      x.save(); x.translate(p[0], p[1]); x.transform(1, sk, 0, 1, 0, 0);
      x.fillStyle = 'rgba(0,0,0,.55)'; x.fillRect(-2.9, -3.2, 5.8, 5.4); // frame
      if (on) {
        glow(x, col, 5); x.fillStyle = col; x.fillRect(-2.2, -2.5, 4.4, 4); noglow(x);
        const gw = x.createLinearGradient(0, -2.5, 0, 1.5); gw.addColorStop(0, 'rgba(255,255,255,.45)'); gw.addColorStop(0.4, 'rgba(255,255,255,0)'); gw.addColorStop(1, 'rgba(0,0,0,.25)');
        x.fillStyle = gw; x.fillRect(-2.2, -2.5, 4.4, 4);
        if (r() < 0.3) { x.fillStyle = 'rgba(0,0,0,.35)'; for (let yy = -2.2; yy < 1.4; yy += 1.1) x.fillRect(-2.2, yy, 4.4, 0.45); } // blinds
        if (r() < 0.25) { x.fillStyle = 'rgba(20,10,30,.55)'; x.fillRect(-1.6, -1.2, 1.2, 2.7); } // silhouette inside
      } else { x.fillStyle = 'rgba(20,18,40,.95)'; x.fillRect(-2.2, -2.5, 4.4, 4); x.fillStyle = 'rgba(140,160,255,.12)'; x.fillRect(-2.2, -2.5, 1.6, 4); }
      x.fillStyle = 'rgba(255,255,255,.18)'; x.fillRect(-2.9, 1.6, 5.8, 0.6); // sill
      x.restore();
    }
  }
  // neon text painted along a face
  function sign(x, f, face, k, z, text, color, size) {
    const p = fp(f, face, k, z);
    x.save(); x.translate(p[0], p[1]); x.transform(1, face === 'L' ? 0.5 : -0.5, 0, 1, 0, 0);
    x.font = 'bold ' + (size || 8) + 'px "Segoe UI",sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    const w = x.measureText(text).width + 6;
    x.fillStyle = 'rgba(5,4,12,.85)'; x.fillRect(-w / 2, -(size || 8) * 0.75, w, (size || 8) * 1.5);
    glow(x, color, 8); x.fillStyle = color; x.fillText(text, 0, 0.5); noglow(x);
    x.strokeStyle = color; x.lineWidth = 0.6; x.strokeRect(-w / 2, -(size || 8) * 0.75, w, (size || 8) * 1.5);
    x.restore();
  }
  function vent(x, f, face, k, z, sz) {
    const p = fp(f, face, k, z);
    x.save(); x.translate(p[0], p[1]); x.transform(1, face === 'L' ? 0.5 : -0.5, 0, 1, 0, 0);
    x.fillStyle = '#11101c'; x.fillRect(-sz, -sz * 0.7, sz * 2, sz * 1.4);
    x.strokeStyle = 'rgba(160,150,210,.35)'; x.lineWidth = 0.6;
    for (let i = -sz + 1.5; i < sz; i += 2) { x.beginPath(); x.moveTo(-sz + 1, -sz * 0.7 + 1 + (i + sz) * 0.6); x.lineTo(sz - 1, -sz * 0.7 + 1 + (i + sz) * 0.6); x.stroke(); }
    x.restore();
  }
  // rooftop clutter on a flat roof (tile rect at height z): AC units, vents, solar panels, antennas.
  // More and fancier pieces as the level grows; 'avoid' keeps the middle free for a centre piece.
  function roofKit(x, ox, oy, tx0, ty0, tx1, ty1, z, r, L, avoid) {
    const W = tx1 - tx0, D = ty1 - ty0; if (W < 0.5 || D < 0.5) return;
    const n = Math.min(6, 1 + Math.floor(L / 2) + Math.floor(W * D));
    const spots = [];
    for (let i = 0; i < n * 3 && spots.length < n; i++) {
      const u = tx0 + 0.12 + r() * (W - 0.5), v = ty0 + 0.12 + r() * (D - 0.5);
      if (avoid && Math.abs(u + 0.15 - (tx0 + tx1) / 2) < avoid && Math.abs(v + 0.15 - (ty0 + ty1) / 2) < avoid) continue;
      if (spots.some((p) => Math.abs(p[0] - u) < 0.42 && Math.abs(p[1] - v) < 0.42)) continue;
      spots.push([u, v]);
    }
    spots.sort((p, q) => (p[0] + p[1]) - (q[0] + q[1]));
    for (const [u, v] of spots) {
      const k = r();
      if (k < 0.4) { // AC unit with a fan grille
        const fb = box(x, ox, oy, u, v, u + 0.32, v + 0.3, z, z + 4.5, { top: '#5a6078', left: '#262a3a', right: '#363c52', edge: '#7a82a0', smooth: true });
        const c = P(ox, oy, u + 0.16, v + 0.15);
        x.fillStyle = '#1a1c28'; x.beginPath(); x.ellipse(c[0], c[1] - z - 4.5, 3.6, 1.8, 0, 0, Math.PI * 2); x.fill();
        x.strokeStyle = 'rgba(160,170,210,.6)'; x.lineWidth = 0.4; x.beginPath(); x.moveTo(c[0] - 3, c[1] - z - 4.5); x.lineTo(c[0] + 3, c[1] - z - 4.5); x.moveTo(c[0], c[1] - z - 6.2); x.lineTo(c[0], c[1] - z - 2.8); x.stroke();
        void fb;
      } else if (k < 0.65 && L >= 2) { // tilted solar panel
        const a = up(P(ox, oy, u, v), z + 1), b = up(P(ox, oy, u + 0.42, v), z + 1), c2 = up(P(ox, oy, u + 0.42, v + 0.3), z + 4), d = up(P(ox, oy, u, v + 0.3), z + 4);
        poly(x, [a, b, c2, d], '#1b2a5a', '#5a7ad0', 0.5);
        x.strokeStyle = 'rgba(120,170,255,.35)'; x.lineWidth = 0.4; x.beginPath();
        for (const t2 of [0.33, 0.66]) { x.moveTo(a[0] + (b[0] - a[0]) * t2, a[1] + (b[1] - a[1]) * t2); x.lineTo(d[0] + (c2[0] - d[0]) * t2, d[1] + (c2[1] - d[1]) * t2); }
        x.stroke();
        poly(x, [a, b, [b[0] + (c2[0] - b[0]) * 0.4, b[1] + (c2[1] - b[1]) * 0.4], [a[0] + (d[0] - a[0]) * 0.4, a[1] + (d[1] - a[1]) * 0.4]], 'rgba(255,255,255,.12)');
      } else if (k < 0.85) { // round vent pipe
        const c = P(ox, oy, u + 0.12, v + 0.12);
        cyl(x, c[0], c[1], 2.4, z, z + 6, '#4a4f62', '#1a1c26');
        x.strokeStyle = '#7a8098'; x.lineWidth = 0.5; x.beginPath(); x.ellipse(c[0], c[1] - z - 6, 2.4, 1.2, 0, 0, Math.PI * 2); x.stroke();
      } else { // antenna with a blinking tip
        const c = P(ox, oy, u + 0.1, v + 0.1), hh = 10 + L * 1.5 + r() * 6;
        line(x, [c[0], c[1] - z], [c[0], c[1] - z - hh], '#9a9ab8', 0.8);
        line(x, [c[0] - 2.5, c[1] - z - hh * 0.6], [c[0] + 2.5, c[1] - z - hh * 0.6], '#7a7a98', 0.6);
        dot(x, c[0], c[1] - z - hh, 1.1, '#ff3355', 5);
      }
    }
  }
  // dark silhouette outline around a finished sprite so it reads clearly on any ground
  function outlineSprite(c) {
    const w = c.width, h = c.height;
    const s = document.createElement('canvas'); s.width = w; s.height = h;
    const sx = s.getContext('2d'); sx.drawImage(c, 0, 0); sx.globalCompositeOperation = 'source-in'; sx.fillStyle = 'rgba(4,3,12,.9)'; sx.fillRect(0, 0, w, h);
    const o = document.createElement('canvas'); o.width = w; o.height = h;
    const ox2 = o.getContext('2d');
    for (const [dx, dy] of [[-2, 0], [2, 0], [0, -2], [0, 2], [-1.4, -1.4], [1.4, -1.4], [-1.4, 1.4], [1.4, 1.4]]) ox2.drawImage(s, dx, dy);
    ox2.drawImage(c, 0, 0);
    return o;
  }
  A.prim = { mk, hash, shade, pal, P, up, poly, box, glow, noglow, line, faceLines, cyl, dot, pad, roofKit };

  // heights shared by sprites and per-frame animation
  const HGT = {
    core: (L) => 52 + L * 12, scrapyard: (L) => 46 + L * 4, coppermine: (L) => 58 + L * 5, vault: (L) => 34 + L * 6, silo: (L) => 36 + L * 6,
    xcore: (L) => 54 + L * 6, xdrill: (L) => 56 + L * 6, xpump: (L) => 34 + L * 5, xcrystal: (L) => 30 + L * 4, xdome: (L) => 34 + L * 4, xcryo: (L) => 24 + L * 3, xhangar: (L) => 30 + L * 3,
    factory: (L) => 26 + L * 3, squadhq: (L) => 22 + L * 3, laser: (L) => 12 + L * 2, firewall: (L) => 15 + L * 2,
    mortar: (L) => 14 + L * 2, aa: (L) => 14 + L * 2, emp: (L) => 16 + L * 2, mine: () => 3, skymine: () => 24,
    forge: (L) => 26 + L * 3, extractor: (L) => 20 + L * 3, tank: (L) => 14 + L * 2, lab: (L) => 24 + L * 3, clanhub: (L) => 30 + L * 4,
  };
  A.laserHeight = HGT.laser;

  const DRAW = {
    core(x, ox, oy, s, L, r) {
      const t = TRIM[L - 1], h = HGT.core(L);
      shadow(x, ox, oy, s, h); pad(x, ox, oy, s, L);
      box(x, ox, oy, 0.4, 0.4, s - 0.4, s - 0.4, 3, 11, pal('#2a2340'));
      const c = P(ox, oy, s / 2, s / 2);
      // back half of the holo ring (front half is animated)
      x.globalAlpha = 0.35; glow(x, t, 10); x.strokeStyle = t; x.lineWidth = 2;
      x.beginPath(); x.ellipse(c[0], c[1] - h * 0.55, s * TW * 0.31, s * TW * 0.155, 0, Math.PI, Math.PI * 2); x.stroke(); noglow(x); x.globalAlpha = 1;
      // side pylons from level 2
      if (L >= 2) for (const [px, py] of [[0.55, s - 0.55], [s - 0.55, 0.55]]) {
        const q = P(ox, oy, px, py); cyl(x, q[0], q[1], 4, 11, 30 + L * 6, '#2a2148', '#3d3070');
        dot(x, q[0], q[1] - 32 - L * 6, 2, t, 10);
      }
      const f = box(x, ox, oy, 0.95, 0.95, s - 0.95, s - 0.95, 11, h, { top: '#4a3a7a', left: '#1c1435', right: '#2b1f50', edge: '#6b52b8' });
      windows(x, f, 'L', 22, h - 8, Math.floor((h - 26) / 12), 4, r);
      windows(x, f, 'R', 22, h - 8, Math.floor((h - 26) / 12), 4, r);
      // glass lobby at street level with a lit entrance
      for (const face of ['L', 'R']) {
        const G1 = [fp(f, face, 0.12, 12), fp(f, face, 0.88, 12), fp(f, face, 0.88, 19), fp(f, face, 0.12, 19)];
        const gg = x.createLinearGradient(0, G1[2][1], 0, G1[0][1]); gg.addColorStop(0, 'rgba(160,240,255,.55)'); gg.addColorStop(1, 'rgba(40,90,140,.6)');
        poly(x, G1, gg, 'rgba(180,240,255,.5)', 0.5);
        for (let k = 0.24; k < 0.88; k += 0.12) line(x, fp(f, face, k, 12), fp(f, face, k, 19), 'rgba(10,20,40,.55)', 0.5);
      }
      { const d1 = fp(f, 'L', 0.42, 12), d2 = fp(f, 'L', 0.58, 12), d3 = fp(f, 'L', 0.58, 18), d4 = fp(f, 'L', 0.42, 18); glow(x, '#9ff4ff', 8); poly(x, [d1, d2, d3, d4], 'rgba(220,255,255,.9)'); noglow(x); }
      // floor ledges: thin slabs that stick out a little, with neon on their edge
      for (let z = 22; z < h - 4; z += 24) {
        // only the two visible front faces of a thin slab, so the windows above stay visible
        const d0 = P(ox, oy, 0.88, s - 0.88), c0 = P(ox, oy, s - 0.88, s - 0.88), b0 = P(ox, oy, s - 0.88, 0.88);
        poly(x, [up(d0, z - 1.6), up(c0, z - 1.6), up(c0, z), up(d0, z)], '#221a40'); poly(x, [up(c0, z - 1.6), up(b0, z - 1.6), up(b0, z), up(c0, z)], '#30245a');
        faceLines(x, { d: d0, c: c0, b: b0 }, z - 0.8, t, 1);
      }
      // LED strip down the front corner
      { const c0 = f.c; const gv = x.createLinearGradient(0, c0[1] - h, 0, c0[1] - 12); gv.addColorStop(0, t); gv.addColorStop(1, 'rgba(0,0,0,0)'); glow(x, t, 8); x.strokeStyle = gv; x.lineWidth = 1.6; x.beginPath(); x.moveTo(c0[0], c0[1] - h + 2); x.lineTo(c0[0], c0[1] - 20); x.stroke(); noglow(x); }
      sign(x, f, 'R', 0.5, h - 10, 'CORE', t, 7);
      // holographic billboard on the left face from level 6
      if (L >= 6) {
        const B = [fp(f, 'L', 0.18, h * 0.55), fp(f, 'L', 0.62, h * 0.55), fp(f, 'L', 0.62, h * 0.55 + 18), fp(f, 'L', 0.18, h * 0.55 + 18)];
        poly(x, B, 'rgba(10,6,30,.85)', '#ff2bd6', 0.8);
        x.save(); x.beginPath(); B.forEach((p, i) => (i ? x.lineTo(...p) : x.moveTo(...p))); x.closePath(); x.clip();
        const gb = x.createLinearGradient(B[0][0], 0, B[1][0], 0); gb.addColorStop(0, 'rgba(255,43,214,.55)'); gb.addColorStop(1, 'rgba(25,240,255,.45)');
        x.fillStyle = gb; x.fillRect(B[0][0], B[2][1] - 4, B[1][0] - B[0][0], 30);
        x.fillStyle = 'rgba(255,255,255,.25)'; for (let yy = B[2][1] - 4; yy < B[0][1] + 6; yy += 2) x.fillRect(B[0][0], yy, B[1][0] - B[0][0], 0.6);
        x.restore();
      }
      const f2 = box(x, ox, oy, 1.35, 1.35, s - 1.35, s - 1.35, h, h + 12, { top: '#5a46a0', left: '#251a48', right: '#352766', edge: t });
      faceLines(x, f2, h + 6, t, 1);
      const ty = c[1] - h - 12;
      // roof dish from level 3
      if (L >= 3) {
        const dp = P(ox, oy, s / 2 - 0.3, s / 2 + 0.3);
        x.fillStyle = '#9aa0c0'; x.beginPath(); x.ellipse(dp[0], dp[1] - h - 18, 7, 4, -0.4, 0, Math.PI * 2); x.fill();
        line(x, [dp[0], dp[1] - h - 12], [dp[0], dp[1] - h - 18], '#666', 1.2);
      }
      // crown spire from level 4: a stepped neon pyramid
      if (L >= 4) {
        const ap = P(ox, oy, s / 2, s / 2), r0 = (s - 2.7) / 2;
        const q = [P(ox, oy, 1.35, 1.35), P(ox, oy, s - 1.35, 1.35), P(ox, oy, s - 1.35, s - 1.35), P(ox, oy, 1.35, s - 1.35)].map((p) => up(p, h + 12));
        const tip = up(ap, h + 12 + 18 + L * 2);
        poly(x, [q[3], q[2], tip], '#2a1f50'); poly(x, [q[2], q[1], tip], '#3a2b6a');
        glow(x, t, 8); x.strokeStyle = t; x.lineWidth = 1; x.beginPath(); x.moveTo(...q[3]); x.lineTo(...tip); x.lineTo(...q[1]); x.moveTo(...q[2]); x.lineTo(...tip); x.stroke(); noglow(x);
        void r0;
      }
      const mast = 26 + L * 3 + (L >= 5 ? 14 : 0) + (L >= 4 ? 10 : 0);
      line(x, [c[0], ty], [c[0], ty - mast], L >= 5 ? '#ffe9a0' : '#b9b4d8', 1.6);
      for (let k = 6; k < mast; k += 8) line(x, [c[0] - 3, ty - k], [c[0] + 3, ty - k], '#8a86a8', 0.8);
      return h + 12 + mast + 10;
    },
    scrapyard(x, ox, oy, s, L, r) {
      const H = HGT.scrapyard(L);
      shadow(x, ox, oy, s, 20); pad(x, ox, oy, s, L);
      // fence posts along the back edges
      for (let k = 0.2; k < s; k += 0.45) {
        for (const p of [P(ox, oy, k, 0.12), P(ox, oy, 0.12, k)]) line(x, [p[0], p[1] - 3], [p[0], p[1] - 12], '#4a4f5c', 1.2);
      }
      x.strokeStyle = 'rgba(120,130,150,.5)'; x.lineWidth = 0.6;
      for (const z of [6, 10]) {
        let p = P(ox, oy, 0.12, s - 0.1); x.beginPath(); x.moveTo(p[0], p[1] - z);
        p = P(ox, oy, 0.12, 0.12); x.lineTo(p[0], p[1] - z); p = P(ox, oy, s - 0.1, 0.12); x.lineTo(p[0], p[1] - z); x.stroke();
      }
      const cols = ['#7a4b2a', '#5d5f66', '#8c3b2a', '#4a4d55', '#a0612f', '#6b6f7a', '#3b6a6a'];
      const pieces = [];
      const n = 7 + L * 4;
      for (let i = 0; i < n; i++) {
        const w = 0.25 + r() * 0.5, d = 0.25 + r() * 0.5;
        const px = 0.3 + r() * (s - 0.9 - w), py = 0.5 + r() * (s - 0.8 - d);
        pieces.push({ px, py, w, d, z: r() < 0.3 ? 4 + r() * 6 : 3, h: 3 + r() * (7 + L * 2), c: cols[Math.floor(r() * cols.length)] });
      }
      pieces.sort((a, b) => (a.px + a.py) - (b.px + b.py));
      for (const p of pieces) box(x, ox, oy, p.px, p.py, p.px + p.w, p.py + p.d, p.z, p.z + p.h, pal(p.c));
      // tyres and barrels
      for (let i = 0; i < 2 + L; i++) {
        const q = P(ox, oy, 0.5 + r() * (s - 1), 0.6 + r() * (s - 1.2));
        if (r() < 0.5) { x.fillStyle = '#121216'; x.beginPath(); x.ellipse(q[0], q[1] - 4, 5, 2.5, 0, 0, Math.PI * 2); x.fill(); x.strokeStyle = '#2a2a33'; x.lineWidth = 2; x.stroke(); }
        else cyl(x, q[0], q[1], 3, 2, 10, r() < 0.5 ? '#b0402a' : '#2a6a4a', '#3a3a40');
      }
      // compactor from level 3
      if (L >= 3) {
        const f = box(x, ox, oy, 0.25, s - 1.15, 1.15, s - 0.25, 3, 20, pal('#3e4452'));
        sign(x, f, 'L', 0.5, 13, 'SCRAP', '#ff8a1f', 6);
      }
      // crane
      const base = P(ox, oy, s - 0.5, 0.5);
      cyl(x, base[0], base[1], 4, 3, H, '#3a3f4a', '#5a606e');
      for (let z = 8; z < H; z += 6) line(x, [base[0] - 4, base[1] - z], [base[0] + 4, base[1] - z - 3], '#ffb000', 0.7);
      const tip = P(ox, oy, s * 0.42, s * 0.55);
      line(x, [base[0], base[1] - H], [tip[0], tip[1] - H + 8], '#ffb000', 3);
      line(x, [base[0], base[1] - H - 6], [tip[0], tip[1] - H + 8], '#a37400', 1);
      line(x, [tip[0], tip[1] - H + 8], [tip[0], tip[1] - 30], '#888', 0.8);
      x.fillStyle = '#2b2b33'; x.beginPath(); x.ellipse(tip[0], tip[1] - 29, 7, 3.5, 0, 0, Math.PI * 2); x.fill();
      x.fillStyle = '#4a4a55'; x.beginPath(); x.ellipse(tip[0], tip[1] - 31, 7, 3.5, 0, 0, Math.PI * 2); x.fill();
      return H + 14;
    },
    coppermine(x, ox, oy, s, L, r) {
      const t = TRIM[L - 1], H = HGT.coppermine(L);
      shadow(x, ox, oy, s, 30); pad(x, ox, oy, s, L);
      const nT = 1 + Math.floor((L + 1) / 2);
      const tanks = [[0.85, 0.85], [0.85, s - 0.85], [s - 0.85, 0.85]].slice(0, nT);
      const tank = (p) => {
        const q = P(ox, oy, p[0], p[1]); const h = 20 + L * 2;
        cyl(x, q[0], q[1], 13, 3, h, '#b8632a', '#e8955a');
        x.strokeStyle = 'rgba(80,30,10,.6)'; x.lineWidth = 0.8;
        for (let z = 8; z < h; z += 6) { x.beginPath(); x.ellipse(q[0], q[1] - z, 13, 6.5, 0, 0, Math.PI); x.stroke(); }
        glow(x, t, 6); x.strokeStyle = t; x.lineWidth = 1.2;
        x.beginPath(); x.ellipse(q[0], q[1] - h * 0.55, 13, 6.5, 0, 0, Math.PI); x.stroke(); noglow(x);
        // gauge
        x.fillStyle = '#111'; x.beginPath(); x.arc(q[0] + 6, q[1] - h * 0.35, 2.6, 0, Math.PI * 2); x.fill();
        x.fillStyle = '#39ff88'; x.fillRect(q[0] + 5.5, q[1] - h * 0.35 - 2, 1, 2);
      };
      tanks.filter((p) => p[0] + p[1] < s).forEach(tank);
      // pipes from level 4
      if (L >= 4) {
        const a = P(ox, oy, 0.85, 0.85), b = P(ox, oy, s / 2, s / 2);
        line(x, [a[0], a[1] - 8], [b[0], b[1] - 8], '#7a4a2a', 3); line(x, [a[0], a[1] - 9], [b[0], b[1] - 9], '#c8804a', 1);
      }
      const fb = box(x, ox, oy, s / 2 - 0.5, s / 2 - 0.5, s / 2 + 0.5, s / 2 + 0.5, 3, 16, pal('#3b2a22'));
      sign(x, fb, 'R', 0.5, 9, 'Cu', '#ff9a4a', 7);
      const apex = P(ox, oy, s / 2, s / 2);
      const legs = [P(ox, oy, s / 2 - 0.4, s / 2 - 0.4), P(ox, oy, s / 2 + 0.4, s / 2 - 0.4), P(ox, oy, s / 2 + 0.4, s / 2 + 0.4), P(ox, oy, s / 2 - 0.4, s / 2 + 0.4)];
      for (const l of legs) line(x, [l[0], l[1] - 16], [apex[0], apex[1] - H], '#c8702f', 1.7);
      for (let k = 0.2; k < 0.9; k += 0.17) {
        const pts = legs.map((l) => [l[0] + (apex[0] - l[0]) * k, l[1] - 16 + (apex[1] - H - l[1] + 16) * k]);
        poly(x, pts, null, '#9a5424', 0.8);
        line(x, pts[0], pts[2], 'rgba(154,84,36,.6)', 0.6);
      }
      tanks.filter((p) => p[0] + p[1] >= s).forEach(tank);
      return H + 12;
    },
    vault(x, ox, oy, s, L, r) {
      const h = HGT.vault(L), t = TRIM[L - 1];
      shadow(x, ox, oy, s, h); pad(x, ox, oy, s, L);
      const f = box(x, ox, oy, 0.32, 0.32, s - 0.32, s - 0.32, 3, h, { top: '#56607e', left: '#272c3f', right: '#363d57', edge: '#8a96c0' });
      // armour plates with rivets
      x.fillStyle = 'rgba(200,210,240,.35)';
      for (const face of ['L', 'R']) for (let k = 0.08; k < 1; k += 0.14) for (const z of [6, h - 6]) { const p = fp(f, face, k, z); x.fillRect(p[0] - 0.7, p[1] - 0.7, 1.4, 1.4); }
      faceLines(x, f, h * 0.3, '#19f0ff', 1.3);
      faceLines(x, f, h * 0.78, t, 1.3);
      windows(x, f, 'L', h * 0.42, h * 0.66, 1, 5, r, 'rgba(25,240,255,.7)');
      const m = fp(f, 'R', 0.5, h * 0.52);
      x.save(); x.translate(m[0], m[1]); x.transform(1, -0.5, 0, 1, 0, 0);
      x.fillStyle = '#1c2030'; x.beginPath(); x.arc(0, 0, 11, 0, Math.PI * 2); x.fill();
      x.strokeStyle = '#8a96c0'; x.lineWidth = 2; x.stroke();
      x.restore();
      roofKit(x, ox, oy, 0.32, 0.32, s - 0.32, s - 0.32, h, r, L, 0.75);
      const tf = box(x, ox, oy, s / 2 - 0.4, s / 2 - 0.4, s / 2 + 0.4, s / 2 + 0.4, h, h + 7, pal('#4a5470'));
      if (L >= 3) { const a = P(ox, oy, s - 0.6, s - 0.6); line(x, [a[0], a[1] - h], [a[0], a[1] - h - 20], '#9aa0c0', 1.2); dot(x, a[0], a[1] - h - 20, 2, t, 8); }
      void tf;
      return h + 30;
    },
    // scrap silo: riveted grain-style silos full of pressed scrap, hazard bands, a feed chute between them
    silo(x, ox, oy, s, L, r) {
      const h = HGT.silo(L), t = TRIM[L - 1];
      pad(x, ox, oy, s, L);
      // pressed scrap bales stacked on the slab
      const bale = (tx, ty, z, col) => box(x, ox, oy, tx, ty, tx + 0.42, ty + 0.42, z, z + 7, pal(col));
      const pos = L >= 7 ? [[0.85, 0.85], [2.15, 0.85], [0.85, 2.15], [2.15, 2.15]] : L >= 4 ? [[0.9, 0.9], [2.1, 0.9], [1.5, 2.1]] : [[0.95, 1.05], [2.05, 1.95]];
      const R = L >= 7 ? 15 : L >= 4 ? 16 : 18;
      if (L < 7) { bale(2.2, 0.35, 3, '#6a5a3a'); bale(0.35, 2.25, 3, '#5a4f40'); if (L >= 2) bale(2.2, 0.35, 10, '#7a6a48'); }
      // feed bridge between the tops
      const tops = pos.map((p) => P(ox, oy, p[0], p[1]));
      x.strokeStyle = '#3a3550'; x.lineWidth = 3;
      for (let i = 1; i < tops.length; i++) { x.beginPath(); x.moveTo(tops[0][0], tops[0][1] - h + 4); x.lineTo(tops[i][0], tops[i][1] - h + 4); x.stroke(); }
      pos.map((p, i) => [p, i]).sort((a, b) => a[0][0] + a[0][1] - (b[0][0] + b[0][1])).forEach(([p, i]) => {
        const c = P(ox, oy, p[0], p[1]), hh = h - (i % 2) * 6;
        cyl(x, c[0], c[1], R, 3, hh, '#5a6070', '#7a8090');
        // hazard band and level rings
        x.save(); x.beginPath(); x.rect(c[0] - R, c[1] - hh * 0.32 - 4, R * 2, 8); x.clip();
        for (let k = -R - 8; k < R; k += 6) { x.fillStyle = (Math.floor((k + 40) / 6) % 2) ? '#ffc23a' : '#16131f'; x.beginPath(); x.moveTo(c[0] + k, c[1] - hh * 0.32 + 6); x.lineTo(c[0] + k + 3, c[1] - hh * 0.32 + 6); x.lineTo(c[0] + k + 9, c[1] - hh * 0.32 - 6); x.lineTo(c[0] + k + 6, c[1] - hh * 0.32 - 6); x.fill(); }
        x.restore();
        for (const z of [hh * 0.62, hh - 3]) { x.strokeStyle = 'rgba(20,18,30,.75)'; x.lineWidth = 1.2; x.beginPath(); x.ellipse(c[0], c[1] - z, R, R / 2, 0, 0, Math.PI); x.stroke(); }
        // rivets
        x.fillStyle = 'rgba(220,225,240,.35)';
        for (let a = 0.3; a < Math.PI; a += 0.45) for (const z of [hh * 0.5, hh * 0.78]) x.fillRect(c[0] + Math.cos(a) * R - 0.6, c[1] - z + Math.sin(a) * R / 2 - 0.6, 1.2, 1.2);
        // amber gauge window
        glow(x, '#ffc23a', 6); x.fillStyle = 'rgba(255,194,58,.85)'; x.fillRect(c[0] - 2, c[1] - hh * 0.75, 4, hh * 0.3); noglow(x);
        x.fillStyle = 'rgba(0,0,0,.45)'; x.fillRect(c[0] - 2, c[1] - hh * 0.75, 4, hh * 0.12);
        // conical cap with a hatch
        x.fillStyle = '#4a4f60'; x.beginPath(); x.moveTo(c[0] - R, c[1] - hh); x.lineTo(c[0], c[1] - hh - R * 0.55); x.lineTo(c[0] + R, c[1] - hh); x.ellipse(c[0], c[1] - hh, R, R / 2, 0, 0, Math.PI); x.fill();
        x.strokeStyle = t; x.lineWidth = 1; x.beginPath(); x.ellipse(c[0], c[1] - hh, R, R / 2, 0, 0, Math.PI); x.stroke();
        dot(x, c[0], c[1] - hh - R * 0.55, 1.6, L >= 8 ? '#ffd76a' : t, 6);
      });
      if (L >= 5) { const a = P(ox, oy, s - 0.45, s - 0.45); line(x, [a[0], a[1] - 4], [a[0], a[1] - h - 26], '#9aa0c0', 1.2); dot(x, a[0], a[1] - h - 26, 2, '#ffc23a', 8); }
      return h + 34;
    },

    // ================= the colony (second city): sand-stone, white domes, teal light =================
    xcore(x, ox, oy, s, L, r) {
      const t = TRIM[L - 1], h = HGT.xcore(L);
      colPad(x, ox, oy, s, L);
      // stepped sandstone ring base
      box(x, ox, oy, 0.35, 0.35, s - 0.35, s - 0.35, 3, 12, CPAL.stone);
      box(x, ox, oy, 0.7, 0.7, s - 0.7, s - 0.7, 12, 18, CPAL.stoneHi);
      const c = P(ox, oy, s / 2, s / 2);
      // airlock tunnels on the front faces
      for (const [tx, ty] of [[s / 2, s - 0.45], [s - 0.45, s / 2]]) { const q = P(ox, oy, tx, ty); cyl(x, q[0], q[1] - 3, 7, 0, 9, '#c8c0b0', '#e8e2d6'); dot(x, q[0], q[1] - 10, 1.4, CTEAL, 6); }
      // main dome (bigger and with more rings every level)
      dome(x, c[0], c[1] - 18, 40 + L * 2, h - 18, L);
      // observation band
      glow(x, CTEAL, 8); x.strokeStyle = CTEAL; x.lineWidth = 1.6;
      x.beginPath(); x.ellipse(c[0], c[1] - 18 - (h - 18) * 0.35, (40 + L * 2) * 0.93, (40 + L * 2) * 0.93 / 2, 0, 0.1, Math.PI - 0.1); x.stroke(); noglow(x);
      for (let k = 0; k < 9; k++) { const a = 0.25 + k * 0.33; const R = (40 + L * 2) * 0.93; x.fillStyle = 'rgba(160,255,240,.85)'; x.fillRect(c[0] + Math.cos(a) * R - 1.6, c[1] - 18 - (h - 18) * 0.35 + Math.sin(a) * R / 2 - 3, 3.2, 2.4); }
      // antenna mast and dish on top
      const topY = c[1] - h;
      line(x, [c[0], topY + 4], [c[0], topY - 22 - L * 2], '#d8d2c4', 1.6);
      dot(x, c[0], topY - 22 - L * 2, 2.2, L >= 8 ? '#ffd24a' : t, 10);
      if (L >= 3) { x.fillStyle = '#e8e2d6'; x.beginPath(); x.ellipse(c[0] + 10, topY - 6, 7, 3.5, -0.5, 0, Math.PI * 2); x.fill(); line(x, [c[0] + 10, topY - 6], [c[0] + 14, topY - 12], '#9a9488', 0.8); }
      if (L >= 5) for (const dx of [-28, 28]) { const q = [c[0] + dx, c[1] - 6]; line(x, q, [q[0], q[1] - 34], '#b8b0a0', 1.2); dot(x, q[0], q[1] - 34, 1.6, CTEAL, 8); }
      if (L >= 7) { glow(x, t, 10); x.strokeStyle = t; x.lineWidth = 1.2; x.beginPath(); x.ellipse(c[0], topY + 8, 16, 7, 0, 0, Math.PI * 2); x.stroke(); noglow(x); }
      return h + 34 + L * 2;
    },
    xdrill(x, ox, oy, s, L, r) {
      const t = TRIM[L - 1], H = HGT.xdrill(L);
      colPad(x, ox, oy, s, L);
      // engine housing
      const f = box(x, ox, oy, 0.4, 1.2, 1.9, s - 0.3, 3, 20, CPAL.stone);
      vent(x, f, 'L', 0.5, 12, 6);
      sign(x, f, 'L', 0.5, 5, 'DRILL', '#ffb050', 5);
      // derrick tower (lattice)
      const b = P(ox, oy, s - 0.95, 0.95), w = 13;
      const legs = [[b[0] - w, b[1]], [b[0] + w, b[1]], [b[0], b[1] + w / 2], [b[0], b[1] - w / 2]];
      for (const l of legs) line(x, l, [b[0], b[1] - H], '#c08a50', 1.6);
      for (let z = 8; z < H - 6; z += 9) { const k = 1 - z / H; line(x, [b[0] - w * k, b[1] - z], [b[0] + w * k, b[1] - z - 9], 'rgba(192,138,80,.8)', 0.8); line(x, [b[0] + w * k, b[1] - z], [b[0] - w * k, b[1] - z - 9], 'rgba(192,138,80,.8)', 0.8); }
      dot(x, b[0], b[1] - H - 2, 2, L >= 8 ? '#ffd24a' : t, 8);
      // drill bit in the ground with a sand ring
      x.fillStyle = 'rgba(120,80,40,.55)'; x.beginPath(); x.ellipse(b[0], b[1], 18, 9, 0, 0, Math.PI * 2); x.fill();
      cyl(x, b[0], b[1], 3.5, 0, 26, '#8a8a96', '#b0b0bc');
      // scrap hopper full of glinting metal
      const hp = P(ox, oy, 1.2, 0.8); cyl(x, hp[0], hp[1], 10, 3, 14, '#6a5a48', '#2a2018');
      for (let i = 0; i < 9; i++) { x.fillStyle = ['#a0a0b0', '#c08a50', '#707080'][i % 3]; x.fillRect(hp[0] - 7 + r() * 14, hp[1] - 15 + r() * 3, 2.4, 1.6); }
      return H + 14;
    },
    xpump(x, ox, oy, s, L, r) {
      const t = TRIM[L - 1], H = HGT.xpump(L);
      colPad(x, ox, oy, s, L);
      const c = P(ox, oy, s / 2, s / 2);
      // geyser pool
      const g = x.createRadialGradient(c[0], c[1] - 3, 2, c[0], c[1] - 3, 26);
      g.addColorStop(0, '#ffb080'); g.addColorStop(0.5, '#c0603a'); g.addColorStop(1, 'rgba(90,40,20,0)');
      x.fillStyle = g; x.beginPath(); x.ellipse(c[0], c[1] - 3, 26, 13, 0, 0, Math.PI * 2); x.fill();
      // pump heads around the pool
      for (const [tx, ty] of [[0.7, 0.7], [s - 0.7, 0.7], [0.7, s - 0.7], [s - 0.7, s - 0.7]]) {
        const q = P(ox, oy, tx, ty); cyl(x, q[0], q[1], 6, 3, 14 + L, '#b8b0a0', '#d8d0c0');
        glow(x, '#ff9a4a', 6); x.fillStyle = '#ff9a4a'; x.fillRect(q[0] - 1.5, q[1] - 12 - L, 3, 4); noglow(x);
      }
      // tall condenser column with copper coils
      cyl(x, c[0], c[1] - 3, 9, 3, H, '#c8c0b0', '#e8e2d6');
      for (let z = 14; z < H - 4; z += 6) { x.strokeStyle = '#d0703a'; x.lineWidth = 1.6; x.beginPath(); x.ellipse(c[0], c[1] - 3 - z, 9.5, 4.7, 0, 0, Math.PI); x.stroke(); }
      dot(x, c[0], c[1] - 3 - H - 3, 2, L >= 8 ? '#ffd24a' : t, 8);
      return H + 14;
    },
    xcrystal(x, ox, oy, s, L, r) {
      const t = TRIM[L - 1], H = HGT.xcrystal(L);
      colPad(x, ox, oy, s, L);
      const c = P(ox, oy, s / 2, s / 2);
      // resonator ring frame
      for (const a of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) { const q = [c[0] + Math.cos(a) * 28, c[1] + Math.sin(a) * 14]; line(x, q, [q[0], q[1] - H * 0.7], '#b8b0a0', 2); dot(x, q[0], q[1] - H * 0.7, 1.6, CTEAL, 6); }
      // plasma crystal cluster
      const shards = [[0, 0, 1], [-10, 4, 0.65], [9, 5, 0.7], [-4, 8, 0.5], [6, -3, 0.55]].slice(0, 3 + Math.min(2, Math.floor(L / 3)));
      for (const [dx, dy, k] of shards) {
        const bx = c[0] + dx, by = c[1] - 4 + dy, hh = H * k, ww = 7 * k + 3;
        const gg = x.createLinearGradient(bx - ww, 0, bx + ww, 0); gg.addColorStop(0, '#6a2ab0'); gg.addColorStop(0.5, '#e0a8ff'); gg.addColorStop(1, '#4a1a80');
        glow(x, '#b26bff', 12); poly(x, [[bx - ww, by], [bx - ww * 0.6, by - hh * 0.75], [bx, by - hh], [bx + ww * 0.6, by - hh * 0.75], [bx + ww, by]], gg); noglow(x);
        line(x, [bx, by], [bx, by - hh], 'rgba(255,255,255,.45)', 0.7);
      }
      // upper ring
      glow(x, CTEAL, 8); x.strokeStyle = CTEAL; x.lineWidth = 1.4; x.beginPath(); x.ellipse(c[0], c[1] - H * 0.7, 28, 14, 0, 0, Math.PI * 2); x.stroke(); noglow(x);
      dot(x, c[0], c[1] - H - 8, 1.8, L >= 8 ? '#ffd24a' : t, 8);
      return H + 18;
    },
    xdome(x, ox, oy, s, L, r) {
      const t = TRIM[L - 1], h = HGT.xdome(L);
      colPad(x, ox, oy, s, L);
      const c = P(ox, oy, s / 2, s / 2);
      box(x, ox, oy, 0.3, 0.3, s - 0.3, s - 0.3, 3, 9, CPAL.stone);
      dome(x, c[0], c[1] - 9, 36, h - 9, L, true);
      // cargo door and crates
      const d = P(ox, oy, s / 2, s - 0.3); x.fillStyle = '#4a4238'; x.fillRect(d[0] - 7, d[1] - 20, 14, 13); x.strokeStyle = '#ffc23a'; x.lineWidth = 0.8; x.strokeRect(d[0] - 7, d[1] - 20, 14, 13);
      for (let z = -18; z < -8; z += 3) line(x, [d[0] - 6, d[1] + z], [d[0] + 6, d[1] + z], 'rgba(255,194,58,.35)', 0.6);
      box(x, ox, oy, s - 0.75, 0.3, s - 0.3, 0.75, 3, 9, pal('#7a6040'));
      if (L >= 3) box(x, ox, oy, 0.3, s - 0.75, 0.75, s - 0.3, 3, 9, pal('#5a4f40'));
      dot(x, c[0], c[1] - h - 4, 1.8, L >= 8 ? '#ffd24a' : t, 8);
      return h + 16;
    },
    // hangar: arched sandstone hall with a big striped door, a crane gantry and a landing pad on the roof
    xhangar(x, ox, oy, s, L, r) {
      const t = TRIM[L - 1], h = HGT.xhangar(L);
      colPad(x, ox, oy, s, L);
      const f = box(x, ox, oy, 0.3, 0.5, s - 0.3, s - 0.3, 3, h, CPAL.stone);
      // arched roof over the hall
      const a = up(P(ox, oy, 0.3, 0.5), h), b2 = up(P(ox, oy, s - 0.3, 0.5), h), c2 = up(P(ox, oy, s - 0.3, s - 0.3), h), d2 = up(P(ox, oy, 0.3, s - 0.3), h);
      const rg = x.createLinearGradient(0, a[1] - 16, 0, c2[1]); rg.addColorStop(0, '#f0e6d4'); rg.addColorStop(1, '#8a7a62');
      x.fillStyle = rg; x.beginPath(); x.moveTo(...d2); x.bezierCurveTo(d2[0], d2[1] - 22, a[0], a[1] - 22, a[0], a[1]); x.lineTo(b2[0], b2[1]); x.bezierCurveTo(b2[0], b2[1] - 22, c2[0], c2[1] - 22, c2[0], c2[1]); x.closePath(); x.fill();
      x.strokeStyle = 'rgba(60,50,40,.35)'; x.lineWidth = 0.7;
      for (let k = 0.15; k < 1; k += 0.14) { const p1 = [d2[0] + (c2[0] - d2[0]) * k, d2[1] + (c2[1] - d2[1]) * k], p2 = [a[0] + (b2[0] - a[0]) * k, a[1] + (b2[1] - a[1]) * k]; x.beginPath(); x.moveTo(...p1); x.bezierCurveTo(p1[0], p1[1] - 22, p2[0], p2[1] - 22, p2[0], p2[1]); x.stroke(); }
      // big hangar door on the left face, hazard frame
      const D = [fp(f, 'L', 0.15, 3), fp(f, 'L', 0.85, 3), fp(f, 'L', 0.85, h * 0.82), fp(f, 'L', 0.15, h * 0.82)];
      poly(x, D, '#2a2620', '#ffc23a', 1.2);
      for (let z = 7; z < h * 0.8; z += 4) line(x, fp(f, 'L', 0.16, z), fp(f, 'L', 0.84, z), 'rgba(255,194,58,.22)', 0.7);
      glow(x, CTEAL, 8); line(x, fp(f, 'L', 0.15, h * 0.86), fp(f, 'L', 0.85, h * 0.86), CTEAL, 1.4); noglow(x);
      sign(x, f, 'R', 0.5, h * 0.55, 'HANGAR', CTEAL, 6);
      windows(x, f, 'R', h * 0.25, h * 0.4, 1, 4, r, 'rgba(43,227,200,.8)');
      // crane gantry on the back corner
      const g0 = P(ox, oy, s - 0.5, 0.6);
      line(x, [g0[0], g0[1] - h], [g0[0], g0[1] - h - 26 - L * 2], '#c08a50', 2);
      line(x, [g0[0], g0[1] - h - 24 - L * 2], [g0[0] - 34, g0[1] - h - 8 - L * 2], '#c08a50', 1.6);
      line(x, [g0[0] - 30, g0[1] - h - 10 - L * 2], [g0[0] - 30, g0[1] - h + 6], '#888', 0.6);
      dot(x, g0[0], g0[1] - h - 28 - L * 2, 2, L >= 8 ? '#ffd24a' : t, 8);
      if (L >= 4) { const q = P(ox, oy, 0.9, s - 0.9); x.fillStyle = 'rgba(255,225,77,.4)'; x.beginPath(); x.ellipse(q[0], q[1] - h - 8, 10, 5, 0, 0, Math.PI * 2); x.fill(); }
      return h + 40 + L * 2;
    },
    xcryo(x, ox, oy, s, L, r) {
      const t = TRIM[L - 1], h = HGT.xcryo(L);
      colPad(x, ox, oy, s, L);
      const c = P(ox, oy, s / 2, s / 2);
      cyl(x, c[0], c[1] - 2, 17, 3, h, '#d8d2c4', '#eeeae0');
      // plasma window and frost rings
      glow(x, '#b26bff', 12); x.fillStyle = 'rgba(178,107,255,.9)'; x.fillRect(c[0] - 3, c[1] - h * 0.8, 6, h * 0.55); noglow(x);
      for (const z of [h * 0.3, h * 0.92]) { x.strokeStyle = 'rgba(120,220,255,.8)'; x.lineWidth = 1.4; x.beginPath(); x.ellipse(c[0], c[1] - 2 - z, 17, 8.5, 0, 0, Math.PI); x.stroke(); }
      x.fillStyle = '#c8c0b0'; x.beginPath(); x.ellipse(c[0], c[1] - 2 - h, 10, 5, 0, 0, Math.PI * 2); x.fill();
      dot(x, c[0], c[1] - h - 6, 1.6, L >= 8 ? '#ffd24a' : t, 8);
      return h + 12;
    },
    factory(x, ox, oy, s, L, r) {
      const h = HGT.factory(L);
      shadow(x, ox, oy, s, h + 20); pad(x, ox, oy, s, L);
      const f = box(x, ox, oy, 0.25, 0.25, s - 0.25, s - 0.25, 3, h, { top: '#4a4232', left: '#221e16', right: '#322c1f', edge: '#8a7a4a' });
      // hazard-striped garage door (left face)
      const D = [fp(f, 'L', 0.2, 3), fp(f, 'L', 0.62, 3), fp(f, 'L', 0.62, h * 0.7), fp(f, 'L', 0.2, h * 0.7)];
      poly(x, D, '#14120c', '#ffe14d', 1);
      for (let z = 6; z < h * 0.7; z += 3.5) line(x, fp(f, 'L', 0.2, z), fp(f, 'L', 0.62, z), 'rgba(255,225,77,.3)', 0.7);
      x.save(); x.beginPath(); D.forEach((p, i) => (i ? x.lineTo(...p) : x.moveTo(...p))); x.closePath(); x.clip();
      for (let k = 0; k < 1; k += 0.08) line(x, fp(f, 'L', 0.2 + k * 0.42, 3), fp(f, 'L', 0.2 + k * 0.42 + 0.04, 9), '#ffe14d', 1.6);
      x.restore();
      windows(x, f, 'L', h * 0.55, h * 0.85, 1, 2, r, 'rgba(255,190,90,.9)');
      windows(x, f, 'R', h * 0.45, h * 0.85, 2, 4, r);
      sign(x, f, 'R', 0.5, h * 0.2, 'FABRYKA', '#ffe14d', 6);
      for (let i = 0; i < 3; i++) {
        const sx = 0.45 + i * 0.75;
        box(x, ox, oy, sx, 0.5, sx + 0.5, s - 0.5, h, h + 9, pal('#5a5040'));
        // skylights on the sawtooth roof
        const a = P(ox, oy, sx + 0.5, 0.6), b = P(ox, oy, sx + 0.5, s - 0.6);
        line(x, [a[0], a[1] - h - 5], [b[0], b[1] - h - 5], 'rgba(120,230,255,.6)', 2);
      }
      faceLines(x, f, h - 3, '#ffe14d', 1.2);
      // fan housing (blades animated)
      const fn = P(ox, oy, 0.9, s - 0.9);
      x.fillStyle = '#1a1820'; x.beginPath(); x.ellipse(fn[0], fn[1] - h - 10, 8, 4, 0, 0, Math.PI * 2); x.fill();
      x.strokeStyle = '#6a6070'; x.lineWidth = 1; x.stroke();
      const chimneys = L >= 3 ? [[s - 0.75, 0.75], [s - 1.4, 0.7]] : [[s - 0.75, 0.75]];
      for (const [cx2, cy2] of chimneys) {
        const cp = P(ox, oy, cx2, cy2), CH = h + 30 + L * 3;
        cyl(x, cp[0], cp[1], 6, h, CH, '#3d3a44', '#1a181f');
        for (let z = h + 6; z < CH; z += 7) { x.strokeStyle = 'rgba(255,90,60,.5)'; x.lineWidth = 1; x.beginPath(); x.ellipse(cp[0], cp[1] - z, 6, 3, 0, 0, Math.PI); x.stroke(); }
        glow(x, '#ffe14d', 8); x.strokeStyle = '#ffe14d'; x.lineWidth = 1.4;
        x.beginPath(); x.ellipse(cp[0], cp[1] - CH + 5, 6, 3, 0, 0, Math.PI); x.stroke(); noglow(x);
      }
      return h + 30 + L * 3 + 8;
    },
    squadhq(x, ox, oy, s, L, r) {
      const h = HGT.squadhq(L), t = '#39ff88';
      shadow(x, ox, oy, s, h + 10); pad(x, ox, oy, s, L);
      if (L >= 3) {
        const tw = box(x, ox, oy, 0.5, 0.5, 1.4, 1.4, 3, h + 26, { top: '#2f5a3e', left: '#112017', right: '#183022', edge: t });
        faceLines(x, tw, h + 18, TRIM[L - 1], 1.2);
        windows(x, tw, 'R', h, h + 14, 2, 2, r, 'rgba(57,255,136,.8)');
      }
      const f = box(x, ox, oy, 0.35, 0.35 + (L >= 3 ? 1.2 : 0), s - 0.35, s - 0.35, 3, h, { top: '#26402f', left: '#112017', right: '#183022', edge: '#3fbf73' });
      faceLines(x, f, h * 0.35, t, 1.2);
      windows(x, f, 'L', h * 0.55, h * 0.9, 1, 7, r, 'rgba(57,255,136,.55)');
      windows(x, f, 'R', h * 0.55, h * 0.9, 1, 6, r);
      sign(x, f, 'R', 0.3, h * 0.2, 'SQUAD', t, 6);
      // sandbags + crates
      for (let k = 0.1; k < 0.9; k += 0.12) { const p = fp(f, 'L', k, 0); x.fillStyle = '#4a4630'; x.beginPath(); x.ellipse(p[0], p[1] + 6, 4, 2, 0, 0, Math.PI * 2); x.fill(); }
      const c = P(ox, oy, s / 2 + 0.2, s / 2 + (L >= 3 ? 0.6 : 0)); const cy = c[1] - h;
      x.fillStyle = '#16251b'; x.beginPath(); x.ellipse(c[0], cy, 26, 13, 0, 0, Math.PI * 2); x.fill();
      glow(x, t, 10); x.strokeStyle = t; x.lineWidth = 1.8; x.stroke();
      x.save(); x.translate(c[0], cy); x.scale(1, 0.5); x.font = 'bold 22px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillStyle = t; x.fillText('S', 0, 1); x.restore(); noglow(x);
      // parked drone from level 4
      if (L >= 4) {
        x.fillStyle = '#2a2d3a'; x.beginPath(); x.ellipse(c[0] + 10, cy - 4, 6, 3, 0, 0, Math.PI * 2); x.fill();
        for (const [ax, ay] of [[-6, -2], [6, -2], [-6, 2], [6, 2]]) { x.strokeStyle = '#555a70'; x.lineWidth = 1; x.beginPath(); x.moveTo(c[0] + 10, cy - 4); x.lineTo(c[0] + 10 + ax, cy - 4 + ay); x.stroke(); }
      }
      // flag
      const an = P(ox, oy, s - 0.6, s - 0.6);
      line(x, [an[0], an[1] - h], [an[0], an[1] - h - 30], '#9aa', 1.2);
      poly(x, [[an[0], an[1] - h - 30], [an[0] + 14, an[1] - h - 26], [an[0], an[1] - h - 21]], t);
      return h + 46;
    },
    laser(x, ox, oy, s, L) {
      const h = HGT.laser(L);
      shadow(x, ox, oy, s, h + 10); pad(x, ox, oy, s, L);
      const f = box(x, ox, oy, 0.3, 0.3, s - 0.3, s - 0.3, 3, h, pal('#2a2f45'));
      faceLines(x, f, h - 4, TRIM[L - 1], 1.2);
      // hazard chevrons + level pips
      for (let k = 0.15; k < 0.9; k += 0.18) line(x, fp(f, 'L', k, 4), fp(f, 'L', k + 0.06, 8), '#ffe14d', 1.4);
      for (let i = 0; i < L; i++) { const p = fp(f, 'R', 0.2 + i * 0.13, h * 0.5); dot(x, p[0], p[1], 1.2, TRIM[L - 1], 4); }
      const c = P(ox, oy, s / 2, s / 2);
      x.strokeStyle = '#6a7090'; x.lineWidth = 1; x.beginPath(); x.ellipse(c[0], c[1] - h, 14, 7, 0, 0, Math.PI * 2); x.stroke();
      return h + 34;
    },
    firewall(x, ox, oy, s, L) {
      // every level looks different: concrete -> steel -> armour -> neon -> gold
      const h = HGT.firewall(L), tr = TRIM[L - 1];
      const cols = ['#4a4048', '#3a3046', '#2f3550', '#2a3a48', '#4a3a20', '#3a2450', '#2a2a36', '#5a4618'];
      const w0 = L >= 5 ? 0.24 : 0.3, w1 = 1 - w0;
      const f = box(x, ox, oy, w0, w0, w1, w1, 0, h, pal(cols[L - 1]));
      if (L >= 2) { // reinforcement bands
        for (const z of L >= 4 ? [h * 0.3, h * 0.7] : [h * 0.5]) { x.strokeStyle = L >= 8 ? '#ffd24a' : 'rgba(200,210,240,.45)'; x.lineWidth = 0.8; x.beginPath(); x.moveTo(...fp(f, 'L', 0, z)); x.lineTo(...fp(f, 'L', 1, z)); x.lineTo(...fp(f, 'R', 1, z)); x.stroke(); }
      }
      // laser seam: one at first, two from level 5, in the level colour from level 3
      const seam = L >= 3 ? tr : '#ff3355';
      for (const k of L >= 5 ? [0.3, 0.7] : [0.5]) { line(x, fp(f, 'L', k, 2), fp(f, 'L', k, h - 2), seam, 1, L >= 3 ? 5 : 0); line(x, fp(f, 'R', k, 2), fp(f, 'R', k, h - 2), seam, 0.8, L >= 3 ? 4 : 0); }
      const c = P(ox, oy, 0.5, 0.5);
      if (L >= 4) { // metal cap with an emitter
        box(x, ox, oy, w0 - 0.04, w0 - 0.04, w1 + 0.04, w1 + 0.04, h, h + 2.2, { top: L >= 8 ? '#e0b030' : '#5a6078', left: L >= 8 ? '#7a5a10' : '#262a3a', right: L >= 8 ? '#a07818' : '#363c52', edge: L >= 8 ? '#ffe68a' : '#7a82a0' }, true);
      }
      const top = h + (L >= 4 ? 2.2 : 0);
      if (L >= 6) { line(x, [c[0] - 3, c[1] - top], [c[0] - 3, c[1] - top - 4], '#9aa0c0', 0.8); line(x, [c[0] + 3, c[1] - top], [c[0] + 3, c[1] - top - 4], '#9aa0c0', 0.8); }
      dot(x, c[0], c[1] - top - 1, L >= 7 ? 2.6 : 2.2, L >= 8 ? '#ffd24a' : L >= 3 ? tr : '#ff3355', L >= 7 ? 12 : 9);
      return top + 8;
    },
    mortar(x, ox, oy, s, L) {
      const h = HGT.mortar(L), t = TRIM[L - 1];
      shadow(x, ox, oy, s, h + 10); pad(x, ox, oy, s, L);
      // sandbagged emplacement ring
      const c = P(ox, oy, s / 2, s / 2);
      for (let a = 0; a < Math.PI * 2; a += 0.35) {
        x.fillStyle = a % 0.7 < 0.35 ? '#4a4630' : '#3c3826';
        x.beginPath(); x.ellipse(c[0] + Math.cos(a) * 34, c[1] + Math.sin(a) * 17 - 4, 7, 4, 0, 0, Math.PI * 2); x.fill();
      }
      const f = box(x, ox, oy, 0.9, 0.9, s - 0.9, s - 0.9, 3, h, pal('#2c3040'));
      faceLines(x, f, h - 4, t, 1.2);
      // squat dome + angled plasma barrel
      x.fillStyle = '#3a4058'; x.beginPath(); x.ellipse(c[0], c[1] - h, 17, 10, 0, Math.PI, 0); x.fill();
      x.fillStyle = '#4a5270'; x.beginPath(); x.ellipse(c[0], c[1] - h, 17, 8.5, 0, 0, Math.PI * 2); x.fill();
      x.save(); x.translate(c[0] + 2, c[1] - h - 6); x.rotate(-0.9);
      x.fillStyle = '#1c1f2c'; x.fillRect(-4, -4, 26, 8);
      x.fillStyle = '#5a6080'; x.fillRect(-4, -4, 26, 2);
      x.fillStyle = t; x.fillRect(19, -4, 3, 8);
      x.restore();
      dot(x, c[0] + 15, c[1] - h - 22, 2.5, t, 10);
      return h + 30;
    },
    aa(x, ox, oy, s, L) {
      const h = HGT.aa(L), t = TRIM[L - 1];
      shadow(x, ox, oy, s, h + 20); pad(x, ox, oy, s, L);
      const f = box(x, ox, oy, 0.28, 0.28, s - 0.28, s - 0.28, 3, h, pal('#33283c'));
      faceLines(x, f, h - 4, t, 1.2);
      // tilted missile pod with 2x3 tubes
      const c = P(ox, oy, s / 2, s / 2);
      x.save(); x.translate(c[0], c[1] - h - 4); x.rotate(-0.45);
      x.fillStyle = '#20202c'; x.fillRect(-12, -14, 24, 18);
      x.strokeStyle = '#6a6a86'; x.lineWidth = 0.8; x.strokeRect(-12, -14, 24, 18);
      for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) {
        x.fillStyle = '#0c0c12'; x.beginPath(); x.arc(-7 + i * 7, -9 + j * 8, 2.6, 0, Math.PI * 2); x.fill();
        x.fillStyle = '#ff3355'; x.beginPath(); x.arc(-7 + i * 7, -9 + j * 8, 1.2, 0, Math.PI * 2); x.fill();
      }
      x.restore();
      line(x, [c[0] - 14, c[1] - h + 2], [c[0] - 14, c[1] - h - 14], '#8a8aa0', 1);
      dot(x, c[0] - 14, c[1] - h - 15, 1.8, '#ff3355', 8);
      // radar dish
      x.fillStyle = '#9aa0c0'; x.beginPath(); x.ellipse(c[0] + 14, c[1] - h - 8, 6, 3, 0.5, 0, Math.PI * 2); x.fill();
      return h + 34;
    },
    // Program Forge: a server block with glowing code screens and an antenna array
    forge(x, ox, oy, s, L) {
      const h = HGT.forge(L), t = TRIM[L - 1];
      shadow(x, ox, oy, s, h); pad(x, ox, oy, s, L);
      const f = box(x, ox, oy, 0.35, 0.35, s - 0.35, s - 0.35, 3, h, pal('#232a3e'));
      // rows of server lights and two "code" screens
      for (let z = 10; z < h - 6; z += 7) faceLines(x, f, z, 'rgba(25,240,255,.18)', 0.6);
      for (const [face, k] of [['L', 0.35], ['R', 0.6]]) {
        const p = fp(f, face, k, h * 0.55);
        x.save(); x.translate(p[0], p[1]); x.transform(1, face === 'L' ? 0.5 : -0.5, 0, 1, 0, 0);
        x.fillStyle = '#04121a'; x.fillRect(-11, -9, 22, 16); glow(x, '#39ff88', 8);
        x.fillStyle = '#39ff88'; for (let i = 0; i < 5; i++) x.fillRect(-9, -7 + i * 3, 4 + ((i * 7 + L) % 12), 1.2);
        noglow(x); x.restore();
      }
      faceLines(x, f, h - 3, t, 1.3);
      roofKit(x, ox, oy, 0.35, 0.35, s - 0.35, s - 0.35, h, G.rng(hash('forge' + L)), L, 0.7);
      const c = P(ox, oy, s / 2, s / 2);
      for (let i = -1; i <= 1; i++) { line(x, [c[0] + i * 10, c[1] - h], [c[0] + i * 10, c[1] - h - 14 - (i === 0 ? 8 : 0)], '#8a90a8', 1.2); dot(x, c[0] + i * 10, c[1] - h - 15 - (i === 0 ? 8 : 0), 1.8, t, 8); }
      return h + 26;
    },
    // plasma extractor: a drill rig pumping glowing purple plasma into a glass column
    extractor(x, ox, oy, s, L) {
      const h = HGT.extractor(L);
      shadow(x, ox, oy, s, h + 20); pad(x, ox, oy, s, L);
      const f = box(x, ox, oy, 0.25, 0.25, s - 1.3, s - 0.25, 3, h * 0.6, pal('#2d2438'));
      faceLines(x, f, h * 0.6 - 4, '#b26bff', 1);
      const c = P(ox, oy, s - 0.75, s / 2);
      cyl(x, c[0], c[1], 9, 3, h + 16, '#3a2a55', '#b26bff');
      x.save(); x.globalAlpha = 0.85; const g = x.createLinearGradient(0, c[1] - h - 14, 0, c[1]);
      g.addColorStop(0, '#f3d6ff'); g.addColorStop(0.4, '#b26bff'); g.addColorStop(1, '#4a1a8a');
      x.fillStyle = g; x.fillRect(c[0] - 5, c[1] - h - 12, 10, h + 8); x.restore();
      glow(x, '#b26bff', 14); x.strokeStyle = '#d9a8ff'; x.lineWidth = 1; x.strokeRect(c[0] - 5, c[1] - h - 12, 10, h + 8); noglow(x);
      const d0 = P(ox, oy, 0.9, s / 2);
      line(x, [d0[0], d0[1] - h * 0.6], [d0[0], d0[1] - h - 18], '#6a6a86', 2.4);
      line(x, [d0[0] - 8, d0[1] - h - 14], [d0[0] + 8, d0[1] - h - 10], '#6a6a86', 1.6);
      return h + 30;
    },
    // plasma tank: armoured sphere with a glowing window
    tank(x, ox, oy, s, L) {
      const h = HGT.tank(L), t = TRIM[L - 1];
      shadow(x, ox, oy, s, h + 24); pad(x, ox, oy, s, L);
      const c = P(ox, oy, s / 2, s / 2), cy = c[1] - h;
      x.strokeStyle = '#4a4a5e'; x.lineWidth = 2.4;
      for (const dx of [-14, 14]) { x.beginPath(); x.moveTo(c[0] + dx, c[1] - 2); x.lineTo(c[0] + dx * 0.6, cy + 6); x.stroke(); }
      const g = x.createRadialGradient(c[0] - 6, cy - 8, 2, c[0], cy, 22);
      g.addColorStop(0, '#6a5a8a'); g.addColorStop(1, '#1e1830');
      x.fillStyle = g; x.beginPath(); x.arc(c[0], cy, 20, 0, Math.PI * 2); x.fill();
      x.strokeStyle = t; x.lineWidth = 1.2; x.beginPath(); x.ellipse(c[0], cy, 20, 6, 0, 0, Math.PI * 2); x.stroke();
      glow(x, '#b26bff', 14); x.fillStyle = '#b26bff'; x.beginPath(); x.ellipse(c[0] + 4, cy - 2, 7, 9, 0, 0, Math.PI * 2); x.fill(); noglow(x);
      x.fillStyle = 'rgba(255,255,255,.35)'; x.beginPath(); x.ellipse(c[0] - 8, cy - 9, 5, 3, -0.5, 0, Math.PI * 2); x.fill();
      return h + 26;
    },
    // EMP pylon: armoured base, a tall coil with copper rings and an energy orb on top
    emp(x, ox, oy, s, L) {
      const h = HGT.emp(L), t = TRIM[L - 1];
      shadow(x, ox, oy, s, h + 40); pad(x, ox, oy, s, L);
      const f = box(x, ox, oy, 0.3, 0.3, s - 0.3, s - 0.3, 3, h, pal('#2a3040'));
      faceLines(x, f, h - 4, t, 1.2);
      const c = P(ox, oy, s / 2, s / 2), top = c[1] - h;
      // coil column
      x.fillStyle = '#1a1e2a'; x.fillRect(c[0] - 3.5, top - 30, 7, 30);
      for (let i = 0; i < 4 + Math.floor(L / 3); i++) {
        const y = top - 4 - i * 6;
        x.fillStyle = i % 2 ? '#b8642c' : '#d88a40'; x.beginPath(); x.ellipse(c[0], y, 9 - i * 0.6, 3.2, 0, 0, Math.PI * 2); x.fill();
        x.strokeStyle = '#4a2410'; x.lineWidth = 0.6; x.stroke();
      }
      // orb holder prongs
      line(x, [c[0] - 6, top - 32], [c[0] - 8, top - 40], '#8a90a8', 1.2);
      line(x, [c[0] + 6, top - 32], [c[0] + 8, top - 40], '#8a90a8', 1.2);
      x.fillStyle = '#0e1220'; x.beginPath(); x.arc(c[0], top - 38, 6.5, 0, Math.PI * 2); x.fill();
      dot(x, c[0], top - 38, 4.2, '#7fd8ff', 14);
      dot(x, c[0] - 2, top - 15, 1.2, t, 6); dot(x, c[0] + 2, top - 21, 1.2, t, 6);
      return h + 46;
    },
    mine(x, ox, oy, s, L) {
      const c = P(ox, oy, 0.5, 0.5), t = TRIM[L - 1];
      x.fillStyle = 'rgba(0,0,0,.4)'; x.beginPath(); x.ellipse(c[0], c[1], 13, 6.5, 0, 0, Math.PI * 2); x.fill();
      x.fillStyle = '#2a2d3a'; x.beginPath(); x.ellipse(c[0], c[1] - 2, 11, 5.5, 0, 0, Math.PI * 2); x.fill();
      x.fillStyle = '#3c4152'; x.beginPath(); x.ellipse(c[0], c[1] - 4, 9, 4.5, 0, 0, Math.PI * 2); x.fill();
      x.strokeStyle = '#ffe14d'; x.lineWidth = 1; x.setLineDash([3, 3]); x.beginPath(); x.ellipse(c[0], c[1] - 4, 9, 4.5, 0, 0, Math.PI * 2); x.stroke(); x.setLineDash([]);
      dot(x, c[0], c[1] - 5, 2, t, 8);
      return 10;
    },
    skymine(x, ox, oy, s, L) {
      // a small floating proximity mine; hidden from attackers like any trap
      const c = P(ox, oy, 0.5, 0.5), t = TRIM[L - 1];
      x.fillStyle = 'rgba(0,0,0,.35)'; x.beginPath(); x.ellipse(c[0], c[1], 8, 4, 0, 0, Math.PI * 2); x.fill();
      const cy = c[1] - 16;
      x.strokeStyle = '#4a4f62'; x.lineWidth = 1; x.beginPath(); x.moveTo(c[0], c[1] - 2); x.lineTo(c[0], cy + 5); x.stroke();
      x.fillStyle = '#2a2d3a'; x.beginPath(); x.arc(c[0], cy, 6, 0, Math.PI * 2); x.fill();
      x.fillStyle = '#ff2bd6';
      for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; x.fillRect(c[0] + Math.cos(a) * 6.5 - 1, cy + Math.sin(a) * 6.5 - 1, 2, 2); }
      dot(x, c[0], cy, 2.4, t, 10);
      return 24;
    },
    lab(x, ox, oy, s, L, r) {
      const h = HGT.lab(L), t = TRIM[L - 1];
      shadow(x, ox, oy, s, h + 20); pad(x, ox, oy, s, L);
      const f = box(x, ox, oy, 0.3, 0.3, s - 0.3, s - 0.3, 3, h, { top: '#2a3a52', left: '#121a28', right: '#1a2638', edge: '#4a7aa8' });
      windows(x, f, 'L', h * 0.35, h * 0.85, 2, 5, r, 'rgba(120,240,255,.85)');
      windows(x, f, 'R', h * 0.35, h * 0.85, 2, 5, r, 'rgba(120,240,255,.85)');
      faceLines(x, f, h * 0.2, '#19f0ff', 1.2);
      sign(x, f, 'R', 0.5, h * 0.18, 'LAB', '#19f0ff', 6);
      roofKit(x, ox, oy, 0.3, 0.3, s - 0.3, s - 0.3, h, r, L, 0.85);
      // glass dome on the roof
      const c = P(ox, oy, s / 2, s / 2), cy = c[1] - h;
      const g = x.createRadialGradient(c[0] - 6, cy - 14, 2, c[0], cy - 6, 24);
      g.addColorStop(0, 'rgba(220,250,255,.75)'); g.addColorStop(0.5, 'rgba(25,240,255,.25)'); g.addColorStop(1, 'rgba(25,240,255,.08)');
      x.fillStyle = g; x.beginPath(); x.ellipse(c[0], cy, 22, 11, 0, Math.PI, 0); x.ellipse(c[0], cy, 22, 24, 0, 0, Math.PI, true); x.fill();
      x.strokeStyle = 'rgba(25,240,255,.6)'; x.lineWidth = 1; x.stroke();
      // tanks of green goo
      for (const [px, py] of [[0.6, s - 0.6], [s - 0.6, 0.6]]) { const q = P(ox, oy, px, py); cyl(x, q[0], q[1], 5, 3, 18, '#1e5a3a', '#39ff88'); }
      dot(x, c[0], cy - 26, 2, t, 10);
      return h + 34;
    },
    clanhub(x, ox, oy, s, L, r) {
      const h = HGT.clanhub(L), t = TRIM[L - 1], col = '#ff2bd6';
      shadow(x, ox, oy, s, h + 30); pad(x, ox, oy, s, L);
      // low barracks ring + central uplink tower
      const f = box(x, ox, oy, 0.3, 0.3, s - 0.3, s - 0.3, 3, 16, { top: '#3a2440', left: '#1a1020', right: '#28182f', edge: '#a04a9a' });
      faceLines(x, f, 10, col, 1.2);
      sign(x, f, 'R', 0.5, 8, 'CLAN', col, 6);
      roofKit(x, ox, oy, 0.3, 0.3, s - 0.3, s - 0.3, 16, r, L, 0.95);
      const tw = box(x, ox, oy, s / 2 - 0.55, s / 2 - 0.55, s / 2 + 0.55, s / 2 + 0.55, 16, h, { top: '#4a2c52', left: '#22142a', right: '#321c3c', edge: '#c060b8' });
      windows(x, tw, 'L', 22, h - 6, Math.max(1, Math.floor((h - 26) / 10)), 2, r, 'rgba(255,120,230,.85)');
      windows(x, tw, 'R', 22, h - 6, Math.max(1, Math.floor((h - 26) / 10)), 2, r, 'rgba(255,120,230,.85)');
      faceLines(x, tw, h - 4, t, 1.2);
      const c = P(ox, oy, s / 2, s / 2);
      // uplink dish
      x.save(); x.translate(c[0] + 2, c[1] - h - 8); x.rotate(-0.5);
      x.fillStyle = '#b8b0d0'; x.beginPath(); x.ellipse(0, 0, 11, 5, 0, 0, Math.PI * 2); x.fill();
      x.fillStyle = '#8a82a8'; x.beginPath(); x.ellipse(1, 1, 7, 3, 0, 0, Math.PI * 2); x.fill();
      x.restore();
      line(x, [c[0], c[1] - h], [c[0] + 2, c[1] - h - 8], '#777', 1.2);
      // clan banner
      const bp = P(ox, oy, 0.6, s - 0.6);
      line(x, [bp[0], bp[1] - 3], [bp[0], bp[1] - 40], '#9aa', 1.2);
      poly(x, [[bp[0], bp[1] - 40], [bp[0] + 12, bp[1] - 38], [bp[0] + 12, bp[1] - 24], [bp[0], bp[1] - 26]], col);
      dot(x, bp[0] + 6, bp[1] - 32, 2, '#ffe14d', 6);
      return h + 30;
    },
    rubble(x, ox, oy, s, _L, r) {
      box(x, ox, oy, 0.1, 0.1, s - 0.1, s - 0.1, 0, 2, { top: '#141221', left: '#0a0912', right: '#0f0d19', edge: '#221e38' }, true);
      // scorch mark
      const c = P(ox, oy, s / 2, s / 2);
      const g = x.createRadialGradient(c[0], c[1], 2, c[0], c[1], s * 24);
      g.addColorStop(0, 'rgba(0,0,0,.7)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = g; x.beginPath(); x.ellipse(c[0], c[1], s * 26, s * 13, 0, 0, Math.PI * 2); x.fill();
      const n = 4 + s * 4, ps = [];
      for (let i = 0; i < n; i++) { const w = 0.15 + r() * 0.35; ps.push({ px: 0.2 + r() * (s - 0.6), py: 0.2 + r() * (s - 0.6), w, h: 2 + r() * 7 }); }
      ps.sort((a, b) => a.px + a.py - b.px - b.py);
      for (const p of ps) box(x, ox, oy, p.px, p.py, p.px + p.w, p.py + p.w * (0.5 + r()), 2, 2 + p.h, pal(r() < 0.5 ? '#2a2633' : '#3a2a22'));
      // glowing embers
      for (let i = 0; i < s * 3; i++) { const q = P(ox, oy, 0.3 + r() * (s - 0.6), 0.3 + r() * (s - 0.6)); dot(x, q[0], q[1] - 2, 1, '#ff6a2a', 6); }
      return 16;
    },
  };

  // returns cached sprite {c, ax, ay, w, h, top}
  A.sprite = function (type, level) {
    const key = type + level;
    let sp = cache.get(key);
    if (sp) return sp;
    const s = type === 'rubble' ? level : G.BUILDINGS[type].size;
    const w = s * TW + PADX * 2, h = s * TH + HEAD + 10;
    const [c, x] = mk(w, h, SS);
    const ox = s * TW / 2 + PADX, oy = HEAD;
    const top = DRAW[type](x, ox, oy, s, level, G.rng(hash(key)));
    sp = { c: outlineSprite(c), ax: ox, ay: oy, w, h, top, s };
    cache.set(key, sp);
    return sp;
  };
  // ---------- obstacles on the home map ----------
  const DRAWO = {
    wreck(x, ox, oy, s, r) { // burnt-out hover car lying a bit askew
      const c = P(ox, oy, s / 2, s / 2);
      x.fillStyle = 'rgba(0,0,0,.45)'; x.beginPath(); x.ellipse(c[0], c[1] + 2, 52, 22, 0, 0, Math.PI * 2); x.fill();
      x.save(); x.translate(c[0], c[1] - 8); x.scale(1.65, 1.65); x.rotate((r() - 0.5) * 0.5);
      const body = ['#6a4a58', '#4a5870', '#70503e'][Math.floor(r() * 3)];
      x.fillStyle = shade(body, 0.7); x.beginPath(); x.moveTo(-30, 4); x.lineTo(28, 4); x.lineTo(24, 12); x.lineTo(-26, 12); x.closePath(); x.fill();
      x.fillStyle = body; x.beginPath(); x.moveTo(-32, 4); x.lineTo(-24, -6); x.lineTo(20, -6); x.lineTo(30, 4); x.closePath(); x.fill();
      x.fillStyle = shade(body, 1.25); x.beginPath(); x.moveTo(-14, -6); x.lineTo(-8, -15); x.lineTo(10, -15); x.lineTo(15, -6); x.closePath(); x.fill();
      x.fillStyle = '#0b0d14'; x.beginPath(); x.moveTo(-11, -7); x.lineTo(-7, -13); x.lineTo(3, -13); x.lineTo(3, -7); x.closePath(); x.fill();
      // scorch marks, rust, broken neon strip
      x.fillStyle = 'rgba(0,0,0,.45)'; x.beginPath(); x.ellipse(-12 + r() * 20, -1, 10, 4, 0, 0, Math.PI * 2); x.fill();
      x.fillStyle = 'rgba(160,80,30,.6)'; for (let i = 0; i < 6; i++) x.fillRect(-26 + r() * 50, -4 + r() * 12, 2 + r() * 3, 1.5);
      line(x, [-28, 2], [-8, 2], '#ff2bd6', 1.2, 6); line(x, [4, 2], [12, 2], 'rgba(255,43,214,.35)', 1.2);
      // a dead headlight and a wisp of smoke-black on the hood
      x.fillStyle = '#ffe14d'; x.globalAlpha = 0.5; x.fillRect(24, 0, 4, 2); x.globalAlpha = 1;
      x.restore();
      return 44;
    },
    crates(x, ox, oy, s, r) { // two or three cargo containers stacked
      const cols = ['#7a2a3a', '#2a5a7a', '#6a6a2a', '#2a6a4a'];
      x.fillStyle = 'rgba(0,0,0,.4)'; const c = P(ox, oy, s / 2, s / 2); x.beginPath(); x.ellipse(c[0], c[1] + 2, 32, 15, 0, 0, Math.PI * 2); x.fill();
      const c1 = cols[Math.floor(r() * 4)], c2 = cols[Math.floor(r() * 4)];
      const f = box(x, ox, oy, 0.15, 0.25, s - 0.15, 1.05, 0, 13, pal(c1));
      for (let k = 0.12; k < 1; k += 0.12) { const p = fp(f, 'L', k, 0); line(x, [p[0], p[1] - 1], [p[0], p[1] - 12], 'rgba(0,0,0,.35)', 0.8); }
      box(x, ox, oy, 0.2, 1.1, s - 0.25, s - 0.15, 0, 13, pal(c2));
      if (r() < 0.7) { const f3 = box(x, ox, oy, 0.35, 0.45, s - 0.5, 1.0, 13, 25, pal(cols[Math.floor(r() * 4)])); faceLines(x, f3, 22, 'rgba(255,225,77,.5)', 0.8); return 40; }
      return 26;
    },
    rubble(x, ox, oy, s, r) { // collapsed concrete with rebar and a flickering sign
      const c = P(ox, oy, s / 2, s / 2);
      x.fillStyle = 'rgba(0,0,0,.4)'; x.beginPath(); x.ellipse(c[0], c[1] + 2, 34, 16, 0, 0, Math.PI * 2); x.fill();
      const ps = [];
      for (let i = 0; i < 9; i++) ps.push({ px: 0.2 + r() * (s - 0.8), py: 0.2 + r() * (s - 0.8), w: 0.3 + r() * 0.5, h: 3 + r() * 10 });
      ps.sort((a, b) => a.px + a.py - b.px - b.py);
      for (const p of ps) box(x, ox, oy, p.px, p.py, Math.min(s - 0.1, p.px + p.w), Math.min(s - 0.1, p.py + p.w * (0.6 + r() * 0.6)), 0, p.h, pal(r() < 0.5 ? '#4a4652' : '#3c3a44'));
      for (let i = 0; i < 4; i++) { const q = P(ox, oy, 0.4 + r() * (s - 0.8), 0.4 + r() * (s - 0.8)); line(x, [q[0], q[1] - 6], [q[0] + (r() - 0.5) * 12, q[1] - 16 - r() * 8], '#8a5a3a', 1.1); }
      const q = P(ox, oy, s * 0.6, s * 0.35); line(x, [q[0] - 8, q[1] - 10], [q[0] + 6, q[1] - 14], '#19f0ff', 1.3, 8);
      return 28;
    },
    barrel(x, ox, oy, s, r) { // leaking toxic barrels with a green glow
      const c = P(ox, oy, 0.5, 0.5);
      x.save(); x.globalAlpha = 0.5; x.drawImage(G.World.glow('#39ff88'), c[0] - 18, c[1] - 8, 36, 16); x.restore();
      x.fillStyle = 'rgba(57,255,136,.35)'; x.beginPath(); x.ellipse(c[0] + 4, c[1] + 2, 12, 5, 0, 0, Math.PI * 2); x.fill();
      const pos = [[-6, -2], [5, 1], [r() < 0.5 ? -1 : 9, -6]];
      for (const [dx, dy] of pos) {
        const col = ['#b8a020', '#a05020', '#2a6a8a'][Math.floor(r() * 3)];
        cyl(x, c[0] + dx, c[1] + dy, 5.5, 0, 14, col, shade(col, 1.2));
        x.fillStyle = 'rgba(0,0,0,.4)'; x.fillRect(c[0] + dx - 5.5, c[1] + dy - 9, 11, 1.2);
        dot(x, c[0] + dx, c[1] + dy - 14, 1.6, '#39ff88', 8);
      }
      return 22;
    },
    tree(x, ox, oy, s, r) { // synthetic tree: metal trunk, glowing fibre-optic crown
      const c = P(ox, oy, 0.5, 0.5), col = ['#ff2bd6', '#19f0ff', '#b26bff', '#39ff88'][Math.floor(r() * 4)];
      x.fillStyle = 'rgba(0,0,0,.45)'; x.beginPath(); x.ellipse(c[0], c[1], 12, 6, 0, 0, Math.PI * 2); x.fill();
      x.fillStyle = '#2a2a36'; x.beginPath(); x.ellipse(c[0], c[1] - 1, 7, 3.5, 0, 0, Math.PI * 2); x.fill();
      x.strokeStyle = '#555a6a'; x.lineWidth = 2.6; x.beginPath(); x.moveTo(c[0], c[1] - 2); x.lineTo(c[0] + 1, c[1] - 26); x.stroke();
      const h = 30 + r() * 10;
      x.save(); x.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 16; i++) {
        const a = -Math.PI / 2 + (r() - 0.5) * 2.6, len = 10 + r() * 14;
        x.strokeStyle = col; x.globalAlpha = 0.55; x.lineWidth = 1;
        x.beginPath(); x.moveTo(c[0] + 1, c[1] - 24); x.quadraticCurveTo(c[0] + Math.cos(a) * len * 0.6, c[1] - h, c[0] + Math.cos(a) * len, c[1] - 24 - Math.sin(-a) * len * 0.4 + 6); x.stroke();
        x.globalAlpha = 0.9; x.fillStyle = col; x.fillRect(c[0] + Math.cos(a) * len - 1, c[1] - 24 - Math.sin(-a) * len * 0.4 + 5, 2, 2);
      }
      x.globalAlpha = 0.25; x.drawImage(G.World.glow(col), c[0] - 22, c[1] - h - 12, 44, 36);
      x.restore();
      return h + 6;
    },
    block(x, ox, oy, s, r) { // concrete block with spray paint and sticking-out rebar
      x.fillStyle = 'rgba(0,0,0,.4)'; const c = P(ox, oy, 0.5, 0.5); x.beginPath(); x.ellipse(c[0], c[1] + 1, 15, 7, 0, 0, Math.PI * 2); x.fill();
      const f = box(x, ox, oy, 0.12, 0.12, 0.88, 0.88, 0, 12 + r() * 6, pal('#55525e'));
      const p = fp(f, 'L', 0.5, 6), tag = ['#ff2bd6', '#19f0ff', '#ffe14d'][Math.floor(r() * 3)];
      x.strokeStyle = tag; x.lineWidth = 1.2; x.beginPath(); x.moveTo(p[0] - 5, p[1]); x.quadraticCurveTo(p[0], p[1] - 5, p[0] + 5, p[1] + 1); x.stroke();
      line(x, [c[0] + 2, c[1] - f.z1], [c[0] + 5, c[1] - f.z1 - 7], '#8a5a3a', 1.1);
      line(x, [c[0] - 3, c[1] - f.z1 + 1], [c[0] - 5, c[1] - f.z1 - 5], '#8a5a3a', 1.1);
      return f.z1 + 8;
    },
  };
  A.obsSprite = function (type, variant) {
    const key = 'o' + type + variant;
    let sp = cache.get(key);
    if (sp) return sp;
    const s = G.OBSTACLES[type].size;
    const w = s * TW + PADX * 2, h = s * TH + HEAD + 10;
    const [c, x] = mk(w, h, SS);
    const ox = s * TW / 2 + PADX, oy = HEAD;
    const top = DRAWO[type](x, ox, oy, s, G.rng(hash(key)));
    sp = { c, ax: ox, ay: oy, w, h, top, s };
    cache.set(key, sp);
    return sp;
  };
  A.obsThumb = function (type) {
    const key = 'ot' + type;
    if (thumbs.has(key)) return thumbs.get(key);
    const sp = A.obsSprite(type, 0);
    const [c, x] = mk(96, 96, 1);
    const top = Math.min(sp.top, HEAD), srcY = (HEAD - top) * SS, srcH = (top + sp.s * TH + 4) * SS;
    const k = Math.min(92 / sp.w, 92 / (srcH / SS));
    x.drawImage(sp.c, 0, srcY, sp.c.width, srcH, (96 - sp.w * k) / 2, (96 - srcH / SS * k) / 2, sp.w * k, srcH / SS * k);
    const url = c.toDataURL(); thumbs.set(key, url); return url;
  };

  // storage fill gauge on the front corner of a storage building: one bar per resource it keeps,
  // with a blinking FULL tag when that resource is at its limit (whole base: all storages share the load)
  const GCOL = { scrap: '#ffc23a', copper: '#d0603a', plasma: '#c27bff' };
  A.storeGauge = function (ctx, b, t) {
    const d = G.BUILDINGS[b.type], s = d.size, st = G.state;
    const res = d.storeRes ? [d.storeRes] : ['scrap', 'copper'];
    const [fx, fy] = G.tileToWorld(b.x + s, b.y + s);
    const w = 46, bh = 7, x0 = fx - w / 2 + 5, y0 = fy - 16 - res.length * (bh + 3);
    ctx.save();
    ctx.fillStyle = 'rgba(6,5,14,.82)'; ctx.strokeStyle = 'rgba(160,150,220,.45)'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.rect(x0 - 12, y0 - 3, w + 15, res.length * (bh + 3) + 3); ctx.fill(); ctx.stroke();
    res.forEach((r, i) => {
      const cap = G.capOf(r), fr = cap > 0 ? Math.min(1, (st.res[r] || 0) / cap) : 0, y = y0 + i * (bh + 3);
      ctx.fillStyle = GCOL[r]; ctx.beginPath(); ctx.arc(x0 - 6, y + bh / 2, 2.6, 0, Math.PI * 2); ctx.fill(); // resource colour dot
      ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.fillRect(x0, y, w, bh);
      const full = fr >= 0.999;
      ctx.fillStyle = full ? (Math.sin(t * 6) > 0 ? '#ff3355' : GCOL[r]) : GCOL[r];
      ctx.fillRect(x0, y, w * fr, bh);
      ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(x0, y, w * fr, 1);
      for (let k = 1; k < 4; k++) { ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(x0 + w * k / 4, y, 0.6, bh); }
      if (full) {
        ctx.font = 'bold 7px "Segoe UI",sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(0,0,0,.9)'; ctx.strokeText(G.t('gaugeFull'), x0 + w + 6, y + bh / 2);
        ctx.fillStyle = '#ff5a6a'; ctx.fillText(G.t('gaugeFull'), x0 + w + 6, y + bh / 2);
      }
    });
    ctx.restore();
  };
  A.drawSprite = function (ctx, sp, wx, wy, alpha) {
    if (alpha != null) ctx.globalAlpha = alpha;
    ctx.drawImage(sp.c, wx - sp.ax, wy - sp.ay, sp.w, sp.h);
    ctx.globalAlpha = 1;
  };

  // ---------- per-frame building animation (wx, wy = world position of the footprint's top corner) ----------
  const light = (ctx, col, x, y, r, a) => G.World.light(ctx, col, x, y, r, r, a);
  A.anim = function (ctx, type, L, wx, wy, t, dt, seed) {
    const s = G.BUILDINGS[type].size, Pw = (tx, ty) => P(wx, wy, tx, ty);
    const tr = TRIM[L - 1];
    ctx.save();
    if (type === 'core') {
      const h = HGT.core(L), c = Pw(s / 2, s / 2), rx = s * TW * 0.31, ry = rx / 2;
      const pulse = 0.65 + Math.sin(t * 2.2) * 0.25;
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = tr; ctx.lineWidth = 2; ctx.globalAlpha = pulse;
      ctx.setLineDash([14, 8]); ctx.lineDashOffset = -t * 30;
      ctx.beginPath(); ctx.ellipse(c[0], c[1] - h * 0.55, rx, ry, 0, 0, Math.PI); ctx.stroke();
      if (L >= 3) { ctx.lineDashOffset = t * 40; ctx.beginPath(); ctx.ellipse(c[0], c[1] - h * 0.55 - 18, rx * 0.8, ry * 0.8, 0, 0, Math.PI); ctx.stroke(); }
      ctx.setLineDash([]);
      // hologram emblem spinning above the roof
      const ty = c[1] - h - 30, sp = Math.cos(t * 1.6);
      ctx.globalAlpha = 0.55 + pulse * 0.3;
      ctx.beginPath(); ctx.moveTo(c[0], ty - 10); ctx.lineTo(c[0] + 9 * sp, ty); ctx.lineTo(c[0], ty + 10); ctx.lineTo(c[0] - 9 * sp, ty); ctx.closePath(); ctx.stroke();
      light(ctx, tr, c[0], ty, 22, 0.35 * pulse);
      const mast = 26 + L * 3 + (L >= 5 ? 14 : 0) + (L >= 4 ? 10 : 0); // same as the sprite's mast
      light(ctx, '#ff2bd6', c[0], c[1] - h - 12 - mast, 10, Math.sin(t * 4) > 0 ? 0.9 : 0.25);
      light(ctx, tr, c[0], c[1] - h * 0.55, rx * 0.9, 0.08 * pulse);
    } else if (type === 'scrapyard') {
      const H = HGT.scrapyard(L), base = Pw(s - 0.5, 0.5);
      ctx.globalCompositeOperation = 'lighter';
      light(ctx, '#ff8a1f', base[0], base[1] - H - 3, 9, Math.sin(t * 5 + seed) > 0 ? 0.95 : 0.3);
      if (Math.random() < dt * 3) {
        const p = Pw(0.6 + Math.random() * (s - 1.2), 0.8 + Math.random() * (s - 1.4));
        for (let i = 0; i < 6; i++) G.World.emit({ k: 'spark', x: p[0], y: p[1] - 10, vx: (Math.random() - 0.5) * 60, vy: -30 - Math.random() * 40, g: 160, r: 1.6, life: 0.5, max: 0.5, c: '#ffcc55' });
      }
    } else if (type === 'coppermine') {
      const H = HGT.coppermine(L), a = Pw(s / 2, s / 2);
      ctx.globalCompositeOperation = 'lighter';
      const p = 0.5 + Math.sin(t * 3 + seed) * 0.5;
      light(ctx, '#ff9a4a', a[0], a[1] - H, 14, 0.4 + p * 0.5);
      const bob = (Math.sin(t * 6) + 1) * 3;
      ctx.strokeStyle = '#ffb070'; ctx.lineWidth = 2; ctx.globalAlpha = 0.8;
      ctx.beginPath(); ctx.moveTo(a[0], a[1] - 22 - bob); ctx.lineTo(a[0], a[1] - H + 6); ctx.stroke();
    } else if (type === 'vault') {
      const h = HGT.vault(L), b0 = Pw(s - 0.32, 0.32), c0 = Pw(s - 0.32, s - 0.32);
      const m = [(b0[0] + c0[0]) / 2, (b0[1] + c0[1]) / 2 - h * 0.52];
      ctx.translate(m[0], m[1]); ctx.transform(1, -0.5, 0, 1, 0, 0);
      ctx.strokeStyle = tr; ctx.lineWidth = 1.6; ctx.globalAlpha = 0.9;
      ctx.rotate(t * 0.8);
      for (let k = 0; k < 6; k++) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(k) * 8, Math.sin(k) * 8); ctx.stroke(); }
    } else if (type === 'factory') {
      const h = HGT.factory(L);
      const chimneys = L >= 3 ? [[s - 0.75, 0.75], [s - 1.4, 0.7]] : [[s - 0.75, 0.75]];
      for (const [cx2, cy2] of chimneys) {
        if (Math.random() < dt * 6) {
          const cp = Pw(cx2, cy2), CH = h + 30 + L * 3;
          G.World.emit({ k: 'smoke', x: cp[0] + (Math.random() - 0.5) * 4, y: cp[1] - CH, vx: 8 + Math.random() * 6, vy: -18 - Math.random() * 8, r: 4, gr: 8, life: 2.6, max: 2.6, c: '90,85,100', a: 0.45 });
        }
      }
      // spinning roof fan
      const fn = Pw(0.9, s - 0.9);
      ctx.translate(fn[0], fn[1] - h - 10); ctx.scale(1, 0.5); ctx.rotate(t * 8);
      ctx.fillStyle = '#8a8098';
      for (let k = 0; k < 4; k++) { ctx.rotate(Math.PI / 2); ctx.fillRect(-1.2, 0, 2.4, 7); }
    } else if (type === 'extractor') {
      // bubbling plasma column
      const h = HGT.extractor(L), c = Pw(s - 0.75, s / 2);
      ctx.globalCompositeOperation = 'lighter';
      light(ctx, '#b26bff', c[0], c[1] - h * 0.6, 14, 0.35 + Math.sin(t * 3 + seed) * 0.15);
      const by = c[1] - ((t * 30 + seed * 7) % (h + 4));
      ctx.fillStyle = 'rgba(243,214,255,.8)'; ctx.beginPath(); ctx.arc(c[0] + Math.sin(t * 5) * 2, by, 1.6, 0, Math.PI * 2); ctx.fill();
    } else if (type === 'forge') {
      const h = HGT.forge(L), c = Pw(s / 2, s / 2);
      ctx.globalCompositeOperation = 'lighter';
      light(ctx, '#39ff88', c[0], c[1] - h - 23, 6, Math.sin(t * 7 + seed) > 0 ? 0.9 : 0.2);
    } else if (type === 'emp') {
      // charging orb + electric arcs
      const h = HGT.emp(L), c = Pw(s / 2, s / 2), oy2 = c[1] - h - 38;
      ctx.globalCompositeOperation = 'lighter';
      const p = 0.5 + Math.sin(t * 4 + seed) * 0.5;
      light(ctx, '#7fd8ff', c[0], oy2, 10 + p * 8, 0.45 + p * 0.45);
      if (Math.random() < dt * 4) {
        ctx.strokeStyle = 'rgba(160,230,255,.9)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(c[0], oy2);
        let px = c[0], py = oy2;
        for (let k = 0; k < 4; k++) { px += (Math.random() - 0.5) * 12; py += 5 + Math.random() * 4; ctx.lineTo(px, py); }
        ctx.stroke();
      }
    } else if (type === 'squadhq') {
      const h = HGT.squadhq(L), c = Pw(s / 2 + 0.2, s / 2 + (L >= 3 ? 0.6 : 0)), cy = c[1] - h;
      ctx.globalCompositeOperation = 'lighter';
      const n = 8, on = Math.floor(t * 8) % n;
      for (let k = 0; k < n; k++) {
        const a = k / n * Math.PI * 2;
        light(ctx, '#39ff88', c[0] + Math.cos(a) * 26, cy + Math.sin(a) * 13, k === on ? 7 : 3, k === on ? 0.95 : 0.35);
      }
    }
    ctx.restore();
  };

  A.drawLaserHead = function (ctx, cx, cy, L, ang, fire, dis) {
    const y = cy - A.laserHeight(L) - 7;
    const t = dis ? '#666' : TRIM[L - 1];
    ctx.save();
    ctx.fillStyle = '#20243a'; ctx.beginPath(); ctx.ellipse(cx, y + 3, 11, 6, 0, 0, Math.PI * 2); ctx.fill();
    const dx = Math.cos(ang), dy = Math.sin(ang) * 0.5;
    ctx.strokeStyle = '#11131f'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(cx, y); ctx.lineTo(cx + dx * 17, y + dy * 17); ctx.stroke();
    ctx.strokeStyle = t; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx + dx * 4, y + dy * 4); ctx.lineTo(cx + dx * 17, y + dy * 17); ctx.stroke();
    ctx.fillStyle = '#3a4160'; ctx.beginPath(); ctx.arc(cx, y - 1, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.beginPath(); ctx.arc(cx - 2, y - 3, 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = t; ctx.beginPath(); ctx.arc(cx + dx * 3, y - 2 + dy * 3, 2.4, 0, Math.PI * 2); ctx.fill();
    ctx.globalCompositeOperation = 'lighter';
    G.World.light(ctx, t, cx + dx * 18, y + dy * 18, fire ? 16 : 6, fire ? 16 : 6, fire ? 1 : 0.5);
    ctx.restore();
    return [cx + dx * 18, y + dy * 18];
  };

  // ---------- units ----------
  const UCOL = { runner: '#ff2bd6', gunner: '#19f0ff', drone: '#ff3355', mech: '#ffe14d', ronin: '#ff4d4d', nyx: '#b26bff', medic: '#39ff88', breacher: '#ffb040', titan: '#2be3c8', gunship: '#ff8a3a' };
  A.UCOL = UCOL;
  // st (optional): { moving, atk 0..1 (1 = just struck), dead 0..1 (death animation progress) }
  A.drawUnit = function (ctx, type, wx, wy, t, flip, flash, st) {
    st = st || { moving: true, atk: 0, dead: 0 };
    const c = UCOL[type];
    const hero = type === 'ronin' || type === 'nyx';
    const big = type === 'titan' ? 2.5 : type === 'gunship' ? 2 : type === 'mech' ? 1.9 : hero ? 1.75 : 1.5;
    const dead = st.dead || 0;
    ctx.save(); ctx.translate(wx, wy);
    if (dead) ctx.globalAlpha = 1 - dead;
    // shadow + hero ring
    ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.beginPath(); ctx.ellipse(0, 0, 6 * big, 3 * big, 0, 0, Math.PI * 2); ctx.fill();
    // faint glow of the unit's colour on the ground: easier to spot in a crowd
    if (!dead && type !== 'drone') { ctx.save(); ctx.globalCompositeOperation = 'lighter'; G.World.light(ctx, c, 0, 0, 7 * big, 3.5 * big, 0.22); ctx.restore(); }
    if (hero && !dead) {
      ctx.strokeStyle = '#ffe14d'; ctx.lineWidth = 1.4; ctx.setLineDash([5, 4]); ctx.lineDashOffset = -t * 20;
      ctx.beginPath(); ctx.ellipse(0, 0, 11, 5.5, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    }
    if (flip) ctx.scale(-1, 1);
    ctx.scale(big, big);
    if (dead) { ctx.translate(0, -2); ctx.rotate(-dead * 1.4); ctx.translate(0, 2 + dead * 3); }
    const mv = st.moving && !dead ? 1 : 0;
    const ph = t * (type === 'mech' || type === 'titan' ? 7 : 13);
    const swing = Math.sin(ph) * 3 * mv, bob = Math.abs(Math.cos(ph)) * 1.2 * mv;
    const atk = st.atk || 0;
    const skin = flash ? '#ffffff' : null;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const visor = (x0, y0, w, h) => {
      ctx.fillStyle = c; ctx.fillRect(x0, y0, w, h);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; G.World.light(ctx, c, x0 + w / 2, y0 + h / 2, 3.5, 2.5, 0.55); ctx.restore();
    };
    const legs = (hipY, len, col, w) => {
      ctx.strokeStyle = col; ctx.lineWidth = w;
      ctx.beginPath(); ctx.moveTo(-1.5, hipY); ctx.lineTo(-1.5 + swing, hipY + len * 0.55); ctx.lineTo(-1.5 + swing * 0.6, 0);
      ctx.moveTo(1.5, hipY); ctx.lineTo(1.5 - swing, hipY + len * 0.55); ctx.lineTo(1.5 - swing * 0.6, 0); ctx.stroke();
      ctx.fillStyle = '#0c0a12'; ctx.fillRect(-3.2 + swing * 0.6, -1.4, 3.4, 1.9); ctx.fillRect(-0.2 - swing * 0.6, -1.4, 3.4, 1.9);
      ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(-3.2 + swing * 0.6, -1.4, 3.4, 0.5); ctx.fillRect(-0.2 - swing * 0.6, -1.4, 3.4, 0.5);
      // knee pads
      ctx.fillStyle = shade2(col, 2.4);
      ctx.fillRect(-2.3 + swing, hipY + len * 0.55 - 0.7, 1.6, 1.2); ctx.fillRect(0.7 - swing, hipY + len * 0.55 - 0.7, 1.6, 1.2);
    };
    // simple colour helpers for unit parts (hex in, css out)
    function shade2(hex, f) { return hex && hex[0] === '#' ? shade(hex.length === 4 ? '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3] : hex, f) : hex; }
    // arm from the shoulder to a hand position, with a glove
    const arm = (sx, sy, hx2, hy2, col) => {
      ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(hx2, hy2); ctx.stroke();
      ctx.strokeStyle = col; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(hx2, hy2); ctx.stroke();
      ctx.fillStyle = '#16121e'; ctx.beginPath(); ctx.arc(hx2, hy2, 1.1, 0, Math.PI * 2); ctx.fill();
    };
    const cape = (x0, y0, len, col) => {
      const wave = Math.sin(t * 9) * 1.5 + (mv ? 2 : 0);
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(x0 - 5 - wave, y0 + len * 0.5, x0 - 6 - wave * 1.5, y0 + len);
      ctx.lineTo(x0 - 1, y0 + len - 1); ctx.quadraticCurveTo(x0 - 2, y0 + len * 0.5, x0 + 2, y0); ctx.closePath(); ctx.fill();
    };
    // ---- machine helpers: everything lit from the upper left, so plates get a bright top, a mid front and a dark side ----
    const KM = (col) => skin || col;
    const MOUT = 'rgba(4,3,10,.85)';
    // a box seen at 3/4: front face (x, y, w, h) plus a top and a right side going back by d
    const box3 = (x, y, w, h, d, col) => {
      const dx = d * 0.7, dy = -d * 0.5;
      ctx.lineWidth = 0.45; ctx.strokeStyle = MOUT;
      ctx.fillStyle = KM(shade2(col, 1.5)); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w + dx, y + dy); ctx.lineTo(x + dx, y + dy); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = KM(shade2(col, 0.48)); ctx.beginPath(); ctx.moveTo(x + w, y); ctx.lineTo(x + w + dx, y + dy); ctx.lineTo(x + w + dx, y + h + dy); ctx.lineTo(x + w, y + h); ctx.closePath(); ctx.fill(); ctx.stroke();
      const g = ctx.createLinearGradient(x, y, x + w * 0.4, y + h); g.addColorStop(0, KM(shade2(col, 1.2))); g.addColorStop(1, KM(shade2(col, 0.72)));
      ctx.fillStyle = g; ctx.fillRect(x, y, w, h); ctx.strokeRect(x, y, w, h);
      ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 0.3; ctx.beginPath(); ctx.moveTo(x + 0.2, y + 0.25); ctx.lineTo(x + w - 0.2, y + 0.25); ctx.stroke();
    };
    // a round metal part: a cylinder segment shaded across its width, with round ends
    const limbM = (x1, y1, x2, y2, w1, w2, col) => {
      const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
      const g = ctx.createLinearGradient(x1 + nx * w1 / 2, y1 + ny * w1 / 2, x1 - nx * w1 / 2, y1 - ny * w1 / 2);
      g.addColorStop(0, KM(shade2(col, 1.7))); g.addColorStop(0.4, KM(col)); g.addColorStop(1, KM(shade2(col, 0.4)));
      ctx.fillStyle = g; ctx.beginPath();
      ctx.moveTo(x1 + nx * w1 / 2, y1 + ny * w1 / 2); ctx.lineTo(x2 + nx * w2 / 2, y2 + ny * w2 / 2);
      ctx.arc(x2, y2, w2 / 2, Math.atan2(ny, nx), Math.atan2(ny, nx) + Math.PI);
      ctx.lineTo(x1 - nx * w1 / 2, y1 - ny * w1 / 2);
      ctx.arc(x1, y1, w1 / 2, Math.atan2(-ny, -nx), Math.atan2(-ny, -nx) + Math.PI);
      ctx.closePath(); ctx.fill(); ctx.strokeStyle = MOUT; ctx.lineWidth = 0.4; ctx.stroke();
    };
    // a horizontal barrel / tube: vertical gradient = round
    const tube = (x, y, w, h, col) => {
      const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, KM(shade2(col, 1.3))); g.addColorStop(0.3, KM(shade2(col, 1.9))); g.addColorStop(0.55, KM(col)); g.addColorStop(1, KM(shade2(col, 0.35)));
      ctx.fillStyle = g; ctx.fillRect(x, y, w, h); ctx.strokeStyle = MOUT; ctx.lineWidth = 0.4; ctx.strokeRect(x, y, w, h);
    };
    const ball = (x, y, r, col) => {
      const g = ctx.createRadialGradient(x - r * 0.4, y - r * 0.45, r * 0.1, x, y, r * 1.05);
      g.addColorStop(0, KM(shade2(col, 1.9))); g.addColorStop(0.5, KM(col)); g.addColorStop(1, KM(shade2(col, 0.35)));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = MOUT; ctx.lineWidth = 0.4; ctx.stroke();
    };
    const glowM = (col, x, y, rx, ry, a) => { ctx.save(); ctx.globalCompositeOperation = 'lighter'; G.World.light(ctx, col, x, y, rx, ry, a); ctx.restore(); };
    const rim = (draw, a) => { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = c; ctx.globalAlpha = a || 0.7; ctx.lineWidth = 0.6; ctx.beginPath(); draw(); ctx.stroke(); ctx.restore(); };
    if (type === 'drone') {
      const hy = -20 + Math.sin(t * 6) * 1.5 - dead * -16;
      const arms = [[-7, -3], [7, -3], [-7, 3], [7, 3]];
      const rotor = (ax, ay) => {
        const rx = ax, ry = hy + ay * 0.5 - 1.2;
        limbM(0, hy, ax, hy + ay * 0.5, 1.5, 1.1, ay < 0 ? '#3a3e50' : '#555b72');
        // motor pod
        const pg = ctx.createLinearGradient(rx - 1.2, 0, rx + 1.2, 0); pg.addColorStop(0, KM('#9aa2b8')); pg.addColorStop(1, KM('#22262f'));
        ctx.fillStyle = pg; ctx.fillRect(rx - 1.1, ry, 2.2, 2.2); ctx.strokeStyle = MOUT; ctx.lineWidth = 0.35; ctx.strokeRect(rx - 1.1, ry, 2.2, 2.2);
        // spinning disc (blurred) + one visible blade
        const dg = ctx.createRadialGradient(rx, ry, 0.5, rx, ry, 4.8); dg.addColorStop(0, 'rgba(210,225,255,.05)'); dg.addColorStop(0.8, 'rgba(210,225,255,.28)'); dg.addColorStop(1, 'rgba(210,225,255,0)');
        ctx.fillStyle = dg; ctx.beginPath(); ctx.ellipse(rx, ry, 4.8, 1.7, 0, 0, Math.PI * 2); ctx.fill();
        const a = t * 40 + ax;
        ctx.strokeStyle = 'rgba(235,240,255,.75)'; ctx.lineWidth = 0.7;
        ctx.beginPath(); ctx.moveTo(rx - Math.cos(a) * 4.5, ry - Math.sin(a) * 1.6); ctx.lineTo(rx + Math.cos(a) * 4.5, ry + Math.sin(a) * 1.6); ctx.stroke();
        ctx.fillStyle = '#d8dcea'; ctx.beginPath(); ctx.arc(rx, ry, 0.5, 0, Math.PI * 2); ctx.fill();
      };
      arms.filter((a) => a[1] < 0).forEach((a) => rotor(a[0], a[1]));
      // body: a lit ellipsoid with a seam, a glass dome and a warning stripe
      const bg = ctx.createRadialGradient(-2, hy - 2, 0.4, 0, hy, 6.4);
      bg.addColorStop(0, KM('#8a92b0')); bg.addColorStop(0.45, KM('#353a4e')); bg.addColorStop(1, KM('#0a0c14'));
      ctx.fillStyle = bg; ctx.beginPath(); ctx.ellipse(0, hy, 5.6, 3.7, 0, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = MOUT; ctx.lineWidth = 0.45; ctx.stroke();
      ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.lineWidth = 0.4; ctx.beginPath(); ctx.ellipse(0, hy + 0.3, 5.4, 1.5, 0, 0, Math.PI); ctx.stroke();
      ctx.save(); ctx.beginPath(); ctx.ellipse(0, hy, 5.6, 3.7, 0, 0, Math.PI * 2); ctx.clip();
      ctx.fillStyle = '#ff9a20'; ctx.beginPath(); ctx.ellipse(0, hy + 2.4, 6, 1, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#1a1410'; for (let k = -5; k < 6; k += 2) ctx.fillRect(k, hy + 1.9, 0.8, 1.1);
      ctx.restore();
      const dgl = ctx.createLinearGradient(0, hy - 3.8, 0, hy - 0.6); dgl.addColorStop(0, 'rgba(160,220,255,.85)'); dgl.addColorStop(1, 'rgba(20,40,70,.9)');
      ctx.fillStyle = dgl; ctx.beginPath(); ctx.ellipse(-0.8, hy - 1.5, 3.1, 1.9, 0, Math.PI, 0); ctx.fill(); ctx.strokeStyle = MOUT; ctx.lineWidth = 0.35; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.ellipse(-2, hy - 2.6, 1, 0.35, -0.3, 0, Math.PI * 2); ctx.fill();
      // camera eye in front + sensor ball underneath
      ball(3.6, hy - 0.2, 1.5, '#20232e'); ctx.fillStyle = c; ctx.beginPath(); ctx.arc(4, hy - 0.2, 0.8, 0, Math.PI * 2); ctx.fill(); glowM(c, 4, hy - 0.2, 3, 2.4, 0.7);
      ball(0, hy + 3.6, 1.2, '#3a3f52');
      rim(() => ctx.ellipse(0, hy, 5.6, 3.7, 0, Math.PI * 0.8, Math.PI * 1.35));
      arms.filter((a) => a[1] > 0).forEach((a) => rotor(a[0], a[1]));
      const blink = Math.sin(t * 6) > 0;
      glowM(blink ? '#39ff88' : '#ff3355', blink ? -7 : 7, hy - 2, 3, 3, 0.9);
    } else if (type === 'gunship') {
      // plasma gunship: a hovering hull with depth (bright spine, dark belly), twin turbines and a chin cannon
      const hy = -22 + Math.sin(t * 3) * 1.2 + dead * 16, rc = atk * 2;
      glowM('#ff8a3a', -6, hy + 6, 4, 6 + Math.sin(t * 20), 0.75); glowM('#ff8a3a', 6, hy + 6, 4, 6 + Math.cos(t * 20), 0.75);
      // far turbine (behind the hull)
      const turbine = (sx, near) => {
        const cy = hy + 1, col = near ? '#7a8090' : '#4a4e5c';
        const g = ctx.createLinearGradient(sx - 3, 0, sx + 3, 0); g.addColorStop(0, KM(shade2(col, 1.6))); g.addColorStop(0.45, KM(col)); g.addColorStop(1, KM(shade2(col, 0.3)));
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(sx - 3, cy - 3.2); ctx.lineTo(sx + 3, cy - 3.2); ctx.lineTo(sx + 2.6, cy + 3.4); ctx.lineTo(sx - 2.6, cy + 3.4); ctx.closePath(); ctx.fill(); ctx.strokeStyle = MOUT; ctx.lineWidth = 0.45; ctx.stroke();
        ctx.fillStyle = KM(shade2(col, 1.5)); ctx.beginPath(); ctx.ellipse(sx, cy - 3.2, 3, 0.9, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#0c0d12'; ctx.beginPath(); ctx.ellipse(sx, cy - 3.2, 2.1, 0.55, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = 0.3; ctx.beginPath(); ctx.moveTo(sx - 2.8, cy); ctx.lineTo(sx + 2.8, cy); ctx.stroke();
        const ng = ctx.createRadialGradient(sx, cy + 3.5, 0.2, sx, cy + 3.5, 2.4); ng.addColorStop(0, '#fff2d0'); ng.addColorStop(0.5, '#ffb070'); ng.addColorStop(1, '#a04010');
        ctx.fillStyle = ng; ctx.beginPath(); ctx.ellipse(sx, cy + 3.5, 2.4, 0.9, 0, 0, Math.PI * 2); ctx.fill();
      };
      turbine(-7, false);
      // tail fin
      { const fg = ctx.createLinearGradient(-11, hy - 7, -6, hy - 1); fg.addColorStop(0, KM('#a8a090')); fg.addColorStop(1, KM('#4a463c'));
        ctx.fillStyle = fg; ctx.beginPath(); ctx.moveTo(-8, hy - 1); ctx.lineTo(-11, hy - 7.4); ctx.lineTo(-8.5, hy - 7.4); ctx.lineTo(-5, hy - 2); ctx.closePath(); ctx.fill(); ctx.strokeStyle = MOUT; ctx.lineWidth = 0.4; ctx.stroke(); }
      // belly (the dark underside you see from above at an angle)
      ctx.fillStyle = KM('#2e2b26'); ctx.beginPath(); ctx.moveTo(-6, hy + 3.5); ctx.lineTo(7, hy + 3.5); ctx.lineTo(5.6, hy + 5.4); ctx.lineTo(-4.6, hy + 5.4); ctx.closePath(); ctx.fill(); ctx.strokeStyle = MOUT; ctx.lineWidth = 0.4; ctx.stroke();
      // hull
      const hg = ctx.createLinearGradient(0, hy - 5, 0, hy + 3.5);
      hg.addColorStop(0, KM('#f0eadc')); hg.addColorStop(0.35, KM('#bdb6a6')); hg.addColorStop(0.7, KM('#7a7468')); hg.addColorStop(1, KM('#3e3a32'));
      ctx.fillStyle = hg; ctx.beginPath(); ctx.moveTo(-9, hy); ctx.lineTo(-5, hy - 5); ctx.lineTo(7, hy - 4); ctx.lineTo(11, hy); ctx.lineTo(7, hy + 3.5); ctx.lineTo(-6, hy + 3.5); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = MOUT; ctx.lineWidth = 0.5; ctx.stroke();
      // panel lines, specular streak along the spine, hazard stripe in the unit colour
      ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 0.3; ctx.beginPath(); ctx.moveTo(-2, hy - 4.6); ctx.lineTo(-3, hy + 3.5); ctx.moveTo(3, hy - 4.3); ctx.lineTo(2.6, hy + 3.5); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 0.45; ctx.beginPath(); ctx.moveTo(-4.6, hy - 4.6); ctx.lineTo(6.6, hy - 3.7); ctx.stroke();
      ctx.fillStyle = c; ctx.fillRect(-6, hy - 0.6, 12, 1); glowM(c, 0, hy, 7, 1.4, 0.35);
      ctx.fillStyle = 'rgba(0,0,0,.6)'; for (let k = 0; k < 4; k++) ctx.fillRect(-5 + k * 1.2, hy + 1.4, 0.6, 1.2); // vents
      // cockpit glass
      const cg = ctx.createLinearGradient(4, hy - 4, 8, hy - 1); cg.addColorStop(0, '#9ef0ff'); cg.addColorStop(0.5, '#1a5a7a'); cg.addColorStop(1, '#06141e');
      ctx.fillStyle = cg; ctx.beginPath(); ctx.moveTo(4, hy - 4); ctx.lineTo(9.2, hy - 1); ctx.lineTo(4, hy - 1); ctx.closePath(); ctx.fill(); ctx.strokeStyle = MOUT; ctx.lineWidth = 0.4; ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 0.4; ctx.beginPath(); ctx.moveTo(4.6, hy - 3.2); ctx.lineTo(6.4, hy - 2.2); ctx.stroke();
      // chin cannon (recoils)
      ctx.fillStyle = KM('#1a1c24'); ctx.fillRect(3 - rc, hy + 3, 3, 2.4);
      tube(5 - rc, hy + 3.3, 8, 1.8, '#4a4e5c');
      ctx.fillStyle = c; ctx.fillRect(12.6 - rc, hy + 3.1, 1.4, 2.2);
      glowM(c, 13.3 - rc, hy + 4.2, 3, 3, 0.4 + atk * 0.6);
      if (atk > 0.5) { glowM('#ffffff', 15 - rc, hy + 4.2, 4, 3, atk); glowM(c, 16 - rc, hy + 4.2, 8, 5, atk); }
      turbine(7, true);
      rim(() => { ctx.moveTo(-9, hy); ctx.lineTo(-5, hy - 5); ctx.lineTo(7, hy - 4); });
      if (Math.sin(t * 5) > 0) glowM('#ff3355', -10.5, hy - 7.4, 2.5, 2.5, 0.9);
    } else if (type === 'titan') {
      // titan: heavy colony walker — sandstone armour with real depth, a glass reactor core, plasma hammer
      const by = -bob * 0.8;
      const STONE = '#b8946a', IRON = '#4a4438';
      // rear arm (in shadow)
      limbM(-8.5, -21 + by, -10.4 + swing * 0.3, -16 + by, 3.4, 3, shade2(IRON, 0.8));
      limbM(-10.4 + swing * 0.3, -16 + by, -10 + swing * 0.3, -12 + by, 3, 2.8, shade2(IRON, 0.8));
      ball(-10 + swing * 0.3, -11.6 + by, 1.9, '#3a3428');
      // legs: thigh + shin cylinders, pistons, armoured knees, heavy feet
      const legs3 = [[-3.6, swing], [3.6, -swing]].sort((a, b) => a[1] - b[1]);
      for (const [lx, s] of legs3) {
        const kx = lx + Math.sign(lx) * 1.4 + s, ky = -4.8 + by * 0.5, fx = lx + s * 0.5;
        const col = s < 0 ? shade2(IRON, 0.8) : IRON;
        limbM(lx, -9.5 + by, kx, ky, 4.4, 3.8, col);
        limbM(kx, ky, fx, -1.4, 3.8, 3.4, col);
        ctx.strokeStyle = '#c8c8d0'; ctx.lineWidth = 0.5; ctx.beginPath(); ctx.moveTo(lx + 1.4, -8.6 + by); ctx.lineTo(kx + 1.6, ky + 0.4); ctx.stroke();
        box3(fx - 3, -2, 6, 2, 2, '#2c2820');
        const kg = ctx.createRadialGradient(kx - 0.8, ky - 0.8 + by * 0.5, 0.2, kx, ky + by * 0.5, 2.4); kg.addColorStop(0, KM('#f0d8b0')); kg.addColorStop(1, KM('#6a5030'));
        ctx.fillStyle = kg; ctx.beginPath(); ctx.ellipse(kx, ky + by * 0.5, 2.2, 1.8, 0, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = MOUT; ctx.lineWidth = 0.4; ctx.stroke();
      }
      // torso: front plate + a right side face + a top face
      ctx.fillStyle = KM('#4a3824'); ctx.beginPath(); ctx.moveTo(8, -9 + by); ctx.lineTo(9, -20 + by); ctx.lineTo(11, -21.6 + by); ctx.lineTo(10.2, -10.4 + by); ctx.closePath(); ctx.fill(); ctx.strokeStyle = MOUT; ctx.lineWidth = 0.5; ctx.stroke();
      ctx.fillStyle = KM('#f2dcb2'); ctx.beginPath(); ctx.moveTo(-5, -25 + by); ctx.lineTo(5, -25 + by); ctx.lineTo(7, -26.6 + by); ctx.lineTo(-3, -26.6 + by); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = KM('#c8a678'); ctx.beginPath(); ctx.moveTo(5, -25 + by); ctx.lineTo(9, -20 + by); ctx.lineTo(11, -21.6 + by); ctx.lineTo(7, -26.6 + by); ctx.closePath(); ctx.fill(); ctx.stroke();
      const tg = ctx.createLinearGradient(-9, -25 + by, 9, -9 + by); tg.addColorStop(0, KM('#f4dcae')); tg.addColorStop(0.45, KM(STONE)); tg.addColorStop(1, KM('#5a4430'));
      ctx.fillStyle = tg; ctx.beginPath(); ctx.moveTo(-8, -9 + by); ctx.lineTo(-9, -20 + by); ctx.lineTo(-5, -25 + by); ctx.lineTo(5, -25 + by); ctx.lineTo(9, -20 + by); ctx.lineTo(8, -9 + by); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = MOUT; ctx.lineWidth = 0.6; ctx.stroke();
      // bevel highlights + panel seams + rivets
      ctx.strokeStyle = 'rgba(255,245,220,.6)'; ctx.lineWidth = 0.45; ctx.beginPath(); ctx.moveTo(-8.6, -19.8 + by); ctx.lineTo(-4.8, -24.5 + by); ctx.lineTo(4.8, -24.5 + by); ctx.stroke();
      ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 0.35; ctx.beginPath(); ctx.moveTo(-8.6, -14 + by); ctx.lineTo(8.6, -14 + by); ctx.moveTo(-4, -14 + by); ctx.lineTo(-4.4, -9 + by); ctx.moveTo(4, -14 + by); ctx.lineTo(4.4, -9 + by); ctx.stroke();
      ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(-8, -11.6 + by, 16, 2.6);
      ctx.fillStyle = '#e8d0a0'; for (const rx of [-7, 7]) for (const ry of [-18, -12.6]) { ctx.beginPath(); ctx.arc(rx, ry + by, 0.4, 0, Math.PI * 2); ctx.fill(); }
      // reactor core: a glass sphere in a dark socket
      ctx.fillStyle = '#0a1a18'; ctx.beginPath(); ctx.arc(0, -18 + by, 3.4, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#2a2418'; ctx.lineWidth = 0.8; ctx.stroke();
      const rg = ctx.createRadialGradient(-0.6, -18.8 + by, 0.2, 0, -18 + by, 2.4); rg.addColorStop(0, '#e8fffa'); rg.addColorStop(0.4, c); rg.addColorStop(1, '#064a40');
      ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(0, -18 + by, 2.3 + Math.sin(t * 4) * 0.25, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.beginPath(); ctx.ellipse(-0.8, -19 + by, 0.7, 0.4, -0.5, 0, Math.PI * 2); ctx.fill();
      glowM(c, 0, -18 + by, 6, 6, 0.65);
      // head: a box with a visor slit
      box3(-3, -30 + by, 6, 4.6, 2.4, '#8a6a48');
      visor(-2.3, -28.4 + by, 4.6, 1.4);
      // shoulder pauldrons: rounded, lit from the top
      for (const px of [-10, 9.5]) {
        const pg = ctx.createRadialGradient(px - 1, -25.5 + by, 0.4, px, -23.5 + by, 4.6); pg.addColorStop(0, KM('#fff0d0')); pg.addColorStop(0.5, KM(STONE)); pg.addColorStop(1, KM('#4a3622'));
        ctx.fillStyle = pg; ctx.beginPath(); ctx.moveTo(px - 3.6, -21 + by); ctx.quadraticCurveTo(px - 3.8, -27.6 + by, px, -27.4 + by); ctx.quadraticCurveTo(px + 3.8, -27.6 + by, px + 3.6, -21 + by); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = MOUT; ctx.lineWidth = 0.5; ctx.stroke();
        ctx.fillStyle = c; ctx.fillRect(px - 2.4, -22.2 + by, 4.8, 0.6); glowM(c, px, -21.9 + by, 3, 1, 0.5);
      }
      // plasma hammer: raised, then slammed down on attack
      const sw = 1 - atk, ang = -1.2 + sw * 0.2 + atk * 1.6;
      ctx.save(); ctx.translate(9, -20 + by); ctx.rotate(ang);
      limbM(0, 0, 0, -13, 1.9, 1.9, '#5a5a66');
      box3(-4.5, -18, 9, 5, 2.6, '#34343e');
      ctx.fillStyle = c; ctx.fillRect(-4.5, -16, 9, 1.2); glowM(c, 0, -15.4, 6, 4, 0.5 + atk * 0.5);
      ctx.restore();
      ball(9, -20 + by, 2, '#4a4438');
      rim(() => { ctx.moveTo(-8, -9.5 + by); ctx.lineTo(-9, -20 + by); ctx.lineTo(-5, -25 + by); });
    } else if (type === 'mech') {
      const by = -bob;
      // legs: thigh + shin cylinders with hydraulic pistons, boxy feet
      const legsM = [[-3.5, swing], [3.5, -swing]].sort((a, b) => a[1] - b[1]);
      for (const [lx, s] of legsM) {
        const kx = lx + Math.sign(lx) * 1.5 + s, ky = -4.5, fx = lx + s * 0.5;
        const col = s < 0 ? '#2c2c36' : '#40404e';
        limbM(lx, -9 + by, kx, ky, 3.6, 3, col);
        limbM(kx, ky, fx, -1.2, 3, 2.6, col);
        ctx.strokeStyle = '#b8bcc8'; ctx.lineWidth = 0.45; ctx.beginPath(); ctx.moveTo(lx - 1.2, -8.4 + by); ctx.lineTo(kx - 1.2, ky + 0.6); ctx.stroke();
        ball(kx, ky, 1.5, '#5a5a6a');
        box3(fx - 2.6, -1.8, 5, 1.8, 1.6, '#22222a');
      }
      // torso: a real box (front, top and side faces)
      box3(-7.5, -21 + by, 15, 12, 4, '#6a5c3c');
      ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = 0.35; ctx.beginPath(); ctx.moveTo(-2.5, -21 + by); ctx.lineTo(-2.5, -9 + by); ctx.moveTo(2.5, -21 + by); ctx.lineTo(2.5, -9 + by); ctx.stroke();
      ctx.fillStyle = 'rgba(255,225,77,.7)'; for (const rx of [-6.4, 6.4]) for (const ry of [-19.8, -10.4]) ctx.fillRect(rx - 0.4, ry + by, 0.8, 0.8);
      // hazard stripes at the waist
      ctx.save(); ctx.beginPath(); ctx.rect(-7.5, -11.6 + by, 15, 2.2); ctx.clip();
      ctx.fillStyle = '#16140e'; ctx.fillRect(-7.5, -11.6 + by, 15, 2.2);
      ctx.fillStyle = c; for (let k = -9; k < 9; k += 2.2) { ctx.beginPath(); ctx.moveTo(k, -9.4 + by); ctx.lineTo(k + 1.1, -9.4 + by); ctx.lineTo(k + 2.2, -11.6 + by); ctx.lineTo(k + 1.1, -11.6 + by); ctx.fill(); }
      ctx.restore();
      // cockpit window with reflection
      const wg = ctx.createLinearGradient(0, -18.6 + by, 0, -15.4 + by); wg.addColorStop(0, '#3a3420'); wg.addColorStop(1, '#0a0906');
      ctx.fillStyle = wg; ctx.fillRect(-4, -18.6 + by, 8.4, 3.4); ctx.strokeStyle = MOUT; ctx.lineWidth = 0.4; ctx.strokeRect(-4, -18.6 + by, 8.4, 3.4);
      visor(-3.2, -17.8 + by, 6.8, 1.8);
      ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 0.35; ctx.beginPath(); ctx.moveTo(-3.4, -16 + by); ctx.lineTo(-1.6, -18.2 + by); ctx.stroke();
      // shoulder missile pods
      for (const px of [-10.5, 5.5]) {
        box3(px, -24 + by, 5, 6.4, 2.4, '#4a4a58');
        for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { ctx.fillStyle = '#0a0a0e'; ctx.beginPath(); ctx.arc(px + 1.3 + i * 2.4, -22 + j * 2.4 + by, 0.8, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#ff5a3c'; ctx.beginPath(); ctx.arc(px + 1.3 + i * 2.4, -22 + j * 2.4 + by, 0.35, 0, Math.PI * 2); ctx.fill(); }
      }
      // arm cannon: a twin-barrel tube that recoils on attack
      const rc = atk * 2.5;
      box3(6.5 - rc, -19.8 + by, 4, 4.2, 1.6, '#34343e');
      tube(10 - rc, -19.4 + by, 6, 1.5, '#5a5e6e'); tube(10 - rc, -17.4 + by, 6, 1.5, '#5a5e6e');
      ctx.fillStyle = c; ctx.fillRect(15.6 - rc, -19.6 + by, 1.4, 3.9);
      glowM(c, 16.4 - rc, -17.7 + by, 3, 3, 0.5 + atk * 0.5);
      if (atk > 0.5) { glowM('#ffffff', 18 - rc, -17.7 + by, 4, 3, atk); glowM(c, 19 - rc, -17.7 + by, 8, 5, atk); }
      rim(() => { ctx.moveTo(-7.5, -9.5 + by); ctx.lineTo(-7.5, -21 + by); ctx.lineTo(7.5, -21 + by); });
      ctx.strokeStyle = '#8a8aa0'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(-6, -23 + by); ctx.lineTo(-7.4, -30 + by); ctx.stroke();
      if (Math.sin(t * 4) > 0) glowM('#ff3355', -7.4, -30 + by, 2, 2, 0.9);
    } else {
      // ---- people of the city: volumetric look — limbs shaded like cylinders, a 3/4-turned torso,
      //      neon rim light from the city behind them, a face with nose, ear and jaw ----
      const by = -bob;
      const LOOK = {
        //            skin       hair       jacket     jacket hi  pants      boots      accent (neon)
        runner:   { skin: '#c88a64', hair: '#ff2bd6', top: '#2a1834', hi: '#5a3270', pants: '#221a30', boots: '#120e18', acc: '#ff2bd6' },
        gunner:   { skin: '#8a5a3c', hair: '#1a1410', top: '#3e4a36', hi: '#6a7a52', pants: '#30363a', boots: '#18181a', acc: '#19f0ff' },
        medic:    { skin: '#e8bc96', hair: '#f2ead8', top: '#dfe8ec', hi: '#ffffff', pants: '#2c3a40', boots: '#1a2024', acc: '#39ff88' },
        breacher: { skin: '#a8704a', hair: '#2a1c10', top: '#5a4024', hi: '#8a6438', pants: '#34302a', boots: '#1e1810', acc: '#ffb040' },
        ronin:    { skin: '#e0b08a', hair: '#0c0a0e', top: '#e4e0ea', hi: '#ffffff', pants: '#2e2a36', boots: '#18141c', acc: '#ff3048' },
        nyx:      { skin: '#b88470', hair: '#d03cff', top: '#2a1440', hi: '#5a2c8a', pants: '#1e1428', boots: '#100c16', acc: '#b26bff' },
      }[type] || { skin: '#c9a98a', hair: '#222', top: '#333', hi: '#555', pants: '#222', boots: '#111', acc: c };
      const K = (col) => skin || col; // white flash when hit
      const OUT = 'rgba(5,3,12,.9)';
      const P2 = (pts, col, line) => { ctx.fillStyle = K(col); ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1] + by) : ctx.moveTo(p[0], p[1] + by))); ctx.closePath(); ctx.fill(); if (line !== false) { ctx.strokeStyle = OUT; ctx.lineWidth = 0.45; ctx.stroke(); } };
      const glowAt = (col, x, y, rx, ry, a) => { ctx.save(); ctx.globalCompositeOperation = 'lighter'; G.World.light(ctx, col, x, y + by, rx, ry, a); ctx.restore(); };
      // a limb segment shaded across its width (light from the upper left), with a soft outline and a round end
      const limb = (x1, y1, x2, y2, w1, w2, col, noBob) => {
        const o = noBob ? 0 : by; y1 += o; y2 += o;
        const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
        const g = ctx.createLinearGradient(x1 + nx * w1, y1 + ny * w1, x1 - nx * w1, y1 - ny * w1);
        g.addColorStop(0, K(shade2(col, 1.55))); g.addColorStop(0.45, K(col)); g.addColorStop(1, K(shade2(col, 0.45)));
        ctx.fillStyle = g; ctx.beginPath();
        ctx.moveTo(x1 + nx * w1 / 2, y1 + ny * w1 / 2); ctx.lineTo(x2 + nx * w2 / 2, y2 + ny * w2 / 2);
        ctx.arc(x2, y2, w2 / 2, Math.atan2(ny, nx), Math.atan2(ny, nx) + Math.PI);
        ctx.lineTo(x1 - nx * w1 / 2, y1 - ny * w1 / 2);
        ctx.arc(x1, y1, w1 / 2, Math.atan2(-ny, -nx), Math.atan2(-ny, -nx) + Math.PI);
        ctx.closePath(); ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 0.4; ctx.stroke();
      };
      const glove = (x, y, col) => { const g = ctx.createRadialGradient(x - 0.3, y - 0.4 + by, 0.1, x, y + by, 1.2); g.addColorStop(0, K(shade2(col, 1.6))); g.addColorStop(1, K(shade2(col, 0.6))); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y + by, 1.1, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 0.35; ctx.stroke(); };
      const hx = 0.4, hy = -18.6;
      const heavy = type === 'gunner' || type === 'breacher';
      const longCoat = type === 'medic' || type === 'ronin';
      // ---------- behind the body ----------
      if (type === 'ronin') { const w = Math.sin(t * 9) * 1.2 + (mv ? 1.5 : 0); P2([[-3.2, -11], [-6 - w, -2.5], [-1.5 - w * 0.5, -1.8], [0, -9]], '#9a1022'); }
      if (type === 'nyx') {
        const hg2 = ctx.createLinearGradient(-5, -20 + by, -1, -10 + by); hg2.addColorStop(0, K('#f07aff')); hg2.addColorStop(1, K('#6a1a9a'));
        ctx.fillStyle = hg2; ctx.beginPath(); ctx.moveTo(-1.6, -21.5 + by); ctx.quadraticCurveTo(-6.8 - Math.sin(t * 4) * 0.8, -15 + by, -4.8, -9.5 + by); ctx.lineTo(-2.6, -10.5 + by); ctx.quadraticCurveTo(-3.4, -15 + by, -0.4, -18.5 + by); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#3a2a4a'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(-2.6, -16 + by); ctx.quadraticCurveTo(-7.5, -11 + by, -5.4, -6 + by); ctx.stroke();
        glowAt(LOOK.acc, -5.4, -6, 1.8, 1.8, 0.8);
      }
      if (type === 'medic') {
        const bg = ctx.createLinearGradient(-6.4, 0, -3, 0); bg.addColorStop(0, K('#22302c')); bg.addColorStop(1, K('#4a5e56'));
        ctx.fillStyle = bg; ctx.fillRect(-6.4, -15.6 + by, 3.4, 7.2); ctx.strokeStyle = OUT; ctx.lineWidth = 0.4; ctx.strokeRect(-6.4, -15.6 + by, 3.4, 7.2);
        ctx.fillStyle = LOOK.acc; ctx.fillRect(-5.6, -12.6 + by, 1.8, 0.6); ctx.fillRect(-5, -13.2 + by, 0.6, 1.8); glowAt(LOOK.acc, -4.7, -12.3, 2.2, 2.2, 0.5);
      }
      if (type === 'breacher') {
        const sg = ctx.createRadialGradient(-6.4, -13.4 + by, 0.5, -5.4, -12 + by, 4.2); sg.addColorStop(0, K('#5a5a66')); sg.addColorStop(1, K('#16161c'));
        ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(-5.4, -12 + by, 4, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = LOOK.acc; ctx.lineWidth = 0.7; ctx.stroke();
        ctx.fillStyle = '#ffe14d'; for (let k = 0; k < 3; k++) ctx.fillRect(-8 + k * 2, -12.5 + by, 1, 1.2);
        ctx.strokeStyle = '#8a7a60'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(-5.4, -16 + by); ctx.quadraticCurveTo(-4, -19 + by, -6.8, -19.6 + by); ctx.stroke();
        if (Math.sin(t * 14) > 0) glowAt('#ff5a2a', -6.8, -19.6, 3, 3, 1);
      }
      // ---------- rear arm (in shadow) ----------
      const sh = heavy ? 3.4 : 3;
      const armW = heavy ? 2 : 1.7;
      if (type !== 'gunner') {
        const ex = -sh - 0.6 - swing * 0.45, ey = -11.4, hx2 = -sh - 0.2 - swing * 0.75, hy2 = -8.8;
        limb(-sh + 0.4, -14.2, ex, ey, armW, armW * 0.85, shade2(LOOK.top, 0.7));
        limb(ex, ey, hx2, hy2, armW * 0.85, armW * 0.7, shade2(LOOK.top, 0.7));
        glove(hx2, hy2, '#1a1620');
      }
      // ---------- legs: thigh + shin, then chunky boots ----------
      const legW = heavy ? 2.9 : 2.5;
      const legPair = [[-1.5, swing], [1.5, -swing]].sort((a, b) => a[1] - b[1]); // the one stepping back is drawn first
      for (const [lx, s] of legPair) {
        const kx = lx + s * 0.9, ky = -3.8 + Math.abs(s) * 0.15, fx = lx + s * 0.6;
        limb(lx, -7.4, kx, ky, legW, legW * 0.85, s < 0 ? shade2(LOOK.pants, 0.8) : LOOK.pants);
        limb(kx, ky, fx, -1.2, legW * 0.85, legW * 0.75, s < 0 ? shade2(LOOK.pants, 0.8) : LOOK.pants, true);
        // boot
        const bg = ctx.createLinearGradient(0, -2.6, 0, 0.2); bg.addColorStop(0, K(shade2(LOOK.boots, 2.2))); bg.addColorStop(1, K(LOOK.boots));
        ctx.fillStyle = bg; ctx.beginPath(); ctx.moveTo(fx - 1.6, -2.4); ctx.lineTo(fx + 1, -2.4); ctx.quadraticCurveTo(fx + 2.6, -1.6, fx + 2.6, 0.1); ctx.lineTo(fx - 1.8, 0.1); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = OUT; ctx.lineWidth = 0.4; ctx.stroke();
        ctx.fillStyle = type === 'runner' ? LOOK.acc : 'rgba(0,0,0,.6)'; ctx.fillRect(fx - 1.8, -0.4, 4.4, 0.5); // sole (neon for the runner)
        if (heavy || type === 'ronin') { ctx.fillStyle = K(shade2(LOOK.pants, 1.5)); ctx.beginPath(); ctx.ellipse(kx + 0.3, ky + by, 1.1, 0.8, 0, 0, Math.PI * 2); ctx.fill(); } // knee pad
      }
      // ---------- torso: 3/4 turned — lit front, a darker side panel, ambient occlusion at the waist ----------
      const wide = heavy ? 1 : 0;
      const top = -16, bot = longCoat ? -4.4 : -6.8;
      const L0 = -4 - wide, R0 = 4 + wide;
      const tg = ctx.createLinearGradient(L0, 0, R0, 0);
      tg.addColorStop(0, K(LOOK.hi)); tg.addColorStop(0.45, K(LOOK.top)); tg.addColorStop(0.78, K(shade2(LOOK.top, 0.7))); tg.addColorStop(1, K(shade2(LOOK.top, 0.42)));
      ctx.fillStyle = tg; ctx.beginPath();
      ctx.moveTo(L0, top + 0.6 + by); ctx.quadraticCurveTo(0, top - 0.8 + by, R0, top + 0.6 + by);
      ctx.quadraticCurveTo(R0 + 0.4, (top + bot) / 2 + by, R0 - 0.6, bot + by); ctx.lineTo(L0 + 0.6, bot + by); ctx.quadraticCurveTo(L0 - 0.4, (top + bot) / 2 + by, L0, top + 0.6 + by);
      ctx.closePath(); ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 0.55; ctx.stroke();
      { // vertical shading: light at the shoulders, darker towards the waist
        const vg = ctx.createLinearGradient(0, top + by, 0, bot + by); vg.addColorStop(0, 'rgba(255,255,255,.18)'); vg.addColorStop(0.4, 'rgba(255,255,255,0)'); vg.addColorStop(1, 'rgba(0,0,0,.35)');
        ctx.fillStyle = vg; ctx.fill();
      }
      // shadow cast by the head on the chest
      ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(0.4, top + 1.2 + by, 2.6, 1, 0, 0, Math.PI * 2); ctx.fill();
      // cloth folds
      ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 0.35; ctx.beginPath(); ctx.moveTo(-2, top + 3 + by); ctx.quadraticCurveTo(-1, top + 5 + by, -2.4, bot - 1 + by); ctx.moveTo(2.4, top + 3.5 + by); ctx.quadraticCurveTo(1.6, top + 6 + by, 2.6, bot - 1 + by); ctx.stroke();
      if (type === 'runner') { // open hoodie
        ctx.fillStyle = K('#0e0a14'); ctx.fillRect(-1.2, top + 0.6 + by, 2.4, bot - top - 0.8);
        ctx.strokeStyle = LOOK.acc; ctx.lineWidth = 0.5; ctx.beginPath(); ctx.moveTo(-1.3, top + 0.6 + by); ctx.lineTo(-1.3, bot + by); ctx.moveTo(1.3, top + 0.6 + by); ctx.lineTo(1.3, bot + by); ctx.stroke();
        glowAt(LOOK.acc, 0, -11, 1.6, 4.5, 0.3);
        P2([[-3.6, top - 0.3], [3.6, top - 0.3], [2.6, top + 1.6], [-2.6, top + 1.6]], shade2(LOOK.top, 1.5));
      }
      if (type === 'gunner') { // plate carrier
        const pg = ctx.createLinearGradient(-3.6, 0, 3.6, 0); pg.addColorStop(0, K('#7a8a62')); pg.addColorStop(0.6, K('#4a5640')); pg.addColorStop(1, K('#2a3224'));
        ctx.fillStyle = pg; ctx.beginPath(); ctx.moveTo(-3.6, -15 + by); ctx.lineTo(3.6, -15 + by); ctx.lineTo(3.4, -9 + by); ctx.lineTo(-3.4, -9 + by); ctx.closePath(); ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 0.45; ctx.stroke();
        for (let k = 0; k < 3; k++) { const px = -3.2 + k * 2.3; const g2 = ctx.createLinearGradient(0, -10.9 + by, 0, -9 + by); g2.addColorStop(0, K('#5a6a48')); g2.addColorStop(1, K('#20281a')); ctx.fillStyle = g2; ctx.fillRect(px, -10.9 + by, 1.9, 1.9); ctx.strokeStyle = OUT; ctx.lineWidth = 0.3; ctx.strokeRect(px, -10.9 + by, 1.9, 1.9); }
        ctx.fillStyle = LOOK.acc; ctx.fillRect(2.2, -14.6 + by, 1.2, 0.7); glowAt(LOOK.acc, 2.8, -14.3, 2, 1.5, 0.6);
      }
      if (type === 'medic') {
        ctx.fillStyle = K('#2c3a40'); ctx.fillRect(-0.9, top + 0.8 + by, 1.8, bot - top - 1);
        ctx.fillStyle = LOOK.acc; ctx.fillRect(-3.2, -13.4 + by, 2.4, 0.8); ctx.fillRect(-2.4, -14.2 + by, 0.8, 2.4);
        ctx.fillStyle = '#2ab86a'; ctx.fillRect(2.8, -13.6 + by, 1.6, 1);
      }
      if (type === 'breacher') {
        const ag = ctx.createLinearGradient(-3.6, 0, 3.6, 0); ag.addColorStop(0, K('#9a7444')); ag.addColorStop(0.6, K('#6a4a28')); ag.addColorStop(1, K('#3a2814'));
        ctx.fillStyle = ag; ctx.beginPath(); ctx.moveTo(-3.2, -12.4 + by); ctx.lineTo(3.2, -12.4 + by); ctx.lineTo(3.6, -5.6 + by); ctx.lineTo(-3.6, -5.6 + by); ctx.closePath(); ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 0.45; ctx.stroke();
        ctx.save(); ctx.beginPath(); ctx.rect(-3.6, -7.4 + by, 7.2, 1.6); ctx.clip();
        for (let k = -6; k < 6; k += 1.6) { ctx.fillStyle = '#ffe14d'; ctx.beginPath(); ctx.moveTo(k, -5.8 + by); ctx.lineTo(k + 0.8, -5.8 + by); ctx.lineTo(k + 1.6, -7.4 + by); ctx.lineTo(k + 0.8, -7.4 + by); ctx.fill(); }
        ctx.restore();
      }
      if (type === 'ronin') {
        ctx.strokeStyle = '#b8162a'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(-2.6, top + 0.4 + by); ctx.lineTo(1.8, -10.4 + by); ctx.moveTo(2.6, top + 0.4 + by); ctx.lineTo(-0.4, -12.4 + by); ctx.stroke();
        const sg = ctx.createLinearGradient(0, -9.8 + by, 0, -8 + by); sg.addColorStop(0, K('#e0283e')); sg.addColorStop(1, K('#7a0e1a')); ctx.fillStyle = sg; ctx.fillRect(-4, -9.8 + by, 8, 1.8);
        ctx.fillStyle = '#ffd0d6'; ctx.fillRect(-0.6, -9.5 + by, 1.2, 1.2);
      }
      if (type === 'nyx') {
        ctx.strokeStyle = LOOK.acc; ctx.lineWidth = 0.45;
        ctx.beginPath(); ctx.moveTo(-2.8, -14 + by); ctx.lineTo(-1.2, -12 + by); ctx.lineTo(-1.2, -8 + by); ctx.moveTo(2.6, -13.6 + by); ctx.lineTo(1.2, -11.6 + by); ctx.lineTo(2.2, -8.2 + by); ctx.stroke();
        glowAt(LOOK.acc, 0, -11, 4, 3, 0.25 + Math.sin(t * 3) * 0.1);
      }
      if (!longCoat) {
        const bg = ctx.createLinearGradient(0, -7.9 + by, 0, -6.6 + by); bg.addColorStop(0, K('#3a3446')); bg.addColorStop(1, K('#0a0810'));
        ctx.fillStyle = bg; ctx.fillRect(-3.6 - wide * 0.4, -7.9 + by, 7.2 + wide * 0.8, 1.3);
        ctx.fillStyle = LOOK.acc; ctx.fillRect(-0.7, -7.8 + by, 1.4, 1); glowAt(LOOK.acc, 0, -7.3, 1.6, 0.9, 0.5);
      }
      // shoulder caps (rounded, lit from the top)
      for (const sx of [-sh + 0.4, sh - 0.4]) {
        const g = ctx.createRadialGradient(sx - 0.5, -15.2 + by, 0.2, sx, -14.6 + by, 2);
        g.addColorStop(0, K(shade2(LOOK.top, 1.9))); g.addColorStop(1, K(shade2(LOOK.top, sx > 0 ? 0.6 : 0.85)));
        ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(sx, -14.6 + by, 1.8, 1.35, 0, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 0.35; ctx.stroke();
      }
      // neon rim light: the city's glow catches the back edge of the body
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = LOOK.acc; ctx.globalAlpha = 0.75; ctx.lineWidth = 0.6;
      ctx.beginPath(); ctx.moveTo(L0 + 0.2, top + 1 + by); ctx.quadraticCurveTo(L0 - 0.3, (top + bot) / 2 + by, L0 + 0.7, bot - 0.4 + by); ctx.stroke();
      ctx.restore();
      // ---------- head ----------
      // neck in shadow under the jaw
      const ng = ctx.createLinearGradient(0, -16.8 + by, 0, -15.4 + by); ng.addColorStop(0, K(shade2(LOOK.skin, 0.5))); ng.addColorStop(1, K(shade2(LOOK.skin, 0.8)));
      ctx.fillStyle = ng; ctx.fillRect(-0.9, -16.8 + by, 2, 1.6);
      if (type === 'nyx') P2([[-3.9, -17.6], [-2.8, -22.9], [2.8, -23.1], [4.3, -18.7], [3.5, -15.8], [-3.3, -15.8]], '#341a52');
      // face: oval with 3D light, darker jaw/cheek on the far side, ear, nose
      const fg = ctx.createRadialGradient(hx - 0.9, hy - 1.3 + by, 0.3, hx + 0.4, hy + by, 3.6);
      fg.addColorStop(0, K(shade2(LOOK.skin, 1.35))); fg.addColorStop(0.55, K(LOOK.skin)); fg.addColorStop(1, K(shade2(LOOK.skin, 0.55)));
      ctx.fillStyle = fg; ctx.beginPath(); ctx.moveTo(hx - 2.8, hy - 0.8 + by);
      ctx.quadraticCurveTo(hx - 2.9, hy - 3.6 + by, hx, hy - 3.5 + by); ctx.quadraticCurveTo(hx + 2.9, hy - 3.4 + by, hx + 2.9, hy - 0.4 + by);
      ctx.quadraticCurveTo(hx + 2.8, hy + 2.6 + by, hx + 0.6, hy + 3.2 + by); ctx.quadraticCurveTo(hx - 2.2, hy + 2.9 + by, hx - 2.8, hy - 0.8 + by);
      ctx.closePath(); ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 0.45; ctx.stroke();
      ctx.fillStyle = 'rgba(60,20,10,.25)'; ctx.beginPath(); ctx.ellipse(hx + 1.9, hy + 1.2 + by, 0.9, 1.4, 0, 0, Math.PI * 2); ctx.fill(); // cheek shading
      ctx.fillStyle = K(shade2(LOOK.skin, 0.8)); ctx.beginPath(); ctx.ellipse(hx - 1.9, hy + 0.2 + by, 0.6, 0.9, 0, 0, Math.PI * 2); ctx.fill(); // ear
      ctx.fillStyle = K(shade2(LOOK.skin, 1.15)); ctx.beginPath(); ctx.moveTo(hx + 2.8, hy - 0.2 + by); ctx.lineTo(hx + 3.5, hy + 0.9 + by); ctx.lineTo(hx + 2.7, hy + 1.1 + by); ctx.closePath(); ctx.fill(); // nose
      const eye = (x, col) => { ctx.fillStyle = col; ctx.fillRect(hx + x, hy - 0.6 + by, 0.9, 0.8); };
      if (type === 'gunner') {
        const hgl = ctx.createLinearGradient(hx - 3, 0, hx + 3.6, 0); hgl.addColorStop(0, K('#5a6e7a')); hgl.addColorStop(0.5, K('#2c3a44')); hgl.addColorStop(1, K('#141c22'));
        ctx.fillStyle = hgl; ctx.beginPath(); ctx.moveTo(hx - 3.2, hy - 0.2 + by); ctx.quadraticCurveTo(hx - 3, hy - 4.4 + by, hx + 0.4, hy - 4.2 + by); ctx.quadraticCurveTo(hx + 3.6, hy - 4 + by, hx + 3.6, hy - 0.4 + by); ctx.lineTo(hx + 3.2, hy + 0.2 + by); ctx.lineTo(hx - 3, hy + 0.4 + by); ctx.closePath(); ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 0.45; ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.beginPath(); ctx.ellipse(hx - 1, hy - 3.2 + by, 1.4, 0.5, -0.2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = K('#0a1418'); ctx.fillRect(hx - 0.4, hy - 0.9 + by, 3.6, 1.4);
        ctx.fillStyle = LOOK.acc; ctx.fillRect(hx + 0.3, hy - 0.7 + by, 1.1, 0.9); ctx.fillRect(hx + 1.8, hy - 0.7 + by, 1.1, 0.9);
        glowAt(LOOK.acc, hx + 1.5, hy - 0.3, 2.6, 1.2, 0.6);
        ctx.fillStyle = 'rgba(26,20,16,.75)'; ctx.fillRect(hx - 1, hy + 1.8 + by, 3.6, 0.9); // beard
      } else if (type === 'breacher') {
        P2([[-3.3, -17], [-3.1, -22], [2.7, -22.4], [3.4, -18.6], [2.6, -16]], '#4a3420');
        const mg = ctx.createRadialGradient(hx + 0.6, hy + by, 0.3, hx + 1, hy + 0.6 + by, 2.6); mg.addColorStop(0, K('#4a4a56')); mg.addColorStop(1, K('#141418'));
        ctx.fillStyle = mg; ctx.beginPath(); ctx.ellipse(hx + 1, hy + 0.6 + by, 2.5, 2.1, 0, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 0.4; ctx.stroke();
        ctx.fillStyle = '#ffb040'; ctx.beginPath(); ctx.arc(hx + 0.4, hy - 0.4 + by, 0.7, 0, Math.PI * 2); ctx.arc(hx + 2.2, hy - 0.4 + by, 0.7, 0, Math.PI * 2); ctx.fill();
        glowAt('#ffb040', hx + 1.3, hy - 0.4, 2.4, 1.2, 0.5);
        const fg2 = ctx.createRadialGradient(hx + 2.6, hy + 1.5 + by, 0.1, hx + 2.8, hy + 1.8 + by, 1.2); fg2.addColorStop(0, K('#6a6a76')); fg2.addColorStop(1, K('#26262c'));
        ctx.fillStyle = fg2; ctx.beginPath(); ctx.arc(hx + 2.8, hy + 1.8 + by, 1.15, 0, Math.PI * 2); ctx.fill();
      } else {
        if (type === 'ronin') { eye(0.4, '#1a1014'); ctx.fillStyle = '#ff3048'; ctx.fillRect(hx + 1.8, hy - 0.7 + by, 1.1, 1); glowAt('#ff3048', hx + 2.3, hy - 0.2, 1.8, 1.4, 0.8); ctx.strokeStyle = 'rgba(255,60,80,.6)'; ctx.lineWidth = 0.3; ctx.beginPath(); ctx.moveTo(hx + 2.3, hy - 1.6 + by); ctx.lineTo(hx + 2.3, hy + 1.4 + by); ctx.stroke(); }
        else if (type === 'nyx') { eye(0.4, '#ffffff'); eye(1.9, '#ffffff'); ctx.fillStyle = LOOK.acc; ctx.fillRect(hx + 0.6, hy - 0.5 + by, 0.5, 0.6); ctx.fillRect(hx + 2.1, hy - 0.5 + by, 0.5, 0.6);
          ctx.strokeStyle = LOOK.acc; ctx.lineWidth = 0.35; ctx.beginPath(); ctx.moveTo(hx - 0.8, hy - 1.6 + by); ctx.lineTo(hx - 0.8, hy + 1.8 + by); ctx.moveTo(hx - 1.6, hy + 0.2 + by); ctx.lineTo(hx - 0.8, hy + 0.2 + by); ctx.stroke(); }
        else if (type === 'runner') { const vg2 = ctx.createLinearGradient(0, hy - 1.1 + by, 0, hy + 0.2 + by); vg2.addColorStop(0, '#2a3040'); vg2.addColorStop(1, '#06080c'); ctx.fillStyle = K('#000'); ctx.fillStyle = vg2; ctx.fillRect(hx - 0.8, hy - 1.1 + by, 3.9, 1.3); ctx.fillStyle = '#19f0ff'; ctx.fillRect(hx - 0.4, hy - 0.8 + by, 3.3, 0.55); glowAt('#19f0ff', hx + 1.2, hy - 0.5, 2.6, 1, 0.7); }
        else { eye(0.4, '#1a1014'); eye(1.9, '#1a1014'); }
        ctx.fillStyle = 'rgba(255,255,255,.75)'; if (type !== 'runner') ctx.fillRect(hx + 0.7, hy - 0.6 + by, 0.3, 0.3); // catch-light in the eye
        ctx.fillStyle = 'rgba(40,16,16,.6)'; ctx.fillRect(hx + 0.7, hy + 1.7 + by, 1.6, 0.4); // mouth
        if (type === 'medic') { const mg = ctx.createLinearGradient(0, hy + 0.6 + by, 0, hy + 2.6 + by); mg.addColorStop(0, K('#7ae8c8')); mg.addColorStop(1, K('#3a9a80')); ctx.fillStyle = mg; ctx.fillRect(hx - 0.8, hy + 0.6 + by, 4.1, 1.9); }
      }
      if (type === 'runner') {
        ctx.fillStyle = K(shade2(LOOK.skin, 0.65)); ctx.beginPath(); ctx.ellipse(hx, hy - 2.6 + by, 2.7, 1, 0, Math.PI, 0); ctx.fill(); // shaved sides
        const mg = ctx.createLinearGradient(0, hy - 6.4 + by, 0, hy - 2.4 + by); mg.addColorStop(0, K('#ffb0f0')); mg.addColorStop(0.5, K(LOOK.hair)); mg.addColorStop(1, K('#8a0a6a'));
        ctx.fillStyle = mg; ctx.beginPath(); ctx.moveTo(hx - 2.4, hy - 2.4 + by);
        for (let k = 0; k < 5; k++) { ctx.lineTo(hx - 2 + k * 1.1, hy - 5.8 - (k % 2) * 0.9 + by); ctx.lineTo(hx - 1.5 + k * 1.1, hy - 2.6 + by); }
        ctx.closePath(); ctx.fill(); glowAt(LOOK.hair, hx, hy - 4, 3, 2, 0.45);
        ctx.fillStyle = '#e8e0ff'; ctx.fillRect(hx - 1.9, hy + 0.4 + by, 0.4, 0.4); // earring
      }
      if (type === 'medic') {
        const hg3 = ctx.createLinearGradient(0, hy - 3.6 + by, 0, hy - 1 + by); hg3.addColorStop(0, K('#ffffff')); hg3.addColorStop(1, K('#c8bc9a'));
        ctx.fillStyle = hg3; ctx.beginPath(); ctx.moveTo(hx - 3, hy - 0.2 + by); ctx.quadraticCurveTo(hx - 3, hy - 3.8 + by, hx, hy - 3.7 + by); ctx.quadraticCurveTo(hx + 3, hy - 3.6 + by, hx + 3.1, hy - 1.2 + by); ctx.lineTo(hx + 1, hy - 1.8 + by); ctx.lineTo(hx - 2, hy - 0.6 + by); ctx.closePath(); ctx.fill();
        P2([[-2.8, -20.2], [-5.4, -19 + Math.sin(t * 8) * 0.4], [-4.8, -17.6], [-2.6, -19]], '#e0d6bc');
        ctx.fillStyle = LOOK.acc; ctx.fillRect(hx - 2.6, hy - 2.3 + by, 5.4, 0.5); glowAt(LOOK.acc, hx, hy - 2, 3, 0.8, 0.4);
      }
      if (type === 'ronin') {
        const hg4 = ctx.createLinearGradient(0, hy - 3.8 + by, 0, hy - 1.4 + by); hg4.addColorStop(0, K('#4a4250')); hg4.addColorStop(1, K(LOOK.hair));
        ctx.fillStyle = hg4; ctx.beginPath(); ctx.ellipse(hx, hy - 2.3 + by, 3, 1.6, 0, Math.PI, 0); ctx.fill();
        ctx.beginPath(); ctx.ellipse(hx - 0.6, hy - 4.4 + by, 1, 1.3, -0.3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#c21a30'; ctx.fillRect(hx - 3, hy - 2.1 + by, 6, 0.8);
        ctx.strokeStyle = '#c21a30'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(hx - 3, hy - 1.7 + by); ctx.lineTo(hx - 5 - Math.sin(t * 9), hy - 0.5 + by); ctx.stroke();
      }
      if (type === 'nyx') {
        const hg5 = ctx.createLinearGradient(hx - 3, 0, hx + 3, 0); hg5.addColorStop(0, K('#f07aff')); hg5.addColorStop(1, K('#7a1aaa'));
        ctx.fillStyle = hg5; ctx.beginPath(); ctx.moveTo(hx - 2.8, hy - 1 + by); ctx.quadraticCurveTo(hx - 1, hy - 4.4 + by, hx + 2.9, hy - 1.8 + by); ctx.lineTo(hx + 0.6, hy - 1.8 + by); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = K('#5a2c8a'); ctx.lineWidth = 0.9; ctx.beginPath(); ctx.arc(hx, hy + by, 3.5, Math.PI * 0.95, Math.PI * 2.05); ctx.stroke();
        ctx.fillStyle = LOOK.acc; ctx.fillRect(hx - 2.8, hy + by, 0.8, 0.8); glowAt(LOOK.acc, hx - 2.4, hy + 0.4, 1.6, 1.6, 0.9);
      }
      // rim light on the back of the head
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = LOOK.acc; ctx.globalAlpha = 0.7; ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.arc(hx, hy + by, 3.3, Math.PI * 0.75, Math.PI * 1.25); ctx.stroke(); ctx.restore();
      // ---------- front arm (lit) — runner and ronin have chrome cyber-arms ----------
      const sw = atk;
      const cyberArm = type === 'runner' || type === 'ronin';
      const armCol = cyberArm ? '#a8b4c4' : LOOK.top;
      let hx3 = 3.4, hy3 = -10.6;
      if (type !== 'gunner' && type !== 'nyx') { hx3 = 3.2 + swing * 0.5 + sw * 1.2; hy3 = -10.2; }
      const ex3 = (sh + hx3) / 2 + 0.8, ey3 = -12.2;
      limb(sh - 0.4, -14.2, ex3, ey3, armW, armW * 0.85, armCol);
      limb(ex3, ey3, hx3, hy3, armW * 0.85, armW * 0.7, armCol);
      if (cyberArm) { ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 0.3; ctx.beginPath(); ctx.moveTo(ex3 - 0.6, ey3 + by - 0.5); ctx.lineTo(ex3 + 0.6, ey3 + by + 0.5); ctx.stroke(); glowAt(LOOK.acc, ex3, ey3, 1.4, 1.4, 0.8); }
      glove(hx3, hy3, cyberArm ? '#8a96a8' : '#1a1620');
      if (type === 'runner') {
        ctx.save(); ctx.translate(2.6, -10.5 + by); ctx.rotate(-0.9 + sw * 1.6);
        ctx.strokeStyle = '#ffd6f4'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(0.5, 0); ctx.lineTo(7.5, 0); ctx.stroke();
        ctx.strokeStyle = LOOK.acc; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(1, 0.5); ctx.lineTo(7.5, 0.5); ctx.stroke();
        ctx.globalCompositeOperation = 'lighter'; G.World.light(ctx, LOOK.acc, 4, 0, 6, 3, 0.6); ctx.restore();
      } else if (type === 'gunner') {
        const rc = sw * 2;
        ctx.fillStyle = '#20262c'; ctx.fillRect(-2.2 - rc, -11.6 + by, 3, 2);
        const rg = ctx.createLinearGradient(0, -12.2 + by, 0, -9.4 + by); rg.addColorStop(0, '#8a98a4'); rg.addColorStop(0.45, '#4a5560'); rg.addColorStop(1, '#1e242c');
        ctx.fillStyle = rg; ctx.fillRect(0.6 - rc, -12.2 + by, 8, 2.8);
        ctx.strokeStyle = 'rgba(5,3,12,.85)'; ctx.lineWidth = 0.45; ctx.strokeRect(0.6 - rc, -12.2 + by, 8, 2.8);
        ctx.fillStyle = '#1a1e24'; ctx.fillRect(3 - rc, -9.6 + by, 1.8, 2.6);
        ctx.fillStyle = '#14181e'; ctx.fillRect(2.4 - rc, -13.6 + by, 3.6, 1.2); ctx.fillStyle = LOOK.acc; ctx.fillRect(5.6 - rc, -13.5 + by, 0.6, 1);
        ctx.fillStyle = '#5a6670'; ctx.fillRect(8.6 - rc, -11.4 + by, 3, 1.2);
        ctx.fillStyle = LOOK.acc; ctx.fillRect(11.2 - rc, -11.8 + by, 1.4, 2);
        glove(3.4, -10.6, '#1a1620');
        if (sw > 0.5) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; G.World.light(ctx, '#ffffff', 13, -10.7 + by, 6, 4, sw); G.World.light(ctx, LOOK.acc, 14, -10.7 + by, 10, 6, sw); ctx.restore(); }
      } else if (type === 'ronin') {
        const a0 = -1.1 + sw * 2.2;
        ctx.save(); ctx.translate(2.6, -11 + by);
        if (sw > 0.05) {
          ctx.globalCompositeOperation = 'lighter';
          ctx.strokeStyle = 'rgba(255,60,80,' + (0.7 * sw).toFixed(2) + ')'; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.arc(0, 0, 13, a0 - 1.6, a0); ctx.stroke();
          ctx.strokeStyle = 'rgba(255,220,230,' + (0.6 * sw).toFixed(2) + ')'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(0, 0, 13, a0 - 1.2, a0); ctx.stroke();
          ctx.globalCompositeOperation = 'source-over';
        }
        ctx.rotate(a0);
        ctx.strokeStyle = '#ffd0d6'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(2, 0); ctx.lineTo(14, 0); ctx.stroke();
        ctx.strokeStyle = '#ff2a40'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(3, 0.6); ctx.lineTo(14, 0.6); ctx.stroke();
        ctx.fillStyle = '#222'; ctx.fillRect(-1, -1, 3, 2); ctx.fillStyle = '#c21a30'; ctx.fillRect(1.6, -1.4, 0.6, 2.8);
        ctx.globalCompositeOperation = 'lighter'; G.World.light(ctx, '#ff3048', 9, 0, 9, 3, 0.55);
        ctx.restore();
      } else if (type === 'breacher') {
        const cg = ctx.createLinearGradient(0, -12 + by, 0, -8.6 + by); cg.addColorStop(0, '#6a6a76'); cg.addColorStop(1, '#22222a');
        ctx.fillStyle = cg; ctx.fillRect(2, -12 + by, 4.5, 3.4); ctx.strokeStyle = OUT; ctx.lineWidth = 0.4; ctx.strokeRect(2, -12 + by, 4.5, 3.4);
        ctx.fillStyle = LOOK.acc; ctx.fillRect(2.6, -11.4 + by, 3.3, 0.9);
        glowAt('#ff5a2a', 4.2, -10.4, 3 + Math.abs(Math.sin(t * 8)) * 3, 2.5, 0.8);
      } else if (type === 'medic') {
        const ig = ctx.createLinearGradient(0, -11.5 + by, 0, -9.7 + by); ig.addColorStop(0, '#d0dcd6'); ig.addColorStop(1, '#6a7872');
        ctx.fillStyle = ig; ctx.fillRect(1.5, -11.5 + by, 6, 1.8);
        ctx.fillStyle = LOOK.acc; ctx.fillRect(3, -13 + by, 2.4, 1.6);
        glowAt(LOOK.acc, 4.2, -12.2, 4 + sw * 6, 3 + sw * 4, 0.5 + sw * 0.5);
      } else if (type === 'nyx') {
        ctx.save(); ctx.translate(7, -11 + by);
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = LOOK.acc; ctx.lineWidth = 0.8; ctx.setLineDash([2, 2]); ctx.lineDashOffset = t * 10;
        ctx.beginPath(); ctx.ellipse(0, 0, 4.5 + sw * 2, 2.6 + sw, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(178,107,255,.6)';
        for (let k = 0; k < 3; k++) { const a = t * 2 + k * 2.1; ctx.fillRect(Math.cos(a) * 6 - 1, Math.sin(a) * 3 - 4 - k, 2.4, 1.6); }
        G.World.light(ctx, LOOK.acc, 0, 0, 7 + sw * 4, 5 + sw * 3, 0.7);
        ctx.restore();
      }
    }
    ctx.restore();
  };

  // ---------- thumbnails for UI ----------
  const thumbs = new Map();
  A.buildThumb = function (type, level) {
    const key = 'b' + type + level;
    if (thumbs.has(key)) return thumbs.get(key);
    const sp = A.sprite(type, level);
    const [c, x] = mk(96, 96, 1);
    const top = Math.min(sp.top, HEAD);
    const srcY = (HEAD - top) * SS, srcH = (top + sp.s * TH + 4) * SS;
    const k = Math.min(92 / sp.w, 92 / (srcH / SS));
    const dw = sp.w * k, dh = srcH / SS * k;
    x.drawImage(sp.c, 0, srcY, sp.c.width, srcH, (96 - dw) / 2, (96 - dh) / 2, dw, dh);
    const url = c.toDataURL();
    thumbs.set(key, url);
    return url;
  };
  A.unitThumb = function (type) {
    const key = 'u' + type;
    if (thumbs.has(key)) return thumbs.get(key);
    const [c, x] = mk(64, 64, 1);
    const k = type === 'mech' ? 1.15 : (type === 'ronin' || type === 'nyx') ? 1.3 : 1.6;
    x.translate(30, 58); x.scale(k, k);
    A.drawUnit(x, type, 0, 0, 0.3, false, false, { moving: false, atk: 0, dead: 0 });
    const url = c.toDataURL();
    thumbs.set(key, url);
    return url;
  };
})();
