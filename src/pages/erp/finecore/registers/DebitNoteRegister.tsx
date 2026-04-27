/**
 * @file     DebitNoteRegister.tsx
 * @purpose  Debit Note Register — purchase returns with GST reversal columns.
 * @who      Operix Engineering (Lovable-generated, Claude-audited, Founder-owned)
 * @when     Created Apr-2026 · T10-pre.2d-B
 * @sprint   T10-pre.2d-B (original), T10-pre.2d-C (RegisterConfig now active)
 * @iso      Functional Suitability (HIGH) · Performance Efficiency (HIGH)
 * @consumers FinCorePage (switch 'fc-rpt-debit-note-register')
 */

import { useMemo } from 'react';
import type { Voucher } from '@/types/voucher';
import { inr, fmtDate } from '../reports/reportUtils';
import { RegisterGrid, StatusBadge } from '@/components/finecore/registers/RegisterGrid';
import type { RegisterColumn, RegisterMeta, SummaryCard } from '@/components/finecore/registers/RegisterTypes';
import type { FineCoreModule } from '@/components/finecore/DraftTray';

interface DebitNoteRegisterProps {
  entityCode: string;
  onNavigate?: (module: FineCoreModule, initialFilters?: Record<string, unknown>) => void;
}

export function DebitNoteRegisterPanel({ entityCode, onNavigate }: DebitNoteRegisterProps) {
  const columns: RegisterColumn<Voucher>[] = useMemo(() => [
    { key: 'date',   label: 'Date',       render: v => fmtDate(v.date), exportKey: 'date', width: 'w-24' },
    { key: 'vno',    label: 'Voucher No', render: v => <span className="font-mono">{v.voucher_no}</span>, exportKey: 'voucher_no', width: 'w-28', clickable: true },
    { key: 'party',  label: 'Vendor',     render: v => v.party_name ?? '—', exportKey: 'party_name', toggleKey: 'showPartyColumn' },
    { key: 'gstin',  label: 'GSTIN',      render: v => v.party_gstin ?? '—', exportKey: 'party_gstin', width: 'w-36' },
    { key: 'ref',    label: 'Ref Invoice',render: v => v.ref_voucher_no ?? '—', exportKey: 'ref_voucher_no', width: 'w-28' },
    { key: 'items',  label: 'Items',      render: v => v.inventory_lines?.length ?? 0, exportKey: v => v.inventory_lines?.length ?? 0, toggleKey: 'showLineItemCount', align: 'right', width: 'w-16' },
    { key: 'taxable',label: 'Taxable',    render: v => inr(v.total_taxable), exportKey: 'total_taxable', align: 'right' },
    { key: 'cgst',   label: 'CGST',       render: v => inr(v.total_cgst), exportKey: 'total_cgst', toggleKey: 'showTaxColumns', align: 'right' },
    { key: 'sgst',   label: 'SGST',       render: v => inr(v.total_sgst), exportKey: 'total_sgst', toggleKey: 'showTaxColumns', align: 'right' },
    { key: 'igst',   label: 'IGST',       render: v => inr(v.total_igst), exportKey: 'total_igst', toggleKey: 'showTaxColumns', align: 'right' },
    { key: 'total',  label: 'Total',      render: v => inr(v.net_amount), exportKey: 'net_amount', align: 'right' },
    { key: 'status', label: 'Status',     render: v => <StatusBadge status={v.status ?? 'draft'} />, exportKey: 'status', toggleKey: 'showStatusColumn', align: 'center', width: 'w-24' },
  ], []);

  const meta: RegisterMeta = useMemo(() => ({
    registerCode: 'debit_note_register',
    title: 'Debit Note Register',
    voucherFilter: v => v.base_voucher_type === 'Debit Note',
    drillDownType: 'Debit Note',
  }), []);

  const summaryBuilder = (filtered: Voucher[]): SummaryCard[] => {
    const taxable = filtered.reduce((s, v) => s + v.total_taxable, 0);
    const totalTax = filtered.reduce((s, v) => s + v.total_cgst + v.total_sgst + v.total_igst, 0);
    const total = filtered.reduce((s, v) => s + v.net_amount, 0);
    return [
      { label: 'Vouchers',    value: String(filtered.length) },
      { label: 'Taxable',     value: inr(taxable) },
      { label: 'Total Tax',   value: inr(totalTax) },
      { label: 'Reversal',    value: inr(total), tone: 'negative' },
      { label: 'Posted',      value: String(filtered.filter(v => v.status === 'posted').length) },
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

export default DebitNoteRegisterPanel;
