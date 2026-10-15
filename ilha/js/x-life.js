/* Ilha de Repouso — vida: criaturas, pesca, jardim, pedras que cantam + compositor, lanternas de música. */
(window.IlhaExt = window.IlhaExt || []).push(function (XC) {
  'use strict';
  const T = XC.T, scene = XC.scene, P = XC.P, AU = XC.AU, sv = XC.sv, SP = XC.spots, TAU = XC.TAU, groundH = XC.groundH, rnd = XC.rnd, clamp = XC.clamp, smooth = XC.smooth, camera = XC.camera, ISL = XC.ISL, $ = XC.$;
  const dist = (x, z) => Math.hypot(P.x - x, P.z - z);
  const nightNow = () => XC.night;
  /* ───────── pontos novos nas ilhas antigas ───────── */
  for (let k = 0; k < 6; k++) { const a = 0.9 + k * 0.85; SP.fish.push({ biome: 'mar', x: Math.cos(a) * 57, z: Math.sin(a) * 57, r: 6, y: 0 }); }
  SP.fish.push({ biome: 'sakura', x: ISL.T.x - 20, z: ISL.T.z + 14, r: 6, y: 0 }, { biome: 'sakura', x: ISL.T.x - 18, z: ISL.T.z - 16, r: 6, y: 0 });
  SP.fish.push({ biome: 'gelo', x: ISL.N.x + 7, z: ISL.N.z - 4, r: 5, y: groundH(ISL.N.x + 7, ISL.N.z - 4) + 0.05 }, { biome: 'oasis', x: ISL.D.x - 3, z: ISL.D.z + 2, r: 4.2, y: groundH(ISL.D.x - 3, ISL.D.z + 2) + 0.05 });
  SP.stone.push({ id: 'n1', x: 14, z: -20 }, { id: 'n2', x: -22, z: -6 }, { id: 'n7', x: -12, z: 24 }, { id: 'n11', x: 24, z: 16, night: true }, { id: 'n3', x: ISL.T.x - 7, z: ISL.T.z + 9 }, { id: 'n4', x: ISL.D.x + 6, z: ISL.D.z + 10 }, { id: 'n9', x: ISL.D.x - 12, z: ISL.D.z - 5 }, { id: 'n10', x: ISL.N.x - 6, z: ISL.N.z - 9 });
  SP.critter.push({ id: 'raposa', x: -20, z: 14, mode: 'walk', R: 6 }, { id: 'coelho', x: 22, z: 22, mode: 'walk', R: 7 }, { id: 'coelho', x: -26, z: -18, mode: 'walk', R: 6, dup: true },
    { id: 'cometa', x: ISL.T.x, z: ISL.T.z + 2, mode: 'fly', R: 7, h: 7 }, { id: 'pinguim', x: ISL.N.x - 3, z: ISL.N.z + 3, mode: 'walk', R: 5 }, { id: 'lagartixa', x: ISL.D.x + 10, z: ISL.D.z - 8, mode: 'sit' },
    { id: 'caranguejo', x: 40, z: 22, mode: 'walk', R: 3 }, { id: 'caranguejo', x: ISL.D.x + 18, z: ISL.D.z + 10, mode: 'walk', R: 3, dup: true }, { id: 'caranguejo', x: ISL.W.x - 14, z: ISL.W.z + 12, mode: 'walk', R: 3, dup: true });

  /* ───────── criaturas (figurinhas que andam, voam ou flutuam) ───────── */
  const BIG = { tartaruga: 4.2, abissal: 2.6, raposa: 2.8, gato: 2.4 }, SMALL = { caranguejo: 1.5, sapo: 1.7, lagartixa: 1.9, polvo: 2.4, morcego: 1.7, cometa: 2.0 };
  const crit = [], texs = {};
  const texOf = id => texs[id] || (texs[id] = (() => { const t = new T.CanvasTexture(XC.sprite(id)); t.encoding = T.sRGBEncoding; return t; })());
  XC.ticks.push(() => {});   /* garante o array */
  (function spawn() {
    for (const s of SP.critter) {
      const e = XC.byId[s.id]; if (!e) continue;
      const m = new T.Sprite(new T.SpriteMaterial({ map: texOf(s.id), transparent: true, alphaTest: 0.08, depthWrite: false })), sz = BIG[s.id] || SMALL[s.id] || 2.6; m.scale.set(sz * 1.25, sz * 0.94, 1); m.visible = false; scene.add(XC.live(m));
      const c = { s, m, sz, x: s.x, z: s.z, tx: s.x, tz: s.z, wait: rnd() * 3, ph: rnd() * 9, a: rnd() * TAU, hop: 0, dir: 1, y: 0 }; crit.push(c);
    }
  })();
  const camR = new T.Vector3();
  function critY(c, t) {
    const s = c.s, g = s.y !== undefined ? s.y : groundH(c.x, c.z);
    if (s.mode === 'fly') return g + s.h + Math.sin(t * 2 + c.ph) * 0.4;
    if (s.mode === 'float' || s.mode === 'swim') return g + s.h + Math.sin(t * 0.8 + c.ph) * 0.35;
    return g + c.sz * 0.2 + Math.abs(Math.sin(c.hop * 6)) * (c.hop > 0 ? 0.5 : 0);
  }
  let seenNear = null;
  XC.ticks.push((dt, t) => {
    seenNear = null; let bd = 4.4; camera.getWorldDirection(camR); const rx = -camR.z, rz = camR.x;
    for (const c of crit) {
      const s = c.s, dd = dist(s.x, s.z), vis = dd < 85 && (!s.night || nightNow() > 0.35);
      if (c.m.visible !== vis) c.m.visible = vis; if (!vis) continue;
      let vx = 0, vz = 0;
      if (s.mode === 'walk') { c.wait -= dt; if (c.wait <= 0) { const a = rnd() * TAU, r = rnd() * s.R; c.tx = s.x + Math.cos(a) * r; c.tz = s.z + Math.sin(a) * r; if (groundH(c.tx, c.tz) < 0.5 && s.y === undefined) { c.tx = s.x; c.tz = s.z; } c.wait = 2 + rnd() * 4; } const dx = c.tx - c.x, dz = c.tz - c.z, d = Math.hypot(dx, dz); if (d > 0.15) { vx = dx / d * 0.9; vz = dz / d * 0.9; c.x += vx * dt; c.z += vz * dt; c.hop = c.hop > 0 ? c.hop : 0.001; c.hop += dt; } else c.hop = 0; if (c.hop > 0 && c.hop > 1e3) c.hop = 0; }
      else if (s.mode === 'fly' || s.mode === 'float' || s.mode === 'swim') { const w = s.mode === 'fly' ? 0.55 : s.mode === 'swim' ? 0.18 : 0.12; c.a += dt * w; const ox = c.x, oz = c.z; c.x = s.x + Math.cos(c.a) * s.R; c.z = s.z + Math.sin(c.a) * s.R * (s.mode === 'float' ? 0.7 : 1); vx = (c.x - ox) / Math.max(dt, 1e-3); vz = (c.z - oz) / Math.max(dt, 1e-3); }
      else { if (c.hop > 0) c.hop += dt; if (c.hop > 1.4) c.hop = 0; }
      if (c.hopNow > 0) { c.hopNow -= dt; c.hop += dt * 2; if (c.hopNow <= 0) c.hop = 0; }
      c.m.position.set(c.x, critY(c, t), c.z);
      const side = vx * rx + vz * rz; if (Math.abs(side) > 0.05) c.dir = side > 0 ? -1 : 1; c.m.scale.x = Math.abs(c.m.scale.x) * c.dir;
      if (s.mode === 'float') c.m.material.opacity = 0.82 + 0.18 * Math.sin(t * 2 + c.ph);
      const dn = Math.hypot(P.x - c.x, P.z - c.z); if (dn < bd && Math.abs(P.y - (c.m.position.y - c.sz * 0.2)) < 5) { bd = dn; seenNear = c; }
    }
  });
  function observe(c) {
    const e = XC.byId[c.s.id]; XC.discover(e.id); c.hopNow = 1.2; c.hop = 0.001; XC.snd.note(e.cat === 'critter' ? 660 : 440, 'bell', 0.5);
  }
  XC.addAct(() => (seenNear && !P.sit) ? 'E · observar ' + (XC.count(seenNear.s.id) ? XC.byId[seenNear.s.id].name : 'criatura') : '', () => { if (!seenNear) return false; observe(seenNear); return true; });

  /* ───────── pedras que cantam ───────── */
  const stones = [], stGeo = new T.OctahedronGeometry(0.42, 0);
  for (const s of SP.stone) {
    const n = XC.SOUNDS_BY[s.id]; if (!n) continue; const hue = (n.f * 0.37 % 360) / 360, y = s.y !== undefined ? s.y : groundH(s.x, s.z);
    const m = new T.Mesh(stGeo, new T.MeshStandardMaterial({ color: new T.Color().setHSL(hue, 0.6, 0.65), emissive: new T.Color().setHSL(hue, 0.9, 0.5), emissiveIntensity: 0.6, roughness: 0.3, flatShading: true })); m.scale.y = 1.5; m.position.set(s.x, y + 0.9, s.z);
    const g = XC.glow(new T.Color().setHSL(hue, 0.9, 0.7).getHex(), 2.4, 0.6); g.position.copy(m.position); scene.add(XC.live(m)); scene.add(XC.live(g)); stones.push({ s, n, m, g, hue, y, k: 0 });
  }
  let stNear = null;
  XC.ticks.push((dt, t) => {
    stNear = null; let bd = 3;
    for (const o of stones) { const d = dist(o.s.x, o.s.z), vis = d < 90 && (!o.s.night || nightNow() > 0.4); if (o.m.visible !== vis) o.m.visible = o.g.visible = vis; if (!vis) continue; o.k = Math.max(0, o.k - dt * 1.6); o.m.position.y = o.y + 0.95 + Math.sin(t * 1.5 + o.hue * 20) * 0.1; o.m.rotation.y = t * 0.6; o.g.position.copy(o.m.position); o.m.material.emissiveIntensity = 0.5 + o.k * 1.5 + AU.level * 0.4; o.g.material.opacity = 0.45 + o.k * 0.5; if (d < bd) { bd = d; stNear = o; } }
  });
  XC.addAct(() => stNear && !P.sit ? 'E · tocar a pedra' + (XC.count(stNear.s.id) ? ' (' + stNear.n.name + ')' : '') : '', () => { const o = stNear; if (!o) return false; o.k = 1; XC.snd.note(o.n.f, o.n.kind); XC.discover(o.s.id, XC.count(o.s.id) > 0); XC.burst(o.s.x, o.y + 1.3, o.s.z, new T.Color().setHSL(o.hue, 0.8, 0.7).getHex()); return true; });

  /* ───────── pesca tranquila ───────── */
  const POOL = {
    mar: [['carpa', 'day'], ['lua', 'edge'], ['cavalo', 'any'], ['baiacu', 'any'], ['lanterna', 'night'], ['raia', 'night']],
    sakura: [['koisakura', 'any'], ['carpa', 'day'], ['lua', 'edge']], gelo: [['gelo', 'any'], ['salmao', 'night']], oasis: [['areia', 'any']], vila: [['nuvem', 'any'], ['carpa', 'day'], ['cavalo', 'any']],
    cristal: [['enguia', 'any']], cachoeira: [['truta', 'any'], ['koiarco', 'day']]
  };
  const WEIGHT = { comum: 5, incomum: 3, raro: 1.3 };
  function pickFish(biome) {
    const nt = nightNow(), edge = nt > 0.25 && nt < 0.75, list = (POOL[biome] || POOL.mar).filter(([id, c]) => c === 'any' || (c === 'day' && nt < 0.4) || (c === 'night' && nt > 0.6) || (c === 'edge' && (nt < 0.75)));
    if (!list.length) return 'carpa'; let tot = 0; const w = list.map(([id]) => { const x = (WEIGHT[XC.byId[id].r] || 3) * (XC.count(id) ? 1 : 1.6); tot += x; return x; }); let r = rnd() * tot; for (let i = 0; i < list.length; i++) { r -= w[i]; if (r <= 0) return list[i][0]; } return list[0][0];
  }
  const rings = [], rm = new T.MeshBasicMaterial({ color: 0xcdf3ff, transparent: true, opacity: 0.4, depthWrite: false, side: T.DoubleSide, blending: T.AdditiveBlending, toneMapped: false });
  const rgeo = new T.RingGeometry(0.5, 0.62, 28); rgeo.rotateX(-Math.PI / 2);
  for (const f of SP.fish) { const m = new T.Mesh(rgeo, rm.clone()); const a = Math.atan2(P.z - f.z, P.x - f.x); m.position.set(f.x, (f.y || 0) + 0.12, f.z); m.visible = false; scene.add(XC.live(m)); rings.push({ f, m, ph: rnd() * 6 }); }
  const bob = new T.Mesh(new T.SphereGeometry(0.16, 10, 8), new T.MeshBasicMaterial({ color: 0xff5a5a })); bob.visible = false; scene.add(XC.live(bob));
  const lineG = new T.BufferGeometry(); lineG.setAttribute('position', new T.BufferAttribute(new Float32Array(6), 3)); const line = new T.Line(lineG, new T.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 })); line.frustumCulled = false; line.visible = false; scene.add(XC.live(line));
  const fs = { st: 'idle', t: 0, f: null, tx: 0, tz: 0, wait: 0 };
  let fNear = null;
  XC.ticks.push((dt, t) => {
    fNear = null; let bd = 1e9;
    for (const r of rings) { const d = dist(r.f.x, r.f.z), vis = d < 70; if (r.m.visible !== vis) r.m.visible = vis; if (!vis) continue; const k = (t * 0.5 + r.ph) % 1; r.m.scale.setScalar(1 + k * 3); r.m.material.opacity = 0.45 * (1 - k); if (d < r.f.r + 3 && d < bd && P.ground && !P.sit && Math.abs(P.y - (r.f.y || 0)) < 4) { bd = d; fNear = r.f; } }
    if (fs.st === 'idle') { bob.visible = line.visible = false; return; }
    const f = fs.f, d = dist(f.x, f.z);
    if (d > f.r + 6 || P.sit || !P.ground) { stopFish('Você guardou a vara.'); return; }
    const dx = fs.tx - P.x, dz = fs.tz - P.z; P.yaw = Math.atan2(dx, dz);
    const by = (f.y || 0) + 0.12 + (fs.st === 'bite' ? Math.sin(t * 30) * 0.06 - 0.08 : Math.sin(t * 2) * 0.02);
    bob.visible = line.visible = true; bob.position.set(fs.tx, by, fs.tz); const a = lineG.attributes.position.array; a[0] = P.x + Math.sin(P.yaw) * 0.5; a[1] = P.y + 1.3; a[2] = P.z + Math.cos(P.yaw) * 0.5; a[3] = fs.tx; a[4] = by; a[5] = fs.tz; lineG.attributes.position.needsUpdate = true;
    fs.t += dt;
    if (fs.st === 'wait' && fs.t > fs.wait) { fs.st = 'bite'; fs.t = 0; XC.snd.note(880, 'pluck', 0.4); XC.hintEl.textContent = 'E · puxar!'; }
    else if (fs.st === 'bite' && fs.t > 2.6) { fs.st = 'wait'; fs.t = 0; fs.wait = 2 + rnd() * 4; XC.toast('Escapou…', 'Sem problema. Sem pressa — o peixe volta.'); }
  });
  function stopFish(msg) { if (fs.st === 'idle') return; fs.st = 'idle'; if (msg) XC.toast(msg, ''); }
  function startFish(f) {
    const dx = f.x - P.x, dz = f.z - P.z, d = Math.hypot(dx, dz) || 1, k = Math.min(1, Math.max(2.2, d - f.r * 0.45) / d); fs.f = f; fs.tx = P.x + dx * k; fs.tz = P.z + dz * k; fs.st = 'wait'; fs.t = 0; fs.wait = 2.5 + rnd() * 4.5; XC.snd.note(330, 'flute', 0.3);
  }
  XC.addAct(() => fs.st === 'wait' ? 'pescando… (E guarda a vara)' : fs.st === 'bite' ? 'E · puxar!' : (fNear ? 'E · pescar' : ''), () => {
    if (fs.st === 'bite') { const id = pickFish(fs.f.biome); stopFish(); XC.discover(id); XC.snd.note(523, 'bell', 0.6); fs.st = 'wait'; fs.t = 0; fs.wait = 3 + rnd() * 4; return true; }
    if (fs.st === 'wait') { stopFish('Vara guardada.'); return true; }
    if (fNear) { startFish(fNear); return true; } return false;
  }, true);
  XC.onKey((k, e) => { if (fs.st !== 'idle' && ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) stopFish(); return false; });

  /* ───────── jardim vivo ───────── */
  const GC = { x: -17, z: 7 }, FL = XC.CAT.filter(c => c.cat === 'flower'), plots = [];
  (function () {
    const g = new T.Group(), soil = new T.MeshStandardMaterial({ color: '#6a4a3a', roughness: 1 }), wood = new T.MeshStandardMaterial({ color: '#b08a62', roughness: 1 });
    g.position.set(GC.x, 0, GC.z);
    const base = XC.shadowy(new T.Mesh(new T.BoxGeometry(8.4, 0.12, 6.4), new T.MeshStandardMaterial({ color: '#7a5a46', roughness: 1 }))); base.position.set(0, groundH(GC.x, GC.z) + 0.05, 0); g.add(base);
    for (let i = 0; i < 12; i++) { const px = -3 + (i % 4) * 2, pz = -2 + Math.floor(i / 4) * 2, gy = groundH(GC.x + px, GC.z + pz) + 0.12; const bed = XC.shadowy(new T.Mesh(new T.CylinderGeometry(0.85, 0.95, 0.22, 10), soil)); bed.position.set(px, gy + 0.05, pz); g.add(bed); const grp = new T.Group(); grp.position.set(px, gy + 0.15, pz); g.add(grp);
      const stem = new T.Mesh(new T.CylinderGeometry(0.03, 0.05, 1, 5), new T.MeshStandardMaterial({ color: '#4f9a62' })); stem.geometry.translate(0, 0.5, 0); grp.add(stem);
      const head = new T.Mesh(new T.SphereGeometry(0.3, 10, 6), new T.MeshStandardMaterial({ color: '#ffffff', roughness: 0.6 })); grp.add(head); const mid = new T.Mesh(new T.SphereGeometry(0.14, 8, 6), new T.MeshStandardMaterial({ color: '#ffd23f' })); grp.add(mid);
      const hg = XC.glow(0x9ad8ff, 1.6, 0); grp.add(hg); plots.push({ x: GC.x + px, z: GC.z + pz, grp, stem, head, mid, hg, last: '' }); XC.live(grp); g.remove(grp); grp.position.set(GC.x + px, gy + 0.15, GC.z + pz); scene.add(grp); }
    for (let i = 0; i < 12; i++) { const a = i / 12; const px = -4.2 + (i % 6) * 1.68, pz = i < 6 ? -3.2 : 3.2; const p = XC.shadowy(new T.Mesh(new T.BoxGeometry(0.1, 0.8, 0.1), wood)); p.position.set(px, groundH(GC.x + px, GC.z + pz) + 0.4, pz); g.add(p); }
    scene.add(g); plots.root = { visible: true };
  })();
  const dur = e => (e.grow || 1.2) * 150000;      /* 2,5 min × fator da flor */
  const plot = i => (sv.g[i] && sv.g[i].k) ? sv.g[i] : null;
  function prog(i) { const p = plot(i); if (!p) return 0; return clamp((Date.now() - p.t + (p.w || 0) * dur(XC.byId[p.k]) * 0.3) / dur(XC.byId[p.k]), 0, 1); }
  function paint(i) {
    const P0 = plots[i], p = plot(i), pr = prog(i), nt = nightNow(), key = p ? p.k + ':' + Math.round(pr * 20) + ':' + (nt > 0.5 ? 1 : 0) : '';
    if (key === P0.last) return; P0.last = key; const grp = P0.grp;
    if (!p) { P0.stem.visible = P0.head.visible = P0.mid.visible = false; P0.hg.material.opacity = 0; return; }
    const e = XC.byId[p.k], sp = e.s, h = 0.12 + pr * (sp.k === 'lav' ? 0.9 : 0.7); P0.stem.visible = true; P0.stem.scale.set(1, h, 1);
    const open = pr >= 1 && (!e.night || nt > 0.5); P0.head.visible = P0.mid.visible = pr > 0.55;
    const sc = pr < 1 ? 0.35 + (pr - 0.55) * 1.2 : (open ? 1 : 0.6); P0.head.scale.set(sc * (sp.k === 'bell' || sp.k === 'tulip' ? 0.8 : 1.2), sc * (sp.k === 'lav' ? 1.6 : sp.k === 'tulip' ? 1.1 : 0.45), sc * (sp.k === 'bell' || sp.k === 'tulip' ? 0.8 : 1.2));
    P0.head.position.y = h + 0.02; P0.mid.position.y = h + 0.12; P0.head.material.color.set(pr < 1 ? '#8bd08c' : sp.c); P0.mid.material.color.set(sp.mid); P0.mid.scale.setScalar(sc);
    P0.hg.position.y = h + 0.15; P0.hg.material.color.set(sp.glow || '#ffffff'); P0.hg.material.opacity = (sp.glow && open) ? 0.8 : 0;
  }
  let gNear = -1;
  XC.ticks.push((dt, t) => {
    gNear = -1; const d = dist(GC.x, GC.z); const vv = d < 100; if (plots.root.visible !== vv) { plots.root.visible = vv; for (const q of plots) q.grp.visible = vv; } if (!vv) return; for (let i = 0; i < 12; i++) paint(i);
    if (d < 7 && P.ground && !P.sit) { let bd = 1.7; for (let i = 0; i < 12; i++) { const q = Math.hypot(P.x - plots[i].x, P.z - plots[i].z); if (q < bd) { bd = q; gNear = i; } } }
  });
  /* escolha de semente */
  const gp = document.createElement('div'); gp.className = 'xpanel'; gp.style.cssText += ';left:50%;top:50%;transform:translate(-50%,-50%);width:min(380px,calc(100vw - 24px))'; gp.innerHTML = '<div class="wh"><b>Plantar</b><button class="chip" type="button" id="gpX">✕</button></div><p>Escolha uma semente. Plantas crescem com o tempo de verdade — até com o jogo fechado — e uma regada ajuda a crescer mais rápido.</p><div class="g" id="gpL"></div>'; document.body.appendChild(gp);
  let gpOpen = false, gpI = -1;
  const closeG = () => { if (!gpOpen) return; gpOpen = false; gp.style.display = 'none'; XC.modal = Math.max(0, XC.modal - 1); };
  const openG = i => { gpI = i; gpOpen = true; XC.modal++; gp.style.display = 'flex'; const L = $('gpL'); L.replaceChildren(); FL.forEach(e => { const b = document.createElement('button'); b.type = 'button'; b.className = 'wi'; const dot = document.createElement('i'); dot.style.background = e.s.c; const nm = document.createElement('span'); nm.textContent = e.name; const sm = document.createElement('small'); sm.textContent = (e.night ? 'só abre à noite · ' : '') + 'cresce em ~' + Math.round(dur(e) / 60000 * 10) / 10 + ' min' + (XC.count(e.id) ? ' · colhida ×' + XC.count(e.id) : ''); b.append(dot, nm, sm); b.addEventListener('click', () => { sv.g[gpI] = { k: e.id, t: Date.now(), w: 0 }; XC.save(); closeG(); XC.snd.note(392, 'harp', 0.5); XC.toast('Plantado: ' + e.name, 'Volte depois para regar e colher.'); }); L.appendChild(b); }); };
  $('gpX').addEventListener('click', closeG); gp.addEventListener('pointerdown', e => e.stopPropagation());
  XC.onKey((k, e) => { if (gpOpen) { if (k === 'escape') closeG(); e.preventDefault(); return true; } return false; });
  XC.addAct(() => {
    if (gNear < 0 || XC.modal) return ''; const p = plot(gNear); if (!p) return 'E · plantar uma semente'; const e = XC.byId[p.k], pr = prog(gNear);
    if (pr >= 1) return (e.night && nightNow() <= 0.5) ? e.name + ': só abre à noite' : 'E · colher ' + e.name; return 'E · regar ' + e.name + ' (' + Math.round(pr * 100) + '%)';
  }, () => {
    if (gNear < 0) return false; const p = plot(gNear); if (!p) { openG(gNear); return true; } const e = XC.byId[p.k], pr = prog(gNear);
    if (pr >= 1) { if (e.night && nightNow() <= 0.5) return true; XC.discover(e.id); sv.g[gNear] = null; XC.save(); XC.snd.note(587, 'harp', 0.6); return true; }
    if ((p.w || 0) >= 3) { XC.toast('Já está bem molhadinha', 'Agora é só esperar.'); return true; } p.w = (p.w || 0) + 1; XC.save(); XC.snd.note(440, 'ice', 0.4); XC.burst(plots[gNear].x, P.y + 0.6, plots[gNear].z, 0x9ad8ff); XC.toast('Regada!', 'Cresceu um pouquinho mais rápido.'); return true;
  });

  /* ───────── compositor de melodias (M) ───────── */
  const cp = document.createElement('div'); cp.className = 'xpanel'; cp.style.cssText += ';left:50%;top:50%;transform:translate(-50%,-50%);width:min(460px,calc(100vw - 24px))';
  cp.innerHTML = '<div class="wh"><b>Compositor</b><button class="chip" type="button" id="cpX">✕</button></div><p>Cada casinha é um tempo. Toque para trocar o som (só aparecem os sons que você já guardou). Ouça a melodia e solte lanternas ao som dela.</p><div class="row" id="cpS"></div><div class="row"><button class="chip" type="button" id="cpP">▶ Tocar</button><button class="chip" type="button" id="cpSl">Mais devagar</button><button class="chip" type="button" id="cpF">Mais rápido</button><button class="chip" type="button" id="cpC">Limpar</button></div><small id="cpI"></small>'; document.body.appendChild(cp);
  let cpOpen = false, playing = false, step = 0, nextT = 0, bpm = 96; if (!sv.mel || sv.mel.length !== 8) sv.mel = ['', '', '', '', '', '', '', ''];
  const heard = () => XC.SOUNDS.filter(s => XC.count(s[0]) > 0).map(s => s[0]);
  function drawC() {
    const S = $('cpS'); S.replaceChildren(); sv.mel.forEach((id, i) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (playing && step === i ? ' on' : ''); b.style.cssText = 'width:48px;height:58px;font-size:10px;padding:2px;flex-direction:column'; b.textContent = id ? XC.SOUNDS_BY[id].name.split(' ')[0] : '·'; b.addEventListener('click', () => { const l = [''].concat(heard()); sv.mel[i] = l[(l.indexOf(id) + 1) % l.length]; if (sv.mel[i]) { const n = XC.SOUNDS_BY[sv.mel[i]]; XC.snd.note(n.f, n.kind, 0.6); } XC.save(); drawC(); }); S.appendChild(b); });
    $('cpI').textContent = 'Sons guardados: ' + heard().length + '/' + XC.SOUNDS.length + ' · andamento ' + bpm + ' · caixas de música que você construir tocam esta melodia.'; $('cpP').textContent = playing ? '■ Parar' : '▶ Tocar';
  }
  XC.melody = { play() { return playMel(); }, get on() { return playing; } };
  const playOne = i => { const id = sv.mel[i]; if (id) { const n = XC.SOUNDS_BY[id]; XC.snd.note(n.f, n.kind, 0.7); } };
  function playMel() { if (!XC.snd.init()) return; playing = true; step = 0; nextT = 0; }
  XC.ticks.push((dt, t) => { if (!playing) return; nextT -= dt; if (nextT <= 0) { nextT = 60 / bpm / 1; playOne(step); if (cpOpen) drawC(); step++; if (step >= 8) { step = 0; if (!cpOpen && XC.melody.once) { playing = false; XC.melody.once = false; } } } });
  const closeC = () => { if (!cpOpen) return; cpOpen = false; cp.style.display = 'none'; XC.modal = Math.max(0, XC.modal - 1); playing = false; };
  const openC = () => { if (cpOpen || XC.modal) return; cpOpen = true; XC.modal++; cp.style.display = 'flex'; drawC(); };
  $('cpX').addEventListener('click', closeC); $('cpP').addEventListener('click', () => { if (playing) { playing = false; } else playMel(); drawC(); }); $('cpSl').addEventListener('click', () => { bpm = Math.max(48, bpm - 12); drawC(); }); $('cpF').addEventListener('click', () => { bpm = Math.min(180, bpm + 12); drawC(); }); $('cpC').addEventListener('click', () => { sv.mel = ['', '', '', '', '', '', '', '']; XC.save(); drawC(); }); cp.addEventListener('pointerdown', e => e.stopPropagation());
  XC.onKey((k, e) => { if (cpOpen) { if (k === 'escape' || k === 'm') closeC(); e.preventDefault(); return true; } if (k === 'm' && !e.repeat) { openC(); return true; } return false; });
  XC.tool('mel', 'Sons', 'm', () => cpOpen ? closeC() : openC(), 'Compositor de melodias (M)');

  /* ───────── lanternas de música (L) ───────── */
  const NL = 36, lans = [], lm = new T.MeshBasicMaterial({ color: 0xffd89a, transparent: true, opacity: 0.95, toneMapped: false, fog: false }), lgeo = new T.BoxGeometry(0.34, 0.44, 0.34);
  for (let i = 0; i < NL; i++) { const b = new T.Mesh(lgeo, lm.clone()), s = XC.glow(0xffb866, 3.2, 0.8); b.visible = s.visible = false; scene.add(XC.live(b)); scene.add(XC.live(s)); lans.push({ b, s, on: false, t: 0, x: 0, y: 0, z: 0, vx: 0, vz: 0, hue: 0.1, ph: 0 }); }
  const WISH = ['Que o dia de amanhã seja leve.', 'Obrigada por hoje.', 'Que alguém sorria por causa de você.', 'Um desejo pequeno, só seu.', 'Que a música não pare.'];
  let lanT = 0;
  function release() {
    if (P.sit || !P.ground || XC.modal) return; if (lanT > 0) return; lanT = 0.8; let o = lans.find(l => !l.on); if (!o) o = lans.reduce((a, b) => a.t > b.t ? a : b);
    o.on = true; o.t = 0; o.x = P.x + Math.sin(P.yaw) * 1.1; o.z = P.z + Math.cos(P.yaw) * 1.1; o.y = P.y + 1.5; o.vx = (rnd() - 0.3) * 0.5; o.vz = (rnd() - 0.5) * 0.5; o.hue = 0.04 + rnd() * 0.12; o.ph = rnd() * 6; o.b.material.color.setHSL(o.hue, 0.9, 0.7); o.s.material.color.setHSL(o.hue, 1, 0.65); o.b.visible = o.s.visible = true;
    sv.st.lan = (sv.st.lan | 0) + 1; XC.save(); XC.snd.note(698, 'box', 0.4); XC.toast('Lanterna solta · ' + sv.st.lan, WISH[(sv.st.lan - 1) % WISH.length]);
  }
  XC.ticks.push((dt, t) => {
    lanT = Math.max(0, lanT - dt);
    for (const o of lans) { if (!o.on) continue; o.t += dt; o.y += (0.7 + AU.level * 0.5) * dt; o.x += (o.vx + Math.sin(o.t * 0.3 + o.ph) * 0.2) * dt; o.z += (o.vz + Math.cos(o.t * 0.27 + o.ph) * 0.2) * dt; const k = 1 - smooth(70, 110, o.t); if (o.t > 110) { o.on = false; o.b.visible = o.s.visible = false; continue; }
      o.b.position.set(o.x, o.y, o.z); o.s.position.set(o.x, o.y, o.z); o.b.rotation.y = o.t * 0.4; const pu = 0.65 + 0.35 * Math.sin(o.t * 2 + o.ph) + AU.pulse * 0.6; o.s.material.opacity = clamp(pu, 0.3, 1.2) * k * (0.5 + nightNow() * 0.6); o.b.material.opacity = k; o.s.scale.setScalar(2.6 + AU.pulse * 1.4 + AU.level * 1.2); }
  });
  XC.onKey((k, e) => { if (k === 'l' && !e.repeat) { release(); return true; } return false; });
  XC.tool('lan', 'Lanterna', 'l', release, 'Soltar uma lanterna de música (L)');
});
