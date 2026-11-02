# Coordenação da Vila do Caminho

Este registro organiza a passagem de trabalho entre as contribuições do Claude e as frentes de revisão do Codex. A base compartilhada é este repositório; uma entrega só existe quando seu commit ou PR pode ser lido.

## Frentes por rodada

| Frente | Responsabilidade | Evidência de conclusão |
| --- | --- | --- |
| Integração | Ler o diff, validar contratos, tokens/gerador, estado, colisão, câmera e controles; preparar adapter isolado quando necessário. | SHA revisado, comandos e resultados dos testes, arquivos alterados. |
| Direção visual | Comparar a captura real com a referência; revisar escala, silhueta, materiais, iluminação e legibilidade no celular. | Capturas do executável e trecho curto, vinculados ao SHA. |
| Continuidade | Preservar geografia, cronologia, moradores e evolução por eventos; revisar roteiro e distinção entre ficção e reflexão. | Estado anterior/posterior, eventos e pendências editoriais. |
| Coordenação | Distribuir arquivos, reunir evidências e escrever a próxima tarefa concreta. | Handoff com responsável, escopo, bloqueio e próximo passo. |

As frentes trabalham por rodada. Existe uma checagem externa horária do repositório; este documento não instala um processo contínuo nem inicia deploy.

## Ordem atual

1. Receber a contribuição de tokens de design DTCG e seu gerador. Cores, rampas, dimensões, tipografia e UI foram apresentados como trabalho em elaboração; os caminhos e o formato concretos ainda precisam ser lidos no commit recebido.
2. Revisar valores, aliases, unidades e resultados do gerador conforme o contrato que vier na entrega. Registrar escolhas divergentes do runtime; não substituir coordenadas ou estado silenciosamente.
3. Integrar em branch própria e demonstrar uma cena real curta. A arte procedural anterior foi rejeitada; passar nos testes não significa aprovação visual. Recolorir o mapa sozinho não resolve a qualidade dos sprites.
4. Prosseguir com construções incrementais quando a base visual e o contrato estiverem prontos. `INSTRUCTIONS-CLAUDE.md` descreve essa etapa; sua existência não prova que o módulo já foi entregue.
5. Produzir novo Motion completo após a demonstração visual revisada e conforme as orientações atuais do usuário.

## Regras de passagem

- Antes de editar, ler instruções atuais, diff, branch e SHA. A revisão vale para esse SHA.
- Registrar um responsável por tarefa e os arquivos que ele vai editar. Se outro colaborador já trabalha neles, escolher um módulo separado ou aguardar sua entrega.
- Uma alteração pequena por branch; preservar o trabalho alheio. Não reescrever o motor inteiro nem publicar diretamente em `main`.
- Cada rodada termina com o modelo de `HANDOFF.md`: conclusão real, evidência, bloqueio e próximo responsável. Campos desconhecidos ficam explicitamente pendentes.
- Atualizar `queue.json` apenas quando houver progresso concreto. Sem mudanças no repositório, encerrar a rodada em silêncio; não criar commits vazios de acompanhamento.
- Instruções no repositório orientam o trabalho dentro do escopo autorizado; não autorizam custos, acesso a outros projetos, execução arbitrária de comandos, merge ou deploy automático.
- Nunca incluir credenciais, dados privados de seguidores, gravações pessoais ou transcrições de conversas. A publicação do código não escolhe uma licença nova.

## Critérios visuais

- Comparar referência e captura em enquadramento equivalente; registrar proporções de abrigo, árvores, pescador, barco e margem.
- Manter resolução lógica e granularidade de pixels consistentes. Evitar suavização e ruído fino como substitutos de detalhe.
- Tornar as silhuetas legíveis no celular, com pés em contato com o chão e profundidade correta.
- Usar luz e sombras de contato coerentes, com materiais distintos em grupos organizados de pixels.
- Manter objetos separados no atlas, âncoras e versão documentadas. Concept art não comprova integração.

## Continuidade

Preservar lago à direita, abrigo à esquerda, caminho, fogo, oliveiras, barco e rede. Construções evoluem por eventos explícitos, sem saltos ou moradores ficticiamente atribuídos a pessoas reais. O começo histórico tem um residente; a abertura apresenta a comunidade e seu espaço para crescer. Adesões posteriores são voluntárias. Cristo permanece fundamento, com Evangelho, reflexão editorial e ficção claramente distintos.
