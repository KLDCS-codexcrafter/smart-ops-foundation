/**
 * @file        src/pages/erp/eximx/import/CIDetail.tsx
 * @purpose     CI detail · header + lines list + per-line "Open 6-Part" expand · Saathi panel
 * @sprint      T-Phase-1.EX-5-CommercialInvoice-6PartAllocation-CIFWaterfall
 */
import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, BookOpen, FileText, ChevronDown, ChevronRight } from 'lucide-react';
import { useEntityCode } from '@/hooks/useEntityCode';
import { getCI, loadCIs, saveCIs } from '@/lib/commercial-invoice-engine';
import { CIAllocationSaathiPanel } from '../saathi/CIAllocationSaathiPanel';
import { CIItemAllocationDrilldown } from './CIItemAllocationDrilldown';
import { CILineageBreadcrumb } from './CILineageBreadcrumb';
import type { CommercialInvoice } from '@/types/commercial-invoice';
import type { CICustomsRevaluationEntry } from '@/types/ci-item-allocation';

export function CIDetail(): JSX.Element {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { entityCode } = useEntityCode();
  const [showSaathi, setShowSaathi] = useState(false);
  const [expandedLineId, setExpandedLineId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  void refreshKey;
  const ci = entityCode ? getCI(entityCode, id) : null;

  if (!ci) {
    return (
      <div>
        <Button variant="ghost" onClick={() => navigate('/erp/eximx/import')}><ArrowLeft className="w-4 h-4 mr-2" /> Back</Button>
        <p className="mt-4">CI not found: {id}</p>
      </div>
    );
  }

  function persistRevaluation(lineId: string, entry: CICustomsRevaluationEntry): void {
    if (!entityCode || !ci) return;
    const cis = loadCIs(entityCode);
    const updated: CommercialInvoice[] = cis.map((c) => {
      if (c.id !== ci.id) return c;
      return {
        ...c,
        updated_at: new Date().toISOString(),
        total_actual_cif_inr: c.lines.reduce((s, l) => s + (l.id === lineId ? entry.amount_after_inr : l.allocation.part_c.actual_cif_value_inr), 0),
        lines: c.lines.map((l) => {
          if (l.id !== lineId) return l;
          return {
            ...l,
            allocation: {
              ...l.allocation,
              part_c: {
                ...l.allocation.part_c,
                actual_cif_value_inr: entry.amount_after_inr,
                customs_revaluation_history: [...l.allocation.part_c.customs_revaluation_history, entry],
              },
            },
          };
        }),
      };
    });
    saveCIs(entityCode, updated);
    setRefreshKey((k) => k + 1);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/erp/eximx/import')}><ArrowLeft className="w-4 h-4" /></Button>
          <div>
            <h1 className="text-2xl font-bold font-mono flex items-center gap-2"><FileText className="w-6 h-6" /> {ci.ci_number}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge>{ci.status}</Badge>
              <Badge variant="outline">PO: {ci.related_import_po_no}</Badge>
              {ci.related_mlgit_no && <Badge variant="outline">MLGIT: {ci.related_mlgit_no}</Badge>}
              <Badge variant="outline">{ci.currency_code} · BR ₹{ci.booking_rate} · CER ₹{ci.customs_exchange_rate}</Badge>
              {ci.fta_claimed && <Badge variant="outline">FTA</Badge>}
            </div>
          </div>
        </div>
        <Button variant="outline" onClick={() => setShowSaathi((v) => !v)}><BookOpen className="w-4 h-4 mr-2" /> Saathi</Button>
      </div>

      <CILineageBreadcrumb poNumber={ci.related_import_po_no} mlgitNumber={ci.related_mlgit_no} ciNumber={ci.ci_number} />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3 space-y-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Voucher Totals (Apportioned across {ci.lines.length} line{ci.lines.length === 1 ? '' : 's'})</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div><div className="text-xs text-muted-foreground">Insurance</div><div className="font-mono">₹{ci.total_voucher_insurance_inr.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div></div>
              <div><div className="text-xs text-muted-foreground">Freight</div><div className="font-mono">₹{ci.total_voucher_freight_inr.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div></div>
              <div><div className="text-xs text-muted-foreground">ExWorks</div><div className="font-mono">₹{ci.total_voucher_exworks_inr.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div></div>
              <div><div className="text-xs text-muted-foreground">Packing</div><div className="font-mono">₹{ci.total_voucher_packing_inr.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Lines ({ci.lines.length})</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {ci.lines.map((line) => {
                const isExpanded = expandedLineId === line.id;
                return (
                  <div key={line.id} className="border rounded">
                    <button
                      type="button"
                      onClick={() => setExpandedLineId(isExpanded ? null : line.id)}
                      className="w-full text-left p-3 flex items-center justify-between hover:bg-muted/40"
                    >
                      <div>
                        <div className="font-semibold text-sm">Line {line.line_no} · {line.item_name}</div>
                        <div className="text-xs text-muted-foreground mt-1 font-mono">
                          CTH {line.cth_code} · {line.country_of_origin} · {line.qty} {line.uom} · CIF ₹{line.allocation.part_c.cif_value_inr.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {line.allocation.part_c.customs_revaluation_history.length > 0 && (
                          <Badge className="bg-warning/15 text-warning">Revalued</Badge>
                        )}
                        <Badge variant="outline">{isExpanded ? 'Close' : 'Open 6-Part'}</Badge>
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </div>
                    </button>
                    {isExpanded && entityCode && (
                      <div className="p-3 border-t bg-muted/20">
                        <CIItemAllocationDrilldown
                          entityCode={entityCode}
                          ci={ci}
                          line={line}
                          onRevaluate={(entry) => persistRevaluation(line.id, entry)}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {showSaathi && <div className="lg:col-span-1"><CIAllocationSaathiPanel ci={ci} /></div>}
      </div>
    </div>
  );
}
