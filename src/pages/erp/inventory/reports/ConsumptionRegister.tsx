/**
 * ConsumptionRegister.tsx — Tally-Prime style Consumption Entry register on UTS foundation
 * Sprint T-Phase-1.2.6b · Card #2.6 sub-sprint 2 of 6 · D-226 UTS compliant · mode-grouped
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
  consumptionEntriesKey, CONSUMPTION_STATUS_LABELS, CONSUMPTION_STATUS_COLORS,
  CONSUMPTION_MODE_LABELS, CONSUMPTION_MODE_COLORS,
  type ConsumptionEntry, type ConsumptionStatus,
} from '@/types/consumption';
import { dSum } from '@/lib/decimal-helpers';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CEDetailPanel } from './detail/CEDetailPanel';
import { ConsumptionEntryPrint } from './print/ConsumptionEntryPrint';

const fmtINR = (n: number): string =>
  `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n)}`;

export function ConsumptionRegisterPanel() {
  const { entityCode } = useCardEntitlement();
  const safeEntity = entityCode || 'SMRT';
  const drill = useDrillDown();
  const [printCE, setPrintCE] = useState<ConsumptionEntry | null>(null);

  const entries = useMemo<ConsumptionEntry[]>(() => {
    try {
      // [JWT] GET /api/inventory/consumption-entries/:entityCode
      return JSON.parse(localStorage.getItem(consumptionEntriesKey(safeEntity)) || '[]') as ConsumptionEntry[];
    } catch { return []; }
  }, [safeEntity]);

  const meta: RegisterMeta<ConsumptionEntry> = {
    registerCode: 'consumption_register',
    title: 'Consumption Register',
    description: 'Job · Overhead · Site mode-grouped consumption entries',
    dateAccessor: r => r.effective_date ?? r.consumption_date,
  };

  const columns: RegisterColumn<ConsumptionEntry>[] = [
    { key: 'ce_no', label: 'CE No', clickable: true, render: r => r.ce_no, exportKey: 'ce_no' },
    { key: 'date', label: 'Date', render: r => r.consumption_date, exportKey: 'consumption_date' },
    { key: 'eff', label: 'Effective', render: r => r.effective_date ?? r.consumption_date, exportKey: r => r.effective_date ?? r.consumption_date },
    { key: 'mode', label: 'Mode', render: r => (
      <Badge className={`text-[10px] ${CONSUMPTION_MODE_COLORS[r.mode]}`}>{CONSUMPTION_MODE_LABELS[r.mode]}</Badge>
    ), exportKey: 'mode' },
    { key: 'godown', label: 'Godown', render: r => r.godown_name, exportKey: 'godown_name' },
    { key: 'consumed_by', label: 'Consumed By', render: r => r.consumed_by_name, exportKey: 'consumed_by_name' },
    { key: 'lines', label: 'Lines', align: 'right', render: r => r.lines.length, exportKey: r => r.lines.length },
    { key: 'value', label: 'Total ₹', align: 'right', render: r => fmtINR(r.total_value), exportKey: 'total_value' },
    { key: 'variance', label: 'Variance ₹', align: 'right', render: r => fmtINR(r.total_variance_value), exportKey: 'total_variance_value' },
    { key: 'status', label: 'Status', render: r => (
      <Badge className={`text-[10px] ${CONSUMPTION_STATUS_COLORS[r.status]}`}>{CONSUMPTION_STATUS_LABELS[r.status]}</Badge>
    ), exportKey: 'status' },
  ];

  const statusOptions: StatusOption[] = (Object.keys(CONSUMPTION_STATUS_LABELS) as ConsumptionStatus[])
    .map(s => ({ value: s, label: CONSUMPTION_STATUS_LABELS[s] }));

  const summaryBuilder = (f: ConsumptionEntry[]): SummaryCard[] => [
    { label: 'Total Entries', value: String(f.length) },
    { label: 'Job Mode', value: String(f.filter(e => e.mode === 'job').length) },
    { label: 'Overhead Mode', value: String(f.filter(e => e.mode === 'overhead').length) },
    { label: 'Total Consumed', value: fmtINR(dSum(f, e => e.total_value)), tone: 'positive' },
    { label: 'Variance ₹', value: fmtINR(dSum(f, e => e.total_variance_value)), tone: 'warning' },
  ];

  const expandedRow = (e: ConsumptionEntry) => (
    <div className="space-y-2">
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Line Items · Variance Detail</div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Item</TableHead>
            <TableHead>UOM</TableHead>
            <TableHead className="text-right">Standard</TableHead>
            <TableHead className="text-right">Actual</TableHead>
            <TableHead className="text-right">Variance Qty</TableHead>
            <TableHead className="text-right">Variance %</TableHead>
            <TableHead className="text-right">Rate ₹</TableHead>
            <TableHead className="text-right">Value ₹</TableHead>
            <TableHead>Notes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {e.lines.map(l => (
            <TableRow key={l.id}>
              <TableCell className="text-xs">{l.item_code} · {l.item_name}</TableCell>
              <TableCell className="text-xs">{l.uom}</TableCell>
              <TableCell className="text-right text-xs font-mono">{l.standard_qty}</TableCell>
              <TableCell className="text-right text-xs font-mono">{l.actual_qty}</TableCell>
              <TableCell className="text-right text-xs font-mono">{l.variance_qty}</TableCell>
              <TableCell className="text-right text-xs font-mono">{l.variance_percent.toFixed(2)}%</TableCell>
              <TableCell className="text-right text-xs font-mono">{l.rate}</TableCell>
              <TableCell className="text-right text-xs font-mono">{fmtINR(l.value)}</TableCell>
              <TableCell className="text-xs">{l.notes || '—'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  const currentCE = drill.current?.payload as ConsumptionEntry | undefined;

  return (
    <div className="max-w-7xl mx-auto space-y-4 p-6">
      <DrillBreadcrumb rootLabel="Consumption Register" trail={drill.trail} onGoTo={drill.goTo} onReset={drill.reset} />
      {!currentCE ? (
        <UniversalRegisterGrid<ConsumptionEntry>
          entityCode={safeEntity}
          meta={meta}
          rows={entries}
          columns={columns}
          summaryBuilder={summaryBuilder}
          getExpandedRows={expandedRow}
          onNavigateToRecord={(e) => drill.push({ id: `ce:${e.id}`, label: e.ce_no, level: 1, module: 'consumption_register', payload: e })}
          statusOptions={statusOptions}
          statusKey="status"
        />
      ) : (
        <CEDetailPanel ce={currentCE} onPrint={() => setPrintCE(currentCE)} />
      )}
      <Dialog open={!!printCE} onOpenChange={o => { if (!o) setPrintCE(null); }}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          {printCE && <ConsumptionEntryPrint ce={printCE} onClose={() => setPrintCE(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
