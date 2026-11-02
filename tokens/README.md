# Tokens da Vila do Caminho

Este pacote registra valores extraídos do runtime e medições de referência informadas pelo autor. Os testes verificam consistência com o código e os arquivos gerados; não comprovam aproximação visual do jogo ao conceito. Novos sprites e a integração visual continuam pendentes.

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
- `proposed`: cor medida nos conceitos de temporada sem cor parecida no runtime (ΔE2000 ≥ 3). Pode entrar em arte nova depois de revisão. Abaixo de 3, o token já é um alias da cor do runtime.

Os grupos:

- `color.runtime`: a paleta P (nomeada) e `color.runtime.inline.<função>`, os literais que cada função de desenho usa. É a paleta a preservar.
- `color.reference`: rampas medidas na referência aprovada, do escuro (1) ao claro. Servem de comparação; não substituem P.
- `color.season` e `color.skin`: materiais e tons de pele dos conceitos de temporada (casas de pedra, trigo, lã, vela, roupas por ofício), para arte nova.
- `color.ui` e `color.light`: página (com contraste calculado) e luz do mundo.
- `dimension`, `number`, `duration`, `fontFamily`: tile, atlas, sprites, câmera, movimento, tempos de animação e fontes.
- `dimension.referenceScale`: o tamanho que cada objeto teria no runtime se seguisse a proporção da referência em relação ao personagem.

## Regras para arte nova

- Procure a cor em `color.runtime` antes de criar uma. Cor de temporada parecida com uma do runtime já é alias dela.
- Escala do runtime: tile de 16 px, quadro de personagem 32 × 48, retângulos do atlas em `dimension.sprite`.
- Sprites novos seguem a escala do runtime, não a da referência, enquanto o integrador não decidir alinhar os dois (veja a proporção abaixo).

## Medições declaradas na entrega

Os números abaixo reproduzem os dados registrados nos tokens. A extração dos pixels não foi reexecutada nesta integração. As imagens e os scripts de medição não acompanham o pacote; os hashes identificam as fontes declaradas, mas não permitem reproduzir as medições sem esses arquivos.

<!-- gerado por tools/tokens/build.cjs: início -->
### Cobertura da referência aprovada

Cada pixel da referência (1 a cada 3, nos dois eixos) levado à cor mais próxima da paleta.

| paleta | cores | ΔE médio | mediana | p90 | pixels com ΔE < 5 |
|---|---:|---:|---:|---:|---:|
| P do runtime | 34 | 4,48 | 4,19 | 6,5 | 79,2% |
| tudo que o runtime desenha | 98 | 3,97 | 3,85 | 4,91 | 90,9% |
| paleta medida da referência | 59 | 1,76 | 0,98 | 4,41 | 92,1% |

### Cores de P mais longe da referência (ΔE > 6)

| token | runtime | referência mais próxima | ΔE |
|---|---|---|---:|
| `color.runtime.stone` | #8e8b6b | `color.reference.groundShadow.1` #81772d | 12,65 |
| `color.runtime.stoneHi` | #b0aa83 | `color.reference.clothWhite.1` #cba672 | 10,72 |
| `color.runtime.leafLo` | #4c6b2a | `color.reference.foliage.2` #646435 | 9,09 |
| `color.runtime.leafDeep` | #344c27 | `color.reference.foliage.1` #3b4230 | 8,74 |
| `color.runtime.soil` | #947335 | `color.reference.groundShadow.1` #81772d | 8,6 |
| `color.runtime.strawLo` | #9c7b31 | `color.reference.groundShadow.1` #81772d | 8,49 |
| `color.runtime.woodLo` | #634621 | `color.reference.wood.2` #7e4d2c | 8,25 |
| `color.runtime.foam` | #85b8aa | `color.reference.shoreEdge.1` #53b6b3 | 7,95 |
| `color.runtime.ink` | #4a3825 | `color.reference.outline.2` #432c22 | 6,93 |
| `color.runtime.stoneLo` | #65684e | `color.reference.foliage.2` #646435 | 6,63 |

### Cores da referência sem par em P (ΔE > 8)

