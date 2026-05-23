/** HK-6.T1 · §23 closure · FixedAssetRegister page smoke */
import { describe, it, expect } from 'vitest';
import * as mod from '@/pages/erp/accounting/capital-assets/FixedAssetRegister';

describe('FixedAssetRegister (HK-6.T1 · §23)', () => {
  it('exports default page', () => { expect(typeof mod.default).toBe('function'); });
  it('exports FixedAssetRegisterPanel', () => {
    expect(typeof mod.FixedAssetRegisterPanel).toBe('function');
  });
  it('default name is FixedAssetRegister', () => {
    expect(mod.default.name).toBe('FixedAssetRegister');
  });
});
