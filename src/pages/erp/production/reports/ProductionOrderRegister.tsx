/**
 * ProductionOrderRegister.tsx — UPRA-2 Phase B · T2-1 V2 (in-place replacement)
 * Canonical UniversalRegisterGrid<ProductionOrder> consumer.
 * Sidebar route: rpt-production-order-register (PRESERVED · ProductionPage import 0-diff)
 * Export name: ProductionOrderRegisterPanel (PRESERVED)
 * Workflow extracted to actions/ProductionOrderActionsDialog.tsx (Close action with byte-identical engine call).
 * Navigate-to-QualiCheck stays inline as row action (zero state mutation · per Q3).
 * Tabs migrated to canonical statusOptions per Q5.
 * [JWT] GET /api/production/production-orders
 */
import { useMemo, useState, useCallback } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useProductionOrders } from '@/hooks/useProductionOrders';
import { useEntityCode } from '@/hooks/useEntityCode';
import { listProductionConfirmations } from '@/lib/production-confirmation-engine';
import { UniversalRegisterGrid } from '@/components/registers/UniversalRegisterGrid';
import type { RegisterColumn, RegisterMeta, SummaryCard, StatusOption } from '@/components/registers/UniversalRegisterTypes';
import {
  PRODUCTION_ORDER_STATUS_LABELS,
  PRODUCTION_ORDER_STATUS_COLORS,
  type ProductionOrder,
  type ProductionOrderStatus,
} from '@/types/production-order';
import { ProductionOrderActionsDialog } from './actions/ProductionOrderActionsDialog';
import { ProductionOrderDetailPanel } from './detail/ProductionOrderDetailPanel';
import { ProductionOrderPrint } from './print/ProductionOrderPrint';

export function ProductionOrderRegisterPanel(): JSX.Element {
  const { orders, reload } = useProductionOrders();
  const { entityCode } = useEntityCode();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<ProductionOrder | null>(null);
  const [closeTarget, setCloseTarget] = useState<ProductionOrder | null>(null);
  const [printing, setPrinting] = useState<ProductionOrder | null>(null);

  // D-NEW-L · QC inspection count by PO id (preserved verbatim from old code)
  const qcCountByPo = useMemo(() => {
    const map = new Map<string, number>();
    try {
      const pcs = listProductionConfirmations(entityCode);
      for (const pc of pcs) {
        const n = pc.linked_test_report_ids?.length ?? 0;
        if (n > 0) map.set(pc.production_order_id, (map.get(pc.production_order_id) ?? 0) + n);
      }
    } catch { /* noop */ }
    return map;
  }, [entityCode]);

  const meta: RegisterMeta<ProductionOrder> = {
    registerCode: 'production_order_register',
    title: 'Production Order Register',
    description: 'Master production orders · close action with maker-checker · Tally-Prime register',
    dateAccessor: r => r.start_date,
  };

  const columns: RegisterColumn<ProductionOrder>[] = [
    { key: 'doc_no', label: 'Doc No', clickable: true, render: r => r.doc_no, exportKey: 'doc_no' },
    { key: 'start_date', label: 'Start', render: r => r.start_date, exportKey: 'start_date' },
    { key: 'output', label: 'Output Item', render: r => r.output_item_name, exportKey: 'output_item_name' },
    { key: 'planned', label: 'Planned Qty', align: 'right', render: r => `${r.planned_qty} ${r.uom}`, exportKey: r => r.planned_qty },
    { key: 'customer', label: 'Customer/Project', render: r => r.customer_name || r.project_id || '—', exportKey: r => r.customer_name ?? r.project_id ?? '' },
    {
      key: 'qc', label: 'QC',
      render: r => {
        const n = qcCountByPo.get(r.id) ?? 0;
        return n > 0 ? (
          <button type="button" className="underline text-primary text-xs"
            onClick={(e) => { e.stopPropagation(); navigate(`/erp/qualicheck?m=inspection-list&po=${r.id}`); }}>
            Inspected ({n})
          </button>
        ) : <span className="text-muted-foreground text-xs">—</span>;
      },
      exportKey: r => qcCountByPo.get(r.id) ?? 0,
    },
    {
      key: 'status', label: 'Status',
      render: r => <Badge variant="outline" className={PRODUCTION_ORDER_STATUS_COLORS[r.status]}>{PRODUCTION_ORDER_STATUS_LABELS[r.status]}</Badge>,
      exportKey: 'status',
    },
    {
      key: 'actions', label: 'Action', align: 'right',
      render: r => r.status === 'completed' ? (
        <Button size="sm" variant="outline" className="h-7 text-[10px] px-2"
          onClick={(e) => { e.stopPropagation(); setCloseTarget(r); }}>
          Close
        </Button>
      ) : null,
      exportKey: r => r.status === 'completed' ? 'closeable' : '',
    },
  ];

  const statusOptions: StatusOption[] = (Object.keys(PRODUCTION_ORDER_STATUS_LABELS) as ProductionOrderStatus[])
    .map(s => ({ value: s, label: PRODUCTION_ORDER_STATUS_LABELS[s] }));

  const summaryBuilder = (filtered: ProductionOrder[]): SummaryCard[] => {
    const draft = filtered.filter(p => p.status === 'draft').length;
    const inProgress = filtered.filter(p => p.status === 'in_progress' || p.status === 'released').length;
    const completed = filtered.filter(p => p.status === 'completed').length;
    const closed = filtered.filter(p => p.status === 'closed').length;
    return [
      { label: 'Total POs', value: String(filtered.length) },
      { label: 'Draft', value: String(draft) },
      { label: 'Active', value: String(inProgress) },
      { label: 'Completed · awaiting close', value: String(completed), tone: 'warning' },
      { label: 'Closed', value: String(closed), tone: 'positive' },
    ];
  };

  const handleClosed = useCallback(() => {
    setCloseTarget(null);
    reload();
  }, [reload]);

  return (
    <div className="max-w-7xl mx-auto space-y-4 p-6">
      <UniversalRegisterGrid<ProductionOrder>
        rows={orders}
        meta={meta}
        columns={columns}
        statusKey="status"
        statusOptions={statusOptions}
        summaryBuilder={summaryBuilder}
        onNavigateToRecord={setSelected}
      />
      <Dialog open={!!selected} onOpenChange={o => !o && setSelected(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selected && (
            <ProductionOrderDetailPanel
              po={selected}
              onPrint={() => setPrinting(selected)}
              onClose={selected.status === 'completed' ? () => { setCloseTarget(selected); setSelected(null); } : undefined}
            />
          )}
        </DialogContent>
      </Dialog>
      <ProductionOrderActionsDialog
        po={closeTarget}
        open={!!closeTarget}
        onClose={() => setCloseTarget(null)}
        onClosed={handleClosed}
      />
      <Dialog open={!!printing} onOpenChange={o => !o && setPrinting(null)}>
        <DialogContent className="max-w-5xl">
          {printing && <ProductionOrderPrint po={printing} onClose={() => setPrinting(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ProductionOrderRegisterPanel;
