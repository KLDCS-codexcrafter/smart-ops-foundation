/**
 * @file     ReceiptNoteRegister.tsx
 * @purpose  Receipt Note (GRN) Register — inward goods receipt documents.
 * @who      Operix Engineering (Lovable-generated, Claude-audited, Founder-owned)
 * @when     Created Apr-2026 · T10-pre.2d-B
 * @sprint   T10-pre.2d-B
 * @iso      Functional Suitability (HIGH) · Performance Efficiency (HIGH)
 * @consumers FinCorePage (switch 'fc-rpt-receipt-note-register')
 */

import { useMemo } from 'react';
import type { Voucher, VoucherInventoryLine } from '@/types/voucher';
import { fmtDate } from '../reports/reportUtils';
import { RegisterGrid, StatusBadge } from '@/components/finecore/registers/RegisterGrid';
import type { RegisterColumn, RegisterMeta, SummaryCard } from '@/components/finecore/registers/RegisterTypes';
import type { FineCoreModule } from '@/components/finecore/DraftTray';

interface ReceiptNoteRegisterProps {
  entityCode: string;
  onNavigate?: (module: FineCoreModule, initialFilters?: Record<string, unknown>) => void;
}

const totalQty = (lines?: VoucherInventoryLine[]) =>
  (lines ?? []).reduce((s, l) => s + (l.qty || 0), 0);

const primaryGodown = (lines?: VoucherInventoryLine[]) => {
  const set = new Set((lines ?? []).map(l => l.godown_name).filter(Boolean));
  if (set.size === 0) return '—';
  if (set.size === 1) return Array.from(set)[0];
  return `${set.size} godowns`;
};

export function ReceiptNoteRegisterPanel({ entityCode, onNavigate }: ReceiptNoteRegisterProps) {
  const columns: RegisterColumn<Voucher>[] = useMemo(() => [
    { key: 'date',     label: 'Date',          render: v => fmtDate(v.date), exportKey: 'date', width: 'w-24' },
    { key: 'vno',      label: 'Voucher No',    render: v => <span className="font-mono">{v.voucher_no}</span>, exportKey: 'voucher_no', width: 'w-28' },
    { key: 'party',    label: 'Vendor',        render: v => v.party_name ?? '—', exportKey: 'party_name', toggleKey: 'showPartyColumn' },
    { key: 'challan',  label: 'Vendor Challan',render: v => v.vendor_bill_no ?? v.ref_no ?? '—', exportKey: v => v.vendor_bill_no ?? v.ref_no ?? '' },
    { key: 'items',    label: 'Items',         render: v => v.inventory_lines?.length ?? 0, exportKey: v => v.inventory_lines?.length ?? 0, toggleKey: 'showLineItemCount', align: 'right', width: 'w-16' },
    { key: 'qty',      label: 'Total Qty',     render: v => totalQty(v.inventory_lines).toFixed(2), exportKey: v => totalQty(v.inventory_lines), align: 'right' },
    { key: 'godown',   label: 'Godown',        render: v => primaryGodown(v.inventory_lines), exportKey: v => primaryGodown(v.inventory_lines) ?? '', toggleKey: 'showGodownColumn' },
    { key: 'vehicle',  label: 'Vehicle',       render: v => v.vehicle_no ?? '—', exportKey: 'vehicle_no', width: 'w-24' },
    { key: 'status',   label: 'Status',        render: v => <StatusBadge status={v.status ?? 'draft'} />, exportKey: 'status', toggleKey: 'showStatusColumn', align: 'center', width: 'w-24' },
  ], []);

  const meta: RegisterMeta = useMemo(() => ({
    registerCode: 'receipt_note_register',
    title: 'Receipt Note Register',
    voucherFilter: v => v.base_voucher_type === 'Receipt Note',
    drillDownType: 'Receipt Note',
  }), []);

  const summaryBuilder = (filtered: Voucher[]): SummaryCard[] => {
    const qty = filtered.reduce((s, v) => s + totalQty(v.inventory_lines), 0);
    const items = filtered.reduce((s, v) => s + (v.inventory_lines?.length ?? 0), 0);
    return [
      { label: 'Vouchers',   value: String(filtered.length) },
      { label: 'Line Items', value: String(items) },
      { label: 'Total Qty',  value: qty.toFixed(2) },
      { label: 'Posted',     value: String(filtered.filter(v => v.status === 'posted').length), tone: 'positive' },
      { label: 'Draft',      value: String(filtered.filter(v => v.status === 'draft').length), tone: 'warning' },
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

export default ReceiptNoteRegisterPanel;
