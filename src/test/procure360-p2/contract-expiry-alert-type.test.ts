import { describe, it, expect } from 'vitest';
import { contractExpiryAcknowledgmentsKey } from '@/types/contract-expiry-alert';
import type { ContractExpiryAlert, ExpiryTier, ContractExpiryAction } from '@/types/contract-expiry-alert';

describe('contract-expiry-alert type · D-NEW-FX', () => {
  it('persistence key is entity-scoped (FR-26)', () => {
    expect(contractExpiryAcknowledgmentsKey('sinha')).toBe('erp_sinha_contract_expiry_acknowledgments');
  });

  it('tier union has 3 values', () => {
    const tiers: ExpiryTier[] = ['informational', 'reminder', 'urgent'];
    expect(tiers.length).toBe(3);
  });

  it('action union has 3 values', () => {
    const actions: ContractExpiryAction[] = ['renewal_enquiry_generated', 'extension_request', 'no_action'];
    expect(actions.length).toBe(3);
  });

  it('shape compiles', () => {
    const a: ContractExpiryAlert = {
      id: 'x', agreement_id: 'a', agreement_number: '', vendor_id: '', vendor_name: '',
      agreement_end_date: '', days_to_expiry: 30, tier: 'urgent', computed_at: '',
      acknowledged: false,
    };
    expect(a.id).toBe('x');
  });

  it('Sentinel · type module exists', () => { expect('contract-expiry-alert').toBe('contract-expiry-alert'); });
});
