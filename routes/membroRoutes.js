// routes/membroRoutes.js
import express from 'express';
import { z } from 'zod';
import supabase from '../config/supabase.js';
import { verificarToken, verificarAdmin } from '../middlewares/authMiddleware.js';

const router = express.Router();

const membroSchema = z.object({
  name: z.string().min(2).optional(),
  nome: z.string().min(2).optional(),
  role: z.string().min(2).optional(),
  funcao: z.string().min(2).optional(),
  links: z.string().optional(),
}).refine(v => (v.name || v.nome) && (v.role || v.funcao), { message: 'Campos obrigatórios: name e role.' });

function mapMembro(body){
  return {
    nome: body.name ?? body.nome,
    funcao: body.role ?? body.funcao,
    links: body.links ?? '',
    // No banco a coluna é criadoEm (timestamp). Deixe o default do banco quando possível.
    criadoEm: new Date().toISOString(),
  };
}

// GET /api/membros
router.get('/', verificarToken, async (req, res) => {
  try {
    const { data: membros, error } = await supabase
      .from('membros_equipe')
      .select('*')
      .order('criadoEm', { ascending: true });

    if (error) throw error;

    res.status(200).json((membros ?? []).map(m => ({
      id: m.id,
      name: m.nome,
      role: m.funcao,
      links: m.links ?? '',
      createdAt: m.criadoEm || m.criadoem, // Fallback para minúsculo
    })));
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar membros da equipe', details: error.message });
  }
});

// POST /api/membros (admin)
router.post('/', verificarToken, verificarAdmin, async (req, res) => {
  try {
    const validated = membroSchema.parse(req.body);
    const payload = mapMembro(req.body);

    const { data: novoMembro, error } = await supabase
      .from('membros_equipe')
      .insert([payload])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      membro: {
        id: novoMembro.id,
        name: novoMembro.nome,
        role: novoMembro.funcao,
        links: novoMembro.links ?? '',
        createdAt: novoMembro.criadoEm || novoMembro.criadoem,
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ errors: error.issues.map(e => e.message) });
    res.status(500).json({ error: 'Erro ao adicionar membro', details: error.message });
  }
});

// PUT /api/membros/:id (admin)
router.put('/:id', verificarToken, verificarAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const editarSchema = membroSchema.partial();
    const validated = editarSchema.parse(req.body);

    const patch = {};
    if (validated.name || validated.nome) patch.nome = validated.name ?? validated.nome;
    if (validated.role || validated.funcao) patch.funcao = validated.role ?? validated.funcao;
    if (typeof validated.links === 'string') patch.links = validated.links;

    const { data: membroAtualizado, error } = await supabase
      .from('membros_equipe')
      .update(patch)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!membroAtualizado) return res.status(404).json({ error: 'Membro não encontrado.' });

    res.status(200).json({
      membro: {
        id: membroAtualizado.id,
        name: membroAtualizado.nome,
        role: membroAtualizado.funcao,
        links: membroAtualizado.links ?? '',
        createdAt: membroAtualizado.criadoEm || membroAtualizado.criadoem,
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ errors: error.issues.map(e => e.message) });
    res.status(500).json({ error: 'Erro ao editar membro', details: error.message });
  }
});

// DELETE /api/membros/:id (admin)
router.delete('/:id', verificarToken, verificarAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('membros_equipe')
      .delete()
      .eq('id', id)
      .select();

    if (error) throw error;
    if (!data || data.length === 0) return res.status(404).json({ error: 'Membro não encontrado.' });

    res.status(200).json({ mensagem: 'Membro removido.' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao remover membro', details: error.message });
  }
});

export default router;
