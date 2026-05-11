/**
 * @file        src/lib/sitex-ra-bill-engine.ts
 * @purpose     SiteX RA Bill canonical engine · Path B own entity · 5th Path B consumer · sub-contractor running-account bills · Bill Passing consumer (zero-touch)
 * @who         Site Manager · Site Finance · Procurement
 * @when        2026-05-11
 * @sprint      T-Phase-1.A.15a SiteX Closeout · Q-LOCK-4a · Block B.3 · NEW canonical
 * @iso         ISO 9001:2015 §8.4 · ISO 25010
 * @whom        Audit Owner
 * @decisions   D-NEW-CW POSSIBLE (Path B 5th consumer) · D-194 · FR-72 vendor_type candidate
 * @disciplines FR-1 · FR-19 · FR-22 · FR-30 · FR-50 · FR-51 · FR-56 · FR-73.1 absolute
 * @reuses      SiteRABill + RABillLineItem + RABillApprovalHistory from @/types/sitex
 * @[JWT]       POST /api/sitex/ra-bills · PATCH /api/sitex/ra-bills/:id/submit · PATCH /api/sitex/ra-bills/:id/approve
 */

import type {
  SiteRABill, RABillLineItem, RABillApprovalHistory,
} from '@/types/sitex';
import {
  siteRaBillsKey, raBillLinesKey, raBillApprovalsKey,
} from '@/types/sitex';

function readJSON<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch { return []; }
}
function writeJSON<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data));
}

export interface CreateRABillInput {
  site_id: string;
  vendor_id: string;
  vendor_type: 'supplier' | 'sub_contractor' | 'transporter';
  bill_no: string;
  period_from: string;
  period_to: string;
}

export function listRABills(entityCode: string): SiteRABill[] {
  return readJSON<SiteRABill>(siteRaBillsKey(entityCode));
}

export function getRABill(entityCode: string, id: string): SiteRABill | null {
  return listRABills(entityCode).find((b) => b.id === id) ?? null;
}

export function createRABill(
  entityCode: string, input: CreateRABillInput,
): { allowed: boolean; reason: string | null; ra_bill_id: string | null } {
  if (input.vendor_type !== 'sub_contractor') {
    return { allowed: false, reason: 'RA bills require vendor_type=sub_contractor (Q-LOCK-3a)', ra_bill_id: null };
  }
  const now = new Date().toISOString();
  const bill: SiteRABill = {
    id: `RA-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    site_id: input.site_id,
    vendor_id: input.vendor_id,
    bill_no: input.bill_no,
    period_from: input.period_from,
    period_to: input.period_to,
    total_value: 0,
    status: 'draft',
    created_at: now,
  };
  const all = listRABills(entityCode);
  all.push(bill);
  writeJSON(siteRaBillsKey(entityCode), all);
  return { allowed: true, reason: null, ra_bill_id: bill.id };
}

export function addRABillLineItem(
  entityCode: string, raBillId: string,
  line: Omit<RABillLineItem, 'id' | 'ra_bill_id' | 'amount' | 'cumulative_quantity' | 'cumulative_amount'>,
): { allowed: boolean; reason: string | null; line_id: string | null } {
  const lines = readJSON<RABillLineItem>(raBillLinesKey(entityCode));
  const prior = lines.filter((l) => l.ra_bill_id === raBillId && l.description === line.description);
  const cumQty = prior.reduce((s, l) => s + l.quantity_this_period, line.quantity_this_period);
  const amount = line.quantity_this_period * line.rate_per_unit;
  const cumAmt = prior.reduce((s, l) => s + l.amount, amount);
  const newLine: RABillLineItem = {
    id: `RAL-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    ra_bill_id: raBillId,
    ...line,
    amount,
    cumulative_quantity: cumQty,
    cumulative_amount: cumAmt,
  };
  lines.push(newLine);
  writeJSON(raBillLinesKey(entityCode), lines);

  // Update bill total
  const bills = listRABills(entityCode);
  const bill = bills.find((b) => b.id === raBillId);
  if (bill) {
    bill.total_value = lines.filter((l) => l.ra_bill_id === raBillId).reduce((s, l) => s + l.amount, 0);
    writeJSON(siteRaBillsKey(entityCode), bills);
  }
  return { allowed: true, reason: null, line_id: newLine.id };
}

export function listRABillLineItems(entityCode: string, raBillId: string): RABillLineItem[] {
  return readJSON<RABillLineItem>(raBillLinesKey(entityCode)).filter((l) => l.ra_bill_id === raBillId);
}

function appendApproval(entityCode: string, entry: Omit<RABillApprovalHistory, 'id'>): void {
  const apps = readJSON<RABillApprovalHistory>(raBillApprovalsKey(entityCode));
  apps.push({ id: `APP-${Date.now()}-${Math.floor(Math.random() * 1000)}`, ...entry });
  writeJSON(raBillApprovalsKey(entityCode), apps);
}

export function listRABillApprovalHistory(entityCode: string, raBillId: string): RABillApprovalHistory[] {
  return readJSON<RABillApprovalHistory>(raBillApprovalsKey(entityCode)).filter((a) => a.ra_bill_id === raBillId);
}

export function submitForApproval(
  entityCode: string, raBillId: string, actionBy: string,
): { allowed: boolean; reason: string | null } {
  const bills = listRABills(entityCode);
  const bill = bills.find((b) => b.id === raBillId);
  if (!bill) return { allowed: false, reason: 'Not found' };
  if (bill.status !== 'draft') return { allowed: false, reason: 'Only draft can be submitted' };
  bill.status = 'submitted';
  writeJSON(siteRaBillsKey(entityCode), bills);
  appendApproval(entityCode, { ra_bill_id: raBillId, action: 'submitted', action_by: actionBy, action_at: new Date().toISOString(), comments: '' });
  return { allowed: true, reason: null };
}

export function approveRABill(
  entityCode: string, raBillId: string, actionBy: string, comments: string,
): { allowed: boolean; reason: string | null } {
  const bills = listRABills(entityCode);
  const bill = bills.find((b) => b.id === raBillId);
  if (!bill) return { allowed: false, reason: 'Not found' };
  if (bill.status !== 'submitted') return { allowed: false, reason: 'Only submitted can be approved' };
  bill.status = 'approved';
  writeJSON(siteRaBillsKey(entityCode), bills);
  appendApproval(entityCode, { ra_bill_id: raBillId, action: 'approved', action_by: actionBy, action_at: new Date().toISOString(), comments });
  return { allowed: true, reason: null };
}

export function markPaid(
  entityCode: string, raBillId: string, actionBy: string, paymentVoucherId: string,
): { allowed: boolean; reason: string | null } {
  const bills = listRABills(entityCode);
  const bill = bills.find((b) => b.id === raBillId);
  if (!bill) return { allowed: false, reason: 'Not found' };
  if (bill.status !== 'approved') return { allowed: false, reason: 'Only approved can be paid' };
  bill.status = 'paid';
  writeJSON(siteRaBillsKey(entityCode), bills);
  appendApproval(entityCode, { ra_bill_id: raBillId, action: 'paid', action_by: actionBy, action_at: new Date().toISOString(), comments: paymentVoucherId });
  return { allowed: true, reason: null };
}

export function listRABillsBySite(entityCode: string, siteId: string): SiteRABill[] {
  return listRABills(entityCode).filter((b) => b.site_id === siteId);
}
