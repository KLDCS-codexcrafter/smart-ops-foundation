/**
 * @file        daybook-sources.ts
 * @sprint      RPT-3a · DayBook Generalize + Source Registry
 * @purpose     Side-effect module that registers every card's DayBook source.
 *              Wraps the SAME data each existing page already loads — pages
 *              are NOT modified. Idempotent: importing twice is a no-op.
 *
 * Sources registered (7):
 *   - fc-fincore-daybook  · finance              · vouchers (fincore)
 *   - ph-payhub-daybook   · people               · payroll runs
 *   - sd-service-daybook  · service              · service tickets (raised/resolved/closed)
 *   - p360-goods-inward   · procure              · GIT stage-1 receipts
 *   - mp-maintenance-entry · maintenance-entry   · breakdowns + work orders
 *   - mp-spares-issue     · maintenance-spares   · spares issue ledger
 *   - ex-custom           · eximx                · TT outward payments
 */

import { vouchersKey } from '@/lib/fincore-engine';
import { payrollRunsKey } from '@/types/payroll-run';
import type { Voucher } from '@/types/voucher';
import type { PayrollRun } from '@/types/payroll-run';
import { listServiceTickets } from '@/lib/servicedesk-engine';
import { listGitStage1 } from '@/lib/git-engine';
import { listBreakdownReports, listWorkOrders, listSparesIssues } from '@/lib/maintainpro-engine';
import { loadTTPayments } from '@/lib/tt-payment-engine';
import {
  registerDayBookSource,
  type DayBookEntry,
} from './daybook-source-registry';

