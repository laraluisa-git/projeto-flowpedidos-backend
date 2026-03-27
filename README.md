# FlowPedidos — Backend

API REST do sistema FlowPedidos, responsável por toda a lógica de negócio, autenticação e comunicação com o banco de dados.

**Stack:** Node.js · Express · Supabase · JWT · Zod · Swagger

**ACESSO AO SISTEMA:** https://projeto-flowpedidos.vercel.app/

**DOCUMENTAÇÃO DA API (SWAGGER):** https://projeto-flowpedidos-api.onrender.com/api-docs

---

## Sumário

- [Visão Geral](#visão-geral)
- [Tecnologias](#tecnologias)
- [Estrutura de Pastas](#estrutura-de-pastas)
- [Pré-requisitos](#pré-requisitos)
- [Instalação](#instalação)
- [Variáveis de Ambiente](#variáveis-de-ambiente)
- [Rodando Localmente](#rodando-localmente)
- [Documentação Interativa (Swagger)](#documentação-interativa-swagger)
- [Endpoints da API](#endpoints-da-api)
- [Autenticação](#autenticação)
- [Controle de Acesso (Roles)](#controle-de-acesso-roles)
- [Banco de Dados](#banco-de-dados)
- [Deploy](#deploy)

---

## Visão Geral

O backend do FlowPedidos expõe uma API REST que serve o frontend React. Ele é responsável por:

- Cadastro e autenticação de usuários com senha criptografada (bcrypt) e tokens JWT
- CRUD completo de produtos com controle de estoque
- Criação e gerenciamento de pedidos com baixa automática de estoque
- Registro de membros da equipe
- Estatísticas para o dashboard
- Log de auditoria de ações dos usuários
- Documentação interativa da API via Swagger UI

---

## Tecnologias

| Tecnologia | Versão | Uso |
|---|---|---|
| Node.js | 20+ | Runtime |
| Express | 5 | Framework HTTP |
| Supabase JS | 2 | Client do banco de dados |
| bcryptjs | 3 | Hash de senhas |
| jsonwebtoken | 9 | Geração e verificação de JWT |
| Zod | 4 | Validação de dados de entrada |
| uuid | 13 | Geração de IDs únicos |
| dotenv | 17 | Carregamento de variáveis de ambiente |
| swagger-ui-express | 5 | Interface visual da documentação |
| swagger-jsdoc | 6 | Geração do spec OpenAPI a partir de comentários JSDoc |

---

## Estrutura de Pastas

```
flowpedidos-backend/
├── config/
│   ├── supabase.js          # Inicialização do client Supabase
│   └── swagger.js           # Configuração do Swagger (schemas e servidores)
├── middlewares/
│   └── authMiddleware.js    # Verificação de JWT e permissão de admin
├── routes/
│   ├── authRoutes.js        # /api/auth (com anotações Swagger)
│   ├── produtoRoutes.js     # /api/produtos (com anotações Swagger)
│   ├── pedidoRoutes.js      # /api/pedidos (com anotações Swagger)
│   ├── membroRoutes.js      # /api/membros
│   ├── dashboardRoutes.js   # /api/dashboard
│   └── auditRoutes.js       # /api/auditoria
├── scripts/
│   └── generate_admin_hash.mjs
├── supabase/
│   ├── migrations/
│   └── seed.sql
├── Dockerfile
├── package.json
└── server.js
```

---

## Pré-requisitos

- Node.js 20 ou superior
- Conta e projeto criados no [Supabase](https://supabase.com/)

---

## Instalação

```bash
git clone https://github.com/seu-usuario/flowpedidos-backend.git
cd flowpedidos-backend
npm install
```

---

## Variáveis de Ambiente

```bash
cp .env.example .env
```

| Variável | Obrigatória | Descrição |
|---|---|---|
| `PORT` | Não | Porta do servidor. Padrão: `3000` |
| `SUPABASE_URL` | Sim | URL do projeto no Supabase |
| `SUPABASE_KEY` | Sim | Chave `anon` pública do Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Recomendado | Chave `service_role` (ignora RLS) |
| `JWT_SECRET` | Sim | String secreta para assinar os tokens JWT |

> Use a `SUPABASE_SERVICE_ROLE_KEY` no servidor para evitar bloqueios de RLS em operações de escrita. Nunca exponha essa chave no frontend.

---

## Rodando Localmente

```bash
npm run dev
```

Servidor disponível em `http://localhost:3000`. Para testar:

```bash
curl http://localhost:3000/api/status
# {"status":"success","message":"API rodando no Render!"}
```

---

## Documentação Interativa (Swagger)

A documentação interativa da API está disponível em:

| Ambiente | URL |
|---|---|
| Local | `http://localhost:3000/api-docs` |
| Produção | `https://projeto-flowpedidos-api.onrender.com/api-docs` |

> ⚠️ O Render hiberna o servidor após 15 minutos de inatividade no plano gratuito. Se a página demorar para carregar, aguarde cerca de 30 segundos e recarregue.

### Rotas documentadas no Swagger

| Grupo | Método | Rota | Requer Auth |
|---|---|---|---|
| **Auth** | POST | `/api/auth/login` | ❌ |
| **Auth** | POST | `/api/auth/register` | ❌ |
| **Produtos** | GET | `/api/produtos` | ✅ |
| **Produtos** | POST | `/api/produtos` | ✅ |
| **Produtos** | PUT | `/api/produtos/{id}` | ✅ |
| **Produtos** | DELETE | `/api/produtos/{id}` | ✅ |
| **Pedidos** | GET | `/api/pedidos` | ✅ |
| **Pedidos** | POST | `/api/pedidos` | ✅ |
| **Pedidos** | PUT | `/api/pedidos/{id}` | ✅ |
| **Pedidos** | DELETE | `/api/pedidos/{id}` | ✅ |

### Como autenticar no Swagger

**Passo 1 — Obter o token**

Na seção **Auth**, expanda `POST /api/auth/login`, clique em **Try it out** e execute com as credenciais de teste:

```json
{
  "email": "admin@demo.com",
  "senha": "admin123"
}
```

Copie o valor do campo `token` na resposta (sem as aspas).

**Passo 2 — Autorizar**

Clique no botão 🔒 **Authorize** no canto superior direito. No campo **Value**, insira o token no formato:

```
Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Clique em **Authorize** e depois em **Close**.

**Passo 3 — Testar**

Todos os endpoints protegidos passarão a aceitar suas requisições. O cadeado 🔒 aparecerá fechado nos endpoints autenticados.

### Acesso de teste

| Campo | Valor |
|---|---|
| Email | `admin@demo.com` |
| Senha | `admin123` |

> Este acesso possui perfil **admin** e visualiza todos os dados do sistema.

---

## Endpoints da API

Todos os endpoints (exceto `/api/auth/register` e `/api/auth/login`) exigem o header:

```
Authorization: Bearer <token>
```

### Auth

| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/auth/register` | Cadastrar usuário |
| POST | `/api/auth/login` | Autenticar usuário |

**POST /api/auth/register**
```json
{
  "name": "João Silva",
  "email": "joao@email.com",
  "password": "senha123",
  "address": "Rua das Flores, 100",
  "accountType": "pf"
}
```
Resposta `201`: `{ token, usuario: { id, name, email, role } }`

**POST /api/auth/login**
```json
{
  "email": "joao@email.com",
  "password": "senha123"
}
```
Resposta `200`: `{ token, usuario: { id, name, email, role } }`

---

### Produtos

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/produtos` | Listar produtos |
| POST | `/api/produtos` | Criar produto |
| PUT | `/api/produtos/:id` | Atualizar produto |
| DELETE | `/api/produtos/:id` | Remover produto |

**POST /api/produtos**
```json
{
  "name": "Camiseta P",
  "category": "Roupas",
  "unitPrice": 49.90,
  "stockQty": 100,
  "minStockQty": 10
}
```

---

### Pedidos

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/pedidos` | Listar pedidos |
| POST | `/api/pedidos` | Criar pedido (baixa estoque automaticamente) |
| PUT | `/api/pedidos/:id` | Atualizar pedido (ajusta estoque se qty mudar) |
| DELETE | `/api/pedidos/:id` | Excluir pedido (estorna estoque) |

**POST /api/pedidos**
```json
{
  "customerName": "Maria Oliveira",
  "deliveryAddress": "Av. Central, 200",
  "productId": "uuid-do-produto",
  "quantity": 3,
  "priority": "alta",
  "status": "confirmado"
}
```
`priority`: `baixa` | `media` | `alta`  
`status`: `confirmado` | `em_andamento` | `entregue`

Se o estoque for insuficiente, retorna erro `422`.

---

### Membros da Equipe

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| GET | `/api/membros` | Autenticado | Listar membros |
| POST | `/api/membros` | Admin | Adicionar membro |
| PUT | `/api/membros/:id` | Admin | Editar membro |
| DELETE | `/api/membros/:id` | Admin | Remover membro |

---

### Dashboard

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/dashboard` | Estatísticas gerais (pedidos e valor de estoque) |

Resposta `200`:
```json
{
  "totalOrders": 42,
  "confirmedOrders": 20,
  "deliveredOrders": 15,
  "totalStockValue": "12500.00"
}
```

---

### Auditoria

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/auditoria` | Últimos 200 registros de ações |

---

## Autenticação

1. O usuário faz login e recebe um token JWT.
2. O token é enviado no header `Authorization: Bearer <token>` em todas as requisições protegidas.
3. O middleware `verificarToken` valida o token com a `JWT_SECRET`.
4. Tokens de login expiram em **1 dia**. Tokens de registro expiram em **2 horas**.

---

## Controle de Acesso (Roles)

| Role | Permissões |
|---|---|
| `user` | Acessa e gerencia apenas seus próprios dados |
| `admin` | Acesso total; pode gerenciar membros da equipe |

---

## Banco de Dados

O projeto usa **Supabase** (PostgreSQL).

| Tabela | Descrição |
|---|---|
| `usuarios` | Usuários cadastrados |
| `produtos` | Catálogo com controle de estoque |
| `pedidos` | Pedidos vinculados a produtos e usuários |
| `membros_equipe` | Membros exibidos na página institucional |
| `auditoria` | Log de ações dos usuários |

Scripts de criação em `supabase/migrations/` e dados iniciais em `supabase/seed.sql`.

---

## Deploy

Deploy automático no **Render** via GitHub Actions (`.github/workflows/deploy-backend.yml`).  
Ativado em pushes para `main` com commits referenciando `api-*`.

**Secrets necessários no GitHub:**

| Secret | Descrição |
|---|---|
| `RENDER_SERVICE_ID` | ID do serviço no Render |
| `RENDER_API_KEY` | Chave de API do Render |

Deploy manual com Docker:

```bash
docker build -t flowpedidos-backend .
docker run -p 3000:3000 --env-file .env flowpedidos-backend
```
