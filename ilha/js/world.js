/* Ilha de Repouso — um cantinho 3D para relaxar, feito do zero com three.js (r147).
   Ilha pequena, água em volta, ciclo de dia e noite lento e um santuário que dança com o som do Ressonância. */
(function () {
  'use strict';
  const T = THREE, $ = id => document.getElementById(id);
  const clamp = (x, a, b) => x < a ? a : x > b ? b : x, lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (a, b, x) => { x = clamp((x - a) / (b - a), 0, 1); return x * x * (3 - 2 * x); };
  const TAU = Math.PI * 2, Q = new URLSearchParams(location.search);
  if (T.ColorManagement) T.ColorManagement.legacyMode = false;
  document.body.classList.toggle('touch', matchMedia('(pointer:coarse)').matches || 'ontouchstart' in window);
  if (document.body.classList.contains('touch')) { document.querySelector('#hint .kb').style.display = 'none'; document.querySelector('#hint .tc').style.display = 'inline'; }
  const toParent = m => { try { parent.postMessage(m, '*'); } catch (e) {} };

  /* ───────── renderizador ───────── */
  let renderer;
  try {
    renderer = new T.WebGLRenderer({ canvas: $('c'), antialias: true, powerPreference: 'high-performance' });
  } catch (e) { $('msg').style.display = 'grid'; $('load').classList.add('off'); return; }
  renderer.outputEncoding = T.sRGBEncoding;
  renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
  const QUAL = [{ n: 'baixa', pr: 0.75, sh: false }, { n: 'média', pr: 1, sh: true }, { n: 'alta', pr: Math.min(devicePixelRatio || 1, 1.75), sh: true }];
  let qi = Q.has('q') ? +Q.get('q') : 1, qAuto = !Q.has('q');
  let prNow = QUAL[qi].pr;
  function applyQ() { renderer.setPixelRatio(prNow); renderer.shadowMap.enabled = QUAL[qi].sh; sun.castShadow = QUAL[qi].sh; scene.traverse(o => { if (o.material) o.material.needsUpdate = true; }); resize(); $('bQ').textContent = 'Qualidade: ' + (qAuto ? 'auto' : QUAL[qi].n); }

  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(52, 1, 0.3, 1200);
  scene.fog = new T.Fog(0xcfe6ff, 70, 330);

  /* ───────── terreno ───────── */
  const shoreR = th => 24 * (1 + 0.1 * Math.sin(3 * th + 1.2) + 0.06 * Math.sin(5 * th + 0.4) + 0.04 * Math.sin(8 * th));
  const PLAT = { x: 0, z: -12, r: 6.3, top: 0.62 }, JET = { x0: 23.5, x1: 33.2, hw: 1.15, y: 0.34 };
  function baseH(x, z) {
    const r = Math.hypot(x, z), th = Math.atan2(z, x), d = shoreR(th) - r;
    let h = Math.min(d * 0.3, 1.45);
    if (d > 0) h += (Math.sin(x * 0.21) * Math.cos(z * 0.17) * 0.3 + Math.sin(x * 0.09 + z * 0.11) * 0.38) * smooth(0, 9, d);
    const pd = Math.hypot(x - PLAT.x, z - PLAT.z);
    h = lerp(h, PLAT.top - 0.05, smooth(11, 6.4, pd));
    return Math.max(h, -2.6);
  }
  function groundH(x, z) {
    let h = baseH(x, z);
    if (Math.hypot(x - PLAT.x, z - PLAT.z) < PLAT.r) h = Math.max(h, PLAT.top);
    if (x > JET.x0 && x < JET.x1 && Math.abs(z) < JET.hw) h = Math.max(h, JET.y);
    return h;
  }
  function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const rnd = mulberry(20261010);

  const terr = (() => {
    const N = 170, S = 84, g = new T.PlaneGeometry(S, S, N, N); g.rotateX(-Math.PI / 2);
    const p = g.attributes.position, col = new Float32Array(p.count * 3), c = new T.Color();
    const sand = new T.Color('#f3e3b9'), wet = new T.Color('#d8c28f'), floor = new T.Color('#9fd3c7'), deep = new T.Color('#5aa7ad');
    const g1 = new T.Color('#86cf8d'), g2 = new T.Color('#b4e590'), g3 = new T.Color('#6dbb86');
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i), h = baseH(x, z); p.setY(i, h);
      const n = Math.sin(x * 0.7) * Math.sin(z * 0.6) * 0.5 + 0.5, n2 = Math.sin(x * 0.23 + 2) * Math.cos(z * 0.31) * 0.5 + 0.5;
      if (h < -0.6) c.copy(floor).lerp(deep, smooth(-0.6, -2.4, h));
      else if (h < 0.05) c.copy(floor).lerp(wet, smooth(-0.6, 0.05, h));
      else if (h < 0.5) c.copy(wet).lerp(sand, smooth(0.05, 0.3, h)).lerp(g1, smooth(0.32, 0.55, h) * 0.5);
      else { c.copy(g1).lerp(g2, n * 0.7).lerp(g3, n2 * 0.35); c.lerp(sand, smooth(0.62, 0.48, h) * 0.6); }
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    g.setAttribute('color', new T.BufferAttribute(col, 3)); g.computeVertexNormals();
    const m = new T.Mesh(g, new T.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 })); m.receiveShadow = true; scene.add(m); return m;
  })();

  /* ───────── luzes ───────── */
  const hemi = new T.HemisphereLight(0xbfdcff, 0xe8d8b0, 0.7); scene.add(hemi);
  const sun = new T.DirectionalLight(0xfff0d8, 2.2); sun.castShadow = true; sun.shadow.mapSize.set(1536, 1536);
  Object.assign(sun.shadow.camera, { left: -26, right: 26, top: 26, bottom: -26, near: 1, far: 220 }); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04;
  scene.add(sun, sun.target);
  const reactorLight = new T.PointLight(0xff9ad0, 0, 26, 1.6); reactorLight.position.set(PLAT.x, 3.2, PLAT.z); scene.add(reactorLight);
  const candle = new T.PointLight(0xffc27a, 0, 11, 1.8); scene.add(candle);

  /* ───────── céu ───────── */
  const U = {
    uTime: { value: 0 }, uTop: { value: new T.Color() }, uHor: { value: new T.Color() }, uSunDir: { value: new T.Vector3(0, 1, 0) }, uMoonDir: { value: new T.Vector3(0, -1, 0) },
    uSunCol: { value: new T.Color() }, uNight: { value: 0 }, uDeep: { value: new T.Color() }, uShallow: { value: new T.Color() }, uFog: { value: new T.Color() },
    uPl: { value: new T.Vector3() }
  };
  const TM = '\n#include <tonemapping_fragment>\n#include <encodings_fragment>\n';
  const sky = new T.Mesh(new T.SphereGeometry(600, 40, 24), new T.ShaderMaterial({
    side: T.BackSide, depthWrite: false, fog: false, uniforms: U,
    vertexShader: 'varying vec3 vDir;void main(){vDir=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);gl_Position.z=gl_Position.w*.99999;}',
    fragmentShader: `uniform vec3 uTop,uHor,uSunDir,uMoonDir,uSunCol;uniform float uNight,uTime;varying vec3 vDir;
      float hash(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
      void main(){vec3 d=normalize(vDir);float h=max(d.y,0.);vec3 col=mix(uHor,uTop,pow(h,.5));col=mix(col,uHor*.75,smoothstep(0.,-.25,d.y));
        float sd=max(dot(d,uSunDir),0.);col+=uSunCol*(pow(sd,6.)*.32+pow(sd,60.)*.35+smoothstep(.9994,.9998,sd)*3.)*(1.-uNight*.92);
        float md=max(dot(d,uMoonDir),0.);col+=vec3(.78,.85,1.)*smoothstep(.9988,.9993,md)*uNight*1.5+vec3(.35,.45,.9)*pow(md,36.)*.22*uNight;
        vec3 sp=floor(d*150.);float s=hash(sp);float st=step(.9972,s)*uNight*smoothstep(.02,.35,d.y);col+=vec3(1.,.96,.9)*st*(.55+.45*sin(uTime*2.2+s*60.));
        gl_FragColor=vec4(col,1.);${TM}}`
  }));
  sky.renderOrder = -10; scene.add(sky);

  /* nuvens: sprites macios */
  const cloudTex = (() => {
    const c = document.createElement('canvas'); c.width = 256; c.height = 128; const x = c.getContext('2d');
    for (let i = 0; i < 16; i++) { const px = 40 + Math.random() * 176, py = 54 + Math.random() * 24, r = 20 + Math.random() * 30, g = x.createRadialGradient(px, py, 0, px, py, r); g.addColorStop(0, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.beginPath(); x.arc(px, py, r, 0, TAU); x.fill(); }
    const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; return t;
  })();
  const clouds = [];
  for (let i = 0; i < 18; i++) {
    const s = new T.Sprite(new T.SpriteMaterial({ map: cloudTex, transparent: true, depthWrite: false, fog: false, opacity: 0.85 }));
    const a = rnd() * TAU, r = 130 + rnd() * 330, w = 120 + rnd() * 160; s.scale.set(w, w * 0.4, 1); s.position.set(Math.cos(a) * r, 45 + rnd() * 55, Math.sin(a) * r);
    s.userData = { a, r, sp: (0.004 + rnd() * 0.006) }; clouds.push(s); scene.add(s);
  }

  /* ───────── água ───────── */
  const water = new T.Mesh(new T.PlaneGeometry(1600, 1600, 1, 1).rotateX(-Math.PI / 2), new T.ShaderMaterial({
    transparent: true, depthWrite: false, uniforms: Object.assign({ uFogN: { value: 70 }, uFogF: { value: 330 } }, U),
    vertexShader: 'varying vec3 vW;void main(){vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}',
    fragmentShader: `uniform float uTime,uNight,uFogN,uFogF;uniform vec3 uSunDir,uMoonDir,uSunCol,uTop,uHor,uDeep,uShallow,uFog,uPl;varying vec3 vW;
      float shoreR(float th){return 24.*(1.+.1*sin(3.*th+1.2)+.06*sin(5.*th+.4)+.04*sin(8.*th));}
      float hs(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hs(i),hs(i+vec2(1,0)),f.x),mix(hs(i+vec2(0,1)),hs(i+vec2(1,1)),f.x),f.y);}
      void main(){vec2 xz=vW.xz;float r=length(xz),th=atan(xz.y,xz.x),dist=r-shoreR(th);
        vec2 g=vec2(0.);
        g+=vec2(.8,.6)*cos(dot(vec2(.8,.6),xz)*.55+uTime*.8)*.55*.05;
        g+=vec2(-.6,.8)*cos(dot(vec2(-.6,.8),xz)*.9+uTime*1.1)*.9*.035;
        g+=vec2(.2,-.97)*cos(dot(vec2(.2,-.97),xz)*1.7+uTime*1.5)*1.7*.02;
        g+=(vec2(vn(xz*.9+uTime*.3),vn(xz*.9-uTime*.25+7.))-.5)*.08;
        vec3 N=normalize(vec3(-g.x,1.,-g.y));vec3 V=normalize(cameraPosition-vW);
        float fr=pow(1.-max(dot(N,V),0.),3.)*.85+.05;vec3 R=reflect(-V,N);
        vec3 refl=mix(uHor,uTop,pow(max(R.y,0.),.5));
        float sd=smoothstep(0.,10.,dist);vec3 base=mix(uShallow,uDeep,sd);
        vec3 col=mix(base,refl,fr);
        float gl=pow(max(dot(R,uSunDir),0.),260.)*3.+pow(max(dot(R,uSunDir),0.),18.)*.12;col+=uSunCol*gl*(1.-uNight);
        float gm=pow(max(dot(R,uMoonDir),0.),300.)*2.;col+=vec3(.75,.85,1.)*gm*uNight;
        float n=vn(xz*1.3+uTime*.2);
        float band=smoothstep(.45,0.,abs(dist-(.6+.5*sin(uTime*.55+th*7.))));
        float foam=max(band*.75*(.6+n*.6),smoothstep(1.1,0.,dist)*.4*(.5+n));
        float dp=length(xz-uPl.xz);foam+=smoothstep(2.4,0.,dp)*(.5+.5*sin(dp*8.-uTime*4.))*uPl.y*.6;
        foam*=smoothstep(-.3,.15,dist);
        col=mix(col,vec3(1.)*(.85-uNight*.45),clamp(foam,0.,1.));
        float al=mix(.5,.97,sd);al=max(al,fr*.6);al=max(al,clamp(foam,0.,1.));al*=smoothstep(-.45,-.1,dist);
        col=mix(col,uFog,smoothstep(uFogN,uFogF,length(cameraPosition-vW)));
        gl_FragColor=vec4(col,al);${TM}}`
  }));
  water.position.y = 0; water.renderOrder = 2; scene.add(water);

  /* ───────── material helpers ───────── */
  const std = (c, r = 0.9, extra) => new T.MeshStandardMaterial(Object.assign({ color: c, roughness: r, metalness: 0 }, extra));
  const shadowy = (m, cast = true, recv = true) => { m.castShadow = cast; m.receiveShadow = recv; return m; };
  const colliders = [];

  /* ───────── glow sprite (reuso) ───────── */
  const glowTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.25, 'rgba(255,255,255,.45)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    return new T.CanvasTexture(c);
  })();
  const glow = (color, size, op = 1) => { const s = new T.Sprite(new T.SpriteMaterial({ map: glowTex, color, transparent: true, depthWrite: false, blending: T.AdditiveBlending, opacity: op, fog: false })); s.scale.set(size, size, 1); return s; };

  /* ───────── árvores, pedras, lanternas ───────── */
  const lamps = [];  /* {mat, spr, base} */
  const pathX = z => Math.sin(z * 0.28) * 1.3;
  function inCorridor(x, z, w) { return z > -7 && z < 30 && Math.abs(x - pathX(z)) < w; }
  const leafCols = ['#7ed39a', '#9be08a', '#6fc8a0', '#f6b6cf', '#a8e3b0'];
  function makeTree(x, z, s, kind) {
    const g = new T.Group(), y = groundH(x, z);
    const trunk = shadowy(new T.Mesh(new T.CylinderGeometry(0.16 * s, 0.26 * s, 2.2 * s, 7), std('#a07a62', 1))); trunk.position.y = 1.1 * s; trunk.rotation.z = (rnd() - 0.5) * 0.12; g.add(trunk);
    const lc = kind === 'blossom' ? '#f7b9d0' : leafCols[(rnd() * 3) | 0];
    for (let i = 0; i < 4; i++) {
      const r = (1.5 - i * 0.22) * s, m = shadowy(new T.Mesh(new T.IcosahedronGeometry(r, 1), std(lc, 0.95)));
      m.position.set((rnd() - 0.5) * 0.7 * s, (2.5 + i * 0.62) * s, (rnd() - 0.5) * 0.7 * s); m.scale.y = 0.82; g.add(m);
    }
    g.position.set(x, y, z); g.rotation.y = rnd() * TAU; scene.add(g); colliders.push({ x, z, r: 0.75 * s });
    return g;
  }
  const trees = [];
  for (let k = 0, tries = 0; k < 17 && tries < 600; tries++) {
    const a = rnd() * TAU, d = 3 + rnd() * 21, x = Math.cos(a) * d, z = Math.sin(a) * d;
    if (baseH(x, z) < 0.75 || Math.hypot(x, z) > shoreR(Math.atan2(z, x)) - 3.5) continue;
    if (inCorridor(x, z, 5.2) || Math.hypot(x - PLAT.x, z - PLAT.z) < 9.5) continue;
    if (trees.some(t => Math.hypot(t.x - x, t.z - z) < 4.6)) continue;
    const s = 0.8 + rnd() * 0.6; trees.push({ x, z, s }); makeTree(x, z, s, rnd() < 0.3 ? 'blossom' : 'normal'); k++;
  }
  /* árvore-guardiã perto da praia de chegada */
  makeTree(-8.5, 9, 1.55, 'blossom');
  function rock(x, z, s) {
    const m = shadowy(new T.Mesh(new T.DodecahedronGeometry(0.7 * s, 0), std(rnd() < 0.5 ? '#c6c0d6' : '#b8c6d0', 1)));
    m.position.set(x, groundH(x, z) + 0.15 * s, z); m.scale.set(1.2, 0.7 + rnd() * 0.3, 1); m.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3); scene.add(m); colliders.push({ x, z, r: 0.75 * s });
  }
  for (let k = 0, tries = 0; k < 16 && tries < 400; tries++) {
    const a = rnd() * TAU, d = 8 + rnd() * 19, x = Math.cos(a) * d, z = Math.sin(a) * d, h = baseH(x, z);
    if (h < -0.2 || h > 1.0 || inCorridor(x, z, 3) || Math.hypot(x - PLAT.x, z - PLAT.z) < 7.5) continue; rock(x, z, 0.5 + rnd() * 0.9); k++;
  }
  /* arbustos */
  for (let k = 0, tries = 0; k < 16 && tries < 400; tries++) {
    const a = rnd() * TAU, d = 4 + rnd() * 20, x = Math.cos(a) * d, z = Math.sin(a) * d;
    if (baseH(x, z) < 0.7 || inCorridor(x, z, 2.2) || Math.hypot(x - PLAT.x, z - PLAT.z) < 8) continue;
    const b = shadowy(new T.Mesh(new T.IcosahedronGeometry(0.6 + rnd() * 0.4, 1), std(leafCols[(rnd() * 5) | 0], 1))); b.position.set(x, groundH(x, z) + 0.3, z); b.scale.y = 0.75; scene.add(b); k++;
  }
  /* pedras de passagem */
  for (let z = 17; z > -5.5; z -= 1.35) {
    const x = pathX(z) + (rnd() - 0.5) * 0.4, m = shadowy(new T.Mesh(new T.CylinderGeometry(0.5 + rnd() * 0.12, 0.56, 0.14, 9), std('#e7dfd0', 1)), false, true);
    m.position.set(x, groundH(x, z) + 0.05, z); m.rotation.y = rnd() * 3; scene.add(m);
  }
  /* lanternas de papel */
  function lantern(x, z, h = 2.6) {
    const y = groundH(x, z), g = new T.Group(); g.position.set(x, y, z);
    const pole = shadowy(new T.Mesh(new T.CylinderGeometry(0.06, 0.08, h, 6), std('#8a6a58', 1))); pole.position.y = h / 2; g.add(pole);
    const mat = new T.MeshStandardMaterial({ color: '#ffe2b0', emissive: new T.Color('#ffb15a'), emissiveIntensity: 0.15, roughness: 0.6 });
    const l = new T.Mesh(new T.SphereGeometry(0.34, 14, 10), mat); l.scale.y = 1.2; l.position.y = h + 0.3; g.add(l);
    const cap = new T.Mesh(new T.ConeGeometry(0.28, 0.2, 10), std('#7a5a50', 1)); cap.position.y = h + 0.78; g.add(cap);
    const spr = glow(0xffb15a, 2.4, 0); spr.position.y = h + 0.3; g.add(spr);
    scene.add(g); lamps.push({ mat, spr }); colliders.push({ x, z, r: 0.28 });
  }
  [[2.6, 14], [-2.6, 9], [2.8, 4], [-2.8, -0.5], [2.6, -4.2]].forEach(([dx, z]) => lantern(pathX(z) + dx, z));
  lantern(JET.x1 - 0.5, 1.0, 2.2);
  /* banco virado para o santuário */
  const BENCH = { x: 0.2, z: -3.3 }; BENCH.y = groundH(BENCH.x, BENCH.z);
  (() => {
    const g = new T.Group(), wood = std('#c8996f', 0.9);
    const seat = shadowy(new T.Mesh(new T.BoxGeometry(2.2, 0.14, 0.7), wood)); seat.position.y = 0.55; g.add(seat);
    const back = shadowy(new T.Mesh(new T.BoxGeometry(2.2, 0.55, 0.1), wood)); back.position.set(0, 0.95, 0.32); back.rotation.x = -0.12; g.add(back);
    [-0.9, 0.9].forEach(px => { const l = shadowy(new T.Mesh(new T.BoxGeometry(0.12, 0.55, 0.6), std('#8a6a58', 1))); l.position.set(px, 0.27, 0); g.add(l); });
    g.position.set(BENCH.x, BENCH.y, BENCH.z); g.rotation.y = Math.PI; scene.add(g);
  })();

  /* ───────── cais e barquinho ───────── */
  const boat = (() => {
    const g = new T.Group(), wood = std('#d9a77a', 0.9);
    const hull = shadowy(new T.Mesh(new T.SphereGeometry(1, 20, 10, 0, TAU, Math.PI / 2, Math.PI / 2), new T.MeshStandardMaterial({ color: '#e8b98c', roughness: 0.85, side: T.DoubleSide })));
    hull.scale.set(1.9, 0.62, 0.85); hull.rotation.x = Math.PI; hull.position.y = 0.3; g.add(hull);
    const rim = new T.Mesh(new T.TorusGeometry(1, 0.05, 6, 28), wood); rim.rotation.x = Math.PI / 2; rim.scale.set(1.9, 0.85, 1); rim.position.y = 0.3; g.add(rim);
    const seat = new T.Mesh(new T.BoxGeometry(0.5, 0.07, 1.3), wood); seat.position.y = 0.2; g.add(seat);
    g.position.set(29.8, 0, 3.3); g.rotation.y = 0.35; scene.add(g); return g;
  })();
  (() => {
    const wood = std('#c9a37a', 1), dark = std('#8a6a58', 1);
    for (let x = JET.x0; x < JET.x1; x += 0.62) { const p = shadowy(new T.Mesh(new T.BoxGeometry(0.56, 0.1, JET.hw * 2), wood)); p.position.set(x + 0.28, JET.y - 0.05, 0); scene.add(p); }
    for (let x = JET.x0 + 1; x < JET.x1; x += 3.2) [-1, 1].forEach(s => { const p = shadowy(new T.Mesh(new T.CylinderGeometry(0.1, 0.12, 1.6, 6), dark)); p.position.set(x, JET.y - 0.6, s * (JET.hw - 0.1)); scene.add(p); });
  })();

  /* ───────── capim, flores e luzinhas ───────── */
  const windU = { value: 0 };
  (() => {
    const geo = new T.ConeGeometry(0.07, 0.62, 3, 3); geo.translate(0, 0.31, 0);
    const mat = new T.MeshLambertMaterial({ color: 0xffffff });
    mat.onBeforeCompile = sh => {
      sh.uniforms.uWind = windU;
      sh.vertexShader = 'uniform float uWind;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
        vec3 ip=vec3(instanceMatrix[3][0],0.,instanceMatrix[3][2]);float k=pow(position.y/.62,1.6);
        transformed.x+=sin(uWind*1.6+ip.x*.45+ip.z*.3)*.2*k;transformed.z+=cos(uWind*1.3+ip.z*.5)*.14*k;`);
    };
    const MAXN = 7000, im = new T.InstancedMesh(geo, mat, MAXN), m4 = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), c = new T.Color(); let n = 0;
    const cA = new T.Color('#79c98b'), cB = new T.Color('#b3e58f'), cC = new T.Color('#5db07f');
    for (let t = 0; t < 30000 && n < MAXN; t++) {
      const a = rnd() * TAU, d = Math.sqrt(rnd()) * 27, x = Math.cos(a) * d, z = Math.sin(a) * d, h = baseH(x, z);
      if (h < 0.55 || inCorridor(x, z, 0.9) || Math.hypot(x - PLAT.x, z - PLAT.z) < PLAT.r + 1.4 || (z < -2.5 && z > -9 && Math.abs(x) < 1.8)) continue;
      e.set((rnd() - 0.5) * 0.3, rnd() * TAU, (rnd() - 0.5) * 0.3); q.setFromEuler(e);
      const s = 0.7 + rnd() * 0.7; m4.compose(new T.Vector3(x, h - 0.02, z), q, new T.Vector3(s, s * (0.45 + rnd() * 0.4), s)); im.setMatrixAt(n, m4);
      c.copy(cA).lerp(cB, rnd()).lerp(cC, rnd() * 0.4); im.setColorAt(n, c); n++;
    }
    im.count = n; im.receiveShadow = true; scene.add(im);
    /* flores */
    const fg = new T.IcosahedronGeometry(0.11, 0), fm = new T.MeshStandardMaterial({ roughness: 0.7, emissive: 0x000000 }), FN = 340, fi = new T.InstancedMesh(fg, fm, FN);
    const fc = ['#ffffff', '#ffd1e3', '#ffe28a', '#c7b8ff', '#ffb4a8']; let k = 0;
    for (let t = 0; t < 4000 && k < FN; t++) {
      const a = rnd() * TAU, d = Math.sqrt(rnd()) * 25, x = Math.cos(a) * d, z = Math.sin(a) * d, h = baseH(x, z);
      if (h < 0.6 || inCorridor(x, z, 0.8) || Math.hypot(x - PLAT.x, z - PLAT.z) < PLAT.r + 0.5) continue;
      m4.compose(new T.Vector3(x, h + 0.22 + rnd() * 0.12, z), q.identity(), new T.Vector3(1, 1, 1).multiplyScalar(0.8 + rnd() * 0.8)); fi.setMatrixAt(k, m4); c.set(fc[(rnd() * 5) | 0]); fi.setColorAt(k, c); k++;
    }
    fi.count = k; scene.add(fi);
  })();

  /* vaga-lumes (noite) e borboletas (dia) */
  const flies = (() => {
    const N = 90, g = new T.BufferGeometry(), pos = new Float32Array(N * 3), seed = [];
    for (let i = 0; i < N; i++) { const a = rnd() * TAU, d = Math.sqrt(rnd()) * 24; seed.push([a, d, 0.8 + rnd() * 3, rnd() * 9, 0.3 + rnd() * 0.7]); }
    g.setAttribute('position', new T.BufferAttribute(pos, 3));
    const m = new T.PointsMaterial({ map: glowTex, color: 0xd8ff9a, size: 0.55, transparent: true, depthWrite: false, blending: T.AdditiveBlending, opacity: 0 });
    const p = new T.Points(g, m); p.frustumCulled = false; scene.add(p); return { p, seed, pos, g, m };
  })();
  const butter = [];
  for (let i = 0; i < 9; i++) {
    const g = new T.Group(), mat = new T.MeshBasicMaterial({ color: ['#ffd1e3', '#ffe28a', '#c7e8ff'][i % 3], side: T.DoubleSide, transparent: true, opacity: 0.95 });
    const w1 = new T.Mesh(new T.CircleGeometry(0.16, 8), mat), w2 = new T.Mesh(new T.CircleGeometry(0.16, 8), mat); w1.position.x = -0.15; w2.position.x = 0.15; g.add(w1, w2);
    g.userData = { a: rnd() * TAU, d: 4 + rnd() * 16, sp: 0.15 + rnd() * 0.2, h: 1.1 + rnd() * 1.3, w1, w2, ph: rnd() * 9 }; butter.push(g); scene.add(g);
  }

  /* ───────── santuário do som ───────── */
  const R = (() => {
    const g = new T.Group(); g.position.set(PLAT.x, 0, PLAT.z); scene.add(g);
    const stone = std('#d6d0e2', 0.85), base = shadowy(new T.Mesh(new T.CylinderGeometry(PLAT.r, PLAT.r + 0.35, PLAT.top + 0.5, 56), stone)); base.position.y = (PLAT.top - 0.5) / 2 + 0.0; base.position.y = (PLAT.top - 0.5) / 2; g.add(base);
    const ring = new T.Mesh(new T.RingGeometry(3.9, 4.15, 64), new T.MeshBasicMaterial({ color: 0xff9ad0, transparent: true, opacity: 0.7, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, toneMapped: false })); ring.rotation.x = -Math.PI / 2; ring.position.y = PLAT.top + 0.02; g.add(ring);
    const ring2 = new T.Mesh(new T.RingGeometry(1.6, 1.72, 64), ring.material.clone()); ring2.rotation.x = -Math.PI / 2; ring2.position.y = PLAT.top + 0.02; g.add(ring2);
    const pulses = []; for (let i = 0; i < 3; i++) { const p = new T.Mesh(new T.RingGeometry(0.96, 1, 64), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, toneMapped: false })); p.rotation.x = -Math.PI / 2; p.position.y = PLAT.top + 0.03; g.add(p); pulses.push({ m: p, t: 1 }); }
    const NC = 36, crystals = [], cg = new T.OctahedronGeometry(0.34, 0);
    for (let i = 0; i < NC; i++) {
      const a = i / NC * TAU, mat = new T.MeshStandardMaterial({ color: '#ffffff', emissive: new T.Color().setHSL(i / NC, 0.8, 0.5), emissiveIntensity: 0.4, roughness: 0.25, metalness: 0.1, transparent: true, opacity: 0.92 });
      const c = new T.Mesh(cg, mat); c.position.set(Math.cos(a) * 4.8, PLAT.top + 1.2, Math.sin(a) * 4.8); c.scale.set(1, 2.4, 1); g.add(c);
      const st = shadowy(new T.Mesh(new T.CylinderGeometry(0.34, 0.42, 0.34, 8), stone)); st.position.set(c.position.x, PLAT.top + 0.15, c.position.z); g.add(st);
      crystals.push({ m: c, mat, a, h: 1.2 });
    }
    const orbMat = new T.MeshStandardMaterial({ color: '#fff4fb', emissive: new T.Color('#ff9ad0'), emissiveIntensity: 1.2, roughness: 0.2 });
    const orb = new T.Mesh(new T.IcosahedronGeometry(0.85, 2), orbMat); orb.position.y = PLAT.top + 2.5; g.add(orb);
    const halo = glow(0xff9ad0, 7, 0.8); halo.position.copy(orb.position); g.add(halo);
    const rings = []; for (let i = 0; i < 3; i++) { const r = new T.Mesh(new T.TorusGeometry(1.5 + i * 0.5, 0.025, 8, 80), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false })); r.position.copy(orb.position); g.add(r); rings.push(r); }
    const bc = document.createElement('canvas'); bc.width = 4; bc.height = 128; const bx = bc.getContext('2d'), bg = bx.createLinearGradient(0, 0, 0, 128); bg.addColorStop(0, 'rgba(255,255,255,0)'); bg.addColorStop(0.7, 'rgba(255,255,255,.5)'); bg.addColorStop(1, 'rgba(255,255,255,1)'); bx.fillStyle = bg; bx.fillRect(0, 0, 4, 128);
    const beam = new T.Mesh(new T.CylinderGeometry(0.5, 1.1, 46, 24, 1, true), new T.MeshBasicMaterial({ map: new T.CanvasTexture(bc), color: 0xff9ad0, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, toneMapped: false, fog: false }));
    beam.position.y = PLAT.top + 2.5 + 23; g.add(beam);
    const MN = 140, mg = new T.BufferGeometry(), mp = new Float32Array(MN * 3), ms = []; for (let i = 0; i < MN; i++) ms.push([rnd() * TAU, 0.5 + rnd() * 4.6, rnd() * 6, 0.4 + rnd() * 1.2]);
    mg.setAttribute('position', new T.BufferAttribute(mp, 3));
    const motes = new T.Points(mg, new T.PointsMaterial({ map: glowTex, color: 0xffd3ee, size: 0.5, transparent: true, depthWrite: false, blending: T.AdditiveBlending, opacity: 0.9 })); motes.frustumCulled = false; g.add(motes);
    colliders.push({ x: PLAT.x, z: PLAT.z, r: 1.15 });
    return { g, crystals, orb, orbMat, halo, rings, beam, pulses, ring, ring2, motes, mp, ms, MN, mg };
  })();

  /* dados de áudio vindos do Ressonância */
  const AU = { b: new Float32Array(64), bass: 0, mid: 0, treb: 0, level: 0, pulse: 0, beatN: 0, seen: 0, has: false, last: -9 };
  addEventListener('message', e => {
    const d = e.data; if (!d || typeof d !== 'object' || d.rz !== 'audio') return;
    if (e.source !== parent) return;
    if (d.b) for (let i = 0; i < 64 && i < d.b.length; i++) AU.b[i] = d.b[i];
    AU.bassT = d.bass || 0; AU.midT = d.mid || 0; AU.trebT = d.treb || 0; AU.levelT = d.level || 0; AU.pulse = Math.max(AU.pulse, d.pulse || 0); AU.beatN = d.beatN | 0; AU.beatStr = d.beatStr || 0.6; AU.has = true; AU.last = clock.elapsedTime || 0;
  });

  /* ───────── personagem fofinho ───────── */
  const hero = (() => {
    const g = new T.Group(), skin = std('#ffe6d6', 0.7), robe = std('#9fe0e6', 0.8), hairM = std('#c9b6ff', 0.8), white = std('#ffffff', 0.6);
    const body = shadowy(new T.Mesh(new T.LatheGeometry([[0.0, 0], [0.42, 0.02], [0.46, 0.18], [0.36, 0.55], [0.22, 0.78], [0.0, 0.8]].map(p => new T.Vector2(p[0], p[1])), 20), robe)); g.add(body);
    const belt = new T.Mesh(new T.TorusGeometry(0.33, 0.045, 8, 24), std('#ffd98a', 0.6)); belt.rotation.x = Math.PI / 2; belt.position.y = 0.46; g.add(belt);
    const head = new T.Group(); head.position.y = 1.2; g.add(head);
    const skull = shadowy(new T.Mesh(new T.SphereGeometry(0.52, 28, 20), skin)); skull.scale.set(1, 0.94, 0.98); head.add(skull);
    const hair = shadowy(new T.Mesh(new T.SphereGeometry(0.56, 28, 18, 0, TAU, 0, Math.PI * 0.55), hairM)); hair.rotation.x = -0.22; hair.position.y = 0.04; head.add(hair);
    const fringe = shadowy(new T.Mesh(new T.SphereGeometry(0.545, 20, 12, -0.9, 1.8, 0.2, 0.9), hairM)); fringe.rotation.x = 0.7; fringe.position.set(0, 0.02, 0.04); head.add(fringe);
    const back = shadowy(new T.Mesh(new T.SphereGeometry(0.4, 16, 12), hairM)); back.position.set(0, -0.12, -0.28); back.scale.set(1.05, 1.1, 0.9); head.add(back);
    const eyeG = new T.SphereGeometry(0.075, 12, 10), eyeM = new T.MeshBasicMaterial({ color: 0x2a2236 }), eyes = [];
    [-1, 1].forEach(s => { const e = new T.Mesh(eyeG, eyeM); e.scale.set(0.9, 1.35, 0.5); e.position.set(s * 0.19, -0.04, 0.485); head.add(e); eyes.push(e); const hl = new T.Mesh(new T.SphereGeometry(0.025, 8, 6), new T.MeshBasicMaterial({ color: 0xffffff })); hl.position.set(s * 0.19 + 0.02, 0.0, 0.525); head.add(hl); const bl = new T.Mesh(new T.CircleGeometry(0.075, 14), new T.MeshBasicMaterial({ color: 0xffa8bf, transparent: true, opacity: 0.55 })); bl.position.set(s * 0.33, -0.16, 0.43); bl.lookAt(s * 0.9, -0.16, 1.2); head.add(bl); });
    const mouth = new T.Mesh(new T.TorusGeometry(0.045, 0.011, 6, 12, Math.PI), new T.MeshBasicMaterial({ color: 0x8a4a5a })); mouth.rotation.z = Math.PI; mouth.position.set(0, -0.17, 0.508); head.add(mouth);
    const star = shadowy(new T.Mesh(new T.OctahedronGeometry(0.1, 0), std('#ffe28a', 0.4, { emissive: new T.Color('#ffd25a'), emissiveIntensity: 0.6 }))); star.position.set(0.3, 0.38, 0.28); head.add(star);
    const ahoge = new T.Mesh(new T.TorusGeometry(0.09, 0.022, 6, 12, Math.PI * 1.5), hairM); ahoge.position.set(0, 0.57, 0.02); head.add(ahoge);
    const armG = new T.SphereGeometry(0.11, 10, 8), arms = [-1, 1].map(s => { const a = shadowy(new T.Mesh(armG, skin)); a.position.set(s * 0.43, 0.55, 0); a.scale.set(1, 1.3, 1); g.add(a); return a; });
    const footG = new T.SphereGeometry(0.13, 10, 8), feet = [-1, 1].map(s => { const f = shadowy(new T.Mesh(footG, white)); f.position.set(s * 0.2, 0.08, 0.05); f.scale.set(1, 0.7, 1.35); g.add(f); return f; });
    const capeG = new T.PlaneGeometry(0.7, 0.8, 4, 6), cape = shadowy(new T.Mesh(capeG, new T.MeshStandardMaterial({ color: '#fdf0ff', roughness: 0.8, side: T.DoubleSide }))); cape.position.set(0, 0.62, -0.3); g.add(cape);
    const capeBase = capeG.attributes.position.array.slice();
    return { g, head, eyes, arms, feet, body, cape, capeG, capeBase, mouth };
  })();
  scene.add(hero.g);
  const P = { x: pathX(18) * 1, z: 18, y: 0, vy: 0, yaw: Math.PI, vx: 0, vz: 0, phase: 0, sit: false, sitT: 0, ground: true, wade: 0, blink: 0, nextBlink: 2, squash: 0 };
  P.y = groundH(P.x, P.z);

  /* ───────── câmera e entrada ───────── */
  const CAM = { yaw: 0, pitch: 0.36, dist: 9.5, tx: P.x, ty: P.y + 1.4, tz: P.z, auto: 0 };
  const keys = {}, joy = { x: 0, y: 0, on: false, id: -1, cx: 0, cy: 0 }; let drag = null, hintT = 0;
  addEventListener('keydown', e => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key.toLowerCase(); keys[k] = true;
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
    if (k === ' ' && !e.repeat) jump(); if (k === 'e' && !e.repeat) sitToggle();
    if (k === 'escape') toParent({ nb: 'exit' });
    hideHint();
  });
  addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });
  addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
  const cv = $('c');
  cv.addEventListener('pointerdown', e => {
    cv.focus({ preventScroll: true }); hideHint();
    if (e.pointerType === 'touch' && e.clientX < innerWidth * 0.45) { joy.on = true; joy.id = e.pointerId; joy.cx = e.clientX; joy.cy = e.clientY; const j = $('joy'); j.style.left = (e.clientX - 58) + 'px'; j.style.bottom = (innerHeight - e.clientY - 58) + 'px'; cv.setPointerCapture(e.pointerId); return; }
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY }; cv.setPointerCapture(e.pointerId);
  });
  cv.addEventListener('pointermove', e => {
    if (joy.on && e.pointerId === joy.id) { let dx = e.clientX - joy.cx, dy = e.clientY - joy.cy; const m = Math.hypot(dx, dy), mx = 48; if (m > mx) { dx *= mx / m; dy *= mx / m; } joy.x = dx / mx; joy.y = dy / mx; $('joy').firstElementChild.style.transform = `translate(${dx}px,${dy}px)`; return; }
    if (drag && e.pointerId === drag.id) { CAM.yaw -= (e.clientX - drag.x) * 0.0055; CAM.pitch = clamp(CAM.pitch + (e.clientY - drag.y) * 0.0045, -0.08, 1.25); drag.x = e.clientX; drag.y = e.clientY; CAM.auto = 0; }
  });
  const pend = e => { if (joy.on && e.pointerId === joy.id) { joy.on = false; joy.x = joy.y = 0; $('joy').firstElementChild.style.transform = ''; } if (drag && e.pointerId === drag.id) drag = null; };
  cv.addEventListener('pointerup', pend); cv.addEventListener('pointercancel', pend);
  cv.addEventListener('wheel', e => { CAM.dist = clamp(CAM.dist * (1 + e.deltaY * 0.001), 4.5, 18); e.preventDefault(); }, { passive: false });
  $('aJump').addEventListener('click', jump); $('aSit').addEventListener('click', sitToggle); $('bBack').addEventListener('click', () => toParent({ nb: 'exit' }));
  $('bQ').addEventListener('click', () => { if (qAuto) { qAuto = false; qi = 0; } else if (qi < 2) qi++; else { qAuto = true; qi = 1; } prNow = QUAL[qi].pr; applyQ(); });
  function hideHint() { if (!hintT) hintT = clock.elapsedTime + 4; }
  function jump() { if (P.sit) { P.sit = false; return; } if (P.ground) { P.vy = 6.4; P.ground = false; P.squash = -0.25; } }
  function sitToggle() {
    if (P.sit) { P.sit = false; return; }
    if (Math.hypot(P.x - BENCH.x, P.z - BENCH.z) < 3.2) { P.x = BENCH.x; P.z = BENCH.z + 0.05; P.yaw = 0; } else P.yaw = P.yaw;
    P.sit = true; P.vx = P.vz = 0; P.nearBench = Math.hypot(P.x - BENCH.x, P.z - BENCH.z) < 0.6;
  }

  /* ───────── dia e noite ───────── */
  let phase = Q.has('p') ? +Q.get('p') : 0.66; const CYCLE = 900; let fast = false;
  const C = n => new T.Color(n);
  const K = {
    nTop: C('#0a0f2c'), nHor: C('#25306b'), dTop: C('#5aa9f0'), dHor: C('#d4ecff'), tTop: C('#6a5fb0'), tHor: C('#ffb08a'),
    nDeep: C('#0e2a4a'), nSh: C('#27506a'), dDeep: C('#2b8fbf'), dSh: C('#78d9d0'), tDeep: C('#3a6aa8'), tSh: C('#ffc9a8')
  };
  const tmp = new T.Color(), sunDir = new T.Vector3(), moonDir = new T.Vector3(); let nightF = 0;
  function mix3(a, b, c, wd, wt) { tmp.copy(a).lerp(b, wd); return tmp.lerp(c, wt); }
  function dayStep(dt) {
    phase = (phase + dt * (fast ? 40 : 1) / CYCLE) % 1;
    const a = TAU * (phase - 0.25), e = Math.sin(a);
    sunDir.set(Math.cos(a) * 0.9, e, 0.42).normalize(); moonDir.copy(sunDir).multiplyScalar(-1);
    const wd = smooth(-0.06, 0.32, e), wt = Math.exp(-Math.pow(e / 0.2, 2)) * 0.8; nightF = 1 - smooth(-0.22, 0.04, e);
    U.uTop.value.copy(mix3(K.nTop, K.dTop, K.tTop, wd, wt)); U.uHor.value.copy(mix3(K.nHor, K.dHor, K.tHor, wd, wt));
    U.uDeep.value.copy(mix3(K.nDeep, K.dDeep, K.tDeep, wd, wt * 0.6)); U.uShallow.value.copy(mix3(K.nSh, K.dSh, K.tSh, wd, wt * 0.7));
    U.uFog.value.copy(U.uHor.value); scene.fog.color.copy(U.uHor.value);
    U.uSunDir.value.copy(sunDir); U.uMoonDir.value.copy(moonDir); U.uNight.value = nightF;
    U.uSunCol.value.set(0xfff3dc).lerp(C('#ff9a5a'), 1 - smooth(0, 0.45, e));
    const sunI = smooth(-0.04, 0.22, e) * 2.4, moonI = (1 - smooth(-0.25, 0.02, e)) * 0.55;
    const useSun = sunI >= moonI; sun.intensity = Math.max(sunI, moonI);
    sun.color.copy(useSun ? U.uSunCol.value : C('#8fa6ff'));
    const dir = useSun ? sunDir : moonDir; sun.position.set(P.x + dir.x * 90, Math.max(dir.y, 0.12) * 90, P.z + dir.z * 90); sun.target.position.set(P.x, 0, P.z);
    hemi.color.copy(U.uTop.value).lerp(C('#ffffff'), 0.25); hemi.groundColor.set('#e8d8b0').lerp(C('#3a3f6a'), nightF); hemi.intensity = lerp(0.9, 0.42, nightF) * (1 - wt * 0.15);
    const lab = e > 0.5 ? 'Dia' : e > 0.06 ? (Math.cos(a) > 0 ? 'Manhã' : 'Tarde') : e > -0.18 ? (Math.cos(a) > 0 ? 'Amanhecer' : 'Entardecer') : 'Noite';
    if (lab !== dayStep.lab) { dayStep.lab = lab; $('clockT').textContent = lab; $('clock').firstElementChild.style.background = e > 0 ? '#ffd98a' : '#b9c6ff'; $('clock').firstElementChild.style.boxShadow = '0 0 8px ' + (e > 0 ? '#ffd98a' : '#b9c6ff'); }
    for (const c of clouds) c.material.color.copy(U.uHor.value).lerp(C('#ffffff'), 0.65 - nightF * 0.35).multiplyScalar(lerp(1, 0.55, nightF));
    renderer.toneMappingExposure = lerp(1.0, 1.15, nightF);
    for (const l of lamps) { l.mat.emissiveIntensity = 0.15 + nightF * 2.4; l.spr.material.opacity = nightF * 0.9; }
    candle.intensity = nightF * 7; flies.m.opacity = smooth(0.05, 0.6, nightF) * 0.95;
    renderer.setClearColor(U.uHor.value);
  }

  /* ───────── laço principal ───────── */
  const clock = new T.Clock(); let frames = 0, accT = 0, beatSeen = 0;
  function resize() { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
  addEventListener('resize', resize);
  const move = new T.Vector3(), tmpV = new T.Vector3();
  function step(dt, t) {
    /* entrada */
    let ix = 0, iz = 0;
    if (keys['w'] || keys['arrowup']) iz -= 1; if (keys['s'] || keys['arrowdown']) iz += 1; if (keys['a'] || keys['arrowleft']) ix -= 1; if (keys['d'] || keys['arrowright']) ix += 1;
    ix += joy.x; iz += joy.y; const im = Math.min(1, Math.hypot(ix, iz)); fast = !!keys['n'];
    if (im > 0.08) { if (P.sit) P.sit = false; }
    const sy = Math.sin(CAM.yaw), cy = Math.cos(CAM.yaw);
    const wx = (ix * cy + iz * sy), wz = (-ix * sy + iz * cy), wl = Math.hypot(wx, wz) || 1;
    const sp = (P.wade > 0.3 ? 3.3 : 5.0) * im, tvx = wx / wl * sp * (im > 0.08 ? 1 : 0), tvz = wz / wl * sp * (im > 0.08 ? 1 : 0);
    const k = 1 - Math.exp(-dt * (P.sit ? 12 : 9)); P.vx += (tvx - P.vx) * k; P.vz += (tvz - P.vz) * k;
    /* movimento + colisão + borda da água */
    let nx = P.x + P.vx * dt, nz = P.z + P.vz * dt;
    for (const c of colliders) { const dx = nx - c.x, dz = nz - c.z, d = Math.hypot(dx, dz), m = c.r + 0.32; if (d < m && d > 0.001) { nx = c.x + dx / d * m; nz = c.z + dz / d * m; } }
    const OK = (x, z) => groundH(x, z) > -0.36;
    if (OK(nx, nz)) { P.x = nx; P.z = nz; } else if (OK(nx, P.z)) P.x = nx; else if (OK(P.x, nz)) P.z = nz;
    const gh = groundH(P.x, P.z);
    if (!P.ground) { P.vy -= 17 * dt; P.y += P.vy * dt; if (P.y <= Math.max(gh, -0.2)) { P.y = Math.max(gh, -0.2); P.vy = 0; P.ground = true; P.squash = 0.3; } }
    else { P.y += (Math.max(gh, -0.2) - P.y) * Math.min(1, dt * 18); if (Math.abs(P.y - Math.max(gh, -0.2)) < 0.02) P.y = Math.max(gh, -0.2); }
    P.wade = clamp((0.08 - gh) / 0.3, 0, 1) * (P.ground ? 1 : 0.3);
    const spd = Math.hypot(P.vx, P.vz);
    if (spd > 0.25) { const ty = Math.atan2(P.vx, P.vz); let d = ty - P.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); P.yaw += d * (1 - Math.exp(-dt * 12)); P.phase += dt * (3.2 + spd * 1.5); }
    P.squash *= Math.exp(-dt * 9);
    P.sitT += ((P.sit ? 1 : 0) - P.sitT) * (1 - Math.exp(-dt * 7));
    /* pose */
    const h = hero, st = P.sitT, bob = spd > 0.25 ? Math.abs(Math.sin(P.phase)) * 0.09 : Math.sin(t * 2.0) * 0.012;
    h.g.position.set(P.x, P.y + bob - st * 0.28 + (P.y > gh + 0.1 ? 0 : 0), P.z); h.g.rotation.y = P.yaw;
    h.g.rotation.z = -clamp(P.vx * Math.cos(P.yaw) - P.vz * Math.sin(P.yaw), -4, 4) * 0.02;
    const sq = 1 + P.squash * 0.35 * (P.ground ? 1 : 0.5); h.g.scale.set(1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq));
    const sw = Math.sin(P.phase) * Math.min(1, spd / 4);
    h.feet[0].position.z = 0.05 + sw * 0.2 + st * 0.2; h.feet[1].position.z = 0.05 - sw * 0.2 + st * 0.2;
    h.feet[0].position.y = 0.08 + Math.max(0, Math.cos(P.phase)) * 0.09 * Math.min(1, spd / 3) + (P.ground ? 0 : 0.14); h.feet[1].position.y = 0.08 + Math.max(0, -Math.cos(P.phase)) * 0.09 * Math.min(1, spd / 3) + (P.ground ? 0 : 0.14);
    h.arms[0].position.z = -sw * 0.14; h.arms[1].position.z = sw * 0.14; h.arms[0].position.y = h.arms[1].position.y = 0.55 + (P.ground ? 0 : 0.18) - st * 0.04;
    h.head.rotation.x = Math.sin(t * 1.3) * 0.03 + st * 0.06 + (spd > 0.25 ? 0.05 : 0); h.head.rotation.z = Math.sin(t * 0.9) * 0.04 + (spd > 0.25 ? Math.sin(P.phase) * 0.03 : 0);
    h.head.position.y = 1.2 + (spd > 0.25 ? Math.abs(Math.sin(P.phase + 0.6)) * 0.03 : Math.sin(t * 2.0 + 0.5) * 0.014);
    P.nextBlink -= dt; if (P.nextBlink < 0) { P.blink = 0.14; P.nextBlink = 2 + Math.random() * 3; } P.blink = Math.max(0, P.blink - dt);
    h.eyes.forEach(e => e.scale.y = P.blink > 0 ? 0.12 : 1.35);
    /* capa balança */
    const cp = h.capeG.attributes.position, wind = Math.min(1, spd / 4);
    for (let i = 0; i < cp.count; i++) { const by = h.capeBase[i * 3 + 1], f = (0.4 - by) / 0.8; cp.setZ(i, -Math.max(0, f) * (0.12 + wind * 0.32) + Math.sin(t * 3 + by * 5 + h.capeBase[i * 3] * 4) * 0.025 * f * (0.5 + wind)); }
    cp.needsUpdate = true; h.cape.rotation.x = 0.08 + wind * 0.2;
    U.uPl.value.set(P.x, P.wade, P.z);
    /* vela do personagem */
    candle.position.set(P.x + Math.sin(P.yaw) * 0.4, P.y + 1.6, P.z + Math.cos(P.yaw) * 0.4);
  }

  function camStep(dt) {
    const sitView = P.sit && P.sitT > 0.5;
    if (sitView) { CAM.auto = Math.min(1, CAM.auto + dt * 0.4); } else CAM.auto = Math.max(0, CAM.auto - dt * 1.5);
    /* ao sentar, a câmera gira devagar para enquadrar o santuário */
    if (sitView) { const want = Math.atan2(P.x - PLAT.x, P.z - PLAT.z) + 0.0; let d = want - CAM.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); CAM.yaw += d * (1 - Math.exp(-dt * 0.9)); CAM.pitch += (0.2 - CAM.pitch) * (1 - Math.exp(-dt * 0.8)); }
    const tx = lerp(P.x, (P.x * 0.45 + PLAT.x * 0.55), CAM.auto * 0.7), tz = lerp(P.z, (P.z * 0.45 + PLAT.z * 0.55), CAM.auto * 0.7), ty = P.y + 1.4 + CAM.auto * 1.2;
    const k = 1 - Math.exp(-dt * 6); CAM.tx += (tx - CAM.tx) * k; CAM.ty += (ty - CAM.ty) * k; CAM.tz += (tz - CAM.tz) * k;
    const dist = CAM.dist * (1 + CAM.auto * 0.35), cp = Math.cos(CAM.pitch);
    let px = CAM.tx + Math.sin(CAM.yaw) * cp * dist, py = CAM.ty + Math.sin(CAM.pitch) * dist, pz = CAM.tz + Math.cos(CAM.yaw) * cp * dist;
    py = Math.max(py, groundH(px, pz) + 0.9, 0.9);
    camera.position.set(px, py, pz); camera.lookAt(CAM.tx, CAM.ty, CAM.tz);
    sky.position.copy(camera.position);
  }

  function reactorStep(dt, t) {
    const noAudio = !AU.has || (t - AU.last) > 1.2;
    const kb = 1 - Math.exp(-dt * 10);
    AU.bass += ((noAudio ? 0.05 : (AU.bassT || 0)) - (AU.bass || 0)) * kb; AU.mid += ((noAudio ? 0.04 : (AU.midT || 0)) - (AU.mid || 0)) * kb; AU.treb += ((noAudio ? 0.03 : (AU.trebT || 0)) - (AU.treb || 0)) * kb; AU.level += ((noAudio ? 0.04 : (AU.levelT || 0)) - (AU.level || 0)) * kb;
    AU.pulse *= Math.exp(-dt * 6);
    if (!noAudio && AU.beatN !== AU.seen) { AU.seen = AU.beatN; AU.pulse = 1; const p = R.pulses.find(p => p.t >= 1) || R.pulses[0]; p.t = 0; }
    const NC = R.crystals.length;
    for (let i = 0; i < NC; i++) {
      const c = R.crystals[i], f = i / NC, bi = Math.floor((f < 0.5 ? f * 2 : (1 - f) * 2) * 46), e = noAudio ? 0.06 + 0.06 * Math.sin(t * 0.8 + i * 0.5) : AU.b[bi] * 0.7 + AU.b[Math.min(63, bi + 1)] * 0.3;
      const th = 1 + e * 4.2 + AU.pulse * 0.5; c.h += (th - c.h) * (1 - Math.exp(-dt * 14));
      c.m.scale.set(1 + e * 0.35, c.h * 1.2, 1 + e * 0.35); c.m.position.y = PLAT.top + 0.3 + c.h * 0.36 + Math.sin(t * 1.2 + i) * 0.06; c.m.rotation.y = t * 0.5 + i;
      const hue = (f + t * 0.02) % 1; c.mat.emissive.setHSL(hue, 0.85, 0.55); c.mat.emissiveIntensity = 0.5 + e * 2.6 + AU.pulse * 0.6;
    }
    const s = 1 + AU.bass * 0.5 + AU.pulse * 0.22; R.orb.scale.setScalar(s); R.orb.position.y = PLAT.top + 2.5 + Math.sin(t * 0.9) * 0.18; R.orb.rotation.y = t * 0.4; R.orb.rotation.x = t * 0.23;
    const hue = (t * 0.03) % 1; R.orbMat.emissive.setHSL(hue, 0.8, 0.62); R.orbMat.emissiveIntensity = 0.9 + AU.level * 2 + AU.pulse * 1.4;
    R.halo.position.y = R.orb.position.y; R.halo.scale.setScalar(5.5 + AU.bass * 5 + AU.pulse * 2.5); R.halo.material.color.setHSL(hue, 0.9, 0.7); R.halo.material.opacity = 0.5 + AU.level * 0.5;
    R.rings.forEach((r, i) => { r.position.y = R.orb.position.y; r.rotation.set(t * (0.4 + i * 0.2) + i, t * (0.3 - i * 0.12), i * 1.1); r.scale.setScalar(1 + AU.mid * 0.6 + AU.pulse * 0.25); });
    R.beam.material.opacity = Math.min(0.55, AU.pulse * 0.35 + AU.level * 0.35) * (0.4 + nightF * 0.8) * smooth(1.5, 6, Math.hypot(camera.position.x - PLAT.x, camera.position.z - PLAT.z)); R.beam.material.color.setHSL(hue, 0.85, 0.65); R.beam.scale.set(1 + AU.bass * 0.8, 1, 1 + AU.bass * 0.8);
    R.ring.material.color.setHSL(hue, 0.8, 0.6); R.ring.material.opacity = 0.45 + AU.level * 0.5; R.ring2.material.color.setHSL(hue + 0.1, 0.8, 0.6); R.ring2.material.opacity = 0.35 + AU.mid * 0.6;
    R.pulses.forEach(p => { if (p.t < 1) { p.t += dt * 0.9; const sc = 1 + p.t * 6.2; p.m.scale.set(sc, sc, sc); p.m.material.opacity = (1 - p.t) * 0.7; p.m.material.color.setHSL(hue, 0.7, 0.75); } else p.m.material.opacity = 0; });
    reactorLight.color.setHSL(hue, 0.9, 0.6); reactorLight.intensity = (3 + AU.level * 11 + AU.pulse * 7) * (0.3 + nightF * 0.6);
    const rp = R.mp; for (let i = 0; i < R.MN; i++) { const m = R.ms[i]; m[2] += dt * m[3] * (0.4 + AU.level * 2.6); if (m[2] > 7) { m[2] = 0; m[0] = Math.random() * TAU; } const a = m[0] + t * 0.15, r = m[1] * (1 - m[2] / 11); rp[i * 3] = Math.cos(a) * r; rp[i * 3 + 1] = PLAT.top + 0.2 + m[2]; rp[i * 3 + 2] = Math.sin(a) * r; }
    R.mg.attributes.position.needsUpdate = true; R.motes.material.opacity = 0.35 + AU.level * 0.65;
  }

  function lifeStep(dt, t) {
    windU.value = t;
    for (const c of clouds) { const d = c.userData; d.a += dt * d.sp * 0.25; c.position.x = Math.cos(d.a) * d.r; c.position.z = Math.sin(d.a) * d.r; }
    const fp = flies.pos; for (let i = 0; i < flies.seed.length; i++) { const s = flies.seed[i], a = s[0] + Math.sin(t * 0.2 * s[4] + s[3]) * 0.6, d = s[1] + Math.sin(t * 0.3 + s[3]) * 1.2, x = Math.cos(a) * d, z = Math.sin(a) * d; fp[i * 3] = x; fp[i * 3 + 1] = Math.max(0.3, baseH(x, z)) + s[2] * 0.5 + Math.sin(t * 0.9 + s[3]) * 0.35; fp[i * 3 + 2] = z; }
    flies.g.attributes.position.needsUpdate = true;
    const day = 1 - nightF;
    butter.forEach(b => { const d = b.userData; d.a += dt * d.sp * 0.3; const x = Math.cos(d.a) * d.d, z = Math.sin(d.a) * d.d, y = Math.max(0.4, baseH(x, z)) + d.h + Math.sin(t * 1.4 + d.ph) * 0.35; b.position.set(x + Math.sin(t * 0.7 + d.ph) * 0.8, y, z); b.rotation.y = -d.a; const f = Math.sin(t * 16 + d.ph) * 0.9; d.w1.rotation.y = f; d.w2.rotation.y = -f; b.visible = day > 0.3 && baseH(x, z) > 0.4; b.scale.setScalar(0.6 + day * 0.4); });
    boat.position.y = Math.sin(t * 1.1) * 0.05 - 0.02; boat.rotation.z = Math.sin(t * 0.9) * 0.03; boat.rotation.x = Math.sin(t * 0.7 + 1) * 0.02;
  }

  let lastQ = 0;
  function loop() {
    requestAnimationFrame(loop);
    const dt = Math.min(0.05, clock.getDelta()), t = clock.elapsedTime; U.uTime.value = t;
    step(dt, t); dayStep(dt); camStep(dt); reactorStep(dt, t); lifeStep(dt, t);
    if (hintT && t > hintT) $('hint').classList.add('off');
    renderer.render(scene, camera);
    frames++; accT += dt;
    if (frames === 90) {
      const avg = accT / frames; frames = 0; accT = 0;
      if (qAuto && t - lastQ > 2) { if (avg > 0.032 && prNow > 0.55) { prNow = Math.max(0.55, prNow * 0.85); lastQ = t; if (prNow < 0.8 && QUAL[qi].sh) qi = 0; applyQ(); } else if (avg < 0.018 && prNow < QUAL[2].pr && qi >= 1) { prNow = Math.min(QUAL[2].pr, prNow * 1.1); lastQ = t; renderer.setPixelRatio(prNow); resize(); } }
    }
  }
  applyQ(); resize(); dayStep(0.001); camStep(1);
  window.__ilha = { P, CAM, setPhase: p => { phase = p; }, AU };
  setTimeout(() => $('load').classList.add('off'), 350);
  toParent({ nb: 'ready' });
  loop();
})();
