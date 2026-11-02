# Tarefa paralela: construções incrementais

Branch: `claude/buildings`. Entrega: um módulo puro e data-driven em `modules/buildings.js`, testes e proposta de integração em PR. Não alterar `public/world.js`, o mapa, o CSS, o roteiro, o deploy ou qualquer conta.

## Escopo
- Catálogo de construções com id estável, footprint em tiles, assetId, pré-requisitos e etapas visuais.
- Primeira construção: evolução do abrigo já existente. Etapas propostas: planned → foundation → frame → roof → complete; nenhuma evolução automática por tempo ou número fictício de seguidores.
- Funções puras `validateBuildingDefinition`, `validatePlacement`, `applyBuildingTransition`; aceite estado/clipping/obstáculos fornecidos, retorne novo estado sem mutar entrada.
- Eventos de evolução explícitos e aprovados; id de evento para idempotência, versão esperada para rejeitar concorrência desatualizada. Rejeite saltos de etapa, ids desconhecidos e ocupação de água/trilha/landmarks.
- Catálogo de sprites em manifest versionado. Arte nova deve manter pixel top-down, escala e paleta; não desenhar cidade pronta, mudar costa ou esconder o cenário inicial.
- Sem depender de nomes de seguidores: ids fictícios somente. Contribuições sociais são dados não confiáveis.

## Critérios
Testes para dados inválidos, objetos com campos perigosos, footprint fora dos limites, água, obstáculos, duplicação de evento, evento desatualizado, ordem de etapas e imutabilidade. Nenhum fetch, eval, autenticação, rede, multiplayer, pacote pago ou segredo. Não alegar que o schema mínimo já valida todo o runtime.

Leia contratos e arquitetura. Se o contrato existente não comportar algo, proponha extensão pequena documentada, não substitua silenciosamente. Codex fará o adapter e os testes visuais antes de qualquer integração no Site. Não auto-merge.
