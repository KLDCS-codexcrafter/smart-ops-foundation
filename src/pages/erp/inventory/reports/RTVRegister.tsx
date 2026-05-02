/**
 * RTVRegister.tsx — Tally-Prime style Return-to-Vendor register on UTS foundation
 * Sprint T-Phase-1.2.6b · Card #2.6 sub-sprint 2 of 6 · D-226 UTS compliant · vendor-grouped + source GRN ref
 */

import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import { UniversalRegisterGrid } from '@/components/registers/UniversalRegisterGrid';
import { DrillBreadcrumb } from '@/components/registers/DrillBreadcrumb';
import { DrillSourceBanner } from '@/components/registers/DrillSourceBanner';
import { useDrillDown } from '@/hooks/useDrillDown';
import type { RegisterColumn, RegisterMeta, SummaryCard, StatusOption } from '@/components/registers/UniversalRegisterTypes';
import {
  rtvsKey, RTV_STATUS_COLORS,
  type RTV, type RTVStatus,
} from '@/types/rtv';
import { dSum } from '@/lib/decimal-helpers';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RTVDetailPanel } from './detail/RTVDetailPanel';
import { RTVPrint } from './print/RTVPrint';
import type { InventoryDrillFilter } from '@/types/drill-context';

const fmtINR = (n: number): string =>
  `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n)}`;

const RTV_STATUS_LABELS: Record<RTVStatus, string> = {
  draft: 'Draft', posted: 'Posted', shipped: 'Shipped', cancelled: 'Cancelled',
};

interface RTVRegisterPanelProps {
  /** Cross-panel drill filter applied on mount · Sprint 1.2.6b-rpt */
  initialFilter?: InventoryDrillFilter;
}

