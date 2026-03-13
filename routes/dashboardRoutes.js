import express from 'express';
import supabase from '../config/supabase.js';
import { verificarToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/', verificarToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    // 1. Consulta Produtos (Ajustado para unitPrice e stockQty)
    let queryProd = supabase.from('produtos').select('stock_qty, unit_price');
    if (!isAdmin) queryProd = queryProd.eq('user_id', userId);
    
    const { data: produtos, error: errProd } = await queryProd;
    if (errProd) throw errProd;

    // Garante que os valores sejam números e trata nulos
    const totalEstoqueValor = (produtos || []).reduce((acc, p) => {
      const qty = Number(p.stock_qty) || 0;
      const price = Number(p.unit_price) || 0;
      return acc + (qty * price);
    }, 0);

    // 2. Consulta Pedidos (Apenas status é necessário para as contagens)
    let queryPed = supabase.from('pedidos').select('status');
    if (!isAdmin) queryPed = queryPed.eq('user_id', userId);
    
    const { data: pedidos, error: errPed } = await queryPed;
    if (errPed) throw errPed;

    const stats = {
      totalPedidos: pedidos.length,
      confirmados: pedidos.filter(p => p.status === 'confirmado').length,
      entregues: pedidos.filter(p => p.status === 'entregue').length,
      valorTotalEstoque: totalEstoqueValor.toFixed(2),
      
      // Adicionando chaves em inglês (camelCase) para compatibilidade com o frontend
      totalOrders: pedidos.length,
      confirmedOrders: pedidos.filter(p => p.status === 'confirmado').length,
      deliveredOrders: pedidos.filter(p => p.status === 'entregue').length,
      totalStockValue: totalEstoqueValor.toFixed(2)
    };

    res.status(200).json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Erro no dashboard', details: error.message });
  }
});

export default router;