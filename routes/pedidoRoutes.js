// routes/pedidoRoutes.js
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

function mapPedidoResponse(p) {
  return {
    id: p.id,
    customerName: p.cliente_nome ?? p.customerName,
    deliveryAddress: p.endereco_entrega ?? p.deliveryAddress,
    productId: p.produto_id ?? p.productId,
    productName: p.produtos?.nome ?? p.produtos?.name ?? null,
    quantity: p.quantidade ?? p.quantity ?? 0,
    priority: p.priority,
    status: p.status,
    createdAt: p.criadoEm ?? p.createdAt ?? null,
    updatedAt: p.atualizadoEm ?? p.updatedAt ?? null,
    deliveredAt: p.entrega_em ?? p.deliveredAt ?? null,
  };
}

// GET /api/pedidos
router.get('/', verificarToken, async (req, res) => {
  try {
    const { id: userId, role } = req.user;

    let query = supabase
      .from('pedidos')
      .select('*, produtos(nome)');

    if (role !== 'admin') {
      query = query.eq('user_id', userId);
    }

    const { data: pedidos, error } = await query.order('criadoEm', { ascending: false });

    if (error) throw error;

    const pedidosFormatados = (pedidos ?? []).map(mapPedidoResponse);

    res.status(200).json(pedidosFormatados);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar pedidos', details: error.message });
  }
});

// POST /api/pedidos
router.post('/', verificarToken, async (req, res) => {
  try {
    const validated = pedidoSchema.parse(req.body);
    const payload = mapPedidoInsert(validated, req.user.id);

    const { data: produto, error: produtoError } = await supabase
      .from('produtos')
      .select('id, stock_qty, unit_price')
      .eq('id', payload.produto_id)
      .maybeSingle();

    if (produtoError) throw produtoError;
    if (!produto) {
      return res.status(404).json({ error: 'Produto não encontrado.' });
    }

    if (produto.stock_qty < payload.quantidade) {
      return res.status(422).json({
        error: `Estoque insuficiente. Disponível: ${produto.stock_qty}`,
      });
    }

    const { data: novoPedido, error: pedidoError } = await supabase
      .from('pedidos')
      .insert([payload])
      .select('*, produtos(nome)')
      .single();

    if (pedidoError) throw pedidoError;

    const { error: estoqueError } = await supabase
      .from('produtos')
      .update({
        stock_qty: produto.stock_qty - payload.quantidade,
        atualizadoEm: Date.now(),
      })
      .eq('id', payload.produto_id);

    if (estoqueError) throw estoqueError;

    res.status(201).json({
      pedido: mapPedidoResponse(novoPedido),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        errors: error.issues.map((e) => e.message),
      });
    }

    res.status(500).json({ error: 'Erro ao processar pedido', details: error.message });
  }
});

// PUT /api/pedidos/:id
router.put('/:id', verificarToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { id: userId, role } = req.user;
    const body = req.body;

    const { data: pedidoAtual, error: errBusca } = await supabase
      .from('pedidos')
      .select('*')
      .eq('id', id)
      .single();

    if (errBusca || !pedidoAtual) {
      return res.status(404).json({ error: 'Pedido não encontrado' });
    }

    if (role !== 'admin' && pedidoAtual.user_id !== userId) {
      return res.status(403).json({ error: 'Sem permissão.' });
    }

    const updateData = {
      atualizadoEm: Date.now(),
    };

    if (body.customerName) updateData.cliente_nome = body.customerName;
    if (body.deliveryAddress) updateData.endereco_entrega = body.deliveryAddress;
    if (body.priority) updateData.priority = body.priority;

    if (body.status) {
      updateData.status = body.status;

      if (body.status === 'entregue' && pedidoAtual.status !== 'entregue') {
        updateData.entrega_em = Date.now();
      }

      if (body.status !== 'entregue') {
        updateData.entrega_em = null;
      }
    }

    if (
      body.quantity !== undefined &&
      Number(body.quantity) !== Number(pedidoAtual.quantidade)
    ) {
      const novaQuantidade = Number(body.quantity);
      const quantidadeAtual = Number(pedidoAtual.quantidade);
      const diff = novaQuantidade - quantidadeAtual;

      const { data: produto, error: errProduto } = await supabase
        .from('produtos')
        .select('stock_qty')
        .eq('id', pedidoAtual.produto_id)
        .single();

      if (errProduto) throw errProduto;

      if (!produto) {
        return res.status(404).json({ error: 'Produto do pedido não encontrado.' });
      }

      if (diff > 0 && produto.stock_qty < diff) {
        return res.status(422).json({
          error: 'Estoque insuficiente para a nova quantidade.',
        });
      }

      const { error: estoqueError } = await supabase
        .from('produtos')
        .update({
          stock_qty: produto.stock_qty - diff,
          atualizadoEm: Date.now(),
        })
        .eq('id', pedidoAtual.produto_id);

      if (estoqueError) throw estoqueError;

      updateData.quantidade = novaQuantidade;
    }

    const { data: atualizado, error: errUpdate } = await supabase
      .from('pedidos')
      .update(updateData)
      .eq('id', id)
      .select('*, produtos(nome)')
      .single();

    if (errUpdate) throw errUpdate;

    res.json(mapPedidoResponse(atualizado));
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar pedido', details: error.message });
  }
});

// DELETE /api/pedidos/:id
router.delete('/:id', verificarToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { role, id: userId } = req.user;

    const { data: pedido, error: errBusca } = await supabase
      .from('pedidos')
      .select('*')
      .eq('id', id)
      .single();

    if (errBusca) throw errBusca;
    if (!pedido) {
      return res.status(404).json({ error: 'Pedido não encontrado.' });
    }

    if (role !== 'admin' && pedido.user_id !== userId) {
      return res.status(403).json({ error: 'Sem permissão para excluir.' });
    }

    if (pedido.produto_id && pedido.quantidade) {
      const { data: produto, error: errProduto } = await supabase
        .from('produtos')
        .select('stock_qty')
        .eq('id', pedido.produto_id)
        .single();

      if (errProduto) throw errProduto;

      if (produto) {
        const { error: estoqueError } = await supabase
          .from('produtos')
          .update({
            stock_qty: produto.stock_qty + pedido.quantidade,
            atualizadoEm: Date.now(),
          })
          .eq('id', pedido.produto_id);

        if (estoqueError) throw estoqueError;
      }
    }

    const { error: errDel } = await supabase
      .from('pedidos')
      .delete()
      .eq('id', id);

    if (errDel) throw errDel;

    res.status(200).json({ message: 'Pedido excluído com sucesso.' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao excluir pedido', details: error.message });
  }
});

export default router;
