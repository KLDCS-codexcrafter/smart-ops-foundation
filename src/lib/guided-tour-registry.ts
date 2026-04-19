/**
 * guided-tour-registry.ts — Per-card tour steps + seen-state
 */

import type { CardId } from '@/types/card-entitlement';

export interface TourStep {
  title: string;
  body: string;
  highlight?: string;    // CSS selector to highlight (future; MVP shows centred)
}

export const TOURS: Partial<Record<CardId, TourStep[]>> = {
  'distributor-hub': [
    { title: 'Welcome to Distributor Hub', body: 'Your indigo-themed card for managing distributors. Each card works the same way.' },
    { title: 'Masters (CC replicas)', body: 'Sidebar has Masters, Transactions, Reports. Masters are read from Command Center.' },
    { title: 'Transactions', body: 'Everyday work — Credit Approvals, Dispute Queue, Intimation Queue, Broadcast.' },
    { title: 'Reports', body: 'Analytics on engagement, credit usage, disputes (Sprint 11b).' },
    { title: 'Nav helpers', body: 'Sidebar footer: Back and ERP Dashboard. Press ? for all shortcuts.' },
  ],
  'salesx': [
    { title: 'Welcome to SalesX', body: 'Orange-accented card for sales + CRM + field force.' },
    { title: 'MTR structure', body: 'Masters / Transactions / Reports — same pattern as every card.' },
    { title: 'Shortcuts', body: 'Ctrl+K command palette, Ctrl+Shift+F cross-card search, Alt+D to dashboard.' },
  ],
  'command-center': [
    { title: 'Command Center', body: 'Master source of truth. Every master here is the authoritative record; other cards read replicas.' },
    { title: '10 sections', body: 'Platform, Finance, CRM, Sales, Collection, Distributor, Inventory, Opening, Utilities, People Core.' },
    { title: 'Zoom in', body: 'Click any master to edit directly; changes propagate to other cards via replicas.' },
  ],
  'peoplepay': [
    { title: 'Welcome to PeoplePay', body: 'HR + payroll + attendance. Violet-themed card.' },
    { title: 'Employee master', body: 'Employees live here; also registered in Command Center > People Core.' },
  ],
  'finecore': [
    { title: 'Welcome to FineCore', body: 'Accounting core — vouchers, ledgers, journals, IRN / e-invoice / EWB.' },
    { title: 'Masters from CC', body: 'GST rates, TDS, HSN/SAC, voucher types all live in Command Center. FineCore consumes them.' },
  ],
  'receivx': [
    { title: 'Welcome to ReceivX', body: 'Amber-accented collections hub. Outstanding, PTP, dunning automation.' },
  ],
};

const SEEN_KEY = (card: CardId) => `erp_tour_seen_${card}`;

export function hasSeenTour(card: CardId): boolean {
  try { return localStorage.getItem(SEEN_KEY(card)) === '1'; }
  catch { return true; }
}

export function markTourSeen(card: CardId): void {
  try { localStorage.setItem(SEEN_KEY(card), '1'); }
  catch { /* ignore */ }
}

export function resetTour(card: CardId): void {
  try { localStorage.removeItem(SEEN_KEY(card)); }
  catch { /* ignore */ }
}