| token | medida | mais próxima em P | ΔE |
|---|---|---|---:|
| `color.reference.fire.1` | #e84115 | `color.runtime.terra` #a36035 | 15,08 |
| `color.reference.stone.4` | #93796d | `color.runtime.skinLo` #8f603b | 12,79 |
| `color.reference.clothRed.1` | #8d3d27 | `color.runtime.wood` #8a592d | 12,65 |
| `color.reference.stone.2` | #64514d | `color.runtime.ink` #4a3825 | 12,03 |
| `color.reference.stone.3` | #80685f | `color.runtime.skinLo` #8f603b | 11,27 |
| `color.reference.outline.1` | #2f1f1b | `color.runtime.ink` #4a3825 | 11,06 |
| `color.reference.clothRed.2` | #cf562d | `color.runtime.terra` #a36035 | 10,5 |
| `color.reference.stone.1` | #4f4140 | `color.runtime.ink` #4a3825 | 10,02 |
| `color.reference.terracotta.1` | #7f4024 | `color.runtime.wood` #8a592d | 9,96 |
| `color.reference.water.4` | #4aacbd | `color.runtime.waterHi` #3595b8 | 9,55 |
| `color.reference.wicker.1` | #5a321c | `color.runtime.ink` #4a3825 | 8,87 |
| `color.reference.hair.1` | #3d2a25 | `color.runtime.ink` #4a3825 | 8,78 |
| `color.reference.foliage.1` | #3b4230 | `color.runtime.leafDeep` #344c27 | 8,74 |
| `color.reference.bark.1` | #432c26 | `color.runtime.ink` #4a3825 | 8,72 |
| `color.reference.bark.2` | #774b34 | `color.runtime.wood` #8a592d | 8,27 |
| `color.reference.hair.2` | #583a2f | `color.runtime.ink` #4a3825 | 8,02 |

### Proporção dos sprites em relação ao personagem

1,00 = mesma proporção da referência; 1,30 = 30% maior no runtime.

| sprite | largura | altura |
|---|---:|---:|
| shelter | 1,25 | 1,28 |
| olive | 1,18 | 1,34 |
| boat | 1,63 | 1,5 |
| jar | 1,24 | 1,37 |
| basket | 1,09 | 1,08 |
| firepit | 1,3 | 1,48 |
| net | 1,08 | 1,45 |
| rocks | 1,37 | 1,1 |

Mediana: 1,29.

### Escala e contagem

- 1 pixel de arte da referência = 1,779 px no runtime: personagem do runtime com 39 px de altura (mediana dos 24 quadros, sem sombra) e pescador da referência com 12,2 × 21,9 px de arte.
- 346 tokens: 253 cores (34 nomeadas em P e 74 literais do runtime), 48 cores propostas e 7 aliases.
- Variação de altura dos moradores no conceito de temporada: 25,6% (por isso os tamanhos vindos dele têm faixa).
<!-- gerado por tools/tokens/build.cjs: fim -->

## Limites

- As imagens de conceito (a referência aprovada e os conceitos de temporada A, B e C) não estão no repositório. O SHA-256 de cada uma está em `$extensions` na raiz do arquivo. A medição foi feita fora daqui, com Python (numpy, OpenCV, scikit-image, scikit-learn); nada disso é dependência do jogo.
- Os conceitos de temporada são pseudo pixel art gerada por IA: o pixel não tem tamanho constante e os moradores variam de altura. Tamanhos vindos deles trazem a faixa em `artPxRange`.
- Quando a detecção automática não isolou um objeto, a caixa foi lida à mão numa régua de 10 px; o método de cada objeto está em `$extensions`.
- ΔE é calculado por `tools/tokens/color.cjs`, implementação de CIEDE2000 (kL = kC = kH = 1). A suíte recalcula os valores com essa mesma função, verificando consistência interna. Não há fixtures independentes dos pares de Sharma, Wu e Dalal nesta suíte; essa validação permanece pendente. Contraste pela fórmula do WCAG 2.
- O validador cobre o subconjunto do DTCG usado aqui (color, dimension, number, duration, fontFamily e aliases), não a especificação inteira.
