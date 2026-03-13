// server.js
import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import authRoutes from './routes/authRoutes.js';
import produtoRoutes from './routes/produtoRoutes.js';
import pedidoRoutes from './routes/pedidoRoutes.js';
import membroRoutes from './routes/membroRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import auditRoutes from './routes/auditRoutes.js';

const app = express();

// =========================
// Middlewares
// =========================
app.use(cors());
app.use(express.json());

// Middleware de Log de Requisições
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// =========================
// Rotas API
// =========================
app.use('/api/auth', authRoutes);
app.use('/api/produtos', produtoRoutes);
app.use('/api/pedidos', pedidoRoutes);
app.use('/api/membros', membroRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/auditoria', auditRoutes);

// Rota de teste
app.get('/api/status', (req, res) => {
  res.json({ status: 'success', message: 'API rodando no Render!' });
});

// Catch-all genérico para rotas não encontradas na API
app.use((req, res) => {
  res.status(404).json({ error: 'Rota da API não encontrada' });
});

// =========================
// Inicialização do servidor
// =========================
const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});