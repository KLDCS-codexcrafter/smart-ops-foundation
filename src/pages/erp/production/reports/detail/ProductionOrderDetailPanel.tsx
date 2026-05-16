/**
 * ProductionOrderDetailPanel.tsx — UPRA-2 Phase B · display-only read-only detail panel.
 * Closure card conditional render when status='closed' (Q4=(B)).
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Printer, Lock } from 'lucide-react';
import {
  PRODUCTION_ORDER_STATUS_LABELS,
  PRODUCTION_ORDER_STATUS_COLORS,
  type ProductionOrder,
} from '@/types/production-order';

export interface ProductionOrderDetailPanelProps {
  po: ProductionOrder;
  onPrint: () => void;
  onClose?: () => void;
}

const fmtINR = (n: number): string =>
  `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(n)}`;

const dash = (v: string | number | null | undefined): string =>
  v === null || v === undefined || v === '' ? '—' : String(v);

function Field({ label, value }: { label: string; value: React.ReactNode }): JSX.Element {
  return (
    <div className="text-xs">
      <div className="text-muted-foreground">{label}</div>
      <div className="font-mono mt-0.5">{value}</div>
    </div>
  );
}

export function ProductionOrderDetailPanel({ po, onPrint, onClose }: ProductionOrderDetailPanelProps): JSX.Element {
  const masterTotal = po.cost_structure?.master?.total ?? 0;
  const closedTotal = po.closed_cost_snapshot?.master?.total ?? null;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-lg font-mono">{po.doc_no}</CardTitle>
              <div className="text-sm mt-1">{po.output_item_name}</div>
              <div className="text-xs text-muted-foreground mt-0.5 font-mono">{po.planned_qty} {po.uom}</div>
            </div>
            <Badge variant="outline" className={PRODUCTION_ORDER_STATUS_COLORS[po.status]}>
              {PRODUCTION_ORDER_STATUS_LABELS[po.status]}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Field label="Master Cost" value={fmtINR(masterTotal)} />
          <Field label="Start" value={dash(po.start_date)} />
          <Field label="Target End" value={dash(po.target_end_date)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Master Fields</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Field label="BOM" value={dash(po.bom_id)} />
          <Field label="BOM Version" value={dash(po.bom_version)} />
          <Field label="Department" value={dash(po.department_name)} />
          <Field label="Start Date" value={dash(po.start_date)} />
          <Field label="Target End Date" value={dash(po.target_end_date)} />
          <Field label="Actual Completion" value={dash(po.actual_completion_date)} />
          <Field label="Customer" value={dash(po.customer_name)} />
          <Field label="Project" value={dash(po.project_id)} />
          <Field label="Batch No" value={dash(po.batch_no)} />
        </CardContent>
      </Card>

      {po.status === 'closed' && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Closure Snapshot</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Field label="Closed At" value={dash(po.closed_at)} />
            <Field label="Closed By" value={dash(po.closed_by_name)} />
            <Field label="Variance Id" value={dash(po.closed_variance_id)} />
            <Field label="Frozen Master Cost" value={closedTotal !== null ? fmtINR(closedTotal) : '—'} />
            <div className="col-span-2 md:col-span-3 text-xs">
              <div className="text-muted-foreground">Closure Remarks</div>
              <div className="mt-0.5 whitespace-pre-wrap">{dash(po.closure_remarks)}</div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Hookpoints</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Field label="QC Required" value={po.qc_required ? 'Yes' : 'No'} />
          <Field label="QC Scenario" value={dash(po.qc_scenario)} />
          <Field label="Linked Test Reports" value={po.linked_test_report_ids?.length ?? 0} />
          <Field label="Routed to Quarantine" value={po.routed_to_quarantine ? 'Yes' : 'No'} />
          <Field label="Export Project" value={po.is_export_project ? 'Yes' : 'No'} />
          <Field label="Job Work In" value={po.is_job_work_in ? 'Yes' : 'No'} />
          <Field label="Sales Order" value={dash(po.sales_order_id)} />
          <Field label="Production Plan" value={dash(po.production_plan_id)} />
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onPrint}>
          <Printer className="h-3 w-3 mr-1" /> Print
        </Button>
        {po.status === 'completed' && onClose && (
          <Button size="sm" onClick={onClose}>
            <Lock className="h-3 w-3 mr-1" /> Close PO
          </Button>
        )}
      </div>
    </div>
  );
}

export default ProductionOrderDetailPanel;
