/* ============================================================================
   host.js — ponte com o site Ressonância (o jogo roda dentro de um quadro).
   - recebe as cores/tema do site (claro/escuro) e aplica nas variáveis CSS;
   - define SC.pal: cores do mapa que mudam com o tema;
   - SC.exit(): pede ao site para fechar o jogo e voltar à lista de jogos.
   Fora do site (abrindo index.html direto) tudo continua funcionando com o tema escuro.
   ========================================================================== */
(function (SC) {
  'use strict';
  const PAL = {
    dark:  { wall: 'rgba(19,27,43,.9)',  dots: 'rgba(63,214,255,.08)', scan: 'rgba(63,214,255,.10)', mini: 'rgba(63,214,255,.14)' },
    light: { wall: 'rgba(24,32,48,.82)', dots: 'rgba(18,24,40,.10)',   scan: 'rgba(18,24,40,.08)',   mini: 'rgba(18,24,40,.12)' }
  };
  SC.pal = Object.assign({ dark: true }, PAL.dark);
  SC.embedded = window.parent !== window;
  /* o site abre o jogo com ?t=dark|light para não piscar o tema errado antes da mensagem chegar */
  (function () {
    const m = /[?&]t=(dark|light)/.exec(location.search);
    if (!m) return;
    document.documentElement.dataset.theme = m[1];
    Object.assign(SC.pal, PAL[m[1]], { dark: m[1] === 'dark' });
  })();
  const KEYS = ['--bg', '--fg', '--mute', '--line', '--panel', '--chip', '--accent', '--veil-a', '--veil-b', '--dim', '--display', '--mono'];
  window.addEventListener('message', e => {
    const d = e.data;
    if (!d || d.rz !== 'theme') return;
    const r = document.documentElement;
    KEYS.forEach(k => { if (d.vars && d.vars[k]) r.style.setProperty(k, d.vars[k]); });
    r.dataset.theme = d.dark ? 'dark' : 'light';
    Object.assign(SC.pal, PAL[d.dark ? 'dark' : 'light'], { dark: !!d.dark });
  });
  SC.exit = () => { if (SC.embedded) window.parent.postMessage({ nb: 'exit' }, '*'); };
  if (SC.embedded) window.parent.postMessage({ nb: 'ready' }, '*');
})(window.SC);
