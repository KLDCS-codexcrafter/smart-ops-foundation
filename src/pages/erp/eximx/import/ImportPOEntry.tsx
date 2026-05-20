/**
 * @file        src/pages/erp/eximx/import/ImportPOEntry.tsx
 * @purpose     Import PO Entry · 11 Incoterm picker · live duty preview · Saathi
 * @sprint      T-Phase-1.EX-3-ImportPO-ForeignVendor-DualRate
 * @decisions   EX-3-Q2=a 11 Incoterm · EX-3-Q9=b Saathi · EX-3-Q11=a preview-only
 */
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Save, ArrowLeft, BookOpen, Calculator } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEntityCode } from '@/hooks/useEntityCode';
import { CTH_SEED } from '@/data/customs-tariff-head-seed-data';
import { previewLandedCost } from '@/lib/landed-cost-preview-engine';
import { ImportPOSaathiPanel } from '../saathi/ImportPOSaathiPanel';
import type { IncotermType } from '@/types/foreign-customer';
import type { ImportPurchaseOrder } from '@/types/import-purchase-order';

const INCOTERMS_11: IncotermType[] = ['EXW', 'FCA', 'FAS', 'FOB', 'CFR', 'CIF', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP'];

export function ImportPOEntry(): JSX.Element {
  const navigate = useNavigate();
  const { entityCode } = useEntityCode();
  const [showSaathi, setShowSaathi] = useState(false);
  const [poNumber, setPONumber] = useState('IPO-' + Date.now());
  const [foreignVendorId, setForeignVendorId] = useState('fv-sinha-001');
  const [currency, setCurrency] = useState('USD');
  const [bookingRate, setBookingRate] = useState(84.5);
  const [incoterm, setIncoterm] = useState<IncotermType>('FOB');
  const [loadPort, setLoadPort] = useState('CNSHA');
  const [dischargePort, setDischargePort] = useState('INMUN');
  const [lineCTH, setLineCTH] = useState('72104900');
  const [lineCountry, setLineCountry] = useState('CN');
  const [lineQty, setLineQty] = useState(1000);
  const [lineRate, setLineRate] = useState(0.80);

  const previewPO: ImportPurchaseOrder = {
    id: 'preview',
    po_number: poNumber,
    entity_id: entityCode || 'sinha-steel',
    status: 'draft',
    po_date: new Date().toISOString().slice(0, 10),
    expected_delivery: '',
    iec_id: 'iec-sinha-001',
    foreign_vendor_id: foreignVendorId,
    currency_code: currency,
    booking_rate: bookingRate,
    customs_valuation_rate_estimate: bookingRate + 0.6,
    rate_ladder: [],
    incoterm,
    load_port_code: loadPort,
    discharge_port_code: dischargePort,
    form_15ca_seed: { requires_form_15ca: bookingRate * lineQty * lineRate > 500000, form_15ca_ref: null, form_15cb_ref: null, form_15ca_filed_at: null },
    rms_declaration_id: null,
    lines: [{
      id: 'preview-line-1', line_no: 1, item_id: 'item-1', item_name: 'Line item',
      qty: lineQty, uom: 'KGS', rate_foreign_currency: lineRate, basic_value_foreign: lineQty * lineRate,
      cth_code: lineCTH, country_of_origin: lineCountry, fta_agreement: null,
      estimated_bcd_rate: 15, estimated_igst_rate: 18, notes: '',
    }],
    total_basic_value_foreign: lineQty * lineRate,
    estimated_landed_inr: 0,
    created_at: '', updated_at: '', created_by: '',
  };
  const preview = entityCode ? previewLandedCost(entityCode, previewPO, bookingRate) : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/erp/eximx/import/orders')}><ArrowLeft className="w-4 h-4" /></Button>
          <div>
            <h1 className="text-2xl font-bold">New Import PO</h1>
            <p className="text-sm text-muted-foreground">Cross-master entry · IEC + CTH + FTA + Foreign Vendor · 11 Incoterm + Dual Rate</p>
          </div>
        </div>
        <Button variant="outline" onClick={() => setShowSaathi((v) => !v)}><BookOpen className="w-4 h-4 mr-2" /> Saathi</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Header</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div><Label>PO Number</Label><Input value={poNumber} onChange={(e) => setPONumber(e.target.value)} /></div>
              <div><Label>Foreign Vendor</Label><Input value={foreignVendorId} onChange={(e) => setForeignVendorId(e.target.value)} /></div>
              <div><Label>Currency</Label><Input value={currency} onChange={(e) => setCurrency(e.target.value)} /></div>
              <div><Label>Booking Rate (₹/{currency})</Label><Input type="number" value={bookingRate} onChange={(e) => setBookingRate(Number(e.target.value))} /></div>
              <div>
                <Label>Incoterm (11 options)</Label>
                <Select value={incoterm} onValueChange={(v) => setIncoterm(v as IncotermType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{INCOTERMS_11.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Load Port</Label><Input value={loadPort} onChange={(e) => setLoadPort(e.target.value)} /></div>
              <div><Label>Discharge Port</Label><Input value={dischargePort} onChange={(e) => setDischargePort(e.target.value)} /></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Line 1 · CTH × Country × Qty</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <Label>CTH Code</Label>
                <Select value={lineCTH} onValueChange={setLineCTH}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CTH_SEED.map((c) => <SelectItem key={c.cth_code} value={c.cth_code}>{c.cth_code} · {c.description}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Country</Label><Input value={lineCountry} onChange={(e) => setLineCountry(e.target.value)} /></div>
              <div><Label>Qty</Label><Input type="number" value={lineQty} onChange={(e) => setLineQty(Number(e.target.value))} /></div>
              <div><Label>Rate ({currency}/unit)</Label><Input type="number" value={lineRate} onChange={(e) => setLineRate(Number(e.target.value))} /></div>
            </CardContent>
          </Card>

          {preview && (
            <Card className="border-l-4 border-l-warning">
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Calculator className="w-4 h-4" /> Landed Cost Preview (NO GL commit)</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div><Badge variant="outline">Basic</Badge> <div className="font-mono mt-1">₹{preview.total_basic_inr.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div></div>
                  <div><Badge variant="outline">Customs</Badge> <div className="font-mono mt-1">₹{preview.total_customs_inr.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div></div>
                  <div><Badge variant="outline">Other</Badge> <div className="font-mono mt-1">₹{preview.total_other_inr.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div></div>
                  <div><Badge variant="outline">GST</Badge> <div className="font-mono mt-1">₹{preview.total_gst_inr.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div></div>
                </div>
                <div className="mt-3 pt-3 border-t text-base font-semibold">Total Landed: ₹{preview.total_landed_inr.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
                {preview.notes.map((n, i) => <div key={`note-${i}`} className="text-xs text-muted-foreground mt-1">{n}</div>)}
              </CardContent>
            </Card>
          )}

          <Button className="w-full" size="lg" onClick={() => navigate('/erp/eximx/import/orders')}>
            <Save className="w-4 h-4 mr-2" /> Save Draft (preview-only · no GL impact)
          </Button>
        </div>

        {showSaathi && <div className="lg:col-span-1"><ImportPOSaathiPanel /></div>}
      </div>
    </div>
  );
}
