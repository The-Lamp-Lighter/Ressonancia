/* Ilha de Repouso — lugares novos: Cristais, Cachoeiras, Farol, Vila Flutuante e Gruta Submarina. */
(window.IlhaExt = window.IlhaExt || []).push(function (XC) {
  'use strict';
  const T = XC.T, scene = XC.scene, groundH = XC.groundH, std = XC.std, shadowy = XC.shadowy, glow = XC.glow, rnd = XC.rnd, smooth = XC.smooth, clamp = XC.clamp, lerp = XC.lerp, TAU = XC.TAU, colliders = XC.colliders, AU = XC.AU, P = XC.P, camera = XC.camera, CAM = XC.CAM;
  const ISL = XC.ISL, SP = XC.spots;
  const gates = [];                                             /* objetos soltos que só ficam ligados perto do jogador */
  const gate = (objs, cx, cz, R) => { const g = { objs, cx, cz, R, on: null }; gates.push(g); return g; };
  XC.ticks.push(() => { for (const g of gates) { const on = Math.hypot(P.x - g.cx, P.z - g.cz) < g.R; if (on !== g.on) { g.on = on; for (const o of g.objs) o.visible = on; } } });
  const hueCol = (h, s, l) => new T.Color().setHSL(h, s, l);
  const wrapA = a => Math.atan2(Math.sin(a), Math.cos(a));
  /* anel de colisões em volta de um ponto, com uma abertura opcional */
  function ringColl(cx, cz, R, n, rr, gapA, gapW, y0, y1) { for (let i = 0; i < n; i++) { const a = i / n * TAU; if (gapA !== undefined && Math.abs(wrapA(a - gapA)) < gapW) continue; const c = { x: cx + Math.cos(a) * R, z: cz + Math.sin(a) * R, r: rr }; if (y0 !== undefined) { c.y0 = y0; c.y1 = y1; } colliders.push(c); } }

  /* ============ ILHA DOS CRISTAIS ============ */
  (function () {
    const Is = ISL.C, cx = Is.x, cz = Is.z, eA = Math.atan2(-cz, -cx), gy = 1.0;
    /* a cúpula de pedra: meia esfera facetada, com uma boca em arco virada para o cais */
    const R = 11.8, H = 8.8, sg = new T.SphereGeometry(1, 30, 14, 0, TAU, 0, Math.PI / 2), sp = sg.attributes.position, idx0 = sg.index.array, col = new Float32Array(sp.count * 3), cc = new T.Color();
    for (let i = 0; i < sp.count; i++) {
      const x = sp.getX(i), y = sp.getY(i), z = sp.getZ(i), a = Math.atan2(z, x), n = 1 + 0.07 * Math.sin(a * 5 + y * 3) + 0.05 * Math.sin(a * 11 - y * 5) + 0.06 * Math.sin(y * 6 + a * 2);
      sp.setXYZ(i, x * R * n, y * H * (0.94 + 0.08 * Math.sin(a * 3)) , z * R * n);
      cc.set('#4a4366').lerp(cc.clone().set('#7a70a8'), smooth(0, 0.9, y)).multiplyScalar(0.85 + 0.2 * Math.sin(a * 7 + y * 9)); col[i * 3] = cc.r; col[i * 3 + 1] = cc.g; col[i * 3 + 2] = cc.b;
    }
    const keep = [];
    for (let t = 0; t < idx0.length; t += 3) {
      const a0 = idx0[t], a1 = idx0[t + 1], a2 = idx0[t + 2], mx = (sp.getX(a0) + sp.getX(a1) + sp.getX(a2)) / 3, my = (sp.getY(a0) + sp.getY(a1) + sp.getY(a2)) / 3, mz = (sp.getZ(a0) + sp.getZ(a1) + sp.getZ(a2)) / 3;
      const da = Math.abs(wrapA(Math.atan2(mz, mx) - eA)), arch = 5.2 * Math.cos(Math.min(1, da / 0.3) * Math.PI / 2);
      if (da < 0.3 && my < arch + 0.6) continue; keep.push(a0, a1, a2);
    }
    sg.setIndex(keep); sg.setAttribute('color', new T.BufferAttribute(col, 3)); sg.computeVertexNormals();
    const dome = shadowy(new T.Mesh(sg, new T.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true, side: T.DoubleSide })), true, true); dome.position.set(cx, 0, cz); scene.add(dome);
    /* boca da caverna: pedras em arco */
    for (let k = 0; k < 9; k++) { const u = k / 8, a = eA + lerp(-0.34, 0.34, u), hh = 5.2 * Math.cos(Math.abs(u - 0.5) * 2 * Math.PI / 2 * 0.98) + 0.2, r = R * 0.985; const st = shadowy(new T.Mesh(new T.DodecahedronGeometry(0.75 + (k % 3) * 0.12, 0), std('#8a80b4', 1))); st.position.set(cx + Math.cos(a) * r, hh, cz + Math.sin(a) * r); st.rotation.set(k, k * 2, 0); scene.add(st); }
    ringColl(cx, cz, R - 0.7, 44, 1.0, eA, 0.4);
    /* cristais: 6 matizes, cada um uma malha instanciada */
    const spike = new T.CylinderGeometry(0.02, 0.3, 1, 6, 1); spike.translate(0, 0.5, 0);
    const NB = 6, mats = [], ims = [], cnt = new Array(NB).fill(0), plan = [], dm = new T.Object3D();
    for (let b = 0; b < NB; b++) mats.push(new T.MeshStandardMaterial({ color: hueCol(b / NB, 0.5, 0.62), emissive: hueCol(b / NB, 0.9, 0.5), emissiveIntensity: 0.35, roughness: 0.2, metalness: 0.15, transparent: true, opacity: 0.93, flatShading: true }));
    const addCl = (x, z, y, n, sc, up) => { for (let i = 0; i < n; i++) { const b = (rnd() * NB) | 0, s = sc * (0.5 + rnd() * 0.9), tl = 0.5 + rnd() * 0.5, a = rnd() * TAU; plan.push({ b, x: x + (rnd() - 0.5) * 1.3, y, z: z + (rnd() - 0.5) * 1.3, s, tx: Math.cos(a) * tl * 0.45 * (up ? 1 : 0.3), tz: Math.sin(a) * tl * 0.45 * (up ? 1 : 0.3), up }); cnt[b]++; } };
    for (let k = 0; k < 24; k++) { const a = k / 24 * TAU + rnd() * 0.2; if (Math.abs(wrapA(a - eA)) < 0.5) continue; const r = 8.1 + rnd() * 2.2; addCl(cx + Math.cos(a) * r, cz + Math.sin(a) * r, groundH(cx + Math.cos(a) * r, cz + Math.sin(a) * r) - 0.1, 4, 2.0 + rnd() * 1.6, true); }
    for (let k = 0; k < 7; k++) { const a = k / 7 * TAU + 0.5, r = 3 + rnd() * 2.5; addCl(cx + Math.cos(a) * r, cz + Math.sin(a) * r, gy - 0.1, 3, 0.9 + rnd() * 0.7, true); }
    for (let k = 0; k < 28; k++) { const a = rnd() * TAU, r = rnd() * 9; if (Math.abs(wrapA(a - eA)) < 0.4 && r > 6) continue; addCl(cx + Math.cos(a) * r, cz + Math.sin(a) * r, 7.6 - r * 0.28 + rnd() * 0.4, 1, 1.4 + rnd() * 1.4, false); }
    for (let k = 0; k < 14; k++) { const a = rnd() * TAU, r = 15 + rnd() * 6, x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r; if (groundH(x, z) > 0.55) addCl(x, z, groundH(x, z) - 0.1, 3, 1.2 + rnd() * 1.4, true); }
    const done = new Array(NB).fill(0); plan.forEach(c => { const m = ims[c.b] || (ims[c.b] = new T.InstancedMesh(spike, mats[c.b], cnt[c.b])); dm.position.set(c.x, c.y, c.z); if (c.up) { dm.rotation.set(c.tz * 0.9, rnd() * TAU, -c.tx * 0.9); dm.scale.set(c.s * 0.5, c.s * 1.25, c.s * 0.5); } else { dm.rotation.set(Math.PI + c.tz * 0.5, rnd() * TAU, c.tx * 0.5); dm.scale.set(c.s * 0.45, c.s * 1.0, c.s * 0.45); } dm.updateMatrix(); m.setMatrixAt(done[c.b]++, dm.matrix); });
    ims.forEach(m => { m.frustumCulled = false; scene.add(m); });
    /* o grande cristal do centro, em cima de um pedestal */
    const ped = shadowy(new T.Mesh(new T.CylinderGeometry(2.1, 2.5, 0.5, 20), std('#8e86b8', 0.8))); ped.position.set(cx, gy + 0.2, cz); scene.add(ped);
    const bigM = new T.MeshStandardMaterial({ color: '#ffffff', emissive: hueCol(0.8, 0.8, 0.6), emissiveIntensity: 1.0, roughness: 0.15, transparent: true, opacity: 0.94, flatShading: true });
    const big = new T.Mesh(new T.OctahedronGeometry(1, 0), bigM); big.scale.set(1.0, 2.3, 1.0); big.position.set(cx, gy + 3.5, cz); scene.add(big);
    const halo = glow(0xc9a6ff, 9, 0.7); halo.position.copy(big.position); scene.add(halo);
    colliders.push({ x: cx, z: cz, r: 2.2 });
    const rings = []; for (let i = 0; i < 2; i++) { const r = new T.Mesh(new T.RingGeometry(3.6 + i * 1.5, 3.74 + i * 1.5, 56), new T.MeshBasicMaterial({ color: 0xc9a6ff, transparent: true, opacity: 0.6, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, toneMapped: false })); r.rotation.x = -Math.PI / 2; r.position.set(cx, gy + 0.05, cz); scene.add(r); rings.push(r); }
    const cl = new T.PointLight(0xc9a6ff, 0, 24, 1.5); cl.position.set(cx, gy + 3.2, cz); scene.add(cl); XC.vlight(cl);
    /* lagoa de cristal do lado de fora */
    let px = cx + 11, pz = cz - 12, bestRg = 1e9, pTop = 0.6;
    const rangeAt = (x, z) => { let lo = 1e9, hi = -1e9; for (let k = 0; k < 14; k++) { const q = k < 13 ? k / 13 * TAU : 0, rr = k < 13 ? 4.4 : 0, h = groundH(x + Math.cos(q) * rr, z + Math.sin(q) * rr); lo = Math.min(lo, h); hi = Math.max(hi, h); } return [lo, hi]; };
    for (let ia = 0; ia < 28; ia++) for (let rr = 13; rr <= 19; rr += 2) { const a2 = ia / 28 * TAU, x = cx + Math.cos(a2) * rr, z = cz + Math.sin(a2) * rr; if (Math.abs(wrapA(a2 - eA)) < 0.7) continue; const [lo, hi] = rangeAt(x, z); if (lo < 0.5) continue; if (hi - lo < bestRg) { bestRg = hi - lo; px = x; pz = z; pTop = hi; } }
    const pondM = [new T.MeshStandardMaterial({ color: '#2c5a78', roughness: 0.8 }), new T.MeshStandardMaterial({ color: '#8fd8ff', roughness: 0.1, metalness: 0.2, emissive: new T.Color('#6a8cff'), emissiveIntensity: 0.18 }), new T.MeshStandardMaterial({ color: '#2c5a78' })];
    const pond = new T.Mesh(new T.CylinderGeometry(4.2, 4.2, 1.6, 32), pondM); pond.position.set(px, pTop + 0.05 - 0.8, pz); scene.add(pond); pond.position.y += 0; const pondTop = pTop + 0.05;
    SP.fish.push({ biome: 'cristal', x: px, z: pz, r: 4.2, y: pondTop });
    SP.stone.push({ id: 'n8', x: cx + 4.2, z: cz - 3.2 });
    SP.critter.push({ id: 'morcego', x: cx, z: cz, mode: 'fly', R: 6.5, h: 3.4, night: true });
    for (let k = 0, tr = 0; k < 10 && tr < 200; tr++) { const a = rnd() * TAU, r = 13 + rnd() * 9, x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r; if (groundH(x, z) < 0.6 || Math.hypot(x - px, z - pz) < 6) continue; XC.rock(x, z, 0.6 + rnd() * 1.1); k++; }
    XC.lantern(cx + Math.cos(eA) * 13.6 - Math.sin(eA) * 2.4, cz + Math.sin(eA) * 13.6 + Math.cos(eA) * 2.4, 2.3); XC.lantern(cx + Math.cos(eA) * 13.6 + Math.sin(eA) * 2.4, cz + Math.sin(eA) * 13.6 - Math.cos(eA) * 2.4, 2.3);
    gate([dome, ...ims, big, halo, ...rings, pond], cx, cz, 170);
    /* a câmera fica dentro da caverna quando você está lá */
    XC.camOvs.push(() => {
      if (Math.hypot(P.x - cx, P.z - cz) < 10.8 && P.y < 6) { const dx = camera.position.x - cx, dz = camera.position.z - cz, d = Math.hypot(dx, dz); if (d > 9.3) { camera.position.x = cx + dx / d * 9.3; camera.position.z = cz + dz / d * 9.3; } camera.position.y = Math.min(camera.position.y, 6.3); camera.lookAt(CAM.tx, CAM.ty, CAM.tz); }
    });
    XC.ticks.push((dt, t) => {
      if (!gates.find(g => g.cx === cx).on) return;
      const nB = 6; for (let b = 0; b < nB; b++) { const e = AU.b[b * 8 + 2] || 0; mats[b].emissiveIntensity = 0.45 + e * 2.4 + AU.pulse * 0.5 + 0.1 * Math.sin(t * 1.3 + b); mats[b].emissive.setHSL((b / nB + t * 0.02) % 1, 0.9, 0.5); }
      bigM.emissiveIntensity = 0.8 + AU.level * 2.4 + AU.pulse * 1.0; bigM.emissive.setHSL((t * 0.03) % 1, 0.85, 0.6); big.rotation.y = t * 0.5; big.position.y = gy + 3.5 + Math.sin(t * 0.9) * 0.2; big.scale.set(1 + AU.bass * 0.3, 2.3 + AU.bass * 0.6, 1 + AU.bass * 0.3);
      halo.position.y = big.position.y; halo.scale.setScalar(8 + AU.bass * 5); halo.material.color.copy(bigM.emissive); halo.material.opacity = 0.45 + AU.level * 0.5;
      rings.forEach((r, i) => { r.material.color.copy(bigM.emissive); r.material.opacity = 0.35 + AU.mid * 0.6; r.scale.setScalar(1 + AU.pulse * 0.12 * (i + 1)); });
      cl.color.copy(bigM.emissive); cl.intensity = 5 + AU.level * 14 + AU.pulse * 6;
    });
  })();


  /* ============ ILHA DAS CACHOEIRAS ============ */
  const flowMat = new T.ShaderMaterial({
    transparent: true, depthWrite: false, side: T.DoubleSide, uniforms: { uT: { value: 0 }, uDay: { value: 1 }, uFog: { value: new T.Color() }, uFN: { value: 70 }, uFF: { value: 330 } },
    vertexShader: 'attribute float aU;attribute float aS;attribute float aX;varying float vU,vS,vX;varying vec3 vW;void main(){vU=aU;vS=aS;vX=aX;vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}',
    fragmentShader: `uniform float uT,uDay,uFN,uFF;uniform vec3 uFog;varying float vU,vS,vX;varying vec3 vW;
      void main(){float x=vX,sp=.7+vS*3.2;float n1=sin(vU*2.3-uT*sp*2.+sin(x*9.)*1.5)*.5+.5,n2=sin(vU*5.1-uT*sp*3.1+x*14.)*.5+.5;
        float foam=clamp(vS*1.1+n1*n2*.5*(.3+vS)+smoothstep(.3,0.,min(x,1.-x))*.35,0.,1.);
        vec3 base=mix(vec3(.10,.55,.68),vec3(.05,.36,.6),n1*.6);vec3 col=mix(base,vec3(.9,.97,1.),foam*.8)*(.3+.42*uDay);
        float a=.97*smoothstep(0.,.14,x)*smoothstep(1.,.86,x);col=mix(col,uFog,smoothstep(uFN,uFF,length(cameraPosition-vW)));
        gl_FragColor=vec4(col,a);
        #include <tonemapping_fragment>
        #include <encodings_fragment>
      }`
  });
  function ribbon(pts, w, lift) {
    /* pts: [x,z] absolutos; a fita acompanha o relevo */
    const path = []; for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.9)); for (let k = 0; k < n; k++) path.push([lerp(a[0], b[0], k / n), lerp(a[1], b[1], k / n)]); } path.push(pts[pts.length - 1]);
    const N = path.length, pos = new Float32Array(N * 2 * 3), aU = new Float32Array(N * 2), aS = new Float32Array(N * 2), aX = new Float32Array(N * 2), idx = []; let u = 0, prevY = 0;
    for (let i = 0; i < N; i++) {
      const a = path[Math.max(0, i - 1)], b = path[Math.min(N - 1, i + 1)], dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1, nx = -dz / l, nz = dx / l, x = path[i][0], z = path[i][1];
      const y = groundH(x, z) + lift; if (i) u += Math.hypot(x - path[i - 1][0], z - path[i - 1][1]); const st = i ? clamp(Math.abs(y - prevY) / 0.9 * 1.4, 0, 1) : 0; prevY = y;
      const wl = w * (0.5 + 0.5 * smooth(0, 0.08, i / N)), L = [x + nx * wl / 2, groundH(x + nx * wl / 2, z + nz * wl / 2) + lift, z + nz * wl / 2], Rr = [x - nx * wl / 2, groundH(x - nx * wl / 2, z - nz * wl / 2) + lift, z - nz * wl / 2];
      pos.set(L, i * 6); pos.set(Rr, i * 6 + 3); aU[i * 2] = aU[i * 2 + 1] = u; aS[i * 2] = aS[i * 2 + 1] = st; aX[i * 2] = 0; aX[i * 2 + 1] = 1;
      if (i < N - 1) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
    }
    for (let i = 1; i < N; i++) { aS[i * 2] = aS[i * 2 + 1] = (aS[i * 2] + aS[(i - 1) * 2]) / 2; }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('aU', new T.BufferAttribute(aU, 1)); g.setAttribute('aS', new T.BufferAttribute(aS, 1)); g.setAttribute('aX', new T.BufferAttribute(aX, 1)); g.setIndex(idx);
    const m = new T.Mesh(g, flowMat); m.renderOrder = 3; m.frustumCulled = false; scene.add(m); return m;
  }
  (function () {
    const Is = ISL.W, cx = Is.x, cz = Is.z, at = (dx, dz) => [cx + dx, cz + dz];
    const rb = [ribbon([at(0, -21), at(0, -14), at(0, -9), at(0, -4), at(0, 0), at(0, 3), at(0, 6)], 3.8, 0.1), ribbon([at(-9, -19), at(-9, -10), at(-9, -4), at(-8, 1), at(-6, 5)], 2.0, 0.1), ribbon([at(9, -19), at(9, -10), at(9, -4), at(8, 1), at(6, 5)], 2.0, 0.1)];
    /* lagoa */
    const pc = at(0, 8.2), pond = new T.Mesh(new T.CylinderGeometry(7.8, 7.8, 0.06, 40), new T.MeshStandardMaterial({ color: '#7fe3e0', roughness: 0.08, metalness: 0.15, emissive: new T.Color('#2aa6b0'), emissiveIntensity: 0.16, transparent: true, opacity: 0.88 })); pond.position.set(pc[0], 0.36, pc[1]); scene.add(pond);
    const rim = []; for (let k = 0; k < 26; k++) { const a = k / 26 * TAU, r = 7.7 + Math.sin(k * 3) * 0.4; if (a > 4.2 && a < 5.2) continue; const x = pc[0] + Math.cos(a) * r, z = pc[1] + Math.sin(a) * r; if (groundH(x, z) < 0.1) continue; XC.rock(x, z, 0.35 + (k % 3) * 0.2); }
    /* névoa da queda */
    const MN = 80, mp = new Float32Array(MN * 3), ms = []; for (let i = 0; i < MN; i++) ms.push([rnd() * TAU, rnd() * 3.5, rnd() * 4, 0.3 + rnd() * 0.6, rnd() < 0.7 ? 0 : (rnd() < 0.5 ? -9 : 9)]);
    const mg = new T.BufferGeometry(); mg.setAttribute('position', new T.BufferAttribute(mp, 3)); const mist = new T.Points(mg, new T.PointsMaterial({ map: XC.glowTex, color: 0xeaffff, size: 1.0, transparent: true, depthWrite: false, opacity: 0.3, blending: T.AdditiveBlending })); mist.frustumCulled = false; scene.add(mist);
    /* arco-íris (só de dia) */
    const rbM = new T.ShaderMaterial({ transparent: true, depthWrite: false, side: T.DoubleSide, blending: T.AdditiveBlending, fog: false, uniforms: { uA: { value: 0 } },
      vertexShader: 'varying vec2 vP;void main(){vP=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: 'uniform float uA;varying vec2 vP;vec3 hue(float h){return clamp(abs(mod(h*6.+vec3(0.,4.,2.),6.)-3.)-1.,0.,1.);}void main(){float t=(length(vP)-9.2)/2.;if(t<0.||t>1.)discard;vec3 c=hue(1.-t*.85);gl_FragColor=vec4(c*uA*smoothstep(0.,.2,t)*smoothstep(1.,.8,t)*.32,1.);}' });
    const rbw = new T.Mesh(new T.RingGeometry(9.2, 11.2, 48, 1, 0, Math.PI), rbM); rbw.position.set(pc[0] + 3, 0.4, pc[1] - 4.5); rbw.rotation.y = 0.35; rbw.renderOrder = 4; rbw.frustumCulled = false; scene.add(rbw);
    /* mata ao redor */
    const ok = (x, z, minR) => { const dx = x - cx, dz = z - cz; return groundH(x, z) > 0.55 && Math.hypot(dx, dz - 8.2) > minR && !(Math.abs(dx) < 3 && dz < 8) && !(Math.abs(Math.abs(dx) - 9) < 2 && dz < 5); };
    for (let k = 0, tr = 0; k < 16 && tr < 500; tr++) { const a = rnd() * TAU, r = 7 + rnd() * 17, x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r; if (!ok(x, z, 10) || !XC.onLand(Is, x, z, 0.7)) continue; XC.makeTree(x, z, 0.9 + rnd() * 0.8, rnd() < 0.3 ? 'blossom' : 'normal'); k++; }
    const fern = new T.MeshStandardMaterial({ color: '#4fa86a', roughness: 0.9, side: T.DoubleSide });
    for (let k = 0, tr = 0; k < 60 && tr < 900; tr++) { const a = rnd() * TAU, r = 3 + rnd() * 22, x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r; if (!ok(x, z, 8.6) || !XC.onLand(Is, x, z, 0.5)) continue; const g = new T.Group(); for (let i = 0; i < 6; i++) { const f = shadowy(new T.Mesh(new T.ConeGeometry(0.14, 0.9 + rnd() * 0.5, 4), fern), true, false); f.position.y = 0.4; f.rotation.set(0.5 * Math.cos(i * 1.05), i, 0.5 * Math.sin(i * 1.05)); g.add(f); } g.position.set(x, groundH(x, z), z); scene.add(g); k++; }
    for (let k = 0, tr = 0; k < 22 && tr < 500; tr++) { const a = rnd() * TAU, r = 5 + rnd() * 21, x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r; if (!ok(x, z, 9)) continue; XC.rock(x, z, 0.6 + rnd() * 1.2); k++; }
    /* banco virado para a lagoa e lanternas */
    const bx = pc[0] - 3.5, bz = pc[1] + 11.2; XC.makeBench(bx, bz, Math.atan2(pc[0] - bx, pc[1] - bz), pc[0], pc[1]); XC.lantern(bx - 2, bz + 0.5, 2.3); XC.lantern(bx + 3, bz + 0.5, 2.3);
    SP.fish.push({ biome: 'cachoeira', x: pc[0] + 0.5, z: pc[1], r: 7.8, y: 0.38 }); SP.stone.push({ id: 'n12', x: cx - 13, z: cz - 5 }); SP.critter.push({ id: 'sapo', x: pc[0] + 5.5, z: pc[1] + 6.8, mode: 'sit' });
    gate([...rb, pond, mist, rbw], cx, cz, 160);
    XC.post.push((dt, t) => { flowMat.uniforms.uT.value = t; flowMat.uniforms.uDay.value = 1 - XC.night; flowMat.uniforms.uFog.value.copy(XC.fog.color); rbM.uniforms.uA.value = Math.max(0, 1 - XC.night * 1.6) * 0.9; });
    XC.ticks.push((dt, t) => {
      if (!mist.visible) return;
      for (let i = 0; i < MN; i++) { const m = ms[i]; m[2] += dt * m[3]; if (m[2] > 4.5) { m[2] = 0; m[0] = rnd() * TAU; m[1] = rnd() * 3.2; } const bxx = m[4], bzz = m[4] === 0 ? 1.5 : 0.5; mp[i * 3] = cx + bxx + Math.cos(m[0]) * m[1]; mp[i * 3 + 1] = groundH(cx + bxx, cz + bzz) + 0.4 + m[2]; mp[i * 3 + 2] = cz + bzz + Math.sin(m[0]) * m[1]; }
      mg.attributes.position.needsUpdate = true; mist.material.opacity = 0.1 + (1 - XC.night) * 0.14;
    });
  })();


  /* ============ ILHA DO FAROL ============ */
  (function () {
    const Is = ISL.F, cx = Is.x, cz = Is.z, gy = groundH(cx, cz), eD = Math.atan2(-cz, -cx), topY = gy + 15.2;
    const red = std('#e5484d', 0.85), white = std('#f7f2ea', 0.85), dark = std('#4a4458', 0.9), wood = std('#a07a62', 1);
    const tw = new T.Group(); tw.position.set(cx, gy, cz); scene.add(tw);
    for (let i = 0; i < 6; i++) { const r0 = 2.75 - i * 0.17, r1 = 2.75 - (i + 1) * 0.17; const seg = shadowy(new T.Mesh(new T.CylinderGeometry(r1, r0, 2.5, 20), i % 2 ? white : red)); seg.position.y = 1.25 + i * 2.5; tw.add(seg); }
    const base = shadowy(new T.Mesh(new T.CylinderGeometry(3.3, 3.6, 0.9, 20), std('#8e8a96', 1))); base.position.y = 0.2; tw.add(base);
    const gal = shadowy(new T.Mesh(new T.CylinderGeometry(4.0, 3.4, 0.4, 24), dark)); gal.position.y = 15.2 - 0.05; tw.add(gal);
    for (let i = 0; i < 16; i++) { const a = i / 16 * TAU, p = shadowy(new T.Mesh(new T.CylinderGeometry(0.05, 0.05, 1.1, 5), dark), true, false); p.position.set(Math.cos(a) * 3.85, 15.2 + 0.6, Math.sin(a) * 3.85); tw.add(p); }
    const rail = new T.Mesh(new T.TorusGeometry(3.85, 0.05, 6, 40), dark); rail.rotation.x = Math.PI / 2; rail.position.y = 15.2 + 1.15; tw.add(rail);
    const glassM = new T.MeshStandardMaterial({ color: '#fff3c8', emissive: new T.Color('#ffd56a'), emissiveIntensity: 0.5, transparent: true, opacity: 0.55, roughness: 0.1 });
    const lamp = new T.Mesh(new T.CylinderGeometry(1.25, 1.25, 2.0, 16), glassM); lamp.position.y = 15.2 + 1.2; tw.add(lamp); XC.nightMats.push({ m: glassM, base: 0.5, k: 3.5 });
    const roof = shadowy(new T.Mesh(new T.ConeGeometry(1.7, 1.4, 16), red)); roof.position.y = 15.2 + 2.9; tw.add(roof); const ball = new T.Mesh(new T.SphereGeometry(0.2, 10, 8), dark); ball.position.y = 15.2 + 3.7; tw.add(ball);
    /* porta e janelinhas */
    const door = shadowy(new T.Mesh(new T.BoxGeometry(1.2, 2.2, 0.3), wood)); door.position.set(Math.cos(eD) * 2.7, 1.1, Math.sin(eD) * 2.7); door.rotation.y = -eD + Math.PI / 2; tw.add(door);
    const arch = new T.Mesh(new T.TorusGeometry(0.62, 0.09, 6, 14, Math.PI), dark); arch.position.copy(door.position); arch.position.y = 2.2; arch.rotation.y = door.rotation.y; tw.add(arch);
    const winM = new T.MeshStandardMaterial({ color: '#ffe9b0', emissive: new T.Color('#ffc45a'), emissiveIntensity: 0.2 }); XC.nightMats.push({ m: winM, base: 0.2, k: 2.4 });
    for (let i = 0; i < 3; i++) { const a = eD + 1.2 + i * 1.6, y = 4.5 + i * 3.2, w = new T.Mesh(new T.BoxGeometry(0.5, 0.8, 0.2), winM); w.position.set(Math.cos(a) * (2.55 - i * 0.17), y, Math.sin(a) * (2.55 - i * 0.17)); w.rotation.y = -a + Math.PI / 2; tw.add(w); }
    colliders.push({ x: cx, z: cz, r: 3.4, y0: -5, y1: 12 }); colliders.push({ x: cx, z: cz, r: 1.9, y0: 12, y1: 40 }); ringColl(cx, cz, 4.7, 24, 0.45, undefined, 0, 12, 40);
    /* chão da galeria: só existe quando você está lá em cima */
    XC.extH.push((x, z) => { if (P.y < 12) return -9; const r = Math.hypot(x - cx, z - cz); return r < 4.6 && r > 1.5 ? topY + 0.16 : -9; });
    /* os dois feixes de luz que giram */
    const gc = document.createElement('canvas'); gc.width = 2; gc.height = 64; const gx = gc.getContext('2d'), gg = gx.createLinearGradient(0, 64, 0, 0); gg.addColorStop(0, 'rgba(255,240,190,.9)'); gg.addColorStop(1, 'rgba(255,240,190,0)'); gx.fillStyle = gg; gx.fillRect(0, 0, 2, 64);
    const beamM = new T.MeshBasicMaterial({ map: new T.CanvasTexture(gc), transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, toneMapped: false, fog: false });
    const bg = new T.CylinderGeometry(3.4, 0.25, 70, 14, 1, true); bg.translate(0, 35, 0); bg.rotateZ(-Math.PI / 2);
    const beams = new T.Group(); beams.position.set(cx, topY + 1.2, cz); [0, Math.PI].forEach(a => { const m = new T.Mesh(bg, beamM); m.rotation.y = a; m.frustumCulled = false; beams.add(m); }); scene.add(beams);
    const lh = glow(0xffe28a, 8, 0); lh.position.set(cx, topY + 1.2, cz); scene.add(lh);
    const ll = new T.PointLight(0xffd88a, 0, 46, 1.4); ll.position.set(cx, topY + 1.4, cz); scene.add(ll); XC.vlight(ll);
    /* bandeira, pedras do caminho, caixotes e arbustos */
    const flag = new T.Mesh(new T.PlaneGeometry(1.6, 0.9, 8, 3), new T.MeshStandardMaterial({ color: '#ffb4d0', side: T.DoubleSide, roughness: 0.8 })); flag.position.set(cx + 0.8, topY + 4.4, cz); scene.add(flag);
    const pole = new T.Mesh(new T.CylinderGeometry(0.04, 0.05, 2.2, 5), dark); pole.position.set(cx, topY + 4.0, cz); scene.add(pole); const fb = flag.geometry.attributes.position.array.slice();
    for (let k = 0; k < 9; k++) { const u = k / 8, x = lerp(cx + Math.cos(eD) * 3.8, cx + Math.cos(eD) * 14, u) + Math.sin(u * 4) * 0.5, z = lerp(cz + Math.sin(eD) * 3.8, cz + Math.sin(eD) * 14, u) + Math.cos(u * 4) * 0.5, st = shadowy(new T.Mesh(new T.CylinderGeometry(0.5, 0.56, 0.14, 9), std('#e7dfd0', 1)), false, true); st.position.set(x, groundH(x, z) + 0.05, z); scene.add(st); }
    for (let i = 0; i < 3; i++) { const a = eD + 0.5 + i * 0.35, x = cx + Math.cos(a) * 4.6, z = cz + Math.sin(a) * 4.6, c = shadowy(new T.Mesh(new T.BoxGeometry(0.8, 0.8, 0.8), wood)); c.position.set(x, groundH(x, z) + 0.4, z); c.rotation.y = i; scene.add(c); colliders.push({ x, z, r: 0.55 }); }
    for (let k = 0, tr = 0; k < 22 && tr < 400; tr++) { const a = rnd() * TAU, r = 6 + rnd() * 9, x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r; if (!XC.onLand(Is, x, z, 0.8) || Math.abs(wrapA(a - eD)) < 0.35) continue; if (k % 3) { const b = shadowy(new T.Mesh(new T.IcosahedronGeometry(0.5 + rnd() * 0.4, 1), std(['#7ed39a', '#9be08a', '#a8e3b0'][k % 3], 1))); b.position.set(x, groundH(x, z) + 0.25, z); b.scale.y = 0.7; scene.add(b); } else XC.rock(x, z, 0.7 + rnd()); k++; }
    XC.lantern(cx + Math.cos(eD + 0.9) * 5.4, cz + Math.sin(eD + 0.9) * 5.4, 2.3); XC.lantern(cx + Math.cos(eD - 0.9) * 5.4, cz + Math.sin(eD - 0.9) * 5.4, 2.3);
    { const bx = cx + Math.cos(eD + 1.9) * 7.2, bz = cz + Math.sin(eD + 1.9) * 7.2, B = XC.makeBench(bx, bz, Math.atan2(cx - 20 * Math.cos(eD) - bx, cz - 20 * Math.sin(eD) - bz), cx, cz); B.ty = 7.5; B.pitch = 0.1; B.zoom = 1.5; }
    SP.critter.push({ id: 'gato', x: cx + Math.cos(eD + 0.25) * 4.4, z: cz + Math.sin(eD + 0.25) * 4.4, mode: 'sit' }); SP.stone.push({ id: 'n6', x: cx + Math.cos(eD + 2.6) * 9, z: cz + Math.sin(eD + 2.6) * 9 });
    /* subir e descer */
    let lhLock = 0;
    const doorX = cx + Math.cos(eD) * 4.0, doorZ = cz + Math.sin(eD) * 4.0, hatX = cx + Math.cos(eD) * 3.7, hatZ = cz + Math.sin(eD) * 3.7;
    XC.addAct(() => (!P.sit && P.y < 8 && Math.hypot(P.x - doorX, P.z - doorZ) < 3.4) ? 'E · subir ao farol' : (P.y > 12 && Math.hypot(P.x - hatX, P.z - hatZ) < 2.6 ? 'E · descer' : ''), () => {
      if (performance.now() < lhLock) return true; lhLock = performance.now() + 2200;
      if (P.y > 12) { const dx2 = cx + Math.cos(eD) * 8.2, dz2 = cz + Math.sin(eD) * 8.2; XC.warp(dx2, dz2, XC.isleH(Is, dx2, dz2) + 0.05, eD, 'Descendo…', () => { P.y = XC.isleH(Is, dx2, dz2) + 0.05; P.vy = 0; P.ground = true; }); } else XC.warp(hatX, hatZ, topY + 0.2, eD + Math.PI, 'Subindo…', () => { XC.toast('Vista do alto do farol', 'Gire a câmera para ver o mar inteiro. Perto da escada, E para descer.'); });
      return true;
    });
    gate([tw, beams, lh, flag, pole], cx, cz, 190);
    XC.post.push((dt, t) => { const n = XC.night; beamM.opacity = n * 0.38; lh.material.opacity = n * 0.8; beams.rotation.y = t * 0.55; ll.intensity = n * 9; });
    XC.ticks.push((dt, t) => { if (!flag.visible) return; const p = flag.geometry.attributes.position; for (let i = 0; i < p.count; i++) { const x0 = fb[i * 3], u = (x0 + 0.8) / 1.6; p.setZ(i, Math.sin(t * 4 - u * 5) * 0.12 * u); } p.needsUpdate = true; });
    XC.live(flag);
  })();


  /* ============ VILA FLUTUANTE ============ */
  (function () {
    const Is = ISL.V, cx = Is.x, cz = Is.z, eD = Math.atan2(-cz, -cx), DY = 0.68, DECKS = XC.DECKS;
    const wood = std('#c9a37a', 1), wood2 = std('#8a6a58', 1), pal = ['#ffd1e3', '#ffe9a8', '#bfe3ff', '#d6f5d0', '#e6d0ff', '#ffd8b8'], roofs = ['#e5707f', '#f0a050', '#5a8fd8', '#58b06a', '#a07acf', '#d9694a'];
    function planks(x, z, ang, len, hw) {
      DECKS.push({ x, z, ang, len, hw, y: DY }); const g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = -ang;
      for (let u = 0; u < len; u += 0.62) { const pl = shadowy(new T.Mesh(new T.BoxGeometry(0.56, 0.1, hw * 2), wood)); pl.position.set(u + 0.28, DY - 0.05, 0); g.add(pl); }
      for (let u = 0.8; u < len; u += 3.0) [-1, 1].forEach(q => { const pp = shadowy(new T.Mesh(new T.CylinderGeometry(0.1, 0.12, 2.0, 6), wood2)); pp.position.set(u, DY - 0.9, q * (hw - 0.1)); g.add(pp); });
      scene.add(g);
    }
    /* praça redonda no centro */
    const pr = 5.4; const plaza = shadowy(new T.Mesh(new T.CylinderGeometry(pr, pr, 0.22, 28), wood)); plaza.position.set(cx, DY - 0.11, cz); scene.add(plaza);
    for (let k = 0; k < 8; k++) { const a = k / 8 * TAU, pp = shadowy(new T.Mesh(new T.CylinderGeometry(0.14, 0.16, 2.2, 6), wood2)); pp.position.set(cx + Math.cos(a) * (pr - 0.5), DY - 1.1, cz + Math.sin(a) * (pr - 0.5)); scene.add(pp); }
    XC.extH.push((x, z) => (x - cx) * (x - cx) + (z - cz) * (z - cz) < pr * pr ? DY : -9);
    /* poste de luz da praça e varal de luzinhas */
    const post = shadowy(new T.Mesh(new T.CylinderGeometry(0.1, 0.14, 5, 8), wood2)); post.position.set(cx, DY + 2.5, cz); scene.add(post); colliders.push({ x: cx, z: cz, r: 0.4 });
    const topLamp = new T.Mesh(new T.SphereGeometry(0.4, 12, 8), new T.MeshStandardMaterial({ color: '#fff2cc', emissive: new T.Color('#ffc66b'), emissiveIntensity: 0.4 })); topLamp.position.set(cx, DY + 5.2, cz); scene.add(topLamp); XC.nightMats.push({ m: topLamp.material, base: 0.4, k: 2.6 });
    const bulbs = []; const lines = [];
    /* casas */
    const houses = [];
    for (let i = 0; i < 6; i++) {
      const a = eD + 0.95 + i * 0.86 + (i > 2 ? 0.1 : 0), rH = 13.5 + (i % 2) * 2.2, hx = cx + Math.cos(a) * rH, hz = cz + Math.sin(a) * rH, col = pal[i], rc = roofs[i];
      planks(cx + Math.cos(a) * (pr - 0.4), cz + Math.sin(a) * (pr - 0.4), a, rH - pr - 1.5, 0.95);
      const hg = new T.Group(); hg.position.set(hx, 0, hz); hg.rotation.y = -a + Math.PI / 2;
      const fl = shadowy(new T.Mesh(new T.BoxGeometry(4.6, 0.22, 4.6), wood)); fl.position.y = DY - 0.11; hg.add(fl);
      [[-2, -2], [2, -2], [-2, 2], [2, 2]].forEach(([px, pz]) => { const pp = shadowy(new T.Mesh(new T.CylinderGeometry(0.13, 0.16, 2.2, 6), wood2)); pp.position.set(px, DY - 1.1, pz); hg.add(pp); });
      const body = shadowy(new T.Mesh(new T.BoxGeometry(3.4, 2.3, 3.0), std(col, 0.9))); body.position.set(0, DY + 1.15, -0.5); hg.add(body);
      const roof = shadowy(new T.Mesh(new T.ConeGeometry(3.0, 1.6, 4), std(rc, 0.85))); roof.position.set(0, DY + 3.1, -0.5); roof.rotation.y = Math.PI / 4; roof.scale.set(1.12, 1, 0.98); hg.add(roof);
      const dr = shadowy(new T.Mesh(new T.BoxGeometry(0.9, 1.7, 0.12), wood2)); dr.position.set(0, DY + 0.85, 1.05); hg.add(dr);
      const wm = new T.MeshStandardMaterial({ color: '#fff0c8', emissive: new T.Color('#ffc66b'), emissiveIntensity: 0.15 }); XC.nightMats.push({ m: wm, base: 0.15, k: 2.2 });
      [-1.1, 1.1].forEach(q => { const w = new T.Mesh(new T.BoxGeometry(0.7, 0.7, 0.1), wm); w.position.set(q, DY + 1.35, 1.0); hg.add(w); });
      for (let r = -1; r <= 1; r += 2) { const rl = shadowy(new T.Mesh(new T.BoxGeometry(0.06, 0.6, 1.4), wood2)); rl.position.set(r * 2.2, DY + 0.35, 1.9); hg.add(rl); }
      scene.add(hg); colliders.push({ x: hx - Math.cos(a) * 0.5 + Math.cos(a - Math.PI / 2) * 0, z: hz - Math.sin(a) * 0.5, r: 2.35 });
      const bw = new T.Vector3(0, 0, 1).applyAxisAngle(new T.Vector3(0, 1, 0), -a + Math.PI / 2); hg.userData.front = [hx + bw.x * 2.2, hz + bw.z * 2.2];
      houses.push({ hx, hz, a, front: hg.userData.front, roofY: DY + 3.7 });
      XC.nightMats.push({ m: topLamp.material, base: 0, k: 0 });
    }
    /* varal: cada casa liga ao poste da praça por uma linha com luzinhas (um único Points) */
    const BP = []; houses.forEach(h => { const A = new T.Vector3(cx, DY + 5.0, cz), B = new T.Vector3(h.hx, h.roofY + 0.4, h.hz), pts = []; for (let k = 0; k <= 10; k++) { const u = k / 10; pts.push(new T.Vector3(lerp(A.x, B.x, u), lerp(A.y, B.y, u) - Math.sin(u * Math.PI) * 0.9, lerp(A.z, B.z, u))); if (k % 2) BP.push(pts[k].x, pts[k].y - 0.05, pts[k].z); } const ln = new T.Line(new T.BufferGeometry().setFromPoints(pts), new T.LineBasicMaterial({ color: 0x5a4a40 })); ln.frustumCulled = false; scene.add(ln); lines.push(ln); });
    const bpg = new T.BufferGeometry(); bpg.setAttribute('position', new T.BufferAttribute(new Float32Array(BP), 3)); const bpm = new T.PointsMaterial({ map: XC.glowTex, color: 0xffc66b, size: 0.8, transparent: true, depthWrite: false, blending: T.AdditiveBlending, opacity: 0.2 }); const bpp = new T.Points(bpg, bpm); bpp.frustumCulled = false; scene.add(bpp);
    /* caminho do cais até a praça */
    planks(cx + Math.cos(eD) * (Is.R - 2), cz + Math.sin(eD) * (Is.R - 2), eD + Math.PI, Is.R - 2 - pr + 0.4, 1.1);
    /* barraquinha de feira */
    { const sa = eD + 0.35, sx = cx + Math.cos(sa) * 3.3, sz = cz + Math.sin(sa) * 3.3, sg = new T.Group(); sg.position.set(sx, DY, sz); sg.rotation.y = -sa + Math.PI / 2;
      const ct = shadowy(new T.Mesh(new T.BoxGeometry(2.2, 0.9, 0.8), wood)); ct.position.y = 0.45; sg.add(ct);
      [-1, 1].forEach(q => { const p = shadowy(new T.Mesh(new T.CylinderGeometry(0.05, 0.05, 2.3, 5), wood2)); p.position.set(q * 1.05, 1.15, -0.3); sg.add(p); });
      for (let i = 0; i < 6; i++) { const aw = shadowy(new T.Mesh(new T.BoxGeometry(0.38, 0.05, 1.3), std(i % 2 ? '#ffffff' : '#e5707f', 0.9))); aw.position.set(-0.95 + i * 0.38, 2.15, -0.1); aw.rotation.x = 0.22; sg.add(aw); }
      for (let i = 0; i < 3; i++) { const f = shadowy(new T.Mesh(new T.IcosahedronGeometry(0.17, 0), std(['#ff9a7a', '#ffe28a', '#9ae6a4'][i], 0.8))); f.position.set(-0.6 + i * 0.6, 1.07, 0); sg.add(f); }
      scene.add(sg); colliders.push({ x: sx, z: sz, r: 1.1 }); }
    XC.makeBench(cx - Math.cos(eD + 1.9) * 4.4, cz - Math.sin(eD + 1.9) * 4.4, Math.atan2(Math.cos(eD + 1.9), Math.sin(eD + 1.9)), cx, cz);
    /* barquinhos amarrados */
    const bts = []; [1, 3].forEach((q, i) => { const h = houses[q], bt = XC.boatMesh(), bx = h.hx + Math.cos(h.a) * 4.6, bz = h.hz + Math.sin(h.a) * 4.6; bt.position.set(bx, 0, bz); bt.rotation.y = -h.a + 0.2 + i; scene.add(XC.live(bt)); bts.push(bt); });
    for (let k = 0, tr = 0; k < 8 && tr < 200; tr++) { const a = rnd() * TAU, r = 6 + rnd() * 12, x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r; if (!XC.onLand(Is, x, z, 0.5) || Math.hypot(x - cx, z - cz) < 7 || houses.some(h => Math.hypot(h.hx - x, h.hz - z) < 4.2) || Math.abs(wrapA(a - eD)) < 0.35) continue; const b = shadowy(new T.Mesh(new T.IcosahedronGeometry(0.45 + rnd() * 0.3, 1), std(['#7ed39a', '#f6b6cf', '#a8e3b0'][k % 3], 1))); b.position.set(x, groundH(x, z) + 0.25, z); b.scale.y = 0.7; scene.add(b); k++; }
    SP.fish.push({ biome: 'vila', x: houses[2].hx + Math.cos(houses[2].a) * 6.5, z: houses[2].hz + Math.sin(houses[2].a) * 6.5, r: 3, y: 0 }); SP.fish.push({ biome: 'vila', x: houses[5].hx + Math.cos(houses[5].a) * 6.5, z: houses[5].hz + Math.sin(houses[5].a) * 6.5, r: 3, y: 0 });
    SP.stone.push({ id: 'n5', x: cx + Math.cos(eD + 2.5) * 3.4, z: cz + Math.sin(eD + 2.5) * 3.4, y: DY }); SP.critter.push({ id: 'pato', x: cx + 2, z: cz + 2, mode: 'walk', R: 3.8, y: DY });
    gate([...lines, bpp], cx, cz, 170);
    XC.post.push(() => { bpm.opacity = 0.12 + XC.night * 0.85; });
    XC.ticks.push((dt, t) => { if (!bts[0].parent || Math.hypot(P.x - cx, P.z - cz) > 120) return; bts.forEach((b, i) => { b.position.y = Math.sin(t * 1.1 + i) * 0.05 - 0.02; b.rotation.z = Math.sin(t * 0.9 + i) * 0.03; }); });
  })();

  /* ============ GRUTA SUBMARINA ============ */
  (function () {
    const GX = 800, GZ = 0, GY = 40, GR = 24, PX = GX + 9, PZ = GZ - 6;
    const floorH = (x, z) => { const r = Math.hypot(x - GX, z - GZ); if (r > GR + 1.5) return -99; let h = GY + 0.35 * Math.sin(x * 0.45) * Math.cos(z * 0.4) + 0.25 * Math.sin(x * 0.9 + z * 0.7); h -= 2.6 * (1 - smooth(2.4, 5.2, Math.hypot(x - PX, z - PZ))); h += smooth(GR - 3, GR + 0.6, r) * 1.6; return h; };
    XC.extH.push(floorH);
    XC.DEST.push({ id: 'S', name: 'Gruta Submarina', desc: 'Uma bolha de ar no fundo do mar, com corais, águas-vivas e quem mora lá embaixo.' });
    XC.DOCKS.S = { arrive: { x: GX - 16.5, z: GZ + 1, yaw: -Math.PI / 2 }, boat: { x: GX - 19.5, z: GZ + 3.4 } };
    const grp = new T.Group(); scene.add(grp); const cc = new T.Color();
    const R3 = GR + 3, dg = new T.SphereGeometry(R3, 28, 16), dp = dg.attributes.position, dcol = new Float32Array(dp.count * 3), cA = new T.Color('#1d7aa0'), cB = new T.Color('#06223f');
    for (let i = 0; i < dp.count; i++) { const y = dp.getY(i) / R3; cc.copy(cB).lerp(cA, smooth(-0.2, 1, y)); dcol[i * 3] = cc.r; dcol[i * 3 + 1] = cc.g; dcol[i * 3 + 2] = cc.b; }
    dg.setAttribute('color', new T.BufferAttribute(dcol, 3));
    const dome = new T.Mesh(dg, new T.MeshBasicMaterial({ vertexColors: true, side: T.BackSide, fog: false, toneMapped: false })); dome.position.set(GX, GY + 4, GZ); dome.frustumCulled = false; grp.add(dome);
    const fg = new T.PlaneGeometry(2 * (GR + 2), 2 * (GR + 2), 56, 56); fg.rotateX(-Math.PI / 2); const fp = fg.attributes.position, fc = new Float32Array(fp.count * 3), sandA = new T.Color('#9c9166'), sandB = new T.Color('#2a6674');
    for (let i = 0; i < fp.count; i++) { const x = fp.getX(i) + GX, z = fp.getZ(i) + GZ, r = Math.hypot(x - GX, z - GZ), h = r > GR + 1.5 ? GY - 2 : floorH(x, z); fp.setXYZ(i, x, h, z); cc.copy(sandA).lerp(sandB, smooth(8, GR, r) * 0.6 + 0.1 * Math.sin(x * 0.7 + z * 0.5)); if (Math.hypot(x - PX, z - PZ) < 4.6) cc.multiplyScalar(0.55); fc[i * 3] = cc.r; fc[i * 3 + 1] = cc.g; fc[i * 3 + 2] = cc.b; }
    fg.computeVertexNormals(); { const nn = fg.attributes.normal; for (let i = 0; i < fp.count; i++) { const l = 0.55 + 0.45 * Math.max(0, nn.getX(i) * 0.4 + nn.getY(i) * 0.85 + nn.getZ(i) * 0.3); fc[i * 3] *= l; fc[i * 3 + 1] *= l; fc[i * 3 + 2] *= l; } } fg.setAttribute('color', new T.BufferAttribute(fc, 3));
    const floor = new T.Mesh(fg, new T.MeshBasicMaterial({ vertexColors: true })); floor.frustumCulled = false; grp.add(floor);
    /* corais: três formas instanciadas, cada instância com sua cor */
    const dm = new T.Object3D(), geos = [new T.ConeGeometry(0.35, 1, 6), new T.SphereGeometry(0.5, 8, 6), new T.CylinderGeometry(0.16, 0.3, 1, 7)]; geos[0].translate(0, 0.5, 0); geos[2].translate(0, 0.5, 0);
    const NC = [70, 40, 60], cm = geos.map((g, i) => { const m = new T.InstancedMesh(g, new T.MeshStandardMaterial({ roughness: 0.75, flatShading: true, emissive: new T.Color('#220a2a'), emissiveIntensity: 0.6 }), NC[i]); m.frustumCulled = false; grp.add(m); return m; });
    const okSpot = (x, z) => { const r = Math.hypot(x - GX, z - GZ); return r > 3.5 && r < GR - 1.2 && Math.hypot(x - PX, z - PZ) > 6 && Math.hypot(x - (GX - 16.5), z - GZ) > 5; };
    const hues = [0.0, 0.03, 0.9, 0.78, 0.12, 0.5];
    cm.forEach((m, gi) => { for (let i = 0; i < NC[gi]; i++) { let x, z, tr = 0; do { const a = rnd() * TAU, r = 5 + Math.sqrt(rnd()) * (GR - 6); x = GX + Math.cos(a) * r; z = GZ + Math.sin(a) * r; } while (!okSpot(x, z) && ++tr < 20); const sc = 0.7 + rnd() * 1.5; dm.position.set(x, floorH(x, z) - 0.05, z); dm.rotation.set((rnd() - 0.5) * 0.3, rnd() * TAU, (rnd() - 0.5) * 0.3); dm.scale.set(sc * (gi === 1 ? 0.8 : 1), sc * (gi === 0 ? 1.8 : gi === 1 ? 0.7 : 1.4), sc * (gi === 1 ? 0.8 : 1)); dm.updateMatrix(); m.setMatrixAt(i, dm.matrix); m.setColorAt(i, hueCol(hues[(rnd() * hues.length) | 0] + rnd() * 0.04, 0.7, 0.3)); } m.instanceColor.needsUpdate = true; });
    /* algas que balançam */
    const kelpG = new T.BoxGeometry(0.16, 1, 0.05); kelpG.translate(0, 0.5, 0); const kelpM = new T.MeshStandardMaterial({ color: '#25805a', emissive: new T.Color('#0f4a3a'), emissiveIntensity: 0.6, roughness: 0.8 }), kelps = [];
    for (let k = 0; k < 18; k++) { const a = rnd() * TAU, r = 6 + rnd() * (GR - 9), x = GX + Math.cos(a) * r, z = GZ + Math.sin(a) * r; if (!okSpot(x, z)) continue; const g = new T.Group(); g.position.set(x, floorH(x, z), z); for (let j = 0; j < 4; j++) { const m = new T.Mesh(kelpG, kelpM); m.scale.set(1, 2.6 + rnd() * 2.4, 1); m.position.x = (j - 1.5) * 0.18; m.rotation.y = rnd() * 3; g.add(m); } grp.add(g); kelps.push(g); }
    /* bolhas subindo */
    const NB = 90, bp = new Float32Array(NB * 3), bs = [], bpts = new T.Points(new T.BufferGeometry(), new T.PointsMaterial({ color: 0xcdf3ff, size: 0.28, transparent: true, opacity: 0.7, depthWrite: false, sizeAttenuation: true }));
    for (let i = 0; i < NB; i++) { const a = rnd() * TAU, r = rnd() * (GR - 2); bp[i * 3] = GX + Math.cos(a) * r; bp[i * 3 + 1] = GY + rnd() * 20; bp[i * 3 + 2] = GZ + Math.sin(a) * r; bs.push(0.5 + rnd() * 1.2); }
    bpts.geometry.setAttribute('position', new T.BufferAttribute(bp, 3)); bpts.frustumCulled = false; grp.add(bpts);
    /* feixes de luz vindos da superfície */
    const beams = []; for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + 0.4, r = 6 + (i % 3) * 5, m = new T.Mesh(new T.CylinderGeometry(0.4, 2.6, 24, 10, 1, true), new T.MeshBasicMaterial({ color: 0xbdf6ff, transparent: true, opacity: 0.07, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, fog: false })); m.position.set(GX + Math.cos(a) * r, GY + 12, GZ + Math.sin(a) * r); m.rotation.z = (i % 2 ? 0.12 : -0.12); m.frustumCulled = false; grp.add(m); beams.push(m); }
    /* concha gigante com pérola */
    const sx = GX + 1, sz = GZ + 4, shM = new T.MeshStandardMaterial({ color: '#b87a98', roughness: 0.4, flatShading: true, emissive: new T.Color('#b0507a'), emissiveIntensity: 0.25, side: T.DoubleSide });
    const sh = new T.Group(); sh.position.set(sx, floorH(sx, sz) + 0.2, sz); [0, 1].forEach(i => { const h = new T.Mesh(new T.SphereGeometry(2.1, 14, 8, 0, TAU, 0, Math.PI / 2), shM); h.scale.set(1, 0.7, 0.9); h.rotation.x = i ? Math.PI + 0.5 : -0.0; h.position.y = i ? 1.7 : 0; sh.add(h); }); const pearl = new T.Mesh(new T.SphereGeometry(0.55, 16, 12), new T.MeshStandardMaterial({ color: '#ffffff', emissive: new T.Color('#c8e8ff'), emissiveIntensity: 1.0, roughness: 0.15 })); pearl.position.y = 0.95; sh.add(pearl); const pg = glow(0xcfeaff, 4.5, 0.8); pg.position.y = 0.95; sh.add(pg); grp.add(sh); colliders.push({ x: sx, z: sz, r: 2.1, y0: GY - 3, y1: GY + 4 });
    /* luzes */
    const l1 = new T.PointLight(0x66ddff, 2.2, 36, 1.4); l1.position.set(GX, GY + 6, GZ); grp.add(l1); XC.vlight(l1); const l2 = new T.PointLight(0xb08cff, 2.0, 22, 1.5); l2.position.set(PX, GY + 1.2, PZ); grp.add(l2); XC.vlight(l2);
    /* pedras redondas, laguinha da maré na entrada e o barquinho de volta */
    for (let k = 0; k < 9; k++) { const a = rnd() * TAU, r = 7 + rnd() * 14, x = GX + Math.cos(a) * r, z = GZ + Math.sin(a) * r; if (!okSpot(x, z)) continue; const m = new T.Mesh(new T.DodecahedronGeometry(0.7 + rnd() * 0.9, 0), new T.MeshStandardMaterial({ color: '#2f5666', roughness: 1, flatShading: true })); m.position.set(x, floorH(x, z) + 0.2, z); m.rotation.set(rnd() * 3, rnd() * 3, 0); grp.add(m); colliders.push({ x, z, r: 0.8, y0: GY - 3, y1: GY + 4 }); }
    const bx = GX - 19.5, bz = GZ + 3.4, tide = new T.Mesh(new T.CylinderGeometry(3.4, 3.4, 0.05, 28), new T.MeshStandardMaterial({ color: '#7fe0f0', emissive: new T.Color('#2a98b0'), emissiveIntensity: 0.4, roughness: 0.15, transparent: true, opacity: 0.85 })); tide.position.set(bx, floorH(bx, bz) + 0.06, bz); grp.add(tide);
    const bt = XC.boatMesh(); bt.position.set(bx, floorH(bx, bz) + 0.1, bz); bt.rotation.y = 0.6; grp.add(XC.live(bt));
    /* poça funda do fundo */
    const pit = new T.Mesh(new T.CylinderGeometry(3.6, 3.6, 0.05, 28), new T.MeshBasicMaterial({ color: 0x1b2a6a, transparent: true, opacity: 0.45, depthWrite: false })); pit.position.set(PX, GY - 1.6, PZ); grp.add(pit);
    XC.live(grp);
    const SP = XC.spots;
    SP.critter.push({ id: 'aguaviva', x: GX - 3, z: GZ - 6, mode: 'float', R: 7, h: 3.2, y: GY }, { id: 'aguaviva', x: GX + 6, z: GZ + 8, mode: 'float', R: 5, h: 4.2, y: GY, dup: true });
    SP.critter.push({ id: 'tartaruga', x: GX + 2, z: GZ + 11, mode: 'swim', R: 9, h: 2.4, y: GY }, { id: 'polvo', x: GX - 8, z: GZ - 10, mode: 'sit', y: GY }, { id: 'abissal', x: PX, z: PZ, mode: 'float', R: 2.2, h: 0.9, y: GY - 2.4 });
    let inside = false;
    XC.ticks.push((dt, t) => {
      const d = Math.hypot(P.x - GX, P.z - GZ); inside = d < GR + 4; grp.visible = d < 80; if (!grp.visible) return;
      const a = bp; for (let i = 0; i < NB; i++) { a[i * 3 + 1] += bs[i] * dt; a[i * 3] += Math.sin(t + i) * dt * 0.1; if (a[i * 3 + 1] > GY + 24) a[i * 3 + 1] = GY - 1; } bpts.geometry.attributes.position.needsUpdate = true;
      kelps.forEach((g, i) => { g.children.forEach((m, j) => { m.rotation.z = Math.sin(t * 0.9 + i + j * 0.7) * 0.16; m.rotation.x = Math.cos(t * 0.7 + i * 1.3 + j) * 0.1; }); });
      beams.forEach((m, i) => { m.material.opacity = 0.05 + 0.04 * Math.sin(t * 0.5 + i * 1.7) + AU.level * 0.05; }); pearl.material.emissiveIntensity = 0.8 + AU.level * 1.2 + Math.sin(t * 2) * 0.15; l1.intensity = 2 + AU.level * 2;
    });
    XC.post.push(() => { const f = XC.fog; if (inside) { f.color.set('#0c4a6e'); f.near = 4; f.far = 62; } else if (f.near !== 70) { f.near = 70; f.far = 330; } });
  })();

  window.__places = { gates };
});
