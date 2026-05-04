/**
 * rfq-engine-pre-close.test.ts — Sprint T-Phase-1.2.6f-d-2 · Block E
 * Validates D-300 computePreCloseRecommendation · Q6=A 3-trigger smart threshold.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { computePreCloseRecommendation } from '@/lib/rfq-engine';
import { rfqsKey, type RFQ } from '@/types/rfq';
import { vendorQuotationsKey } from '@/types/vendor-quotation';

const E = 'TST';

function seedRfq(overrides: Partial<RFQ>): RFQ {
  const now = new Date().toISOString();
  const rfq: RFQ = {
    id: 'rfq-test-1',
    rfq_no: 'RFQ/202605/0001',
    parent_enquiry_id: 'enq-1',
    entity_id: 'e1',
    vendor_id: 'v-1',
    vendor_name: 'Acme Suppliers',
    line_item_ids: ['item-1'],
    send_channels: ['internal'],
    primary_channel: 'internal',
    token_url: null,
    token_expires_at: null,
    sent_at: null,
    received_by_vendor_at: null,
    opened_at: null,
    responded_at: null,
    auto_fallback_enabled: true,
    timeout_days: 7,
    timeout_at: null,
    fallback_to_vendor_id: null,
    fallback_triggered_at: null,
    fallback_reason: null,
    declined_at: null,
    decline_reason: null,
    vendor_quotation_id: null,
    follow_ups: [],
    next_followup_due: null,
    followup_count_originating: 0,
    followup_count_purchase: 0,
    last_followup_at: null,
    is_overdue_followup: false,
    status: 'sent',
    created_at: now,
    updated_at: now,
    ...overrides,
  };
  localStorage.setItem(rfqsKey(E), JSON.stringify([rfq]));
  return rfq;
}

function seedQuotations(rfqId: string, count: number): void {
  // Engine only reads `parent_rfq_id` from each record (filter via getQuotationsByRfq).
  // We persist minimal shape directly to localStorage to avoid coupling the test
  // to the full VendorQuotation interface (which has 25+ fields irrelevant to pre-close logic).
  const list = Array.from({ length: count }, (_, i) => ({
    id: `vq-${i}`,
    parent_rfq_id: rfqId,
    vendor_id: `v-${i}`,
    vendor_name: `Vendor ${i}`,
  }));
  localStorage.setItem(vendorQuotationsKey(E), JSON.stringify(list));
}

beforeEach(() => {
  localStorage.removeItem(rfqsKey(E));
  localStorage.removeItem(vendorQuotationsKey(E));
});

describe('rfq-engine · computePreCloseRecommendation', () => {
  it('Trigger 1 · fires when deadline has passed and ≥1 quote is received', () => {
    const past = new Date(Date.now() - 86400000).toISOString();
    const earlier = new Date(Date.now() - 2 * 86400000).toISOString();
    const rfq = seedRfq({ status: 'sent', sent_at: earlier, timeout_at: past });
    seedQuotations(rfq.id, 1);

    const rec = computePreCloseRecommendation(rfq.id, E);
    expect(rec).not.toBeNull();
    expect(rec!.should_pre_close).toBe(true);
    expect(rec!.reason).toBe('deadline_passed_with_quotes');
    expect(rec!.vendors_quoted).toBe(1);
  });

  it('Trigger 3 · forced pre-close when deadline passed and 0 quotes', () => {
    const past = new Date(Date.now() - 86400000).toISOString();
    const earlier = new Date(Date.now() - 5 * 86400000).toISOString();
    const rfq = seedRfq({ status: 'sent', sent_at: earlier, timeout_at: past });

    const rec = computePreCloseRecommendation(rfq.id, E);
    expect(rec!.should_pre_close).toBe(true);
    expect(rec!.reason).toBe('deadline_passed_low_response');
    expect(rec!.vendors_quoted).toBe(0);
    expect(rec!.vendors_missing).toContain('Acme Suppliers');
  });

  it('Trigger 2 · early pre-close when ≥75% elapsed and quote received', () => {
    // Window of 4 days · 3 days have elapsed → 75% elapsed · 1 day remaining
    const sentAt = new Date(Date.now() - 3 * 86400000).toISOString();
    const timeoutAt = new Date(Date.now() + 86400000).toISOString();
    const rfq = seedRfq({ status: 'sent', sent_at: sentAt, timeout_at: timeoutAt });
    seedQuotations(rfq.id, 1);

    const rec = computePreCloseRecommendation(rfq.id, E);
    expect(rec!.should_pre_close).toBe(true);
    expect(rec!.reason).toBe('majority_quoted_early');
    expect(rec!.pct_elapsed).toBeGreaterThanOrEqual(75);
  });
});
