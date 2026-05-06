/**
 * @file     useProductionOrders.ts
 * @sprint   T-Phase-1.3-3a-pre-1
 * @purpose  Department-scoped reader for Production Orders.
 */
import { useEffect, useMemo, useState, useCallback } from 'react';
import type { ProductionOrder } from '@/types/production-order';
import { productionOrdersKey } from '@/types/production-order';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useEntityChangeEffect } from '@/hooks/useEntityChangeEffect';

export function useProductionOrders(): {
  orders: ProductionOrder[];
  allOrders: ProductionOrder[];
  reload: () => void;
} {
  const { entityCode } = useEntityCode();
  const [orders, setOrders] = useState<ProductionOrder[]>([]);

  const reload = useCallback(() => {
    try {
      // [JWT] GET /api/production-orders/:entityCode
      const raw = localStorage.getItem(productionOrdersKey(entityCode));
      setOrders(raw ? (JSON.parse(raw) as ProductionOrder[]) : []);
    } catch {
      setOrders([]);
    }
  }, [entityCode]);

  useEffect(() => { reload(); }, [reload]);
  useEntityChangeEffect(reload, [reload]);

  const visibleOrders = useMemo(() => orders, [orders]);

  return { orders: visibleOrders, allOrders: orders, reload };
}
