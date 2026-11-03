# Tokens da Vila do Caminho

A referência aprovada é o alvo visual. Este pacote registra valores extraídos do runtime e medições de referência informadas pelo autor. A arte procedural atual foi rejeitada e serve apenas como estado medido, não como modelo. Os testes verificam consistência com o código e os arquivos gerados; não comprovam aproximação visual do jogo ao conceito. Novos sprites e a integração visual continuam pendentes.

Nada aqui altera `public/`. Trocar uma cor de P ou redimensionar um sprite continua sendo decisão do integrador.

## Arquivos

- `vila.tokens.json`: a fonte, no formato Design Tokens (DTCG 2025.10). É o único arquivo editado à mão.
- `dist/`: gerado por `node tools/tokens/build.cjs`. Não editar.
  - `vila-tokens.css`: variáveis CSS, por exemplo `--vila-color-runtime-grass`.
  - `vila-tokens.js`: objeto congelado. No Node, `require('./tokens/dist/vila-tokens.js')`; no navegador, `<script>` expõe `window.VILA_TOKENS`. Cores em hex, dimensões em px, durações em ms.
  - `vila-runtime.gpl` e `vila-concept.gpl`: paletas para Aseprite ou GIMP (runtime; referência e temporada).
  - `vila-runtime-named.hex`: as cores nomeadas de P, no formato Lospec.
  - `preview.html`: todos os tokens numa página, pintada com as cores da própria página do jogo. Para conferir localmente, sirva a raiz do repositório e abra `/tokens/dist/preview.html`.

## Comandos

```sh
node tools/tokens/build.cjs          # valida, gera dist/ e o bloco de números deste README
node tools/tokens/build.cjs --check  # falha se dist/ ou este README estiverem desatualizados
node --test tests/core.test.cjs tests/tokens.test.cjs
```

Sem dependências: só Node.

## De onde vem cada valor

Todo token tem `$extensions["com.viladocaminho"]` com `source` e `from`. São categorias de origem declarada, não uma certificação independente:

- `runtime`: lido em `public/world.js` ou `public/style.css` (arquivo:linha). O teste confere que P, os literais de cor, `CELLS`, `T`, `WORLD`, câmera, tempos e o CSS ainda batem com o código.
- `measured`: medido na referência aprovada (caixa na imagem, faixa de luminância, número de pixels).
- `derived`: calculado a partir dos outros, com a fórmula registrada.
- `proposed`: cor medida nos conceitos de temporada sem cor parecida na referência aprovada (ΔE2000 ≥ 3). Pode entrar em arte nova depois de revisão. Abaixo de 3, o token já é um alias da cor da referência.

Os grupos:

- `color.reference`: o alvo. Rampas medidas na referência aprovada, do escuro (1) ao claro.
- `color.runtime`: o estado atual. A paleta P (nomeada) e `color.runtime.inline.<função>`, os literais que cada função de desenho usa, cada um com a distância até a referência.
- `color.season` e `color.skin`: materiais e tons de pele dos conceitos de temporada (casas de pedra, trigo, lã, vela, roupas por ofício), para arte nova.
- `color.ui` e `color.light`: página (com contraste calculado) e luz do mundo.
- `dimension`, `number`, `duration`, `fontFamily`: tile, atlas, sprites, câmera, movimento, tempos de animação e fontes.
- `dimension.referenceScale`: o tamanho que cada objeto teria no runtime se seguisse a proporção da referência em relação ao personagem.

## Regras para arte nova

- Procure a cor em `color.reference` antes de criar uma. Cor de temporada parecida com uma da referência já é alias dela; `proposed` precisa de revisão.
- `color.runtime` não é paleta de arte nova: é o que o protótipo reprovado desenha hoje.
- Escala: o runtime atual usa tile de 16 px e quadro de personagem 32 × 48. Personagem e objetos do runtime estão em escalas diferentes em relação à referência; as duas medidas e o inteiro que cabe entre elas estão no bloco abaixo. A escala final é decisão da direção visual.

## Medições declaradas na entrega

