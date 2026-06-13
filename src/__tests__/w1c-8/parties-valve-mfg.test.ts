import { describe, it, expect } from 'vitest';
import {
  customersForArchetype, vendorsForArchetype,
  DEMO_CUSTOMERS, DEMO_VENDORS,
} from '@/data/demo-customers-vendors';

describe('W1C-8 · Block 2 · valve-mfg parties', () => {
  it('customersForArchetype("valve-mfg") returns water-works buyers', () => {
    const cs = customersForArchetype('valve-mfg');
    expect(cs.length).toBe(4);
    expect(cs.every(c => c._archetype === 'valve-mfg')).toBe(true);
    // Buyer mix: at least one municipal/PHED + one EPC
    expect(cs.some(c => /Municipal|PHED|Public Health/i.test(c.partyName))).toBe(true);
    expect(cs.some(c => /L&T|Wabag|EPC/i.test(c.partyName))).toBe(true);
  });
  it('vendorsForArchetype("valve-mfg") returns foundry + import + seat + fastener', () => {
    const vs = vendorsForArchetype('valve-mfg');
    expect(vs.length).toBe(4);
    expect(vs.some(v => v.vendorType === 'casting_foundry')).toBe(true);
    expect(vs.some(v => v.vendorType === 'import_supplier')).toBe(true);
    expect(vs.some(v => v.vendorType === 'rubber_seat_supplier')).toBe(true);
    expect(vs.some(v => v.vendorType === 'fastener_supplier')).toBe(true);
  });
  it('existing archetype counts are 0-DIFF', () => {
    expect(DEMO_CUSTOMERS.filter(c => c._archetype === 'trading').length).toBe(20);
    expect(DEMO_CUSTOMERS.filter(c => c._archetype === 'services').length).toBe(12);
    expect(DEMO_CUSTOMERS.filter(c => c._archetype === 'manufacturing').length).toBe(13);
    expect(DEMO_VENDORS.filter(v => v._archetype === 'trading').length).toBe(15);
    expect(DEMO_VENDORS.filter(v => v._archetype === 'services').length).toBe(10);
    expect(DEMO_VENDORS.filter(v => v._archetype === 'manufacturing').length).toBe(25);
  });
});
