// routes/pedidoRoutes.js

/**
 * @swagger
 * tags:
 *   name: Pedidos
 *   description: Gerenciamento de pedidos com controle de estoque
 */

import express from 'express';
import { z } from 'zod';
import supabase from '../config/supabase.js';
import { verificarToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

const pedidoSchema = z.object({
  customerName: z.string().min(2),
  deliveryAddress: z.string().min(5),
  productId: z.string().uuid("ID do produto deve ser um UUID válido"),
  quantity: z.coerce.number().int().min(1),
  priority: z.enum(['baixa', 'media', 'alta']).default('media'),
  status: z.enum(['confirmado', 'em_andamento', 'entregue']).default('confirmado'),
});

function mapPedidoInsert(body, userId) {
  const agora = Date.now();
  return {
    cliente_nome: body.customerName,
    endereco_entrega: body.deliveryAddress,
    produto_id: body.productId,
    quantidade: body.quantity,
    priority: body.priority ?? 'media',
    status: body.status ?? 'confirmado',
    user_id: userId,
    criadoEm: agora,
    atualizadoEm: agora,
    entrega_em: body.status === 'entregue' ? agora : null,
  };
}

/**
 * @swagger
 * /api/pedidos:
 *   get:
 *     summary: Listar pedidos
 *     description: Retorna todos os pedidos. Admin vê todos; usuário comum vê apenas os seus.
 *     tags: [Pedidos]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de pedidos retornada com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Pedido'
 *       401:
 *         description: Token ausente ou inválido.
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
// GET /api/pedidos
router.get('/', verificarToken, async (req, res) => {
  try {
    const { id: userId, role } = req.user;
    
    // Join com a tabela produtos (usando o nome da coluna que definimos no mapeamento)
    let query = supabase
      .from('pedidos')
      .select('*, produtos(nome)');

    if (role !== 'admin') {
      query = query.eq('user_id', userId);
    }

    const { data: pedidos, error } = await query.order('criadoEm', { ascending: false });

    if (error) throw error;

    // Mapeia snake_case (banco) para camelCase (frontend)
    const pedidosFormatados = (pedidos ?? []).map(p => ({
      id: p.id,
      customerName: p.cliente_nome,
      deliveryAddress: p.endereco_entrega,
      productId: p.produto_id,
      productName: p.produtos?.nome,
      quantity: p.quantidade ?? p.quantity ?? 0, // Fallback de segurança
      priority: p.priority,
      status: p.status,
      criadoEm: p.criadoEm,
      createdAt: p.criadoEm || p.criadoem,
      entregaEm: p.entrega_em
    }));

    res.status(200).json(pedidosFormatados);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar pedidos', details: error.message });
  }
});

/**
 * @swagger
 * /api/pedidos:
 *   post:
 *     summary: Criar pedido
 *     description: Cria um novo pedido e deduz automaticamente a quantidade do estoque do produto.
 *     tags: [Pedidos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PedidoInput'
 *     responses:
 *       201:
 *         description: Pedido criado com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 pedido:
 *                   $ref: '#/components/schemas/Pedido'
 *       400:
 *         description: Dados inválidos.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErroValidacao'
 *       401:
 *         description: Token ausente ou inválido.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErroGenerico'
 *       404:
 *         description: Produto não encontrado.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErroGenerico'
 *       422:
 *         description: Estoque insuficiente para a quantidade solicitada.
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
// POST /api/pedidos - COM BAIXA DE ESTOQUE
router.post('/', verificarToken, async (req, res) => {
  try {
    const validated = pedidoSchema.parse(req.body);
    const payload = mapPedidoInsert(validated, req.user.id);

    // 1) Busca o produto (atenção aos nomes das colunas unit_price e stock_qty)
    const { data: produto, error: produtoError } = await supabase
      .from('produtos')
      .select('id, stock_qty, unit_price')
      .eq('id', payload.produto_id)
      .maybeSingle();

    if (produtoError) throw produtoError;
    if (!produto) return res.status(404).json({ error: 'Produto não encontrado.' });

    // 2) Verifica estoque
    if (produto.stock_qty < payload.quantidade) {
      console.warn(`[PEDIDO] Estoque insuficiente. Prod: ${payload.produto_id}, Req: ${payload.quantidade}, Disp: ${produto.stock_qty}`);
      return res.status(422).json({ 
        error: `Estoque insuficiente. Disponível: ${produto.stock_qty}` 
      });
    }

    // 3) Insere o pedido
    const { data: novoPedido, error: pedidoError } = await supabase
      .from('pedidos')
      .insert([payload])
      .select()
      .single();

    if (pedidoError) throw pedidoError;

    // 4) Atualiza estoque do produto (snake_case)
    const { error: estoqueError } = await supabase
      .from('produtos')
      .update({ 
        stock_qty: produto.stock_qty - payload.quantidade, 
        atualizadoEm: Date.now() 
      })
      .eq('id', payload.produto_id);

    if (estoqueError) throw estoqueError;

    console.log(`[PEDIDO] Criado com sucesso: ${novoPedido.id} | Cliente: ${novoPedido.cliente_nome}`);

    res.status(201).json({ pedido: novoPedido });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.issues.map(e => e.message) });
    }
    res.status(500).json({ error: 'Erro ao processar pedido', details: error.message });
  }
});

/**
 * @swagger
 * /api/pedidos/{id}:
 *   put:
 *     summary: Atualizar pedido
 *     description: Atualiza status, quantidade ou outros campos do pedido. Ajusta o estoque automaticamente se a quantidade mudar.
 *     tags: [Pedidos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do pedido
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PedidoInput'
 *     responses:
 *       200:
 *         description: Pedido atualizado com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Pedido'
 *       401:
 *         description: Token ausente ou inválido.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErroGenerico'
 *       403:
 *         description: Sem permissão para editar este pedido.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErroGenerico'
 *       404:
 *         description: Pedido não encontrado.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErroGenerico'
 *       422:
 *         description: Estoque insuficiente para a nova quantidade.
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
// PUT /api/pedidos/:id - Atualizar pedido (Status ou Quantidade com ajuste de estoque)
router.put('/:id', verificarToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { id: userId, role } = req.user;
    const body = req.body;

    // 1. Busca pedido atual
    const { data: pedidoAtual, error: errBusca } = await supabase
      .from('pedidos')
      .select('*')
      .eq('id', id)
      .single();

    if (errBusca || !pedidoAtual) return res.status(404).json({ error: 'Pedido não encontrado' });

    // Permissão: Admin ou Dono do pedido
    if (role !== 'admin' && pedidoAtual.user_id !== userId) {
      return res.status(403).json({ error: 'Sem permissão.' });
    }

    // 2. Prepara update
    const updateData = { atualizadoEm: Date.now() };
    if (body.customerName) updateData.cliente_nome = body.customerName;
    if (body.deliveryAddress) updateData.endereco_entrega = body.deliveryAddress;
    if (body.priority) updateData.priority = body.priority;
    if (body.status) {
      updateData.status = body.status;
      if (body.status === 'entregue' && pedidoAtual.status !== 'entregue') {
        updateData.entrega_em = Date.now();
      }
    }

    // 3. Lógica de Estoque se quantidade mudou
    if (body.quantity && body.quantity !== pedidoAtual.quantidade) {
      const diff = body.quantity - pedidoAtual.quantidade; // Positivo = consumiu mais, Negativo = devolveu
      
      const { data: produto } = await supabase.from('produtos').select('stock_qty').eq('id', pedidoAtual.produto_id).single();
      
      if (produto) {
        if (produto.stock_qty < diff) return res.status(422).json({ error: 'Estoque insuficiente para a nova quantidade.' });
        await supabase.from('produtos').update({ stock_qty: produto.stock_qty - diff }).eq('id', pedidoAtual.produto_id);
      }
      updateData.quantidade = body.quantity;
    }

    const { data: atualizado, error: errUpdate } = await supabase.from('pedidos').update(updateData).eq('id', id).select().single();
    if (errUpdate) throw errUpdate;
    
    console.log(`[PEDIDO] Atualizado: ${id} | Status: ${updateData.status || 'mantido'} | Qtd: ${updateData.quantidade || 'mantida'}`);

    res.json(atualizado);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar pedido', details: error.message });
  }
});

/**
 * @swagger
 * /api/pedidos/{id}:
 *   delete:
 *     summary: Excluir pedido
 *     description: Remove o pedido e estorna automaticamente a quantidade ao estoque do produto.
 *     tags: [Pedidos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do pedido
 *     responses:
 *       200:
 *         description: Pedido excluído com sucesso.
 *         content:
 *           application/json:
 *             example:
 *               message: Pedido excluído com sucesso.
 *       401:
 *         description: Token ausente ou inválido.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErroGenerico'
 *       403:
 *         description: Sem permissão para excluir este pedido.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErroGenerico'
 *       404:
 *         description: Pedido não encontrado.
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
// DELETE /api/pedidos/:id - Excluir pedido e estornar estoque
router.delete('/:id', verificarToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { role, id: userId } = req.user;

    // 1. Busca o pedido para estornar estoque
    const { data: pedido, error: errBusca } = await supabase.from('pedidos').select('*').eq('id', id).single();
    if (errBusca) throw errBusca;
    if (!pedido) return res.status(404).json({ error: 'Pedido não encontrado.' });

    if (role !== 'admin' && pedido.user_id !== userId) return res.status(403).json({ error: 'Sem permissão para excluir.' });

    // 2. Estorna estoque
    if (pedido.produto_id && pedido.quantidade) {
      const { data: produto } = await supabase.from('produtos').select('stock_qty').eq('id', pedido.produto_id).single();
      if (produto) {
        await supabase.from('produtos').update({ stock_qty: produto.stock_qty + pedido.quantidade }).eq('id', pedido.produto_id);
      }
    }

    // 3. Remove pedido
    const { error: errDel } = await supabase.from('pedidos').delete().eq('id', id);
    if (errDel) throw errDel;

    console.log(`[PEDIDO] Excluído: ${id} | Estoque estornado: ${pedido.quantidade}`);

    res.status(200).json({ message: 'Pedido excluído com sucesso.' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao excluir pedido', details: error.message });
  }
});

export default router;