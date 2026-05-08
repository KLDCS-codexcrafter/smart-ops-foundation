/**
 * @file        ProductionTraceRegister.tsx
 * @purpose     Cross-departmental Production Order tracer · Sales → Production → Procurement → Inventory
 * @who         Auditors · Production planners · Procurement · Plant managers
 * @when        Phase 1.A.2.b · Production Reports sprint
 * @sprint      T-Phase-1.A.2.b-Production-Reports
 * @iso         Maintainability · Usability · Compliance
 * @decisions   D-NEW-S (Production Trace Register · 4-module cross-departmental view)
 * @reuses      useProductionOrders · useProductionPlans · useJobCards ·
 *              useOrders · useQuotations · useProjects ·
 *              useMaterialIndents · useMaterialIssueNotes · listProductionConfirmations
 * @[JWT]       Multiple read-only endpoints across modules
 */

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Workflow, ExternalLink, Search, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useProductionOrders } from '@/hooks/useProductionOrders';
import { useProductionPlans } from '@/hooks/useProductionPlans';
import { useJobCards } from '@/hooks/useJobCards';
import { useOrders } from '@/hooks/useOrders';
import { useQuotations } from '@/hooks/useQuotations';
import { useProjects } from '@/hooks/useProjects';
import { useMaterialIndents } from '@/hooks/useMaterialIndents';
import { useMaterialIssueNotes } from '@/hooks/useMaterialIssueNotes';
import { useEntityCode } from '@/hooks/useEntityCode';
import { listProductionConfirmations } from '@/lib/production-confirmation-engine';
import { dAdd, round2 } from '@/lib/decimal-helpers';

