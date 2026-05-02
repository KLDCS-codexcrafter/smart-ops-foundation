/**
 * DOMRegister.tsx — Tally-Prime style Demo Outward Memo register on UTS foundation
 * Sprint T-Phase-1.2.6c · Q4-a (separate from SOM) · D-226 UTS compliant
 *
 * Summary card "Pending Returns" highlighted red (tone=negative) when any
 * dispatched/demo_active record's demo_end_date has passed.
 */

import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import { UniversalRegisterGrid } from '@/components/registers/UniversalRegisterGrid';
import { DrillBreadcrumb } from '@/components/registers/DrillBreadcrumb';
import { DrillSourceBanner } from '@/components/registers/DrillSourceBanner';
import { useDrillDown } from '@/hooks/useDrillDown';
import type {
  RegisterColumn, RegisterMeta, SummaryCard, StatusOption,
} from '@/components/registers/UniversalRegisterTypes';
import {
  demoOutwardMemosKey, DOM_STATUS_LABELS,
  type DemoOutwardMemo, type DOMStatus,
} from '@/types/demo-outward-memo';
import { dSum } from '@/lib/decimal-helpers';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DOMDetailPanel } from './detail/DOMDetailPanel';
import { DOMPrint } from './print/DOMPrint';

const fmtINR = (n: number): string =>
  `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n)}`;

interface DOMRegisterPanelProps {
  initialFilter?: { sourceLabel?: string; status?: DOMStatus };
}

