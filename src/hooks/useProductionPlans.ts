/**
 * @file     useProductionPlans.ts
 * @sprint   T-Phase-1.3-3a-pre-2.5 · Block E · D-541
 * @purpose  Department-scoped reader for Production Plans (mirrors useProductionOrders).
 */
import { useEffect, useMemo, useState, useCallback } from 'react';
import type { ProductionPlan } from '@/types/production-plan';
import { productionPlansKey } from '@/types/production-plan';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useEntityChangeEffect } from '@/hooks/useEntityChangeEffect';
import { useDepartmentVisibility } from '@/hooks/useDepartmentVisibility';

export function useProductionPlans(): {
  plans: ProductionPlan[];
  allPlans: ProductionPlan[];
  reload: () => void;
} {
  const { entityCode } = useEntityCode();
  const visibility = useDepartmentVisibility('production');
  const [plans, setPlans] = useState<ProductionPlan[]>([]);

  const reload = useCallback(() => {
    try {
      // [JWT] GET /api/production-plans/:entityCode
      const raw = localStorage.getItem(productionPlansKey(entityCode));
      setPlans(raw ? (JSON.parse(raw) as ProductionPlan[]) : []);
    } catch {
      setPlans([]);
    }
  }, [entityCode]);

  useEffect(() => { reload(); }, [reload]);
  useEntityChangeEffect(reload, [reload]);

  const visiblePlans = useMemo(() => {
    if (visibility.canViewAllDepartments) return plans;
    if (!visibility.myDepartmentId) return [];
    return plans.filter(p => p.department_id === visibility.myDepartmentId);
  }, [plans, visibility]);

  return { plans: visiblePlans, allPlans: plans, reload };
}
