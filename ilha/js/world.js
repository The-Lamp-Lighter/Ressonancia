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
    renderer = new T.WebGLRenderer({ canvas: $('c'), antialias: (devicePixelRatio || 1) < 1.5, powerPreference: 'high-performance' });
  } catch (e) { $('msg').style.display = 'grid'; $('load').classList.add('off'); return; }
  renderer.outputEncoding = T.sRGBEncoding;
  renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap; renderer.shadowMap.autoUpdate = false; renderer.shadowMap.needsUpdate = true;
  const QUAL = [{ n: 'baixa', pr: 0.75, sh: false }, { n: 'média', pr: 1, sh: true }, { n: 'alta', pr: Math.min(devicePixelRatio || 1, 1.75), sh: true }];
  let qi = Q.has('q') ? +Q.get('q') : 1, qAuto = !Q.has('q');
  let prNow = QUAL[qi].pr;
  function applyQ() { renderer.setPixelRatio(prNow); renderer.shadowMap.enabled = QUAL[qi].sh; sun.castShadow = QUAL[qi].sh; scene.traverse(o => { if (o.material) o.material.needsUpdate = true; }); resize(); $('bQ').textContent = 'Qualidade: ' + (qAuto ? 'auto' : QUAL[qi].n); }

  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(52, 1, 0.3, 1200);
  scene.fog = new T.Fog(0xcfe6ff, 70, 330);

  /* ───────── terreno ───────── */
  const shoreR = th => 52 * (1 + 0.1 * Math.sin(3 * th + 1.2) + 0.06 * Math.sin(5 * th + 0.4) + 0.04 * Math.sin(8 * th));
  const PLAT = { x: 0, z: -12, r: 6.3, top: 0.62 }, JET = { x0: 51.2, x1: 62, hw: 1.15, y: 0.34 };
  function baseH(x, z) {
    const r = Math.hypot(x, z), th = Math.atan2(z, x), d = shoreR(th) - r;
    let h = Math.min(d * 0.3, 1.45);
    if (d > 0) h += (Math.sin(x * 0.21) * Math.cos(z * 0.17) * 0.3 + Math.sin(x * 0.09 + z * 0.11) * 0.38) * smooth(0, 9, d);
    const pd = Math.hypot(x - PLAT.x, z - PLAT.z);
    h += 1.35 * Math.exp(-((x - 16) * (x - 16) + (z - 14) * (z - 14)) / 40) * smooth(0, 5, d);
    h += 1.7 * Math.exp(-((x + 30) * (x + 30) + (z - 24) * (z - 24)) / 70) * smooth(0, 6, d) + 1.4 * Math.exp(-((x - 27) * (x - 27) + (z + 28) * (z + 28)) / 55) * smooth(0, 6, d);
    h = lerp(h, PLAT.top - 0.05, smooth(11, 6.4, pd));
    return Math.max(h, -2.6);
  }
  /* ───────── outras ilhas (cada uma com seu bioma) ───────── */
  const ISLES = [
    { id: 'T', name: 'Ilha da Árvore Milenar', desc: 'Uma árvore enorme e muito antiga, com pétalas caindo, e um banco para ficar olhando.', x: 118, z: 0, R: 26, p: 2.0 },
    { id: 'N', name: 'Ilha Nevada', desc: 'Neve macia, pinheiros, um iglu e, à noite, a aurora.', x: -34, z: -128, R: 24, p: 0.7 },
    { id: 'D', name: 'Ilha das Dunas', desc: 'Areia dourada, um oásis com palmeiras e ruínas que brilham.', x: -120, z: 18, R: 27, p: 4.1 },
    { id: 'C', name: 'Ilha dos Cristais', desc: 'Uma caverna cheia de cristais que brilham no ritmo da música.', x: 64, z: -150, R: 24, p: 5.2 },
    { id: 'W', name: 'Ilha das Cachoeiras', desc: 'Cachoeiras em degraus, uma lagoa clara e névoa no ar.', x: 162, z: -98, R: 27, p: 1.3 },
    { id: 'F', name: 'Ilha do Farol', desc: 'Um farol antigo com vista para o mar inteiro.', x: -64, z: 152, R: 19, p: 3.3 },
    { id: 'V', name: 'Vila Flutuante', desc: 'Casinhas sobre palafitas, passarelas e luzes sobre a água.', x: 122, z: 134, R: 23, p: 2.6 }
  ];
  const isleR = (I, th) => I.R * (1 + 0.1 * Math.sin(3 * th + I.p) + 0.06 * Math.sin(5 * th + I.p / 3) + 0.04 * Math.sin(8 * th));
  function isleH(I, x, z) {
    const dx = x - I.x, dz = z - I.z, r = Math.hypot(dx, dz); if (r > I.R * 1.3) return -2.6;
    const d = isleR(I, Math.atan2(dz, dx)) - r;
    let h = Math.min(d * 0.3, I.id === 'D' ? 1.15 : 1.45);
    if (d > 0) {
      const w = smooth(0, 9, d);
      if (I.id === 'T') h += (Math.sin(x * 0.21) * Math.cos(z * 0.17) * 0.22 + Math.sin(x * 0.09 + z * 0.11) * 0.25) * w + 0.5 * Math.exp(-(dx * dx + dz * dz) / 260) * w;
      else if (I.id === 'C') { h += (Math.sin(x * 0.17) * Math.cos(z * 0.15) * 0.45 + Math.sin(x * 0.08 + z * 0.1) * 0.5) * w + 1.3 * Math.exp(-(dx * dx + dz * dz) / 230) * w; h = lerp(h, 1.0, smooth(11, 7.5, Math.hypot(dx, dz - 1))); { const ea = Math.atan2(-I.z, -I.x), al = dx * Math.cos(ea) + dz * Math.sin(ea), pp = Math.abs(-dx * Math.sin(ea) + dz * Math.cos(ea)); if (al > 0 && al < 24) h = lerp(h, lerp(1.0, h, smooth(11, 24, al)), smooth(5, 3, pp)); } }
      else if (I.id === 'W') {
        h += (Math.sin(x * 0.15) * Math.cos(z * 0.13) * 0.22) * w;
        h += (3.2 * smooth(2, -3, dz) + 3.4 * smooth(-6, -11, dz)) * smooth(25, 12, Math.abs(dx)) * w;
        h = lerp(h, 0.12, smooth(9, 5.5, Math.hypot(dx, dz - 8)));
      }
      else if (I.id === 'F') { h = Math.min(d * 0.28, 3.2) + (Math.sin(x * 0.2) * Math.cos(z * 0.18) * 0.3) * w; h = lerp(h, 3.4, smooth(6.5, 4, Math.hypot(dx, dz))); }
      else if (I.id === 'V') { h = Math.min(d * 0.26, 0.62) + Math.sin(x * 0.3) * Math.cos(z * 0.27) * 0.06 * w; }
      else if (I.id === 'N') { h += (Math.sin(x * 0.16) * Math.cos(z * 0.14) * 0.5 + Math.sin(x * 0.07 + z * 0.09) * 0.6 + Math.sin(x * 0.31 + z * 0.27) * 0.12) * w; h = lerp(h, 0.95, smooth(8, 5.6, Math.hypot(dx - 7, dz + 4))); h = lerp(h, 1.2, smooth(6, 3.8, Math.hypot(dx + 8, dz - 6))); }
      else { h += (Math.sin(x * 0.12 + z * 0.05) * 0.9 + Math.sin(x * 0.07 - z * 0.11 + 1) * 0.7 + Math.abs(Math.sin(x * 0.19 + z * 0.13)) * 0.45) * w * 0.8; h = lerp(h, 0.35, smooth(9, 5.5, Math.hypot(dx + 3, dz - 2))); h = lerp(h, 0.9, smooth(7, 4.5, Math.hypot(dx - 10, dz + 8))); }
    }
    return Math.max(h, -2.6);
  }
  const DECKS = [{ x: JET.x1, z: 0, ang: 0, len: 37, hw: 1.35, y: 0.34, arch: 0.55 }];
  function deckH(x, z) {
    let h = -9;
    for (const d of DECKS) { const dx = x - d.x, dz = z - d.z, c = Math.cos(d.ang), s = Math.sin(d.ang), u = dx * c + dz * s, v = -dx * s + dz * c; if (u > 0 && u < d.len && Math.abs(v) < d.hw) h = Math.max(h, d.y + (d.arch ? d.arch * Math.sin(Math.PI * u / d.len) : 0)); }
    return h;
  }
  const extH = [];                       /* alturas extras (gruta, plataformas...) registradas pelos módulos */
  function groundH(x, z) {
    let h = baseH(x, z);
    for (const I of ISLES) { const v = isleH(I, x, z); if (v > h) h = v; }
    const dk = deckH(x, z); if (dk > h) h = dk;
    if (Math.hypot(x - PLAT.x, z - PLAT.z) < PLAT.r) h = Math.max(h, PLAT.top);
    if (x > JET.x0 && x < JET.x1 && Math.abs(z) < JET.hw) h = Math.max(h, JET.y);
    for (let i = 0; i < extH.length; i++) { const v = extH[i](x, z); if (v > h) h = v; }
    return h;
  }
  function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const rnd = mulberry(20261010);

  /* corta uma malha em grade (N x N células) em blocos K x K: cada bloco some sozinho quando está fora da tela */
  function tileGrid(g, N, K, mat) {
    const grp = new T.Group(), P0 = g.attributes.position, N0 = g.attributes.normal, C0 = g.attributes.color, W = N + 1, step = Math.ceil(N / K);
    for (let r0 = 0; r0 < N; r0 += step) for (let c0 = 0; c0 < N; c0 += step) {
      const r1 = Math.min(N, r0 + step), c1 = Math.min(N, c0 + step), nw = c1 - c0 + 1, nh = r1 - r0 + 1, pa = new Float32Array(nw * nh * 3), na = new Float32Array(nw * nh * 3), ca = new Float32Array(nw * nh * 3), idx = [];
      for (let r = 0; r < nh; r++) for (let c = 0; c < nw; c++) { const s0 = (r0 + r) * W + c0 + c, d = (r * nw + c) * 3; pa[d] = P0.getX(s0); pa[d + 1] = P0.getY(s0); pa[d + 2] = P0.getZ(s0); na[d] = N0.getX(s0); na[d + 1] = N0.getY(s0); na[d + 2] = N0.getZ(s0); ca[d] = C0.getX(s0); ca[d + 1] = C0.getY(s0); ca[d + 2] = C0.getZ(s0); }
      for (let r = 0; r < nh - 1; r++) for (let c = 0; c < nw - 1; c++) { const a = r * nw + c, b = a + 1, d = a + nw, e = d + 1; idx.push(a, d, b, b, d, e); }
      const tg = new T.BufferGeometry(); tg.setAttribute('position', new T.BufferAttribute(pa, 3)); tg.setAttribute('normal', new T.BufferAttribute(na, 3)); tg.setAttribute('color', new T.BufferAttribute(ca, 3)); tg.setIndex(idx); tg.computeBoundingSphere();
      const m = new T.Mesh(tg, mat); m.receiveShadow = true; grp.add(m);
    }
    return grp;
  }
  const terr = (() => {
    const N = 340, S = 170, g = new T.PlaneGeometry(S, S, N, N); g.rotateX(-Math.PI / 2);
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
    const m = tileGrid(g, N, 6, new T.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 })); scene.add(m); return m;
  })();

  /* ───────── luzes ───────── */
  const hemi = new T.HemisphereLight(0xbfdcff, 0xe8d8b0, 0.7); scene.add(hemi);
  const sun = new T.DirectionalLight(0xfff0d8, 2.2); sun.castShadow = true; sun.shadow.mapSize.set(1536, 1536);
  Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 220 }); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04;
  scene.add(sun, sun.target);
  const reactorLight = new T.PointLight(0xff9ad0, 0, 26, 1.6); reactorLight.position.set(PLAT.x, 3.2, PLAT.z); scene.add(reactorLight);
  /* luzes pontuais custam em CADA pixel mesmo apagadas: as da cena viram 'fontes virtuais' e só 2 luzes reais são movidas para as mais fortes perto de você */
  const VL = [reactorLight]; const vlight = l => { l.visible = false; VL.push(l); return l; }; vlight(reactorLight); VL.length = 1;
  const LP = [0, 1].map(() => { const l = new T.PointLight(0xffffff, 0, 10, 1.6); scene.add(l); return { l, cur: null, f: 0 }; });
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
    transparent: true, depthWrite: false, uniforms: Object.assign({ uFogN: { value: 70 }, uFogF: { value: 330 }, uIs: { value: [new T.Vector4(0, 0, 52, 1.2)].concat(ISLES.map(I => new T.Vector4(I.x, I.z, I.R, I.p))) } }, U),
    vertexShader: 'varying vec3 vW;void main(){vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}',
    fragmentShader: `uniform vec4 uIs[${1 + ISLES.length}];uniform float uTime,uNight,uFogN,uFogF;uniform vec3 uSunDir,uMoonDir,uSunCol,uTop,uHor,uDeep,uShallow,uFog,uPl;varying vec3 vW;
      float shoreR(float th,float R,float p){return R*(1.+.1*sin(3.*th+p)+.06*sin(5.*th+p/3.)+.04*sin(8.*th));}
      float hs(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hs(i),hs(i+vec2(1,0)),f.x),mix(hs(i+vec2(0,1)),hs(i+vec2(1,1)),f.x),f.y);}
      void main(){vec2 xz=vW.xz;float th=0.,dist=1e9;for(int i=0;i<${1 + ISLES.length};i++){vec2 q=xz-uIs[i].xy;float rr=length(q);if(rr>uIs[i].z*1.3+12.)continue;float tt=atan(q.y,q.x),dd=rr-shoreR(tt,uIs[i].z,uIs[i].w);if(dd<dist){dist=dd;th=tt;}}
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
  const RESV = [[-7.5, 5, 4], [9, -6, 4], [-4.6, -6.2, 2], [4.6, -6.2, 2], [16, 14, 3.4], [-30, 24, 3.4], [27, -28, 3.4]];
  const resv = (x, z, k = 0) => RESV.some(r => Math.hypot(x - r[0], z - r[1]) < r[2] + k);
  const pathX = z => Math.sin(z * 0.28) * 1.3;
  function inCorridor(x, z, w) { return z > -7 && z < 56 && Math.abs(x - pathX(z)) < w; }
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
  for (let k = 0, tries = 0; k < 72 && tries < 4000; tries++) {
    const a = rnd() * TAU, d = 3 + rnd() * 49, x = Math.cos(a) * d, z = Math.sin(a) * d;
    if (baseH(x, z) < 0.75 || Math.hypot(x, z) > shoreR(Math.atan2(z, x)) - 3.5) continue;
    if (inCorridor(x, z, 5.2) || resv(x, z) || Math.hypot(x - PLAT.x, z - PLAT.z) < 9.5) continue;
    if (trees.some(t => Math.hypot(t.x - x, t.z - z) < 4.6)) continue;
    const s = 0.8 + rnd() * 0.6; trees.push({ x, z, s }); makeTree(x, z, s, rnd() < 0.3 ? 'blossom' : 'normal'); k++;
  }
  /* árvore-guardiã perto da praia de chegada */
  makeTree(-8.5, 9, 1.55, 'blossom'); makeTree(12.6, 12.4, 1.3, 'normal'); makeTree(-30, 24, 1.7, 'blossom'); makeTree(27, -28, 1.5, 'normal'); makeTree(-9, 33, 1.4, 'blossom'); makeTree(8, 41, 1.3, 'normal');
  function rock(x, z, s) {
    const m = shadowy(new T.Mesh(new T.DodecahedronGeometry(0.7 * s, 0), std(rnd() < 0.5 ? '#c6c0d6' : '#b8c6d0', 1)));
    m.position.set(x, groundH(x, z) + 0.15 * s, z); m.scale.set(1.2, 0.7 + rnd() * 0.3, 1); m.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3); scene.add(m); colliders.push({ x, z, r: 0.75 * s });
  }
  for (let k = 0, tries = 0; k < 62 && tries < 1800; tries++) {
    const a = rnd() * TAU, d = 8 + rnd() * 42, x = Math.cos(a) * d, z = Math.sin(a) * d, h = baseH(x, z);
    if (h < -0.2 || h > 1.0 || inCorridor(x, z, 3) || resv(x, z) || Math.hypot(x - PLAT.x, z - PLAT.z) < 7.5) continue; rock(x, z, 0.5 + rnd() * 0.9); k++;
  }
  /* arbustos */
  for (let k = 0, tries = 0; k < 80 && tries < 2400; tries++) {
    const a = rnd() * TAU, d = 4 + rnd() * 44, x = Math.cos(a) * d, z = Math.sin(a) * d;
    if (baseH(x, z) < 0.7 || inCorridor(x, z, 2.2) || resv(x, z, -1) || Math.hypot(x - PLAT.x, z - PLAT.z) < 8) continue;
    const b = shadowy(new T.Mesh(new T.IcosahedronGeometry(0.6 + rnd() * 0.4, 1), std(leafCols[(rnd() * 5) | 0], 1))); b.position.set(x, groundH(x, z) + 0.3, z); b.scale.y = 0.75; scene.add(b); k++;
  }
  /* pedras de passagem */
  for (let z = 49; z > -5.5; z -= 1.35) {
    const x = pathX(z) + (rnd() - 0.5) * 0.4, m = shadowy(new T.Mesh(new T.CylinderGeometry(0.5 + rnd() * 0.12, 0.56, 0.14, 9), std('#e7dfd0', 1)), false, true);
    m.position.set(x, groundH(x, z) + 0.05, z); m.rotation.y = rnd() * 3; scene.add(m);
  }
  /* lanternas de papel */
  function lantern(x, z, h = 2.6, yy) {
    const y = yy !== undefined ? yy : groundH(x, z), g = new T.Group(); g.position.set(x, y, z);
    const pole = shadowy(new T.Mesh(new T.CylinderGeometry(0.06, 0.08, h, 6), std('#8a6a58', 1))); pole.position.y = h / 2; g.add(pole);
    const mat = new T.MeshStandardMaterial({ color: '#ffe2b0', emissive: new T.Color('#ffb15a'), emissiveIntensity: 0.15, roughness: 0.6 });
    const l = new T.Mesh(new T.SphereGeometry(0.34, 14, 10), mat); l.scale.y = 1.2; l.position.y = h + 0.3; g.add(l);
    const cap = new T.Mesh(new T.ConeGeometry(0.28, 0.2, 10), std('#7a5a50', 1)); cap.position.y = h + 0.78; g.add(cap);
    const spr = glow(0xffb15a, 2.4, 0); spr.position.y = h + 0.3; g.add(spr);
    scene.add(g); lamps.push({ mat, spr }); colliders.push({ x, z, r: 0.28 });
  }
  [[2.6, 48], [-2.7, 43], [2.6, 38], [-2.6, 33], [2.7, 28.5], [2.6, 24], [-2.7, 19], [2.6, 14], [-2.6, 9], [2.8, 4], [-2.8, -0.5], [2.6, -4.2]].forEach(([dx, z]) => lantern(pathX(z) + dx, z));
  lantern(JET.x1 - 0.5, 1.0, 2.2);
  /* banco virado para o santuário */
  const BENCHES = [];
  function makeBench(x, z, yaw, tx, tz) {
    const B = { x, z, yaw, tx, tz, y: groundH(x, z), fx: Math.sin(yaw), fz: Math.cos(yaw) }; BENCHES.push(B);
    const g = new T.Group(), wood = std('#c8996f', 0.9);
    const seat = shadowy(new T.Mesh(new T.BoxGeometry(2.2, 0.14, 0.7), wood)); seat.position.y = 0.55; g.add(seat);
    const back = shadowy(new T.Mesh(new T.BoxGeometry(2.2, 0.55, 0.1), wood)); back.position.set(0, 0.95, 0.32); back.rotation.x = -0.12; g.add(back);
    [-0.9, 0.9].forEach(px => { const l = shadowy(new T.Mesh(new T.BoxGeometry(0.12, 0.55, 0.6), std('#8a6a58', 1))); l.position.set(px, 0.27, 0); g.add(l); });
    g.position.set(x, B.y, z); g.rotation.y = yaw - Math.PI; scene.add(g);
    for (const o of [-0.8, 0, 0.8]) colliders.push({ x: x + Math.cos(yaw) * o, z: z - Math.sin(yaw) * o, r: 0.42, bench: B });
    return B;
  }
  const BENCH = makeBench(0.2, -3.3, Math.PI, PLAT.x, PLAT.z);

  /* ───────── cais e barquinho ───────── */
  const boat = (() => {
    const g = new T.Group(), wood = std('#d9a77a', 0.9);
    const hull = shadowy(new T.Mesh(new T.SphereGeometry(1, 20, 10, 0, TAU, Math.PI / 2, Math.PI / 2), new T.MeshStandardMaterial({ color: '#e8b98c', roughness: 0.85, side: T.DoubleSide })));
    hull.scale.set(1.9, 0.62, 0.85); hull.rotation.x = Math.PI; hull.position.y = 0.3; g.add(hull);
    const rim = new T.Mesh(new T.TorusGeometry(1, 0.05, 6, 28), wood); rim.rotation.x = Math.PI / 2; rim.scale.set(1.9, 0.85, 1); rim.position.y = 0.3; g.add(rim);
    const seat = new T.Mesh(new T.BoxGeometry(0.5, 0.07, 1.3), wood); seat.position.y = 0.2; g.add(seat);
    g.position.set(JET.x1 - 3.6, 0, 3.3); g.rotation.y = 0.35; scene.add(g); return g;
  })();
  (() => {
    const wood = std('#c9a37a', 1), dark = std('#8a6a58', 1);
    for (let x = JET.x0; x < JET.x1; x += 0.62) { const p = shadowy(new T.Mesh(new T.BoxGeometry(0.56, 0.1, JET.hw * 2), wood)); p.position.set(x + 0.28, JET.y - 0.05, 0); scene.add(p); }
    for (let x = JET.x0 + 1; x < JET.x1; x += 3.2) [-1, 1].forEach(s => { const p = shadowy(new T.Mesh(new T.CylinderGeometry(0.1, 0.12, 1.6, 6), dark)); p.position.set(x, JET.y - 0.6, s * (JET.hw - 0.1)); scene.add(p); });
  })();

  /* ───────── terreno das outras ilhas, docas e viagem de barco ───────── */
  const ISL = {}; ISLES.forEach(I => ISL[I.id] = I);
  const nightMats = [];                                   /* materiais que acendem de noite: {m, base, k} */
  const isleTerrain = (I) => {
    const S = Math.ceil(I.R * 2.7), N = Math.round(S / 0.5), g = new T.PlaneGeometry(S, S, N, N); g.rotateX(-Math.PI / 2);
    const p = g.attributes.position, col = new Float32Array(p.count * 3), c = new T.Color();
    const sand = new T.Color('#f3e3b9'), wet = new T.Color('#d8c28f'), floor = new T.Color('#9fd3c7'), deep = new T.Color('#5aa7ad');
    const sandD = new T.Color('#e6c485'), sandD2 = new T.Color('#d8ae66'), sandD3 = new T.Color('#f0d9a2'), snA = new T.Color('#f4f9ff'), snB = new T.Color('#dcecf9'), snC = new T.Color('#c3dcf0');
    const c2 = new T.Color(), gA = new T.Color('#7fcf93'), gB = new T.Color('#a8e08f'), gC = new T.Color('#5fb38a'), pk = new T.Color('#f6d3e2');
    for (let i = 0; i < p.count; i++) {
      const lx = p.getX(i), lz = p.getZ(i), x = lx + I.x, z = lz + I.z, h = isleH(I, x, z); p.setY(i, h); p.setX(i, lx); p.setZ(i, lz);
      const n = Math.sin(x * 0.7) * Math.sin(z * 0.6) * 0.5 + 0.5, n2 = Math.sin(x * 0.23 + 2) * Math.cos(z * 0.31) * 0.5 + 0.5, dc = Math.hypot(lx, lz);
      if (h < -0.6) c.copy(floor).lerp(deep, smooth(-0.6, -2.4, h));
      else if (h < 0.05) c.copy(floor).lerp(wet, smooth(-0.6, 0.05, h));
      else if (h < 0.5) c.copy(wet).lerp(sand, smooth(0.05, 0.3, h));
      else if (I.id === 'T') { c.copy(gC).lerp(gA, n * 0.7).lerp(gB, n2 * 0.4); c.lerp(pk, smooth(17, 5, dc) * (0.4 + 0.5 * n2)); c.lerp(sand, smooth(0.62, 0.48, h) * 0.6); }
      else if (I.id === 'C') { c.set('#7a6f9a').lerp(c2.set('#a89cc8'), n * 0.7).lerp(c2.set('#56507a'), n2 * 0.5); c.lerp(sand, smooth(0.62, 0.48, h) * 0.3); }
      else if (I.id === 'W') { c.copy(gC).lerp(gA, n * 0.7).lerp(gB, n2 * 0.4); const cl = smooth(2.2, 4.2, h) * (0.5 + 0.5 * n2); c.lerp(c2.set('#9aa3a8'), cl * 0.85); if (Math.hypot(lx, lz - 8.5) < 8) c.lerp(c2.set('#d6e6d0'), smooth(8, 5, Math.hypot(lx, lz - 8.5)) * 0.5); c.lerp(sand, smooth(0.62, 0.48, h) * 0.5); }
      else if (I.id === 'F') { c.copy(gC).lerp(gB, n * 0.5); c.lerp(c2.set('#8d96a0'), smooth(1.4, 2.6, h) * (0.6 + 0.4 * n2)); if (h > 3.0) c.lerp(gA, 0.45); c.lerp(sand, smooth(0.62, 0.48, h) * 0.5); }
      else if (I.id === 'V') { c.copy(sand).lerp(c2.set('#e9d6a4'), n * 0.5).lerp(c2.set('#9ccf8a'), smooth(0.35, 0.6, h) * 0.35 * n2); }
      else if (I.id === 'N') { c.copy(snA).lerp(snB, n * 0.6).lerp(snC, smooth(1.6, 0.6, h) * 0.8 + n2 * 0.15); if (Math.hypot(lx - 7, lz + 4) < 5.8) c.set('#bfe3f5'); c.lerp(sand, smooth(0.62, 0.48, h) * 0.4); }
      else { c.copy(sandD).lerp(sandD2, n * 0.6).lerp(sandD3, n2 * 0.5); c.multiplyScalar(0.92 + 0.12 * Math.sin(x * 0.19 + z * 0.13)); if (Math.hypot(lx + 3, lz - 2) < 6) c.lerp(new T.Color('#6dbb86'), smooth(6, 3, Math.hypot(lx + 3, lz - 2)) * 0.5); }
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    g.setAttribute('color', new T.BufferAttribute(col, 3)); g.computeVertexNormals();
    const m = tileGrid(g, N, 3, new T.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 })); m.position.set(I.x, 0, I.z); scene.add(m); return m;
  };
  ISLES.forEach(isleTerrain);

  /* barquinhos e docas */
  function boatMesh() {
    const g = new T.Group(), wood = std('#d9a77a', 0.9);
    const hull = shadowy(new T.Mesh(new T.SphereGeometry(1, 20, 10, 0, TAU, Math.PI / 2, Math.PI / 2), new T.MeshStandardMaterial({ color: '#e8b98c', roughness: 0.85, side: T.DoubleSide })));
    hull.scale.set(1.9, 0.62, 0.85); hull.rotation.x = Math.PI; hull.position.y = 0.3; g.add(hull);
    const rim = new T.Mesh(new T.TorusGeometry(1, 0.05, 6, 28), wood); rim.rotation.x = Math.PI / 2; rim.scale.set(1.9, 0.85, 1); rim.position.y = 0.3; g.add(rim);
    const seat = new T.Mesh(new T.BoxGeometry(0.5, 0.07, 1.3), wood); seat.position.y = 0.2; g.add(seat); return g;
  }
  const DOCKS = { main: { arrive: { x: JET.x1 - 4.2, z: 0, yaw: -Math.PI / 2 }, boat: { x: JET.x1 - 3.6, z: 3.3 } } };
  const dockBoats = [];
  function makeDock(I, tx, tz) {
    const th = Math.atan2(tz - I.z, tx - I.x), R0 = isleR(I, th), c = Math.cos(th), s = Math.sin(th), sx = I.x + c * (R0 - 3), sz = I.z + s * (R0 - 3), len = 12, hw = 1.15, y = 0.34;
    DECKS.push({ x: sx, z: sz, ang: th, len, hw, y });
    const wood = std('#c9a37a', 1), dark = std('#8a6a58', 1), g = new T.Group(); g.position.set(sx, 0, sz); g.rotation.y = -th;
    for (let u = 0; u < len; u += 0.62) { const pl = shadowy(new T.Mesh(new T.BoxGeometry(0.56, 0.1, hw * 2), wood)); pl.position.set(u + 0.28, y - 0.05, 0); g.add(pl); }
    for (let u = 1; u < len; u += 3.2) [-1, 1].forEach(q => { const pp = shadowy(new T.Mesh(new T.CylinderGeometry(0.1, 0.12, 1.6, 6), dark)); pp.position.set(u, y - 0.6, q * (hw - 0.1)); g.add(pp); });
    scene.add(g);
    lantern(sx + c * (len - 0.7) - s * (hw + 0.02), sz + s * (len - 0.7) + c * (hw + 0.02), 2.2, y);
    const bt = boatMesh(), bx = sx + c * (len - 3) - s * 2.6, bz = sz + s * (len - 3) + c * 2.6; bt.position.set(bx, 0, bz); bt.rotation.y = -th + 0.25; scene.add(bt); dockBoats.push(bt);
    DOCKS[I.id] = { arrive: { x: sx + c * (len - 4.5), z: sz + s * (len - 4.5), yaw: Math.atan2(-c, -s) }, boat: { x: bx, z: bz } };
  }
  makeDock(ISL.T, ISL.T.x, ISL.T.z + 100); makeDock(ISL.N, 0, 0); makeDock(ISL.D, 0, 0);
  makeDock(ISL.C, 0, 0); makeDock(ISL.W, ISL.W.x - 40, ISL.W.z + 80); makeDock(ISL.F, 0, 0); makeDock(ISL.V, 0, 0);

  /* ponte da ilha principal até a Ilha da Árvore */
  (() => {
    const d = DECKS[0], wood = std('#c9a37a', 1), dark = std('#8a6a58', 1), rope = std('#e6d7b0', 1), g = new T.Group(); scene.add(g);
    const yAt = u => d.y + d.arch * Math.sin(Math.PI * u / d.len), slope = u => Math.atan2(d.arch * Math.PI / d.len * Math.cos(Math.PI * u / d.len), 1);
    for (let u = 0; u < d.len; u += 0.62) { const pl = shadowy(new T.Mesh(new T.BoxGeometry(0.56, 0.1, d.hw * 2), wood)); pl.position.set(d.x + u + 0.28, yAt(u) - 0.05, 0); pl.rotation.z = slope(u); g.add(pl); }
    for (let u = 1; u < d.len; u += 3.1) [-1, 1].forEach(q => {
      const pp = shadowy(new T.Mesh(new T.CylinderGeometry(0.1, 0.13, 1.9, 6), dark)); pp.position.set(d.x + u, yAt(u) - 0.7, q * (d.hw - 0.1)); g.add(pp);
      const post = shadowy(new T.Mesh(new T.CylinderGeometry(0.07, 0.08, 1.15, 6), dark)); post.position.set(d.x + u, yAt(u) + 0.52, q * (d.hw + 0.02)); g.add(post);
    });
    for (let u = 0; u < d.len - 0.1; u += 1.55) [-1, 1].forEach(q => { const rl = new T.Mesh(new T.BoxGeometry(1.58, 0.06, 0.06), rope); rl.position.set(d.x + u + 0.78, yAt(u + 0.78) + 0.98, q * (d.hw + 0.02)); rl.rotation.z = slope(u + 0.78); g.add(rl); });
    for (const u of [9, 18.5, 28]) { lantern(d.x + u, d.hw + 0.02, 1.5, yAt(u)); lantern(d.x + u, -d.hw - 0.02, 1.5, yAt(u)); }
  })();

  /* ── prompt ("E · sentar", "E · viajar") e painel do barco ── */
  const promptEl = $('prompt'), bpanel = $('bpanel'), fadeEl = $('fade'); let boatOpen = false;
  function boatNear() { for (const k in DOCKS) { const b = DOCKS[k].boat; if (Math.hypot(P.x - b.x, P.z - b.z) < 4.1 && Math.abs(P.y - groundH(b.x, b.z)) < 3) return k; } return null; }
  function curIsle() { if (P.x > 700) return 'S'; let best = 'main', bd = Math.hypot(P.x, P.z) / 52; for (const I of ISLES) { const d = Math.hypot(P.x - I.x, P.z - I.z) / I.R; if (d < bd) { bd = d; best = I.id; } } return best; }
  const DEST = [{ id: 'main', name: 'Ilha Principal', desc: 'O santuário, o banco e o caminho de pedras.' }].concat(ISLES.map(I => ({ id: I.id, name: I.name, desc: I.desc })));
  function openBoat() {
    boatOpen = true; const cur = curIsle(), box = $('bList'); box.replaceChildren();
    for (const d of DEST) { if (d.id === cur) continue; const b = document.createElement('button'); b.type = 'button'; b.className = 'wi'; const dot = document.createElement('i'); dot.style.background = '#9ad8ff'; const nm = document.createElement('span'); nm.textContent = d.name; const sub = document.createElement('small'); sub.textContent = d.desc; b.append(dot, nm, sub); b.addEventListener('click', () => travel(d.id)); box.appendChild(b); }
    bpanel.style.display = 'flex';
  }
  function closeBoat() { boatOpen = false; bpanel.style.display = 'none'; try { cv.focus({ preventScroll: true }); } catch (e) {} }
  $('bClose').addEventListener('click', closeBoat);
  function travel(id) {
    closeBoat(); fadeEl.classList.add('on'); const D = DOCKS[id], name = (DEST.find(d => d.id === id) || {}).name || '';
    setTimeout(() => {
      P.sit = false; P.bench = null; P.nearBench = false; P.x = D.arrive.x; P.z = D.arrive.z; P.yaw = D.arrive.yaw; P.vx = P.vz = 0; P.vy = 0; P.y = groundH(P.x, P.z); P.ground = true; P.gliding = false;
      CAM.yaw = P.yaw + Math.PI; CAM.pitch = 0.3; CAM.tx = P.x; CAM.ty = P.y + 1.55; CAM.tz = P.z; PS.lastYaw = P.yaw; wardOpen && toggleWard(false);
      setTimeout(() => { fadeEl.classList.remove('on'); toast('Chegou: ' + name, 'Volte pelo barquinho na doca (E) quando quiser.'); }, 500);
    }, 1000);
  }
  /* ───────── biomas ───────── */
  const vn2 = (x, z) => Math.sin(x * 12.9898 + z * 78.233) * 43758.5453 % 1;
  const onLand = (I, x, z, min = 0.6) => isleH(I, x, z) > min;
  const bio = { tick: [], petals: null };
  const noMats = (o, f) => o.traverse(n => { if (n.isMesh) f(n); });

  /* ====== ILHA DA ÁRVORE MILENAR ====== */
  (() => {
    const I = ISL.T, cx = I.x, cz = I.z, by = groundH(cx, cz), g = new T.Group(); g.position.set(cx, by, cz); scene.add(g);
    const bark = new T.MeshStandardMaterial({ color: '#7b5d4f', roughness: 1, side: T.DoubleSide }), bark2 = std('#6c5144', 1), moss = std('#6fa86a', 1);
    /* tronco torto e cheio de dobras */
    const prof = []; for (let y = 0; y <= 25; y += 0.8) prof.push(new T.Vector2(3.1 * (1 + 1.25 * Math.exp(-y / 2.6)) * (1 - 0.34 * smooth(2, 24, y)), y));
    const tg = new T.LatheGeometry(prof, 40), tp = tg.attributes.position;
    for (let i = 0; i < tp.count; i++) {
      const x = tp.getX(i), y = tp.getY(i), z = tp.getZ(i), a = Math.atan2(z, x), r = Math.hypot(x, z);
      const k = 1 + 0.07 * Math.sin(a * 7 + y * 0.9) + 0.05 * Math.sin(a * 13 - y * 1.7) + 0.06 * Math.sin(a * 3 + y * 0.35);
      const tw = y * 0.03, na = a + tw; tp.setXYZ(i, Math.cos(na) * r * k + Math.sin(y * 0.14) * 1.1, y, Math.sin(na) * r * k + Math.sin(y * 0.1 + 1) * 0.7);
    }
    tg.computeVertexNormals(); const trunk = shadowy(new T.Mesh(tg, bark)); g.add(trunk);
    /* raízes grossas que entram na terra */
    for (let i = 0; i < 7; i++) {
      const a = i / 7 * TAU + 0.3, L = 7 + (i % 3) * 2.2, curve = new T.CatmullRomCurve3([new T.Vector3(Math.cos(a) * 2.6, 3.4, Math.sin(a) * 2.6), new T.Vector3(Math.cos(a) * (3.6 + L * 0.3), 1.3, Math.sin(a) * (3.6 + L * 0.3)), new T.Vector3(Math.cos(a + 0.12) * (4 + L * 0.7), 0.35, Math.sin(a + 0.12) * (4 + L * 0.7)), new T.Vector3(Math.cos(a + 0.18) * (4.5 + L), -0.3, Math.sin(a + 0.18) * (4.5 + L))]);
      const r = shadowy(new T.Mesh(new T.TubeGeometry(curve, 18, 0.95 - (i % 3) * 0.12, 8), i % 2 ? bark : bark2)); g.add(r);
      for (let k = 0.55; k <= 0.95; k += 0.1) { const rp = curve.getPoint(k); if (rp.y > 0.15 && Math.hypot(rp.x, rp.z) > 6.3) colliders.push({ x: cx + rp.x, z: cz + rp.z, r: (0.95 - (i % 3) * 0.12) * 0.85 }); }
      const mp = curve.getPoint(0.55); const m = shadowy(new T.Mesh(new T.IcosahedronGeometry(0.7, 1), moss)); m.scale.set(1.6, 0.3, 1.1); m.position.set(mp.x, mp.y + 0.7, mp.z); m.rotation.y = a; g.add(m);
    }
    /* musgo no tronco */
    for (let i = 0; i < 16; i++) { const a = rnd() * TAU, y = 1.5 + rnd() * 7, rr = 3.1 * (1 + 1.25 * Math.exp(-y / 2.6)) * (1 - 0.34 * smooth(2, 24, y)) * 0.97, m = shadowy(new T.Mesh(new T.IcosahedronGeometry(0.55 + rnd() * 0.4, 1), moss)); m.scale.set(1, 0.55, 1); m.position.set(Math.cos(a) * rr + Math.sin(y * 0.14) * 1.1, y, Math.sin(a) * rr + Math.sin(y * 0.1 + 1) * 0.7); g.add(m); }
    /* corda sagrada com papéis */
    const ropeY = 5.2, ropeR = 3.1 * (1 + 1.25 * Math.exp(-ropeY / 2.6)) * (1 - 0.34 * smooth(2, 24, ropeY)) + 0.28;
    const rope = shadowy(new T.Mesh(new T.TorusGeometry(ropeR, 0.17, 8, 56), std('#e9dcb4', 1))); rope.rotation.x = Math.PI / 2; rope.position.set(Math.sin(ropeY * 0.14) * 1.1, ropeY, Math.sin(ropeY * 0.1 + 1) * 0.7); g.add(rope);
    const shideMat = new T.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9, side: T.DoubleSide, emissive: new T.Color('#ffffff'), emissiveIntensity: 0.08 }), shide = [];
    for (let i = 0; i < 9; i++) { const a = i / 9 * TAU + 0.2, sh = new T.Group(); for (let j = 0; j < 3; j++) { const q = new T.Mesh(new T.PlaneGeometry(0.28, 0.34), shideMat); q.position.set(0, -0.2 - j * 0.34, 0); q.rotation.z = (j % 2 ? 0.25 : -0.25); sh.add(q); } sh.position.set(rope.position.x + Math.cos(a) * ropeR, ropeY - 0.1, rope.position.z + Math.sin(a) * ropeR); sh.rotation.y = -a + Math.PI / 2; g.add(sh); shide.push({ g: sh, ph: rnd() * 6 }); }
    /* galhos grandes e copa */
    const canopy = new T.Group(); canopy.position.y = 14; g.add(canopy);
    const pal = ['#f4a9c6', '#f8c4d8', '#f0a0bf', '#fbd6e4', '#e98cb0', '#f7b6cf'], leafMats = pal.map(c => new T.MeshStandardMaterial({ color: c, roughness: 0.92, emissive: new T.Color('#ff7aa8'), emissiveIntensity: 0.04 }));
    const blobGeo = new T.IcosahedronGeometry(1, 2), bp = blobGeo.attributes.position, bn = blobGeo.attributes.normal; for (let i = 0; i < bp.count; i++) { const l = Math.hypot(bp.getX(i), bp.getY(i), bp.getZ(i)) || 1; bn.setXYZ(i, bp.getX(i) / l, bp.getY(i) / l, bp.getZ(i) / l); const f = 1 + 0.16 * Math.sin(bp.getX(i) * 5.1 + bp.getY(i) * 3.3) * Math.cos(bp.getZ(i) * 4.4); bp.setXYZ(i, bp.getX(i) * f, bp.getY(i) * f, bp.getZ(i) * f); }
    const blobs = [];
    for (let i = 0; i < 54; i++) {
      const a = rnd() * TAU, rr = Math.sqrt(rnd()) * 16, y = 3.5 + (1 - Math.pow(rr / 16, 2)) * 8 + rnd() * 3.5, s2 = 3.1 + rnd() * 2.6;
      const m = shadowy(new T.Mesh(blobGeo, leafMats[i % 6]), true, false); m.scale.set(s2, s2 * 0.78, s2); m.position.set(Math.cos(a) * rr, y, Math.sin(a) * rr); m.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3); canopy.add(m); blobs.push({ m, y, ph: rnd() * 6, s: s2 });
    }
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * TAU + 0.4, L = 9 + rnd() * 5, y0 = 10.5 + (i % 3) * 2.2;
      const cur = new T.CatmullRomCurve3([new T.Vector3(Math.sin(y0 * 0.14) * 1.1, y0, Math.sin(y0 * 0.1 + 1) * 0.7), new T.Vector3(Math.cos(a) * L * 0.45, y0 + 2.2 + rnd(), Math.sin(a) * L * 0.45), new T.Vector3(Math.cos(a + 0.2) * L, y0 + 5 + rnd() * 2, Math.sin(a + 0.2) * L)]);
      g.add(shadowy(new T.Mesh(new T.TubeGeometry(cur, 14, 0.62 - i * 0.02, 7), bark)));
    }
    /* trepadeiras penduradas */
    const vines = [], vineMat = std('#4d8a52', 1);
    for (let i = 0; i < 16; i++) { const a = rnd() * TAU, rr = 6 + rnd() * 9, L = 3 + rnd() * 4.5, v = new T.Group(); v.position.set(Math.cos(a) * rr, 3.4 - rnd() * 1.5, Math.sin(a) * rr); const st = new T.Mesh(new T.CylinderGeometry(0.025, 0.03, L, 4), vineMat); st.position.y = -L / 2; v.add(st); for (let j = 0; j < 6; j++) { const lf = new T.Mesh(new T.SphereGeometry(0.1, 6, 4), vineMat); lf.scale.set(1.3, 0.5, 1); lf.position.set((j % 2 ? 1 : -1) * 0.08, -L * (0.15 + j * 0.15), 0); v.add(lf); } canopy.add(v); vines.push({ g: v, ph: rnd() * 6 }); }
    colliders.push({ x: cx + 0.3, z: cz + 0.2, r: 6.4 });  /* o tronco é largo na base (≈7 m de raio no chão): colisão só na parte baixa */
    /* estela de pedra com musgo e pedrinhas de oferenda */
    const stele = shadowy(new T.Mesh(new T.BoxGeometry(1.1, 2.3, 0.5), std('#bdb6aa', 1))); stele.position.set(Math.cos(-0.9) * 9.2, 1.15, Math.sin(-0.9) * 9.2); stele.rotation.y = 0.9 + 0.1; stele.rotation.z = 0.05; g.add(stele); colliders.push({ x: cx + stele.position.x, z: cz + stele.position.z, r: 0.6 });
    const sm = shadowy(new T.Mesh(new T.IcosahedronGeometry(0.5, 1), moss)); sm.scale.set(1.2, 0.4, 0.7); sm.position.copy(stele.position).add(new T.Vector3(0, 1.2, 0)); g.add(sm);
    for (let i = 0; i < 6; i++) { const o = shadowy(new T.Mesh(new T.IcosahedronGeometry(0.16 + rnd() * 0.1, 0), std('#d4cdc2', 1))); o.position.set(stele.position.x + (rnd() - 0.5) * 1.8 + 0.3, 0.14, stele.position.z + (rnd() - 0.5) * 1.8 + 0.5); g.add(o); }
    /* luz rosada de noite */
    const treeLight = new T.PointLight(0xff9ec4, 0, 46, 1.4); treeLight.position.set(cx, by + 11, cz); scene.add(treeLight); vlight(treeLight);
    const halo = glow(0xff9ec4, 40, 0); halo.position.set(cx, by + 17, cz); scene.add(halo);
    /* pétalas caindo devagar */
    const PN = 480, pp = new Float32Array(PN * 3), pcol = new Float32Array(PN * 3), pseed = [], pc = new T.Color();
    for (let i = 0; i < PN; i++) { const a = rnd() * TAU, rr = Math.sqrt(rnd()) * 22; pseed.push({ a, rr, y: rnd() * 24, v: 0.32 + rnd() * 0.5, sw: 0.4 + rnd() * 0.9, ph: rnd() * 6 }); pc.set(['#ffd1e3', '#ffffff', '#f9b6d0', '#ffc2da'][i % 4]); pcol[i * 3] = pc.r; pcol[i * 3 + 1] = pc.g; pcol[i * 3 + 2] = pc.b; }
    const ptex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); const gr = x.createRadialGradient(32, 32, 2, 32, 32, 28); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.save(); x.translate(32, 32); x.rotate(-0.5); x.scale(1, 0.62); x.beginPath(); x.arc(0, 0, 27, 0, TAU); x.fill(); x.restore(); return new T.CanvasTexture(c); })();
    const pg = new T.BufferGeometry(); pg.setAttribute('position', new T.BufferAttribute(pp, 3)); pg.setAttribute('color', new T.BufferAttribute(pcol, 3));
    const petals = new T.Points(pg, new T.PointsMaterial({ map: ptex, size: 0.55, vertexColors: true, transparent: true, depthWrite: false, opacity: 0.95, sizeAttenuation: true })); petals.frustumCulled = false; scene.add(petals);
    /* chão de pétalas ao redor */
    for (let i = 0; i < 90; i++) { const a = rnd() * TAU, rr = 4 + rnd() * 17, x = cx + Math.cos(a) * rr, z = cz + Math.sin(a) * rr, h = groundH(x, z); const d = new T.Mesh(new T.CircleGeometry(0.1 + rnd() * 0.08, 6), new T.MeshBasicMaterial({ color: ['#ffd1e3', '#f9b6d0', '#ffffff'][i % 3], side: T.DoubleSide, fog: true })); d.rotation.x = -Math.PI / 2; d.rotation.z = rnd() * 3; d.position.set(x, h + 0.04, z); scene.add(d); }
    /* o banco, de frente para a árvore */
    const bx = cx - 13.2, bz = cz + 4.6; makeBench(bx, bz, Math.atan2(cx - bx, cz - bz), cx, cz); const tb = BENCHES[BENCHES.length - 1]; tb.pitch = -0.28; tb.zoom = 0.85; tb.ty = 10;
    lantern(bx - 1.3, bz - 1.3, 2.3); lantern(bx + 1.2, bz + 2.2, 2.3);
    /* caminho de pedras: ponte -> banco */
    for (let k = 0; k < 11; k++) { const u = k / 10, x = lerp(ISL.T.x - 21.5, bx - 0.8, u) + Math.sin(u * 5) * 0.4, z = lerp(0, bz - 1.6, u) , m = shadowy(new T.Mesh(new T.CylinderGeometry(0.5 + rnd() * 0.1, 0.56, 0.14, 9), std('#e7dfd0', 1)), false, true); m.position.set(x, groundH(x, z) + 0.05, z); m.rotation.y = rnd() * 3; scene.add(m); }
    /* árvores pequenas de flor ao redor da ilha */
    for (let k = 0, tr = 0; k < 14 && tr < 400; tr++) { const a = rnd() * TAU, rr = 19 + rnd() * 3.2, x = cx + Math.cos(a) * rr, z = cz + Math.sin(a) * rr; if (!onLand(I, x, z, 0.8) || DECKS.some(d => Math.hypot(x - d.x - Math.cos(d.ang) * 10, z - d.z - Math.sin(d.ang) * 10) < 7)) continue; makeTree(x, z, 0.65 + rnd() * 0.35, 'blossom'); k++; }
    for (let k = 0, tr = 0; k < 24 && tr < 500; tr++) { const a = rnd() * TAU, rr = 8 + rnd() * 14, x = cx + Math.cos(a) * rr, z = cz + Math.sin(a) * rr; if (!onLand(I, x, z, 0.8) || Math.hypot(x - bx, z - bz) < 3.5) continue; const b = shadowy(new T.Mesh(new T.IcosahedronGeometry(0.4 + rnd() * 0.35, 1), std(['#7ed39a', '#9be08a', '#f6b6cf'][k % 3], 1))); b.position.set(x, groundH(x, z) + 0.25, z); b.scale.y = 0.7; scene.add(b); k++; }
    bio.tick.push((dt, t, night) => {
      const near = Math.hypot(P.x - cx, P.z - cz) < 85; petals.visible = near; if (!near) return;
      const wind = Math.sin(t * 0.3) * 0.5 + 0.5;
      canopy.rotation.z = Math.sin(t * 0.33) * 0.011 + Math.sin(t * 0.8) * 0.004; canopy.rotation.x = Math.sin(t * 0.27 + 1.3) * 0.009;
      for (const b of blobs) { b.m.position.y = b.y + Math.sin(t * 0.7 + b.ph) * 0.12; b.m.rotation.y += dt * 0.02; }
      for (const v of vines) v.g.rotation.z = Math.sin(t * 0.7 + v.ph) * 0.07 + Math.sin(t * 0.3) * 0.03;
      for (const s of shide) s.g.rotation.x = Math.sin(t * 1.1 + s.ph) * 0.12;
      for (const m of leafMats) m.emissiveIntensity = 0.04 + night * 0.28;
      treeLight.intensity = night * 3.2; halo.material.opacity = night * 0.35; shideMat.emissiveIntensity = 0.08 + night * 0.6;
      for (let i = 0; i < PN; i++) {
        const s = pseed[i]; s.y -= s.v * dt; s.a += dt * 0.03;
        if (s.y < 0.3) { s.y = 20 + Math.random() * 6; s.rr = Math.sqrt(Math.random()) * 22; s.a = Math.random() * TAU; }
        const sx = Math.sin(t * s.sw + s.ph) * 0.9 + wind * s.y * 0.05, sz = Math.cos(t * s.sw * 0.8 + s.ph) * 0.7;
        pp[i * 3] = cx + Math.cos(s.a) * s.rr + sx; pp[i * 3 + 1] = by + 0.3 + s.y; pp[i * 3 + 2] = cz + Math.sin(s.a) * s.rr + sz;
      }
      pg.attributes.position.needsUpdate = true;
    });
  })();

  /* ====== ILHA NEVADA ====== */
  (() => {
    const I = ISL.N, cx = I.x, cz = I.z;
    const pine = (x, z, s) => {
      const g = new T.Group(), y = groundH(x, z); g.position.set(x, y, z);
      const tr = shadowy(new T.Mesh(new T.CylinderGeometry(0.14 * s, 0.2 * s, 1.1 * s, 6), std('#7b5d4f', 1))); tr.position.y = 0.55 * s; g.add(tr);
      const gm = std(rnd() < 0.5 ? '#2f7a73' : '#3b8c84', 0.95), sm = std('#ffffff', 1);
      for (let i = 0; i < 4; i++) { const r = (1.5 - i * 0.28) * s, h = (1.7 - i * 0.12) * s, c = shadowy(new T.Mesh(new T.ConeGeometry(r, h, 9), gm)); c.position.y = (1.25 + i * 0.95) * s; g.add(c); const cap = shadowy(new T.Mesh(new T.ConeGeometry(r * 0.78, h * 0.5, 9), sm)); cap.position.y = (1.25 + i * 0.95) * s + h * 0.28; g.add(cap); }
      scene.add(g); colliders.push({ x, z, r: 0.5 * s });
    };
    for (let k = 0, tr = 0; k < 30 && tr < 900; tr++) { const a = rnd() * TAU, rr = 4 + rnd() * 17, x = cx + Math.cos(a) * rr, z = cz + Math.sin(a) * rr; if (!onLand(I, x, z, 0.9) || Math.hypot(x - cx - 7, z - cz + 4) < 7.5 || Math.hypot(x - cx + 8, z - cz - 6) < 5 || Math.hypot(x - cx - 2, z - cz - 9) < 3) continue; pine(x, z, 0.8 + rnd() * 0.9); k++; }
    for (let k = 0, tr = 0; k < 14 && tr < 400; tr++) { const a = rnd() * TAU, rr = 5 + rnd() * 16, x = cx + Math.cos(a) * rr, z = cz + Math.sin(a) * rr; if (!onLand(I, x, z, 0.9) || Math.hypot(x - cx - 7, z - cz + 4) < 7) continue; const m = shadowy(new T.Mesh(new T.DodecahedronGeometry(0.6 + rnd() * 0.6, 0), std('#e9f2fa', 0.9))); m.position.set(x, groundH(x, z) + 0.15, z); m.scale.set(1.3, 0.7, 1); m.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3); scene.add(m); colliders.push({ x, z, r: 0.7 }); k++; }
    /* lago congelado */
    const iceM = new T.MeshStandardMaterial({ color: '#cdeeff', roughness: 0.12, metalness: 0.25, emissive: new T.Color('#7fb8e0'), emissiveIntensity: 0.05 });
    const ice = new T.Mesh(new T.CylinderGeometry(5, 5, 0.06, 40), iceM); ice.position.set(cx + 7, groundH(cx + 7, cz - 4) + 0.03, cz - 4); ice.receiveShadow = true; scene.add(ice);
    /* iglu */
    const ig = new T.Group(), ix = cx - 8, iz = cz + 6; ig.position.set(ix, groundH(ix, iz), iz); const sn = std('#f3f8ff', 0.95);
    ig.add(shadowy(new T.Mesh(new T.SphereGeometry(2.6, 20, 12, 0, TAU, 0, Math.PI / 2), sn)));
    const bulge = shadowy(new T.Mesh(new T.SphereGeometry(1.1, 14, 8, 0, TAU, 0, Math.PI / 2), sn)); bulge.scale.set(1, 0.9, 1.3); bulge.position.set(0, 0, 2.4); ig.add(bulge);
    const door = new T.Mesh(new T.CircleGeometry(0.62, 16), new T.MeshStandardMaterial({ color: '#ffd9a0', emissive: new T.Color('#ffb15a'), emissiveIntensity: 0.4 })); door.position.set(0, 0.62, 3.53); ig.add(door); nightMats.push({ m: door.material, base: 0.4, k: 2.2 });
    scene.add(ig); colliders.push({ x: ix, z: iz, r: 2.6 });
    const iglow = new T.PointLight(0xffb870, 0, 12, 1.8); iglow.position.set(ix, groundH(ix, iz) + 1.2, iz + 3.4); scene.add(iglow); vlight(iglow);
    /* boneco de neve */
    const sx = cx + 2, sz = cz + 9.5, sg = new T.Group(); sg.position.set(sx, groundH(sx, sz), sz); const wm = std('#ffffff', 0.9);
    [[0.78, 0.7], [0.58, 1.8], [0.42, 2.65]].forEach(([r, y]) => { const b = shadowy(new T.Mesh(new T.SphereGeometry(r, 16, 12), wm)); b.position.y = y; sg.add(b); });
    const nose = new T.Mesh(new T.ConeGeometry(0.07, 0.4, 8), std('#ff9a4a', 0.8)); nose.rotation.x = Math.PI / 2; nose.position.set(0, 2.68, 0.46); sg.add(nose);
    [-1, 1].forEach(q => { const e = new T.Mesh(new T.SphereGeometry(0.05, 6, 4), std('#222', 1)); e.position.set(q * 0.15, 2.76, 0.37); sg.add(e); const arm = new T.Mesh(new T.CylinderGeometry(0.03, 0.03, 1.1, 4), std('#6b4a3a', 1)); arm.position.set(q * 0.75, 1.95, 0); arm.rotation.z = q * 1.0; sg.add(arm); });
    const scarf = new T.Mesh(new T.TorusGeometry(0.42, 0.1, 8, 20), std('#ff8fa8', 0.9)); scarf.rotation.x = Math.PI / 2; scarf.position.y = 2.28; sg.add(scarf); const tail = new T.Mesh(new T.BoxGeometry(0.16, 0.6, 0.06), std('#ff8fa8', 0.9)); tail.position.set(0.25, 2.0, 0.36); sg.add(tail);
    scene.add(sg); colliders.push({ x: sx, z: sz, r: 0.7 });
    /* aurora */
    const am = new T.ShaderMaterial({ transparent: true, depthWrite: false, side: T.DoubleSide, blending: T.AdditiveBlending, fog: false, uniforms: { uT: { value: 0 }, uN: { value: 0 } },
      vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: `uniform float uT,uN;varying vec2 vUv;
        void main(){float x=vUv.x*34.,y=vUv.y;float c=.5+.5*sin(x+sin(x*.37+uT*.4)*2.2+uT*.3);c*=.55+.45*sin(x*.53-uT*.5);
          float v=smoothstep(0.,.18,y)*(1.-smoothstep(.45,1.,y));vec3 col=mix(vec3(.2,1.,.55),vec3(.55,.35,1.),smoothstep(.15,.95,y));
          gl_FragColor=vec4(col,c*v*.42*uN);}` });
    const aur = [];
    for (let i = 0; i < 3; i++) { const geo = new T.PlaneGeometry(140, 46, 48, 1), q = geo.attributes.position; for (let j = 0; j < q.count; j++) q.setZ(j, Math.sin(q.getX(j) * 0.05 + i) * 14); const m = new T.Mesh(geo, am); m.position.set(cx - 18 + i * 14, 62 + i * 6, cz - 38 - i * 18); m.rotation.y = 0.35 - i * 0.25; m.frustumCulled = false; m.renderOrder = -5; scene.add(m); aur.push(m); }
    /* neve caindo ao redor de quem está na ilha */
    const SN = 420, sp = new Float32Array(SN * 3), ss = []; for (let i = 0; i < SN; i++) ss.push([(Math.random() - 0.5) * 44, Math.random() * 16, (Math.random() - 0.5) * 44, 0.7 + Math.random() * 0.8, Math.random() * 6]);
    const sgm = new T.BufferGeometry(); sgm.setAttribute('position', new T.BufferAttribute(sp, 3));
    const snow = new T.Points(sgm, new T.PointsMaterial({ map: glowTex, color: 0xffffff, size: 0.3, transparent: true, depthWrite: false, opacity: 0.9 })); snow.frustumCulled = false; snow.visible = false; scene.add(snow);
    bio.snow = { on: false };
    bio.tick.push((dt, t, night) => {
      am.uniforms.uT.value = t; am.uniforms.uN.value = smooth(0.1, 0.8, night);
      iglow.intensity = night * 5; 
      const on = Math.hypot(P.x - cx, P.z - cz) < I.R * 1.25; snow.visible = on; if (!on) return;
      for (let i = 0; i < SN; i++) { const s = ss[i]; s[1] -= s[3] * dt; s[0] += Math.sin(t * 0.6 + s[4]) * 0.3 * dt; if (s[1] < 0) { s[1] += 16; } let dx = s[0] - 0, dz = s[2]; sp[i * 3] = P.x + s[0]; sp[i * 3 + 1] = P.y - 1 + s[1]; sp[i * 3 + 2] = P.z + s[2]; }
      sgm.attributes.position.needsUpdate = true;
    });
  })();

  /* ====== ILHA DAS DUNAS ====== */
  (() => {
    const I = ISL.D, cx = I.x, cz = I.z, sandStone = std('#dbc8a4', 1), warm = std('#c9b08a', 1);
    const palm = (x, z, s) => {
      const g = new T.Group(), y = groundH(x, z); g.position.set(x, y, z); g.rotation.y = rnd() * TAU; const lean = 0.5 + rnd() * 0.5, H = 5 * s;
      const cur = new T.CatmullRomCurve3([new T.Vector3(0, 0, 0), new T.Vector3(lean * 0.35, H * 0.5, 0), new T.Vector3(lean * 1.3, H, 0)]);
      g.add(shadowy(new T.Mesh(new T.TubeGeometry(cur, 12, 0.2 * s, 7), std('#9b7a56', 1))));
      const top = cur.getPoint(1), fm = new T.MeshStandardMaterial({ color: '#58b06a', roughness: 0.85, side: T.DoubleSide });
      for (let i = 0; i < 8; i++) { const a = i / 8 * TAU, geo = new T.PlaneGeometry(0.9 * s, 3.4 * s, 2, 6), q = geo.attributes.position; for (let j = 0; j < q.count; j++) { const yy = (q.getY(j) + 1.7 * s) / (3.4 * s); q.setZ(j, yy * yy * 1.4 * s); q.setX(j, q.getX(j) * (1 - yy * 0.6)); } geo.translate(0, 1.7 * s, 0); const f = shadowy(new T.Mesh(geo, fm)); f.position.copy(top); f.rotation.set(0.2, a, 0); f.rotation.order = 'YXZ'; f.rotation.x = 0.95 + rnd() * 0.2; g.add(f); }
      for (let i = 0; i < 3; i++) { const c = new T.Mesh(new T.SphereGeometry(0.16 * s, 8, 6), std('#7a5a3a', 1)); c.position.set(top.x + Math.cos(i * 2.1) * 0.25, top.y - 0.15, Math.sin(i * 2.1) * 0.25); g.add(c); }
      scene.add(g); colliders.push({ x, z, r: 0.4 });
    };
    const ox = cx - 3, oz = cz + 2;
    for (let k = 0; k < 9; k++) { const a = k / 9 * TAU + rnd() * 0.4, rr = 5 + rnd() * 3, x = ox + Math.cos(a) * rr, z = oz + Math.sin(a) * rr; if (onLand(I, x, z, 0.3)) palm(x, z, 0.9 + rnd() * 0.5); }
    const pond = new T.Mesh(new T.CylinderGeometry(4.2, 4.2, 0.05, 36), new T.MeshStandardMaterial({ color: '#5fd7d0', roughness: 0.15, metalness: 0.1, emissive: new T.Color('#2aa6b0'), emissiveIntensity: 0.08, transparent: true, opacity: 0.92 })); pond.position.set(ox, groundH(ox, oz) + 0.03, oz); scene.add(pond);
    const cactus = (x, z, s) => {
      const g = new T.Group(), y = groundH(x, z), gm = std('#5fae6e', 0.9); g.position.set(x, y, z);
      const body = shadowy(new T.Mesh(new T.CapsuleGeometry(0.3 * s, 1.5 * s, 4, 10), gm)); body.position.y = 0.95 * s; g.add(body);
      [-1, 1].forEach((q, i) => { const arm = shadowy(new T.Mesh(new T.CapsuleGeometry(0.17 * s, (0.6 + i * 0.25) * s, 4, 8), gm)); arm.position.set(q * 0.5 * s, (1.0 + i * 0.25) * s, 0); g.add(arm); const lk = shadowy(new T.Mesh(new T.CapsuleGeometry(0.14 * s, 0.22 * s, 3, 8), gm)); lk.rotation.z = Math.PI / 2; lk.position.set(q * 0.38 * s, (0.72 + i * 0.25) * s, 0); g.add(lk); });
      const fl = new T.Mesh(new T.IcosahedronGeometry(0.15 * s, 0), std('#ff8fb8', 0.7)); fl.position.set(0, 1.9 * s, 0); g.add(fl);
      scene.add(g); colliders.push({ x, z, r: 0.45 * s });
    };
    for (let k = 0, tr = 0; k < 11 && tr < 500; tr++) { const a = rnd() * TAU, rr = 6 + rnd() * 16, x = cx + Math.cos(a) * rr, z = cz + Math.sin(a) * rr; if (!onLand(I, x, z, 0.5) || Math.hypot(x - ox, z - oz) < 8 || Math.hypot(x - cx - 10, z - cz + 8) < 7) continue; cactus(x, z, 0.8 + rnd() * 0.6); k++; }
    for (let k = 0, tr = 0; k < 12 && tr < 400; tr++) { const a = rnd() * TAU, rr = 5 + rnd() * 18, x = cx + Math.cos(a) * rr, z = cz + Math.sin(a) * rr; if (!onLand(I, x, z, 0.5) || Math.hypot(x - ox, z - oz) < 6) continue; const m = shadowy(new T.Mesh(new T.DodecahedronGeometry(0.5 + rnd() * 0.7, 0), warm)); m.position.set(x, groundH(x, z) + 0.12, z); m.scale.set(1.3, 0.6, 1); m.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3); scene.add(m); colliders.push({ x, z, r: 0.65 }); k++; }
    /* ruínas com símbolos que brilham */
    const rx = cx + 10, rz = cz - 8, rg = new T.Group(); rg.position.set(rx, groundH(rx, rz), rz); scene.add(rg);
    const runeM = new T.MeshStandardMaterial({ color: '#ffe9a8', emissive: new T.Color('#ffc65a'), emissiveIntensity: 0.25, roughness: 0.5 }); nightMats.push({ m: runeM, base: 0.25, k: 3 });
    [-3.2, 3.2].forEach(q => { const p = shadowy(new T.Mesh(new T.BoxGeometry(1.2, 5.4, 1.2), sandStone)); p.position.set(q, 2.7, 0); rg.add(p); for (let j = 0; j < 3; j++) { const r = new T.Mesh(new T.BoxGeometry(0.5, 0.12, 0.05), runeM); r.position.set(q, 1.6 + j * 1.1, 0.62); rg.add(r); } colliders.push({ x: rx + q, z: rz, r: 0.8 }); });
    const lintel = shadowy(new T.Mesh(new T.BoxGeometry(8, 1.1, 1.3), sandStone)); lintel.position.set(0, 5.9, 0); rg.add(lintel); const arch = new T.Mesh(new T.TorusGeometry(0.9, 0.08, 6, 24), runeM); arch.position.set(0, 3.2, 0.7); rg.add(arch);
    for (let i = 0; i < 4; i++) { const c = shadowy(new T.Mesh(new T.CylinderGeometry(0.5, 0.56, 1.4 + rnd() * 1.4, 10), sandStone)); c.position.set(-6 + i * 2.6 + rnd(), 0.4, 3 + rnd() * 3); c.rotation.set((rnd() - 0.5) * 1.2, rnd() * 3, (rnd() - 0.5) * 1.2); rg.add(c); }
    const orb = new T.Mesh(new T.IcosahedronGeometry(0.4, 1), new T.MeshStandardMaterial({ color: '#fff1c4', emissive: new T.Color('#ffc65a'), emissiveIntensity: 1.1, roughness: 0.3 })); orb.position.set(0, 3.2, 0); rg.add(orb);
    const og = glow(0xffc65a, 3.5, 0.6); og.position.copy(orb.position); rg.add(og);
    bio.tick.push((dt, t, night) => { orb.position.y = 3.2 + Math.sin(t * 1.2) * 0.2; orb.rotation.y = t * 0.6; og.position.y = orb.position.y; og.material.opacity = 0.4 + night * 0.5; });
  })();

  function isleStep(dt, t) {
    const night = nightF; for (const f of bio.tick) f(dt, t, night);
    for (const n of nightMats) n.m.emissiveIntensity = n.base + night * n.k;
    for (let i = 0; i < dockBoats.length; i++) { const b = dockBoats[i]; b.position.y = Math.sin(t * 1.1 + i) * 0.05 - 0.02; b.rotation.z = Math.sin(t * 0.9 + i) * 0.03; }
    /* dica de tecla */
    let txt = ''; if (!P.sit && !boatOpen) { if (boatNear()) txt = 'E · viajar de barco'; else if (XC.hint && (txt = XC.hint())) { } else if (nearestBench()) txt = 'E · sentar'; else txt = ''; }
    if (txt !== isleStep.t) { isleStep.t = txt; promptEl.textContent = txt; promptEl.style.display = txt ? 'block' : 'none'; }
  }

  /* ───────── capim, flores e luzinhas ───────── */
  const windU = { value: 0 }; let grassChunks = [];
  (() => {
    const geo = new T.ConeGeometry(0.07, 0.62, 3, 2, true); geo.translate(0, 0.31, 0);
    const mat = new T.MeshLambertMaterial({ color: 0xffffff });
    mat.onBeforeCompile = sh => {
      sh.uniforms.uWind = windU;
      sh.vertexShader = 'uniform float uWind;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
        vec3 ip=vec3(instanceMatrix[3][0],0.,instanceMatrix[3][2]);float k=pow(position.y/.62,1.6);
        transformed.x+=sin(uWind*1.6+ip.x*.45+ip.z*.3)*.2*k;transformed.z+=cos(uWind*1.3+ip.z*.5)*.14*k;`);
    };
    const MAXN = 30000, m4 = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), c = new T.Color(); let n = 0; const gpos = [], gcol = [];
    const cA = new T.Color('#79c98b'), cB = new T.Color('#b3e58f'), cC = new T.Color('#5db07f');
    for (let t = 0; t < 150000 && n < MAXN; t++) {
      const a = rnd() * TAU, d = Math.sqrt(rnd()) * 57, x = Math.cos(a) * d, z = Math.sin(a) * d, h = baseH(x, z);
      if (h < 0.55 || inCorridor(x, z, 0.9) || resv(x, z, -1.6) || Math.hypot(x - PLAT.x, z - PLAT.z) < PLAT.r + 1.4 || (z < -2.5 && z > -9 && Math.abs(x) < 1.8)) continue;
      e.set((rnd() - 0.5) * 0.3, rnd() * TAU, (rnd() - 0.5) * 0.3); q.setFromEuler(e);
      const s = 0.7 + rnd() * 0.7; m4.compose(new T.Vector3(x, h - 0.02, z), q, new T.Vector3(s, s * (0.45 + rnd() * 0.4), s)); gpos.push(m4.clone(), x, z); c.copy(cA).lerp(cB, rnd()).lerp(cC, rnd() * 0.4); gcol.push(c.clone()); n++;
    }
    /* a grama vira blocos de 19 m: o que está fora da tela ou longe demais nem é desenhado */
    const CELL = 19, cells = new Map();
    for (let i = 0; i < n; i++) { const x = gpos[i * 3 + 1], z = gpos[i * 3 + 2], k = Math.floor(x / CELL) + ',' + Math.floor(z / CELL); let a = cells.get(k); if (!a) cells.set(k, a = []); a.push(i); }
    grassChunks = [];
    for (const [, ids] of cells) {
      const im = new T.InstancedMesh(geo, mat, ids.length); let sx = 0, sz = 0;
      ids.forEach((id, j) => { im.setMatrixAt(j, gpos[id * 3]); im.setColorAt(j, gcol[id]); sx += gpos[id * 3 + 1]; sz += gpos[id * 3 + 2]; });
      im.receiveShadow = true; const ccx = sx / ids.length, ccz = sz / ids.length; let rr = 1; ids.forEach(id => { rr = Math.max(rr, Math.hypot(gpos[id * 3 + 1] - ccx, gpos[id * 3 + 2] - ccz)); }); im.frustumCulled = false; im.userData.sph = new T.Sphere(new T.Vector3(ccx, 0.5, ccz), rr + 1.5); scene.add(im); grassChunks.push(im);
    }
    /* flores */
    const fg = new T.IcosahedronGeometry(0.11, 0), fm = new T.MeshStandardMaterial({ roughness: 0.7, emissive: 0x000000 }), FN = 1500, fi = new T.InstancedMesh(fg, fm, FN);
    const fc = ['#ffffff', '#ffd1e3', '#ffe28a', '#c7b8ff', '#ffb4a8']; let k = 0;
    for (let t = 0; t < 12000 && k < FN; t++) {
      const a = rnd() * TAU, d = Math.sqrt(rnd()) * 54, x = Math.cos(a) * d, z = Math.sin(a) * d, h = baseH(x, z);
      if (h < 0.6 || inCorridor(x, z, 0.8) || Math.hypot(x - PLAT.x, z - PLAT.z) < PLAT.r + 0.5) continue;
      m4.compose(new T.Vector3(x, h + 0.22 + rnd() * 0.12, z), q.identity(), new T.Vector3(1, 1, 1).multiplyScalar(0.8 + rnd() * 0.8)); fi.setMatrixAt(k, m4); c.set(fc[(rnd() * 5) | 0]); fi.setColorAt(k, c); k++;
    }
    fi.count = k; scene.add(fi);
  })();

  /* vaga-lumes (noite) e borboletas (dia) */
  const flies = (() => {
    const N = 220, g = new T.BufferGeometry(), pos = new Float32Array(N * 3), seed = [];
    for (let i = 0; i < N; i++) { const a = rnd() * TAU, d = Math.sqrt(rnd()) * 50; seed.push([a, d, 0.8 + rnd() * 3, rnd() * 9, 0.3 + rnd() * 0.7]); }
    g.setAttribute('position', new T.BufferAttribute(pos, 3));
    const m = new T.PointsMaterial({ map: glowTex, color: 0xd8ff9a, size: 0.55, transparent: true, depthWrite: false, blending: T.AdditiveBlending, opacity: 0 });
    const p = new T.Points(g, m); p.frustumCulled = false; scene.add(p); return { p, seed, pos, g, m };
  })();
  const butter = [];
  for (let i = 0; i < 16; i++) {
    const g = new T.Group(), mat = new T.MeshBasicMaterial({ color: ['#ffd1e3', '#ffe28a', '#c7e8ff'][i % 3], side: T.DoubleSide, transparent: true, opacity: 0.95 });
    const w1 = new T.Mesh(new T.CircleGeometry(0.16, 8), mat), w2 = new T.Mesh(new T.CircleGeometry(0.16, 8), mat); w1.position.x = -0.15; w2.position.x = 0.15; g.add(w1, w2);
    g.userData = { a: rnd() * TAU, d: 4 + rnd() * 42, sp: 0.15 + rnd() * 0.2, h: 1.1 + rnd() * 1.3, w1, w2, ph: rnd() * 9 }; butter.push(g); scene.add(g);
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

  /* ───────── personagem: uma viajante de proporções delicadas ───────── */
  /* ───────── personagem: Lyra (modelo do próprio usuário, convertido de FBX para GLB) ───────── */
  const LS = 0.0145;                       /* cm do modelo -> unidades do mundo (≈1,75 de altura) */
  const hero = { g: new T.Group(), ready: false, B: {}, rest: {} };
  scene.add(hero.g);
  let heroReady = false; const heroQ = [];
  const tq = new T.Quaternion(), tq2 = new T.Quaternion(), te = new T.Euler(), tv = new T.Vector3(), tv2 = new T.Vector3(), tm = new T.Matrix4(), ts = new T.Vector3();
  const SIDE = { L: 1, R: -1 };            /* o lado esquerdo da Lyra fica no +x */
  /* gira um osso no espaço do personagem (x = lado, y = cima, z = frente), relativo ao pai na pose de repouso */
  function rb(name, x, y, z) {
    const r = hero.rest[name]; if (!r) return;
    te.set(x, y, z, 'XYZ'); tq.setFromEuler(te); tq2.copy(r.pqi).multiply(tq).multiply(r.pq); r.b.quaternion.copy(tq2).multiply(r.q);
  }
  function rbq(name, q) { const r = hero.rest[name]; if (!r) return; tq2.copy(r.pqi).multiply(q).multiply(r.pq); r.b.quaternion.copy(tq2).multiply(r.q); }
  /* desloca um osso (em cm, no espaço do personagem) */
  function mb(name, dx, dy, dz) {
    const r = hero.rest[name]; if (!r) return; tv.set(dx, dy, dz).multiplyScalar(LS).applyQuaternion(r.pqi).divideScalar(r.ps); r.b.position.copy(r.p).add(tv);
  }
  /* prende um objeto a um osso: pos em cm no espaço do personagem, k = tamanho do mundo por unidade do objeto */
  function attachTo(bone, obj, pos, k) {
    const r = hero.rest[bone]; if (!r) return false;
    tm.compose(tv2.set(pos[0] * LS, pos[1] * LS, pos[2] * LS), tq.identity(), ts.setScalar(k)); tm.premultiply(r.inv); tm.decompose(obj.position, obj.quaternion, obj.scale); r.b.add(obj); return true;
  }
  const gradTex = (() => { const t = new T.DataTexture(new Uint8Array([140, 200, 255]), 3, 1, T.RedFormat); t.minFilter = t.magFilter = T.NearestFilter; t.generateMipmaps = false; t.needsUpdate = true; return t; })();
  const toonU = { uRim: { value: new T.Color(0.55, 0.6, 0.9) }, uNight: U.uNight };
  function toonMat(src, extra) {
    const m = new T.MeshToonMaterial(Object.assign({ map: src.map || null, color: src.color ? src.color.clone() : new T.Color(0xffffff), gradientMap: gradTex, emissiveMap: src.map || null, emissive: new T.Color(0.2, 0.2, 0.22) }, extra));
    if (src.emissive && src.emissive.getHex()) { m.emissive.copy(src.emissive); m.emissiveIntensity = src.emissiveIntensity || 1; }
    m.onBeforeCompile = sh => {
      sh.uniforms.uRim = toonU.uRim; sh.uniforms.uNight = toonU.uNight;
      sh.fragmentShader = 'uniform vec3 uRim;uniform float uNight;\n' + sh.fragmentShader.replace('#include <output_fragment>', '#include <output_fragment>\nfloat rimF=pow(1.-saturate(dot(normalize(normal),normalize(vViewPosition))),3.);gl_FragColor.rgb+=uRim*rimF*(.3-.12*uNight);');
    };
    return m;
  }
  function outlineMat(src, col, w) {
    const m = new T.MeshBasicMaterial({ map: src.map || null, color: col, alphaTest: src.alphaTest || 0, side: T.BackSide });
    m.onBeforeCompile = sh => { sh.vertexShader = sh.vertexShader.replace('#include <skinning_vertex>', '#include <skinning_vertex>\ntransformed+=normalize(objectNormal)*' + w.toFixed(5) + ';'); };
    return m;
  }
  /* tudo que a Lyra veste (acessórios, capas) também ganha o visual de desenho animado */
  function toonify(root) {
    root.traverse(o => { if (o.material && o.material.isMeshStandardMaterial) { const old = o.material, m = toonMat(old, { transparent: old.transparent, opacity: old.opacity, side: old.side, depthWrite: old.depthWrite }); o.material = m; } });
  }
  const loader = new T.GLTFLoader();
  loader.load('Lyra.glb', gl => {
    const root = gl.scene; root.scale.setScalar(LS); hero.g.add(root); hero.root = root;
    root.traverse(n => {
      if (n.isBone) hero.B[n.name] = n;
      if (n.isSkinnedMesh) {
        const m = n.material; n.frustumCulled = false; n.castShadow = true; n.receiveShadow = true;
        const isFace = /face/i.test(n.name), tm2 = toonMat(m, { alphaTest: 0.5, side: m.side });
        const ol = new T.SkinnedMesh(n.geometry, outlineMat(m, new T.Color(isFace ? 0x6a4048 : 0x2a1c30), isFace ? 0.0016 : 0.0021)); ol.bind(n.skeleton, n.bindMatrix); ol.frustumCulled = false; ol.position.copy(n.position); ol.quaternion.copy(n.quaternion); ol.scale.copy(n.scale); ol.renderOrder = -1; n.parent.add(ol);
        n.material = tm2;
        if (n.morphTargetDictionary && n.morphTargetInfluences && n.morphTargetInfluences.length) { exMeshes.push({ m: n, ol }); }
      }
    });
    initEx();
    hero.g.updateMatrixWorld(true); const gInv = new T.Matrix4().copy(hero.g.matrixWorld).invert();
    for (const name in hero.B) {
      const b = hero.B[name], pm = tm.copy(gInv).multiply(b.parent.matrixWorld), pq = new T.Quaternion(), ps = new T.Vector3(), pp = new T.Vector3(); pm.decompose(pp, pq, ps);
      const wm = new T.Matrix4().copy(gInv).multiply(b.matrixWorld);
      hero.rest[name] = { b, q: b.quaternion.clone(), p: b.position.clone(), pq, pqi: pq.clone().invert(), ps: ps.x, inv: wm.clone().invert() };
    }
    initSprings(); heroReady = true; hero.ready = true;
    while (heroQ.length) heroQ.shift()();
    applyCos(); $('load').classList.add('off');
  }, null, err => { $('msg').textContent = 'Não consegui carregar a personagem (Lyra.glb).'; $('msg').style.display = 'grid'; $('load').classList.add('off'); });


  /* expressões (piscar, boca na música, sorriso). Só funcionam se o modelo tiver morph targets / blendshapes
     (um .vrm do VRoid tem; o FBX enviado não tinha). Sem eles, fica dormente e não faz nada. */
  const exMeshes = [], EX = { map: {}, on: false, st: {}, blinkT: 2.5, blinkP: -1 };
  function initEx() {
    if (!exMeshes.length) return;
    const find = re => { const out = []; for (const e of exMeshes) for (const k in e.m.morphTargetDictionary) if (re.test(k)) out.push([e, e.m.morphTargetDictionary[k]]); return out; };
    EX.map = { blink: find(/eye.*close|blink/i), a: find(/mth.*_a$|^a$|viseme_aa|vowel.?a/i), o: find(/mth.*_o$|^o$|viseme_oh/i), joy: find(/all.*joy|^joy$|happy/i), fun: find(/all.*fun/i) };
    EX.on = Object.values(EX.map).some(v => v.length);
    EX.names = exMeshes.map(e => Object.keys(e.m.morphTargetDictionary));
  }
  function exSet(list, v) { for (const [e, i] of list) { e.m.morphTargetInfluences[i] = v; if (e.ol) { e.ol.morphTargetInfluences = e.m.morphTargetInfluences; e.ol.morphTargetDictionary = e.m.morphTargetDictionary; } } }
  function exStep(dt, t) {
    if (!EX.on) return;
    const sm = (k, tg, sp) => { EX.st[k] = (EX.st[k] || 0) + (tg - (EX.st[k] || 0)) * Math.min(1, sp * dt); return EX.st[k]; };
    EX.blinkT -= dt; if (EX.blinkT <= 0 && EX.blinkP < 0) EX.blinkP = 0;
    let bl = 0; if (EX.blinkP >= 0) { EX.blinkP += dt / 0.16; bl = Math.sin(Math.min(EX.blinkP, 1) * Math.PI); if (EX.blinkP >= 1) { EX.blinkP = -1; EX.blinkT = 2 + Math.random() * 4; } }
    if (P.sit) bl = Math.max(bl, 0.35 + 0.2 * Math.sin(t * 0.4));
    const lvl = AU.has ? Math.min(1, AU.level) : 0, hum = P.sit && AU.has;
    const joy = (PS.emote ? 0.8 : 0) + (P.sit ? 0.35 : 0.2) + (hum ? 0.15 : 0);
    exSet(EX.map.blink, bl); exSet(EX.map.a, sm('a', hum ? 0.12 + lvl * 0.12 : 0, 8)); exSet(EX.map.joy, sm('joy', Math.min(1, joy), 3)); exSet(EX.map.fun, 0);
  }

  /* cabelo: molas (inércia + rigidez + gravidade) em cada fio, na ordem do esqueleto */
  const springs = [];
  function initSprings() {
    const wp = new T.Vector3(), wp2 = new T.Vector3();
    for (let c = 1; c <= 15; c++) {
      const id = String(c).padStart(2, '0'); let k = 1, name = 'J_Sec_Hair1_' + id;
      while (hero.B[name]) {
        const b = hero.B[name], nxt = hero.B['J_Sec_Hair' + (k + 1) + '_' + id] || hero.B['J_Sec_Hair' + k + '_' + id + '_end']; if (!nxt) break;
        b.getWorldPosition(wp); nxt.getWorldPosition(wp2);
        springs.push({ b, axis: nxt.position.clone().normalize(), len: wp.distanceTo(wp2), cur: wp2.clone(), prev: wp2.clone(), q: b.quaternion.clone(), k, stiff: lerp(0.5, 0.2, (k - 1) / 4), drag: 0.4 });
        name = 'J_Sec_Hair' + (k + 1) + '_' + id; k++;
      }
    }
  }
  const sq = new T.Quaternion(), sq2 = new T.Quaternion(), sp1 = new T.Vector3(), sp2 = new T.Vector3(), sp3 = new T.Vector3(), sps = new T.Vector3(), sn = new T.Vector3();
  function springStep(dt) {
    if (!springs.length || dt <= 0) return; dt = Math.min(dt, 0.033);
    for (const s of springs) s.b.quaternion.copy(s.q);
    hero.g.updateMatrixWorld(true);
    const grav = P.sit ? 0.25 : 0.9;
    for (const s of springs) {
      const b = s.b; b.parent.matrixWorld.decompose(sp1, sq, sps); b.matrixWorld.decompose(sp2, sq2, sps);
      /* direção de repouso do fio, no mundo */
      sq2.copy(sq).multiply(s.q); sn.copy(s.axis).applyQuaternion(sq2);
      if (!s.init) { s.cur.copy(sp2).addScaledVector(sn, s.len); s.prev.copy(s.cur); s.init = true; }
      sp3.copy(s.cur).sub(s.prev); { const vl = sp3.length(), mx = s.len * 0.45; if (vl > mx) sp3.multiplyScalar(mx / vl); } sp3.multiplyScalar(1 - s.drag).add(s.cur);
      sp1.copy(sp2).addScaledVector(sn, s.len).sub(s.cur); sp3.addScaledVector(sp1, Math.min(1, s.stiff * dt * 60)); sp3.y -= grav * dt * s.len * 0.9;
      sp3.sub(sp2); if (sp3.lengthSq() < 1e-10) sp3.copy(sn); sp3.normalize().multiplyScalar(s.len).add(sp2);
      s.prev.copy(s.cur); s.cur.copy(sp3);
      sp3.sub(sp2).normalize(); sq.setFromUnitVectors(sn, sp3);
      /* local = pai⁻¹ · giro · pai · repouso */
      b.parent.matrixWorld.decompose(sp1, sq2, sps); tq.copy(sq2).invert().multiply(sq).multiply(sq2).multiply(s.q); b.quaternion.copy(tq);
      b.updateMatrixWorld(true);
    }
  }

  const P = { x: pathX(47), z: 47, y: 0, vy: 0, yaw: Math.PI, vx: 0, vz: 0, phase: 0, sit: false, sitT: 0, ground: true, wade: 0, blink: 0, nextBlink: 2, squash: 0, jumpQ: 0, gliding: false, nearBench: false };
  P.y = groundH(P.x, P.z);

  /* ───────── animação procedural: tudo suavizado por molas, sem cortes secos ───────── */
  const PS = { run: 0, move: 0, air: 0, glide: 0, land: 0, crouch: 0, emo: 0, turn: 0, lastYaw: Math.PI, lookX: 0, lookY: 0, goalX: 0, goalY: 0, lookT: 2, hb: 0, hbz: 0, lk: [0, 0], lkz: [0, 0], br: [0, 0, 0, 0, 0, 0], emote: null, idle: 0 };
  const ez = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-dt * k));
  const lp = (a, b, w) => a + (b - a) * w;
  const ease = x => x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
  function startEmote(k) { if (P.sit || !P.ground) return; PS.emote = { k, t: 0, dur: k === 'wave' ? 2.4 : 1.25 }; }
  const PLANT = [['J_Bip_L_ToeBase', 0.034], ['J_Bip_R_ToeBase', 0.034], ['J_Bip_L_Foot', 0.099], ['J_Bip_R_Foot', 0.099]];
  function poseStep(dt, t, spd, gh) {
    const s = PS, st = P.sitT, vyN = clamp(P.vy / 7, -1, 1);
    s.move = ez(s.move, clamp(spd / 3.4, 0, 1.3), 10, dt); s.run = ez(s.run, clamp((spd - 3.8) / 2.0, 0, 1), 6, dt);
    s.air = ez(s.air, P.ground ? 0 : 1, P.ground ? 14 : 18, dt); s.glide = ez(s.glide, P.gliding ? 1 : 0, 5, dt);
    s.land = Math.max(0, s.land - dt * 3.4); s.crouch = ez(s.crouch, P.jumpQ > 0 ? 1 : 0, P.jumpQ > 0 ? 22 : 14, dt);
    let dY = P.yaw - s.lastYaw; dY = Math.atan2(Math.sin(dY), Math.cos(dY)); s.lastYaw = P.yaw; s.turn = ez(s.turn, dY / Math.max(dt, 0.001), 8, dt);
    /* gestos */
    let emoT = 0, spin = 0;
    if (s.emote) { s.emote.t += dt; const u = s.emote.t / s.emote.dur; emoT = Math.sin(clamp(u, 0, 1) * Math.PI); if (spd > 0.6 || u >= 1) s.emote = null; else if (s.emote.k === 'spin') spin = ease(clamp(u * 1.15, 0, 1)) * TAU; }
    s.emo = ez(s.emo, s.emote ? 1 : 0, 9, dt);
    let wig = 0;
    const mv = Math.min(1, s.move), A = lp(0.47, 0.78, s.run), ph = P.phase, sn = Math.sin(ph), idle = 1 - mv;
    const lf = Math.max(0, Math.cos(ph)), rf = Math.max(0, -Math.cos(ph)), kf = 0.55 + 0.7 * s.run;
    /* — chão — */
    let hL = -sn * A * mv + Math.sin(t * 0.5) * 0.03 * idle, hR = sn * A * mv - Math.sin(t * 0.5) * 0.03 * idle;
    let kL = mv * (0.16 + kf * Math.pow(lf, 1.5)) + Math.max(0, Math.sin(t * 0.5)) * 0.1 * idle, kR = mv * (0.16 + kf * Math.pow(rf, 1.5)) + Math.max(0, -Math.sin(t * 0.5)) * 0.1 * idle;
    const br = Math.sin(t * 1.8);
    const sa = Math.sin(ph - 0.55), sb = Math.sin(ph * 2 - 0.9);
    let aLx = (sa * A * 0.5 + 0.04 * sb) * mv + Math.sin(t * 0.7) * 0.07 * idle, aRx = (-sa * A * 0.5 + 0.04 * sb) * mv + Math.sin(t * 0.7 + 1.3) * 0.07 * idle;
    let eL = -(0.34 + 0.1 * Math.sin(t * 0.9) * idle + mv * (0.14 + 0.3 * (0.5 + 0.5 * sa)) + 0.5 * s.run), eR = -(0.34 + 0.1 * Math.sin(t * 0.9 + 1.7) * idle + mv * (0.14 + 0.3 * (0.5 - 0.5 * sa)) + 0.5 * s.run);
    let aLz = -(0.17 + 0.05 * Math.sin(t * 1.1) * idle) - 0.05 * s.run, aRz = -aLz;
    let spY = -sa * 0.13 * mv, spX = (0.07 + 0.2 * s.run) * mv + (0.07 + 0.015 * br) * idle, spZ = clamp(-s.turn * 0.07, -0.3, 0.3) * mv + Math.cos(ph) * 0.035 * mv + Math.sin(t * 0.5 + 0.6) * 0.035 * idle;
    let pvY = 0.95 + mv * (0.035 * Math.cos(2 * ph) - 0.02), pvRy = sn * 0.1 * mv, pvRz = sn * 0.05 * mv + Math.sin(t * 0.5) * 0.07 * idle;
    /* — ar: subindo, caindo, planando — */
    const rise = (vyN + 1) / 2;
    let aHL = lp(-0.2, -0.38, rise), aHR = lp(0.12, -0.08, rise), aKL = lp(0.5, 0.75, rise), aKR = lp(0.85, 0.35, rise);
    let aAx = lp(-0.5, -1.5, rise), aAz = lp(0.95, 0.6, rise), aEl = lp(-0.2, -0.35, rise), aSpX = lp(0.1, 0.05, rise);
    aHL = lp(aHL, 0.32, s.glide); aHR = lp(aHR, 0.4, s.glide); aKL = lp(aKL, 0.28, s.glide); aKR = lp(aKR, 0.2, s.glide);
    aAx = lp(aAx, -0.15, s.glide); aAz = lp(aAz, 1.45, s.glide); aEl = lp(aEl, -0.08, s.glide); aSpX = lp(aSpX, 0.5, s.glide);
    const W = s.air;
    hL = lp(hL, aHL, W); hR = lp(hR, aHR, W); kL = lp(kL, aKL, W); kR = lp(kR, aKR, W);
    aLx = lp(aLx, aAx, W); aRx = lp(aRx, aAx, W); eL = lp(eL, aEl, W); eR = lp(eR, aEl, W); aLz = lp(aLz, -aAz, W); aRz = lp(aRz, aAz, W);
    spX = lp(spX, aSpX, W); spY = lp(spY, 0, W); spZ = lp(spZ, 0, W); pvY = lp(pvY, 0.95 + vyN * 0.02, W); pvRy = lp(pvRy, 0, W); pvRz = lp(pvRz, 0, W);
    /* — antecipação e aterrissagem — */
    const cr = Math.max(s.crouch * 0.85, s.land);
    hL -= 0.62 * cr; hR -= 0.62 * cr; kL += 1.15 * cr; kR += 1.15 * cr; pvY -= 0.2 * cr; spX += 0.28 * cr; aLx += 0.35 * cr; aRx += 0.35 * cr;
    /* — gestos — */
    const E = s.emo;
    if (s.emote && s.emote.k === 'wave') {
      aRz = lp(aRz, 2.75 + Math.sin(t * 9) * 0.05, E); aRx = lp(aRx, -0.15, E); eR = lp(eR, -0.35, E);
      wig = Math.sin(t * 10) * 0.5 * E; spZ += -0.06 * E; pvRz += 0.04 * E;
    }
    if (s.emote && s.emote.k === 'spin') {
      aLz = lp(aLz, -1.25, E); aRz = lp(aRz, 1.25, E); aLx = lp(aLx, -0.25, E); aRx = lp(aRx, -0.25, E);
      hL = lp(hL, -0.3, E); hR = lp(hR, 0.15, E); kR = lp(kR, 0.6, E); pvY += Math.sin(clamp(s.emote.t / s.emote.dur, 0, 1) * Math.PI) * 0.1 * E;
    }
    /* — sentada (banco ou chão) — */
    if (st > 0.001) {
      const bn = P.nearBench ? 1 : 0, swing = Math.sin(t * 1.4) * 0.06;
      hL = lp(hL, lp(-1.62, -1.5, bn), st); hR = lp(hR, lp(-1.57, -1.5, bn), st);
      kL = lp(kL, lp(0.04, 1.5 + swing, bn), st); kR = lp(kR, lp(0.12, 1.5 - swing, bn), st);
      aLx = lp(aLx, -0.55, st); aRx = lp(aRx, -0.55, st); eL = lp(eL, -0.95, st); eR = lp(eR, -0.95, st); aLz = lp(aLz, -0.16, st); aRz = lp(aRz, 0.16, st);
      spX = lp(spX, -0.04 + Math.sin(t * 1.2) * 0.012, st); spY = lp(spY, 0, st); spZ = lp(spZ, 0, st); pvY = lp(pvY, lp(0.245, 0.74, bn), st); pvRy = lp(pvRy, 0, st); pvRz = lp(pvRz, 0, st);
    }
    /* — aplica nos ossos da Lyra — */
    if (!heroReady) { hero.g.position.set(P.x, P.y, P.z); hero.g.rotation.y = P.yaw; return; }
    const R = hero.rest, PIH = Math.PI / 2;
    mb('J_Bip_C_Hips', (Math.sin(ph) * 1.5 * mv + Math.sin(t * 0.5) * 2.2 * idle) * (1 - st), (pvY - 0.95) * 66, 0);
    rb('J_Bip_C_Hips', 0, pvRy, pvRz);
    rb('J_Bip_C_Spine', spX * 0.35, spY * 0.35, spZ * 0.35); rb('J_Bip_C_Chest', spX * 0.35, spY * 0.35, spZ * 0.35); rb('J_Bip_C_UpperChest', spX * 0.3 + Math.sin(t * 1.8) * 0.012, spY * 0.3, spZ * 0.3);
    /* braços: o modelo está em T, então "pendurar" é girar quase 90° em z */
    const legs = [['R', hL, kL, aLx, aLz, eL, -1], ['L', hR, kR, aRx, aRz, eR, 1]];
    const curl = clamp(0.42 + 0.3 * s.run + st * 0.15 - E * 0.25 - s.glide * 0.2, 0.05, 0.8);
    for (const [S, h2, k2, ax, az, el, sd] of legs) {
      rb('J_Bip_' + S + '_UpperLeg', h2, 0, 0); rb('J_Bip_' + S + '_LowerLeg', k2, 0, 0);
      const ank = lp(-h2 * 0.4 + k2 * 0.2 - s.air * 0.25, P.nearBench ? 0.15 : -0.05, st); rb('J_Bip_' + S + '_Foot', ank, 0, 0); rb('J_Bip_' + S + '_ToeBase', clamp(-ank * 0.5 + (s.air ? 0.3 : 0), -0.4, 0.5), 0, 0);
      const wv = (sd === 1 && s.emote && s.emote.k === 'wave') ? wig : 0;
      rb('J_Bip_' + S + '_Shoulder', 0, 0, sd * (-0.09 - 0.05 * s.air - 0.04 * Math.sin(t * 1.8) * (1 - mv)));
      rb('J_Bip_' + S + '_UpperArm', ax, 0, az - sd * PIH);
      rb('J_Bip_' + S + '_LowerArm', 0, sd * el, wv);
      rb('J_Bip_' + S + '_Hand', wv * 0.6, 0, -sd * (0.12 + 0.1 * Math.sin(t * 1.3 + sd)) * (1 - E));
      for (const f of ['Index', 'Middle', 'Ring', 'Little']) {
        const fc = curl * (f === 'Index' ? 0.8 : f === 'Little' ? 1.15 : 1);
        rb('J_Bip_' + S + '_' + f + '1', 0, 0, -sd * fc * 0.9); rb('J_Bip_' + S + '_' + f + '2', 0, 0, -sd * fc * 1.1); rb('J_Bip_' + S + '_' + f + '3', 0, 0, -sd * fc * 0.8);
      }
      rb('J_Bip_' + S + '_Thumb1', 0, sd * 0.12, -sd * curl * 0.3); rb('J_Bip_' + S + '_Thumb2', 0, 0, -sd * curl * 0.4); rb('J_Bip_' + S + '_Thumb3', 0, 0, -sd * curl * 0.3);
    }
    /* olhar: de vez em quando espia em volta; sentada, olha para o santuário */
    s.lookT -= dt; if (s.lookT < 0) { s.lookT = 2.5 + Math.random() * 4; s.goalY = (Math.random() - 0.5) * 0.9; s.goalX = (Math.random() - 0.5) * 0.3; if (Math.random() < 0.4) { s.goalY = 0; s.goalX = 0; } }
    const moving = spd > 0.4; s.lookY = ez(s.lookY, moving ? 0 : s.goalY, 3, dt); s.lookX = ez(s.lookX, moving ? 0 : s.goalX, 3, dt);
    const hx = -s.lookX + (st > 0.5 ? -0.12 : 0) - 0.3 * s.glide - 0.15 * s.crouch + 0.1 * vyN * s.air, hy = s.lookY * (1 - st * 0.6);
    s.hx = ez(s.hx || 0, hx - spX * 0.5 + Math.sin(t * 1.3) * 0.02, 12, dt); s.hy = ez(s.hy || 0, hy - spY * 0.7, 10, dt);
    s.hz = ez(s.hz || 0, Math.sin(t * 0.9) * 0.03 + (s.emote && s.emote.k === 'wave' ? 0.12 * E : 0) - spZ * 0.6, 8, dt);
    rb('J_Bip_C_Neck', s.hx * 0.4, s.hy * 0.4, s.hz * 0.4); rb('J_Bip_C_Head', s.hx * 0.6, s.hy * 0.6, s.hz * 0.6);
    rb('J_Adj_L_FaceEye', 0, clamp(s.lookY * 0.12, -0.1, 0.1), 0); rb('J_Adj_R_FaceEye', 0, clamp(s.lookY * 0.12, -0.1, 0.1), 0);
    /* raiz */
    hero.g.rotation.y = P.yaw + spin; hero.g.rotation.z = ez(hero.g.rotation.z, -clamp(s.turn * 0.04, -0.2, 0.2) * mv, 8, dt);
    hero.g.position.set(P.x, P.y, P.z);
    /* pés nunca atravessam o chão: sobe o corpo o quanto a sola passar do solo */
    hero.g.updateMatrixWorld(true);
    let low = 9; for (const [n, off] of PLANT) { const b = hero.B[n]; if (b) { b.getWorldPosition(tv); low = Math.min(low, tv.y - off - P.y); } }
    const want = low < 0 ? -low : 0; s.plant = Math.max(want, ez(s.plant || 0, want, 20, dt)); hero.g.position.y = P.y + s.plant;
    springStep(dt);
  }

  /* ───────── câmera e entrada ───────── */
  const CAM = { yaw: 0, pitch: 0.36, dist: 10.5, tx: P.x, ty: P.y + 1.55, tz: P.z, auto: 0 };
  const keys = {}, joy = { x: 0, y: 0, on: false, id: -1, cx: 0, cy: 0 }; let drag = null, hintT = 0;
  addEventListener('keydown', e => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key.toLowerCase(); keys[k] = true;
    if (XC.key && XC.key(k, e)) { hideHint(); return; }
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
    if (k === ' ' && !e.repeat) jump(); if (k === 'e' && !e.repeat) sitToggle(); if (k === 'q' && !e.repeat) startEmote('wave'); if (k === 'r' && !e.repeat) startEmote('spin');
    if (k === 't' && !e.repeat) toggleTime(); if (k === 'c' && !e.repeat) toggleWard(); if (k === 'escape') { if (boatOpen) closeBoat(); else if (timeOpen) toggleTime(false); else if (wardOpen) toggleWard(false); else toParent({ nb: 'exit' }); }
    hideHint();
  });
  addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });
  addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
  const cv = $('c');
  cv.addEventListener('pointerdown', e => {
    cv.focus({ preventScroll: true }); hideHint(); if (XC.ptr && XC.ptr(e, 'down')) return;
    if (e.pointerType === 'touch' && e.clientX < innerWidth * 0.45) { joy.on = true; joy.id = e.pointerId; joy.cx = e.clientX; joy.cy = e.clientY; const j = $('joy'); j.style.left = (e.clientX - 58) + 'px'; j.style.bottom = (innerHeight - e.clientY - 58) + 'px'; cv.setPointerCapture(e.pointerId); return; }
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY }; cv.setPointerCapture(e.pointerId);
  });
  cv.addEventListener('pointermove', e => {
    if (XC.ptr && XC.ptr(e, 'move')) return;
    if (joy.on && e.pointerId === joy.id) { let dx = e.clientX - joy.cx, dy = e.clientY - joy.cy; const m = Math.hypot(dx, dy), mx = 48; if (m > mx) { dx *= mx / m; dy *= mx / m; } joy.x = dx / mx; joy.y = dy / mx; $('joy').firstElementChild.style.transform = `translate(${dx}px,${dy}px)`; return; }
    if (drag && e.pointerId === drag.id) { CAM.yaw -= (e.clientX - drag.x) * 0.0055; CAM.pitch = clamp(CAM.pitch + (e.clientY - drag.y) * 0.0045, -0.08, 1.25); drag.x = e.clientX; drag.y = e.clientY; CAM.auto = 0; }
  });
  const pend = e => { if (XC.ptr) XC.ptr(e, 'up'); if (joy.on && e.pointerId === joy.id) { joy.on = false; joy.x = joy.y = 0; $('joy').firstElementChild.style.transform = ''; } if (drag && e.pointerId === drag.id) drag = null; };
  cv.addEventListener('pointerup', pend); cv.addEventListener('pointercancel', pend);
  cv.addEventListener('wheel', e => { CAM.dist = clamp(CAM.dist * (1 + e.deltaY * 0.001), 4.5, 18); e.preventDefault(); }, { passive: false });
  $('aJump').addEventListener('pointerdown', () => { holdJump = true; jump(); }); addEventListener('pointerup', () => { holdJump = false; }); $('aEmo').addEventListener('click', () => startEmote(Math.random() < 0.6 ? "wave" : "spin"));  $('aSit').addEventListener('click', sitToggle); $('bBack').addEventListener('click', () => toParent({ nb: 'exit' }));
  $('bQ').addEventListener('click', () => { if (qAuto) { qAuto = false; qi = 0; } else if (qi < 2) qi++; else { qAuto = true; qi = 1; } prNow = QUAL[qi].pr; applyQ(); });
  function hideHint() { if (!hintT) hintT = clock.elapsedTime + 4; }
  let holdJump = false;
  function standUp() { if (P.sit && P.bench) { P.x = P.bench.x + P.bench.fx * 1.05; P.z = P.bench.z + P.bench.fz * 1.05; } P.sit = false; P.nearBench = false; P.bench = null; }
  function jump() { if (P.sit) { standUp(); return; } if (P.ground && P.jumpQ <= 0) P.jumpQ = 0.11; }
  function nearestBench() { let best = null, bd = 3.2; for (const b of BENCHES) { const d = Math.hypot(P.x - b.x, P.z - b.z); if (d < bd) { bd = d; best = b; } } return best; }
  function sitToggle() {
    if (P.sit) { standUp(); return; }
    if (boatNear()) { openBoat(); return; }
    if (XC.act && XC.act()) return;
    const b = nearestBench();
    if (b) { P.x = b.x - b.fx * 0.1; P.z = b.z - b.fz * 0.1; P.yaw = b.yaw; P.bench = b; }
    P.sit = true; P.vx = P.vz = 0; P.nearBench = !!b;
  }

  /* ───────── dia e noite ───────── */
  let phase = Q.has('p') ? +Q.get('p') : 0.66; const CYCLE = 900; let fast = false;
  const TKEY = 'ilha.time', TPH = { day: 0.42, night: 0.97 }; let tmode = 'cycle';
  try { const m = localStorage.getItem(TKEY); if (['cycle', 'lockDay', 'lockNight'].includes(m)) tmode = m; } catch (e) {}
  if (!Q.has('p')) { if (tmode === 'lockDay') phase = TPH.day; else if (tmode === 'lockNight') phase = TPH.night; }
  const tpanel = $('tpanel');
  function refreshTime() { tpanel.querySelectorAll('button[data-m]').forEach(b => b.classList.toggle('on', (b.dataset.m === 'lockDay' && tmode === 'lockDay') || (b.dataset.m === 'lockNight' && tmode === 'lockNight'))); $('tMode').textContent = tmode === 'cycle' ? 'O dia e a noite seguem seu ciclo.' : 'Ciclo desligado: o tempo fica parado.'; }
  function setTime(m) {
    if (m === 'day') { phase = TPH.day; tmode = 'cycle'; } else if (m === 'night') { phase = TPH.night; tmode = 'cycle'; }
    else if (m === 'lockDay') { phase = TPH.day; tmode = 'lockDay'; } else if (m === 'lockNight') { phase = TPH.night; tmode = 'lockNight'; } else if (m === 'cycle') tmode = 'cycle';
    try { localStorage.setItem(TKEY, tmode); } catch (e) {} refreshTime();
  }
  let timeOpen = false;
  function toggleTime(on) { timeOpen = on === undefined ? !timeOpen : on; tpanel.style.display = timeOpen ? 'grid' : 'none'; refreshTime(); }
  tpanel.querySelectorAll('button[data-m]').forEach(b => b.addEventListener('click', () => { setTime(b.dataset.m); b.blur(); }));
  $('clock').addEventListener('click', () => toggleTime()); $('tClose').addEventListener('click', () => toggleTime(false));
  const C = n => new T.Color(n);
  const K = {
    nTop: C('#0a0f2c'), nHor: C('#25306b'), dTop: C('#5aa9f0'), dHor: C('#d4ecff'), tTop: C('#6a5fb0'), tHor: C('#ffb08a'),
    nDeep: C('#0e2a4a'), nSh: C('#27506a'), dDeep: C('#2b8fbf'), dSh: C('#78d9d0'), tDeep: C('#3a6aa8'), tSh: C('#ffc9a8')
  };
  const tmp = new T.Color(), sunDir = new T.Vector3(), moonDir = new T.Vector3(); let nightF = 0;
  function mix3(a, b, c, wd, wt) { tmp.copy(a).lerp(b, wd); return tmp.lerp(c, wt); }
  function dayStep(dt) {
    if (tmode === 'cycle') phase = (phase + dt * (fast ? 40 : 1) / CYCLE) % 1;
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
    ix += joy.x; iz += joy.y; if (XC.modal) { ix = iz = 0; } const im = Math.min(1, Math.hypot(ix, iz)); fast = !!keys['n'];
    if (im > 0.08) { if (P.sit) standUp(); }
    const sy = Math.sin(CAM.yaw), cy = Math.cos(CAM.yaw);
    const wx = (ix * cy + iz * sy), wz = (-ix * sy + iz * cy), wl = Math.hypot(wx, wz) || 1;
    const runK = keys['shift'] ? 1 : joy.on ? clamp((im - 0.8) / 0.2, 0, 1) : 0, base = lerp(3.4, 6.0, runK) * (joy.on ? Math.min(1, im / 0.8) : 1) / (joy.on ? Math.max(im, 0.01) : 1);
    const sp = (P.wade > 0.3 ? 3.2 : base * (P.gliding ? 1.25 : 1)) * im, tvx = wx / wl * sp * (im > 0.08 ? 1 : 0), tvz = wz / wl * sp * (im > 0.08 ? 1 : 0);
    const k = 1 - Math.exp(-dt * (P.sit ? 12 : 9)); P.vx += (tvx - P.vx) * k; P.vz += (tvz - P.vz) * k;
    /* movimento + colisão + borda da água */
    let nx = P.x + P.vx * dt, nz = P.z + P.vz * dt;
    if (!P.sit) for (const c of colliders) { if (c.y0 !== undefined && (P.y < c.y0 || P.y > c.y1)) continue; const dx = nx - c.x, dz = nz - c.z, d = Math.hypot(dx, dz), m = c.r + 0.32; if (d < m && d > 0.001) { nx = c.x + dx / d * m; nz = c.z + dz / d * m; } }
    const OK = (x, z) => groundH(x, z) > -0.36;
    if (OK(nx, nz)) { P.x = nx; P.z = nz; } else if (OK(nx, P.z)) P.x = nx; else if (OK(P.x, nz)) P.z = nz;
    const gh = groundH(P.x, P.z);
    if (P.jumpQ > 0) { P.jumpQ -= dt; if (P.jumpQ <= 0 && P.ground) { P.vy = 7.2; P.ground = false; P.squash = -0.35; } }
    if (!P.ground) {
      P.gliding = (keys[' '] || holdJump) && P.vy < 0.2 && P.y > gh + 0.6;
      P.vy -= (P.gliding ? 4 : 17) * dt; if (P.gliding) P.vy = Math.max(P.vy, -1.5); P.y += P.vy * dt;
      if (P.y <= Math.max(gh, -0.2)) { const hit = -P.vy; P.y = Math.max(gh, -0.2); P.vy = 0; P.ground = true; P.gliding = false; P.squash = 0.3; PS.land = clamp(hit / 7, 0.2, 1); }
    }
    else { P.gliding = false; P.y += (Math.max(gh, -0.2) - P.y) * Math.min(1, dt * 18); if (Math.abs(P.y - Math.max(gh, -0.2)) < 0.02) P.y = Math.max(gh, -0.2); }
    P.wade = clamp((0.08 - gh) / 0.3, 0, 1) * (P.ground ? 1 : 0.3);
    const spd = Math.hypot(P.vx, P.vz);
    if (spd > 0.25) { const ty = Math.atan2(P.vx, P.vz); let d = ty - P.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); P.yaw += d * (1 - Math.exp(-dt * 12)); P.phase += dt * Math.PI * Math.min(spd, 6.4) / (1.74 * Math.sin(lerp(0.55, 0.85, PS.run))); }
    P.squash *= Math.exp(-dt * 9);
    P.sitT += ((P.sit ? 1 : 0) - P.sitT) * (1 - Math.exp(-dt * 7));
    poseStep(dt, t, spd, gh);
    U.uPl.value.set(P.x, P.wade, P.z);
    /* vela do personagem */
    candle.position.set(P.x + Math.sin(P.yaw) * 0.4, P.y + 1.6, P.z + Math.cos(P.yaw) * 0.4);
  }

  function camStep(dt) {
    const sitView = P.sit && P.sitT > 0.5;
    if (sitView) { CAM.auto = Math.min(1, CAM.auto + dt * 0.4); } else CAM.auto = Math.max(0, CAM.auto - dt * 1.5);
    /* ao sentar, a câmera gira devagar para enquadrar o santuário */
    if (sitView) { const tg = P.bench || BENCH, want = Math.atan2(P.x - tg.tx, P.z - tg.tz); let d = want - CAM.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); CAM.yaw += d * (1 - Math.exp(-dt * 0.9)); CAM.pitch += (((P.bench || BENCH).pitch || 0.2) - CAM.pitch) * (1 - Math.exp(-dt * 0.8)); }
    const tg2 = P.bench || BENCH, tx = lerp(P.x, (P.x * 0.45 + tg2.tx * 0.55), CAM.auto * 0.7), tz = lerp(P.z, (P.z * 0.45 + tg2.tz * 0.55), CAM.auto * 0.7), ty = P.y + 1.55 + CAM.auto * (tg2.ty || 1.2);
    const k = 1 - Math.exp(-dt * 6); CAM.tx += (tx - CAM.tx) * k; CAM.ty += (ty - CAM.ty) * k; CAM.tz += (tz - CAM.tz) * k;
    const dist = CAM.dist * (1 + CAM.auto * ((P.bench || BENCH).zoom || 0.35)), cp = Math.cos(CAM.pitch);
    let px = CAM.tx + Math.sin(CAM.yaw) * cp * dist, py = CAM.ty + Math.sin(CAM.pitch) * dist, pz = CAM.tz + Math.cos(CAM.yaw) * cp * dist;
    py = Math.max(py, groundH(px, pz) + 0.9, 0.9);
    camera.position.set(px, py, pz); camera.lookAt(CAM.tx, CAM.ty, CAM.tz);
    if (XC.camOv) XC.camOv(dt);
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

  const lpV = new T.Vector3();
  function visChain(o) { for (; o; o = o.parent) if (o.userData.__hide || (o !== null && o.visible === false && !o.isLight)) return false; return true; }
  function lightPool(dt) {
    const cand = [];
    for (const v of VL) {
      if (v.intensity < 0.05 || !visChain(v.parent)) continue;
      v.getWorldPosition(lpV); const d = Math.hypot(lpV.x - P.x, lpV.z - P.z), fall = Math.max(0, 1 - d / (v.distance + 18));
      if (fall <= 0) continue; cand.push({ v, sc: v.intensity * fall * fall, x: lpV.x, y: lpV.y, z: lpV.z });
    }
    cand.sort((a, b) => b.sc - a.sc);
    const used = new Set();
    LP.forEach((s, i) => {
      let want = cand[i] ? cand[i].v : null;
      /* uma fonte que já está num slot continua nele, para não "pular" */
      const keep = cand.find(c => c.v === s.cur); if (keep && cand.indexOf(keep) < 3) want = s.cur;
      if (s.cur !== want) { s.f = Math.max(0, s.f - dt * 6); if (s.f <= 0.01) { s.cur = want && !used.has(want) ? want : null; } }
      else s.f = Math.min(1, s.f + dt * 6);
      if (s.cur) { used.add(s.cur); const c = cand.find(c => c.v === s.cur); if (c) { s.l.position.set(c.x, c.y, c.z); s.l.color.copy(s.cur.color); s.l.distance = s.cur.distance; s.l.decay = s.cur.decay; s.l.intensity = s.cur.intensity * s.f; } else s.l.intensity *= 0.8; } else s.l.intensity = 0;
    });
  }
  const frus = new T.Frustum(), cvM = new T.Matrix4();
  const GRASS_FAR = 64;
  function cullStep() {
    camera.updateMatrixWorld(); cvM.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse); frus.setFromProjectionMatrix(cvM);
    for (const im of grassChunks) { const sp = im.userData.sph; im.visible = Math.hypot(P.x - sp.center.x, P.z - sp.center.z) - sp.radius < GRASS_FAR && frus.intersectsSphere(sp); }
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

  /* ───────── cosméticos: presentes para achar, guarda-roupa e enfeites ───────── */
  const SKEY = 'ilha.v2', SLOTS = { head: 'Cabeça', face: 'Rosto', back: 'Costas', neck: 'Pescoço', bottom: 'Saia', decor: 'Ilha' };
  const SLOTCOL = { head: 0xff9ad0, face: 0x9ad8ff, back: 0xc9a6ff, neck: 0xffb48a, bottom: 0xffe28a, cape: 0x8fe3b4, decor: 0xffd98a, site: 0xa8e6ff };
  const ITEMS = [
    { id: 'crown', slot: 'head', name: 'Coroa de flores', spot: [-5, 44], hint: 'Perto de onde você chegou, entre as flores.' },
    { id: 'cat', slot: 'head', name: 'Orelhas de gato', spot: [32, -20], hint: 'No lado leste da ilha, depois das pedras.' },
    { id: 'halo', slot: 'head', name: 'Halo de estrelas', spot: [0, -15.4], hint: 'Dentro do círculo do santuário, entre os cristais.' },
    { id: 'glasses', slot: 'face', name: 'Óculos redondos', spot: [-30, -9], hint: 'No lado oeste, perto da praia.' },
    { id: 'wings', slot: 'back', name: 'Asas de vidro', spot: [-27, 24], hint: 'No topo da colina do oeste, o ponto mais alto.' },
    { id: 'lantern', slot: 'back', name: 'Lanterninha de costas', spot: [60.5, 0], hint: 'No fim do cais comprido, a leste.' },
    { id: 'scarf', slot: 'neck', name: 'Cachecol de lã', spot: [-9, -34], hint: 'No fundo da ilha, atrás do santuário.' },
    { id: 'skirt', slot: 'bottom', name: 'Saia rodada', spot: [38, 18], hint: 'Na praia do sudeste.' },
    { id: 'lights', slot: 'decor', name: 'Varal de luzes', spot: [14, -26], hint: 'Ao norte, perto do santuário.' },
    { id: 'kite', slot: 'decor', name: 'Pipa', spot: [-39, -3], hint: 'Onde venta mais, no extremo oeste.' },
    { id: 'fire', slot: 'decor', name: 'Fogueirinha', spot: [44, -13], hint: 'Na faixa de areia do leste.' },
    { id: 'shrooms', slot: 'decor', name: 'Cogumelos brilhantes', spot: [31, 29], hint: 'Só aparece de noite.', night: true },
    { id: 'butterflies', slot: 'site', name: 'Borboletas no site', spot: [129, -9], hint: 'Na Ilha da Árvore Milenar, atrás da árvore gigante.' },
    { id: 'aurora', slot: 'site', name: 'Aurora no site', spot: [-37, -138], hint: 'Na Ilha Nevada, entre os pinheiros do fundo.' },
    { id: 'stars', slot: 'site', name: 'Estrelas cadentes no site', spot: [-110, 13], hint: 'Na Ilha das Dunas, dentro das ruínas.' },
    { id: 'petals', slot: 'site', name: 'Pétalas no site', spot: [-17, -35], hint: 'Atrás do santuário, à esquerda.' },
    { id: 'flies', slot: 'site', name: 'Vagalumes no site', spot: [20, -37], hint: 'Só aparece de noite.', night: true }
  ];
  const S = { own: [], eq: { head: '', face: '', back: '', neck: '', bottom: '', cape: '' }, decor: {}, site: {} };
  try { const r = JSON.parse(localStorage.getItem(SKEY) || 'null'); if (r && typeof r === 'object') { if (Array.isArray(r.own)) S.own = r.own.filter(i => ITEMS.some(x => x.id === i)); Object.assign(S.eq, r.eq || {}); S.decor = r.decor || {}; S.site = r.site || {}; } } catch (e) {}
  const save = () => { try { localStorage.setItem(SKEY, JSON.stringify(S)); } catch (e) {} };
  const owns = id => S.own.indexOf(id) >= 0;
  const postSite = () => toParent({ nb: 'unlock', ids: S.own.filter(i => { const x = ITEMS.find(y => y.id === i); return x && x.slot === 'site'; }) });

  /* acessórios que a personagem veste (montados só quando precisam) */
  const gold = () => std('#e0b866', 0.35, { metalness: 0.5 });
  const HC = [0, 106.5, -0.5];            /* centro da cabeça da Lyra, em cm */
  const capeAcc = (hex, trim) => () => {
    const g = new T.Group(), cg = new T.PlaneGeometry(0.44, 0.78, 8, 12), cm = std(hex, 0.8, { side: T.DoubleSide }), cape = shadowy(new T.Mesh(cg, cm)); cape.position.y = -0.39; g.add(cape);
    const base = cg.attributes.position.array.slice(), edge = new T.Mesh(new T.PlaneGeometry(0.44, 0.04, 8, 1), std(trim, 0.8, { side: T.DoubleSide })); edge.position.y = -0.77; g.add(edge);
    return { g, bone: 'J_Bip_C_UpperChest', pos: [0, 90, -22], k: 0.62, upd(t) {
      const cp = cg.attributes.position, wind = clamp(Math.hypot(P.vx, P.vz) / 6.5, 0, 1) * (1 - P.sitT), gl = PS.glide, up = clamp(-P.vy * 0.08, 0, 0.5) * PS.air;
      for (let i = 0; i < cp.count; i++) {
        const bx = base[i * 3], by = base[i * 3 + 1], v = (0.39 - by) / 0.78, vv = Math.pow(v, 1.3);
        cp.setZ(i, -0.03 - vv * (0.1 + wind * 0.5 + gl * 0.45 + up * 0.5 - PS.land * 0.05) + Math.sin(t * 3.1 + v * 6 + bx * 5) * 0.03 * v * (0.35 + wind + gl) + Math.sin(t * 1.1 + v * 2) * 0.012 * v);
        cp.setX(i, bx * (1 + v * (0.25 + gl * 0.9)) + Math.sin(t * 2 + v * 4) * 0.015 * v * (1 + wind));
        cp.setY(i, by - v * wind * 0.08 + gl * 0.05 * v);
      }
      cp.needsUpdate = true; cg.computeVertexNormals(); edge.position.set(0, -0.39 - 0.38 - 0 + (cp.getY(cp.count - 1) + 0.39), cp.getZ(cp.count - 1)); edge.position.y = cp.getY(cp.count - 1) - 0.0; edge.position.z = cp.getZ(cp.count - 1);
    } };
  };
  const ACC = {
    crown() {
      const g = new T.Group(), cols = ['#ffd1e3', '#ffffff', '#ffe28a', '#c7b8ff'];
      for (let i = 0; i < 11; i++) { const a = i / 11 * TAU, x = Math.cos(a) * 0.285, z = Math.sin(a) * 0.285; const f = shadowy(new T.Mesh(new T.IcosahedronGeometry(0.052, 0), std(cols[i % 4], 0.7))); f.position.set(x, 0.13 - z * 0.2 + (i % 2) * 0.012, z); g.add(f); const l = new T.Mesh(new T.ConeGeometry(0.03, 0.09, 5), std('#7fcf8c', 0.8)); l.position.set(x * 1.02, f.position.y - 0.035, z * 1.02); l.rotation.set(Math.PI / 2 * Math.sin(a), 0, -Math.PI / 2 * Math.cos(a)); g.add(l); }
      g.position.y = 0.06; const h = new T.Group(); h.add(g); return { g: h, bone: 'J_Bip_C_Head', pos: [0, HC[1] + 1.5, HC[2] + 0.4], k: 0.5 };
    },
    cat() {
      const g = new T.Group();
      [-1, 1].forEach(sx => { const e = shadowy(new T.Mesh(new T.ConeGeometry(0.09, 0.2, 4), std('#35607a', 0.8))); e.position.set(sx * 0.2, 0.3, -0.02); e.rotation.set(-0.12, Math.PI / 4, -sx * 0.32); g.add(e); const i2 = new T.Mesh(new T.ConeGeometry(0.058, 0.14, 4), std('#ffb3c7', 0.8)); i2.position.set(sx * 0.2, 0.285, 0.0); i2.rotation.copy(e.rotation); g.add(i2); });
      return { g, bone: 'J_Bip_C_Head', pos: [0, HC[1] + 2.5, HC[2]], k: 0.55 };
    },
    halo() {
      const g = new T.Group(), ring = new T.Mesh(new T.TorusGeometry(0.21, 0.016, 8, 40), new T.MeshBasicMaterial({ color: 0xffe08a, toneMapped: false })); ring.rotation.x = Math.PI / 2 + 0.12; g.add(ring);
      const st = []; for (let i = 0; i < 5; i++) { const s2 = new T.Mesh(new T.OctahedronGeometry(0.035, 0), new T.MeshBasicMaterial({ color: 0xfff2b8, toneMapped: false })); g.add(s2); st.push(s2); }
      const gl = glow(0xffe08a, 0.9, 0.5); g.add(gl); const h = new T.Group(); h.add(g);
      return { g: h, bone: 'J_Bip_C_Head', pos: [0, HC[1] + 15, HC[2]], k: 0.5, upd(t) { g.position.y = Math.sin(t * 1.5) * 0.015; st.forEach((s2, i) => { const a = t * 0.9 + i / 5 * TAU; s2.position.set(Math.cos(a) * 0.21, Math.sin(t * 2 + i) * 0.03, Math.sin(a) * 0.21); s2.rotation.y = t * 2; }); } };
    },
    glasses() {
      const g = new T.Group(), m = gold();
      [-1, 1].forEach(sx => { const r = new T.Mesh(new T.TorusGeometry(0.07, 0.01, 6, 20), m); r.position.set(sx * 0.105, -0.035, 0.262); r.rotation.y = sx * 0.38; g.add(r); const arm = new T.Mesh(new T.CylinderGeometry(0.006, 0.006, 0.3, 4), m); arm.position.set(sx * 0.2, -0.02, 0.1); arm.rotation.x = Math.PI / 2; g.add(arm); });
      const br = new T.Mesh(new T.CylinderGeometry(0.006, 0.006, 0.05, 4), m); br.rotation.z = Math.PI / 2; br.position.set(0, -0.02, 0.272); g.add(br);
      return { g, bone: 'J_Bip_C_Head', pos: [0, 105.2, 0.2], k: 0.4 };
    },
    wings() {
      const g = new T.Group(), sh = new T.Shape(); sh.moveTo(0, 0); sh.bezierCurveTo(0.28, 0.08, 0.5, 0.42, 0.36, 0.8); sh.bezierCurveTo(0.26, 0.62, 0.1, 0.42, 0, 0.2); sh.closePath();
      const mat = new T.MeshStandardMaterial({ color: '#d4ecff', transparent: true, opacity: 0.55, emissive: new T.Color('#9ad7ff'), emissiveIntensity: 0.25, roughness: 0.2, side: T.DoubleSide, depthWrite: false });
      const ws = [];
      [-1, 1].forEach(sx => [[1, 0.35], [0.62, -0.5]].forEach(([sc, rz]) => { const p = new T.Group(); p.position.set(sx * 0.05, 0.1, 0); const w = new T.Mesh(new T.ShapeGeometry(sh), mat); w.scale.set(sx * sc, sc, 1); w.rotation.z = sx * rz * 0.6; p.add(w); g.add(p); ws.push({ p, sx, sc, rz }); }));
      return { g, bone: 'J_Bip_C_UpperChest', pos: [0, 86, -24], k: 0.72, notoon: true, upd(t) { const fl = Math.sin(t * (1.8 + PS.glide * 7)) * (0.12 + PS.glide * 0.1); ws.forEach(w => { w.p.rotation.y = w.sx * (0.5 + fl + PS.glide * 0.5 + (w.sc < 1 ? 0.15 : 0)); w.p.rotation.x = -0.1 - PS.air * 0.05; }); mat.opacity = 0.5 + (0.4 + PS.glide * 0.2) * 0.1; mat.emissiveIntensity = 0.25 + nightF * 0.5; } };
    },
    lantern() {
      const g = new T.Group(), cord = new T.Mesh(new T.CylinderGeometry(0.005, 0.005, 0.2, 4), std('#6a4a40', 1)); cord.position.y = 0.1; g.add(cord);
      const lm = new T.MeshStandardMaterial({ color: '#ffe2b0', emissive: new T.Color('#ffb15a'), emissiveIntensity: 0.6, roughness: 0.6 }), l = new T.Mesh(new T.SphereGeometry(0.1, 12, 9), lm); l.scale.y = 1.2; l.position.y = -0.04; g.add(l);
      const cp = new T.Mesh(new T.ConeGeometry(0.075, 0.07, 8), std('#7a5a50', 1)); cp.position.y = 0.1; g.add(cp);
      const gl = glow(0xffb15a, 1.1, 0.5); gl.position.y = -0.04; g.add(gl); const h = new T.Group(); h.add(g); g.position.set(0, 0, 0);
      return { g: h, bone: 'J_Bip_C_Hips', pos: [0, 62, -26], k: 0.8, notoon: true, upd(t) { g.rotation.x = -PS.hb * 1.1 + Math.sin(t * 2.1) * 0.05; g.rotation.z = PS.hbz * 0.8; lm.emissiveIntensity = 0.5 + nightF * 2.2; gl.material.opacity = 0.25 + nightF * 0.7; } };
    },
    scarf() {
      const g = new T.Group(), m = std('#ff9aa8', 0.9);
      const ring = shadowy(new T.Mesh(new T.TorusGeometry(0.115, 0.05, 8, 20), m)); ring.rotation.x = Math.PI / 2; ring.scale.y = 0.85; g.add(ring);
      const knot = shadowy(new T.Mesh(new T.SphereGeometry(0.06, 10, 8), m)); knot.position.set(0.07, -0.05, 0.1); g.add(knot);
      const tail = []; let par = new T.Group(); par.position.set(0.09, -0.06, 0.11); g.add(par); tail.push(par);
      for (let i = 0; i < 4; i++) { const b = shadowy(new T.Mesh(new T.BoxGeometry(0.1, 0.13, 0.025), i % 2 ? m : std('#ffd3da', 0.9))); b.position.y = -0.065; par.add(b); const n = new T.Group(); n.position.y = -0.125; par.add(n); par = n; tail.push(n); }
      return { g, bone: 'J_Bip_C_Neck', pos: [0, 93.5, -2.4], k: 0.5, upd(t) { tail.forEach((n, i) => { n.rotation.x = -PS.hb * (0.5 + i * 0.2) - 0.05 + Math.sin(t * 2.6 - i) * 0.05; n.rotation.z = PS.hbz * 0.5 + Math.sin(t * 1.8 - i) * 0.04; }); } };
    },
    skirt() {
      const g = new T.Group(), sk = shadowy(new T.Mesh(new T.LatheGeometry([[0.2, 0.08], [0.27, -0.04], [0.4, -0.22], [0.5, -0.4]].map(p => new T.Vector2(p[0], p[1])), 28), std('#fff1b8', 0.85, { side: T.DoubleSide }))); g.add(sk);
      const hm = new T.Mesh(new T.TorusGeometry(0.5, 0.016, 6, 32), std('#ffd0e0', 0.8)); hm.rotation.x = Math.PI / 2; hm.position.y = -0.4; g.add(hm);
      const og = new T.Group(); og.add(g); return { g: og, bone: 'J_Bip_C_Hips', pos: [0, 64, 0], k: 0.55, upd(t) { const k = 1 + PS.glide * 0.25 + Math.sin(t * 3) * 0.01; g.scale.set(k, 1, k); g.rotation.x = -clamp((P.vx * Math.sin(P.yaw) + P.vz * Math.cos(P.yaw)) * 0.03, -0.2, 0.25); } };
    },
  };
  const accs = {};
  function applyCos() {
    if (heroReady) for (const id in ACC) {
      const it = ITEMS.find(x => x.id === id), on = it && S.eq[it.slot] === id && owns(id);
      if (on && !accs[id]) { const a = ACC[id](); if (!a.notoon) toonify(a.g); if (attachTo(a.bone, a.g, a.pos, a.k)) accs[id] = a; }
      if (accs[id]) accs[id].g.visible = !!on;
    }
    for (const id of ['lights', 'kite', 'fire', 'shrooms']) { const on = !!S.decor[id] && owns(id); if (on && !DEC[id].obj) { DEC[id].obj = DEC[id].mk(); } if (DEC[id].obj) DEC[id].obj.g.visible = on; }
    refreshWard();
  }

  /* enfeites da ilha */
  const DEC = {
    lights: { mk() {
      const g = new T.Group(); scene.add(g); const Z = -6.2, xs = [-4.6, 4.6], ys = xs.map(x => groundH(x, Z) + 3.4);
      xs.forEach((x, i) => { const p = shadowy(new T.Mesh(new T.CylinderGeometry(0.07, 0.09, 3.5, 6), std('#8a6a58', 1))); p.position.set(x, ys[i] - 1.65, Z); g.add(p); });
      const NB = 20, pts = [], bm = new T.MeshStandardMaterial({ color: '#fff2cc', emissive: new T.Color('#ffc66b'), emissiveIntensity: 0.3, roughness: 0.5 }), bg = new T.SphereGeometry(0.085, 8, 6), gp = new Float32Array(NB * 3);
      for (let i = 0; i < NB; i++) { const u = i / (NB - 1), x = lerp(xs[0], xs[1], u), y = lerp(ys[0], ys[1], u) - 0.75 * (1 - Math.pow(2 * u - 1, 2)); pts.push(new T.Vector3(x, y, Z)); const b = new T.Mesh(bg, bm); b.position.set(x, y - 0.08, Z); g.add(b); gp[i * 3] = x; gp[i * 3 + 1] = y - 0.08; gp[i * 3 + 2] = Z; }
      g.add(new T.Line(new T.BufferGeometry().setFromPoints(pts), new T.LineBasicMaterial({ color: 0x5a4a40 })));
      const gg = new T.BufferGeometry(); gg.setAttribute('position', new T.BufferAttribute(gp, 3)); const gm = new T.PointsMaterial({ map: glowTex, color: 0xffc66b, size: 0.95, transparent: true, depthWrite: false, blending: T.AdditiveBlending, opacity: 0.1 }); g.add(new T.Points(gg, gm));
      return { g, upd(t) { bm.emissiveIntensity = 0.3 + nightF * 2.5; gm.opacity = 0.12 + nightF * 0.85; } };
    } },
    kite: { mk() {
      const g = new T.Group(); scene.add(g); const f = tt => new T.Vector3(8 + 15 * Math.cos(tt * 0.1), 17 + 2.2 * Math.sin(tt * 0.27), -2 + 11 * Math.sin(tt * 0.1));
      const k = new T.Group(); g.add(k); [['#ff8fa8', 1], ['#ffe28a', -1]].forEach(([c, sx]) => { const sh = new T.Shape(); sh.moveTo(0, 0.75); sh.lineTo(sx * 0.48, 0.12); sh.lineTo(0, -0.75); sh.closePath(); k.add(new T.Mesh(new T.ShapeGeometry(sh), new T.MeshBasicMaterial({ color: c, side: T.DoubleSide, toneMapped: false }))); });
      k.scale.setScalar(1.5);
      const tail = []; for (let i = 0; i < 9; i++) { const b = new T.Mesh(new T.PlaneGeometry(0.34, 0.2), new T.MeshBasicMaterial({ color: ['#ff8fa8', '#ffe28a', '#9ad8ff'][i % 3], side: T.DoubleSide, toneMapped: false })); g.add(b); tail.push(b); }
      const A = new T.Vector3(3.2, groundH(3.2, 11.5) + 1.2, 11.5), sg = new T.BufferGeometry().setFromPoints([A, A]); const str = new T.Line(sg, new T.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 })); str.frustumCulled = false; g.add(str);
      return { g, upd(t) { const p = f(t), q = f(t + 0.4); k.position.copy(p); k.rotation.set(0, Math.atan2(q.x - p.x, q.z - p.z) + Math.PI / 2, 0); k.rotateZ(Math.sin(t * 1.3) * 0.18); k.rotateX(-0.5);
        tail.forEach((b, i) => { const pp = f(t - (i + 1) * 0.33); b.position.set(pp.x, pp.y - 1.05 - i * 0.07 + Math.sin(t * 3 + i) * 0.12, pp.z); b.rotation.set(0.4, t * 2 + i, Math.sin(t * 2 + i) * 0.5); });
        const ps = sg.attributes.position; ps.setXYZ(1, p.x, p.y, p.z); ps.needsUpdate = true; } };
    } },
    fire: { mk() {
      const g = new T.Group(), X = -7.5, Z = 5, Y = groundH(X, Z); g.position.set(X, Y, Z); scene.add(g);
      for (let i = 0; i < 9; i++) { const a = i / 9 * TAU, r = shadowy(new T.Mesh(new T.DodecahedronGeometry(0.2, 0), std('#c6c0d6', 1))); r.position.set(Math.cos(a) * 0.7, 0.1, Math.sin(a) * 0.7); r.scale.y = 0.7; g.add(r); }
      for (let i = 0; i < 3; i++) { const l = shadowy(new T.Mesh(new T.CylinderGeometry(0.07, 0.08, 0.8, 6), std('#7a5440', 1))); l.rotation.set(Math.PI / 2 - 0.5, i * 2.1, 0); l.position.set(Math.sin(i * 2.1) * 0.15, 0.14, Math.cos(i * 2.1) * 0.15); g.add(l); }
      const fl = [0, 1, 2].map(i => { const c = new T.Mesh(new T.ConeGeometry(0.24 - i * 0.05, 0.75 - i * 0.12, 8), new T.MeshBasicMaterial({ color: [0xff7a2e, 0xffb13d, 0xffe58a][i], transparent: true, opacity: 0.85, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false })); c.position.y = 0.45 + i * 0.03; g.add(c); return c; });
      const gl = glow(0xff9a50, 4, 0.7); gl.position.y = 0.6; g.add(gl);
      const light = new T.PointLight(0xff8a3c, 0, 16, 1.6); light.position.set(0, 1.1, 0); g.add(light); vlight(light);
      const EN = 24, ep = new Float32Array(EN * 3), es = [], eg = new T.BufferGeometry(); for (let i = 0; i < EN; i++) es.push([rnd() * TAU, rnd() * 3, 0.3 + rnd() * 0.5]); eg.setAttribute('position', new T.BufferAttribute(ep, 3));
      g.add(Object.assign(new T.Points(eg, new T.PointsMaterial({ map: glowTex, color: 0xffb060, size: 0.22, transparent: true, depthWrite: false, blending: T.AdditiveBlending })), { frustumCulled: false }));
      colliders.push({ x: X, z: Z, r: 0.85 });
      return { g, upd(t, dt) { const q = 0.78 + 0.22 * Math.sin(t * 13) + 0.12 * Math.sin(t * 7.3); fl.forEach((c, i) => { c.scale.set(1 + Math.sin(t * 9 + i) * 0.08, q * (1 + i * 0.05), 1 + Math.cos(t * 8 + i) * 0.08); c.rotation.y = t * 2 + i; }); light.intensity = (3 + nightF * 10) * q; gl.material.opacity = (0.35 + nightF * 0.4) * q;
        for (let i = 0; i < EN; i++) { const e = es[i]; e[1] += dt * e[2]; if (e[1] > 3) { e[1] = 0; e[0] = rnd() * TAU; } const r = 0.15 + e[1] * 0.12; ep[i * 3] = Math.cos(e[0] + t) * r; ep[i * 3 + 1] = 0.5 + e[1]; ep[i * 3 + 2] = Math.sin(e[0] + t) * r; } eg.attributes.position.needsUpdate = true; } };
    } },
    shrooms: { mk() {
      const g = new T.Group(); scene.add(g); const cols = ['#6fe3ff', '#c99bff', '#ff9ad0', '#9affc8'], mats = [], gls = [];
      for (let i = 0; i < 11; i++) {
        const a = rnd() * TAU, d = Math.sqrt(rnd()) * 2.8, x = 9 + Math.cos(a) * d, z = -6 + Math.sin(a) * d, y = groundH(x, z), s = 0.5 + rnd() * 0.9, c = cols[i % 4];
        const st = shadowy(new T.Mesh(new T.CylinderGeometry(0.06 * s, 0.09 * s, 0.4 * s, 6), std('#f4ead8', 0.9))); st.position.set(x, y + 0.2 * s, z); g.add(st);
        const m = new T.MeshStandardMaterial({ color: c, emissive: new T.Color(c), emissiveIntensity: 0.4, roughness: 0.5 }); mats.push(m);
        const cp = shadowy(new T.Mesh(new T.SphereGeometry(0.24 * s, 12, 8, 0, TAU, 0, Math.PI / 2), m)); cp.position.set(x, y + 0.4 * s, z); cp.rotation.set((rnd() - 0.5) * 0.3, 0, (rnd() - 0.5) * 0.3); g.add(cp);
        const gl = glow(c, 1.6 * s, 0.1); gl.position.set(x, y + 0.5 * s, z); g.add(gl); gls.push(gl);
      }
      return { g, upd(t) { mats.forEach((m, i) => { m.emissiveIntensity = 0.35 + nightF * 1.8 + AU.treb * 1.4 + Math.sin(t * 1.5 + i) * 0.1; }); gls.forEach(l => { l.material.opacity = 0.08 + nightF * 0.55 + AU.treb * 0.3; }); } };
    } }
  };

  /* presentes espalhados pela ilha */
  const gifts = [], bursts = [];
  ITEMS.forEach(it => {
    let [x, z] = it.spot; for (let k = 0; k < 14 && groundH(x, z) < 0.45; k++) { x *= 0.93; z *= 0.93; }
    const col = SLOTCOL[it.slot], g = new T.Group(), y = groundH(x, z) + 1.05; g.position.set(x, y, z);
    const gem = new T.Mesh(new T.IcosahedronGeometry(0.2, 0), new T.MeshStandardMaterial({ color: '#ffffff', emissive: new T.Color(col), emissiveIntensity: 1.1, roughness: 0.2 })); g.add(gem);
    const r1 = new T.Mesh(new T.TorusGeometry(0.36, 0.012, 6, 36), new T.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.8, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false })); g.add(r1);
    const gl = glow(col, 2.4, 0.8); g.add(gl);
    const beam = new T.Mesh(new T.CylinderGeometry(0.035, 0.035, 11, 6, 1, true), new T.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.25, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false, fog: false })); beam.position.y = 5.2; g.add(beam);
    scene.add(g); gifts.push({ it, g, gem, r1, gl, beam, y, ph: rnd() * 9, vis: 0 });
  });
  function burst(x, y, z, col) {
    const N = 28, pos = new Float32Array(N * 3), vel = [], g = new T.BufferGeometry(); for (let i = 0; i < N; i++) { pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z; const a = rnd() * TAU, u = rnd() * 2 - 1, r = Math.sqrt(1 - u * u), sp = 1.5 + rnd() * 2.8; vel.push([Math.cos(a) * r * sp, u * sp + 1.5, Math.sin(a) * r * sp]); }
    g.setAttribute('position', new T.BufferAttribute(pos, 3)); const m = new T.PointsMaterial({ map: glowTex, color: col, size: 0.55, transparent: true, depthWrite: false, blending: T.AdditiveBlending }); const p = new T.Points(g, m); p.frustumCulled = false; scene.add(p); bursts.push({ p, pos, vel, N, g, m, t: 0 });
  }
  const toastEl = $('toast'); let toastT = 0;
  function toast(a, b) { toastEl.firstElementChild.textContent = a; toastEl.lastElementChild.textContent = b; toastEl.classList.add('on'); toastT = 4.2; }
  function collect(it) {
    if (owns(it.id)) return; S.own.push(it.id);
    if (it.slot === 'decor') S.decor[it.id] = true; else if (it.slot === 'site') S.site[it.id] = true; else S.eq[it.slot] = it.id;
    save(); applyCos(); if (it.slot === 'site') postSite();
    toast('✦ Novo: ' + it.name, it.slot === 'site' ? 'Liberado no Ressonância. Ligue em ✦ Personalizar, na tela principal.' : 'Já está em uso. Abra o guarda-roupa (C) para trocar.');
    const g = gifts.find(x => x.it === it); burst(g.g.position.x, g.g.position.y, g.g.position.z, SLOTCOL[it.slot]);
  }
  function cosStep(dt, t) {
    for (const k in accs) if (accs[k].g.visible && accs[k].upd) accs[k].upd(t);
    for (const k in DEC) { const o = DEC[k].obj; if (o && o.g.visible && o.upd) o.upd(t, dt); }
    for (const gf of gifts) {
      const want = owns(gf.it.id) ? 0 : (gf.it.night ? smooth(0.4, 0.7, nightF) : 1); gf.vis = ez(gf.vis, want, 3, dt); gf.g.visible = gf.vis > 0.02;
      if (!gf.g.visible) continue;
      gf.g.scale.setScalar(gf.vis); gf.g.position.y = gf.y + Math.sin(t * 1.6 + gf.ph) * 0.12; gf.gem.rotation.set(t * 0.7, t * 1.1, 0); gf.r1.rotation.set(Math.PI / 2 + Math.sin(t + gf.ph) * 0.4, t * 0.8, 0);
      gf.beam.material.opacity = (0.05 + nightF * 0.3) * (0.8 + 0.2 * Math.sin(t * 2 + gf.ph)) * gf.vis; gf.gl.material.opacity = 0.55 + 0.25 * Math.sin(t * 2.2 + gf.ph);
      if (want && Math.hypot(P.x - gf.g.position.x, P.z - gf.g.position.z) < 1.35 && Math.abs(P.y + 1.0 - gf.g.position.y) < 1.8) collect(gf.it);
    }
    for (let i = bursts.length - 1; i >= 0; i--) { const b = bursts[i]; b.t += dt; for (let j = 0; j < b.N; j++) { b.vel[j][1] -= 2.5 * dt; b.pos[j * 3] += b.vel[j][0] * dt; b.pos[j * 3 + 1] += b.vel[j][1] * dt; b.pos[j * 3 + 2] += b.vel[j][2] * dt; } b.g.attributes.position.needsUpdate = true; b.m.opacity = Math.max(0, 1 - b.t / 1.3); if (b.t > 1.3) { scene.remove(b.p); b.g.dispose(); b.m.dispose(); bursts.splice(i, 1); } }
    if (toastT > 0) { toastT -= dt; if (toastT <= 0) toastEl.classList.remove('on'); }
  }

  /* guarda-roupa */
  const wardEl = $('ward'); let wardOpen = false, camSave = null;
  function refreshWard() {
    $('wCount').textContent = S.own.length + '/' + ITEMS.length;
    if (!wardOpen) return;
    const box = $('wList'); box.replaceChildren();
    for (const slot in SLOTS) {
      const its = ITEMS.filter(i => i.slot === slot); const h = document.createElement('h4'); h.textContent = SLOTS[slot]; box.appendChild(h);
      its.forEach(it => {
        const own = owns(it.id), on = own && (slot === 'decor' ? !!S.decor[it.id] : slot === 'site' ? !!S.site[it.id] : S.eq[slot] === it.id);
        const b = document.createElement('button'); b.type = 'button'; b.className = 'wi' + (on ? ' on' : '') + (own ? '' : ' lock'); b.disabled = !own;
        const dot = document.createElement('i'); dot.style.background = own ? '#' + SLOTCOL[slot].toString(16).padStart(6, '0') : 'transparent'; const nm = document.createElement('span'); nm.textContent = own ? it.name : '? ? ?';
        const sub = document.createElement('small'); sub.textContent = own ? (on ? (slot === 'decor' || slot === 'site' ? 'ligado' : 'vestindo') : (slot === 'decor' || slot === 'site' ? 'desligado' : 'guardado')) : it.hint;
        b.append(dot, nm, sub);
        b.addEventListener('click', () => { toggleItem(it); b.blur(); });
        box.appendChild(b);
      });
    }
  }
  function toggleItem(it) {
    if (!owns(it.id)) return;
    if (it.slot === 'decor') S.decor[it.id] = !S.decor[it.id]; else if (it.slot === 'site') { S.site[it.id] = !S.site[it.id]; postSite(); } else S.eq[it.slot] = S.eq[it.slot] === it.id ? '' : it.id;
    save(); applyCos();
  }
  function toggleWard(on) {
    wardOpen = on === undefined ? !wardOpen : on; wardEl.style.display = wardOpen ? 'flex' : 'none';
    if (wardOpen) { camSave = { dist: CAM.dist, pitch: CAM.pitch }; refreshWard(); } else if (camSave) { CAM.dist = camSave.dist; CAM.pitch = camSave.pitch; camSave = null; try { cv.focus({ preventScroll: true }); } catch (e) {} }
  }
  $('bWard').addEventListener('click', () => toggleWard()); $('wClose').addEventListener('click', () => toggleWard(false));
  $('wOff').addEventListener('click', () => { for (const k in S.eq) S.eq[k] = ''; save(); applyCos(); });
  /* com o guarda-roupa aberto, a câmera se aproxima para você se ver */
  function wardCam(dt) { if (!wardOpen || drag) return; CAM.dist = ez(CAM.dist, 5.4, 3, dt); CAM.pitch = ez(CAM.pitch, 0.16, 3, dt); let d = P.yaw + 0.5 - CAM.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); CAM.yaw += d * (1 - Math.exp(-dt * 3)); }

  /* ───────── módulos extras (jardim, pesca, ilhas novas, livro...) ─────────
     Cada módulo fica num arquivo próprio (js/x-*.js), se registra em window.IlhaExt e recebe este "contexto" com as ferramentas do mundo. */
  const XC = {
    T, THREE: T, scene, camera, renderer, $, P, PS, CAM, keys, cv, hero, hemi, sun, water, U, AU, clock, colliders, extH, bio, nightMats, lamps, ISLES, ISL, DECKS, DOCKS, DEST, BENCHES, isleH, isleR, isleTerrain, groundH, baseH, onLand, makeDock, travel, curIsle, boatNear, fadeEl, toParent,
    std, shadowy, glow, glowTex, lantern, makeBench, makeTree, rock, vlight, rnd, mulberry, smooth, clamp, lerp, ez, TAU, toast, burst, startEmote, tileGrid, boatMesh,
    get night() { return nightF; }, get phase() { return phase; }, get fog() { return scene.fog; },
    ticks: [], post: [], modal: 0, hint: null, act: null, key: null, ptr: null, camOv: null, live(o) { o.traverse(n => { n.userData.keep = true; }); return o; }
  };
  window.__XC = XC;
  (window.IlhaExt || []).forEach(f => { try { f(XC); } catch (e) { console.error('módulo extra falhou', e); } });

  /* ───────── otimização da cena (feita uma vez, depois que tudo foi criado) ─────────
     1) objetos pequenos que não se mexem são agrupados em blocos de 20 m; blocos longe de você nem são desenhados;
     2) objetos minúsculos deixam de projetar sombra (ninguém vê a sombra de uma pedrinha);
     3) as sombras são recalculadas em quadros alternados. */
  const cellGroups = []; let mergedCount = 0;
  (function optimizeScene() {
    scene.updateMatrixWorld(true);
    const wp = new T.Vector3(), skip = o => { for (let p = o; p; p = p.parent) if (p === hero.g || p === water) return true; return false; };
    const list = []; scene.children.forEach(o => { if (o.isLight || o.isCamera || o === water || o === sun.target || o === hero.g || o.isSprite) return; list.push(o); });
    const pos0 = new Map(); list.forEach(o => { o.getWorldPosition(wp); pos0.set(o, wp.clone()); });
    const snap = new Map(); list.forEach(o => o.traverse(n => { if (n.isMesh) snap.set(n, n.matrixWorld.elements.slice()); }));
    /* roda a animação um pouco para descobrir o que anda sozinho (borboletas, nuvens, barcos...) */
    for (let k = 1; k <= 3; k++) { try { lifeStep(0.9, 40 + k * 0.9); isleStep(0.9, 40 + k * 0.9); } catch (e) {} } scene.updateMatrixWorld(true);
    const moving = new Set(); snap.forEach((el, n) => { const e2 = n.matrixWorld.elements; for (let i = 0; i < 16; i++) if (Math.abs(e2[i] - el[i]) > 1e-5) { moving.add(n); break; } });
    const cells = new Map(), box = new T.Box3(), sph = new T.Sphere();
    for (const o of list) {
      if (o.isPoints || o.isInstancedMesh || o.frustumCulled === false || o.isLine) continue;
      o.getWorldPosition(wp); if (wp.distanceTo(pos0.get(o)) > 0.15) continue;
      box.setFromObject(o); if (box.isEmpty()) continue; box.getBoundingSphere(sph);
      if (sph.radius > 7 || sph.center.y > 60) continue;
      const k = Math.floor(sph.center.x / 20) + ',' + Math.floor(sph.center.z / 20); let c = cells.get(k);
      if (!c) { c = new T.Group(); c.matrixAutoUpdate = true; c.userData.cx = (Math.floor(sph.center.x / 20) + 0.5) * 20; c.userData.cz = (Math.floor(sph.center.z / 20) + 0.5) * 20; cells.set(k, c); scene.add(c); cellGroups.push(c); }
      c.add(o);
    }
    scene.traverse(o => {
      if (!o.isMesh || !o.castShadow || skip(o)) return;
      if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
      if (o.geometry.boundingSphere.radius * o.matrixWorld.getMaxScaleOnAxis() < 0.3) o.castShadow = false;
    });
    /* junta, em cada bloco, todas as peças estáticas de mesmo material numa malha só (centenas de chamadas de desenho viram dezenas) */
    const sig = (m, n) => [m.color.getHex(), m.roughness, m.metalness, m.side, m.flatShading ? 1 : 0, m.fog ? 1 : 0, n.castShadow ? 1 : 0, n.receiveShadow ? 1 : 0].join('|');
    const nm = new T.Matrix3(), vp = new T.Vector3(), vn = new T.Vector3();
    for (const cg of cellGroups) {
      const buckets = new Map(), meshes = [];
      cg.traverse(n => { if (n.isMesh && !n.isSkinnedMesh && !n.isInstancedMesh && !moving.has(n)) meshes.push(n); });
      for (const n of meshes) {
        const m = n.material, g = n.geometry;
        if (Array.isArray(m) || !m.isMeshStandardMaterial || m.transparent || m.map || m.vertexColors || m.alphaTest || m.emissive.getHex() !== 0 || m.emissiveMap) continue;
        if (!g.attributes.position || !g.attributes.normal || g.morphAttributes.position) continue;
        if (n.userData.keep || !n.visible) continue;
        for (let p = n; p && p !== cg; p = p.parent) if (!p.visible) { p = null; break; }
        const k = sig(m, n); let b = buckets.get(k); if (!b) buckets.set(k, b = { m, cast: n.castShadow, recv: n.receiveShadow, list: [] }); b.list.push(n);
      }
      for (const [, b] of buckets) {
        if (b.list.length < 2) continue;
        let nv = 0, ni = 0; for (const n of b.list) { const g = n.geometry; nv += g.attributes.position.count; ni += g.index ? g.index.count : g.attributes.position.count; }
        const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), idx = new Uint32Array(ni); let vo = 0, io = 0;
        for (const n of b.list) {
          const g = n.geometry, P0 = g.attributes.position, N0 = g.attributes.normal, mw = n.matrixWorld; nm.getNormalMatrix(mw);
          for (let i = 0; i < P0.count; i++) { vp.fromBufferAttribute(P0, i).applyMatrix4(mw); vn.fromBufferAttribute(N0, i).applyMatrix3(nm).normalize(); pos.set([vp.x, vp.y, vp.z], (vo + i) * 3); nor.set([vn.x, vn.y, vn.z], (vo + i) * 3); }
          if (g.index) for (let i = 0; i < g.index.count; i++) idx[io++] = g.index.getX(i) + vo; else for (let i = 0; i < P0.count; i++) idx[io++] = vo + i;
          vo += P0.count; n.parent.remove(n);
        }
        const mg = new T.BufferGeometry(); mg.setAttribute('position', new T.BufferAttribute(pos, 3)); mg.setAttribute('normal', new T.BufferAttribute(nor, 3)); mg.setIndex(new T.BufferAttribute(idx, 1)); mg.computeBoundingSphere();
        const mm = new T.Mesh(mg, b.m); mm.castShadow = b.cast; mm.receiveShadow = b.recv; cg.add(mm); mergedCount += b.list.length;
      }
    }
  })();

  const CELL_FAR = 105;
  function cellStep() { for (const c of cellGroups) c.visible = Math.hypot(P.x - c.userData.cx, P.z - c.userData.cz) < CELL_FAR; }
  applyCos(); postSite();

  let lastQ = 0, lastFrame = 0, shFlip = 0;
  function loop() {
    requestAnimationFrame(loop);
    const now = performance.now(); if (now - lastFrame < 14.5) return; lastFrame = now;
    const dt = Math.min(0.05, clock.getDelta()), t = clock.elapsedTime; U.uTime.value = t;
    step(dt, t); dayStep(dt); for (const f of XC.post) f(dt, t); wardCam(dt); camStep(dt); reactorStep(dt, t); lifeStep(dt, t); cosStep(dt, t); isleStep(dt, t); for (const f of XC.ticks) f(dt, t); exStep(dt, t); cullStep(); lightPool(dt); cellStep();
    if (hintT && t > hintT) $('hint').classList.add('off');
    renderer.shadowMap.needsUpdate = ((shFlip++) & 1) === 0;
    renderer.render(scene, camera);
    frames++; accT += dt;
    if (frames === 90) {
      const avg = accT / frames; frames = 0; accT = 0;
      if (qAuto && t - lastQ > 2) { if (avg > 0.032 && prNow > 0.55) { prNow = Math.max(0.55, prNow * 0.85); lastQ = t; if (prNow < 0.8 && QUAL[qi].sh) qi = 0; applyQ(); } else if (avg < 0.018 && prNow < QUAL[2].pr && qi >= 1) { prNow = Math.min(QUAL[2].pr, prNow * 1.1); lastQ = t; renderer.setPixelRatio(prNow); resize(); } }
    }
  }
  applyQ(); resize(); dayStep(0.001); camStep(1);
  let vt = 100; window.__ilha = { XC, merged: () => mergedCount, renderer, scene, camera, EX, exMeshes, initEx, ISLES, DOCKS, travel, curIsle, shot: () => { camStep(1); cullStep(); cellStep(); renderer.shadowMap.needsUpdate = true; renderer.render(scene, camera); }, PS, hero, THREE: T, groundH, tick: (n, dt) => { for (let i = 0; i < n; i++) { vt += dt; step(dt, vt); dayStep(dt); for (const f of XC.post) f(dt, vt); camStep(dt); cosStep(dt, vt); lifeStep(dt, vt); isleStep(dt, vt); for (const f of XC.ticks) f(dt, vt); exStep(dt, vt); cullStep(); lightPool(dt); cellStep(); } }, keys, P, CAM, PS, S, ITEMS, collect, toggleWard, startEmote, setPhase: p => { phase = p; }, AU };
  toParent({ nb: 'ready' });
  loop();
})();
