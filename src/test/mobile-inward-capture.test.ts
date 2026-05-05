/**
 * mobile-inward-capture.test.ts — Sprint 6-pre-3 · Block J · D-369/370
 * Tests pure validation + engine integration for the mobile inward receipt flow.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  canProceedInward, EMPTY_INWARD_FORM_STATE,
  type InwardCaptureFormState,
} from '@/lib/mobile-inward-capture-validation';
import { listInwardReceipts } from '@/lib/inward-receipt-engine';
import { inwardReceiptsKey } from '@/types/inward-receipt';

const ENTITY = 'TST';

const baseLine = {
  item_id: 'i1', item_code: 'STL', item_name: 'Steel rod',
  uom: 'KG', expected_qty: 100, received_qty: 100,
  condition: 'ok' as const, photo_urls: [] as string[],
};

beforeEach(() => {
  localStorage.clear();
});

describe('MobileInwardReceiptCapture · canProceedInward (D-369)', () => {
  it('Step 1 · requires vendor name >= 2 chars', () => {
    expect(canProceedInward(EMPTY_INWARD_FORM_STATE, 1)).toBe(false);
    const s: InwardCaptureFormState = { ...EMPTY_INWARD_FORM_STATE, vendor_name: 'Acme' };
    expect(canProceedInward(s, 1)).toBe(true);
  });

  it('Step 2 · gate-pass link is optional · always proceeds', () => {
    expect(canProceedInward(EMPTY_INWARD_FORM_STATE, 2)).toBe(true);
  });

  it('Step 3 · requires at least 1 line with received_qty > 0', () => {
    const empty: InwardCaptureFormState = { ...EMPTY_INWARD_FORM_STATE, vendor_name: 'A' };
    expect(canProceedInward(empty, 3)).toBe(false);
    const zero: InwardCaptureFormState = {
      ...empty,
      lines: [{ ...baseLine, received_qty: 0 }],
    };
    expect(canProceedInward(zero, 3)).toBe(false);
    const ok: InwardCaptureFormState = {
      ...empty,
      lines: [{ ...baseLine }],
    };
    expect(canProceedInward(ok, 3)).toBe(true);
  });

  it('Step 4 · photos optional · always proceeds', () => {
    expect(canProceedInward(EMPTY_INWARD_FORM_STATE, 4)).toBe(true);
  });
});

describe('MobileInwardReceiptPage stats · D-368 absorption (D-370)', () => {
  it('listInwardReceipts returns released-today subset by status + released_at', () => {
    const today = new Date().toISOString().slice(0, 10);
    const seed = [
      { id: 'a', status: 'released', released_at: `${today}T10:00:00.000Z`, arrival_date: today, arrival_time: `${today}T10:00:00.000Z` },
      { id: 'b', status: 'released', released_at: '2025-01-01T10:00:00.000Z', arrival_date: today, arrival_time: `${today}T09:00:00.000Z` },
      { id: 'c', status: 'quarantine', released_at: null, arrival_date: today, arrival_time: `${today}T08:00:00.000Z` },
    ];
    localStorage.setItem(inwardReceiptsKey(ENTITY), JSON.stringify(seed));
    const all = listInwardReceipts(ENTITY);
    const releasedToday = all.filter(
      r => r.status === 'released' && (r.released_at ?? '').slice(0, 10) === today,
    );
    expect(all.length).toBe(3);
    expect(releasedToday.length).toBe(1);
    expect(releasedToday[0].id).toBe('a');
  });
});