function safeRead<T>(key: string): T[] {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

const TYPE_TO_MODULE: Record<string, string> = {
  Sales: 'fc-txn-sales-invoice',
  Purchase: 'fc-txn-purchase-invoice',
  Receipt: 'fc-txn-receipt',
  Payment: 'fc-txn-payment',
  Journal: 'fc-txn-journal',
  Contra: 'fc-txn-contra',
  'Credit Note': 'fc-txn-credit-note',
  'Debit Note': 'fc-txn-debit-note',
  'Delivery Note': 'fc-txn-delivery-note',
  'Receipt Note': 'fc-txn-receipt-note',
  'Stock Journal': 'fc-inv-stock-journal',
};

export function registerAllDayBookSources(): void {
  // ── finance · fincore ────────────────────────────────────────────────
  registerDayBookSource({
    cardId: 'fc-fincore-daybook',
    domain: 'finance',
    label: 'FinCore Day Book',
    read: (entityCode): DayBookEntry[] => {
      const vouchers = safeRead<Voucher>(vouchersKey(entityCode));
      return vouchers
        .filter((v) => !v.is_cancelled)
        .map((v) => ({
          id: v.id,
          date: v.date,
          time: v.updated_at?.slice(11, 16) ?? '',
          type: v.base_voucher_type,
          reference: v.voucher_no,
          party: v.party_name ?? '',
          amount: v.net_amount,
          status: v.status,
          module: TYPE_TO_MODULE[v.base_voucher_type] ?? 'fc-hub',
        }));
    },
  });

  // ── people · pay-hub ─────────────────────────────────────────────────
  registerDayBookSource({
    cardId: 'ph-payhub-daybook',
    domain: 'people',
    label: 'PayHub Day Book',
    read: (entityCode): DayBookEntry[] => {
      const runs = safeRead<PayrollRun>(payrollRunsKey(entityCode));
      return runs.map((r) => ({
        id: r.id,
        date: r.updated_at?.slice(0, 10) ?? r.payPeriod + '-28',
        time: r.updated_at?.slice(11, 16) ?? '',
        type: 'Payroll Run',
        reference: r.periodLabel,
        party: `${r.totalEmployees} employees`,
        amount: r.totalNet,
        status: r.status,
        module: 'ph-payroll-processing',
      }));
    },
  });

  // ── service · servicedesk ────────────────────────────────────────────
  registerDayBookSource({
    cardId: 'sd-service-daybook',
    domain: 'service',
    label: 'Service Day Book',
    read: (): DayBookEntry[] => {
      const out: DayBookEntry[] = [];
      for (const t of listServiceTickets()) {
        if (t.raised_at) out.push({
          id: `${t.id}-raised`, date: t.raised_at.slice(0, 10), time: t.raised_at.slice(11, 16),
          type: 'Ticket Raised', reference: t.ticket_no ?? t.id, party: t.customer_id ?? '',
          amount: 0, status: t.status ?? 'raised', module: 'sd-service-daybook',
        });
        if (t.resolved_at) out.push({
          id: `${t.id}-resolved`, date: t.resolved_at.slice(0, 10), time: t.resolved_at.slice(11, 16),
          type: 'Ticket Resolved', reference: t.ticket_no ?? t.id, party: t.customer_id ?? '',
          amount: 0, status: 'resolved', module: 'sd-service-daybook',
        });
        if (t.closed_at) out.push({
          id: `${t.id}-closed`, date: t.closed_at.slice(0, 10), time: t.closed_at.slice(11, 16),
          type: 'Ticket Closed', reference: t.ticket_no ?? t.id, party: t.customer_id ?? '',
          amount: 0, status: 'closed', module: 'sd-service-daybook',
        });
      }
      return out;
    },
  });

  // ── procure · GIT stage-1 ────────────────────────────────────────────
  registerDayBookSource({
    cardId: 'p360-goods-inward',
    domain: 'procure',
    label: 'Goods Inward Day Book',
    read: (entityCode): DayBookEntry[] =>
      listGitStage1(entityCode).map((g) => ({
        id: g.id,
        date: (g.receipt_date ?? '').slice(0, 10),
        time: (g.receipt_date ?? '').slice(11, 16),
        type: 'GIT Receipt',
        reference: g.git_no,
        party: g.vendor_name ?? '',
        amount: 0,
        status: g.status ?? 'open',
        module: 'p360-goods-inward',
      })),
  });

  // ── maintenance-entry · maintainpro ──────────────────────────────────
  registerDayBookSource({
    cardId: 'mp-maintenance-entry',
    domain: 'maintenance-entry',
    label: 'Maintenance Entry Day Book',
    read: (entityCode): DayBookEntry[] => {
      const breakdowns: DayBookEntry[] = listBreakdownReports(entityCode).map((b) => ({
        id: `b-${b.id}`,
        date: (b.occurred_at ?? '').slice(0, 10),
        time: (b.occurred_at ?? '').slice(11, 16),
        type: 'Breakdown',
        reference: b.equipment_id,
        party: b.attended_by_user_id ?? '',
        amount: 0,
        status: b.severity ?? 'open',
        module: 'mp-maintenance-entry',
      }));
      const wos: DayBookEntry[] = listWorkOrders(entityCode).map((w) => ({
        id: `w-${w.id}`,
        date: (w.created_at ?? '').slice(0, 10),
        time: (w.created_at ?? '').slice(11, 16),
        type: `Work Order ${w.wo_type ?? ''}`.trim(),
        reference: w.equipment_id,
        party: w.assigned_to_user_id ?? '',
        amount: 0,
        status: w.status ?? 'open',
        module: 'mp-maintenance-entry',
      }));
      return [...breakdowns, ...wos];
    },
  });

  // ── maintenance-spares · maintainpro ─────────────────────────────────
  registerDayBookSource({
    cardId: 'mp-spares-issue',
    domain: 'maintenance-spares',
    label: 'Spares Issue Day Book',
    read: (entityCode): DayBookEntry[] =>
      listSparesIssues(entityCode).map((s) => ({
        id: s.id,
        date: (s.issued_at ?? '').slice(0, 10),
        time: (s.issued_at ?? '').slice(11, 16),
        type: 'Spare Issue',
        reference: s.issue_no,
        party: s.consuming_equipment_id ?? '',
        amount: s.total_cost ?? 0,
        status: 'issued',
        module: 'mp-spares-issue',
      })),
  });

  // ── eximx · TT outward payments ──────────────────────────────────────
  registerDayBookSource({
    cardId: 'ex-custom',
    domain: 'eximx',
    label: 'EximX Custom Day Book',
    read: (entityCode): DayBookEntry[] =>
      loadTTPayments(entityCode)
        .filter((t) => !!t.credited_at)
        .map((t) => ({
          id: t.id ?? t.tt_payment_no,
          date: (t.credited_at ?? '').slice(0, 10),
          time: (t.credited_at ?? '').slice(11, 16),
          type: 'TT Outward',
          reference: t.tt_payment_no,
          party: t.related_foreign_vendor_id ?? '',
          amount: t.total_debit_inr ?? 0,
          status: 'credited',
          module: 'ex-custom',
        })),
  });
}

// Auto-register on import. Idempotent — safe to import from app init
// and from individual tests (later registrations replace earlier ones for the same key).
registerAllDayBookSources();
