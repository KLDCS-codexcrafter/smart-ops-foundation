/**
 * scheme-impact-engine.ts — Simulate scheme across distributor base
 * Pure function. No React, no localStorage.
 */

import type { Scheme } from '@/types/scheme';
import { applySchemes, totalSchemeDiscountPaise, type SchemeCart } from './scheme-engine';
import type { Distributor } from '@/types/distributor';
import type { DistributorOrder } from '@/types/distributor-order';

export interface ImpactRow {
  distributor_id: string;
  distributor_name: string;
  tier: string;
  recent_order_value_paise: number;
  projected_discount_paise: number;
  projected_impact_pct: number;
  eligible: boolean;
  note: string;
}

export interface ImpactSummary {
  scheme_id: string;
  scheme_name: string;
  eligible_count: number;
  total_discount_paise: number;
  avg_impact_pct: number;
  rows: ImpactRow[];
}

/** Simulate one scheme across distributor base. */
export function simulateSchemeImpact(
  scheme: Scheme,
  distributors: Distributor[],
  recentOrders: DistributorOrder[],
): ImpactSummary {
  const rows: ImpactRow[] = distributors.map(d => {
    const myOrders = recentOrders.filter(o => o.partner_id === d.id);
    const totalValue = myOrders.reduce((t, o) =>
      t + (o.lines?.reduce((s, l) => s + (l.total_paise ?? 0), 0) ?? 0), 0);
    if (totalValue === 0) {
      return {
        distributor_id: d.id, distributor_name: d.legal_name,
        tier: d.tier ?? 'bronze',
        recent_order_value_paise: 0, projected_discount_paise: 0,
        projected_impact_pct: 0, eligible: false, note: 'No recent orders',
      };
    }

    const latest = myOrders[0];
    const cart: SchemeCart = {
      audience: 'distributor',
      distributor_tier: (d.tier as 'gold' | 'silver' | 'bronze') ?? 'bronze',
      territory_id: d.territory_id ?? null,
      order_value_paise: totalValue,
      lines: (latest?.lines ?? []).map(l => ({
        line_id: l.id ?? 'ln',
        item_id: l.item_id,
        qty: l.qty ?? 0,
        unit_price_paise: l.rate_paise ?? 0,
        line_total_paise: l.total_paise ?? 0,
      })),
    };

    const applied = applySchemes(cart, [scheme]);
    const disc = totalSchemeDiscountPaise(applied);
    return {
      distributor_id: d.id, distributor_name: d.legal_name,
      tier: cart.distributor_tier ?? 'bronze',
      recent_order_value_paise: totalValue,
      projected_discount_paise: disc,
      projected_impact_pct: totalValue > 0 ? Math.round((disc / totalValue) * 10000) / 100 : 0,
      eligible: disc > 0,
      note: applied.length > 0 ? applied[0].note : 'Not eligible',
    };
  });

  const eligibleRows = rows.filter(r => r.eligible);
  return {
    scheme_id: scheme.id,
    scheme_name: scheme.name,
    eligible_count: eligibleRows.length,
    total_discount_paise: eligibleRows.reduce((t, r) => t + r.projected_discount_paise, 0),
    avg_impact_pct: eligibleRows.length === 0 ? 0 :
      Math.round(eligibleRows.reduce((t, r) => t + r.projected_impact_pct, 0) / eligibleRows.length * 100) / 100,
    rows,
  };
}
