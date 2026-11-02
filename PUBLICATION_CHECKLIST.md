# Revisão antes do push

- [x] Cópia isolada; nenhum arquivo de produção alterado.
- [x] Somente três arquivos runtime e documentação/testes/contratos públicos novos.
- [x] Sem `.openai`, `.env`, `.git`, node_modules, screenshots, narração/voz, dados de clientes ou credenciais.
- [x] Fixture genérico e oficial do projeto apenas; referências pessoais removidas.
- [x] `node --check public/world.js` e 7 testes passam; 12 combinações viewport/zoom verificam conversão de coordenadas.
- [x] Manifest de assets corresponde às coordenadas reais do atlas.
- [x] Scan heurístico sem achados de credenciais/PII no pacote. Não equivale a auditoria exaustiva.
- [x] CSS preservado byte a byte; mudanças de runtime limitadas à sanitização nominal e ids associados.
- [ ] Confirmar com integrador URL/owner exatos antes de push: `alexpiraginet-bot/vila-do-caminho`.
- [ ] Após push, verificar visibilidade e árvore remota; não acionar deploy.

Teste visual deste pacote sanitizado ainda não executado em navegador ou iPhone físico. Os testes Node não comprovam renderização visual nem usabilidade em hardware real. Roteiro legado no JS não é o capítulo 1 aprovado. Licença geral pendente; nenhum auto-merge/auto-deploy configurado.
