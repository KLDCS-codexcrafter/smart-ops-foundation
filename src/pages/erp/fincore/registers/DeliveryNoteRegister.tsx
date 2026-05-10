/**
 * @file     DeliveryNoteRegister.tsx
 * @purpose  Delivery Note Register — outward dispatch documents.
 * @who      Operix Engineering (Lovable-generated, Claude-audited, Founder-owned)
 * @when     Created Apr-2026 · T10-pre.2d-B
 * @sprint   T10-pre.2d-B (original), T10-pre.2d-C (RegisterConfig now active)
 * @iso      Functional Suitability (HIGH) · Performance Efficiency (HIGH)
 * @consumers FinCorePage (switch 'fc-rpt-delivery-note-register')
 */

import { useMemo } from 'react';
import type { Voucher, VoucherInventoryLine } from '@/types/voucher';
import { fmtDate } from '../reports/reportUtils';
import { RegisterGrid, StatusBadge } from '@/components/finecore/registers/RegisterGrid';
import type { RegisterColumn, RegisterMeta, SummaryCard } from '@/components/finecore/registers/RegisterTypes';
import type { FineCoreModule } from '@/components/finecore/DraftTray';

interface DeliveryNoteRegisterProps {
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

export function DeliveryNoteRegisterPanel({ entityCode, onNavigate }: DeliveryNoteRegisterProps) {
  const columns: RegisterColumn<Voucher>[] = useMemo(() => [
    { key: 'date',    label: 'Date',           render: v => fmtDate(v.date), exportKey: 'date', width: 'w-24' },
    { key: 'vno',     label: 'Voucher No',     render: v => <span className="font-mono">{v.voucher_no}</span>, exportKey: 'voucher_no', width: 'w-28', clickable: true },
    { key: 'party',   label: 'Consignee',      render: v => v.party_name ?? '—', exportKey: 'party_name', toggleKey: 'showPartyColumn' },
    { key: 'gstin',   label: 'GSTIN',          render: v => v.party_gstin ?? '—', exportKey: 'party_gstin', width: 'w-36' },
    { key: 'items',   label: 'Items',          render: v => v.inventory_lines?.length ?? 0, exportKey: v => v.inventory_lines?.length ?? 0, toggleKey: 'showLineItemCount', align: 'right', width: 'w-16' },
    { key: 'qty',     label: 'Total Qty',      render: v => totalQty(v.inventory_lines).toFixed(2), exportKey: v => totalQty(v.inventory_lines), align: 'right' },
    { key: 'godown',  label: 'Godown',         render: v => primaryGodown(v.inventory_lines), exportKey: v => primaryGodown(v.inventory_lines) ?? '', toggleKey: 'showGodownColumn' },
    { key: 'vehicle', label: 'Vehicle',        render: v => v.vehicle_no ?? '—', exportKey: 'vehicle_no', width: 'w-24' },
    { key: 'status',  label: 'Status',         render: v => <StatusBadge status={v.status ?? 'draft'} />, exportKey: 'status', toggleKey: 'showStatusColumn', align: 'center', width: 'w-24' },
  ], []);

  const meta: RegisterMeta = useMemo(() => ({
    registerCode: 'delivery_note_register',
    title: 'Delivery Note Register',
    voucherFilter: v => v.base_voucher_type === 'Delivery Note',
    drillDownType: 'Delivery Note',
    reconciliationTarget: 'sales_register',
  }), []);

  const summaryBuilder = (filtered: Voucher[]): SummaryCard[] => {
    const qty = filtered.reduce((s, v) => s + totalQty(v.inventory_lines), 0);
    const items = filtered.reduce((s, v) => s + (v.inventory_lines?.length ?? 0), 0);
    return [
      { label: 'Vouchers',  value: String(filtered.length) },
      { label: 'Line Items',value: String(items) },
      { label: 'Total Qty', value: qty.toFixed(2) },
      { label: 'In Transit',value: String(filtered.filter(v => v.status === 'in_transit').length), tone: 'warning' },
      { label: 'Received',  value: String(filtered.filter(v => v.status === 'received').length), tone: 'positive' },
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

export default DeliveryNoteRegisterPanel;
