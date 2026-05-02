/**
 * GRNRegisterV2.tsx — Tally-Prime style GRN register on UTS foundation
 *
 * Sprint T-Phase-1.2.6b · Card #2.6 sub-sprint 2 of 6 · Q1 lock (b) · built alongside legacy GRNRegister.tsx
 *
 * Old `GRNRegister.tsx` stays for one sprint as fallback (removed in 1.2.6e
 * governance pass). Consumer in `InventoryHubPage.tsx` switches to V2 in this
 * sprint.
 *
 * Implements all 8 D-226 UTS dimensions:
 *   1 Doc No · grn_no via generateDocNo('GRN')
 *   2 Primary date · receipt_date
 *   3 Effective date · effective_date ?? receipt_date
 *   4 Status · GRNStatus
 *   5 Linkage · po_no, vendor_id
 *   6 Decimal math · dSum
 *   7 Audit · created_at, updated_at, posted_at
 *   8 Print/Export parity · UniversalPrintFrame + UniversalRegisterGrid export menu
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
  grnsKey, GRN_STATUS_LABELS, GRN_STATUS_COLORS,
  type GRN, type GRNStatus,
} from '@/types/grn';
import { dSum } from '@/lib/decimal-helpers';
import { GRNDetailPanel } from './detail/GRNDetailPanel';
import { GRNPrint } from './print/GRNPrint';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { InventoryDrillFilter } from '@/types/drill-context';

const fmtINR = (n: number): string =>
  `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n)}`;

interface GRNRegisterV2PanelProps {
  /** Cross-panel drill filter applied on mount · Sprint 1.2.6b-rpt */
  initialFilter?: InventoryDrillFilter;
}

