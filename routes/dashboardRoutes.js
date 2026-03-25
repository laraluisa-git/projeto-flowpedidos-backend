import express from 'express';
import supabase from '../config/supabase.js';
import { verificarToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/', verificarToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    let queryProd = supabase.from('produtos').select('stockQty, unitPrice');
    if (!isAdmin) queryProd = queryProd.eq('user_id', userId);

    const { data: produtos, error: errProd } = await queryProd;
    if (errProd) throw errProd;

    const totalEstoqueValor = (produtos || []).reduce((acc, p) => {
      const qty = Number(p.stockQty) || 0;
      const price = Number(p.unitPrice) || 0;
      return acc + (qty * price);
    }, 0);

    let queryPed = supabase
      .from('pedidos')
      .select('status, quantity, produtos(unitPrice), deliveredAt');
    if (!isAdmin) queryPed = queryPed.eq('user_id', userId);

    const { data: pedidos, error: errPed } = await queryPed;
    if (errPed) throw errPed;

    const totalVendasGeral = (pedidos || [])
      .filter(p => p.status === 'entregue' && p.produtos)
      .reduce((acc, p) => {
        const qty = Number(p.quantity) || 0;
        const price = Number(p.produtos?.unitPrice) || 0;
        return acc + (qty * price);
      }, 0);

    const totalVendasMes = (pedidos || [])
      .filter(p => {
        const deliveredDate = p.deliveredAt ? new Date(p.deliveredAt) : null;
        return (
          p.status === 'entregue' &&
          p.produtos &&
          deliveredDate &&
          deliveredDate >= firstDayOfMonth &&
          deliveredDate <= lastDayOfMonth
        );
      })
      .reduce((acc, p) => {
        const qty = Number(p.quantity) || 0;
        const price = Number(p.produtos?.unitPrice) || 0;
        return acc + (qty * price);
      }, 0);

    const stats = {
      totalPedidos: pedidos.length,
      confirmados: pedidos.filter(p => p.status === 'confirmado').length,
      entregues: pedidos.filter(p => p.status === 'entregue').length,
      valorTotalEstoque: totalEstoqueValor.toFixed(2),
      totalVendasGeral: totalVendasGeral.toFixed(2),
      totalVendasMes: totalVendasMes.toFixed(2),

      totalOrders: pedidos.length,
      confirmedOrders: pedidos.filter(p => p.status === 'confirmado').length,
      deliveredOrders: pedidos.filter(p => p.status === 'entregue').length,
      totalStockValue: totalEstoqueValor.toFixed(2),
      totalSales: totalVendasGeral.toFixed(2),
      totalSalesMonth: totalVendasMes.toFixed(2)
    };

    res.status(200).json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Erro no dashboard', details: error.message });
  }
});

export default router;