export function ProductionTraceRegisterPanel(): JSX.Element {
  const { entityCode } = useEntityCode();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPoId, setSelectedPoId] = useState<string | null>(null);

  const { orders: productionOrders } = useProductionOrders();
  const { plans } = useProductionPlans();
  const { jobCards } = useJobCards();
  const { orders: salesOrPurchaseOrders } = useOrders(entityCode);
  const { quotations } = useQuotations(entityCode);
  const { projects } = useProjects(entityCode);
  const materialIndents = useMaterialIndents();
  const { mins: materialIssueNotes } = useMaterialIssueNotes(entityCode);

  const productionConfirmations = useMemo(() => listProductionConfirmations(entityCode), [entityCode]);

  const matchingPOs = useMemo(() => {
    if (!searchQuery.trim()) return productionOrders.slice(0, 10);
    const q = searchQuery.trim().toLowerCase();
    return productionOrders.filter(po =>
      po.doc_no?.toLowerCase().includes(q) ||
      po.production_plan_id?.toLowerCase().includes(q) ||
      plans.find(p => p.id === po.production_plan_id && p.doc_no?.toLowerCase().includes(q)) !== undefined
    ).slice(0, 20);
  }, [productionOrders, plans, searchQuery]);

  const selectedPO = useMemo(() =>
    productionOrders.find(po => po.id === selectedPoId) ?? null,
    [productionOrders, selectedPoId]
  );

  const trace = useMemo(() => {
    if (!selectedPO) return null;
    const plan = plans.find(p => p.id === selectedPO.production_plan_id) ?? null;
    const salesOrder = salesOrPurchaseOrders.find(o =>
      o.base_voucher_type === 'Sales Order' && o.id === selectedPO.sales_order_id
    ) ?? null;
    const quotation = salesOrder?.quotation_id
      ? quotations.find(q => q.id === salesOrder.quotation_id) ?? null
      : null;
    const project = selectedPO.reference_project_id
      ? projects.find(p => p.id === selectedPO.reference_project_id) ?? null
      : null;
    const poJobCards = jobCards.filter(jc => jc.production_order_id === selectedPO.id);
    const poConfirmations = productionConfirmations.filter(pc => pc.production_order_id === selectedPO.id);
    // MaterialIssueNote has no direct production_order_id link; trace via project_centre_id
    const poIssues = selectedPO.reference_project_id
      ? materialIssueNotes.filter(mi => mi.project_centre_id === selectedPO.reference_project_id)
      : [];
    const productionIndents = selectedPO.reference_project_id
      ? materialIndents.filter(mi =>
          mi.originating_department_name?.toLowerCase().includes('production') &&
          mi.project_id === selectedPO.reference_project_id
        )
      : [];
    const indentNos = productionIndents.map(i => i.voucher_no);
    const generatedPOs = salesOrPurchaseOrders.filter(o =>
      o.base_voucher_type === 'Purchase Order' &&
      !!o.ref_no && indentNos.includes(o.ref_no)
    );
    const totalIssued = round2(poIssues.reduce((s, mi) => round2(dAdd(s, mi.total_value || 0)), 0));
    const totalProduced = round2(poConfirmations.reduce((s, pc) =>
      round2(dAdd(s, pc.lines?.reduce((ss, l) => ss + (l.actual_qty || 0), 0) || 0)), 0));
    const yieldPct = selectedPO.planned_qty > 0
      ? round2((totalProduced / selectedPO.planned_qty) * 100)
      : 0;
    const openIndents = productionIndents.filter(i => i.status !== 'closed' && i.status !== 'pre_closed' && i.status !== 'cancelled');
    const gaps: string[] = [];
    if (yieldPct < 100) gaps.push(`Yield ${yieldPct}% · Target 100%`);
    if (openIndents.length > 0) gaps.push(`${openIndents.length} indent(s) still open`);
    return { plan, salesOrder, quotation, project, poJobCards, poConfirmations, poIssues, productionIndents, generatedPOs, totalIssued, totalProduced, yieldPct, gaps };
  }, [selectedPO, plans, salesOrPurchaseOrders, quotations, projects, jobCards, productionConfirmations, materialIssueNotes, materialIndents]);

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Workflow className="h-6 w-6" /> Production Trace Register
        </h1>
        <p className="text-sm text-muted-foreground">
          Cross-departmental tracer · Sales → Production → Procurement → Inventory
        </p>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-3">
          <div>
            <Label>Search by Production Order / Plan / SO / Indent No</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Type PO number, plan number, SO number..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              <Button variant="outline" size="icon"><Search className="h-4 w-4" /></Button>
            </div>
          </div>
          {!selectedPO && matchingPOs.length > 0 && (
            <div className="text-xs space-y-1 max-h-48 overflow-y-auto">
              {matchingPOs.map(po => (
                <button
                  key={po.id}
                  type="button"
                  onClick={() => setSelectedPoId(po.id)}
                  className="w-full text-left p-2 rounded hover:bg-muted text-xs"
                >
                  <span className="font-mono font-semibold">{po.doc_no}</span> · {po.output_item_name} · Qty {po.planned_qty}
                </button>
              ))}
            </div>
          )}
          {selectedPO && (
            <Button variant="ghost" size="sm" onClick={() => setSelectedPoId(null)}>
              Clear selection
            </Button>
          )}
        </CardContent>
      </Card>

      {selectedPO && trace && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Selected: {selectedPO.doc_no}</CardTitle>
              <p className="text-xs text-muted-foreground">{selectedPO.output_item_name} · Planned Qty {selectedPO.planned_qty}</p>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Sales (Upstream)</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {trace.salesOrder ? (
                <div className="flex items-center justify-between">
                  <div>
                    <Badge variant="outline">SO</Badge> {trace.salesOrder.order_no} · {trace.salesOrder.party_name}
                  </div>
                  <Button variant="link" size="sm" onClick={() => { window.location.href = `/erp/salesx?m=order-desk&id=${trace.salesOrder!.id}`; }}>
                    Open in SalesX <ExternalLink className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              ) : (
                <div className="text-muted-foreground text-xs">No Sales Order linked (standalone production)</div>
              )}
              {trace.quotation && (
                <div className="text-xs text-muted-foreground">↳ Source Quotation: {trace.quotation.quotation_no}</div>
              )}
              {trace.project && (
                <div className="text-xs text-muted-foreground">↳ Project: {trace.project.project_no} — {trace.project.project_name}</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Production</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {trace.plan && (
                <div><Badge variant="outline">Plan</Badge> {trace.plan.doc_no} · {trace.plan.plan_type}</div>
              )}
              <div><Badge variant="outline">Job Cards</Badge> {trace.poJobCards.length} · {trace.poJobCards.map(jc => jc.doc_no).join(' · ') || '—'}</div>
              <div><Badge variant="outline">Confirmations</Badge> {trace.poConfirmations.length} · Produced {trace.totalProduced.toLocaleString('en-IN')}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Procurement · Production-raised Indents</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-sm">
              {trace.productionIndents.length === 0 ? (
                <div className="text-xs text-muted-foreground">No Production-raised indents found for this project</div>
              ) : trace.productionIndents.map(i => (
                <div key={i.id} className="flex items-center justify-between text-xs">
                  <span><Badge variant="outline" className="mr-2">{i.status}</Badge>{i.voucher_no}</span>
                  <Button variant="link" size="sm" onClick={() => { window.location.href = `/erp/requestx?m=indent-detail&id=${i.id}`; }}>
                    Open <ExternalLink className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          {trace.generatedPOs.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Procurement · Purchase Orders</CardTitle></CardHeader>
              <CardContent className="space-y-1 text-sm">
                {trace.generatedPOs.map(po => (
                  <div key={po.id} className="flex items-center justify-between text-xs">
                    <span><Badge variant="outline" className="mr-2">{po.status}</Badge>{po.order_no} · {po.party_name}</span>
                    <Button variant="link" size="sm" onClick={() => { window.location.href = `/erp/procure360?m=purchase-order-register&id=${po.id}`; }}>
                      Open <ExternalLink className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle className="text-sm">Inventory · Material Issues</CardTitle></CardHeader>
            <CardContent className="text-sm">
              <div><Badge variant="outline">Issues</Badge> {trace.poIssues.length} · ₹{trace.totalIssued.toLocaleString('en-IN')} issued</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Gaps &amp; Indicators</CardTitle></CardHeader>
            <CardContent className="text-sm space-y-1">
              {trace.gaps.length === 0 ? (
                <div className="flex items-center gap-2 text-success text-xs"><CheckCircle2 className="h-4 w-4" /> No gaps detected</div>
              ) : trace.gaps.map((g, idx) => (
                <div key={`gap-${idx}`} className="flex items-center gap-2 text-warning text-xs">
                  <AlertTriangle className="h-4 w-4" /> {g}
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

export default ProductionTraceRegisterPanel;
