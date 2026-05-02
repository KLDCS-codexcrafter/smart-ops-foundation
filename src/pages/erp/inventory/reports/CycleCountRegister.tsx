/**
 * CycleCountRegister.tsx — Tally-Prime style Cycle Count register on UTS foundation
 * Sprint T-Phase-1.2.6b · Card #2.6 sub-sprint 2 of 6 · D-226 UTS compliant · variance summary
 */

import { useMemo, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import { UniversalRegisterGrid } from '@/components/registers/UniversalRegisterGrid';
import { DrillBreadcrumb } from '@/components/registers/DrillBreadcrumb';
import { useDrillDown } from '@/hooks/useDrillDown';
import type { RegisterColumn, RegisterMeta, SummaryCard, StatusOption } from '@/components/registers/UniversalRegisterTypes';
import {
  cycleCountsKey, COUNT_STATUS_COLORS, COUNT_KIND_LABELS, VARIANCE_REASON_LABELS,
  type CycleCount, type CycleCountStatus,
} from '@/types/cycle-count';
import { dSum } from '@/lib/decimal-helpers';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CycleCountDetailPanel } from './detail/CycleCountDetailPanel';
import { CycleCountPrint } from './print/CycleCountPrint';

const fmtINR = (n: number): string =>
  `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n)}`;

const STATUS_LABELS: Record<CycleCountStatus, string> = {
  draft: 'Draft', submitted: 'Submitted', approved: 'Approved',
  rejected: 'Rejected', posted: 'Posted', cancelled: 'Cancelled',
};

export function CycleCountRegisterPanel() {
  const { entityCode } = useCardEntitlement();
  const safeEntity = entityCode || 'SMRT';
  const drill = useDrillDown();
  const [printCC, setPrintCC] = useState<CycleCount | null>(null);

  const counts = useMemo<CycleCount[]>(() => {
    try {
      // [JWT] GET /api/inventory/cycle-counts/:entityCode
      return JSON.parse(localStorage.getItem(cycleCountsKey(safeEntity)) || '[]') as CycleCount[];
    } catch { return []; }
  }, [safeEntity]);

  const meta: RegisterMeta<CycleCount> = {
    registerCode: 'cycle_count_register',
    title: 'Cycle Count Register',
    description: 'Physical stocktaking · two-step approval workflow',
    dateAccessor: r => r.effective_date ?? r.count_date,
  };

  const columns: RegisterColumn<CycleCount>[] = [
    { key: 'count_no', label: 'Count No', clickable: true, render: r => r.count_no, exportKey: 'count_no' },
    { key: 'date', label: 'Date', render: r => r.count_date, exportKey: 'count_date' },
    { key: 'eff', label: 'Effective', render: r => r.effective_date ?? r.count_date, exportKey: r => r.effective_date ?? r.count_date },
    { key: 'kind', label: 'Kind', render: r => COUNT_KIND_LABELS[r.count_kind], exportKey: 'count_kind' },
    { key: 'godown', label: 'Godown', render: r => r.godown_name ?? '—', exportKey: r => r.godown_name ?? '' },
    { key: 'lines', label: 'Lines', align: 'right', render: r => r.total_lines, exportKey: 'total_lines' },
    { key: 'var_lines', label: 'Variance Lines', align: 'right', render: r => r.variance_lines, exportKey: 'variance_lines' },
    { key: 'var_value', label: 'Variance ₹', align: 'right', render: r => fmtINR(r.total_variance_value), exportKey: 'total_variance_value' },
    { key: 'shrinkage', label: 'Shrink %', align: 'right', render: r => `${r.net_shrinkage_pct.toFixed(2)}%`, exportKey: 'net_shrinkage_pct' },
    { key: 'status', label: 'Status', render: r => (
      <Badge className={`text-[10px] ${COUNT_STATUS_COLORS[r.status]}`}>{STATUS_LABELS[r.status]}</Badge>
    ), exportKey: 'status' },
  ];

  const statusOptions: StatusOption[] = (Object.keys(STATUS_LABELS) as CycleCountStatus[])
    .map(s => ({ value: s, label: STATUS_LABELS[s] }));

  const summaryBuilder = (f: CycleCount[]): SummaryCard[] => {
    const varAbs = dSum(f, c => Math.abs(c.total_variance_value));
    return [
      { label: 'Total Counts', value: String(f.length) },
      { label: 'Posted', value: String(f.filter(c => c.status === 'posted').length), tone: 'positive' },
      { label: 'Pending', value: String(f.filter(c => c.status === 'submitted' || c.status === 'approved').length), tone: 'warning' },
      { label: 'Variance Lines', value: String(f.reduce((s, c) => s + c.variance_lines, 0)) },
      { label: '|Variance ₹|', value: fmtINR(varAbs), tone: varAbs > 0 ? 'negative' : 'neutral' },
    ];
  };

  const expandedRow = (c: CycleCount) => (
    <div className="space-y-2">
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        Line Items · Variance Summary: {c.variance_lines} of {c.total_lines} lines · Net ₹{fmtINR(c.total_variance_value)}
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Item</TableHead>
            <TableHead>Bin</TableHead>
            <TableHead className="text-right">System Qty</TableHead>
            <TableHead className="text-right">Physical Qty</TableHead>
            <TableHead className="text-right">Variance Qty</TableHead>
            <TableHead className="text-right">Rate ₹</TableHead>
            <TableHead className="text-right">Variance ₹</TableHead>
            <TableHead>Reason</TableHead>
            <TableHead>Notes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {c.lines.map(l => (
            <TableRow key={l.id}>
              <TableCell className="text-xs">{l.item_code} · {l.item_name}</TableCell>
              <TableCell className="text-xs">{l.bin_code ?? '—'}</TableCell>
              <TableCell className="text-right text-xs font-mono">{l.system_qty}</TableCell>
              <TableCell className="text-right text-xs font-mono">{l.physical_qty}</TableCell>
              <TableCell className="text-right text-xs font-mono">{l.variance_qty}</TableCell>
              <TableCell className="text-right text-xs font-mono">{l.weighted_avg_rate}</TableCell>
              <TableCell className="text-right text-xs font-mono">{fmtINR(l.variance_value)}</TableCell>
              <TableCell className="text-xs">{l.variance_reason ? VARIANCE_REASON_LABELS[l.variance_reason] : '—'}</TableCell>
              <TableCell className="text-xs">{l.variance_notes ?? '—'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  const currentCC = drill.current?.payload as CycleCount | undefined;

  return (
    <div className="max-w-7xl mx-auto space-y-4 p-6">
      <DrillBreadcrumb rootLabel="Cycle Count Register" trail={drill.trail} onGoTo={drill.goTo} onReset={drill.reset} />
      {!currentCC ? (
        <UniversalRegisterGrid<CycleCount>
          entityCode={safeEntity}
          meta={meta}
          rows={counts}
          columns={columns}
          summaryBuilder={summaryBuilder}
          getExpandedRows={expandedRow}
          onNavigateToRecord={(c) => drill.push({ id: `cc:${c.id}`, label: c.count_no, level: 1, module: 'cycle_count_register', payload: c })}
          statusOptions={statusOptions}
          statusKey="status"
        />
      ) : (
        <CycleCountDetailPanel count={currentCC} onPrint={() => setPrintCC(currentCC)} />
      )}
      <Dialog open={!!printCC} onOpenChange={o => { if (!o) setPrintCC(null); }}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          {printCC && <CycleCountPrint count={printCC} onClose={() => setPrintCC(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
