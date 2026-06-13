/**
 * @sprint W1C-10 · T-W1C10-Smoke-Cleanup · F-3
 * Behavioral: belt-and-suspenders purge scan clears entity-suffixed keys even
 * when the seeder forgot to register them via recordDemoKeys.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { purgeDemoData } from '@/lib/demo-seed-manifest';

const ENTITY = 'PURGE_TEST_ENT';

describe('W1C-10 F-3 · purgeDemoData entity-suffix scan', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('removes keys ending in `_${entityCode}` that were never recorded in the manifest', () => {
    // Simulate a seeder that wrote canonical entity-scoped keys WITHOUT calling recordDemoKey
    localStorage.setItem(`erp_inventory_items_${ENTITY}`, JSON.stringify([{ id: 'a' }]));
    localStorage.setItem(`erp_customer_orders_${ENTITY}`, JSON.stringify([{ id: 'b' }]));
    localStorage.setItem(`erp_group_vouchers_${ENTITY}`, JSON.stringify([{ id: 'c' }]));
    // Unrelated entity must SURVIVE
    localStorage.setItem(`erp_inventory_items_OTHER_ENT`, JSON.stringify([{ id: 'survivor' }]));

    const result = purgeDemoData(ENTITY);

    // Belt-and-suspenders scan caught all 3 unregistered keys
    expect(result.keysRemoved).toBeGreaterThanOrEqual(3);
    expect(localStorage.getItem(`erp_inventory_items_${ENTITY}`)).toBeNull();
    expect(localStorage.getItem(`erp_customer_orders_${ENTITY}`)).toBeNull();
    expect(localStorage.getItem(`erp_group_vouchers_${ENTITY}`)).toBeNull();
    // Survivor guarantee
    expect(localStorage.getItem(`erp_inventory_items_OTHER_ENT`)).not.toBeNull();
  });

  it('still respects manifest-tracked keys and excludes the manifest + seeder tokens', () => {
    localStorage.setItem(`erp_x_${ENTITY}`, JSON.stringify([]));
    // Manifest itself must survive the scan loop (it gets removed by step 3 explicitly)
    const result = purgeDemoData(ENTITY);
    expect(result.keysRemoved).toBeGreaterThanOrEqual(1);
    expect(localStorage.getItem(`erp_x_${ENTITY}`)).toBeNull();
  });
});
