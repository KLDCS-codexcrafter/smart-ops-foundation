/**
 * @file     StockJournalRegister.tsx
 * @purpose  Stock Journal Register — disambiguated subset of base 'Stock Journal'
 *           where voucher_type_name === 'Stock Journal'.
 * @who      Operix Engineering (Lovable-generated, Claude-audited, Founder-owned)
 * @when     Created Apr-2026 · T10-pre.2d-B
 * @sprint   T10-pre.2d-B (original), T10-pre.2d-C (RegisterConfig now active)
 * @iso      Functional Suitability (HIGH — disambiguation is the whole point)
 * @consumers FinCorePage (switch 'fc-rpt-stock-journal-register')
 */

import { useMemo } from 'react';
import type { Voucher, VoucherInventoryLine } from '@/types/voucher';
import { fmtDate } from '../reports/reportUtils';
import { RegisterGrid, StatusBadge } from '@/components/finecore/registers/RegisterGrid';
import type { RegisterColumn, RegisterMeta, SummaryCard } from '@/components/finecore/registers/RegisterTypes';
import type { FineCoreModule } from '@/components/finecore/DraftTray';

interface StockJournalRegisterProps {
  entityCode: string;
  onNavigate?: (module: FineCoreModule, initialFilters?: Record<string, unknown>) => void;
}

const consumptionLines = (lines?: VoucherInventoryLine[]) =>
  (lines ?? []).filter(l => l.mfg_line_type === 'consumption').length;

const productionLines = (lines?: VoucherInventoryLine[]) =>
  (lines ?? []).filter(l => l.mfg_line_type === 'production' || l.mfg_line_type === 'byproduct').length;

const netQty = (lines?: VoucherInventoryLine[]) =>
  (lines ?? []).reduce((s, l) => s + (l.qty || 0), 0);

export function StockJournalRegisterPanel({ entityCode, onNavigate }: StockJournalRegisterProps) {
  const columns: RegisterColumn<Voucher>[] = useMemo(() => [
    { key: 'date',    label: 'Date',              render: v => fmtDate(v.date), exportKey: 'date', width: 'w-24' },
    { key: 'vno',     label: 'Voucher No',        render: v => <span className="font-mono">{v.voucher_no}</span>, exportKey: 'voucher_no', width: 'w-28' },
    { key: 'purpose', label: 'Purpose',           render: v => v.purpose ?? '—', exportKey: 'purpose' },
    { key: 'cons',    label: 'Consumption Items', render: v => consumptionLines(v.inventory_lines), exportKey: v => consumptionLines(v.inventory_lines), align: 'right', width: 'w-32' },
    { key: 'prod',    label: 'Production Items',  render: v => productionLines(v.inventory_lines), exportKey: v => productionLines(v.inventory_lines), align: 'right', width: 'w-32' },
    { key: 'netqty',  label: 'Net Qty',           render: v => netQty(v.inventory_lines).toFixed(2), exportKey: v => netQty(v.inventory_lines), align: 'right' },
    { key: 'status',  label: 'Status',            render: v => <StatusBadge status={v.status ?? 'draft'} />, exportKey: 'status', toggleKey: 'showStatusColumn', align: 'center', width: 'w-24' },
  ], []);

  const meta: RegisterMeta = useMemo(() => ({
    registerCode: 'stock_journal_register',
    title: 'Stock Journal Register',
    voucherFilter: v => v.base_voucher_type === 'Stock Journal' && v.voucher_type_name === 'Stock Journal',
    drillDownType: 'Stock Journal',
  }), []);

  const summaryBuilder = (filtered: Voucher[]): SummaryCard[] => {
    const cons = filtered.reduce((s, v) => s + consumptionLines(v.inventory_lines), 0);
    const prod = filtered.reduce((s, v) => s + productionLines(v.inventory_lines), 0);
    return [
      { label: 'Vouchers',         value: String(filtered.length) },
      { label: 'Consumption Lines',value: String(cons) },
      { label: 'Production Lines', value: String(prod) },
      { label: 'Posted',           value: String(filtered.filter(v => v.status === 'posted').length) },
      { label: 'Draft',            value: String(filtered.filter(v => v.status === 'draft').length), tone: 'warning' },
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

export default StockJournalRegisterPanel;
