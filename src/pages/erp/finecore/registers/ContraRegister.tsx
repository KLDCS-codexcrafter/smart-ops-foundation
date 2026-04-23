/**
 * @file     ContraRegister.tsx
 * @purpose  Contra Register — bank-to-bank, bank-to-cash, cash-to-bank vouchers.
 * @who      Operix Engineering (Lovable-generated, Claude-audited, Founder-owned)
 * @when     Created Apr-2026 · T10-pre.2d-B
 * @sprint   T10-pre.2d-B
 * @iso      Functional Suitability (HIGH) · Performance Efficiency (HIGH)
 * @whom     Accountants · auditors
 * @consumers FinCorePage (switch 'fc-rpt-contra-register')
 */

import { useMemo } from 'react';
import type { Voucher } from '@/types/voucher';
import { inr, fmtDate } from '../reports/reportUtils';
import { RegisterGrid, StatusBadge } from '@/components/finecore/registers/RegisterGrid';
import type { RegisterColumn, RegisterMeta, SummaryCard } from '@/components/finecore/registers/RegisterTypes';
import type { FineCoreModule } from '@/components/finecore/DraftTray';

interface ContraRegisterProps {
  entityCode: string;
  onNavigate?: (module: FineCoreModule, initialFilters?: Record<string, unknown>) => void;
}

export function ContraRegisterPanel({ entityCode, onNavigate }: ContraRegisterProps) {
  const columns: RegisterColumn<Voucher>[] = useMemo(() => [
    { key: 'date',   label: 'Date',       render: v => fmtDate(v.date), exportKey: 'date', width: 'w-24' },
    { key: 'vno',    label: 'Voucher No', render: v => <span className="font-mono">{v.voucher_no}</span>, exportKey: 'voucher_no', width: 'w-28' },
    { key: 'instr',  label: 'Instrument', render: v => v.instrument_type ?? '—', exportKey: 'instrument_type', width: 'w-28' },
    { key: 'ref',    label: 'Ref No',     render: v => v.instrument_ref_no ?? v.ref_no ?? '—', exportKey: v => v.instrument_ref_no ?? v.ref_no ?? '' },
    { key: 'dr',     label: 'Dr Amount',  render: v => inr(v.net_amount), exportKey: 'net_amount', toggleKey: 'showDrCrColumns', align: 'right' },
    { key: 'cr',     label: 'Cr Amount',  render: v => inr(v.net_amount), exportKey: 'net_amount', toggleKey: 'showDrCrColumns', align: 'right' },
    { key: 'status', label: 'Status',     render: v => <StatusBadge status={v.status ?? 'draft'} />, exportKey: 'status', toggleKey: 'showStatusColumn', align: 'center', width: 'w-24' },
    { key: 'narr',   label: 'Narration',  render: v => v.narration ?? '—', exportKey: 'narration', toggleKey: 'showNarrationColumn' },
  ], []);

  const meta: RegisterMeta = useMemo(() => ({
    registerCode: 'contra_register',
    title: 'Contra Register',
    voucherFilter: v => v.base_voucher_type === 'Contra',
    drillDownType: 'Contra',
  }), []);

  const summaryBuilder = (filtered: Voucher[]): SummaryCard[] => {
    const total = filtered.reduce((s, v) => s + v.net_amount, 0);
    const bankTransfers = filtered.filter(v => v.contra_mode === 'bank_transfer').length;
    const cashTransfers = filtered.filter(v => v.contra_mode === 'cash_transfer').length;
    return [
      { label: 'Vouchers',     value: String(filtered.length) },
      { label: 'Total Volume', value: inr(total) },
      { label: 'Bank Xfers',   value: String(bankTransfers) },
      { label: 'Cash Xfers',   value: String(cashTransfers) },
      { label: 'Posted',       value: String(filtered.filter(v => v.status === 'posted').length) },
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

export default ContraRegisterPanel;
