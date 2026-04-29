/**
 * useOrders.ts — CRUD hook for Purchase Orders & Sales Orders
 * Orders are pure commitment documents — zero GL, zero stock, zero GST impact.
 * This hook NEVER calls finecore-engine.postVoucher().
 * [JWT] Replace with GET/POST /api/orders
 */
import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import type { Order } from '@/types/order';
import { ordersKey } from '@/types/order';
import { generateDocNo } from '@/lib/finecore-engine';

function ls<T>(key: string): T[] {
  try {
    // [JWT] GET /api/entity/storage/:key
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function ss<T>(key: string, data: T[]): void {
  // [JWT] POST /api/entity/storage/:key
  localStorage.setItem(key, JSON.stringify(data));
}

function isOrderProcessingEnabled(): boolean {
  try {
    // [JWT] GET /api/accounting/compliance-settings-automation
    const raw = localStorage.getItem('erp_comply360_group_config');
    if (raw) {
      const cfg = JSON.parse(raw);
      return cfg.enableOrderProcessing === true;
    }
  } catch { /* empty */ }
  return false;
}

export function useOrders(entityCode: string) {
  const key = ordersKey(entityCode);
  const [orders, setOrders] = useState<Order[]>(() => ls<Order>(key));

  const reload = useCallback(() => {
    // [JWT] GET /api/orders/:entityCode
    const fresh = ls<Order>(key);
    setOrders(fresh);
    return fresh;
  }, [key]);

  const createOrder = useCallback((orderData: Omit<Order, 'id' | 'order_no' | 'status' | 'created_at' | 'updated_at'>) => {
    if (!isOrderProcessingEnabled()) {
      toast.error('Enable Order Processing in Comply360 > Features first.');
      return null;
    }
    const prefix = orderData.base_voucher_type === 'Purchase Order' ? 'PO' : 'SO';
    const orderNo = generateDocNo(prefix, entityCode);
    const now = new Date().toISOString();
    const order: Order = {
      ...orderData,
      id: `ord-${Date.now()}`,
      order_no: orderNo,
      status: 'open',
      created_at: now,
      updated_at: now,
    };
    // [JWT] POST /api/orders
    const all = ls<Order>(key);
    all.push(order);
    ss(key, all);
    setOrders(all);
    return order;
  }, [entityCode, key]);

  const updateOrder = useCallback((id: string, data: Partial<Pick<Order, 'narration' | 'valid_till' | 'terms_conditions' | 'project_id' | 'project_no'>>) => {
    // [JWT] GET /api/orders/:entityCode
    const all = ls<Order>(key);
    const order = all.find(o => o.id === id);
    if (!order) return;
    if (order.lines.some(l => l.fulfilled_qty > 0)) {
      toast.error('Cannot edit a partially fulfilled order');
      return;
    }
    Object.assign(order, data, { updated_at: new Date().toISOString() });
    // [JWT] PATCH /api/orders/:id
    ss(key, all);
    setOrders(all);
    toast.success('Order updated');
  }, [key]);

  const fulfillOrderLine = useCallback((orderId: string, amountFulfilled: number) => {
    // [JWT] GET /api/orders/:entityCode
    const all = ls<Order>(key);
    const order = all.find(o => o.id === orderId);
    if (!order) return;
    // Simple order-level fulfilment in Sprint 5
    if (amountFulfilled >= order.net_amount * 0.95) {
      order.lines.forEach(l => { l.fulfilled_qty = l.qty; l.pending_qty = 0; l.status = 'closed'; });
      order.status = 'closed';
    } else {
      const ratio = amountFulfilled / order.net_amount;
      order.lines.forEach(l => {
        const fulfilledQty = Math.min(l.qty, Math.round(l.qty * ratio));
        l.fulfilled_qty = fulfilledQty;
        l.pending_qty = l.qty - fulfilledQty;
        l.status = l.pending_qty <= 0 ? 'closed' : 'partial';
      });
      order.status = 'partial';
    }
    order.updated_at = new Date().toISOString();
    // [JWT] PATCH /api/orders/:id
    ss(key, all);
    setOrders(all);
  }, [key]);

  const preCloseOrder = useCallback((orderId: string, reason: string) => {
    // [JWT] GET /api/orders/:entityCode
    const all = ls<Order>(key);
    const order = all.find(o => o.id === orderId);
    if (!order) return;
    if (order.status !== 'open' && order.status !== 'partial') {
      toast.error('Only open or partial orders can be pre-closed');
      return;
    }
    order.lines.forEach(l => { l.status = 'preclosed'; });
    order.status = 'preclosed';
    order.preclose_reason = reason;
    order.updated_at = new Date().toISOString();
    // [JWT] PATCH /api/orders/:id
    ss(key, all);
    setOrders(all);
    toast.success(`Order ${order.order_no} pre-closed`);
  }, [key]);

  const cancelOrder = useCallback((orderId: string, reason: string) => {
    // [JWT] GET /api/orders/:entityCode
    const all = ls<Order>(key);
    const order = all.find(o => o.id === orderId);
    if (!order) return;
    if (order.status !== 'open') {
      toast.error('Only open orders can be cancelled');
      return;
    }
    if (order.lines.some(l => l.fulfilled_qty > 0)) {
      toast.error('Order has fulfilments — use Pre-close instead');
      return;
    }
    order.status = 'cancelled';
    order.cancel_reason = reason;
    order.updated_at = new Date().toISOString();
    // [JWT] PATCH /api/orders/:id/cancel
    ss(key, all);
    setOrders(all);
    toast.success(`Order ${order.order_no} cancelled`);
  }, [key]);

  const listOrders = useCallback((filters?: {
    base_voucher_type?: 'Sales Order' | 'Purchase Order';
    status?: Order['status'];
    partyName?: string;
    dateFrom?: string;
    dateTo?: string;
  }) => {
    let result = orders;
    if (filters?.base_voucher_type) result = result.filter(o => o.base_voucher_type === filters.base_voucher_type);
    if (filters?.status) result = result.filter(o => o.status === filters.status);
    if (filters?.partyName) result = result.filter(o => o.party_name.toLowerCase().includes(filters.partyName!.toLowerCase()));
    if (filters?.dateFrom) result = result.filter(o => o.date >= filters.dateFrom!);
    if (filters?.dateTo) result = result.filter(o => o.date <= filters.dateTo!);
    return result;
  }, [orders]);

  const getOpenOrdersForLookup = useCallback((type: 'Sales Order' | 'Purchase Order') => {
    return orders
      .filter(o => o.base_voucher_type === type && (o.status === 'open' || o.status === 'partial'))
      .map(o => ({
        id: o.id,
        order_no: o.order_no,
        party_name: o.party_name,
        party_id: o.party_id,
        date: o.date,
        net_amount: o.net_amount,
        pending_value: o.lines.reduce((s, l) => s + l.pending_qty * l.rate, 0),
      }));
  }, [orders]);

  return {
    orders, reload,
    createOrder, updateOrder, fulfillOrderLine,
    preCloseOrder, cancelOrder, listOrders, getOpenOrdersForLookup,
  };
}
