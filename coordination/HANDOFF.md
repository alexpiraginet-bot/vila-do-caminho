# Passagem de trabalho

Copiar este modelo para o corpo do PR ou um registro específico da tarefa. Não preencher como concluído sem evidência.

- Tarefa e objetivo:
- Responsável / frente:
- Branch e PR:
- SHA-base:
- SHA recebido ou revisado:
- Arquivos sob responsabilidade:
- Entradas utilizadas (tokens, contratos, assets, instrução):
- O que mudou:
- O que foi verificado (comandos, resultados, capturas):
- O que ainda não foi verificado:
- Decisões e diferenças em relação à base:
- Bloqueios:
- Próximo responsável:
- Próxima ação concreta:
- Critério para considerar essa próxima ação concluída:

## Primeira passagem registrada — histórico superado

Base inspecionada: `main@9c755eaa5506182fb0ac73fa92e72ee6ebe25211`.
Verificação em 02/11/2026: os 7 testes de `tests/core.test.cjs`, a checagem de sintaxe de `public/world.js` e os hashes de `SHA256SUMS` passaram. Nenhuma mudança de runtime foi feita nesta rodada.

Naquele checkpoint a entrega de tokens ainda estava pendente. Situação atual: tokens integrados em main@91d4c1dc; a arte procedural anterior continua rejeitada, e o primeiro recorte de assets está em revisão visual.

A sequência histórica acima foi concluída pela revisão e integração dos tokens. A próxima ação vigente está na passagem atual ao final deste documento.


## Entrega de tokens recebida e revisada

Contribuição inicial `7992e7cf566c4c2e0565d557bd28a1d7e9216d25`, atualizada para `c6e5de6016610ca317e1bbd2e8e361112ee88ebc` antes de integrar: 11 blobs conferidos e 347 tokens. A referência aprovada é o alvo; o runtime rejeitado é apenas estado medido. Revisão e correções em [reviews/design-tokens-7992e7c.md](reviews/design-tokens-7992e7c.md). Geração e 18 testes passaram; prévia de tokens inspecionada em desktop/mobile. O runtime e a direção visual do jogo não foram alterados.

Próximos responsáveis: direção visual e integração. Próxima ação: preparar uma melhoria pequena de asset, aplicar em cena real com câmera fixa e registrar comparação antes/depois; conferir continuidade de mapa e estado antes de outro Motion.

## Passagem atual — recorte visual do acampamento

Base: `main@91d4c1dc2d8858fe997d15ada8afa138d284949d`. Responsável: Codex, turno ativo da frente visual; branch de revisão `codex/camp-visual-pass`. Arquivos e ownership estão em `queue.json`. Seis objetos foram integrados localmente, com fallback e testes; comparação real desktop/mobile e ressalvas em [reviews/camp-visual-pass.md](reviews/camp-visual-pass.md). Não duplicar implementação nesses arquivos enquanto esta passagem estiver ativa. Próximo passo: apresentar a comparação e registrar a avaliação visual. Nenhum merge ou deploy automático. A produção do episódio 1 é independente e está com Claude.
