/** HK-6.T1 · §23 closure · CWIPRegister page smoke */
import { describe, it, expect } from 'vitest';
import * as mod from '@/pages/erp/accounting/capital-assets/CWIPRegister';

describe('CWIPRegister (HK-6.T1 · §23)', () => {
  it('exports default page', () => { expect(typeof mod.default).toBe('function'); });
  it('exports CWIPRegisterPanel', () => {
    expect(typeof mod.CWIPRegisterPanel).toBe('function');
  });
  it('default name is CWIPRegister', () => {
    expect(mod.default.name).toBe('CWIPRegister');
  });
});