export function GRNRegisterV2Panel({ initialFilter }: GRNRegisterV2PanelProps = {}) {
  const { entityCode } = useCardEntitlement();
  const safeEntity = entityCode || 'SMRT';
  const drill = useDrillDown();
  const [printGRN, setPrintGRN] = useState<GRN | null>(null);
  // Sprint 1.2.6b-rpt · pragmatic filter — apply on mount via memo when register UI lacks native dimension.
  const [filter, setFilter] = useState<InventoryDrillFilter | undefined>(initialFilter);
  useEffect(() => { setFilter(initialFilter); }, [initialFilter]);

  const allGrns = useMemo<GRN[]>(() => {
    try {
      // [JWT] GET /api/inventory/grns/:entityCode
      return JSON.parse(localStorage.getItem(grnsKey(safeEntity)) || '[]') as GRN[];
    } catch { return []; }
  }, [safeEntity]);

  const grns = useMemo<GRN[]>(() => {
    if (!filter) return allGrns;
    return allGrns.filter(g => {
      if (filter.status && g.status !== filter.status) return false;
      if (filter.vendorId && g.vendor_id !== filter.vendorId) return false;
      if (filter.godownId && g.godown_id !== filter.godownId) return false;
      if (filter.itemId && !g.lines.some(l => l.item_id === filter.itemId)) return false;
      const eff = g.effective_date ?? g.receipt_date;
      if (filter.dateFrom && eff < filter.dateFrom) return false;
      if (filter.dateTo && eff > filter.dateTo) return false;
      return true;
    });
  }, [allGrns, filter]);

  const meta: RegisterMeta<GRN> = {
    registerCode: 'grn_register',
    title: 'GRN Register',
    description: 'All Goods Receipt Notes · Tally-Prime register',
    dateAccessor: r => r.effective_date ?? r.receipt_date,
  };

  const columns: RegisterColumn<GRN>[] = [
    { key: 'grn_no', label: 'GRN No', clickable: true, render: r => r.grn_no, exportKey: 'grn_no' },
    { key: 'date', label: 'Date', render: r => r.receipt_date, exportKey: 'receipt_date' },
    { key: 'eff', label: 'Effective', render: r => r.effective_date ?? r.receipt_date, exportKey: r => r.effective_date ?? r.receipt_date },
    { key: 'vendor', label: 'Vendor', render: r => r.vendor_name, exportKey: 'vendor_name' },
    { key: 'po', label: 'PO Ref', render: r => r.po_no ?? '—', exportKey: r => r.po_no ?? '' },
    { key: 'godown', label: 'Godown', render: r => r.godown_name, exportKey: 'godown_name' },
    { key: 'lines', label: 'Lines', align: 'right', render: r => r.lines.length, exportKey: r => r.lines.length },
    { key: 'value', label: 'Total ₹', align: 'right', render: r => fmtINR(r.total_value), exportKey: 'total_value' },
    { key: 'status', label: 'Status', render: r => (
      <Badge className={`text-[10px] ${GRN_STATUS_COLORS[r.status]}`}>{GRN_STATUS_LABELS[r.status]}</Badge>
    ), exportKey: 'status' },
  ];

  const statusOptions: StatusOption[] = (Object.keys(GRN_STATUS_LABELS) as GRNStatus[])
    .map(s => ({ value: s, label: GRN_STATUS_LABELS[s] }));

  const summaryBuilder = (filtered: GRN[]): SummaryCard[] => {
    const posted = filtered.filter(g => g.status === 'posted');
    const inTransit = filtered.filter(g => g.status === 'in_transit');
    const discrepancies = filtered.filter(g => g.has_discrepancy);
    const totalValue = dSum(posted, g => g.total_value);
    const totalQty = dSum(filtered, g => g.total_qty);
    return [
      { label: 'Total GRNs', value: String(filtered.length) },
      { label: 'Posted Value', value: fmtINR(totalValue), tone: 'positive' },
      { label: 'Total Qty', value: new Intl.NumberFormat('en-IN').format(totalQty) },
      { label: 'In Transit', value: String(inTransit.length), tone: 'warning' },
      { label: 'With Discrepancy', value: String(discrepancies.length), tone: discrepancies.length ? 'negative' : 'neutral' },
    ];
  };

  const expandedRow = (g: GRN) => (
    <div className="space-y-2">
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Line Items</div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Item</TableHead>
            <TableHead>UOM</TableHead>
            <TableHead className="text-right">Ordered</TableHead>
            <TableHead className="text-right">Received</TableHead>
            <TableHead className="text-right">Accepted</TableHead>
            <TableHead className="text-right">Rate ₹</TableHead>
            <TableHead className="text-right">Total ₹</TableHead>
            <TableHead>Batch</TableHead>
            <TableHead>Heat</TableHead>
            <TableHead>QC</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {g.lines.map(l => (
            <TableRow key={l.id}>
              <TableCell className="text-xs">{l.item_code} · {l.item_name}</TableCell>
              <TableCell className="text-xs">{l.uom}</TableCell>
              <TableCell className="text-right text-xs font-mono">{l.ordered_qty}</TableCell>
              <TableCell className="text-right text-xs font-mono">{l.received_qty}</TableCell>
              <TableCell className="text-right text-xs font-mono">{l.accepted_qty}</TableCell>
              <TableCell className="text-right text-xs font-mono">{l.unit_rate}</TableCell>
              <TableCell className="text-right text-xs font-mono">{fmtINR(l.line_total)}</TableCell>
              <TableCell className="text-xs">{l.batch_no ?? '—'}</TableCell>
              <TableCell className="text-xs">{l.heat_no ?? '—'}</TableCell>
              <TableCell className="text-xs">{l.qc_result ?? '—'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  const handleNavigate = (g: GRN) => {
    drill.push({ id: `grn:${g.id}`, label: g.grn_no, level: 1, module: 'grn_register', payload: g });
  };

  const currentGRN = drill.current?.payload as GRN | undefined;

  return (
    <div className="max-w-7xl mx-auto space-y-4 p-6">
      <DrillBreadcrumb
        rootLabel="GRN Register"
        trail={drill.trail}
        onGoTo={drill.goTo}
        onReset={drill.reset}
      />
      {!currentGRN ? (
        <UniversalRegisterGrid<GRN>
          entityCode={safeEntity}
          meta={meta}
          rows={grns}
          columns={columns}
          summaryBuilder={summaryBuilder}
          getExpandedRows={expandedRow}
          onNavigateToRecord={handleNavigate}
          statusOptions={statusOptions}
          statusKey="status"
        />
      ) : (
        <GRNDetailPanel grn={currentGRN} onPrint={() => setPrintGRN(currentGRN)} />
      )}
      <Dialog open={!!printGRN} onOpenChange={o => { if (!o) setPrintGRN(null); }}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          {printGRN && <GRNPrint grn={printGRN} onClose={() => setPrintGRN(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
