/**
 * @file        vendor-portal-commlog-engine.ts
 * @sprint      T-Phase-1.2.6f-b-1 · Block C.1
 * @purpose     Vendor-side filtering of CommunicationLog · grouped per RFQ.
 * @[JWT]       GET /api/vendor/portal/commlog
 */

import { type CommunicationLogEntry, communicationLogKey } from './vendor-rfq-notify';
import type { VendorPortalSession } from '@/types/vendor-portal';

export interface VendorCommLogThread {
  rfq_no: string;
  entries: CommunicationLogEntry[];
  last_activity_at: string;
  unread_count: number;
}

export function getVendorCommLogThreads(session: VendorPortalSession): VendorCommLogThread[] {
  // [JWT] GET /api/vendor/portal/commlog?vendor_id={x}&entity={y}
  let all: CommunicationLogEntry[] = [];
  try {
    const raw = localStorage.getItem(communicationLogKey(session.entity_code));
    all = raw ? (JSON.parse(raw) as CommunicationLogEntry[]) : [];
  } catch {
    return [];
  }
  const mine = all.filter(e => e.party_id === session.vendor_id);
  const buckets: Record<string, CommunicationLogEntry[]> = {};
  for (const e of mine) {
    const key = e.ref_rfq_no ?? 'no-rfq';
    (buckets[key] ??= []).push(e);
  }
  return Object.entries(buckets).map(([rfq_no, entries]) => {
    const sorted = [...entries].sort((a, b) => a.sent_at.localeCompare(b.sent_at));
    const last = sorted.reduce((max, e) => (e.sent_at > max ? e.sent_at : max), '');
    const unread = sorted.filter(e => e.status === 'sent' || e.status === 'queued').length;
    return { rfq_no, entries: sorted, last_activity_at: last, unread_count: unread };
  }).sort((a, b) => b.last_activity_at.localeCompare(a.last_activity_at));
}

export function markVendorThreadOpened(rfqNo: string, _session: VendorPortalSession): void {
  // Phase 1: activity is recorded by caller. Real "mark as opened" persists in Phase 1.4.
  void rfqNo;
}