Os números abaixo reproduzem os dados registrados nos tokens. A extração dos pixels não foi reexecutada nesta integração. As imagens e os scripts de medição não acompanham o pacote; os hashes identificam as fontes declaradas, mas não permitem reproduzir as medições sem esses arquivos.

<!-- gerado por tools/tokens/build.cjs: início -->
### Cobertura da referência aprovada

Cada pixel da referência (1 a cada 3, nos dois eixos) levado à cor mais próxima da paleta.

| paleta | cores | ΔE médio | mediana | p90 | pixels com ΔE < 5 |
|---|---:|---:|---:|---:|---:|
| P do runtime | 53 | 1,92 | 1,39 | 4,3 | 92,5% |
| tudo que o runtime desenha | 91 | 1,8 | 1,37 | 3,73 | 94,9% |
| paleta medida da referência | 59 | 1,76 | 0,98 | 4,41 | 92,1% |

### Cores de P mais longe da referência (ΔE > 6)

| token | runtime | referência mais próxima | ΔE |
|---|---|---|---:|
| `color.runtime.stoneHi` | #d6ba9a | `color.reference.clothWhite.1` #cba672 | 7,55 |
| `color.runtime.grassDark` | #4e6326 | `color.reference.foliage.2` #646435 | 7,08 |

### Cores da referência sem par em P (ΔE > 8)

| token | medida | mais próxima em P | ΔE |
|---|---|---|---:|

### Proporção dos sprites em relação ao personagem

1,00 = mesma proporção da referência; 1,30 = 30% maior no runtime.

| sprite | largura | altura |
|---|---:|---:|
| shelter | 1,06 | 1,09 |
| olive | 1 | 1,14 |
| boat | 1,38 | 1,27 |
| jar | 1,05 | 1,16 |
| basket | 0,93 | 0,91 |
| firepit | 1,08 | 1,17 |
| net | 0,91 | 1,23 |
| rocks | 1,13 | 0,97 |

Mediana: 1,08.

### Escala e contagem

- Pelo personagem, 1 pixel de arte da referência = 2,099 px no runtime (personagem do runtime com 46 px de altura, mediana dos 24 quadros sem sombra; pescador da referência com 12,2 × 21,9 px de arte).
- Pelos objetos, 1 pixel de arte da referência = 2,268 px no runtime (mediana de largura e altura de 8 sprites).
- Pixel nítido pede uma escala inteira; nenhum inteiro cabe entre as duas medidas. A escolha é da direção visual.
- 347 tokens: 253 cores (53 nomeadas em P e 55 literais do runtime), 30 cores propostas e 25 cores de temporada que reaproveitam a referência (aliases).
- Variação de altura dos moradores no conceito de temporada: 25,6% (por isso os tamanhos vindos dele têm faixa).
<!-- gerado por tools/tokens/build.cjs: fim -->

## Limites

- As imagens de conceito (a referência aprovada e os conceitos de temporada A, B e C) não estão no repositório. O SHA-256 de cada uma está em `$extensions` na raiz do arquivo. A medição foi feita fora daqui, com Python (numpy, OpenCV, scikit-image, scikit-learn); nada disso é dependência do jogo.
- Os conceitos de temporada são pseudo pixel art gerada por IA: o pixel não tem tamanho constante e os moradores variam de altura. Tamanhos vindos deles trazem a faixa em `artPxRange`.
- Quando a detecção automática não isolou um objeto, a caixa foi lida à mão numa régua de 10 px; o método de cada objeto está em `$extensions`.
- ΔE é calculado por `tools/tokens/color.cjs`, implementação de CIEDE2000 (kL = kC = kH = 1). A suíte recalcula os valores com essa mesma função, verificando consistência interna. O autor relata no PR #2 um teste externo com os pares de Sharma, Wu e Dalal; as fixtures não estão versionadas nesta suíte, e esse teste externo não foi reproduzido nesta integração. Contraste pela fórmula do WCAG 2.
- O validador cobre o subconjunto do DTCG usado aqui (color, dimension, number, duration, fontFamily e aliases), não a especificação inteira.