export function RTVRegisterPanel({ initialFilter }: RTVRegisterPanelProps = {}) {
  const { entityCode } = useCardEntitlement();
  const safeEntity = entityCode || 'SMRT';
  const drill = useDrillDown();
  const [printRTV, setPrintRTV] = useState<RTV | null>(null);
  const [filter, setFilter] = useState<InventoryDrillFilter | undefined>(initialFilter);
  useEffect(() => { setFilter(initialFilter); }, [initialFilter]);

  const allRtvs = useMemo<RTV[]>(() => {
    try {
      // [JWT] GET /api/inventory/rtvs/:entityCode
      return JSON.parse(localStorage.getItem(rtvsKey(safeEntity)) || '[]') as RTV[];
    } catch { return []; }
  }, [safeEntity]);

  const rtvs = useMemo<RTV[]>(() => {
    if (!filter) return allRtvs;
    return allRtvs.filter(r => {
      if (filter.status && r.status !== filter.status) return false;
      if (filter.vendorId && r.vendor_id !== filter.vendorId) return false;
      if (filter.godownId && !r.lines.some(l => l.godown_id === filter.godownId)) return false;
      if (filter.itemId && !r.lines.some(l => l.item_id === filter.itemId)) return false;
      const eff = r.effective_date ?? r.rtv_date;
      if (filter.dateFrom && eff < filter.dateFrom) return false;
      if (filter.dateTo && eff > filter.dateTo) return false;
      return true;
    });
  }, [allRtvs, filter]);

  const meta: RegisterMeta<RTV> = {
    registerCode: 'rtv_register',
    title: 'RTV Register',
    description: 'Return-to-Vendor · vendor-grouped · source GRN linkage',
    dateAccessor: r => r.effective_date ?? r.rtv_date,
  };

  const columns: RegisterColumn<RTV>[] = [
    { key: 'rtv_no', label: 'RTV No', clickable: true, render: r => r.rtv_no, exportKey: 'rtv_no' },
    { key: 'date', label: 'Date', render: r => r.rtv_date, exportKey: 'rtv_date' },
    { key: 'eff', label: 'Effective', render: r => r.effective_date ?? r.rtv_date, exportKey: r => r.effective_date ?? r.rtv_date },
    { key: 'vendor', label: 'Vendor', render: r => r.vendor_name, exportKey: 'vendor_name' },
    { key: 'gst', label: 'Vendor GST', render: r => r.vendor_gst ?? '—', exportKey: r => r.vendor_gst ?? '' },
    { key: 'lines', label: 'Lines', align: 'right', render: r => r.lines.length, exportKey: r => r.lines.length },
    { key: 'qty', label: 'Total Qty', align: 'right', render: r => r.total_qty, exportKey: 'total_qty' },
    { key: 'value', label: 'Total ₹', align: 'right', render: r => fmtINR(r.total_value), exportKey: 'total_value' },
    { key: 'cn_ref', label: 'CN Ref', render: r => r.expected_credit_note_no ?? '—', exportKey: r => r.expected_credit_note_no ?? '' },
    { key: 'status', label: 'Status', render: r => (
      <Badge className={`text-[10px] ${RTV_STATUS_COLORS[r.status]}`}>{RTV_STATUS_LABELS[r.status]}</Badge>
    ), exportKey: 'status' },
  ];

  const statusOptions: StatusOption[] = (Object.keys(RTV_STATUS_LABELS) as RTVStatus[])
    .map(s => ({ value: s, label: RTV_STATUS_LABELS[s] }));

  const summaryBuilder = (f: RTV[]): SummaryCard[] => {
    const vendors = new Set(f.map(r => r.vendor_id)).size;
    return [
      { label: 'Total RTVs', value: String(f.length) },
      { label: 'Unique Vendors', value: String(vendors) },
      { label: 'Posted', value: String(f.filter(r => r.status === 'posted' || r.status === 'shipped').length), tone: 'positive' },
      { label: 'Total Qty', value: new Intl.NumberFormat('en-IN').format(dSum(f, r => r.total_qty)) },
      { label: 'Total Value', value: fmtINR(dSum(f, r => r.total_value)), tone: 'negative' },
    ];
  };

  const expandedRow = (r: RTV) => (
    <div className="space-y-2">
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Line Items · Source GRN References</div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Item</TableHead>
            <TableHead>UOM</TableHead>
            <TableHead>Godown</TableHead>
            <TableHead className="text-right">Rejected Qty</TableHead>
            <TableHead className="text-right">Rate ₹</TableHead>
            <TableHead className="text-right">Total ₹</TableHead>
            <TableHead>Source GRN</TableHead>
            <TableHead>Heat / Batch</TableHead>
            <TableHead>QC Failure</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {r.lines.map(l => (
            <TableRow key={l.id}>
              <TableCell className="text-xs">{l.item_code} · {l.item_name}</TableCell>
              <TableCell className="text-xs">{l.uom}</TableCell>
              <TableCell className="text-xs">{l.godown_name}</TableCell>
              <TableCell className="text-right text-xs font-mono">{l.rejected_qty}</TableCell>
              <TableCell className="text-right text-xs font-mono">{l.unit_rate}</TableCell>
              <TableCell className="text-right text-xs font-mono">{fmtINR(l.line_total)}</TableCell>
              <TableCell className="text-xs">{l.source_grn_no ?? '—'}</TableCell>
              <TableCell className="text-xs">{l.heat_no ?? l.batch_no ?? '—'}</TableCell>
              <TableCell className="text-xs">{l.qc_failure_reason || '—'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  const currentRTV = drill.current?.payload as RTV | undefined;

  return (
    <div className="max-w-7xl mx-auto space-y-4 p-6">
      <DrillSourceBanner sourceLabel={filter?.sourceLabel} onClear={() => setFilter(undefined)} />
      <DrillBreadcrumb rootLabel="RTV Register" trail={drill.trail} onGoTo={drill.goTo} onReset={drill.reset} />
      {!currentRTV ? (
        <UniversalRegisterGrid<RTV>
          entityCode={safeEntity}
          meta={meta}
          rows={rtvs}
          columns={columns}
          summaryBuilder={summaryBuilder}
          getExpandedRows={expandedRow}
          onNavigateToRecord={(r) => drill.push({ id: `rtv:${r.id}`, label: r.rtv_no, level: 1, module: 'rtv_register', payload: r })}
          statusOptions={statusOptions}
          statusKey="status"
        />
      ) : (
        <RTVDetailPanel rtv={currentRTV} onPrint={() => setPrintRTV(currentRTV)} />
      )}
      <Dialog open={!!printRTV} onOpenChange={o => { if (!o) setPrintRTV(null); }}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          {printRTV && <RTVPrint rtv={printRTV} onClose={() => setPrintRTV(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
