/**
 * @file        src/pages/erp/eximx/export/ExportPODetail.tsx
 * @purpose     Export PO detail · header + lines + LUT gate · Buyer Reliability · Doc Pack preview · 5-master integration
 * @sprint      T-Phase-1.EX-7a-ExportPO-ForeignCustomer-DocPack
 */
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sparkles, AlertTriangle, FileText, Award, CheckCircle2 } from 'lucide-react';
import { getExportPO } from '@/lib/export-po-engine';
import { evaluateExportReadiness } from '@/lib/export-readiness-engine';
import { generateDocPack, resolveCountryDocRule } from '@/lib/doc-generator-engine';
import { COUNTRY_DOC_RULE_DESCRIPTIONS } from '@/types/pre-shipment-doc-pack';
import { ExportPOSaathiPanel } from '../saathi/ExportPOSaathiPanel';
import { ExportPOLineageBreadcrumb } from './ExportPOLineageBreadcrumb';
import type { ExportPurchaseOrder } from '@/types/export-purchase-order';

export function ExportPODetail(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const entityCode = 'sinha-trading';
  const [po, setPo] = useState<ExportPurchaseOrder | null>(null);
  const [showSaathi, setShowSaathi] = useState(false);
  useEffect(() => { if (id) setPo(getExportPO(entityCode, id)); }, [id]);
  if (!po) return <div className="p-6">Export PO not found</div>;

  const readiness = evaluateExportReadiness(entityCode, po);
  const docRule = resolveCountryDocRule(po.country_code);
  const previewPack = generateDocPack(po.id, po.entity_id, po.country_code);

  return (
    <div className="space-y-6">
      <ExportPOLineageBreadcrumb po={po} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-mono">{po.export_po_no}</h1>
          <p className="text-sm text-muted-foreground">Buyer ref: <span className="font-mono">{po.buyer_po_ref}</span> · {po.country_code} · {po.po_date}</p>
        </div>
        <Button variant="outline" onClick={() => setShowSaathi(!showSaathi)}><Sparkles className="w-4 h-4 mr-2" />{showSaathi ? 'Hide' : 'Show'} Saathi</Button>
      </div>

      <div className={`grid ${showSaathi ? 'lg:grid-cols-3' : 'lg:grid-cols-2'} gap-6`}>
        <div className="lg:col-span-2">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground mb-1">Status</div><Badge variant="outline">{po.status.replace(/_/g, ' ')}</Badge></CardContent></Card>
            <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground mb-1">LUT Gate</div>{readiness.is_ready ? <Badge className="bg-success text-success-foreground"><CheckCircle2 className="w-3 h-3 mr-1 inline" />Ready</Badge> : <Badge variant="destructive">Blocked</Badge>}</CardContent></Card>
            <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground"><Award className="w-3 h-3 inline mr-1" />Buyer Score</div><div className="font-bold font-mono">{po.buyer_reliability_score_at_commit}/100</div><div className="text-xs">{po.buyer_country_risk} risk</div></CardContent></Card>
            <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground"><FileText className="w-3 h-3 inline mr-1" />Doc Rule</div><div className="font-bold text-sm">{docRule}</div></CardContent></Card>
          </div>

          {!readiness.is_ready && (
            <Card className="border-destructive mb-6">
              <CardHeader><CardTitle className="text-sm text-destructive"><AlertTriangle className="w-4 h-4 inline mr-2" />Readiness Gate Blocked</CardTitle></CardHeader>
              <CardContent className="text-sm">
                <ul className="list-disc list-inside space-y-1">{readiness.blocking_reasons.map((r, i) => <li key={`block-${i}`}>{r}</li>)}</ul>
                {readiness.warnings.length > 0 && <div className="mt-2 text-warning">{readiness.warnings.join(' · ')}</div>}
              </CardContent>
            </Card>
          )}

          <Card className="mb-6">
            <CardHeader><CardTitle className="text-sm">Cross-Master Lineage</CardTitle></CardHeader>
            <CardContent className="text-sm space-y-1">
              <div>Foreign Customer: <button className="underline" onClick={() => navigate('/erp/eximx/export/foreign-customers')}>{po.related_foreign_customer_id}</button></div>
              <div>LUT: <span className="font-mono">{po.related_lut_id ?? '—'}</span></div>
              <div>IEC: <span className="font-mono">{po.related_iec_id}</span></div>
              <div>Port of Loading: <span className="font-mono">{po.port_of_loading}</span></div>
              <div>Currency: <span className="font-mono">{po.currency_code}</span> · Selling rate: <span className="font-mono">{po.selling_rate_at_po}</span></div>
              {po.expected_shipping_bill_no && <div>Expected Shipping Bill: <span className="text-muted-foreground font-mono">{po.expected_shipping_bill_no} (forward to EX-7b)</span></div>}
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader><CardTitle>Lines</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>#</TableHead><TableHead>Item</TableHead><TableHead>HSN/CTH</TableHead><TableHead>Qty</TableHead><TableHead className="text-right">Rate</TableHead><TableHead className="text-right">FOB</TableHead><TableHead>Incoterm</TableHead></TableRow></TableHeader>
                <TableBody>
                  {po.lines.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell>{l.line_no}</TableCell><TableCell className="font-medium">{l.item_name}</TableCell>
                      <TableCell className="font-mono text-xs">{l.hsn_code}/{l.cth_code}</TableCell>
                      <TableCell className="font-mono">{l.qty} {l.uom}</TableCell>
                      <TableCell className="text-right font-mono">{l.selling_rate_foreign} {po.currency_code}</TableCell>
                      <TableCell className="text-right font-mono">{l.fob_value_inr.toLocaleString('en-IN')}</TableCell>
                      <TableCell><Badge variant="secondary">{l.target_incoterm}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm"><FileText className="w-4 h-4 inline mr-2" />Pre-shipment Doc Pack Preview · {docRule}</CardTitle></CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-3">{COUNTRY_DOC_RULE_DESCRIPTIONS[docRule]}</p>
              <div className="space-y-2">
                {previewPack.documents.map((d) => (
                  <div key={d.id} className="flex items-center justify-between p-2 border rounded-lg">
                    <div>
                      <div className="font-medium text-sm">{d.kind.replace(/_/g, ' ')}</div>
                      <div className="text-xs text-muted-foreground">{d.payload_summary}</div>
                    </div>
                    <Badge variant={d.is_legalized_required ? 'secondary' : 'outline'}>{d.legalization_status}</Badge>
                  </div>
                ))}
              </div>
              {previewPack.total_legalization_cost_inr > 0 && <div className="mt-4 pt-4 border-t text-sm">Estimated legalization cost: <strong className="font-mono">₹{previewPack.total_legalization_cost_inr.toLocaleString('en-IN')}</strong></div>}
            </CardContent>
          </Card>
        </div>

        {showSaathi && <div className="lg:col-span-1"><ExportPOSaathiPanel po={po} /></div>}
      </div>
    </div>
  );
}
