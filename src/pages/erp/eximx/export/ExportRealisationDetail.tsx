/**
 * @file        src/pages/erp/eximx/export/ExportRealisationDetail.tsx
 * @purpose     Realisation Detail · 5-way cross-master · Forex Triangulation · FEMA · Buyer Reliability impact
 * @sprint      T-Phase-1.EX-7c-ExportRealisation-eBRC-FEMA
 */
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sparkles, AlertTriangle, TrendingUp, TrendingDown, Award, Shield } from 'lucide-react';
import { getRealisation } from '@/lib/export-realisation-engine';
import { computeReliabilityFeedbackImpact } from '@/lib/realisation-feedback-engine';
import { ExportRealisationSaathiPanel } from '../saathi/ExportRealisationSaathiPanel';
import { ExportRealisationLineageBreadcrumb } from './ExportRealisationLineageBreadcrumb';
import type { ExportRealisation } from '@/types/export-realisation';

export function ExportRealisationDetail(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const entityCode = 'sinha-trading';
  const [r, setR] = useState<ExportRealisation | null>(null);
  const [showSaathi, setShowSaathi] = useState(false);

  useEffect(() => { if (id) setR(getRealisation(entityCode, id)); }, [id]);
  if (!r) return <div className="p-6">Realisation not found</div>;

  const feedback = computeReliabilityFeedbackImpact([r]);
  const tri = r.forex_triangulation;

  return (
    <div className="space-y-6 p-6">
      <ExportRealisationLineageBreadcrumb realisation={r} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{r.realisation_no}</h1>
          <p className="text-sm text-muted-foreground">Dispatched {r.goods_dispatched_date} · FEMA deadline {r.fema_270_day_deadline} · {r.currency_code}</p>
        </div>
        <Button variant="outline" onClick={() => setShowSaathi(!showSaathi)}><Sparkles className="w-4 h-4 mr-2" />{showSaathi ? 'Hide' : 'Show'} Saathi</Button>
      </div>

      <div className={`grid ${showSaathi ? 'lg:grid-cols-3' : 'lg:grid-cols-2'} gap-6`}>
        <div className="lg:col-span-2">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">FEMA State</div><Badge variant="default" className={r.fema_state === 'safe' ? 'bg-green-600' : r.fema_state === 'attention' ? 'bg-yellow-500' : r.fema_state === 'warning' ? 'bg-orange-500' : r.fema_state === 'critical' ? 'bg-red-500' : 'bg-red-700'}>{r.fema_state}</Badge></CardContent></Card>
            <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Days Since Dispatch</div><div className="text-xl font-bold">{r.days_since_dispatch}</div><div className="text-xs">of 270</div></CardContent></Card>
            <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Realisation %</div><div className="text-xl font-bold">{r.realisation_pct}%</div></CardContent></Card>
            <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Forex Variance (₹)</div><div className={`text-xl font-bold ${tri.variance_total_inr >= 0 ? 'text-green-600' : 'text-red-600'}`}>{tri.variance_total_inr >= 0 ? <TrendingUp className="w-4 h-4 inline" /> : <TrendingDown className="w-4 h-4 inline" />} {Math.abs(tri.variance_total_inr).toFixed(0)}</div></CardContent></Card>
          </div>

          {(r.fema_state === 'warning' || r.fema_state === 'critical' || r.fema_state === 'overdue') && (
            <Card className="border-red-500 mb-6 bg-red-50/30">
              <CardContent className="pt-4 text-sm">
                <AlertTriangle className="w-4 h-4 inline mr-2 text-red-600" />
                <strong>FEMA 270-day Alert ({r.fema_state.toUpperCase()})</strong> · {270 - r.days_since_dispatch} days remaining · {r.fema_state === 'overdue' ? 'REGULATORY BREACH · file with RBI immediately' : 'escalate to finance · consider RBI extension'}
              </CardContent>
            </Card>
          )}

          {r.is_stpi_export && (
            <Card className="border-blue-500 mb-6 bg-blue-50/30">
              <CardContent className="pt-4 text-sm">
                <Award className="w-4 h-4 inline mr-2 text-blue-600" />
                <strong>STPI Software Export (v7 Compliance Gap #11)</strong> · Unit: <code>{r.stpi_unit_id}</code> · Softex Form: <code>{r.stpi_softex_form_no}</code> · Filed: {r.stpi_softex_filed_date}
              </CardContent>
            </Card>
          )}

          <Card className="mb-6">
            <CardHeader><CardTitle className="text-sm">Cross-Master Lineage · 5-Way Integration</CardTitle></CardHeader>
            <CardContent className="text-sm space-y-1">
              <div>Export PO: <a className="underline cursor-pointer" onClick={() => navigate(`/erp/eximx/export/orders/${r.related_export_po_id}`)}>{r.related_export_po_no}</a></div>
              <div>Shipping Bill: <a className="underline cursor-pointer" onClick={() => navigate(`/erp/eximx/export/shipping-bills/${r.related_shipping_bill_id}`)}>{r.related_shipping_bill_no}</a></div>
              <div>Foreign Customer: <code>{r.related_foreign_customer_id}</code></div>
              <div>ECGC Policy: <code>{r.related_ecgc_policy_id ?? 'none'}</code></div>
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader><CardTitle className="text-sm">Forex Triangulation · 3-Way Reconciliation (Q6=a)</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="text-center"><div className="text-xs text-muted-foreground">Booking Rate</div><div className="font-mono font-bold">{tri.booking_rate.toFixed(2)}</div><div className="text-xs">{tri.booking_rate_at_date.slice(0, 10)}</div></div>
                <div className="text-center"><div className="text-xs text-muted-foreground">Selling@POL</div><div className="font-mono font-bold">{tri.selling_rate_at_pol.toFixed(2)}</div><div className="text-xs">{tri.selling_rate_at_pol_date?.slice(0, 10) ?? '—'}</div></div>
                <div className="text-center"><div className="text-xs text-muted-foreground">Realised</div><div className="font-mono font-bold">{tri.realised_rate?.toFixed(2) ?? '—'}</div><div className="text-xs">{tri.realised_rate_date?.slice(0, 10) ?? 'pending'}</div></div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t text-sm">
                <div>Booking → POL variance: <span className={`font-mono ${tri.variance_booking_to_pol_inr >= 0 ? 'text-green-600' : 'text-red-600'}`}>₹{tri.variance_booking_to_pol_inr.toFixed(2)}</span></div>
                <div>POL → Realised variance: <span className={`font-mono ${tri.variance_pol_to_realised_inr >= 0 ? 'text-green-600' : 'text-red-600'}`}>₹{tri.variance_pol_to_realised_inr.toFixed(2)}</span></div>
                <div className="col-span-2 pt-2 border-t font-bold">Total: <span className={`font-mono ${tri.variance_total_inr >= 0 ? 'text-green-600' : 'text-red-600'}`}>₹{tri.variance_total_inr.toFixed(2)}</span></div>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader><CardTitle className="text-sm">Receipts ({r.receipts.length})</CardTitle></CardHeader>
            <CardContent>
              {r.receipts.length === 0 ? <p className="text-sm text-muted-foreground">No receipts yet · realisation pending</p> : (
                <Table>
                  <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Event</TableHead><TableHead className="text-right">Foreign</TableHead><TableHead className="text-right">Rate</TableHead><TableHead className="text-right">INR</TableHead><TableHead>FIRC/EBRC</TableHead></TableRow></TableHeader>
                  <TableBody>{r.receipts.map((rec) => (<TableRow key={rec.id}><TableCell>{rec.received_date}</TableCell><TableCell><Badge variant="outline" className="text-xs">{rec.event_type.replace(/_/g, ' ')}</Badge></TableCell><TableCell className="text-right font-mono">{rec.amount_foreign.toLocaleString()}</TableCell><TableCell className="text-right font-mono">{rec.realised_rate.toFixed(2)}</TableCell><TableCell className="text-right font-mono">{rec.amount_inr.toLocaleString()}</TableCell><TableCell className="text-xs">{rec.related_firc_id ?? '—'}/{rec.related_ebrc_id ?? '—'}</TableCell></TableRow>))}</TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm"><Shield className="w-4 h-4 inline mr-2" />Buyer Reliability Feedback Impact (Moat #18 FULL closure)</CardTitle></CardHeader>
            <CardContent className="text-sm">
              <div className="font-mono">{feedback.rationale}</div>
              <div className="mt-2 text-xs text-muted-foreground">Feedback flows to buyer-reliability-engine.ts via sibling realisation-feedback-engine.ts (engine 0-diff preserved · Q4=a)</div>
            </CardContent>
          </Card>
        </div>

        {showSaathi && <div className="lg:col-span-1"><ExportRealisationSaathiPanel realisation={r} /></div>}
      </div>
    </div>
  );
}
