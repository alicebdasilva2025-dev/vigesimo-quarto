# LiDire — primeiro

Versão baseada no F2.1-main, com o bloco **Anotações** tornado funcional.

## O que foi implementado
- Criar anotação
- Editar anotação
- Excluir anotação
- Favoritar/desfavoritar
- Categoria
- Tags
- Busca por texto
- Filtro por categoria
- Filtro de favoritos
- Persistência por usuário no Cloudflare D1
- API `/api/notes` com GET/POST/PUT/DELETE
- Tabela `notes` e índices

A API também cria a tabela automaticamente na primeira utilização, para evitar depender de uma execução manual de SQL durante o primeiro deploy.
