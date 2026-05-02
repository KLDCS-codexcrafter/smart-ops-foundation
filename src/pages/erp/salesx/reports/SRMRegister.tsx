/**
 * SRMRegister.tsx — Tally-Prime style Supply Request Memo register on UTS foundation
 * Sprint T-Phase-1.2.6c · D-226 UTS compliant
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
  supplyRequestMemosKey, SRM_STATUS_LABELS,
  type SupplyRequestMemo, type SRMStatus,
} from '@/types/supply-request-memo';
import { dSum } from '@/lib/decimal-helpers';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SRMDetailPanel } from './detail/SRMDetailPanel';
import { SRMPrint } from './print/SRMPrint';

const fmtINR = (n: number): string =>
  `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n)}`;

interface SRMRegisterPanelProps {
  initialFilter?: { sourceLabel?: string; status?: SRMStatus };
}

export function SRMRegisterPanel({ initialFilter }: SRMRegisterPanelProps = {}) {
  const { entityCode } = useCardEntitlement();
  const safeEntity = entityCode || 'SMRT';
  const drill = useDrillDown();
  const [printSRM, setPrintSRM] = useState<SupplyRequestMemo | null>(null);
  const [filter, setFilter] = useState(initialFilter);
  useEffect(() => { setFilter(initialFilter); }, [initialFilter]);

  const allSrms = useMemo<SupplyRequestMemo[]>(() => {
    try {
      // [JWT] GET /api/salesx/supply-request-memos/:entityCode
      return JSON.parse(localStorage.getItem(supplyRequestMemosKey(safeEntity)) || '[]') as SupplyRequestMemo[];
    } catch { return []; }
  }, [safeEntity]);

  const srms = useMemo(() => filter?.status
    ? allSrms.filter(s => s.status === filter.status)
    : allSrms, [allSrms, filter]);

  const meta: RegisterMeta<SupplyRequestMemo> = {
    registerCode: 'srm_register',
    title: 'Supply Request Memo Register',
    description: 'SRMs · authorisation for Dispatch · drill for line items',
    dateAccessor: r => r.effective_date ?? r.memo_date,
  };

  const columns: RegisterColumn<SupplyRequestMemo>[] = [
    { key: 'no', label: 'Memo No', clickable: true, render: r => r.memo_no, exportKey: 'memo_no' },
    { key: 'date', label: 'Date', render: r => r.memo_date, exportKey: 'memo_date' },
    { key: 'eff', label: 'Effective', render: r => r.effective_date ?? r.memo_date, exportKey: r => r.effective_date ?? r.memo_date },
    { key: 'so', label: 'SO No', render: r => r.sales_order_no ?? '—', exportKey: r => r.sales_order_no ?? '' },
    { key: 'cust', label: 'Customer', render: r => r.customer_name ?? '—', exportKey: r => r.customer_name ?? '' },
    { key: 'raised', label: 'Raised By', render: r => r.raised_by_person_name ?? '—', exportKey: r => r.raised_by_person_name ?? '' },
    { key: 'exp', label: 'Expected Dispatch', render: r => r.expected_dispatch_date ?? '—', exportKey: r => r.expected_dispatch_date ?? '' },
    { key: 'lines', label: 'Lines', align: 'right', render: r => r.items.length, exportKey: r => r.items.length },
    { key: 'total', label: 'Total ₹', align: 'right', render: r => fmtINR(r.total_amount), exportKey: 'total_amount' },
    { key: 'status', label: 'Status', render: r => (
      <Badge variant="outline" className="text-[10px] capitalize">{SRM_STATUS_LABELS[r.status]}</Badge>
    ), exportKey: 'status' },
  ];

  const statusOptions: StatusOption[] = (Object.keys(SRM_STATUS_LABELS) as SRMStatus[])
    .map(s => ({ value: s, label: SRM_STATUS_LABELS[s] }));

  const summaryBuilder = (f: SupplyRequestMemo[]): SummaryCard[] => [
    { label: 'Total SRMs', value: String(f.length) },
    { label: 'Raised', value: String(f.filter(s => s.status === 'raised').length), tone: 'warning' },
    { label: 'Dispatched', value: String(f.filter(s => s.status === 'dispatched').length), tone: 'positive' },
    { label: 'Draft', value: String(f.filter(s => s.status === 'draft').length) },
    { label: 'Total Value', value: fmtINR(dSum(f, s => s.total_amount)) },
  ];

  const expandedRow = (s: SupplyRequestMemo) => (
    <div className="space-y-2">
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Line Items</div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Item</TableHead>
            <TableHead>UOM</TableHead>
            <TableHead className="text-right">Qty</TableHead>
            <TableHead className="text-right">Rate ₹</TableHead>
            <TableHead className="text-right">Amount ₹</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {s.items.map(l => (
            <TableRow key={l.id}>
              <TableCell className="text-xs">{l.item_name}</TableCell>
              <TableCell className="text-xs">{l.uom ?? '—'}</TableCell>
              <TableCell className="text-right text-xs font-mono">{l.qty}</TableCell>
              <TableCell className="text-right text-xs font-mono">{fmtINR(l.rate)}</TableCell>
              <TableCell className="text-right text-xs font-mono">{fmtINR(l.amount)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  const currentSRM = drill.current?.payload as SupplyRequestMemo | undefined;

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      <DrillSourceBanner sourceLabel={filter?.sourceLabel} onClear={() => setFilter(undefined)} />
      <DrillBreadcrumb rootLabel="SRM Register" trail={drill.trail} onGoTo={drill.goTo} onReset={drill.reset} />
      {!currentSRM ? (
        <UniversalRegisterGrid<SupplyRequestMemo>
          entityCode={safeEntity}
          meta={meta}
          rows={srms}
          columns={columns}
          summaryBuilder={summaryBuilder}
          getExpandedRows={expandedRow}
          onNavigateToRecord={(s) => drill.push({
            id: `srm:${s.id}`, label: s.memo_no, level: 1,
            module: 'srm_register', payload: s,
          })}
          statusOptions={statusOptions}
          statusKey="status"
        />
      ) : (
        <SRMDetailPanel srm={currentSRM} onPrint={() => setPrintSRM(currentSRM)} />
      )}
      <Dialog open={!!printSRM} onOpenChange={o => { if (!o) setPrintSRM(null); }}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          {printSRM && <SRMPrint srm={printSRM} onClose={() => setPrintSRM(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
