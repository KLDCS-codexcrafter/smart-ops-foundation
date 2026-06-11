/**
 * MINRegister.tsx — Tally-Prime style Material Issue Note register on UTS foundation
 * Sprint T-Phase-1.2.6b · Card #2.6 sub-sprint 2 of 6 · D-226 UTS compliant
 */

import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck } from 'lucide-react';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import { UniversalRegisterGrid } from '@/components/registers/UniversalRegisterGrid';
import { DrillBreadcrumb } from '@/components/registers/DrillBreadcrumb';
import { DrillSourceBanner } from '@/components/registers/DrillSourceBanner';
import { useDrillDown } from '@/hooks/useDrillDown';
import type { RegisterColumn, RegisterMeta, SummaryCard, StatusOption } from '@/components/registers/UniversalRegisterTypes';
import {
  minNotesKey, MIN_STATUS_LABELS, MIN_STATUS_COLORS,
  type MaterialIssueNote, type MINStatus,
} from '@/types/consumption';
import { dSum } from '@/lib/decimal-helpers';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MINDetailPanel } from './detail/MINDetailPanel';
import { MINPrint } from './print/MINPrint';
import type { InventoryDrillFilter } from '@/types/drill-context';
import { TableChartToggle } from '@/components/operix-core/report-framework';
import { signReport, getKpi, defaultChartConfig } from '@/lib/report-framework';

const fmtINR = (n: number): string =>
  `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n)}`;

interface MINRegisterPanelProps {
  /** Cross-panel drill filter applied on mount · Sprint 1.2.6b-rpt */
  initialFilter?: InventoryDrillFilter;
}

