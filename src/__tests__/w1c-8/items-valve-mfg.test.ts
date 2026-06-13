import { describe, it, expect } from 'vitest';
import {
  DEMO_ITEMS_VALVE_MFG, DEMO_ITEMS_TRADING, DEMO_ITEMS_SERVICES, DEMO_ITEMS_MFG,
  itemsForArchetype,
} from '@/data/demo-items-master';

describe('W1C-8 · Block 1 · valve-mfg items', () => {
  it('itemsForArchetype("valve-mfg") returns the valve set', () => {
    const items = itemsForArchetype('valve-mfg');
    expect(items).toBe(DEMO_ITEMS_VALVE_MFG);
    expect(items.length).toBeGreaterThanOrEqual(10);
    expect(items.every(i => i._archetype === 'valve-mfg')).toBe(true);
  });
  it('valve set has real HSN coverage (8481/7307/4016/7318/7325)', () => {
    const hsns = new Set(DEMO_ITEMS_VALVE_MFG.map(i => i.hsn.slice(0, 4)));
    ['8481', '7307', '4016', '7318', '7325'].forEach(h => expect(hsns.has(h)).toBe(true));
  });
  it('valve set includes raw items for the BOM', () => {
    const raws = DEMO_ITEMS_VALVE_MFG.filter(i => i.itemType === 'raw_material');
    expect(raws.length).toBeGreaterThanOrEqual(2);
  });
  it('GST is 18% across the valve set (industrial valves/fittings)', () => {
    expect(DEMO_ITEMS_VALVE_MFG.every(i => i.gstRate === 18)).toBe(true);
  });
  it('existing archetype item sets are 0-DIFF (lengths)', () => {
    expect(DEMO_ITEMS_TRADING.length).toBe(15);
    expect(DEMO_ITEMS_SERVICES.length).toBe(8);
    expect(DEMO_ITEMS_MFG.length).toBe(20);
  });
});
