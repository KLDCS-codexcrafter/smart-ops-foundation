/**
 * QuotationRegisterV2.tsx — Tally-Prime style Quotation register on UTS foundation
 * Sprint T-Phase-1.2.6c · Q1-b lock (parallel to old QuotationRegisterReport.tsx)
 * D-226 UTS compliant. Old register stays for one sprint as fallback (1.2.6e-audit removes).
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
  quotationsKey, QUOTATION_STAGE_LABELS, QUOTATION_STAGE_COLOURS,
  type Quotation, type QuotationStage,
} from '@/types/quotation';
import { dSum } from '@/lib/decimal-helpers';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { QuotationDetailPanel } from './detail/QuotationDetailPanel';
import { QuotationPrint } from './print/QuotationPrint';

const fmtINR = (n: number): string =>
  `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n)}`;

interface QuotationRegisterV2PanelProps {
  /** Optional initial filter (e.g. drill source). */
  initialFilter?: { sourceLabel?: string; stage?: QuotationStage };
}

export function QuotationRegisterV2Panel({ initialFilter }: QuotationRegisterV2PanelProps = {}) {
  const { entityCode } = useCardEntitlement();
  const safeEntity = entityCode || 'SMRT';
  const drill = useDrillDown();
  const [printQ, setPrintQ] = useState<Quotation | null>(null);
  const [filter, setFilter] = useState(initialFilter);
  useEffect(() => { setFilter(initialFilter); }, [initialFilter]);

  const allQs = useMemo<Quotation[]>(() => {
    try {
      // [JWT] GET /api/salesx/quotations/:entityCode
      return JSON.parse(localStorage.getItem(quotationsKey(safeEntity)) || '[]') as Quotation[];
    } catch { return []; }
  }, [safeEntity]);

  const quotations = useMemo<Quotation[]>(() => {
    if (!filter?.stage) return allQs;
    return allQs.filter(q => q.quotation_stage === filter.stage);
  }, [allQs, filter]);

  const meta: RegisterMeta<Quotation> = {
    registerCode: 'quotation_register_v2',
    title: 'Quotation Register',
    description: 'All quotations · drill into details for line items + stock dialog',
    dateAccessor: r => r.effective_date ?? r.quotation_date,
  };

  const columns: RegisterColumn<Quotation>[] = [
    { key: 'no', label: 'Quotation No', clickable: true, render: r => r.quotation_no, exportKey: 'quotation_no' },
    { key: 'date', label: 'Date', render: r => r.quotation_date, exportKey: 'quotation_date' },
    { key: 'eff', label: 'Effective', render: r => r.effective_date ?? r.quotation_date, exportKey: r => r.effective_date ?? r.quotation_date },
    { key: 'customer', label: 'Customer', render: r => r.customer_name ?? '—', exportKey: r => r.customer_name ?? '' },
    { key: 'rev', label: 'Rev', align: 'right', render: r => r.revision_number, exportKey: 'revision_number' },
    { key: 'valid', label: 'Valid Until', render: r => r.valid_until_date ?? '—', exportKey: r => r.valid_until_date ?? '' },
    { key: 'lines', label: 'Lines', align: 'right', render: r => r.items.length, exportKey: r => r.items.length },
    { key: 'total', label: 'Total ₹', align: 'right', render: r => fmtINR(r.total_amount), exportKey: 'total_amount' },
    { key: 'stage', label: 'Stage', render: r => (
      <Badge variant="outline" className={`text-[10px] capitalize ${QUOTATION_STAGE_COLOURS[r.quotation_stage]}`}>
        {QUOTATION_STAGE_LABELS[r.quotation_stage]}
      </Badge>
    ), exportKey: 'quotation_stage' },
  ];

  const statusOptions: StatusOption[] = (Object.keys(QUOTATION_STAGE_LABELS) as QuotationStage[])
    .map(s => ({ value: s, label: QUOTATION_STAGE_LABELS[s] }));

  const summaryBuilder = (f: Quotation[]): SummaryCard[] => {
    const confirmed = f.filter(q => q.quotation_stage === 'confirmed' || q.quotation_stage === 'sales_order');
    return [
      { label: 'Total Quotations', value: String(f.length) },
      { label: 'Confirmed', value: String(confirmed.length), tone: 'positive' },
      { label: 'Lost', value: String(f.filter(q => q.quotation_stage === 'lost').length), tone: 'negative' },
      { label: 'Total Value', value: fmtINR(dSum(f, q => q.total_amount)) },
      { label: 'Confirmed Value', value: fmtINR(dSum(confirmed, q => q.total_amount)), tone: 'positive' },
    ];
  };

  const expandedRow = (q: Quotation) => (
    <div className="space-y-2">
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Line Items</div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Item</TableHead>
            <TableHead>UOM</TableHead>
            <TableHead className="text-right">Qty</TableHead>
            <TableHead className="text-right">Rate ₹</TableHead>
            <TableHead className="text-right">Disc %</TableHead>
            <TableHead className="text-right">Tax %</TableHead>
            <TableHead className="text-right">Amount ₹</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {q.items.map(l => (
            <TableRow key={l.id}>
              <TableCell className="text-xs">{l.item_name}</TableCell>
              <TableCell className="text-xs">{l.uom ?? '—'}</TableCell>
              <TableCell className="text-right text-xs font-mono">{l.qty}</TableCell>
              <TableCell className="text-right text-xs font-mono">{fmtINR(l.rate)}</TableCell>
              <TableCell className="text-right text-xs font-mono">{l.discount_pct}</TableCell>
              <TableCell className="text-right text-xs font-mono">{l.tax_pct}</TableCell>
              <TableCell className="text-right text-xs font-mono">{fmtINR(l.amount)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  const currentQ = drill.current?.payload as Quotation | undefined;

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      <DrillSourceBanner sourceLabel={filter?.sourceLabel} onClear={() => setFilter(undefined)} />
      <DrillBreadcrumb rootLabel="Quotation Register" trail={drill.trail} onGoTo={drill.goTo} onReset={drill.reset} />
      {!currentQ ? (
        <UniversalRegisterGrid<Quotation>
          entityCode={safeEntity}
          meta={meta}
          rows={quotations}
          columns={columns}
          summaryBuilder={summaryBuilder}
          getExpandedRows={expandedRow}
          onNavigateToRecord={(q) => drill.push({
            id: `quotation:${q.id}`, label: q.quotation_no, level: 1,
            module: 'quotation_register_v2', payload: q,
          })}
          statusOptions={statusOptions}
          statusKey="quotation_stage"
        />
      ) : (
        <QuotationDetailPanel quotation={currentQ} onPrint={() => setPrintQ(currentQ)} />
      )}
      <Dialog open={!!printQ} onOpenChange={o => { if (!o) setPrintQ(null); }}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          {printQ && <QuotationPrint quotation={printQ} onClose={() => setPrintQ(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default QuotationRegisterV2Panel;
