/**
 * @file     StockAdjustmentRegister.tsx
 * @purpose  Stock Adjustment Register — disambiguated subset of base 'Stock Journal'
 *           where voucher_type_name === 'Stock Adjustment'.
 * @who      Operix Engineering (Lovable-generated, Claude-audited, Founder-owned)
 * @when     Created Apr-2026 · T10-pre.2d-B
 * @sprint   T10-pre.2d-B (original), T10-pre.2d-C (RegisterConfig now active)
 * @iso      Functional Suitability (HIGH — disambiguation is the whole point)
 * @consumers FinCorePage (switch 'fc-rpt-stock-adjustment-register')
 */

import { useMemo } from 'react';
import type { Voucher, VoucherInventoryLine } from '@/types/voucher';
import { fmtDate } from '../reports/reportUtils';
import { RegisterGrid, StatusBadge } from '@/components/finecore/registers/RegisterGrid';
import type { RegisterColumn, RegisterMeta, SummaryCard } from '@/components/finecore/registers/RegisterTypes';
import type { FineCoreModule } from '@/components/finecore/DraftTray';

interface StockAdjustmentRegisterProps {
  entityCode: string;
  onNavigate?: (module: FineCoreModule, initialFilters?: Record<string, unknown>) => void;
}

const netQtyAdjust = (lines?: VoucherInventoryLine[]) =>
  (lines ?? []).reduce((s, l) => s + (l.qty || 0), 0);

const primaryGodown = (lines?: VoucherInventoryLine[]) => {
  const set = new Set((lines ?? []).map(l => l.godown_name).filter(Boolean));
  if (set.size === 0) return '—';
  if (set.size === 1) return Array.from(set)[0];
  return `${set.size} godowns`;
};

export function StockAdjustmentRegisterPanel({ entityCode, onNavigate }: StockAdjustmentRegisterProps) {
  const columns: RegisterColumn<Voucher>[] = useMemo(() => [
    { key: 'date',    label: 'Date',           render: v => fmtDate(v.date), exportKey: 'date', width: 'w-24' },
    { key: 'vno',     label: 'Voucher No',     render: v => <span className="font-mono">{v.voucher_no}</span>, exportKey: 'voucher_no', width: 'w-28', clickable: true },
    { key: 'dept',    label: 'Department',     render: v => v.department_name ?? '—', exportKey: 'department_name' },
    { key: 'items',   label: 'Items',          render: v => v.inventory_lines?.length ?? 0, exportKey: v => v.inventory_lines?.length ?? 0, toggleKey: 'showLineItemCount', align: 'right', width: 'w-16' },
    { key: 'netqty',  label: 'Net Qty Adjust', render: v => netQtyAdjust(v.inventory_lines).toFixed(2), exportKey: v => netQtyAdjust(v.inventory_lines), align: 'right' },
    { key: 'godown',  label: 'Godown',         render: v => primaryGodown(v.inventory_lines), exportKey: v => primaryGodown(v.inventory_lines) ?? '', toggleKey: 'showGodownColumn' },
    { key: 'status',  label: 'Status',         render: v => <StatusBadge status={v.status ?? 'draft'} />, exportKey: 'status', toggleKey: 'showStatusColumn', align: 'center', width: 'w-24' },
    { key: 'narr',    label: 'Narration',      render: v => v.narration ?? '—', exportKey: 'narration', toggleKey: 'showNarrationColumn' },
  ], []);

  const meta: RegisterMeta = useMemo(() => ({
    registerCode: 'stock_adjustment_register',
    title: 'Stock Adjustment Register',
    voucherFilter: v => v.base_voucher_type === 'Stock Journal' && v.voucher_type_name === 'Stock Adjustment',
    drillDownType: 'Stock Journal',
  }), []);

  const summaryBuilder = (filtered: Voucher[]): SummaryCard[] => {
    const totalNet = filtered.reduce((s, v) => s + netQtyAdjust(v.inventory_lines), 0);
    const items = filtered.reduce((s, v) => s + (v.inventory_lines?.length ?? 0), 0);
    return [
      { label: 'Vouchers',   value: String(filtered.length) },
      { label: 'Line Items', value: String(items) },
      { label: 'Net Qty',    value: totalNet.toFixed(2) },
      { label: 'Posted',     value: String(filtered.filter(v => v.status === 'posted').length) },
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

export default StockAdjustmentRegisterPanel;
