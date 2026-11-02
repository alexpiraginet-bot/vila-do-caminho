# Vila do Caminho
Protótipo de mundo persistente em pixel art 2D, visto de cima. Ficção inspirada nos ensinamentos de Cristo e situada numa Galileia imaginada do século I.

## Executar localmente
Requisitos: Python 3 para servir arquivos; Node.js para os testes. Sem dependências npm e sem credenciais.

```sh
python3 -m http.server 8000 --directory public
# Abra http://localhost:8000
node --test tests/*.test.cjs
node --check public/world.js
```

Toque no chão, use WASD/setas ou controles para mover o pescador. Alterne para explorar a câmera, use Visão geral e Voltar ao pescador. A posição fica no armazenamento local do navegador; Reiniciar partida local remove essa posição.

## Estado real desta versão
- Território renderizado determinístico de 96 × 96 tiles; composição central original de 24 × 42.
- Um morador visível inicialmente. Seguidores não viram personagens automaticamente.
- Sem multiplayer, autenticação, servidor de presença, analytics ou contador de visitantes.
- Atlas procedural em `public/world.js`, com uma camada local opcional de seis objetos em `public/assets/shore-kit.png`. Não há voz, imagem de referência privada ou áudio nesta entrega. A nova arte está em revisão visual; não representa aprovação do cenário inteiro.
- Cópia sanitizada do runtime Site v3: câmera, DPR, resize e controle local preservados. Identificadores e rótulos pessoais foram substituídos por personagens genéricos.
- O JS contém funções legadas de direção de episódio, não chamadas pela interface jogável. Não são o roteiro aprovado do capítulo 1. Não publicar nem usar esse roteiro como cronologia oficial.

## Colaboração
Leia `ARCHITECTURE.md`, `CONTRIBUTING.md` e `INSTRUCTIONS-CLAUDE.md`. Código público pode ser consultado sem token; enviar alterações exige conta/permissão adequada ou fork/PR. Nunca envie tokens em chats ou commits.

Publicação no GitHub não publica o jogo nem altera o Site: integração e deploy são separados e revisados. A disponibilidade pública do código não concede uma licença geral de reutilização. A licença do projeto ainda não foi escolhida pelo proprietário; não adicionar licença automaticamente.

## Recorte visual do acampamento

Abrigo, oliveira, barco, rede, jarro e cesta são objetos separados, carregados do próprio aplicativo. As posições e colisões permanecem no motor. O adapter preserva proporções e usa pixels sem suavização; se o kit não carregar, o atlas procedural continua disponível. Veja a passagem e as limitações em `coordination/reviews/camp-visual-pass.md`.