export function DOMRegisterPanel({ initialFilter }: DOMRegisterPanelProps = {}) {
  const { entityCode } = useCardEntitlement();
  const safeEntity = entityCode || 'SMRT';
  const drill = useDrillDown();
  const [printDOM, setPrintDOM] = useState<DemoOutwardMemo | null>(null);
  const [filter, setFilter] = useState(initialFilter);
  useEffect(() => { setFilter(initialFilter); }, [initialFilter]);
  const today = new Date().toISOString().slice(0, 10);

  const allDoms = useMemo<DemoOutwardMemo[]>(() => {
    try {
      // [JWT] GET /api/salesx/demo-outward-memos/:entityCode
      return JSON.parse(localStorage.getItem(demoOutwardMemosKey(safeEntity)) || '[]') as DemoOutwardMemo[];
    } catch { return []; }
  }, [safeEntity]);

  const doms = useMemo(() => filter?.status
    ? allDoms.filter(d => d.status === filter.status)
    : allDoms, [allDoms, filter]);

  const meta: RegisterMeta<DemoOutwardMemo> = {
    registerCode: 'dom_register',
    title: 'Demo Outward Memo Register',
    description: 'DOMs · mandatory return tracking · drill into details',
    dateAccessor: r => r.effective_date ?? r.memo_date,
  };

  const isOverdue = (d: DemoOutwardMemo) =>
    !!(d.demo_end_date && d.demo_end_date < today
      && (d.status === 'dispatched' || d.status === 'demo_active'));

  const columns: RegisterColumn<DemoOutwardMemo>[] = [
    { key: 'no', label: 'Memo No', clickable: true, render: r => r.memo_no, exportKey: 'memo_no' },
    { key: 'date', label: 'Date', render: r => r.memo_date, exportKey: 'memo_date' },
    { key: 'eff', label: 'Effective', render: r => r.effective_date ?? r.memo_date, exportKey: r => r.effective_date ?? r.memo_date },
    { key: 'recipient', label: 'Recipient', render: r => r.recipient_name, exportKey: 'recipient_name' },
    { key: 'salesman', label: 'Salesman', render: r => r.salesman_name ?? '—', exportKey: r => r.salesman_name ?? '' },
    { key: 'period', label: 'Days', align: 'right', render: r => r.demo_period_days, exportKey: 'demo_period_days' },
    { key: 'due', label: 'Return Due', render: r => (
      <span className={isOverdue(r) ? 'text-destructive font-semibold' : ''}>{r.demo_end_date ?? '—'}</span>
    ), exportKey: r => r.demo_end_date ?? '' },
    { key: 'lines', label: 'Lines', align: 'right', render: r => r.items.length, exportKey: r => r.items.length },
    { key: 'value', label: 'Value ₹', align: 'right',
      render: r => fmtINR(r.items.reduce((s, l) => s + l.amount, 0)),
      exportKey: r => r.items.reduce((s, l) => s + l.amount, 0) },
    { key: 'status', label: 'Status', render: r => (
      <Badge variant="outline" className={`text-[10px] ${isOverdue(r) ? 'bg-destructive/15 text-destructive border-destructive/30' : ''}`}>
        {isOverdue(r) ? 'Overdue' : DOM_STATUS_LABELS[r.status]}
      </Badge>
    ), exportKey: 'status' },
  ];

  const statusOptions: StatusOption[] = (Object.keys(DOM_STATUS_LABELS) as DOMStatus[])
    .map(s => ({ value: s, label: DOM_STATUS_LABELS[s] }));

  const summaryBuilder = (f: DemoOutwardMemo[]): SummaryCard[] => {
    const overdue = f.filter(isOverdue);
    return [
      { label: 'Total DOMs', value: String(f.length) },
      { label: 'Active', value: String(f.filter(d => d.status === 'dispatched' || d.status === 'demo_active').length) },
      { label: 'Returned', value: String(f.filter(d => d.status === 'returned').length), tone: 'positive' },
      { label: 'Pending Returns', value: String(overdue.length),
        tone: overdue.length > 0 ? 'negative' : 'neutral' },
      { label: 'Total Value', value: fmtINR(dSum(f, d => d.items.reduce((s, l) => s + l.amount, 0))) },
    ];
  };

  const expandedRow = (d: DemoOutwardMemo) => (
    <div className="space-y-2">
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Line Items</div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Item</TableHead>
            <TableHead>Serial</TableHead>
            <TableHead className="text-right">Qty</TableHead>
            <TableHead className="text-right">Unit ₹</TableHead>
            <TableHead className="text-right">Amount ₹</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {d.items.map(l => (
            <TableRow key={l.id}>
              <TableCell className="text-xs">{l.item_name}</TableCell>
              <TableCell className="text-xs font-mono">{l.serial_no ?? '—'}</TableCell>
              <TableCell className="text-right text-xs font-mono">{l.qty}</TableCell>
              <TableCell className="text-right text-xs font-mono">{fmtINR(l.unit_value)}</TableCell>
              <TableCell className="text-right text-xs font-mono">{fmtINR(l.amount)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  const currentDOM = drill.current?.payload as DemoOutwardMemo | undefined;

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      <DrillSourceBanner sourceLabel={filter?.sourceLabel} onClear={() => setFilter(undefined)} />
      <DrillBreadcrumb rootLabel="DOM Register" trail={drill.trail} onGoTo={drill.goTo} onReset={drill.reset} />
      {!currentDOM ? (
        <UniversalRegisterGrid<DemoOutwardMemo>
          entityCode={safeEntity}
          meta={meta}
          rows={doms}
          columns={columns}
          summaryBuilder={summaryBuilder}
          getExpandedRows={expandedRow}
          onNavigateToRecord={(d) => drill.push({
            id: `dom:${d.id}`, label: d.memo_no, level: 1,
            module: 'dom_register', payload: d,
          })}
          statusOptions={statusOptions}
          statusKey="status"
        />
      ) : (
        <DOMDetailPanel dom={currentDOM} onPrint={() => setPrintDOM(currentDOM)} />
      )}
      <Dialog open={!!printDOM} onOpenChange={o => { if (!o) setPrintDOM(null); }}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          {printDOM && <DOMPrint dom={printDOM} onClose={() => setPrintDOM(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
