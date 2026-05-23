/**
 * HK-6.T1 · §23 closure · CapitalAssetMaster page-level smoke
 * Verifies module imports cleanly and exposes expected exports.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import * as mod from '@/pages/erp/accounting/capital-assets/CapitalAssetMaster';

describe('CapitalAssetMaster (HK-6.T1 · §23)', () => {
  beforeEach(() => { localStorage.clear(); });

  it('module exposes a default export (page component)', () => {
    expect(typeof mod.default).toBe('function');
  });

  it('module exposes named CapitalAssetMasterPanel', () => {
    expect(typeof mod.CapitalAssetMasterPanel).toBe('function');
  });

  it('default page name is CapitalAssetMaster', () => {
    expect(mod.default.name).toBe('CapitalAssetMaster');
  });

  it('panel accepts entityCode prop (arity >= 1)', () => {
    expect(mod.CapitalAssetMasterPanel.length).toBeGreaterThanOrEqual(1);
  });
});
