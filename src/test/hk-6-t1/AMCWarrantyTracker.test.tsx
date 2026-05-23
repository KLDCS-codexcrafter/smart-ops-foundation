/** HK-6.T1 · §23 closure · AMCWarrantyTracker page smoke */
import { describe, it, expect } from 'vitest';
import * as mod from '@/pages/erp/accounting/capital-assets/AMCWarrantyTracker';

describe('AMCWarrantyTracker (HK-6.T1 · §23)', () => {
  it('exports default page', () => { expect(typeof mod.default).toBe('function'); });
  it('exports AMCWarrantyTrackerPanel', () => {
    expect(typeof mod.AMCWarrantyTrackerPanel).toBe('function');
  });
  it('default name is AMCWarrantyTracker', () => {
    expect(mod.default.name).toBe('AMCWarrantyTracker');
  });
});
