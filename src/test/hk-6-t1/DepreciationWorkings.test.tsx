/** HK-6.T1 · §23 closure · DepreciationWorkings page smoke */
import { describe, it, expect } from 'vitest';
import * as mod from '@/pages/erp/accounting/capital-assets/DepreciationWorkings';

describe('DepreciationWorkings (HK-6.T1 · §23)', () => {
  it('exports default page', () => { expect(typeof mod.default).toBe('function'); });
  it('exports DepreciationWorkingsPanel', () => {
    expect(typeof mod.DepreciationWorkingsPanel).toBe('function');
  });
  it('default name is DepreciationWorkings', () => {
    expect(mod.default.name).toBe('DepreciationWorkings');
  });
});
