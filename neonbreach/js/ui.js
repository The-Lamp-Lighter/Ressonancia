/* ============================================================================
   ui.js — seleção de missão (por modo e dificuldade), como jogar e resultado.
   No Ressonância o jogo abre direto na seleção; o fundo é transparente (as ondas aparecem atrás).
   ========================================================================== */
(function (SC) {
  'use strict';
  const { $, $$, esc } = SC;
  const MODES = {
    infil: { name: 'Invasão', tag: 'Entre na rede, saia sem rastro', desc: 'Invada o local, hackeie os terminais (um só ou vários) e chegue à extração. Portas trancadas também pedem hack.',
      icon: '<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="6" y="10" width="36" height="26" rx="2" fill="none" stroke="currentColor" stroke-width="2.5"/><path d="M14 20l6 5-6 5M24 31h10" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="square"/><path d="M16 42h16" stroke="currentColor" stroke-width="2.5"/></svg>' },
    rescue: { name: 'Resgate', tag: 'Ache, abra, leve para fora', desc: 'Encontre a pessoa, abra o caminho até ela e escolte-a até a extração sem disparar o alarme.',
      icon: '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="18" cy="14" r="5.5" fill="none" stroke="currentColor" stroke-width="2.5"/><path d="M8 38v-6c0-5 4-9 10-9s10 4 10 9v6" fill="none" stroke="currentColor" stroke-width="2.5"/><path d="M32 24h12m0 0l-5-5m5 5l-5 5" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="square"/></svg>' }
  };
  const RANK_NAME = { S: 'Fantasma', A: 'Sombra', B: 'Ruído', F: 'Flatline' };
  let mode = SC.store.get('mode', 'infil');

  function howTo() {
    const m = document.createElement('div'); m.className = 'modal';
    m.innerHTML = `<div class="panel modal-box"><h3>Como jogar</h3>
      <p>Chegue ao alvo sem ser visto: os cones amarelos são o que guardas e câmeras enxergam. Quando o rastreamento enche, o ICE dispara o alarme e os guardas vêm atrás de você.</p>
      <div class="how-grid">
        <div><b>Mover</b><span class="mono">WASD ou setas</span></div>
        <div><b>Furtivo</b><span class="mono">Shift (rastreamento cai pela metade)</span></div>
        <div><b>Hackear</b><span class="mono">E, perto de um terminal ou porta</span></div>
        <div><b>Pausar</b><span class="mono">Esc</span></div>
      </div>
      <p class="mono kick" style="margin-top:14px">O hack</p>
      <div class="how-seq"><i>▲</i><i>▶</i><i>▶</i><i>▼</i><i>◀</i></div>
      <p>Aperte as setas na ordem, antes de o tempo acabar. Errou uma, a sequência recomeça. O mundo não para enquanto você hackeia. O número em cada alvo é o tamanho da sequência, e quanto mais difícil o nível, mais longa e mais apertada ela fica.</p>
      <div class="row"><button class="btn primary" id="how-ok">Entendi</button></div></div>`;
    $('#modal-root').appendChild(m); requestAnimationFrame(() => m.classList.add('on'));
    const close = () => { m.classList.remove('on'); setTimeout(() => m.remove(), 160); SC.audio.sfx('click'); };
    $('#how-ok', m).onclick = close; m.onclick = e => { if (e.target === m) close(); };
    $('#how-ok', m).focus();
  }

  /* =========================== seleção =========================== */
  const pips = n => Array.from({ length: 6 }, (_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('');
  function renderSelect() {
    const best = SC.store.get('best', {}), list = SC.MAPS.filter(m => m.mode === mode);
    $$('#sel-tabs button').forEach(b => b.classList.toggle('on', b.dataset.m === mode));
    $('#sel-tabs').dataset.m = mode;
    $('#sel-desc').textContent = MODES[mode].desc;
    $('#ladder').innerHTML = SC.DIFF.map(D => {
      const n = list.filter(m => m.diff === D.id).length, got = list.filter(m => m.diff === D.id && best[m.id]).length;
      return `<button style="--dc:${D.col}" data-d="${D.id}" ${n ? '' : 'disabled'} title="${esc(D.blurb)}"><span class="dot"></span><b>${D.name}</b><small class="mono">${got}/${n}</small></button>`;
    }).join('');
    $$('#ladder button').forEach(b => b.onclick = () => { SC.audio.sfx('click'); const g = $('#grp-' + b.dataset.d); if (g) g.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion:reduce)').matches ? 'auto' : 'smooth', block: 'start' }); });
    $('#sel-grid').innerHTML = SC.DIFF.map(D => {
      const maps = list.filter(m => m.diff === D.id); if (!maps.length) return '';
      return `<section class="grp g-${D.id}" id="grp-${D.id}" style="--dc:${D.col}">
        <header><h2 class="gname"><span data-t="${D.name}">${D.name}</span></h2><div class="gpips" aria-label="nível ${D.n} de 6">${pips(D.n)}</div><p>${esc(D.blurb)}</p></header>
        <div class="cards">${maps.map(d => {
          const b = best[d.id], chips = [];
          chips.push(d.mode === 'infil' ? `<span class="chip">${d.nTerms} terminal${d.nTerms > 1 ? 'is' : ''}</span>` : '<span class="chip">1 refém</span>');
          if (d.nTerms) chips.push(`<span class="chip hk">${d.termMin === d.termMax ? d.termMin : d.termMin + '–' + d.termMax} teclas</span>`);
          if (d.nDoors) chips.push(`<span class="chip">${d.nDoors} porta${d.nDoors > 1 ? 's' : ''} · ${d.doorMin === d.doorMax ? d.doorMin : d.doorMin + '–' + d.doorMax} teclas</span>`);
          chips.push(`<span class="chip">${d.guards.length} guarda${d.guards.length === 1 ? '' : 's'}</span>`);
          if (d.cams.length) chips.push(`<span class="chip">${d.cams.length} câmera${d.cams.length > 1 ? 's' : ''}</span>`);
          const area = Math.min(1, Math.log(d.W * d.H / 200) / Math.log(7840 / 200));
          return `<button class="ms-card panel t-${d.theme}" data-id="${d.id}" style="--dc:${D.col}">
            <div class="thumbw"><canvas class="thumb" data-id="${d.id}"></canvas><span class="scan"></span></div>
            <div class="ms-body">
              <div class="ms-top"><span class="mono size"><i style="width:${Math.round(14 + area * 46)}px"></i>${d.size} · ${d.W}×${d.H}</span>${b ? `<span class="rank r-${b.rank}" title="Melhor resultado: ${RANK_NAME[b.rank]}">${b.rank}</span>` : ''}</div>
              <h3>${esc(d.name)}</h3>
              <p class="tagline">${esc(d.tagline)}</p>
              <div class="chips">${chips.join('')}</div>
            </div></button>`;
        }).join('')}</div></section>`;
    }).join('');
    $$('#sel-grid .ms-card').forEach(c => { c.onclick = () => { SC.audio.resume(); SC.audio.sfx('click'); SC.go('mission', c.dataset.id); }; c.onmouseenter = () => SC.audio.sfx('hover'); });
    requestAnimationFrame(() => $$('#sel-grid canvas.thumb').forEach(cv => SC.mission.thumb(cv, SC.mapById(cv.dataset.id))));
  }
  SC.screen('select', {
    mood: 'lobby',
    enter() {
      $('#sel-tabs').innerHTML = Object.keys(MODES).map(k => `<button data-m="${k}"><span class="ic">${MODES[k].icon}</span><span class="tx"><b>${MODES[k].name}</b><span>${MODES[k].tag}</span></span></button>`).join('');
      $$('#sel-tabs button').forEach(b => b.onclick = () => { mode = b.dataset.m; SC.store.set('mode', mode); SC.audio.sfx('click'); renderSelect(); $('#s-select').scrollTo({ top: 0 }); });
      $('#sel-back').onclick = () => { SC.audio.sfx('click'); SC.exit(); };
      renderSelect();
    }
  });

  /* =========================== resultado =========================== */
  const OUT = {
    silent: { t: 'Rastro zero', c: 'gn', s: 'Ninguém sabe que você esteve lá.' },
    alarm: { t: 'Saída ruidosa', c: 'yl', s: 'Objetivo cumprido, mas o ICE tem o seu rastro.' },
    fail: { t: 'Flatline', c: 'rd', s: 'O objetivo não foi cumprido.' }
  };
  SC.screen('result', {
    mood: 'win',
    enter(r) {
      const o = OUT[r.outcome], d = SC.mapById(r.id), D = SC.diffOf(d), mm = t => Math.floor(t / 60) + ':' + String(Math.floor(t % 60)).padStart(2, '0');
      SC.audio.mood(r.outcome === 'fail' ? 'lose' : 'win'); SC.audio.sfx(r.outcome === 'fail' ? 'bad' : 'ok');
      const list = SC.MAPS.filter(m => m.mode === d.mode).sort((a, b) => a.dn - b.dn), next = list[list.indexOf(d) + 1];
      const stats = [['Tempo em campo', mm(r.time)], ['Pico de rastreamento', Math.round(r.maxDet * 100) + '%'], ['Vezes rastreado', r.spotted], ['Hacks concluídos', r.hacksOk], ['Hacks que falharam', r.hacksFail], ['Item opcional', r.intel ? 'recuperado' : 'não']];
      $('#result-wrap').innerHTML = `
        <div class="res-band ${o.c}"><p class="mono">${esc(d.name)} · <span style="color:${D.col}">${D.name}</span></p><h2>${o.t}</h2><p>${o.s}</p>
          <div class="rank big r-${r.rank}" title="${RANK_NAME[r.rank]}">${r.rank}</div><p class="rname mono">${RANK_NAME[r.rank]}</p></div>
        ${r.outcome !== 'fail' ? `<blockquote class="epi">${esc(d.win)}</blockquote>` : `<blockquote class="epi">O ICE fechou a rede. Respire, olhe os cones de novo e tente outra rota.</blockquote>`}
        <div class="res-grid">${stats.map(x => `<div class="panel"><span class="mono">${x[0]}</span><b>${x[1]}</b></div>`).join('')}</div>
        <div class="row center"><button class="btn primary big" id="r-retry">Tentar de novo</button>${next && r.outcome !== 'fail' ? `<button class="btn am" id="r-next">Próxima: ${esc(next.name)}</button>` : ''}<button class="btn ghost" id="r-menu">Missões</button></div>
        <p class="mono mut small center">Fantasma: rastro zero, rastreamento baixo e nenhum hack falho. Sombra: rastro zero. Ruído: cumprida sob alarme.</p>`;
      $('#r-retry').onclick = () => { SC.audio.sfx('click'); SC.go('mission', d.id); };
      if ($('#r-next')) $('#r-next').onclick = () => { SC.audio.sfx('click'); SC.go('mission', next.id); };
      $('#r-menu').onclick = () => { SC.audio.sfx('click'); SC.go('select'); };
    }
  });

  /* barra de ferramentas da seleção: ajuda, efeitos e trilha */
  function syncAudioBtns() {
    const sfx = SC.audio.sfxOn(), mus = SC.audio.musicOn();
    $('#sel-sfx').textContent = 'Efeitos: ' + (sfx ? 'ligados' : 'desligados'); $('#sel-sfx').setAttribute('aria-pressed', String(sfx));
    $('#sel-mus').textContent = 'Trilha: ' + (mus ? 'ligada' : 'desligada'); $('#sel-mus').setAttribute('aria-pressed', String(mus));
  }
  window.addEventListener('DOMContentLoaded', () => {
    $('#sel-help').onclick = () => { SC.audio.resume(); SC.audio.sfx('click'); howTo(); };
    $('#sel-sfx').onclick = () => { SC.audio.resume(); SC.audio.toggle(); syncAudioBtns(); SC.audio.sfx('click'); };
    $('#sel-mus').onclick = () => { SC.audio.resume(); SC.audio.music(!SC.audio.musicOn()); syncAudioBtns(); SC.audio.sfx('click'); };
    syncAudioBtns();
    SC.go('select');
  });
})(window.SC);
