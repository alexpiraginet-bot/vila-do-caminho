# Arquitetura e invariantes

`public/index.html`: página acessível e controles. `style.css`: layout responsivo. `world.js`: IIFE independente, estado, validação de ações, movimento, atlas procedural, terreno, renderer e UI.

O render usa Canvas 2D, tiles de 16 pixels e atlas procedural de 512 × 512. O terreno ampliado cobre x=[-36,60), y=[-24,72); limites de movimento são mais conservadores, e costa/obstáculos bloqueiam movimento. O conjunto central `WORLD` (24 × 42) é uma composição, não o tamanho do território completo. Não modificar essas coordenadas para simplesmente aumentar o mapa.

Estado inicial: `schemaVersion:1`, `mapVersion:'topdown-v2'`, um residente, visitante oculto, abrigo rudimentar, fogueira, jarro, cesta, barco e rede. A UI posiciona o jogador em (13,18), controla `mode` local e guarda somente x/y na chave `vila:player-local:v3`. Nenhum nome real ou lista de seguidores deve ser adicionado.

Os contratos JSON são documentação de intercâmbio e extensão proposta, não uma API em produção nem um parser já integrado. `world-state.schema.json` descreve o envelope mínimo; `asset-manifest.json` identifica os ativos existentes por função. Novos campos exigem validação e revisão de compatibilidade.

## Pontos de integração
O módulo de construções deve produzir dados validados, não executar texto de prompts. A integração futura conecta estado/colisão/renderização explicitamente; não modificar o motor em paralelo. Eventos aceitos são allowlisted, sem eval, Function, HTML arbitrário ou código de comentários sociais.

## Preservar
Costa, trilha, paleta, landmarks, persistência, ordem de profundidade, colisão varrida, controles mobile, resize/DPR e clamp de câmera. Primeiro capítulo apresenta o conceito da comunidade com um morador, não a história pessoal de um seguidor. Novas chegadas dependem de contribuição voluntária e aprovação editorial; manter marcos da história explícitos.

## Limites
O estado local não é a vila online compartilhada. Não existe autenticação por arroba, verificação de seguidor, armazenamento de público, telemetria ou presença simultânea. Esses sistemas precisam de projeto, revisão de privacidade e autorização próprios.
