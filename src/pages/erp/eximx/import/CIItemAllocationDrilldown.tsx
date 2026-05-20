/**
 * @file        src/pages/erp/eximx/import/CIItemAllocationDrilldown.tsx
 * @purpose     Flagship 6-Part Allocation drilldown · tabs A-F · embeds CIF + Duty waterfall panels
 * @sprint      T-Phase-1.EX-5-CommercialInvoice-6PartAllocation-CIFWaterfall
 * @decisions   EX-5-Q2=a · EX-5-Q5=a Rule 10 · EX-5-Q6=a 10-row waterfall · EX-5-Q4=a CICustomeVal editable
 */
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Pencil } from 'lucide-react';
import { CIFWaterfallPanel } from './CIFWaterfallPanel';
import { DutyWaterfallPanel } from './DutyWaterfallPanel';
import { CICustomsRevaluationDialog } from './CICustomsRevaluationDialog';
import type { CommercialInvoice, CILine } from '@/types/commercial-invoice';
import type { CICustomsRevaluationEntry } from '@/types/ci-item-allocation';
import { computeReconciliationVariance } from '@/types/reconciliation-event';

interface Props {
  entityCode: string;
  ci: CommercialInvoice;
  line: CILine;
  onRevaluate: (entry: CICustomsRevaluationEntry) => void;
}

