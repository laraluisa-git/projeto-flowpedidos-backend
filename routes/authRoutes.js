// routes/authRoutes.js

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Cadastro e login de usuários
 */

import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import supabase from '../config/supabase.js';

const router = express.Router();

// Cadastro
const registerSchema = z.object({
  // aceita name/nome
  name: z.string().min(2).optional(),
  nome: z.string().min(2).optional(),

  email: z.string().email(),

  // aceita password/senha
  password: z.string().min(6).optional(),
  senha: z.string().min(6).optional(),

  // aceita address/endereco
  address: z.string().min(5).optional(),
  endereco: z.string().min(5).optional(),

  // aceita accountType/tipoConta
  accountType: z.enum(['pf', 'empresa']).optional(),
  tipoConta: z.enum(['pf', 'empresa']).optional(),

  // aceita companyName/nomeEmpresa
  companyName: z.string().optional(),
  nomeEmpresa: z.string().optional(),
}).refine((v) => (v.name || v.nome) && (v.password || v.senha) && (v.address || v.endereco) && (v.accountType || v.tipoConta), {
  message: 'Campos obrigatórios ausentes (name/email/password/address/accountType).'
});

// Login
const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1).optional(),
  senha: z.string().min(1).optional(),
}).refine((v) => (v.password || v.senha), { message: 'Senha é obrigatória.' });

function mapRegisterPayload(body) {
  return {
    nome: body.name ?? body.nome,
    email: body.email,
    senha: body.password ?? body.senha,
    endereco: body.address ?? body.endereco,
    tipoConta: body.accountType ?? body.tipoConta,
    nomeEmpresa: (body.accountType ?? body.tipoConta) === 'empresa'
      ? (body.companyName ?? body.nomeEmpresa ?? '')
      : '',
  };
}

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Cadastrar novo usuário
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterInput'
 *     responses:
 *       201:
 *         description: Usuário criado com sucesso. Retorna token JWT e dados do usuário.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Email já cadastrado ou dados inválidos.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErroGenerico'
 *       500:
 *         description: Erro interno no servidor.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErroGenerico'
 */
// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const validated = registerSchema.parse(req.body);
    const payload = mapRegisterPayload(validated);

    // verifica se email já existe
    const { data: existingUser, error: existingErr } = await supabase
      .from('usuarios')
      .select('id,email')
      .eq('email', payload.email)
      .maybeSingle();

    if (existingErr) throw existingErr;
    if (existingUser) {
      return res.status(400).json({ error: 'Email já cadastrado.' });
    }

    const salt = await bcrypt.genSalt(10);
    const senhaHash = await bcrypt.hash(payload.senha, salt);

    const { data: newUser, error } = await supabase
      .from('usuarios')
      .insert([{
        nome: payload.nome,
        email: payload.email,
        senhaHash,
        endereco: payload.endereco,
        tipoConta: payload.tipoConta,
        nomeEmpresa: payload.nomeEmpresa,
        role: 'user',
      }])
      .select('id,nome,email,role')
      .single();

    if (error) throw error;

    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, role: newUser.role },
      process.env.JWT_SECRET || 'dev_secret_change_me',
      { expiresIn: '2h' }
    );

    console.log(`[AUTH] Novo usuário registrado: ${newUser.email} (ID: ${newUser.id})`);

    return res.status(201).json({
      token,
      usuario: { id: newUser.id, name: newUser.nome, email: newUser.email, role: newUser.role }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.issues.map(e => e.message) });
    }
    return res.status(500).json({ error: 'Erro interno no servidor', details: error.message });
  }
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Autenticar usuário
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginInput'
 *     responses:
 *       200:
 *         description: Login realizado com sucesso. Retorna token JWT e dados do usuário.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       401:
 *         description: Email ou senha inválidos.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErroGenerico'
 *       500:
 *         description: Erro interno no servidor.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErroGenerico'
 */
// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const validated = loginSchema.parse(req.body);
    const password = validated.password ?? validated.senha;

    const { data: user, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('email', validated.email)
      .maybeSingle();

    if (error) throw error;
    if (!user) {
      console.warn(`[AUTH] Falha de login (usuário não encontrado): ${validated.email}`);
      return res.status(401).json({ error: 'Email ou senha inválidos.' });
    }

    const ok = await bcrypt.compare(password, user.senhaHash);
    if (!ok) {
      console.warn(`[AUTH] Falha de login (senha incorreta): ${validated.email}`);
      return res.status(401).json({ error: 'Email ou senha inválidos.' });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET || 'dev_secret_change_me',
      { expiresIn: '1d' }
    );

    console.log(`[AUTH] Login realizado: ${user.email} (Role: ${user.role})`);

    return res.status(200).json({
      token,
      usuario: { id: user.id, name: user.nome, email: user.email, role: user.role }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.issues.map(e => e.message) });
    }
    return res.status(500).json({ error: 'Erro interno no servidor', details: error.message });
  }
});

export default router;
