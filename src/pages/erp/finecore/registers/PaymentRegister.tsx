/**
 * @file     PaymentRegister.tsx
 * @purpose  Payment Register — chronological listing of all Payment vouchers.
 * @who      Operix Engineering (Lovable-generated, Claude-audited, Founder-owned)
 * @when     Created Apr-2026 · T10-pre.2d-B
 * @sprint   T10-pre.2d-B (original), T10-pre.2d-C (RegisterConfig now active)
 * @iso      Functional Suitability (HIGH) · Performance Efficiency (HIGH)
 * @whom     Accountants · auditors · cashbook teams
 * @consumers FinCorePage (switch 'fc-rpt-payment-register')
 */

import { useMemo } from 'react';
import type { Voucher } from '@/types/voucher';
import { inr, fmtDate } from '../reports/reportUtils';
import { RegisterGrid, StatusBadge } from '@/components/finecore/registers/RegisterGrid';
import type { RegisterColumn, RegisterMeta, SummaryCard } from '@/components/finecore/registers/RegisterTypes';
import type { FineCoreModule } from '@/components/finecore/DraftTray';

interface PaymentRegisterProps {
  entityCode: string;
  onNavigate?: (module: FineCoreModule, initialFilters?: Record<string, unknown>) => void;
}

export function PaymentRegisterPanel({ entityCode, onNavigate }: PaymentRegisterProps) {
  const columns: RegisterColumn<Voucher>[] = useMemo(() => [
    { key: 'date',   label: 'Date',          render: v => fmtDate(v.date), exportKey: 'date', width: 'w-24' },
    { key: 'vno',    label: 'Voucher No',    render: v => <span className="font-mono">{v.voucher_no}</span>, exportKey: 'voucher_no', width: 'w-28' },
    { key: 'party',  label: 'Party',         render: v => v.party_name ?? '—', exportKey: 'party_name', toggleKey: 'showPartyColumn' },
    { key: 'instr',  label: 'Instrument',    render: v => v.instrument_type ?? '—', exportKey: 'instrument_type', width: 'w-28' },
    { key: 'bank',   label: 'Bank',          render: v => v.bank_name ?? v.from_ledger_name ?? '—', exportKey: v => v.bank_name ?? v.from_ledger_name ?? '' },
    { key: 'amount', label: 'Amount',        render: v => inr(v.net_amount), exportKey: 'net_amount', align: 'right' },
    { key: 'status', label: 'Status',        render: v => <StatusBadge status={v.status ?? 'draft'} />, exportKey: 'status', toggleKey: 'showStatusColumn', align: 'center', width: 'w-24' },
    { key: 'narr',   label: 'Narration',     render: v => v.narration ?? '—', exportKey: 'narration', toggleKey: 'showNarrationColumn' },
  ], []);

  const meta: RegisterMeta = useMemo(() => ({
    registerCode: 'payment_register',
    title: 'Payment Register',
    voucherFilter: v => v.base_voucher_type === 'Payment',
    drillDownType: 'Payment',
  }), []);

  const summaryBuilder = (filtered: Voucher[]): SummaryCard[] => {
    const total = filtered.reduce((s, v) => s + v.net_amount, 0);
    const cheques = filtered.filter(v => (v.instrument_type ?? '').toLowerCase().includes('cheque')).length;
    const upi = filtered.filter(v => (v.instrument_type ?? '').toLowerCase() === 'upi').length;
    const bankTransfers = filtered.filter(v => ['NEFT','RTGS','IMPS'].includes(v.instrument_type ?? '')).length;
    return [
      { label: 'Vouchers',     value: String(filtered.length) },
      { label: 'Total Amount', value: inr(total), tone: 'negative' },
      { label: 'Cheques',      value: String(cheques) },
      { label: 'UPI',          value: String(upi) },
      { label: 'Bank Xfer',    value: String(bankTransfers) },
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

export default PaymentRegisterPanel;
