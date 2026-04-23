Indios Churrasco Gourmet <img src="https://github.com/user-attachments/assets/6dcfd3b3-11d5-44fa-8118-ff78a06ce7b9" width="200" align="right"/>

Sistema de dashboard desenvolvido para a empresa Indios Churrasco Gourmet, focado no gerenciamento de pedidos em tempo real e na impressão de cupons fiscais, proporcionando mais agilidade e organização no atendimento.

---

## 🚀 Deploy em Produção

### URLs
- **Frontend**: https://indios.onrender.com
- **Backend**: https://api-indios.onrender.com

### 📚 Documentação de Deploy

Se você está enfrentando problemas com o deploy (CORS, 404, erro de login), consulte a documentação completa:

👉 **[INDICE_DOCUMENTACAO.md](./INDICE_DOCUMENTACAO.md)** - Índice completo de toda a documentação

#### Guias Rápidos
- **[RESUMO_PROBLEMAS_E_SOLUCOES.md](./RESUMO_PROBLEMAS_E_SOLUCOES.md)** - Resumo executivo dos problemas e soluções
- **[GUIA_VISUAL_RENDER.md](./GUIA_VISUAL_RENDER.md)** - Guia visual para configurar o Render (10 min)
- **[ACOES_RENDER.md](./ACOES_RENDER.md)** - Lista de ações necessárias no Render

#### Problemas Específicos
- **[SOLUCAO_CORS.md](./SOLUCAO_CORS.md)** - Resolver erro de CORS
- **[SOLUCAO_404_E_LOGIN.md](./SOLUCAO_404_E_LOGIN.md)** - Resolver 404 ao atualizar e erro de login
- **[COMANDOS_VERIFICACAO.md](./COMANDOS_VERIFICACAO.md)** - Comandos para testar e verificar

---

## 🛠️ Tecnologias

### Frontend
- React + Vite
- Tailwind CSS
- Context API
- PWA (Progressive Web App)

### Backend
- Node.js + Express
- MySQL
- Mercado Pago API
- JWT Authentication

---

## 📦 Instalação Local

### Pré-requisitos
- Node.js 18+
- MySQL 8+
- npm ou yarn

### Backend

```bash
cd backend
npm install
cp .env.example .env
# Configurar variáveis de ambiente no .env
npm start
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## 🔒 Segurança

O projeto está configurado com `.gitignore` robusto para proteger:
- Variáveis de ambiente (`.env`)
- Certificados e chaves
- Banco de dados
- Relatórios e uploads
- Backups

Consulte **[SEGURANCA_GITIGNORE.md](./SEGURANCA_GITIGNORE.md)** para mais detalhes.

---

## 📖 Documentação Adicional

- **[DEPLOY_RENDER.md](./DEPLOY_RENDER.md)** - Guia completo de deploy no Render
- **[CONFIGURACAO_RAPIDA.md](./CONFIGURACAO_RAPIDA.md)** - Configuração rápida
- **[BACKEND_DETECTION_ARCHITECTURE.md](./frontend/BACKEND_DETECTION_ARCHITECTURE.md)** - Arquitetura do sistema de detecção de backend
- **[LOADER_TRANSITION_ANIMATION.md](./frontend/LOADER_TRANSITION_ANIMATION.md)** - Documentação das animações do loader

---

## 🎯 Funcionalidades

- ✅ Gerenciamento de pedidos em tempo real
- ✅ Impressão de cupons fiscais
- ✅ Dashboard com estatísticas
- ✅ Gestão de produtos e categorias
- ✅ Integração com Mercado Pago
- ✅ Sistema de autenticação
- ✅ PWA (funciona offline)
- ✅ Loader com verificação de backend
- ✅ Tema claro/escuro

---

## 📄 Licença

Este projeto é proprietário da empresa Indios Churrasco Gourmet.