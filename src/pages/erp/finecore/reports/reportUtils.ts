/**
 * reportUtils.ts — Shared utilities for FC Sprint 2 report panels
 * L3→L2→L1 classification, Indian number formatting, date formatting
 */
import { L3_FINANCIAL_GROUPS, L2_PARENT_GROUPS } from '@/data/finframe-seed-data';
import type { JournalEntry } from '@/types/voucher';

/** Given L3 group code, return L1 code (A/L/CE/I/E) */
export function getL1Code(l3Code: string): string {
  const l3 = L3_FINANCIAL_GROUPS.find(g => g.code === l3Code);
  if (!l3) return '';
  const l2 = L2_PARENT_GROUPS.find(g => g.code === l3.l2Code);
  return l2?.l1Code ?? '';
}

/** Given L3 group code, return L2 code */
export function getL2Code(l3Code: string): string {
  const l3 = L3_FINANCIAL_GROUPS.find(g => g.code === l3Code);
  return l3?.l2Code ?? '';
}

/** Group journal entries by L1 nature for P&L / Balance Sheet */
export function groupByL1(entries: JournalEntry[]) {
  const out: Record<string, { dr: number; cr: number }> = {};
  for (const e of entries) {
    if (e.is_cancelled) continue;
    const l1 = getL1Code(e.ledger_group_code);
    if (!l1) continue;
    if (!out[l1]) out[l1] = { dr: 0, cr: 0 };
    out[l1].dr += e.dr_amount;
    out[l1].cr += e.cr_amount;
  }
  return out;
}

/** Group journal entries by L2 code with ledger-level detail */
export function groupByL2(entries: JournalEntry[]) {
  const out: Record<string, { l2Code: string; ledgers: Record<string, { name: string; dr: number; cr: number }> }> = {};
  for (const e of entries) {
    if (e.is_cancelled) continue;
    const l2 = getL2Code(e.ledger_group_code);
    if (!l2) continue;
    if (!out[l2]) out[l2] = { l2Code: l2, ledgers: {} };
    if (!out[l2].ledgers[e.ledger_id]) out[l2].ledgers[e.ledger_id] = { name: e.ledger_name, dr: 0, cr: 0 };
    out[l2].ledgers[e.ledger_id].dr += e.dr_amount;
    out[l2].ledgers[e.ledger_id].cr += e.cr_amount;
  }
  return out;
}

/** Format Indian number: 1234567 → "₹12,34,567" */
export function inr(n: number): string {
  return '₹' + Math.abs(n).toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

/** Format date for display */
export function fmtDate(d: string): string {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** Get current financial year start date */
export function fyStart(): string {
  const now = new Date();
  const y = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return `${y}-04-01`;
}

/** Today as YYYY-MM-DD */
export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Export CSV from rows */
export function exportCSV(filename: string, headers: string[], rows: string[][]) {
  const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${(c ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
