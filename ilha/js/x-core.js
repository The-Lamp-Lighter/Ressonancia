/* Ilha de Repouso — núcleo dos módulos extras: progresso salvo, catálogo de criaturas, ilustrações, livro, barra de ferramentas e som. */
(window.IlhaExt = window.IlhaExt || []).push(function (XC) {
  'use strict';
  const $ = XC.$, TAU = Math.PI * 2;

  XC.spots = { fish: [], critter: [], stone: [], bench: [] };
  XC.camOvs = []; XC.camOv = dt => { for (const f of XC.camOvs) f(dt); };
  /* ───────── estilos ───────── */
  const css = document.createElement('style');
  css.textContent = `
  #xTools{position:fixed;left:12px;top:56px;z-index:3;display:flex;flex-direction:column;gap:6px;align-items:flex-start}
  #xTools .chip{padding:7px 10px;font-size:11px;gap:6px}#xTools .chip b{font-weight:600;opacity:.6;font-size:10px}
  #xTools .chip.on{border-color:#ffd98a;background:rgba(255,217,138,.14)}
  body.touch #xTools{top:52px;flex-direction:row;flex-wrap:wrap;max-width:calc(100vw - 24px)}
  .xpanel{position:fixed;z-index:6;display:none;flex-direction:column;gap:8px;padding:14px;border:1px solid var(--line);border-radius:16px;background:rgba(14,16,28,.74);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);color:var(--fg)}
  .xpanel .wh{display:flex;justify-content:space-between;align-items:center;gap:10px}.xpanel .wh b{font:600 13px/1 'DM Mono',monospace;letter-spacing:.12em;text-transform:uppercase}
  .xpanel small,.xpanel p{margin:0;font:500 11px/1.5 'DM Mono',monospace;color:var(--mute)}
  .xpanel .g{display:grid;gap:6px}.xpanel .row{display:flex;gap:6px;flex-wrap:wrap}
  .xpanel button.chip{cursor:pointer;justify-content:center}.xpanel button.chip.on{border-color:#ffd98a;background:rgba(255,217,138,.14)}
  /* livro */
  #book{position:fixed;inset:0;z-index:9;display:none;place-items:center;background:rgba(6,8,16,.58);backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px);opacity:0;transition:opacity .45s;perspective:1900px}
  #book.show{opacity:1}
  #book .bk{position:relative;width:min(900px,96vw);height:min(560px,88vh);display:grid;grid-template-columns:1fr 1fr;transform:translateY(40px) rotateX(24deg) scale(.55);transition:transform .8s cubic-bezier(.2,.8,.2,1);transform-style:preserve-3d;filter:drop-shadow(0 30px 40px rgba(0,0,0,.55))}
  #book.show .bk{transform:none}
  #book .pg{position:relative;background:linear-gradient(100deg,#f6ecd8,#efe0c2);color:#4a3a2c;padding:22px 24px;overflow:hidden;font-family:'DM Mono',monospace;display:flex;flex-direction:column;gap:10px}
  #book .pgL{border-radius:14px 3px 3px 14px;transform-origin:right center;transform:rotateY(-86deg);transition:transform .9s cubic-bezier(.25,.8,.25,1) .15s;box-shadow:inset -22px 0 28px -18px rgba(90,60,30,.45)}
  #book .pgR{border-radius:3px 14px 14px 3px;box-shadow:inset 22px 0 28px -18px rgba(90,60,30,.45);background:linear-gradient(80deg,#efe0c2,#f6ecd8)}
  #book.show .pgL{transform:none}
  #book .cover{position:absolute;inset:-6px -6px -6px 50%;border-radius:3px 18px 18px 3px;background:linear-gradient(120deg,#6b4a8c,#3e2f66);z-index:-1;box-shadow:0 0 0 2px #2b2150 inset}
  #book .cover.l{inset:-6px 50% -6px -6px;border-radius:18px 3px 3px 18px}
  #book h2{margin:0;font:600 15px/1.2 'Bricolage Grotesque','DM Mono',serif;letter-spacing:.04em}
  #book .sub{font-size:11px;color:#7a6650;margin:0}
  #book .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;overflow:auto;padding:2px 4px 8px 2px;align-content:start;flex:1;touch-action:pan-y}
  #book .it{border:1px solid rgba(110,80,50,.25);border-radius:10px;background:rgba(255,255,255,.45);padding:5px 4px 6px;display:grid;justify-items:center;gap:3px;cursor:pointer;font:500 10.5px/1.2 'DM Mono',monospace;color:#4a3a2c;text-align:center;position:relative}
  #book .it:hover{background:rgba(255,255,255,.8)}#book .it.sel{border-color:#c0803a;box-shadow:0 0 0 2px rgba(192,128,58,.35)}
  #book .it canvas{width:84px;height:63px;border-radius:8px;background:#2a3050}
  #book .it.no canvas{filter:brightness(0) opacity(.5)}#book .it.no{opacity:.75}
  #book .it i{position:absolute;right:5px;top:4px;font-style:normal;font-size:9.5px;background:#c0803a;color:#fff;border-radius:8px;padding:1px 5px}
  #book .big{width:100%;aspect-ratio:4/3;border-radius:12px;background:#222a48;display:grid;place-items:center;overflow:hidden}
  #book .big canvas{width:100%;height:auto}
  #book .big.no canvas{filter:brightness(0) opacity(.4)}
  #book .dn{font:600 17px/1.2 'Bricolage Grotesque','DM Mono',serif}
  #book .tags{display:flex;gap:6px;flex-wrap:wrap}#book .tags span{font-size:10px;border-radius:8px;padding:2px 7px;background:rgba(192,128,58,.18);color:#7a5226}
  #book .txt{font-size:12px;line-height:1.55;margin:0}
  #book .tabs{position:absolute;right:-30px;top:30px;display:grid;gap:6px;z-index:2}
  #book .tabs button{width:34px;height:60px;border:0;border-radius:0 10px 10px 0;background:#b78a5a;color:#fff;font:600 10px/1 'DM Mono',monospace;cursor:pointer;writing-mode:vertical-rl;letter-spacing:.1em;padding:0;box-shadow:2px 2px 0 rgba(0,0,0,.25)}
  #book .tabs button.on{background:#d9a05a;transform:translateX(4px)}
  #book .x{position:absolute;right:12px;top:10px;border:0;background:rgba(0,0,0,.08);border-radius:50%;width:28px;height:28px;cursor:pointer;color:#4a3a2c;font-size:14px;z-index:3}
  #book .leaf{position:absolute;right:0;top:0;width:50%;height:100%;background:linear-gradient(80deg,#e7d6b4,#f6ecd8);transform-origin:left center;border-radius:3px 14px 14px 3px;pointer-events:none;opacity:0;backface-visibility:hidden}
  #book .leaf.go{animation:xturn .55s ease-in forwards}
  @keyframes xturn{0%{opacity:.95;transform:rotateY(0)}100%{opacity:0;transform:rotateY(-150deg)}}
  #book .prog{height:6px;border-radius:4px;background:rgba(110,80,50,.18);overflow:hidden}#book .prog i{display:block;height:100%;background:#d9a05a}
  @media (max-width:640px){#book .bk{grid-template-columns:1fr;height:92vh}#book .pgL{display:none}#book .tabs{right:-4px;top:auto;bottom:-40px;display:flex}#book .tabs button{writing-mode:horizontal-tb;width:auto;height:30px;padding:0 10px;border-radius:0 0 10px 10px}}
  `;
  document.head.appendChild(css);

  /* ───────── progresso salvo ───────── */
  const KEY = 'ilha.v3';
  const sv = XC.sv = { b: {}, g: [], bl: [], mel: [], con: {}, notes: {}, st: {} };
  try { const r = JSON.parse(localStorage.getItem(KEY) || 'null'); if (r && typeof r === 'object') for (const k in sv) if (r[k] !== undefined) sv[k] = r[k]; } catch (e) {}
  let svT = 0;
  XC.save = (now) => { clearTimeout(svT); const go = () => { try { localStorage.setItem(KEY, JSON.stringify(sv)); } catch (e) {} }; if (now) go(); else svT = setTimeout(go, 400); };
  addEventListener('pagehide', () => XC.save(true));

  /* ───────── som (síntese simples, só depois de um gesto do jogador) ───────── */
  const snd = XC.snd = { ctx: null, out: null,
    init() {
      if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return !!this.ctx; }
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false;
      try {
        const c = this.ctx = new AC(), o = this.out = c.createGain(); o.gain.value = 0.8;
        const d = c.createDelay(1), fb = c.createGain(), wet = c.createGain(); d.delayTime.value = 0.29; fb.gain.value = 0.34; wet.gain.value = 0.3;
        o.connect(c.destination); o.connect(d); d.connect(fb); fb.connect(d); d.connect(wet); wet.connect(c.destination);
      } catch (e) { this.ctx = null; return false; }
      return true;
    },
    /* timbres: bell, harp, flute, marimba, box, gong, pluck, crystal, guitar, ice, keys, drum */
    note(f, kind, vol) {
      if (!this.init()) return; const c = this.ctx, t0 = c.currentTime, v = (vol || 1) * 0.22;
      const P = { bell: [[1, 1, 2.2], [2.76, .35, 1.4], [5.4, .15, .6]], harp: [[1, 1, 1.6], [2, .3, .9], [3, .1, .5]], flute: [[1, 1, .9], [2, .12, .8]], marimba: [[1, 1, .5], [4, .25, .15]], box: [[1, .8, .7], [3, .35, .35], [5, .15, .2]], gong: [[.5, .8, 2.8], [1, 1, 2.4], [1.41, .5, 1.8], [2.3, .3, 1.2]], pluck: [[1, 1, .7], [2, .5, .4], [3, .25, .25]], crystal: [[1, .9, 1.8], [2.01, .5, 1.5], [3.02, .3, 1.2], [4.03, .2, 1]], guitar: [[1, 1, 1.1], [2, .5, .7], [3, .3, .5], [4, .12, .3]], ice: [[1, .8, 1.5], [3.2, .45, 1], [6.1, .25, .5]], keys: [[1, 1, 1.2], [2, .4, .8]], drum: [[1, 1, .35]] }[kind] || [[1, 1, 1]];
      for (const [m, a, d] of P) {
        const o = c.createOscillator(), g = c.createGain(); o.type = kind === 'flute' ? 'sine' : 'triangle'; if (kind === 'crystal' || kind === 'ice' || kind === 'bell' || kind === 'gong') o.type = 'sine';
        o.frequency.value = f * m * (kind === 'drum' ? 0.5 : 1); if (kind === 'drum') o.frequency.setValueAtTime(f, t0), o.frequency.exponentialRampToValueAtTime(f * 0.5, t0 + 0.25);
        g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(v * a, t0 + (kind === 'flute' ? 0.09 : 0.012)); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
        o.connect(g); g.connect(this.out); o.start(t0); o.stop(t0 + d + 0.05);
      }
    } };

  /* ───────── catálogo ───────── */
  const CAT = XC.CAT = [], CATS = XC.CATS = [
    { id: 'fish', name: 'Peixes', one: 'peixe' }, { id: 'flower', name: 'Flores', one: 'flor' }, { id: 'critter', name: 'Criaturas', one: 'criatura' },
    { id: 'sky', name: 'Céu', one: 'constelação' }, { id: 'sound', name: 'Sons', one: 'som' }
  ];
  const add = (cat, id, name, where, desc, extra) => CAT.push(Object.assign({ cat, id, name, where, desc }, extra));
  /* peixes: c1 corpo, c2 barriga/detalhe, fin nadadeira, shape, pat */
  add('fish', 'carpa', 'Carpa Dourada', 'Mar da Ilha Principal, de dia', 'Nada devagar, como quem nunca teve pressa. Dizem que cada escama guarda um pedacinho de sol.', { r: 'comum', s: { c1: '#f2a53a', c2: '#ffd98a', fin: '#f6842c', shape: 'round', pat: 'scales' } });
  add('fish', 'lua', 'Peixe-lua', 'Mar da Ilha Principal, ao amanhecer e ao entardecer', 'Redondo e pálido, parece uma lua pequena que escorregou para dentro da água.', { r: 'comum', s: { c1: '#cfd8f0', c2: '#f4f6ff', fin: '#aebbe0', shape: 'moon', pat: 'none' } });
  add('fish', 'cavalo', 'Cavalo-marinho', 'Mar da Ilha Principal, perto dos cais', 'Segura o próprio rabinho enrolado e flutua de pé. É tímido e adora lugares calmos.', { r: 'incomum', s: { c1: '#ff9a7a', c2: '#ffd0b8', fin: '#ff7a5a', shape: 'horse', pat: 'none' } });
  add('fish', 'baiacu', 'Baiacu Balão', 'Mar da Ilha Principal, na maré cheia', 'Quando se assusta, vira uma bolinha redonda e espinhosa. Depois fica com vergonha.', { r: 'incomum', s: { c1: '#f3e08a', c2: '#fff6c8', fin: '#e9c24a', shape: 'ball', pat: 'dots' } });
  add('fish', 'lanterna', 'Peixe-lanterna', 'Mar da Ilha Principal, só de noite', 'Carrega uma luzinha na ponta da testa para não se perder no escuro.', { r: 'raro', s: { c1: '#2c3b8c', c2: '#5a78e8', fin: '#4a60c8', shape: 'long', pat: 'none', glow: '#9ad8ff', lamp: true } });
  add('fish', 'raia', 'Raia de Seda', 'Mar da Ilha Principal, perto do santuário, de noite', 'Voa debaixo d\'água com asas de seda. Poucos já viram uma de perto.', { r: 'raro', s: { c1: '#7aa0d8', c2: '#dfe9ff', fin: '#5a7cb8', shape: 'ray', pat: 'dots' } });
  add('fish', 'gelo', 'Peixe-de-gelo', 'Lago congelado da Ilha Nevada', 'Quase transparente. Se você olhar com carinho, dá para ver o coração dele brilhando.', { r: 'comum', s: { c1: '#cdeeff', c2: '#ffffff', fin: '#9ad4f0', shape: 'long', pat: 'ice' } });
  add('fish', 'salmao', 'Salmão Aurora', 'Lago da Ilha Nevada, de noite', 'Suas escamas pegam as cores da aurora e devolvem para a água.', { r: 'raro', s: { c1: '#ff8fa8', c2: '#9affc8', fin: '#b79cff', shape: 'long', pat: 'aurora', glow: '#9affc8' } });
  add('fish', 'truta', 'Truta da Cascata', 'Lagoa da Ilha das Cachoeiras', 'Sobe a cachoeira pulando de degrau em degrau, só pela graça de pular.', { r: 'comum', s: { c1: '#6fa88a', c2: '#d6ecd0', fin: '#4d8a6a', shape: 'long', pat: 'spots' } });
  add('fish', 'koiarco', 'Koi Arco-íris', 'Lagoa da Ilha das Cachoeiras, de dia', 'Cada pedacinho dele é de uma cor. Cruzar com um é sinal de dia bom.', { r: 'raro', s: { c1: '#ffffff', c2: '#ff9ad0', fin: '#9ad8ff', shape: 'round', pat: 'rainbow' } });
  add('fish', 'koisakura', 'Koi de Pétala', 'Perto da Ilha da Árvore Milenar', 'Vive onde as pétalas caem na água. Tem manchas cor-de-rosa em formato de flor.', { r: 'incomum', s: { c1: '#ffffff', c2: '#f9a6c4', fin: '#ffd1e3', shape: 'round', pat: 'blossom' } });
  add('fish', 'areia', 'Peixe-areia', 'Oásis da Ilha das Dunas', 'Vive escondido no fundo do oásis, da cor da areia. Só se mexe quando acha que ninguém vê.', { r: 'comum', s: { c1: '#e6c485', c2: '#f6e3b4', fin: '#d8ae66', shape: 'flat', pat: 'dots' } });
  add('fish', 'nuvem', 'Peixe-nuvem', 'Águas da Vila Flutuante', 'Fofo e branquinho, flutua perto da superfície e ama ficar embaixo das passarelas.', { r: 'incomum', s: { c1: '#f4f8ff', c2: '#dfe9ff', fin: '#cfdcf6', shape: 'cloud', pat: 'none' } });
  add('fish', 'enguia', 'Enguia de Cristal', 'Lagoa da Ilha dos Cristais', 'Seu corpo é feito de vidro colorido e brilha mais forte quando a música sobe.', { r: 'raro', s: { c1: '#9a7cff', c2: '#7ae6ff', fin: '#ff9ad0', shape: 'eel', pat: 'crystal', glow: '#b79cff' } });
  /* flores */
  add('flower', 'margarida', 'Margarida de Luz', 'Jardim', 'A primeira que todo mundo planta. Abre de manhã e acompanha o sol com os olhos.', { s: { k: 'daisy', c: '#ffffff', mid: '#ffd23f' }, grow: 1 });
  add('flower', 'lirio', 'Lírio-lua', 'Jardim, só floresce de noite', 'Fecha de dia e abre ao luar, soltando uma luzinha azul das pétalas.', { s: { k: 'lily', c: '#cfe0ff', mid: '#fff6c8', glow: '#9ad8ff' }, grow: 1.4, night: true });
  add('flower', 'girassol', 'Girassolzinho', 'Jardim', 'Pequeno, teimoso e sempre virado para o lado que está mais claro.', { s: { k: 'sun', c: '#ffcf3a', mid: '#7a4a2a' }, grow: 1.2 });
  add('flower', 'rosa', 'Rosa de Algodão', 'Jardim', 'Macia como nuvem. Dizem que cheira a bolo recém-saído do forno.', { s: { k: 'rose', c: '#ffb3c8', mid: '#ff8fa8' }, grow: 1.6 });
  add('flower', 'lavanda', 'Lavanda-estrela', 'Jardim', 'Pequenas estrelinhas roxas ao longo de um caule. Ajuda a dormir bem.', { s: { k: 'lav', c: '#a98cff', mid: '#d8c8ff' }, grow: 1.3 });
  add('flower', 'tulipa', 'Tulipa Aurora', 'Jardim', 'Suas pétalas vão do rosa ao laranja, como o céu quando o dia acorda.', { s: { k: 'tulip', c: '#ff9a7a', mid: '#ffd23f' }, grow: 1.5 });
  add('flower', 'orquidea', 'Orquídea de Vidro', 'Jardim, demora bastante para florir', 'Rara e delicada, parece feita de vidro soprado. Vale a espera.', { s: { k: 'orchid', c: '#d7f3ff', mid: '#ff9ad0', glow: '#9ad8ff' }, grow: 2.6, r: 'rara' });
  add('flower', 'campainha', 'Campainha Azul', 'Jardim', 'Balança com qualquer ventinho e faz um "tlin" tão baixinho que só as flores escutam.', { s: { k: 'bell', c: '#6fa8ff', mid: '#ffffff' }, grow: 1.1 });
  /* criaturas (observar com E perto) */
  const cr = (id, name, where, desc, parts, extra) => add('critter', id, name, where, desc, Object.assign({ s: { parts } }, extra));
  cr('raposa', 'Raposa-de-luz', 'Ilha Principal, perto das árvores', 'Seu rabo deixa pontinhos de luz no ar. Segue você de longe, mas foge se você olhar demais.', [['e', 0, 6, 54, 38, '#ff9a5a'], ['c', -44, -26, 20, '#ff9a5a'], ['t', -52, -42, -34, -14, -40, -64, '#ff9a5a'], ['t', -34, -42, -14, -14, -22, -64, '#ff9a5a'], ['e', -42, -24, 14, 10, '#fff1e0'], ['e', 62, 14, 40, 14, '#ffd0a0'], ['c', -52, -30, 3, '#2a2230'], ['c', -36, -30, 3, '#2a2230']], { night: false });
  cr('coelho', 'Coelho-nuvem', 'Campos da Ilha Principal', 'Fofo como uma nuvem, quica sem fazer barulho. Suas orelhas dobram quando ele está feliz.', [['e', 0, 10, 46, 36, '#f4f6ff'], ['c', -34, -14, 24, '#f4f6ff'], ['e', -44, -56, 8, 26, '#f4f6ff'], ['e', -28, -58, 8, 26, '#f4f6ff'], ['e', -44, -54, 4, 18, '#ffc2d6'], ['c', 52, 12, 11, '#ffffff'], ['c', -44, -18, 3, '#2a2230'], ['c', -28, -18, 3, '#2a2230']]);
  cr('cometa', 'Pássaro-cometa', 'Ilha da Árvore Milenar, ao entardecer', 'Voa deixando um rastro de brilho. Só pousa nos galhos da árvore gigante.', [['t', 20, 0, 90, -44, 90, 44, '#ffb4d8'], ['e', -4, 0, 42, 30, '#ff8fb8'], ['c', -40, -10, 18, '#ff8fb8'], ['t', -58, -10, -76, -4, -58, -2, '#ffd23f'], ['e', 4, -6, 24, 12, '#ffd1e3'], ['c', -44, -14, 3, '#2a2230']]);
  cr('sapo', 'Sapo-lagoa', 'Ilha das Cachoeiras', 'Canta uma única nota, bem grave, quando a lagoa está tranquila.', [['e', 0, 14, 56, 40, '#7acb8a'], ['c', -30, -20, 15, '#9ae6a4'], ['c', 30, -20, 15, '#9ae6a4'], ['c', -30, -22, 6, '#2a2230'], ['c', 30, -22, 6, '#2a2230'], ['e', 0, 30, 36, 10, '#d6f5d0']]);
  cr('caranguejo', 'Caranguejo-concha', 'Praias de todas as ilhas', 'Carrega uma conchinha nas costas e anda de lado para não bater nas coisas.', [['e', 0, 12, 52, 34, '#ff8a6a'], ['c', -40, -20, 16, '#ff8a6a'], ['c', 40, -20, 16, '#ff8a6a'], ['c', -42, -26, 4, '#2a2230'], ['c', 42, -26, 4, '#2a2230'], ['e', 0, 2, 30, 24, '#f6d6ff'], ['e', -60, 20, 12, 4, '#ff8a6a'], ['e', 60, 20, 12, 4, '#ff8a6a']]);
  cr('pinguim', 'Pinguim-neve', 'Ilha Nevada, perto do lago', 'Escorrega de barriga pela neve só porque dá vontade. Usa um cachecol invisível.', [['e', 0, 6, 40, 56, '#33476e'], ['e', 0, 14, 26, 38, '#ffffff'], ['c', 0, -50, 20, '#33476e'], ['t', 0, -48, 14, -38, 0, -34, '#ffb14a'], ['c', -8, -54, 3, '#ffffff'], ['c', 8, -54, 3, '#ffffff']]);
  cr('lagartixa', 'Lagartixa-ouro', 'Ruínas da Ilha das Dunas', 'Fica parada nas pedras quentes e brilha como moeda velha ao sol.', [['e', 0, 6, 60, 18, '#e8c24a'], ['c', -56, 2, 16, '#e8c24a'], ['t', 56, 4, 108, 10, 56, 14, '#d8ae44'], ['c', -60, -2, 3, '#2a2230'], ['e', -20, 24, 6, 14, '#d8ae44'], ['e', 20, 24, 6, 14, '#d8ae44']]);
  cr('gato', 'Gato-do-farol', 'Ilha do Farol', 'Dorme perto da lâmpada do farol e acorda só para olhar o mar. Seus olhos refletem a luz.', [['e', 0, 12, 48, 38, '#6a6f8a'], ['c', -36, -22, 22, '#6a6f8a'], ['t', -52, -36, -44, -62, -34, -38, '#6a6f8a'], ['t', -20, -38, -28, -62, -36, -38, '#6a6f8a'], ['c', -44, -24, 5, '#ffe28a'], ['c', -28, -24, 5, '#ffe28a'], ['e', 56, 10, 34, 8, '#6a6f8a']]);
  cr('pato', 'Pato da Vila', 'Vila Flutuante', 'Atravessa as passarelas devagarzinho, sempre na frente, como se fosse o prefeito.', [['e', 0, 14, 54, 34, '#fff4c8'], ['c', -34, -26, 20, '#fff4c8'], ['t', -52, -22, -78, -16, -52, -12, '#ffa84a'], ['c', -40, -30, 3, '#2a2230'], ['e', 14, 6, 26, 12, '#ffe28a']]);
  cr('morcego', 'Morcego-cristal', 'Caverna da Ilha dos Cristais, de noite', 'Suas asas são translúcidas e refletem as cores dos cristais enquanto ele voa.', [['c', 0, 0, 20, '#6a50a0'], ['t', 16, 0, 90, -34, 70, 30, '#9a80e0'], ['t', -16, 0, -90, -34, -70, 30, '#9a80e0'], ['t', -8, -16, -14, -34, -2, -18, '#6a50a0'], ['t', 8, -16, 14, -34, 2, -18, '#6a50a0'], ['c', -6, -2, 3, '#ffe28a'], ['c', 6, -2, 3, '#ffe28a']]);
  cr('aguaviva', 'Água-viva Estrela', 'Gruta Submarina', 'Leva uma estrela guardada dentro do corpo e acende devagarinho quando alguém chega perto.', [['h', 0, 4, 48, 44, '#c8a8ff'], ['e', 0, 6, 24, 20, '#fff1c8'], ['l', -30, 10, -34, 70, '#c8a8ff'], ['l', -10, 14, -8, 76, '#c8a8ff'], ['l', 12, 14, 10, 72, '#c8a8ff'], ['l', 32, 10, 36, 68, '#c8a8ff']], { glow: '#c8a8ff' });
  cr('tartaruga', 'Tartaruga-musgo', 'Gruta Submarina', 'Tem tanto musgo no casco que pensam que é uma ilhazinha. Nunca está com pressa.', [['e', 0, 4, 58, 42, '#7aa86a'], ['e', 0, 2, 44, 30, '#9ac47a'], ['c', -62, 4, 17, '#a8cc84'], ['e', 36, 34, 18, 9, '#a8cc84'], ['e', -30, 34, 18, 9, '#a8cc84'], ['c', -68, 0, 3, '#2a2230']]);
  cr('polvo', 'Polvo-arco-íris', 'Gruta Submarina', 'Muda de cor conforme o humor. Hoje parece estar de bom humor.', [['c', 0, -10, 40, '#ff8fb8'], ['l', -30, 20, -50, 66, '#ff8fb8'], ['l', -14, 28, -20, 74, '#ffb48a'], ['l', 6, 28, 12, 74, '#ffe28a'], ['l', 26, 22, 44, 68, '#9affc8'], ['c', -14, -14, 8, '#ffffff'], ['c', 14, -14, 8, '#ffffff'], ['c', -14, -14, 4, '#2a2230'], ['c', 14, -14, 4, '#2a2230']]);
  cr('abissal', 'Peixe-abissal', 'Gruta Submarina, no fundo', 'Mora onde a luz não chega e leva a sua própria. É mais bonzinho do que parece.', [['e', 0, 6, 56, 40, '#2a2f5a'], ['t', 52, 6, 94, -24, 94, 36, '#3a4078'], ['l', -30, -24, -50, -62, '#2a2f5a'], ['c', -50, -64, 8, '#9affc8'], ['c', -34, -4, 7, '#ffffff'], ['c', -34, -4, 3, '#2a2230'], ['e', -14, 24, 22, 6, '#ffe28a']], { glow: '#9affc8' });
  /* constelações (padrões em 0..1; ligar as estrelas no céu, à noite) */
  const con = (id, name, desc, pts, links, az, el) => add('sky', 'c_' + id, name, 'Céu à noite · tecla K', desc, { pts, links, az, el });
  con('lira', 'A Lira', 'Uma harpa de seis estrelas. Dizem que ela toca sozinha quando o mar está calmo.', [[.5, .1], [.28, .38], [.72, .38], [.34, .82], [.66, .82], [.5, .55]], [[0, 1], [0, 2], [1, 3], [2, 4], [3, 4], [1, 5], [2, 5]], 0.3, 0.9);
  con('barco', 'O Barco', 'O barquinho das estrelas, sempre indo para algum lugar bonito.', [[.15, .6], [.85, .6], [.7, .84], [.3, .84], [.5, .12], [.5, .6]], [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [4, 1]], 1.2, 0.75);
  con('raposa', 'A Raposa', 'Uma raposa de luz correndo pelo céu com o rabo erguido.', [[.2, .2], [.35, .42], [.5, .3], [.65, .42], [.8, .2], [.5, .62], [.5, .88]], [[0, 1], [1, 2], [2, 3], [3, 4], [1, 5], [3, 5], [5, 6]], 2.1, 0.8);
  con('peixe', 'O Peixe-lua', 'Um peixe desenhado com sete pontinhos de luz.', [[.1, .5], [.35, .3], [.65, .4], [.85, .25], [.85, .75], [.65, .6], [.35, .7]], [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 0], [2, 5]], 3.0, 0.7);
  con('arvore', 'A Árvore Milenar', 'A árvore mais antiga, agora crescendo para cima, até o céu.', [[.5, .1], [.3, .3], [.7, .3], [.2, .56], [.8, .56], [.5, .56], [.5, .92]], [[0, 1], [0, 2], [1, 3], [2, 4], [1, 5], [2, 5], [5, 6]], 3.9, 0.95);
  con('coroa', 'A Coroa', 'Uma coroa de cinco pontas, para quem passou um dia inteiro sendo gentil.', [[.1, .72], [.25, .3], [.4, .6], [.5, .2], [.6, .6], [.75, .3], [.9, .72]], [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 0]], 4.8, 0.78);
  con('lanterna', 'A Lanterna', 'Uma lanterna pendurada no escuro para iluminar quem anda de noite.', [[.5, .08], [.3, .35], [.7, .35], [.3, .72], [.7, .72], [.5, .92]], [[0, 1], [0, 2], [1, 3], [2, 4], [3, 5], [4, 5], [1, 2], [3, 4]], 5.6, 0.85);
  con('ave', 'A Ave', 'Uma ave de asas abertas atravessando o céu devagar.', [[.5, .4], [.25, .2], [.08, .36], [.75, .2], [.92, .36], [.5, .78]], [[0, 1], [1, 2], [0, 3], [3, 4], [0, 5]], 0.9, 1.1);
  con('chave', 'A Chave', 'A chave de uma porta que ninguém lembra onde fica. Talvez seja a do céu.', [[.25, .3], [.14, .5], [.25, .7], [.4, .5], [.86, .5], [.7, .5], [.8, .72]], [[0, 1], [1, 2], [2, 3], [3, 0], [3, 5], [5, 4], [5, 6]], 2.6, 1.05);
  con('coracao', 'O Coração', 'Seis estrelas formando um coração, para lembrar que você não está sozinha.', [[.5, .36], [.3, .18], [.12, .38], [.5, .92], [.88, .38], [.7, .18]], [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0]], 4.3, 1.0);
  /* sons (pedras que cantam; tocar para ouvir e guardar) */
  const SOUNDS = XC.SOUNDS = [
    ['n1', 'Sino do Amanhecer', 'bell', 261.63, 'Ilha Principal', 'Um sino pequeno que toca quando o dia começa.'],
    ['n2', 'Harpa de Vidro', 'harp', 293.66, 'Ilha Principal', 'Cordas finas como fios de vidro.'],
    ['n3', 'Flauta da Brisa', 'flute', 329.63, 'Ilha da Árvore Milenar', 'Uma nota longa e suave, como vento entre as folhas.'],
    ['n4', 'Marimba de Coco', 'marimba', 392, 'Ilha das Dunas', 'Madeira oca e quente, redonda como um coco.'],
    ['n5', 'Caixa de Música', 'box', 440, 'Vila Flutuante', 'Uma melodiazinha de infância.'],
    ['n6', 'Gongo da Maré', 'gong', 196, 'Ilha do Farol', 'Grave e profundo, como a maré subindo.'],
    ['n7', 'Pandeiro de Folha', 'pluck', 523.25, 'Ilha Principal', 'Um estalinho divertido de folha seca.'],
    ['n8', 'Cristal Cantante', 'crystal', 587.33, 'Ilha dos Cristais', 'Brilha e canta ao mesmo tempo.'],
    ['n9', 'Violão de Areia', 'guitar', 329.63, 'Ilha das Dunas', 'Cordas mornas, afinadas pelo sol.'],
    ['n10', 'Sino de Gelo', 'ice', 659.25, 'Ilha Nevada', 'Um tilintar frio e cristalino.'],
    ['n11', 'Teclado Lunar', 'keys', 392, 'Ilha Principal, só de noite', 'Notas macias que só acordam à noite.'],
    ['n12', 'Tambor da Cachoeira', 'drum', 146.83, 'Ilha das Cachoeiras', 'Bate no ritmo da água caindo.']
  ];
  XC.SOUNDS_BY = {}; SOUNDS.forEach(s => { XC.SOUNDS_BY[s[0]] = { id: s[0], name: s[1], kind: s[2], f: s[3] }; add('sound', s[0], s[1], s[4], s[5] + ' Toque a pedra para ouvir e use o compositor (M) para montar uma melodia.', { kind: s[2], f: s[3] }); });
  const byId = XC.byId = {}; CAT.forEach(c => byId[c.id] = c);
  const countOf = id => (sv.b[id] | 0);
  XC.count = countOf;
  XC.found = cat => CAT.filter(c => c.cat === cat && countOf(c.id) > 0).length;
  XC.total = cat => CAT.filter(c => c.cat === cat).length;

  /* descobrir: soma 1 e avisa quando é novo */
  XC.discover = (id, silent) => {
    const e = byId[id]; if (!e) return false; const isNew = !countOf(id); sv.b[id] = countOf(id) + 1; XC.save(); refreshBadge();
    if (!silent) { const c = CATS.find(x => x.id === e.cat); XC.toast(isNew ? '✦ Novo no livro: ' + e.name : e.name + ' · ×' + sv.b[id], isNew ? c.name + ' ' + XC.found(e.cat) + '/' + XC.total(e.cat) + ' · abra o livro (B)' : 'Você já conhecia, mas é sempre bom rever.'); if (isNew) XC.burst(XC.P.x, XC.P.y + 1.4, XC.P.z, 0xffe28a); }
    if (bookOpen) renderBook(); return isNew;
  };

  /* ───────── ilustrações (desenhadas em canvas, uma vez) ───────── */
  const shade = (hex, k) => { const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255; const f = k < 0 ? 0 : 255, p = Math.abs(k); r = Math.round((f - r) * p + r); g = Math.round((f - g) * p + g); b = Math.round((f - b) * p + b); return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1); };
  function bgFor(g, w, h, a, b) { const gr = g.createRadialGradient(w / 2, h * 0.45, 10, w / 2, h / 2, w * 0.7); gr.addColorStop(0, a); gr.addColorStop(1, b); g.fillStyle = gr; g.fillRect(0, 0, w, h); }
  function ell(g, x, y, rx, ry, col, rot) { g.fillStyle = col; g.beginPath(); g.ellipse(x, y, rx, ry, rot || 0, 0, TAU); g.fill(); }
  function tri(g, a, b, c, d, e, f, col) { g.fillStyle = col; g.beginPath(); g.moveTo(a, b); g.lineTo(c, d); g.lineTo(e, f); g.closePath(); g.fill(); }
  function glowAt(g, x, y, r, col) { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, col + 'cc'); gr.addColorStop(1, col + '00'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }
  function drawFish(g, s) {
    const cx = 160, cy = 130; if (s.glow) glowAt(g, cx, cy, 120, s.glow);
    g.lineJoin = g.lineCap = 'round'; const eye = (x, y, r) => { ell(g, x, y, r, r, '#ffffff'); ell(g, x + r * 0.15, y, r * 0.55, r * 0.55, '#1c1830'); };
    const spots = (rx, ry, col, n) => { for (let i = 0; i < n; i++) { const a = i * 2.4, rr = 0.2 + (i % 4) * 0.17; ell(g, cx + Math.cos(a) * rx * rr * 1.1, cy + Math.sin(a) * ry * rr * 1.1, 6 + (i % 3) * 2, 6 + (i % 3) * 2, col); } };
    switch (s.shape) {
      case 'round': case 'moon': {
        const rx = s.shape === 'moon' ? 72 : 80, ry = s.shape === 'moon' ? 72 : 58; tri(g, cx + rx - 10, cy, cx + rx + 58, cy - 46, cx + rx + 58, cy + 46, s.fin); tri(g, cx - 10, cy - ry + 6, cx + 30, cy - ry - 36, cx + 40, cy - ry + 10, s.fin);
        ell(g, cx, cy, rx, ry, s.c1); ell(g, cx, cy + ry * 0.35, rx * 0.85, ry * 0.55, s.c2);
        if (s.pat === 'scales') { g.strokeStyle = shade(s.c1, -0.25); g.lineWidth = 2.5; for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) { g.beginPath(); g.arc(cx - 20 + c * 24 + (r % 2) * 12, cy - 22 + r * 20, 12, 0.2, Math.PI - 0.2); g.stroke(); } }
        if (s.pat === 'rainbow') { ['#ff9ad0', '#ffd23f', '#9affc8', '#9ad8ff', '#c8a8ff'].forEach((c, i) => ell(g, cx - 40 + i * 24, cy + (i % 2 ? 14 : -10), 17, 40, c + 'cc', 0.1)); }
        if (s.pat === 'blossom') { for (let i = 0; i < 3; i++) { const bx = cx - 30 + i * 34, by = cy - 18 + (i % 2) * 28; for (let p = 0; p < 5; p++) ell(g, bx + Math.cos(p * 1.256) * 9, by + Math.sin(p * 1.256) * 9, 7, 7, '#f9a6c4'); ell(g, bx, by, 4, 4, '#ffe28a'); } }
        if (s.shape === 'moon') { ell(g, cx - 30, cy - 20, 10, 10, '#b4c0e8'); ell(g, cx + 20, cy + 10, 14, 14, '#b4c0e8'); ell(g, cx - 5, cy + 36, 8, 8, '#b4c0e8'); }
        eye(cx - rx * 0.55, cy - ry * 0.18, 11); break; }
      case 'long': {
        const rx = 92, ry = 40; tri(g, cx + rx - 14, cy, cx + rx + 54, cy - 40, cx + rx + 54, cy + 40, s.fin); tri(g, cx - 20, cy - ry + 4, cx + 20, cy - ry - 30, cx + 50, cy - ry + 8, s.fin);
        ell(g, cx, cy, rx, ry, s.c1); ell(g, cx, cy + ry * 0.4, rx * 0.88, ry * 0.5, s.c2);
        if (s.pat === 'spots') spots(rx, ry, shade(s.c1, -0.35), 12); if (s.pat === 'ice') { g.strokeStyle = '#ffffffcc'; g.lineWidth = 3; for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(cx - 40 + i * 24, cy - 28); g.lineTo(cx - 28 + i * 24, cy + 28); g.stroke(); } ell(g, cx + 10, cy, 8, 8, '#ff9ab0'); }
        if (s.pat === 'aurora') { ['#9affc8', '#b79cff', '#ff8fa8'].forEach((c, i) => ell(g, cx - 10 + i * 24, cy - 8 + i * 6, 22, 14, c + 'aa', 0.3)); }
        if (s.lamp) { g.strokeStyle = s.c2; g.lineWidth = 4; g.beginPath(); g.moveTo(cx - rx * 0.6, cy - ry + 4); g.quadraticCurveTo(cx - rx * 0.9, cy - ry - 40, cx - rx * 0.4, cy - ry - 46); g.stroke(); glowAt(g, cx - rx * 0.4, cy - ry - 46, 40, '#ffe28a'); ell(g, cx - rx * 0.4, cy - ry - 46, 9, 9, '#fff6c8'); }
        eye(cx - rx * 0.62, cy - 8, 10); break; }
      case 'ball': {
        for (let i = 0; i < 16; i++) { const a = i / 16 * TAU, x1 = cx + Math.cos(a) * 62, y1 = cy + Math.sin(a) * 62; tri(g, x1 - Math.sin(a) * 6, y1 + Math.cos(a) * 6, cx + Math.cos(a) * 84, cy + Math.sin(a) * 84, x1 + Math.sin(a) * 6, y1 - Math.cos(a) * 6, shade(s.c1, -0.2)); }
        tri(g, cx + 54, cy, cx + 100, cy - 24, cx + 100, cy + 24, s.fin); ell(g, cx, cy, 64, 62, s.c1); ell(g, cx, cy + 22, 52, 34, s.c2); for (let i = 0; i < 9; i++) ell(g, cx - 30 + (i % 3) * 30, cy - 26 + Math.floor(i / 3) * 20, 4, 4, shade(s.c1, -0.3));
        eye(cx - 26, cy - 12, 12); ell(g, cx - 40, cy + 14, 8, 5, '#ff9ab0'); break; }
      case 'ray': {
        g.fillStyle = s.c1; g.beginPath(); g.moveTo(cx - 70, cy); g.quadraticCurveTo(cx - 20, cy - 100, cx + 90, cy - 6); g.quadraticCurveTo(cx + 30, cy + 10, cx - 20, cy + 70); g.closePath(); g.fill();
        g.beginPath(); g.moveTo(cx - 70, cy); g.quadraticCurveTo(cx - 20, cy + 100, cx + 90, cy + 6); g.quadraticCurveTo(cx + 30, cy - 10, cx - 20, cy - 70); g.closePath(); g.fill();
        ell(g, cx, cy, 46, 28, s.c2); g.strokeStyle = s.fin; g.lineWidth = 5; g.beginPath(); g.moveTo(cx + 60, cy); g.quadraticCurveTo(cx + 130, cy + 10, cx + 150, cy + 50); g.stroke();
        eye(cx - 26, cy - 8, 8); for (let i = 0; i < 6; i++) ell(g, cx + 24 + i * 6, cy - 40 + (i % 2) * 70 - 10, 4, 4, '#ffffffaa'); break; }
      case 'horse': {
        g.strokeStyle = s.c1; g.lineWidth = 26; g.beginPath(); g.moveTo(cx - 6, cy - 70); g.bezierCurveTo(cx + 40, cy - 40, cx + 40, cy + 20, cx, cy + 50); g.bezierCurveTo(cx - 30, cy + 80, cx + 20, cy + 100, cx + 10, cy + 70); g.stroke();
        g.lineWidth = 18; g.beginPath(); g.moveTo(cx - 10, cy - 70); g.lineTo(cx - 56, cy - 76); g.stroke(); ell(g, cx - 4, cy - 70, 24, 22, s.c1); ell(g, cx + 20, cy - 4, 14, 36, s.c2, 0.1);
        tri(g, cx + 24, cy - 20, cx + 70, cy - 10, cx + 28, cy + 10, s.fin); for (let i = 0; i < 4; i++) tri(g, cx + 30, cy - 70 + i * 26, cx + 56, cy - 62 + i * 26, cx + 34, cy - 50 + i * 26, s.fin); eye(cx - 8, cy - 76, 8); break; }
      case 'cloud': {
        [[-50, 6, 38], [-12, -14, 46], [34, 0, 42], [66, 16, 30], [-4, 20, 40]].forEach(([dx, dy, r]) => ell(g, cx + dx, cy + dy, r, r * 0.8, s.c1)); tri(g, cx + 84, cy + 14, cx + 130, cy - 20, cx + 130, cy + 44, s.c2); eye(cx - 38, cy - 2, 9); ell(g, cx - 52, cy + 20, 9, 5, '#ffc2d6'); break; }
      case 'flat': {
        ell(g, cx, cy, 86, 40, s.c1); tri(g, cx + 70, cy, cx + 130, cy - 34, cx + 130, cy + 34, s.fin); ell(g, cx, cy + 16, 70, 18, s.c2); for (let i = 0; i < 14; i++) ell(g, cx - 50 + (i % 7) * 16, cy - 16 + Math.floor(i / 7) * 22, 3, 3, shade(s.c1, -0.25)); ell(g, cx - 30, cy - 14, 9, 9, '#ffffff'); ell(g, cx - 28, cy - 14, 4, 4, '#1c1830'); eye(cx - 52, cy - 12, 10); break; }
      case 'eel': {
        g.lineCap = 'round'; const pts = []; for (let i = 0; i <= 40; i++) { const u = i / 40; pts.push([cx - 120 + u * 240, cy + Math.sin(u * 9) * 34 - u * 10]); }
        for (let pass = 0; pass < 2; pass++) { g.strokeStyle = pass ? s.c2 : s.c1; g.lineWidth = pass ? 12 : 26; g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke(); }
        for (let i = 3; i < 38; i += 5) ell(g, pts[i][0], pts[i][1] - 16, 7, 7, s.fin + 'cc'); eye(pts[0][0] + 6, pts[0][1] - 6, 9); break; }
    }
  }
  function drawFlower(g, s) {
    const cx = 160, cy = 100; if (s.glow) glowAt(g, cx, cy, 110, s.glow);
    g.strokeStyle = '#4f9a62'; g.lineWidth = 8; g.lineCap = 'round'; g.beginPath(); g.moveTo(cx, cy + 20); g.quadraticCurveTo(cx - 8, cy + 90, cx, 230); g.stroke();
    ell(g, cx - 34, 188, 34, 13, '#6fbf7a', -0.5); ell(g, cx + 34, 170, 34, 13, '#5fae6c', 0.5);
    const petals = (n, rx, ry, dist, col, rot) => { for (let i = 0; i < n; i++) { const a = i / n * TAU + (rot || 0); g.save(); g.translate(cx + Math.cos(a) * dist, cy + Math.sin(a) * dist); g.rotate(a); ell(g, 0, 0, rx, ry, col); g.restore(); } };
    switch (s.k) {
      case 'daisy': petals(12, 30, 10, 34, s.c); petals(12, 24, 7, 34, shade(s.c, -0.08), 0.26); ell(g, cx, cy, 22, 22, s.mid); break;
      case 'lily': petals(6, 44, 14, 36, s.c); petals(6, 34, 10, 30, shade(s.c, 0.4), 0.52); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; g.strokeStyle = '#f2b94a'; g.lineWidth = 3; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * 20, cy + Math.sin(a) * 20); g.stroke(); ell(g, cx + Math.cos(a) * 22, cy + Math.sin(a) * 22, 4, 4, '#f2b94a'); } ell(g, cx, cy, 10, 10, s.mid); break;
      case 'sun': petals(20, 28, 7, 40, s.c); petals(20, 24, 6, 36, shade(s.c, -0.12), 0.16); ell(g, cx, cy, 36, 36, s.mid); for (let i = 0; i < 30; i++) ell(g, cx + Math.cos(i * 2.4) * (i % 6) * 5, cy + Math.sin(i * 2.4) * (i % 6) * 5, 3, 3, shade(s.mid, 0.3)); break;
      case 'rose': for (let i = 0; i < 4; i++) petals(7 - i, 30 - i * 5, 22 - i * 4, 22 - i * 4, shade(s.c, -0.06 * i), i * 0.4); ell(g, cx, cy, 14, 14, s.mid); g.strokeStyle = shade(s.c, -0.35); g.lineWidth = 3; g.beginPath(); g.arc(cx, cy, 9, 0.2, 5); g.stroke(); break;
      case 'lav': { g.fillStyle = '#4f9a62'; for (let i = 0; i < 9; i++) { const y = cy - 40 + i * 14; ell(g, cx - 12 + Math.sin(i) * 3, y, 16, 8, i % 2 ? s.c : s.mid, 0.5); ell(g, cx + 12 + Math.sin(i) * 3, y + 6, 16, 8, i % 2 ? s.mid : s.c, -0.5); } ell(g, cx, cy - 56, 9, 12, s.c); break; }
      case 'tulip': { g.fillStyle = s.c; g.beginPath(); g.moveTo(cx - 44, cy - 20); g.quadraticCurveTo(cx - 52, cy + 40, cx, cy + 40); g.quadraticCurveTo(cx + 52, cy + 40, cx + 44, cy - 20); g.lineTo(cx + 22, cy - 6); g.lineTo(cx, cy - 46); g.lineTo(cx - 22, cy - 6); g.closePath(); g.fill(); g.fillStyle = s.mid + 'cc'; g.beginPath(); g.moveTo(cx - 14, cy + 40); g.quadraticCurveTo(cx, cy - 20, cx + 14, cy + 40); g.fill(); break; }
      case 'orchid': petals(3, 46, 22, 40, s.c, -1.57); petals(2, 34, 16, 34, shade(s.c, 0.3), 0.3); ell(g, cx, cy + 16, 22, 28, s.mid); ell(g, cx, cy + 4, 8, 8, '#ffe28a'); break;
      case 'bell': for (let i = 0; i < 3; i++) { const bx = cx - 50 + i * 50, by = cy - 4 + (i === 1 ? -20 : 8); g.strokeStyle = '#4f9a62'; g.lineWidth = 4; g.beginPath(); g.moveTo(cx, cy + 40); g.quadraticCurveTo(bx, by - 20, bx, by - 24); g.stroke(); g.fillStyle = s.c; g.beginPath(); g.moveTo(bx - 10, by - 26); g.quadraticCurveTo(bx - 34, by + 26, bx - 30, by + 34); g.quadraticCurveTo(bx, by + 44, bx + 30, by + 34); g.quadraticCurveTo(bx + 34, by + 26, bx + 10, by - 26); g.closePath(); g.fill(); ell(g, bx, by + 36, 10, 6, s.mid); } break;
    }
  }
  function drawCritter(g, s) {
    const cx = 160, cy = 130; if (s.glow) glowAt(g, cx, cy, 130, s.glow);
    g.lineCap = 'round'; const sc = 1.15;
    for (const p of s.parts) {
      const k = p[0];
      if (k === 'e') ell(g, cx + p[1] * sc, cy + p[2] * sc, p[3] * sc, p[4] * sc, p[5]);
      else if (k === 'c') ell(g, cx + p[1] * sc, cy + p[2] * sc, p[3] * sc, p[3] * sc, p[4]);
      else if (k === 't') tri(g, cx + p[1] * sc, cy + p[2] * sc, cx + p[3] * sc, cy + p[4] * sc, cx + p[5] * sc, cy + p[6] * sc, p[7]);
      else if (k === 'h') { g.fillStyle = p[5]; g.beginPath(); g.ellipse(cx + p[1] * sc, cy + p[2] * sc, p[3] * sc, p[4] * sc, 0, Math.PI, 0); g.closePath(); g.fill(); }
      else if (k === 'l') { g.strokeStyle = p[5]; g.lineWidth = 7; g.beginPath(); g.moveTo(cx + p[1] * sc, cy + p[2] * sc); g.quadraticCurveTo(cx + (p[1] + 12) * sc, cy + (p[2] + p[4]) / 2 * sc, cx + p[3] * sc, cy + p[4] * sc); g.stroke(); }
    }
  }
  function drawSky(g, e) {
    for (let i = 0; i < 40; i++) ell(g, (i * 97 % 320), (i * 53 % 240), 1.4, 1.4, '#ffffff66');
    const X = p => 60 + p[0] * 200, Y = p => 24 + p[1] * 190; g.strokeStyle = '#bcd0ff'; g.lineWidth = 2.5; g.lineCap = 'round';
    e.links.forEach(([a, b]) => { g.beginPath(); g.moveTo(X(e.pts[a]), Y(e.pts[a])); g.lineTo(X(e.pts[b]), Y(e.pts[b])); g.stroke(); });
    e.pts.forEach(p => { glowAt(g, X(p), Y(p), 22, '#fff1c8'); ell(g, X(p), Y(p), 5.5, 5.5, '#ffffff'); });
  }
  function drawSound(g, e) {
    const cx = 160, cy = 120, hue = (e.f * 0.37) % 360; glowAt(g, cx, cy, 120, '#' + [0, 8, 16].map((o, i) => Math.round(160 + 80 * Math.sin((hue + i * 120) * Math.PI / 180)).toString(16).padStart(2, '0')).join(''));
    g.fillStyle = `hsl(${hue},70%,72%)`; g.beginPath(); g.moveTo(cx, cy - 78); g.lineTo(cx + 52, cy - 8); g.lineTo(cx + 30, cy + 70); g.lineTo(cx - 30, cy + 70); g.lineTo(cx - 52, cy - 8); g.closePath(); g.fill();
    g.fillStyle = `hsl(${hue},80%,86%)`; g.beginPath(); g.moveTo(cx, cy - 78); g.lineTo(cx + 52, cy - 8); g.lineTo(cx, cy + 6); g.lineTo(cx - 52, cy - 8); g.closePath(); g.fill();
    g.fillStyle = '#ffffffcc'; g.font = '700 54px "DM Mono",monospace'; g.textAlign = 'center'; g.fillText('♪', cx, cy + 40);
  }
  const iconCache = {};
  XC.icon = id => {
    if (iconCache[id]) return iconCache[id]; const e = byId[id]; if (!e) return null;
    const c = document.createElement('canvas'); c.width = 320; c.height = 240; const g = c.getContext('2d');
    const bgs = { fish: ['#4a86c8', '#14264a'], flower: ['#9ad0a0', '#1f3a40'], critter: ['#9a8cd8', '#201a44'], sky: ['#1c2a6a', '#080c22'], sound: ['#6a58b8', '#161338'] }[e.cat];
    bgFor(g, 320, 240, bgs[0], bgs[1]);
    if (e.cat === 'fish') drawFish(g, e.s); else if (e.cat === 'flower') drawFlower(g, e.s); else if (e.cat === 'critter') drawCritter(g, e.s); else if (e.cat === 'sky') drawSky(g, e); else drawSound(g, e);
    return iconCache[id] = c;
  };
  /* sprite sem fundo (criaturas e peixes), para aparecer no mundo 3D */
  const spriteCache = {};
  XC.sprite = id => { if (spriteCache[id]) return spriteCache[id]; const e = byId[id]; if (!e) return null; const c = document.createElement('canvas'); c.width = 320; c.height = 240; const g = c.getContext('2d'); if (e.cat === 'fish') drawFish(g, e.s); else if (e.cat === 'critter') drawCritter(g, e.s); return spriteCache[id] = c; };
  /* cópia leve (canvas → canvas, sem passar por imagem) */
  const iconEl = id => { const src = XC.icon(id), c = document.createElement('canvas'); c.width = 320; c.height = 240; if (src) c.getContext('2d').drawImage(src, 0, 0); return c; };

  /* ───────── o livro ───────── */
  const bk = document.createElement('div'); bk.id = 'book';
  bk.innerHTML = '<div class="bk"><div class="cover l"></div><div class="cover"></div><div class="pg pgL"><h2 id="bkT"></h2><p class="sub" id="bkS"></p><div class="prog"><i id="bkP"></i></div><div class="grid" id="bkG"></div><p class="sub" id="bkAll"></p></div><div class="pg pgR"><button class="x" type="button" aria-label="Fechar">✕</button><div id="bkD" style="display:grid;gap:10px;overflow:auto;padding-right:2px"></div><div class="leaf" id="bkLeaf"></div></div><div class="tabs" id="bkTabs"></div></div>';
  document.body.appendChild(bk);
  let bookOpen = false, bookCat = 'fish', bookSel = null, bookT = 0;
  const RTAG = { comum: 'comum', incomum: 'incomum', rara: 'rara', raro: 'raro' };
  function renderBook(turn) {
    const cat = CATS.find(c => c.id === bookCat), list = CAT.filter(c => c.cat === bookCat), got = list.filter(c => countOf(c.id) > 0).length;
    $('bkT').textContent = cat.name; $('bkS').textContent = got + ' de ' + list.length + (got === list.length ? ' · página completa ✦' : ' · faltam ' + (list.length - got)); $('bkP').style.width = (got / list.length * 100) + '%';
    const all = CAT.filter(c => countOf(c.id) > 0).length; $('bkAll').textContent = 'Livro todo: ' + all + ' de ' + CAT.length + ' · faltam ' + (CAT.length - all);
    const gr = $('bkG'); gr.replaceChildren();
    list.forEach(e => { const n = countOf(e.id), b = document.createElement('button'); b.type = 'button'; b.className = 'it' + (n ? '' : ' no') + (bookSel === e.id ? ' sel' : ''); const im = iconEl(e.id); const nm = document.createElement('span'); nm.textContent = n ? e.name : '? ? ?'; b.append(im, nm); if (n > 1) { const q = document.createElement('i'); q.textContent = '×' + n; b.appendChild(q); } b.addEventListener('click', () => { bookSel = e.id; renderBook(); }); gr.appendChild(b); });
    const tb = $('bkTabs'); if (!tb.children.length) CATS.forEach(c => { const b = document.createElement('button'); b.type = 'button'; b.dataset.c = c.id; b.textContent = c.name; b.addEventListener('click', () => setCat(c.id)); tb.appendChild(b); });
    [...tb.children].forEach(b => b.classList.toggle('on', b.dataset.c === bookCat));
    const d = $('bkD'); d.replaceChildren(); const e = byId[bookSel] && byId[bookSel].cat === bookCat ? byId[bookSel] : null;
    if (!e) { const t = document.createElement('div'); t.className = 'dn'; t.textContent = cat.name; const p = document.createElement('p'); p.className = 'txt'; p.textContent = bookHelp[bookCat]; d.append(t, p); }
    else {
      const n = countOf(e.id), big = document.createElement('div'); big.className = 'big' + (n ? '' : ' no'); const im = iconEl(e.id); big.appendChild(im);
      const t = document.createElement('div'); t.className = 'dn'; t.textContent = n ? e.name : '? ? ?'; const tg = document.createElement('div'); tg.className = 'tags';
      const mk = s => { const sp = document.createElement('span'); sp.textContent = s; tg.appendChild(sp); };
      if (n) { mk(cat.one + (e.r ? ' · ' + RTAG[e.r] : '')); mk(bookCat === 'flower' ? 'colhida ×' + n : bookCat === 'sky' ? 'descoberta' : 'visto ×' + n); if (e.night) mk('só de noite'); }
      else mk('ainda não encontrado');
      const p = document.createElement('p'); p.className = 'txt'; p.textContent = n ? e.desc : 'Uma silhueta. ' + (bookCat === 'critter' ? 'Chegue perto e aperte E para observar.' : bookCat === 'fish' ? 'Pesque perto da água (E no ponto de pesca).' : bookCat === 'flower' ? 'Plante e cuide no jardim.' : bookCat === 'sky' ? 'Olhe o céu à noite (K) e ligue as estrelas.' : 'Procure pelas ilhas.');
      const w = document.createElement('p'); w.className = 'sub'; w.textContent = 'Onde: ' + e.where; d.append(big, t, tg, p, w);
    }
    if (turn) { const lf = $('bkLeaf'); lf.classList.remove('go'); void lf.offsetWidth; lf.classList.add('go'); }
  }
  const bookHelp = { fish: 'Pesque nos pontos brilhantes perto da água. Cada ilha tem peixes diferentes, e alguns só aparecem de noite.', flower: 'Plante sementes no jardim da ilha principal, regue e espere crescer. Algumas só abrem à noite.', critter: 'Existem criaturas espalhadas por todas as ilhas. Chegue perto devagar e aperte E para observar.', sky: 'À noite, aperte K e ligue as estrelas na ordem certa. Cada desenho que você descobre fica no céu.', sound: 'Pedras que cantam estão escondidas nas ilhas. Toque nelas para guardar o som e monte melodias no compositor (M).' };
  function setCat(c) { if (c === bookCat) return; bookCat = c; bookSel = null; renderBook(true); }
  function openBook() { if (bookOpen || XC.modal) return; bookOpen = true; XC.modal++; bk.style.display = 'grid'; renderBook(); requestAnimationFrame(() => requestAnimationFrame(() => bk.classList.add('show'))); }
  function closeBook() { if (!bookOpen) return; bookOpen = false; XC.modal = Math.max(0, XC.modal - 1); bk.classList.remove('show'); clearTimeout(bookT); bookT = setTimeout(() => { if (!bookOpen) bk.style.display = 'none'; }, 480); try { XC.cv.focus({ preventScroll: true }); } catch (e) {} }
  bk.addEventListener('pointerdown', e => { if (e.target === bk) closeBook(); e.stopPropagation(); });
  bk.querySelector('.x').addEventListener('click', closeBook);
  XC.book = { open: openBook, close: closeBook, toggle: () => bookOpen ? closeBook() : openBook(), get isOpen() { return bookOpen; }, setCat };

  /* ───────── barra de ferramentas (esquerda) ───────── */
  const bar = document.createElement('div'); bar.id = 'xTools'; document.body.appendChild(bar);
  const tools = XC.tools = {};
  XC.tool = (id, label, key, fn, title) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.id = 'xt_' + id; b.title = title || label; b.innerHTML = label + (key ? ' <b>' + key.toUpperCase() + '</b>' : ''); b.addEventListener('click', () => { fn(); b.blur(); }); bar.appendChild(b); tools[id] = b; return b; };
  const bookBtn = XC.tool('book', 'Livro', 'b', () => XC.book.toggle(), 'Livro de criaturas (B)');
  function refreshBadge() { const all = CAT.filter(c => countOf(c.id) > 0).length; bookBtn.innerHTML = 'Livro <b>' + all + '/' + CAT.length + '</b>'; }
  refreshBadge();

  /* ───────── teclas e ponteiro comuns ───────── */
  const keyH = [];            /* módulos podem registrar tratadores de tecla */
  XC.onKey = f => keyH.push(f);
  XC.key = (k, e) => {
    if (bookOpen) { if (k === 'escape' || k === 'b') closeBook(); else if (k === 'arrowright' || k === 'arrowleft') { const i = CATS.findIndex(c => c.id === bookCat); setCat(CATS[(i + (k === 'arrowright' ? 1 : CATS.length - 1)) % CATS.length].id); } e.preventDefault(); return true; }
    for (const f of keyH) if (f(k, e)) return true;
    if (k === 'b' && !e.repeat) { openBook(); return true; }
    return false;
  };
  const ptrH = []; XC.onPtr = f => ptrH.push(f);
  XC.ptr = (e, ph) => { if (bookOpen) return true; for (const f of ptrH) if (f(e, ph)) return true; return false; };
  /* E e dicas: cada módulo registra { hint(): texto|'' , act(): bool } em ordem de prioridade */
  const acts = []; XC.addAct = (hint, act, first) => first ? acts.unshift({ hint, act }) : acts.push({ hint, act });
  XC.hint = () => { if (bookOpen) return ''; for (const a of acts) { const h = a.hint(); if (h) return h; } return ''; };
  XC.act = () => { if (bookOpen) return true; for (const a of acts) if (a.hint() && a.act()) return true; return false; };
  XC.hintEl = XC.$('prompt');
  /* teletransporte com fade (farol, gruta...) */
  XC.warp = (x, z, y, yaw, msg, after) => {
    const f = XC.fadeEl, old = f.textContent; f.textContent = msg || ''; f.classList.add('on');
    setTimeout(() => {
      const P = XC.P; P.sit = false; P.bench = null; P.nearBench = false; P.x = x; P.z = z; P.yaw = yaw; P.vx = P.vz = 0; P.vy = 0; P.y = y; P.ground = true; P.gliding = false;
      XC.CAM.yaw = yaw + Math.PI; XC.CAM.pitch = 0.3; XC.CAM.tx = x; XC.CAM.ty = y + 1.55; XC.CAM.tz = z; XC.PS.lastYaw = yaw; if (after) after();
      setTimeout(() => { f.classList.remove('on'); setTimeout(() => { f.textContent = old; }, 950); }, 450);
    }, 900);
  };
});
