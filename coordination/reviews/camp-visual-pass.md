# Acampamento — primeira rodada de objetos

A arte procedural anterior ficou distante da referência aprovada. Esta rodada substitui seis objetos no jogo real: abrigo de junco/palha, oliveira, barco, rede, jarro e cesta. Não redesenha o mapa nem representa a finalização de todo o cenário.

Base: `main@91d4c1dc2d8858fe997d15ada8afa138d284949d`.
Responsável: Codex, frente visual e integração. Branch: `codex/camp-visual-pass`.
Estado: implementação e QA concluídos; avaliação visual do usuário pendente. Sem merge, deploy ou Motion nesta rodada.

![Capturas reais antes e depois](../previews/camp-comparison.png)

## Implementação

- Folha RGBA local de seis objetos, preservada sem edição dos bytes. Origem e hash em `public/assets/shore-kit.json` e `THIRD_PARTY_NOTICES.md`.
- Recortes separados pelo adapter, proporção preservada, alinhamento pela base e dimensões de mundo inteiras. Rasterização intermediária evita detalhe subpixel diferente entre desktop e celular; cache limitado a 32 variantes.
- Jarro, cesta, barco e rede receberam ajustes apenas de tamanho visual. Sombras discretas de contato ancoram os objetos. Coordenadas e colisões continuam iguais.
- O cache das árvores distantes é renovado uma vez quando o kit termina de carregar.
- Recursos vêm apenas da própria aplicação, sem API, credenciais ou dependência nova. Se a leitura/decodificação falhar, permanece o atlas procedural.

## Verificação

- `node --test tests/*.test.cjs`: 26 testes passaram.
- `node --check public/world.js` e `node --check public/visual-assets.js`: sintaxe válida.
- `node tools/tokens/build.cjs --check`: arquivos gerados dos tokens em dia.
- Comparação antes/depois com tempo de animação fixo em 1,0 s, posição inicial e câmera `(11,16,1.05)`, viewports 1280×1000 e 390×844, DPR 1. O enquadramento difere entre dispositivos pela proporção do canvas, mas é idêntico dentro de cada par.
- Navegador Chromium: carregamento, movimento, restauração local, modo de exploração, retorno ao pescador, controles e fallback por falha simulada de asset. Registro em `camp-browser-qa.json`.
- Revisão independente comparou o JS com a base: estado, morador, mapa, colisões, allowlist, câmera, desenho do personagem e controles idênticos. Diferenças restritas ao desenho de objetos e ao cache visual; inclusão do adapter no HTML.

## Limites e próxima passagem

Terreno, água, rochas, fogo e personagem ainda têm a arte anterior. A oliveira nova tem detalhes mais finos que a copa da referência; a coerência da vegetação e da escala ainda exige avaliação. Não alegamos quantização exata às cores dos tokens nem aprovação de fidelidade final. Os tokens medidos da referência continuam sendo direção, não prova de equivalência de pixels.

Próximo responsável: direção visual, após comentário do usuário sobre esta comparação. Próxima ação concreta: alinhar terreno/vegetação e personagem ao acabamento do acampamento, preservando a geometria e a cronologia. Não produzir o episódio 1 aqui: Claude conduz esse artefato em tarefa independente. Não implantar esta branch automaticamente.