export function CIItemAllocationDrilldown({ entityCode, ci, line, onRevaluate }: Props): JSX.Element {
  const [dialogOpen, setDialogOpen] = useState(false);
  const a = line.allocation;

  const inputLines = [{
    line_id: line.id, qty: line.qty, rate_forex: line.rate_foreign_currency,
    cost_forex: line.fob_value_foreign, fob_value_inr: line.fob_value_inr,
    gross_weight_kgs: line.gross_weight_kgs, volume_cbm: line.volume_cbm,
    specific_assignment_pct: a.part_b.specific_assignment_pct,
  }];
  const voucherTotals = {
    voucher_insurance_inr: ci.total_voucher_insurance_inr,
    voucher_freight_inr: ci.total_voucher_freight_inr,
    voucher_exworks_inr: ci.total_voucher_exworks_inr,
    voucher_packing_inr: ci.total_voucher_packing_inr,
  };

  function commitRevaluation(newValue: number, justification: string, gazetteRef: string): void {
    const variance = computeReconciliationVariance(a.part_c.actual_cif_value_inr, newValue);
    const entry: CICustomsRevaluationEntry = {
      id: `crh-${Date.now()}`,
      timestamp: new Date().toISOString(),
      user_id: 'current-user', // [JWT] resolve via session
      amount_before_inr: a.part_c.actual_cif_value_inr,
      amount_after_inr: newValue,
      variance_inr: variance.variance_inr,
      variance_pct: variance.variance_pct,
      justification,
      gazette_ref: gazetteRef,
      reference_mlgit_id: ci.related_mlgit_id,
    };
    onRevaluate(entry);
  }

  return (
    <Card className="border-l-4 border-l-primary">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          6-Part Allocation Drilldown · Line {line.line_no} · {line.item_name}
          <Badge variant="outline">CTH {line.cth_code}</Badge>
          <Badge variant="outline">{line.country_of_origin}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="a" className="w-full">
          <TabsList className="grid grid-cols-6 w-full">
            <TabsTrigger value="a">A · Valuation</TabsTrigger>
            <TabsTrigger value="b">B · CIF Body</TabsTrigger>
            <TabsTrigger value="c">C · Rule 10</TabsTrigger>
            <TabsTrigger value="d">D · Duty</TabsTrigger>
            <TabsTrigger value="e">E · Summary</TabsTrigger>
            <TabsTrigger value="f">F · Expense Band</TabsTrigger>
          </TabsList>

          <TabsContent value="a" className="mt-4 space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Import Valuation Method</Label><div className="font-mono">{a.part_a.import_valuation_method}</div></div>
              <div><Label>Custom Exchange Rate</Label><div className="font-mono">₹{a.part_a.custom_exchange_rate}</div></div>
              <div><Label>Customs Info Active</Label><div>{a.part_a.customs_info_active ? 'Yes' : 'No'}</div></div>
              <div><Label>FTA Preferential Banner</Label><div>{a.part_a.fta_preferential_banner_active ? 'Active' : 'Inactive'}</div></div>
              <div><Label>Scheme Import Banner</Label><div>{a.part_a.scheme_import_banner_active ? 'Active' : 'Inactive'}</div></div>
              <div><Label>Scheme Notification</Label><div className="font-mono text-xs">{a.part_a.scheme_notification_ref || '—'}</div></div>
            </div>
          </TabsContent>

          <TabsContent value="b" className="mt-4">
            <CIFWaterfallPanel
              inputLines={inputLines}
              voucherTotals={voucherTotals}
              customExchangeRate={a.part_a.custom_exchange_rate}
              initialBasis={a.part_b.pro_rata_basis}
            />
          </TabsContent>

          <TabsContent value="c" className="mt-4 space-y-3 text-sm">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">CIF + Rule 10 Loadings</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                <div><Label>CIF Value (UDF 4122)</Label><div className="font-mono">₹{a.part_c.cif_value_inr.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div></div>
                <div>
                  <Label>Actual CIF · CICustomeVal (UDF 4123)</Label>
                  <div className="flex items-center gap-2">
                    <div className="font-mono">₹{a.part_c.actual_cif_value_inr.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
                    <Button size="sm" variant="outline" onClick={() => setDialogOpen(true)}><Pencil className="w-3 h-3 mr-1" /> Revalue</Button>
                  </div>
                </div>
                <div><Label>Royalty (Rule 10(1)(c))</Label><div className="font-mono">₹{a.part_c.royalty_inr.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div></div>
                <div><Label>License Fee (Rule 10(1)(c))</Label><div className="font-mono">₹{a.part_c.license_fee_inr.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div></div>
                <div><Label>SVB Loading %</Label><div className="font-mono">{a.part_c.svb_loading_pct}%</div></div>
                <div><Label>Audit Events</Label><div>{a.part_c.customs_revaluation_history.length}</div></div>
              </CardContent>
            </Card>

            {a.part_c.customs_revaluation_history.length > 0 && (
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">CICustomeVal Audit Trail</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {a.part_c.customs_revaluation_history.map((h) => (
                    <div key={h.id} className="text-xs p-2 bg-muted/40 rounded">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline">{h.timestamp.slice(0, 10)}</Badge>
                        <span className="font-mono">₹{h.amount_before_inr.toFixed(0)} → ₹{h.amount_after_inr.toFixed(0)}</span>
                        <span className="text-muted-foreground">({h.variance_pct.toFixed(3)}%)</span>
                        {h.reference_mlgit_id && <Badge variant="outline" className="font-mono">→ {h.reference_mlgit_id}</Badge>}
                      </div>
                      <div className="text-muted-foreground mt-1">{h.justification}</div>
                      <div className="text-xs italic mt-1">Gazette: {h.gazette_ref}</div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="d" className="mt-4">
            <DutyWaterfallPanel
              entityCode={entityCode}
              cifValueInr={a.part_c.actual_cif_value_inr || a.part_c.cif_value_inr}
              cthCode={line.cth_code}
              countryCode={line.country_of_origin}
              effectiveDate={ci.ci_date}
            />
          </TabsContent>

          <TabsContent value="e" className="mt-4 text-sm">
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Total Applicable Duty</Label><div className="font-mono">₹{a.part_e.total_applicable_duty_inr.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div></div>
              <div><Label>Duty % on CIF</Label><div className="font-mono">{a.part_e.duty_pct_on_cif}%</div></div>
              <div><Label>Duty % on Assessable</Label><div className="font-mono">{a.part_e.duty_pct_on_assessable}%</div></div>
            </div>
          </TabsContent>

          <TabsContent value="f" className="mt-4 text-sm">
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Per-Batch Insurance</Label><div className="font-mono">₹{a.part_f.per_batch_insurance_inr.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div></div>
              <div><Label>Per-Batch Freight</Label><div className="font-mono">₹{a.part_f.per_batch_freight_inr.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div></div>
              <div><Label>Per-Batch ExWorks</Label><div className="font-mono">₹{a.part_f.per_batch_exworks_inr.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div></div>
              <div><Label>Per-Batch Packing</Label><div className="font-mono">₹{a.part_f.per_batch_packing_inr.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div></div>
              <div><Label>Per-Batch CHA</Label><div className="font-mono">₹{a.part_f.per_batch_cha_inr.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div></div>
              <div><Label>Per-Batch Landing</Label><div className="font-mono">₹{a.part_f.per_batch_landing_inr.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div></div>
              <div className="col-span-2"><Label>Per-Batch Total Expense</Label><div className="font-mono font-semibold">₹{a.part_f.per_batch_total_expense_inr.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div></div>
              <div><Label>Costing Method (Q15 READ-ONLY)</Label><Badge variant="outline">{a.part_f.applicable_costing_method ?? 'not-set'}</Badge></div>
            </div>
            <p className="text-xs text-muted-foreground mt-3 italic">
              Costing method consumed from <code>inventory-item.default_costing_method</code> · per-item operator override deferred to EX-10 (D-NEW-FF).
            </p>
          </TabsContent>
        </Tabs>

        <CICustomsRevaluationDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          ciNumber={ci.ci_number}
          lineNo={line.line_no}
          mlgitNumber={ci.related_mlgit_no}
          currentActualCIF={a.part_c.actual_cif_value_inr}
          onCommit={commitRevaluation}
        />
      </CardContent>
    </Card>
  );
}

function Label({ children }: { children: React.ReactNode }): JSX.Element {
  return <div className="text-xs text-muted-foreground">{children}</div>;
}
