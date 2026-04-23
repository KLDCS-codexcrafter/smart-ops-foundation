/**
 * @file     JournalRegister.tsx
 * @purpose  Journal Register — JV vouchers with Dr/Cr totals.
 * @who      Operix Engineering (Lovable-generated, Claude-audited, Founder-owned)
 * @when     Created Apr-2026 · T10-pre.2d-B
 * @sprint   T10-pre.2d-B
 * @iso      Functional Suitability (HIGH) · Performance Efficiency (HIGH)
 * @whom     Accountants · auditors
 * @consumers FinCorePage (switch 'fc-rpt-journal-register')
 */

import { useMemo } from 'react';
import type { Voucher } from '@/types/voucher';
import { inr, fmtDate } from '../reports/reportUtils';
import { RegisterGrid, StatusBadge } from '@/components/finecore/registers/RegisterGrid';
import type { RegisterColumn, RegisterMeta, SummaryCard } from '@/components/finecore/registers/RegisterTypes';
import type { FineCoreModule } from '@/components/finecore/DraftTray';

interface JournalRegisterProps {
  entityCode: string;
  onNavigate?: (module: FineCoreModule, initialFilters?: Record<string, unknown>) => void;
}

const sumDr = (v: Voucher) => v.ledger_lines.reduce((s, l) => s + (l.dr_amount || 0), 0);
const sumCr = (v: Voucher) => v.ledger_lines.reduce((s, l) => s + (l.cr_amount || 0), 0);
const ledgerSummary = (v: Voucher) => {
  const names = v.ledger_lines.slice(0, 2).map(l => l.ledger_name).join(', ');
  return v.ledger_lines.length > 2 ? `${names} +${v.ledger_lines.length - 2}` : names || '—';
};

export function JournalRegisterPanel({ entityCode, onNavigate }: JournalRegisterProps) {
  const columns: RegisterColumn<Voucher>[] = useMemo(() => [
    { key: 'date',    label: 'Date',           render: v => fmtDate(v.date), exportKey: 'date', width: 'w-24' },
    { key: 'vno',     label: 'Voucher No',     render: v => <span className="font-mono">{v.voucher_no}</span>, exportKey: 'voucher_no', width: 'w-28' },
    { key: 'ledgers', label: 'Ledger Summary', render: v => ledgerSummary(v), exportKey: v => ledgerSummary(v) },
    { key: 'dr',      label: 'Dr Total',       render: v => inr(sumDr(v)), exportKey: v => sumDr(v), toggleKey: 'showDrCrColumns', align: 'right' },
    { key: 'cr',      label: 'Cr Total',       render: v => inr(sumCr(v)), exportKey: v => sumCr(v), toggleKey: 'showDrCrColumns', align: 'right' },
    { key: 'status',  label: 'Status',         render: v => <StatusBadge status={v.status ?? 'draft'} />, exportKey: 'status', toggleKey: 'showStatusColumn', align: 'center', width: 'w-24' },
    { key: 'narr',    label: 'Narration',      render: v => v.narration ?? '—', exportKey: 'narration', toggleKey: 'showNarrationColumn' },
  ], []);

  const meta: RegisterMeta = useMemo(() => ({
    registerCode: 'journal_register',
    title: 'Journal Register',
    voucherFilter: v => v.base_voucher_type === 'Journal',
    drillDownType: 'Journal',
  }), []);

  const summaryBuilder = (filtered: Voucher[]): SummaryCard[] => {
    const drTotal = filtered.reduce((s, v) => s + sumDr(v), 0);
    const crTotal = filtered.reduce((s, v) => s + sumCr(v), 0);
    return [
      { label: 'Vouchers',     value: String(filtered.length) },
      { label: 'Dr Total',     value: inr(drTotal) },
      { label: 'Cr Total',     value: inr(crTotal) },
      { label: 'Posted',       value: String(filtered.filter(v => v.status === 'posted').length) },
      { label: 'Draft',        value: String(filtered.filter(v => v.status === 'draft').length), tone: 'warning' },
    ];
  };

  return (
    <RegisterGrid
      entityCode={entityCode}
      meta={meta}
      columns={columns}
      summaryBuilder={summaryBuilder}
      onNavigateToDayBook={filters => onNavigate?.('fc-rpt-daybook', filters)}
    />
  );
}

export default JournalRegisterPanel;
