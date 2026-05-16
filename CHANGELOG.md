# Changelog

Todas as mudanças notáveis deste projeto são documentadas aqui.

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/)
e este projeto segue [Semantic Versioning](https://semver.org/lang/pt-BR/).

## [1.3.0](https://github.com/pabloedusilva/Indios/compare/v1.2.4...v1.3.0) (2026-05-16)

### Novas Funcionalidades

* implementar sistema completo de release automático com modal de update notes ([b62e680](https://github.com/pabloedusilva/Indios/commit/b62e680))

### Melhorias

* adicionar modal de update notes com carrossel e navegação por páginas
* implementar API REST para gerenciamento de notas de release
* criar migrations para tabela update_notes (005 e 006)
* adicionar hook useUpdateNotes com controle via localStorage
* implementar sincronização automática de release com banco de dados
* criar script sync-release-to-db.js para parsear release notes do GitHub
* integrar sincronização no workflow de release do GitHub Actions
* adicionar documentação completa do sistema (6 arquivos .md)

### Correções

* corrigir scripts do backend para carregar .env corretamente
* remover tabela update_notes_views (substituída por localStorage)
* limpar package.json removendo referências a scripts inexistentes
* remover emojis dos scripts para logs profissionais

### BREAKING CHANGES

* Tabela update_notes_views foi removida. O controle de visualização agora é feito via localStorage no frontend.

---

## [1.2.4](https://github.com/pabloedusilva/Indios/compare/v1.2.3...v1.2.4) (2026-05-15)

### Correções

* ajustar configuração do semantic-release
* sincronizar versões entre workspaces do monorepo

---

## [1.2.3](https://github.com/pabloedusilva/Indios/compare/v1.2.2...v1.2.3) (2026-05-14)

### Correções

* corrigir timezone do banco de dados para UTC
* ajustar formatação de datas no frontend

---

## [1.2.2](https://github.com/pabloedusilva/Indios/compare/v1.2.1...v1.2.2) (2026-05-13)

### Correções

* resolver problema de expiração de pagamentos PIX
* adicionar limpeza automática de pagamentos expirados

---

## [1.2.1](https://github.com/pabloedusilva/Indios/compare/v1.2.0...v1.2.1) (2026-05-12)

### Correções

* corrigir validação de formulários
* ajustar responsividade em dispositivos móveis

---

## [1.2.0](https://github.com/pabloedusilva/Indios/compare/v1.1.0...v1.2.0) (2026-05-11)

### Novas Funcionalidades

* adicionar sistema de pagamento PIX com QR Code
* implementar geração automática de relatórios mensais em PDF
* adicionar soft delete para produtos
* criar sistema de agendamento de tarefas com node-cron

### Melhorias

* otimizar performance de consultas ao banco de dados
* melhorar interface do dashboard com gráficos em tempo real
* adicionar validação de dados com express-validator
* implementar rate limiting para proteção da API

### Correções

* corrigir cálculo de totais em pedidos
* resolver problema de autenticação em múltiplas abas
* ajustar comportamento de modais em mobile

---

## [1.1.0](https://github.com/pabloedusilva/Indios/compare/v1.0.0...v1.1.0) (2026-05-10)

### Novas Funcionalidades

* adicionar sistema de categorias para produtos
* implementar filtros avançados no cardápio
* criar página de estatísticas e relatórios
* adicionar suporte a temas (claro/escuro)

### Melhorias

* melhorar experiência do usuário no fluxo de pedidos
* otimizar carregamento de imagens
* adicionar feedback visual em ações do usuário

### Correções

* corrigir erro de validação em campos de formulário
* resolver problema de scroll em listas longas
* ajustar layout em telas pequenas

---

## [1.0.0](https://github.com/pabloedusilva/Indios/releases/tag/v1.0.0) (2026-05-09)

### Novas Funcionalidades

* implementar sistema completo de gestão de pedidos
* criar dashboard administrativo
* adicionar autenticação JWT com cookies httpOnly
* implementar CRUD completo de produtos
* criar sistema de gerenciamento de categorias
* adicionar integração com Mercado Pago
* implementar sistema de notificações
* criar API REST completa com Express
* adicionar frontend React com Vite
* implementar roteamento com React Router
* adicionar estilização com Tailwind CSS
* criar sistema de ícones com React Icons
* implementar toasts com react-hot-toast
* adicionar formatação de datas com date-fns

### Infraestrutura

* configurar monorepo com workspaces
* adicionar Husky para git hooks
* implementar Commitlint para validação de commits
* configurar ESLint e Prettier
* adicionar testes com Vitest
* configurar CI/CD com GitHub Actions
* implementar deploy automático no Render
* adicionar migrations para banco de dados MySQL

### Documentação

* criar README.md completo
* adicionar documentação da API
* criar guias de desenvolvimento
* adicionar exemplos de uso

---

## Tipos de Mudanças

- **Novas Funcionalidades** - Novos recursos adicionados
- **Melhorias** - Melhorias em recursos existentes
- **Correções** - Correções de bugs
- **Refatorações** - Mudanças de código sem alterar funcionalidade
- **Documentação** - Mudanças na documentação
- **Testes** - Adição ou correção de testes
- **Infraestrutura** - Mudanças em build, CI/CD, dependências
- **BREAKING CHANGES** - Mudanças incompatíveis com versões anteriores

---

## Versionamento Semântico

Este projeto segue o [Semantic Versioning](https://semver.org/lang/pt-BR/):

- **MAJOR** (X.0.0) - Mudanças incompatíveis na API
- **MINOR** (0.X.0) - Novas funcionalidades mantendo compatibilidade
- **PATCH** (0.0.X) - Correções de bugs mantendo compatibilidade

---

## Como Contribuir

Para adicionar uma entrada ao changelog:

1. Faça commits seguindo [Conventional Commits](https://www.conventionalcommits.org/)
2. O changelog será atualizado automaticamente pelo semantic-release
3. Formato dos commits:
   - `feat:` - Nova funcionalidade (MINOR)
   - `fix:` - Correção de bug (PATCH)
   - `feat!:` ou `BREAKING CHANGE:` - Mudança incompatível (MAJOR)
   - `docs:` - Documentação
   - `style:` - Formatação
   - `refactor:` - Refatoração
   - `test:` - Testes
   - `chore:` - Manutenção

---

## Links Úteis

- [Repositório](https://github.com/pabloedusilva/Indios)
- [Issues](https://github.com/pabloedusilva/Indios/issues)
- [Pull Requests](https://github.com/pabloedusilva/Indios/pulls)
- [Releases](https://github.com/pabloedusilva/Indios/releases)
- [Documentação](https://github.com/pabloedusilva/Indios#readme)

---

**Nota**: Este changelog é gerado e mantido automaticamente pelo [semantic-release](https://github.com/semantic-release/semantic-release).
