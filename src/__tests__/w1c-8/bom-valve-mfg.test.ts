import { describe, it, expect, beforeEach } from 'vitest';
import { DEMO_BOM_VALVE_MFG } from '@/data/demo-bom-data';
import { DEMO_ITEMS_VALVE_MFG } from '@/data/demo-items-master';
import { seedEntityDemoData } from '@/lib/demo-seed-orchestrator';

describe('W1C-8 · Block 3 · valve BOM', () => {
  it('valve BOM exists and is in canonical Bom shape', () => {
    expect(DEMO_BOM_VALVE_MFG.length).toBeGreaterThan(0);
    const bom = DEMO_BOM_VALVE_MFG[0];
    expect(bom.product_item_code).toBe('VLV-BFV-DN100');
    expect(bom.components.length).toBeGreaterThanOrEqual(3);
    expect(bom.is_active).toBe(true);
  });
  it('every BOM component_id resolves to a Block-1 valve item', () => {
    const itemIds = new Set(DEMO_ITEMS_VALVE_MFG.map(i => i.id));
    DEMO_BOM_VALVE_MFG[0].components.forEach(c => {
      expect(itemIds.has(c.item_id)).toBe(true);
    });
    // Parent FG also exists in the item set.
    expect(itemIds.has(DEMO_BOM_VALVE_MFG[0].product_item_id)).toBe(true);
  });
  it('orchestrator seeds the valve BOM under erp_bom_{entity} for valve-mfg', () => {
    beforeEach(() => localStorage.clear());
    localStorage.clear();
    seedEntityDemoData('SIGMA', 'valve-mfg');
    const raw = localStorage.getItem('erp_bom_SIGMA');
    expect(raw).toBeTruthy();
    const arr = JSON.parse(raw!);
    expect(arr.some((b: { product_item_code: string }) => b.product_item_code === 'VLV-BFV-DN100')).toBe(true);
  });
});
