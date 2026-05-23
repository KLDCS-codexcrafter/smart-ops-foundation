/**
 * @file        src/test/sales-production-bridge.test.ts
 * @sprint      T-Phase-3.PROD-1 · ST11 · Q-LOCK-16 (deferred backfill canon · HK-6.T1)
 * @purpose     Minimal coverage of the 30th SIBLING · 6 cases.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  convertSalesOrderToProductionPlanDraft,
  listProductionEligibleSalesOrders,
  getProductionLineageFromSO,
  getSOFulfillmentSummary,
} from '@/lib/sales-production-bridge';
import type { Order } from '@/types/order';
import { ordersKey } from '@/types/order';
import type { Bom } from '@/types/bom';
import { bomKey } from '@/types/bom';

const ENTITY = 'TEST-SPB';
const USER = { id: 'u1', name: 'Tester' };

function mkOrder(over: Partial<Order> & { id: string; order_no: string; lines: Order['lines'] }): Order {
  return {
    base_voucher_type: 'Sales Order',
    entity_id: ENTITY,
    date: '2026-05-01',
    party_id: 'p-1',
    party_name: 'Acme Customer',
    gross_amount: 0, total_tax: 0, net_amount: 0,
    narration: '', terms_conditions: '',
    status: 'open',
    created_at: '2026-05-01T00:00:00Z',
    updated_at: '2026-05-01T00:00:00Z',
    ...over,
  };
}

function mkLine(id: string, item_id: string, item_name: string, qty: number) {
  return {
    id, item_id, item_code: item_id, item_name,
    hsn_sac_code: '8428', qty, uom: 'NOS', rate: 100,
    discount_percent: 0, taxable_value: qty * 100, gst_rate: 18,
    pending_qty: qty, fulfilled_qty: 0,
    status: 'open' as const,
  };
}

function seedBom(itemId: string): Bom {
  return {
    id: `bom-${itemId}`,
    entity_id: ENTITY,
    product_item_id: itemId,
    product_item_name: itemId,
    product_item_code: itemId,
    version: 1,
    is_active: true,
    is_default: true,
    output_qty: 1,
    output_uom: 'NOS',
    components: [],
    created_at: '2026-05-01T00:00:00Z',
    updated_at: '2026-05-01T00:00:00Z',
    created_by: 'seed',
    updated_by: 'seed',
  } as unknown as Bom;
}

describe('sales-production-bridge (30th SIBLING)', () => {
  beforeEach(() => {
    localStorage.clear();
    const bomable = seedBom('IT-A');
    localStorage.setItem(bomKey(ENTITY), JSON.stringify([bomable]));
    const orders: Order[] = [
      mkOrder({ id: 'so-1', order_no: 'SO/T/0001', lines: [mkLine('l1', 'IT-A', 'Item A', 10)] }),
      mkOrder({ id: 'so-2', order_no: 'SO/T/0002', lines: [mkLine('l1', 'IT-B', 'Item B', 5)] }),
      mkOrder({
        id: 'so-3', order_no: 'SO/T/0003',
        lines: [mkLine('l1', 'IT-A', 'Item A', 8), mkLine('l2', 'IT-B', 'Item B', 3)],
      }),
    ];
    localStorage.setItem(ordersKey(ENTITY), JSON.stringify(orders));
  });

  it('convertSalesOrderToProductionPlanDraft creates a plan with BOM-eligible lines only', () => {
    const res = convertSalesOrderToProductionPlanDraft({
      sales_order_id: 'so-3', entity_code: ENTITY, user: USER,
    });
    expect(res.plan_id).toBeTruthy();
    expect(res.line_count).toBe(1); // only IT-A eligible
    expect(res.warnings.some(w => w.includes('Item B'))).toBe(true);
  });

  it('listProductionEligibleSalesOrders filters by BOM availability', () => {
    const list = listProductionEligibleSalesOrders(ENTITY);
    const ids = list.map(o => o.id);
    expect(ids).toContain('so-1');
    expect(ids).toContain('so-3');
    expect(ids).not.toContain('so-2'); // no BOM
  });

  it('getProductionLineageFromSO returns empty lineage when no plan exists', () => {
    const lineage = getProductionLineageFromSO('so-1', ENTITY);
    expect(lineage.production_plans).toHaveLength(0);
    expect(lineage.production_orders).toHaveLength(0);
    expect(lineage.fulfillment_pct).toBe(0);
  });

  it('getProductionLineageFromSO surfaces plan after conversion', () => {
    convertSalesOrderToProductionPlanDraft({
      sales_order_id: 'so-1', entity_code: ENTITY, user: USER,
    });
    const lineage = getProductionLineageFromSO('so-1', ENTITY);
    expect(lineage.production_plans.length).toBeGreaterThan(0);
  });

  it('getSOFulfillmentSummary computes per-SO rows with zero fulfillment baseline', () => {
    const rows = getSOFulfillmentSummary(ENTITY);
    expect(rows).toHaveLength(3);
    expect(rows.every(r => r.fulfillment_pct === 0)).toBe(true);
    expect(rows.every(r => r.status === 'not_started')).toBe(true);
  });

  it('throws when SO has no BOM-eligible lines at all', () => {
    expect(() =>
      convertSalesOrderToProductionPlanDraft({
        sales_order_id: 'so-2', entity_code: ENTITY, user: USER,
      }),
    ).toThrow(/No BOM-eligible/);
  });
});
