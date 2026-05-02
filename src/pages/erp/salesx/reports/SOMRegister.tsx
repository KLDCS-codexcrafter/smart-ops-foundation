/**
 * SOMRegister.tsx — Tally-Prime style Sample Outward Memo register on UTS foundation
 * Sprint T-Phase-1.2.6c · Q4-a (separate from DOM) · D-226 UTS compliant
 *
 * Summary card "Marketing Expense YTD" sums total_value of non-refundable SOMs
 * in the current FY (Apr 1 → today).
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
  sampleOutwardMemosKey, SOM_STATUS_LABELS, SOM_PURPOSE_LABELS,
  type SampleOutwardMemo, type SOMStatus,
} from '@/types/sample-outward-memo';
import { dSum } from '@/lib/decimal-helpers';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SOMDetailPanel } from './detail/SOMDetailPanel';
import { SOMPrint } from './print/SOMPrint';

const fmtINR = (n: number): string =>
  `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n)}`;

function fyStart(): string {
  const today = new Date();
  const y = today.getMonth() < 3 ? today.getFullYear() - 1 : today.getFullYear();
  return `${y}-04-01`;
}

interface SOMRegisterPanelProps {
  initialFilter?: { sourceLabel?: string; status?: SOMStatus };
}

export function SOMRegisterPanel({ initialFilter }: SOMRegisterPanelProps = {}) {
  const { entityCode } = useCardEntitlement();
  const safeEntity = entityCode || 'SMRT';
  const drill = useDrillDown();
  const [printSOM, setPrintSOM] = useState<SampleOutwardMemo | null>(null);
  const [filter, setFilter] = useState(initialFilter);
  useEffect(() => { setFilter(initialFilter); }, [initialFilter]);

  const allSoms = useMemo<SampleOutwardMemo[]>(() => {
    try {
      // [JWT] GET /api/salesx/sample-outward-memos/:entityCode
      return JSON.parse(localStorage.getItem(sampleOutwardMemosKey(safeEntity)) || '[]') as SampleOutwardMemo[];
    } catch { return []; }
  }, [safeEntity]);

  const soms = useMemo(() => filter?.status
    ? allSoms.filter(s => s.status === filter.status)
    : allSoms, [allSoms, filter]);

  const meta: RegisterMeta<SampleOutwardMemo> = {
    registerCode: 'som_register',
    title: 'Sample Outward Memo Register',
    description: 'SOMs · refundable + non-refundable · drill into details',
    dateAccessor: r => r.effective_date ?? r.memo_date,
  };

  const columns: RegisterColumn<SampleOutwardMemo>[] = [
    { key: 'no', label: 'Memo No', clickable: true, render: r => r.memo_no, exportKey: 'memo_no' },
    { key: 'date', label: 'Date', render: r => r.memo_date, exportKey: 'memo_date' },
    { key: 'eff', label: 'Effective', render: r => r.effective_date ?? r.memo_date, exportKey: r => r.effective_date ?? r.memo_date },
    { key: 'recipient', label: 'Recipient', render: r => r.recipient_name, exportKey: 'recipient_name' },
    { key: 'purpose', label: 'Purpose', render: r => SOM_PURPOSE_LABELS[r.purpose], exportKey: 'purpose' },
    { key: 'salesman', label: 'Salesman', render: r => r.salesman_name ?? '—', exportKey: r => r.salesman_name ?? '' },
    { key: 'refund', label: 'Type', render: r => (
      <Badge variant="outline" className={`text-[10px] ${r.is_refundable
        ? 'bg-primary/10 text-primary border-primary/30'
        : 'bg-warning/10 text-warning border-warning/30'}`}>
        {r.is_refundable ? 'Refundable' : 'Non-refundable'}
      </Badge>
    ), exportKey: r => r.is_refundable ? 'Refundable' : 'Non-refundable' },
    { key: 'lines', label: 'Lines', align: 'right', render: r => r.items.length, exportKey: r => r.items.length },
    { key: 'value', label: 'Value ₹', align: 'right', render: r => fmtINR(r.total_value), exportKey: 'total_value' },
    { key: 'status', label: 'Status', render: r => (
      <Badge variant="outline" className="text-[10px]">{SOM_STATUS_LABELS[r.status]}</Badge>
    ), exportKey: 'status' },
  ];

  const statusOptions: StatusOption[] = (Object.keys(SOM_STATUS_LABELS) as SOMStatus[])
    .map(s => ({ value: s, label: SOM_STATUS_LABELS[s] }));

  const summaryBuilder = (f: SampleOutwardMemo[]): SummaryCard[] => {
    const fy = fyStart();
    const ytdNonRefund = f.filter(s => !s.is_refundable && (s.effective_date ?? s.memo_date) >= fy);
    return [
      { label: 'Total SOMs', value: String(f.length) },
      { label: 'Refundable', value: String(f.filter(s => s.is_refundable).length) },
      { label: 'Non-refundable', value: String(f.filter(s => !s.is_refundable).length), tone: 'warning' },
      { label: 'Total Value', value: fmtINR(dSum(f, s => s.total_value)) },
      { label: 'Marketing Expense YTD', value: fmtINR(dSum(ytdNonRefund, s => s.total_value)), tone: 'warning' },
    ];
  };

  const expandedRow = (s: SampleOutwardMemo) => (
    <div className="space-y-2">
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Line Items</div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Item</TableHead>
            <TableHead>UOM</TableHead>
            <TableHead className="text-right">Qty</TableHead>
            <TableHead className="text-right">Unit ₹</TableHead>
            <TableHead className="text-right">Amount ₹</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {s.items.map(l => (
            <TableRow key={l.id}>
              <TableCell className="text-xs">{l.item_name}</TableCell>
              <TableCell className="text-xs">{l.uom ?? '—'}</TableCell>
              <TableCell className="text-right text-xs font-mono">{l.qty}</TableCell>
              <TableCell className="text-right text-xs font-mono">{fmtINR(l.unit_value)}</TableCell>
              <TableCell className="text-right text-xs font-mono">{fmtINR(l.amount)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  const currentSOM = drill.current?.payload as SampleOutwardMemo | undefined;

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      <DrillSourceBanner sourceLabel={filter?.sourceLabel} onClear={() => setFilter(undefined)} />
      <DrillBreadcrumb rootLabel="SOM Register" trail={drill.trail} onGoTo={drill.goTo} onReset={drill.reset} />
      {!currentSOM ? (
        <UniversalRegisterGrid<SampleOutwardMemo>
          entityCode={safeEntity}
          meta={meta}
          rows={soms}
          columns={columns}
          summaryBuilder={summaryBuilder}
          getExpandedRows={expandedRow}
          onNavigateToRecord={(s) => drill.push({
            id: `som:${s.id}`, label: s.memo_no, level: 1,
            module: 'som_register', payload: s,
          })}
          statusOptions={statusOptions}
          statusKey="status"
        />
      ) : (
        <SOMDetailPanel som={currentSOM} onPrint={() => setPrintSOM(currentSOM)} />
      )}
      <Dialog open={!!printSOM} onOpenChange={o => { if (!o) setPrintSOM(null); }}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          {printSOM && <SOMPrint som={printSOM} onClose={() => setPrintSOM(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
