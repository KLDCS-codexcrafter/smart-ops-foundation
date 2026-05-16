/**
 * ProductionOrderPrint.tsx — UPRA-2 Phase B · A4 portrait shop-floor PO document.
 * Mirrors JobCardPrint pattern (UPRA-2 Phase A reference).
 */
import { UniversalPrintFrame, type PrintCompany } from '@/components/print/UniversalPrintFrame';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useEntityCode } from '@/hooks/useEntityCode';
import type { ProductionOrder } from '@/types/production-order';

const fmtINR = (n: number): string =>
  `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(n)}`;

export interface ProductionOrderPrintProps {
  po: ProductionOrder;
  onClose?: () => void;
}

export function ProductionOrderPrint({ po, onClose }: ProductionOrderPrintProps): JSX.Element {
  const { entityCode } = useEntityCode();
  const company: PrintCompany = { name: entityCode || 'Operix', gstin: '—', pan: '—' };
  const masterTotal = po.cost_structure?.master?.total ?? 0;
  const closedTotal = po.closed_cost_snapshot?.master?.total ?? null;

  return (
    <UniversalPrintFrame
      company={company}
      title="Production Order"
      docNo={po.doc_no}
      voucherDate={po.start_date}
      onClose={onClose}
      signatories={['Planner', 'Supervisor', 'QC']}
      referenceBlock={
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div><span className="font-semibold">Output Item:</span> {po.output_item_name}</div>
          <div><span className="font-semibold">Planned Qty:</span> {po.planned_qty} {po.uom}</div>
          <div><span className="font-semibold">BOM:</span> {po.bom_id} (v{po.bom_version})</div>
          <div><span className="font-semibold">Status:</span> {po.status}</div>
          <div><span className="font-semibold">Department:</span> {po.department_name || '—'}</div>
          <div><span className="font-semibold">Customer:</span> {po.customer_name || po.project_id || '—'}</div>
          <div><span className="font-semibold">Start:</span> {po.start_date}</div>
          <div><span className="font-semibold">Target End:</span> {po.target_end_date}</div>
          <div><span className="font-semibold">Actual Completion:</span> {po.actual_completion_date ?? '—'}</div>
          <div><span className="font-semibold">FY:</span> {po.fiscal_year_id ?? '—'}</div>
        </div>
      }
      termsAndConditions="Shop floor production document · all material issues and QC results must be logged against this PO."
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Field</TableHead>
            <TableHead>Value</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow><TableCell>QC Required</TableCell><TableCell>{po.qc_required ? 'Yes' : 'No'}</TableCell></TableRow>
          <TableRow><TableCell>QC Scenario</TableCell><TableCell>{po.qc_scenario ?? '—'}</TableCell></TableRow>
          <TableRow><TableCell>Sales Order</TableCell><TableCell>{po.sales_order_id ?? '—'}</TableCell></TableRow>
          <TableRow><TableCell>Production Plan</TableCell><TableCell>{po.production_plan_id ?? '—'}</TableCell></TableRow>
          <TableRow><TableCell>Batch No</TableCell><TableCell>{po.batch_no ?? '—'}</TableCell></TableRow>
          <TableRow><TableCell>Master Cost Total</TableCell><TableCell className="font-mono">{fmtINR(masterTotal)}</TableCell></TableRow>
        </TableBody>
      </Table>

      {po.status === 'closed' && (
        <div className="mt-4 border rounded p-3 text-xs space-y-1">
          <div className="font-semibold">Closure</div>
          <div>Closed At: {po.closed_at ?? '—'}</div>
          <div>Closed By: {po.closed_by_name ?? '—'}</div>
          <div>Remarks: {po.closure_remarks || '—'}</div>
          <div>Frozen Master Cost: <span className="font-mono">{closedTotal !== null ? fmtINR(closedTotal) : '—'}</span></div>
        </div>
      )}

      <div className="mt-4 text-[10px] text-muted-foreground">
        Created: {po.created_at} by {po.created_by}
      </div>
    </UniversalPrintFrame>
  );
}

export default ProductionOrderPrint;
