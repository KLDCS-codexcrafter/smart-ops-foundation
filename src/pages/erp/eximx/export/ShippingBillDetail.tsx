/**
 * @file        src/pages/erp/eximx/export/ShippingBillDetail.tsx
 * @purpose     SB Detail · 8-way integration peak
 * @sprint      T-Phase-1.EX-7b-ShippingBill-EGM-LEO-DispatchMirror
 */
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sparkles, Shield, Truck, Award } from 'lucide-react';
import { getShippingBill } from '@/lib/shipping-bill-engine';
import { ShippingBillSaathiPanel } from '../saathi/ShippingBillSaathiPanel';
import { ShippingBillLineageBreadcrumb } from './ShippingBillLineageBreadcrumb';
import type { ShippingBill } from '@/types/shipping-bill';

export function ShippingBillDetail(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const entityCode = 'sinha-trading';
  const [sb, setSb] = useState<ShippingBill | null>(null);
  const [showSaathi, setShowSaathi] = useState(false);

  useEffect(() => { if (id) setSb(getShippingBill(entityCode, id)); }, [id]);
  if (!sb) return <div className="p-6">Shipping Bill not found</div>;

  return (
    <div className="space-y-6 p-6">
      <ShippingBillLineageBreadcrumb sb={sb} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{sb.sb_no}</h1>
          <p className="text-sm text-muted-foreground">{sb.sb_type.replace(/_/g, ' ')} · {sb.filing_date} · Port {sb.port_of_loading}</p>
        </div>
        <Button variant="outline" onClick={() => setShowSaathi(!showSaathi)}><Sparkles className="w-4 h-4 mr-2" />{showSaathi ? 'Hide' : 'Show'} Saathi</Button>
      </div>

      <div className={`grid ${showSaathi ? 'lg:grid-cols-3' : 'lg:grid-cols-2'} gap-6`}>
        <div className="lg:col-span-2">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Status</div><Badge variant="outline">{sb.status.replace(/_/g, ' ')}</Badge></CardContent></Card>
            <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">ICEGATE SB</div><code className="text-xs">{sb.icegate_assigned_sb_no ?? '—'}</code></CardContent></Card>
            <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground"><Shield className="w-3 h-3 inline mr-1" />AEO</div><Badge variant="default">{sb.importer_aeo_tier}</Badge>{sb.is_self_sealing_facility && <Badge variant="default" className="ml-1 text-xs">SS</Badge>}</CardContent></Card>
            <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">CoO</div><Badge variant="outline" className="text-xs">{sb.coo_rule_kind}</Badge><div className="text-xs mt-1">{sb.coo_legalization_state.replace(/_/g, ' ')}</div></CardContent></Card>
          </div>

          {sb.is_self_sealing_facility && (
            <Card className="border-primary mb-6 bg-muted/30">
              <CardHeader><CardTitle className="text-sm"><Shield className="w-4 h-4 inline mr-2" />Self-Sealing Facility (v7 Compliance Gap #10)</CardTitle></CardHeader>
              <CardContent className="text-sm">
                Authorization: <code>{sb.self_sealing_authorization_no}</code> · Valid until {sb.self_sealing_authorization_valid_to} · CFS examination skipped per CBIC AEO benefits.
              </CardContent>
            </Card>
          )}

          <Card className="mb-6">
            <CardHeader><CardTitle className="text-sm">Cross-Master Lineage · 8-Way Integration</CardTitle></CardHeader>
            <CardContent className="text-sm space-y-1">
              <div>Export PO: <a className="underline cursor-pointer" onClick={() => navigate(`/erp/eximx/export/orders/${sb.related_export_po_id}`)}>{sb.related_export_po_no}</a></div>
              <div>Dispatch Mirror: <code>{sb.related_dispatch_mirror_id}</code></div>
              <div>Foreign Customer: <code>{sb.related_foreign_customer_id}</code></div>
              <div>LUT: <code>{sb.related_lut_id}</code> · IEC: <code>{sb.related_iec_id}</code></div>
              <div>RMS: <code>{sb.related_rms_declaration_id ?? '—'}</code></div>
              <div>EGM: <code>{sb.related_egm_id ?? 'pending vessel'}</code></div>
              <div>LEO: <code>{sb.related_leo_id ?? '—'}</code></div>
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader><CardTitle className="text-sm">CoO Embassy Legalization (Moat #10 ADVANCED)</CardTitle></CardHeader>
            <CardContent className="text-sm">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                <Badge variant={sb.coo_legalization_state === 'not_required' ? 'default' : 'outline'}>not_required</Badge>
                <Badge variant={sb.coo_legalization_state === 'chamber_attested' ? 'default' : 'outline'}>chamber_attested</Badge>
                <Badge variant={sb.coo_legalization_state === 'embassy_submitted' ? 'default' : 'outline'}>embassy_submitted</Badge>
                <Badge variant={sb.coo_legalization_state === 'legalized_returned' ? 'default' : 'outline'}>legalized_returned</Badge>
              </div>
              {sb.coo_chamber_attested_at && <div>Chamber attested: {sb.coo_chamber_attested_at.slice(0, 10)}</div>}
              {sb.coo_embassy_submitted_at && <div>Embassy submitted: {sb.coo_embassy_submitted_at.slice(0, 10)}</div>}
              {sb.coo_legalized_returned_at && <div>Legalized returned: {sb.coo_legalized_returned_at.slice(0, 10)}</div>}
              {sb.coo_legalization_cost_inr > 0 && <div className="font-bold mt-2">Legalization cost: ₹{sb.coo_legalization_cost_inr.toLocaleString('en-IN')}</div>}
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader><CardTitle>Lines + Compliance</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>#</TableHead><TableHead>Item</TableHead><TableHead>HSN</TableHead><TableHead>Qty</TableHead><TableHead className="text-right">FOB (₹)</TableHead><TableHead className="text-right">CIF (₹)</TableHead><TableHead className="text-right">RoDTEP</TableHead><TableHead className="text-right">Drawback</TableHead></TableRow></TableHeader>
                <TableBody>{sb.lines.map((l) => (<TableRow key={l.id}><TableCell>{l.line_no}</TableCell><TableCell>{l.item_name}</TableCell><TableCell className="font-mono text-xs">{l.hsn_code}</TableCell><TableCell>{l.qty}</TableCell><TableCell className="text-right font-mono">{l.fob_value_inr.toLocaleString('en-IN')}</TableCell><TableCell className="text-right font-mono">{l.cif_value_inr.toLocaleString('en-IN')}</TableCell><TableCell className="text-right font-mono text-success">{l.rodtep_value_inr.toLocaleString('en-IN')}</TableCell><TableCell className="text-right font-mono text-primary">{l.drawback_amount_inr.toLocaleString('en-IN')}</TableCell></TableRow>))}</TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-sm"><Truck className="w-4 h-4 inline mr-2" />EGM (Vessel Manifest)</CardTitle></CardHeader>
              <CardContent className="text-sm">
                {sb.related_egm_id ? <div>Linked to EGM: <code>{sb.related_egm_id}</code></div> : <div className="text-muted-foreground">No EGM yet · vessel must sail first</div>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm"><Award className="w-4 h-4 inline mr-2" />LEO (Let Export Order)</CardTitle></CardHeader>
              <CardContent className="text-sm">
                {sb.related_leo_id ? <div>LEO: <code>{sb.related_leo_id}</code></div> : <div className="text-muted-foreground">Pending</div>}
              </CardContent>
            </Card>
          </div>
        </div>

        {showSaathi && <div className="lg:col-span-1"><ShippingBillSaathiPanel sb={sb} /></div>}
      </div>
    </div>
  );
}
