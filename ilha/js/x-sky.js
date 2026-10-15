/* Ilha de Repouso — constelações: olhar o céu à noite (K), ligar estrelas, e os desenhos descobertos ficam no céu. */
(window.IlhaExt = window.IlhaExt || []).push(function (XC) {
  'use strict';
  const T = XC.T, scene = XC.scene, camera = XC.camera, $ = XC.$, TAU = XC.TAU, clamp = XC.clamp;
  const CON = XC.CAT.filter(c => c.cat === 'sky');
  /* ───────── desenhos fixos no céu (só os já descobertos) ───────── */
  const sky = new T.Group(); sky.frustumCulled = false; scene.add(XC.live(sky));
  const R = 420, mats = [];
  const dir = (az, el) => new T.Vector3(Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az)).multiplyScalar(R);
  const entries = CON.map(c => {
    const g = new T.Group(), pos = c.pts.map(p => { const el = c.el + (0.5 - p[1]) * 0.42, az = c.az + (p[0] - 0.5) * 0.55 / Math.max(0.35, Math.cos(el)); return dir(az, el); });
    const lg = new T.BufferGeometry(), arr = []; c.links.forEach(([a, b]) => { arr.push(pos[a].x, pos[a].y, pos[a].z, pos[b].x, pos[b].y, pos[b].z); }); lg.setAttribute('position', new T.Float32BufferAttribute(arr, 3));
    const lm = new T.LineBasicMaterial({ color: 0xbcd0ff, transparent: true, opacity: 0, depthWrite: false, fog: false, blending: T.AdditiveBlending, toneMapped: false }), ls = new T.LineSegments(lg, lm); ls.frustumCulled = false; g.add(ls);
    const pg = new T.BufferGeometry(); pg.setAttribute('position', new T.Float32BufferAttribute(pos.flatMap(v => [v.x, v.y, v.z]), 3));
    const pm = new T.PointsMaterial({ map: XC.glowTex, color: 0xfff1c8, size: 22, transparent: true, opacity: 0, depthWrite: false, fog: false, blending: T.AdditiveBlending, sizeAttenuation: true, toneMapped: false }), pt = new T.Points(pg, pm); pt.frustumCulled = false; g.add(pt);
    g.visible = false; sky.add(g); mats.push(lm, pm); return { c, g, lm, pm };
  });
  XC.ticks.push((dt, t) => {
    sky.position.copy(camera.position); const nt = clamp((XC.night - 0.35) * 1.6, 0, 1);
    for (const e of entries) { const on = XC.count(e.c.id) > 0 && nt > 0.01; if (e.g.visible !== on) e.g.visible = on; if (on) { e.lm.opacity = 0.5 * nt; e.pm.opacity = (0.8 + 0.2 * Math.sin(t * 1.5 + e.c.az)) * nt; } }
  });
  /* ───────── modo de olhar o céu ───────── */
  const css = document.createElement('style');
  css.textContent = '#skyM{position:fixed;inset:0;z-index:6;display:none;background:radial-gradient(ellipse at 50% 30%,rgba(18,26,70,.8),rgba(4,6,20,.93));touch-action:none}#skyM canvas{position:absolute;inset:0;width:100%;height:100%}#skyM .bar{position:absolute;left:50%;bottom:22px;transform:translateX(-50%);display:flex;gap:8px;align-items:center;flex-wrap:wrap;justify-content:center;max-width:94vw}#skyM .ttl{position:absolute;left:50%;top:18px;transform:translateX(-50%);text-align:center;font:600 14px/1.3 "DM Mono",monospace;letter-spacing:.1em;color:#dfe8ff;pointer-events:none;max-width:90vw}#skyM .ttl small{display:block;font-weight:500;font-size:11px;color:rgba(223,232,255,.65);letter-spacing:.02em;margin-top:4px}';
  document.head.appendChild(css);
  const ov = document.createElement('div'); ov.id = 'skyM'; ov.innerHTML = '<canvas></canvas><div class="ttl"><span id="skT"></span><small id="skS"></small></div><div class="bar"><button class="chip" type="button" id="skP">‹</button><span class="chip" id="skI"></span><button class="chip" type="button" id="skN">›</button><button class="chip" type="button" id="skX">Sair</button></div>'; document.body.appendChild(ov);
  const cv = ov.querySelector('canvas'), g = cv.getContext('2d'); let open = false, idx = 0, W = 0, H = 0, raf = 0, sel = -1, ptr = null, made = [], doneAt = 0;
  const bgStars = Array.from({ length: 90 }, (_, i) => [(i * 0.6180339 % 1), (i * 0.3247 % 1), 0.5 + (i % 5) * 0.35, i * 1.7]);
  const layout = () => { const dpr = Math.min(devicePixelRatio || 1, 1.5); W = innerWidth; H = innerHeight; cv.width = W * dpr; cv.height = H * dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0); };
  const cur = () => CON[idx], S = () => Math.min(W * 0.78, H * 0.62), XY = p => [W / 2 + (p[0] - 0.5) * S() * 1.1, H * 0.46 + (p[1] - 0.5) * S() * 0.95];
  const pent = [261.63, 293.66, 329.63, 392, 440, 523.25, 587.33, 659.25];
  function setIdx(i) { idx = (i + CON.length) % CON.length; sel = -1; made = XC.count(cur().id) ? cur().links.map((_, k) => k) : []; doneAt = XC.count(cur().id) ? 1 : 0; head(); }
  function head() { const c = cur(), got = XC.count(c.id) > 0; $('skT').textContent = got ? c.name : 'Uma constelação ainda sem nome'; $('skS').textContent = got ? c.desc : 'Ligue as estrelas arrastando de uma até a outra. As linhas ao fundo são só uma dica.'; $('skI').textContent = (idx + 1) + '/' + CON.length + ' · ' + XC.found('sky') + ' descobertas'; }
  function hit(x, y) { const c = cur(); let b = -1, bd = 34; c.pts.forEach((p, i) => { const q = XY(p), d = Math.hypot(q[0] - x, q[1] - y); if (d < bd) { bd = d; b = i; } }); return b; }
  function link(a, b) {
    const c = cur(), k = c.links.findIndex(l => (l[0] === a && l[1] === b) || (l[0] === b && l[1] === a)); if (k < 0) { XC.snd.note(196, 'box', 0.25); return; } if (made.includes(k)) return;
    made.push(k); XC.snd.note(pent[(made.length * 2 + a) % 8], 'crystal', 0.55);
    if (made.length === c.links.length) { doneAt = performance.now(); const first = XC.discover(c.id); XC.snd.note(783.99, 'bell', 0.7); head(); }
  }
  function draw(now) {
    if (!open) return; raf = requestAnimationFrame(draw); g.clearRect(0, 0, W, H);
    for (const s of bgStars) { g.globalAlpha = 0.25 + 0.3 * Math.sin(now / 900 + s[3]); g.fillStyle = '#fff'; g.beginPath(); g.arc(s[0] * W, s[1] * H, s[2], 0, TAU); g.fill(); } g.globalAlpha = 1;
    const c = cur(), pulse = doneAt ? 0.6 + 0.4 * Math.sin(now / 400) : 0; g.lineCap = 'round';
    g.strokeStyle = 'rgba(188,208,255,.13)'; g.lineWidth = 2; g.setLineDash([3, 8]); c.links.forEach((l, k) => { if (made.includes(k)) return; const a = XY(c.pts[l[0]]), b = XY(c.pts[l[1]]); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }); g.setLineDash([]);
    g.strokeStyle = doneAt ? 'rgba(255,241,200,' + (0.7 + pulse * 0.3) + ')' : 'rgba(188,208,255,.9)'; g.lineWidth = doneAt ? 3.2 : 2.6; g.shadowColor = '#bcd0ff'; g.shadowBlur = doneAt ? 14 : 8; made.forEach(k => { const l = c.links[k], a = XY(c.pts[l[0]]), b = XY(c.pts[l[1]]); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }); g.shadowBlur = 0;
    if (sel >= 0 && ptr) { const a = XY(c.pts[sel]); g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 2; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(ptr[0], ptr[1]); g.stroke(); }
    c.pts.forEach((p, i) => { const q = XY(p), r = (i === sel ? 9 : 6.5) + 1.2 * Math.sin(now / 500 + i * 2) + pulse * 2.5; const gr = g.createRadialGradient(q[0], q[1], 0, q[0], q[1], r * 4); gr.addColorStop(0, 'rgba(255,241,200,.8)'); gr.addColorStop(1, 'rgba(255,241,200,0)'); g.fillStyle = gr; g.fillRect(q[0] - r * 4, q[1] - r * 4, r * 8, r * 8); g.fillStyle = '#fff'; g.beginPath(); g.arc(q[0], q[1], r * 0.55, 0, TAU); g.fill(); });
  }
  cv.addEventListener('pointerdown', e => { e.stopPropagation(); const h = hit(e.clientX, e.clientY); ptr = [e.clientX, e.clientY]; if (sel >= 0 && h >= 0 && h !== sel) { link(sel, h); sel = h; } else sel = h; try { cv.setPointerCapture(e.pointerId); } catch (x) {} });
  cv.addEventListener('pointermove', e => { ptr = [e.clientX, e.clientY]; });
  cv.addEventListener('pointerup', e => { const h = hit(e.clientX, e.clientY); if (sel >= 0 && h >= 0 && h !== sel) { link(sel, h); sel = h; } ptr = null; });
  ov.addEventListener('pointerdown', e => e.stopPropagation());
  function openSky() {
    if (open || XC.modal) return; if (XC.night < 0.5) { XC.toast('Ainda está claro', 'As constelações só aparecem de noite. Aperte T para escolher a noite.'); return; }
    open = true; XC.modal++; ov.style.display = 'block'; layout(); const first = CON.findIndex(c => !XC.count(c.id)); setIdx(first < 0 ? 0 : first); raf = requestAnimationFrame(draw);
  }
  function closeSky() { if (!open) return; open = false; XC.modal = Math.max(0, XC.modal - 1); ov.style.display = 'none'; cancelAnimationFrame(raf); try { XC.cv.focus({ preventScroll: true }); } catch (e) {} }
  $('skX').addEventListener('click', closeSky); $('skP').addEventListener('click', () => setIdx(idx - 1)); $('skN').addEventListener('click', () => setIdx(idx + 1)); addEventListener('resize', () => { if (open) layout(); });
  XC.onKey((k, e) => { if (open) { if (k === 'escape' || k === 'k') closeSky(); else if (k === 'arrowright') setIdx(idx + 1); else if (k === 'arrowleft') setIdx(idx - 1); e.preventDefault(); return true; } if (k === 'k' && !e.repeat) { openSky(); return true; } return false; });
  XC.tool('sky', 'Céu', 'k', () => open ? closeSky() : openSky(), 'Olhar as constelações (K) — só de noite');
});
