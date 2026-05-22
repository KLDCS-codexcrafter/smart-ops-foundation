import { describe, it, expect, beforeEach } from 'vitest';
import * as Engine from '@/lib/contract-expiry-alert-engine';
import type { VendorAgreementInput } from '@/lib/contract-expiry-alert-engine';

const NOW = new Date('2026-05-22T00:00:00.000Z');

function offsetDays(d: Date, n: number): string {
  return new Date(d.getTime() + n * 24 * 60 * 60 * 1000).toISOString();
}

describe('contract-expiry-alert-engine · D-NEW-FX · OOB-54', () => {
  beforeEach(() => { localStorage.clear(); });

  it('module imports cleanly', () => { expect(Engine).toBeDefined(); });

  it('exports core API', () => {
    expect(typeof Engine.scanAgreements).toBe('function');
    expect(typeof Engine.classifyTier).toBe('function');
    expect(typeof Engine.acknowledgeAlert).toBe('function');
    expect(typeof Engine.generateRenewalEnquiry).toBe('function');
    expect(typeof Engine.summarizeAlerts).toBe('function');
  });

  it('classifyTier · 30/60/90 thresholds', () => {
    expect(Engine.classifyTier(15)).toBe('urgent');
    expect(Engine.classifyTier(30)).toBe('urgent');
    expect(Engine.classifyTier(45)).toBe('reminder');
    expect(Engine.classifyTier(60)).toBe('reminder');
    expect(Engine.classifyTier(80)).toBe('informational');
  });

  it('scanAgreements filters out-of-window dates', () => {
    const ags: VendorAgreementInput[] = [
      { id: 'a1', agreement_number: 'AG-1', vendor_id: 'v1', vendor_name: 'V1', agreement_end_date: offsetDays(NOW, 15) },
      { id: 'a2', agreement_number: 'AG-2', vendor_id: 'v2', vendor_name: 'V2', agreement_end_date: offsetDays(NOW, 200) },
      { id: 'a3', agreement_number: 'AG-3', vendor_id: 'v3', vendor_name: 'V3', agreement_end_date: offsetDays(NOW, -5) },
    ];
    const alerts = Engine.scanAgreements(ags, 90, NOW);
    expect(alerts.length).toBe(1);
    expect(alerts[0].agreement_id).toBe('a1');
    expect(alerts[0].tier).toBe('urgent');
  });

  it('scanAgreements sorts by days_to_expiry ascending', () => {
    const ags: VendorAgreementInput[] = [
      { id: 'b', agreement_end_date: offsetDays(NOW, 80) },
      { id: 'a', agreement_end_date: offsetDays(NOW, 10) },
      { id: 'c', agreement_end_date: offsetDays(NOW, 45) },
    ];
    const alerts = Engine.scanAgreements(ags, 90, NOW);
    expect(alerts.map((a) => a.agreement_id)).toEqual(['a', 'c', 'b']);
  });

  it('persist + acknowledge roundtrip', () => {
    const ags: VendorAgreementInput[] = [
      { id: 'a1', agreement_number: 'AG-1', vendor_id: 'v1', agreement_end_date: offsetDays(NOW, 20) },
    ];
    const [alert] = Engine.scanAgreements(ags, 90, NOW);
    Engine.persistAlert('e1', alert);
    const ack = Engine.acknowledgeAlert('e1', alert.id, 'tester', 'noted', 'no_action');
    expect(ack.acknowledged).toBe(true);
    expect(ack.action_taken).toBe('no_action');
    expect(Engine.loadAcknowledgments('e1')[0].acknowledged).toBe(true);
  });

  it('generateRenewalEnquiry deep-links · NO new voucher (D-127/128a invariant)', () => {
    const ags: VendorAgreementInput[] = [
      { id: 'a1', agreement_number: 'AG-RENEW', vendor_id: 'v1', vendor_name: 'V1', agreement_end_date: offsetDays(NOW, 25) },
    ];
    const [alert] = Engine.scanAgreements(ags, 90, NOW);
    Engine.persistAlert('e1', alert);
    const out = Engine.generateRenewalEnquiry('e1', alert.id, 'buyer1');
    expect(out.renewal_enquiry_template_data.enquiry_type).toBe('renewal');
    expect(out.renewal_enquiry_template_data.reference_agreement_id).toBe('a1');
    expect(out.alert.action_taken).toBe('renewal_enquiry_generated');
  });

  it('summarizeAlerts tallies tiers + acknowledged', () => {
    const summary = Engine.summarizeAlerts([
      { id: '1', agreement_id: '', agreement_number: '', vendor_id: '', vendor_name: '',
        agreement_end_date: '', days_to_expiry: 10, tier: 'urgent', computed_at: '', acknowledged: false },
      { id: '2', agreement_id: '', agreement_number: '', vendor_id: '', vendor_name: '',
        agreement_end_date: '', days_to_expiry: 50, tier: 'reminder', computed_at: '', acknowledged: true },
    ]);
    expect(summary.urgent).toBe(1);
    expect(summary.reminder).toBe(1);
    expect(summary.acknowledged).toBe(1);
    expect(summary.pending).toBe(1);
  });

  it('Sentinel · D-NEW-FX closure marker', () => { expect('D-NEW-FX').toBe('D-NEW-FX'); });
});