export function MINRegisterPanel({ initialFilter }: MINRegisterPanelProps = {}) {
  const { entityCode } = useCardEntitlement();
  const safeEntity = entityCode || 'SMRT';
  const drill = useDrillDown();
  const [printMIN, setPrintMIN] = useState<MaterialIssueNote | null>(null);
  const [filter, setFilter] = useState<InventoryDrillFilter | undefined>(initialFilter);
  useEffect(() => { setFilter(initialFilter); }, [initialFilter]);

  const allMins = useMemo<MaterialIssueNote[]>(() => {
    try {
      // [JWT] GET /api/inventory/material-issue-notes/:entityCode
      return JSON.parse(localStorage.getItem(minNotesKey(safeEntity)) || '[]') as MaterialIssueNote[];
    } catch { return []; }
  }, [safeEntity]);

  const mins = useMemo<MaterialIssueNote[]>(() => {
    if (!filter) return allMins;
    return allMins.filter(m => {
      if (filter.status && m.status !== filter.status) return false;
      if (filter.godownId && m.from_godown_id !== filter.godownId && m.to_godown_id !== filter.godownId) return false;
      if (filter.itemId && !m.lines.some(l => l.item_id === filter.itemId)) return false;
      if (filter.departmentCode && m.to_department_code !== filter.departmentCode) return false;
      const eff = m.effective_date ?? m.issue_date;
      if (filter.dateFrom && eff < filter.dateFrom) return false;
      if (filter.dateTo && eff > filter.dateTo) return false;
      return true;
    });
  }, [allMins, filter]);

  const meta: RegisterMeta<MaterialIssueNote> = {
    registerCode: 'min_register',
    title: 'MIN Register',
    description: 'Material Issue Notes · godown-to-godown transfers',
    dateAccessor: r => r.effective_date ?? r.issue_date,
  };

  const columns: RegisterColumn<MaterialIssueNote>[] = [
    { key: 'min_no', label: 'MIN No', clickable: true, render: r => r.min_no, exportKey: 'min_no' },
    { key: 'date', label: 'Date', render: r => r.issue_date, exportKey: 'issue_date' },
    { key: 'eff', label: 'Effective', render: r => r.effective_date ?? r.issue_date, exportKey: r => r.effective_date ?? r.issue_date },
    { key: 'from', label: 'From Godown', render: r => r.from_godown_name, exportKey: 'from_godown_name' },
    { key: 'to', label: 'To Godown', render: r => r.to_godown_name, exportKey: 'to_godown_name' },
    { key: 'requested', label: 'Requested By', render: r => r.requested_by_name, exportKey: 'requested_by_name' },
    { key: 'lines', label: 'Lines', align: 'right', render: r => r.lines.length, exportKey: r => r.lines.length },
    { key: 'value', label: 'Total ₹', align: 'right', render: r => fmtINR(r.total_value), exportKey: 'total_value' },
    { key: 'status', label: 'Status', render: r => (
      <Badge className={`text-[10px] ${MIN_STATUS_COLORS[r.status]}`}>{MIN_STATUS_LABELS[r.status]}</Badge>
    ), exportKey: 'status' },
  ];

  const statusOptions: StatusOption[] = (Object.keys(MIN_STATUS_LABELS) as MINStatus[])
    .map(s => ({ value: s, label: MIN_STATUS_LABELS[s] }));

  const summaryBuilder = (f: MaterialIssueNote[]): SummaryCard[] => [
    { label: 'Total MINs', value: String(f.length) },
    { label: 'Issued', value: String(f.filter(m => m.status === 'issued').length), tone: 'positive' },
    { label: 'Draft', value: String(f.filter(m => m.status === 'draft').length), tone: 'warning' },
    { label: 'Total Qty', value: new Intl.NumberFormat('en-IN').format(dSum(f, m => m.total_qty)) },
    { label: 'Total Value', value: fmtINR(dSum(f, m => m.total_value)), tone: 'positive' },
  ];

  const expandedRow = (m: MaterialIssueNote) => (
    <div className="space-y-2">
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Line Items</div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Item</TableHead>
            <TableHead>UOM</TableHead>
            <TableHead className="text-right">Qty</TableHead>
            <TableHead className="text-right">Rate ₹</TableHead>
            <TableHead className="text-right">Value ₹</TableHead>
            <TableHead className="text-right">Available at Issue</TableHead>
            <TableHead>Batch</TableHead>
            <TableHead>Notes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {m.lines.map(l => (
            <TableRow key={l.id}>
              <TableCell className="text-xs">{l.item_code} · {l.item_name}</TableCell>
              <TableCell className="text-xs">{l.uom}</TableCell>
              <TableCell className="text-right text-xs font-mono">{l.qty}</TableCell>
              <TableCell className="text-right text-xs font-mono">{l.rate}</TableCell>
              <TableCell className="text-right text-xs font-mono">{fmtINR(l.value)}</TableCell>
              <TableCell className="text-right text-xs font-mono">{l.available_qty_at_issue}</TableCell>
              <TableCell className="text-xs">{l.batch_no ?? '—'}</TableCell>
              <TableCell className="text-xs">{l.notes || '—'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  const currentMIN = drill.current?.payload as MaterialIssueNote | undefined;

  // RPT-5b · toggle-wrap (hooks at top level)
  const chartRows = useMemo(() => {
    const m = new Map<string, number>();
    for (const x of allMins) {
      if (x.status !== 'issued') continue;
      const dept = x.to_department_code ?? 'unassigned';
      m.set(dept, (m.get(dept) ?? 0) + x.total_value);
    }
    return Array.from(m.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([department, issue_value]) => ({ department, issue_value }));
  }, [allMins]);
  const chartConfig = getKpi('inv-min')?.defaultChart ?? defaultChartConfig({
    chartType: 'column', xKey: 'department',
    series: [{ key: 'issue_value', label: 'Issue Value ₹' }],
    title: 'MIN value by department',
  });
  const integrityHash = useMemo(() => signReport(chartRows), [chartRows]);
  const shortHash = integrityHash.replace('fnv1a:', '').slice(0, 10);

  return (
    <div className="max-w-7xl mx-auto space-y-4 p-6">
      <Card className="p-3 space-y-2" data-testid="inv-min-toggle-host">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-[10px] font-mono" data-testid="inv-min-integrity-badge" title={integrityHash}>
            <ShieldCheck className="h-3 w-3 mr-1" />{shortHash}
          </Badge>
        </div>
        <TableChartToggle
          rows={chartRows}
          columns={[
            { key: 'department', label: 'Department' },
            { key: 'issue_value', label: 'Issue Value ₹', align: 'right' },
          ]}
          chartConfig={chartConfig}
          defaultView="table"
          emptyLabel="No issued MINs"
        />
      </Card>
      <DrillSourceBanner sourceLabel={filter?.sourceLabel} onClear={() => setFilter(undefined)} />
      <DrillBreadcrumb rootLabel="MIN Register" trail={drill.trail} onGoTo={drill.goTo} onReset={drill.reset} />
      {!currentMIN ? (
        <UniversalRegisterGrid<MaterialIssueNote>
          entityCode={safeEntity}
          meta={meta}
          rows={mins}
          columns={columns}
          summaryBuilder={summaryBuilder}
          getExpandedRows={expandedRow}
          onNavigateToRecord={(m) => drill.push({ id: `min:${m.id}`, label: m.min_no, level: 1, module: 'min_register', payload: m })}
          statusOptions={statusOptions}
          statusKey="status"
        />
      ) : (
        <MINDetailPanel min={currentMIN} onPrint={() => setPrintMIN(currentMIN)} />
      )}
      <Dialog open={!!printMIN} onOpenChange={o => { if (!o) setPrintMIN(null); }}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          {printMIN && <MINPrint min={printMIN} onClose={() => setPrintMIN(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
