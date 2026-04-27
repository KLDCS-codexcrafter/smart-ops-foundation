/**
 * @file     StockTransferRegister.tsx
 * @purpose  Stock Transfer Register — inter-godown / inter-department dispatches.
 * @who      Operix Engineering (Lovable-generated, Claude-audited, Founder-owned)
 * @when     Created Apr-2026 · T10-pre.2d-B
 * @sprint   T10-pre.2d-B (original), T10-pre.2d-C (RegisterConfig now active)
 * @iso      Functional Suitability (HIGH) · Performance Efficiency (HIGH)
 * @consumers FinCorePage (switch 'fc-rpt-stock-transfer-register')
 */

import { useMemo } from 'react';
import type { Voucher, VoucherInventoryLine } from '@/types/voucher';
import { fmtDate } from '../reports/reportUtils';
import { RegisterGrid, StatusBadge } from '@/components/finecore/registers/RegisterGrid';
import type { RegisterColumn, RegisterMeta, SummaryCard } from '@/components/finecore/registers/RegisterTypes';
import type { FineCoreModule } from '@/components/finecore/DraftTray';

interface StockTransferRegisterProps {
  entityCode: string;
  onNavigate?: (module: FineCoreModule, initialFilters?: Record<string, unknown>) => void;
}

const totalQty = (lines?: VoucherInventoryLine[]) =>
  (lines ?? []).reduce((s, l) => s + (l.qty || 0), 0);

export function StockTransferRegisterPanel({ entityCode, onNavigate }: StockTransferRegisterProps) {
  const columns: RegisterColumn<Voucher>[] = useMemo(() => [
    { key: 'date',    label: 'Date',         render: v => fmtDate(v.date), exportKey: 'date', width: 'w-24' },
    { key: 'vno',     label: 'Voucher No',   render: v => <span className="font-mono">{v.voucher_no}</span>, exportKey: 'voucher_no', width: 'w-28', clickable: true },
    { key: 'from',    label: 'From Godown',  render: v => v.from_godown_name ?? v.dispatch_dept_name ?? '—', exportKey: v => v.from_godown_name ?? v.dispatch_dept_name ?? '', toggleKey: 'showGodownColumn' },
    { key: 'to',      label: 'To Godown',    render: v => v.to_godown_name ?? v.receive_dept_name ?? '—', exportKey: v => v.to_godown_name ?? v.receive_dept_name ?? '', toggleKey: 'showGodownColumn' },
    { key: 'items',   label: 'Items',        render: v => v.inventory_lines?.length ?? 0, exportKey: v => v.inventory_lines?.length ?? 0, toggleKey: 'showLineItemCount', align: 'right', width: 'w-16' },
    { key: 'qty',     label: 'Qty',          render: v => totalQty(v.inventory_lines).toFixed(2), exportKey: v => totalQty(v.inventory_lines), align: 'right' },
    { key: 'vehicle', label: 'Vehicle',      render: v => v.vehicle_no ?? '—', exportKey: 'vehicle_no', width: 'w-24' },
    { key: 'transp',  label: 'Transporter',  render: v => v.transporter ?? '—', exportKey: 'transporter' },
    { key: 'status',  label: 'Status',       render: v => <StatusBadge status={v.status ?? 'draft'} />, exportKey: 'status', toggleKey: 'showStatusColumn', align: 'center', width: 'w-24' },
  ], []);

  const meta: RegisterMeta = useMemo(() => ({
    registerCode: 'stock_transfer_register',
    title: 'Stock Transfer Register',
    voucherFilter: v => v.base_voucher_type === 'Stock Transfer',
    drillDownType: 'Stock Transfer',
  }), []);

  const summaryBuilder = (filtered: Voucher[]): SummaryCard[] => {
    const qty = filtered.reduce((s, v) => s + totalQty(v.inventory_lines), 0);
    return [
      { label: 'Vouchers',   value: String(filtered.length) },
      { label: 'Total Qty',  value: qty.toFixed(2) },
      { label: 'In Transit', value: String(filtered.filter(v => v.status === 'in_transit').length), tone: 'warning' },
      { label: 'Received',   value: String(filtered.filter(v => v.status === 'received').length), tone: 'positive' },
      { label: 'Draft',      value: String(filtered.filter(v => v.status === 'draft').length) },
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

export default StockTransferRegisterPanel;
