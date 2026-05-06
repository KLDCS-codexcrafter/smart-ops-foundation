/**
 * @file     useProductionOrders.ts
 * @sprint   T-Phase-1.3-3a-pre-1-fix-1
 * @purpose  Department-scoped reader for Production Orders (FR-25 · SD-16).
 */
import { useEffect, useMemo, useState, useCallback } from 'react';
import type { ProductionOrder } from '@/types/production-order';
import { productionOrdersKey } from '@/types/production-order';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useEntityChangeEffect } from '@/hooks/useEntityChangeEffect';
import { useDepartmentVisibility } from '@/hooks/useDepartmentVisibility';

export function useProductionOrders(): {
  orders: ProductionOrder[];
  allOrders: ProductionOrder[];
  reload: () => void;
} {
  const { entityCode } = useEntityCode();
  const visibility = useDepartmentVisibility('production');
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

  const visibleOrders = useMemo(() => {
    if (visibility.canViewAllDepartments) return orders;
    if (!visibility.myDepartmentId) return [];
    return orders.filter(o => o.department_id === visibility.myDepartmentId);
  }, [orders, visibility]);

  return { orders: visibleOrders, allOrders: orders, reload };
}
