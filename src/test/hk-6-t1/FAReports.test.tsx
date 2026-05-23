/** HK-6.T1 · §23 closure · FAReports page smoke */
import { describe, it, expect } from 'vitest';
import * as mod from '@/pages/erp/accounting/capital-assets/FAReports';
import { IT_ACT_RATES } from '@/types/fixed-asset';

describe('FAReports (HK-6.T1 · §23)', () => {
  it('exports default page', () => { expect(typeof mod.default).toBe('function'); });
  it('exports FAReportsPanel', () => {
    expect(typeof mod.FAReportsPanel).toBe('function');
  });
  it('IT Act 7-block rates available', () => {
    expect(Object.keys(IT_ACT_RATES).length).toBe(7);
    expect(IT_ACT_RATES['Computers & Software']).toBe(40);
    expect(IT_ACT_RATES['Building']).toBe(10);
  });
  it('default name is FAReports', () => {
    expect(mod.default.name).toBe('FAReports');
  });
});
