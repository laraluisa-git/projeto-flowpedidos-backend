# FlowPedidos — Backend

API REST construída com **Node.js + Express**, conectada ao **Supabase**.

## Pré-requisitos

- Node.js 20+

## Instalação

```bash
npm install
```

## Configuração

Copie o arquivo de exemplo e preencha as variáveis:

```bash
cp .env.example .env
```

| Variável                  | Descrição                        |
|---------------------------|----------------------------------|
| `PORT`                    | Porta do servidor (padrão: 3000) |
| `SUPABASE_URL`            | URL do projeto no Supabase       |
| `SUPABASE_KEY`            | Chave anon do Supabase           |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave service role do Supabase |
| `JWT_SECRET`              | String secreta para assinar JWTs |

## Rodando localmente

```bash
npm run dev
```

A API ficará disponível em `http://localhost:3000`.

## Rotas disponíveis

| Método | Rota              | Descrição              |
|--------|-------------------|------------------------|
| GET    | /api/status       | Health check da API    |
| POST   | /api/auth/...     | Autenticação           |
| GET    | /api/produtos/... | Produtos               |
| GET    | /api/pedidos/...  | Pedidos                |
| GET    | /api/membros/...  | Membros                |
| GET    | /api/dashboard/...| Dashboard              |
| GET    | /api/auditoria/...| Auditoria              |

## Deploy (Render)

O arquivo `.github/workflows/deploy-backend.yml` realiza o deploy automático no **Render** ao fazer push na branch `main` com commits referenciando `api-*`.

Configure os secrets no GitHub:
- `RENDER_SERVICE_ID`
- `RENDER_API_KEY`
