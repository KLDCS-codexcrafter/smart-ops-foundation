/** HK-6.T1 · §23 closure · AssetDisposal page smoke */
import { describe, it, expect } from 'vitest';
import * as mod from '@/pages/erp/accounting/capital-assets/AssetDisposal';

describe('AssetDisposal (HK-6.T1 · §23)', () => {
  it('exports default page', () => { expect(typeof mod.default).toBe('function'); });
  it('exports AssetDisposalPanel', () => {
    expect(typeof mod.AssetDisposalPanel).toBe('function');
  });
  it('default name is AssetDisposal', () => {
    expect(mod.default.name).toBe('AssetDisposal');
  });
  it('panel accepts entityCode prop', () => {
    expect(mod.AssetDisposalPanel.length).toBeGreaterThanOrEqual(1);
  });
});
