# Neon Breach

Jogo solo top-down de **invasão** e **resgate** com clima cyberpunk. Roda direto no navegador (HTML/CSS/JS puro, sem build), pronto para o GitHub Pages. Derivado do modo tático do protótipo *Survival Code*.

## Como jogar
- **WASD / setas**: mover · **Shift**: agachar (rastreamento sobe pela metade) · **E**: hackear · **Esc**: pausa.
- Perto de um terminal ou porta trancada, aperte **E** e acerte a **sequência de setas** antes do tempo acabar. Errar reinicia a sequência.
- Cones amarelos são a visão de guardas e câmeras; ficar neles enche a barra de **Rastreamento**. Guarda que encosta em você captura.
- **Invasão**: hackear terminais (um só ou vários) e chegar à extração. **Resgate**: achar a pessoa, abrir a cela, escoltá-la até a saída.
- Celular: botões na tela (setas, HACK, AGACHAR).

## Hack por sequência (estilo Dispatcher)
O tamanho (3 a 12 teclas) e o tempo dependem do alvo, nunca são sorteados por alvo:

| Alvo | Teclas |
|---|---|
| Fechadura magnética (porta) | 3–4 |
| Terminal de rua | 4–5 |
| Porta cifrada | 5–6 |
| Servidor corporativo | 7–9 |
| Cofre quântico (porta) | 9–11 |
| Núcleo mainframe | 11–12 |

A dificuldade do mapa soma teclas (`lenAdd`) e muda o tempo. No **404**, todo hack tem 12 teclas.

## Dificuldades

| Nível | Rastreamento | Guardas | Hack | Erro de tecla |
|---|---|---|---|---|
| Básico | ×0,7 | normais | mais tempo, −1 tecla | sem custo |
| Normal | ×1,0 | normais | padrão | sem custo |
| Difícil | ×1,15 | cone mais longo | tempo ×0,95 | sem custo |
| Hacker | ×1,3 | mais rápidos | +1 tecla | sem custo |
| God | ×1,5 | rápidos, cones longos | +2 teclas | −0,5 s |
| 404 | ×1,8 | muito rápidos, cones enormes | **tudo 12 teclas** | −1 s |

## Missões (17)
Invasão: Ponto Cego, Laboratório Kestrel, Meridian Andar 14, Bunker Zero-9, O Último Dígito, Torre Vertigem (4 terminais), Nuvem Negra, Altos-Fornos, Núcleo 404.
Resgate: Cabana do Sinal, Estação Ariadne, Casarão Vidro Quebrado, Último Vagão, Ala Norte, Toca do Lobo, Raiz Funda, Abismo 404.
Cada missão tem codinome, mini-história no dossiê e epílogo no resultado. Tamanhos vão de 30×20 até 112×70 (com minimapa).

## Garantia de "dá para hackear sem ser visto"
Os mapas gerados passam por uma análise que simula varredura de câmeras e rondas dos guardas por 150 s e exige, para cada objetivo, uma janela sem visão maior que o tempo do hack + 1,5 s. Depois, uma segunda simulação independente (quadro a quadro) confere o resultado.

```
node tools/build-maps.js            # regenera js/mapdata.js (mapas procedurais + validação)
node tools/build-maps.js --check    # só valida
node tools/build-maps.js --only=nucleo
node tools/verify-sim.js            # verificação independente; sai com erro se algum alvo estiver sempre visível
```
Para criar ou ajustar um mapa gerado, edite os parâmetros em `js/catalog.js` (seed, tamanho, terminais, portas, guardas, câmeras) e rode `build-maps.js`. **Não edite `js/mapdata.js` à mão.** Mapas feitos à mão (Laboratório, Estação Ariadne, Bunker) ficam em `catalog.js`.

## Estrutura
```
index.html
css/style.css
js/core.js     utilitários, rotas de tela, RNG com seed
js/audio.js    áudio procedural (Web Audio)
js/catalog.js  catálogo das missões (dados, histórias, parâmetros)
js/mapdata.js  GERADO por tools/build-maps.js
js/maps.js     dificuldades, hackSpec, parser de mapa
js/hack.js     minigame de setas
js/game.js     simulação e renderização
js/ui.js       título (modo atração), seleção, resultado
tools/         gerador + validadores
```

## Publicar
Suba a pasta para um repositório e ative **Settings → Pages** apontando para a raiz. Não há dependências além das fontes do Google (com fallback).
