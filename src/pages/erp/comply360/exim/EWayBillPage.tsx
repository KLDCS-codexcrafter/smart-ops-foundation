/**
 * @file        src/pages/erp/comply360/exim/EWayBillPage.tsx
 * @purpose     E-Way Bill surface · consumes comply360-eway-engine
 * @sprint      Sprint 73b · T-Phase-5.A.1.5-PASS-B · Block 3
 * @disciplines FR-7 · FR-13 · FR-19
 */
import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Truck, AlertTriangle, CheckCircle2, Send, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import {
  buildEWayBill,
  validateEWayBill,
  isEWBRequired,
  computeValidityDays,
  closeEWayBill,
  loadEWayBills,
  EWB_THRESHOLD,
  type EWayPartA,
  type EWayPartB,
  type EWayBill,
} from '@/lib/comply360-eway-engine';
import { useEntityCode } from '@/hooks/useEntityCode';
import { logAudit } from '@/lib/audit-trail-engine'; // P8.4 · Block 4 residue · comply360_event

function inr(n: number): string {
  return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

const DEFAULT_PART_A: EWayPartA = {
  supplier_gstin: '',
  supplier_state_code: '27',
  consignee_gstin: '',
  consignee_state_code: '29',
  ship_to_gstin: '',
  ship_to_state_code: '',
  doc_no: '',
  doc_date: new Date().toISOString().slice(0, 10),
  doc_type: 'INV',
  hsn_code: '',
  total_invoice_value: 0,
  taxable_value: 0,
  cgst: 0,
  sgst: 0,
  igst: 0,
  cess: 0,
  reason: 'supply',
};

const DEFAULT_PART_B: EWayPartB = {
  transport_mode: 'road',
  vehicle_no: '',
  vehicle_type: 'regular',
  approx_distance_km: 0,
};

export default function EWayBillPage(): JSX.Element {
  const { entityCode, entityId } = useEntityCode();
  const [partA, setPartA] = useState<EWayPartA>(DEFAULT_PART_A);
  const [partB, setPartB] = useState<EWayPartB>(DEFAULT_PART_B);
  const [refreshTick, setRefreshTick] = useState(0);

  const existing = useMemo(() => {
    if (!entityCode) return [];
    return loadEWayBills(entityCode, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityCode, refreshTick]);

  if (!entityId || entityId === 'all') {
    return (
      <div className="p-6">
        <Card className="p-12 text-center">
          <Truck className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-lg font-semibold mb-2">Select a company to continue</h2>
          <p className="text-muted-foreground">Choose an entity from the header dropdown to manage E-Way Bills.</p>
        </Card>
      </div>
    );
  }

  const required = isEWBRequired(partA.total_invoice_value);
  const validity = computeValidityDays(partB.approx_distance_km, partB.vehicle_type);
  const draftForValidation: EWayBill = {
    ewb_no: 'DRAFT',
    entity_code: entityCode,
    part_a: partA,
    part_b: partB,
    generated_at: null,
    valid_until: null,
    closed_at: null,
    cancelled_at: null,
    status: 'draft',
    errors: [],
  };
  const validation = validateEWayBill(draftForValidation);

  const handleGenerate = (): void => {
    const ewb = buildEWayBill(entityCode, partA, partB);
    if (ewb.status === 'generated') {
      toast.success(`EWB ${ewb.ewb_no} generated · valid until ${ewb.valid_until?.slice(0, 10)}`);
    } else {
      toast.error(`Draft saved with ${ewb.errors.length} error(s)`);
    }
    logAudit({
      entityCode,
      action: 'create',
      entityType: 'comply360_event',
      recordId: ewb.ewb_no,
      recordLabel: `E-Way Bill · ${ewb.ewb_no} · ${ewb.part_a.doc_no}`,
      beforeState: null,
      afterState: { status: ewb.status, doc_no: ewb.part_a.doc_no, valid_until: ewb.valid_until },
      reason: 'eway_bill_generated',
      sourceModule: 'EWayBillPage',
    });
    setRefreshTick((t) => t + 1);
  };

  const handleClose = (ewbNo: string): void => {
    const closed = closeEWayBill(entityCode, ewbNo);
    if (closed) toast.success(`EWB ${ewbNo} closed`);
    setRefreshTick((t) => t + 1);
  };

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">E-Way Bill · Rule 138</h1>
        <p className="text-muted-foreground text-sm">Threshold: {inr(EWB_THRESHOLD)} · Validity: 1 day per 200 km (regular) · 20 km (ODC)</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground uppercase">EWB Required?</div>
          <div className="mt-2">
            {required
              ? <Badge className="bg-amber-600 hover:bg-amber-700">Yes</Badge>
              : <Badge variant="secondary">No</Badge>}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground uppercase">Validity</div>
          <div className="text-xl font-mono font-semibold mt-1">{validity} day(s)</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground uppercase">Draft Errors</div>
          <div className="text-xl font-mono font-semibold mt-1 text-destructive">{validation.errors.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground uppercase">Saved EWBs</div>
          <div className="text-xl font-mono font-semibold mt-1">{existing.length}</div>
        </Card>
      </div>

      <Card className="p-4 space-y-3">
        <h2 className="text-sm font-semibold uppercase text-muted-foreground">Part A · Document + Parties</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <Label htmlFor="ewb-supplier">Supplier GSTIN</Label>
            <Input id="ewb-supplier" value={partA.supplier_gstin} onChange={(e) => setPartA({ ...partA, supplier_gstin: e.target.value.toUpperCase() })} className="font-mono" />
          </div>
          <div>
            <Label htmlFor="ewb-consignee">Consignee GSTIN</Label>
            <Input id="ewb-consignee" value={partA.consignee_gstin} onChange={(e) => setPartA({ ...partA, consignee_gstin: e.target.value.toUpperCase() })} className="font-mono" />
          </div>
          <div>
            <Label htmlFor="ewb-shipto">Ship-To GSTIN (B2S)</Label>
            <Input id="ewb-shipto" value={partA.ship_to_gstin ?? ''} onChange={(e) => setPartA({ ...partA, ship_to_gstin: e.target.value.toUpperCase() })} className="font-mono" />
          </div>
          <div>
            <Label htmlFor="ewb-docno">Doc No</Label>
            <Input id="ewb-docno" value={partA.doc_no} onChange={(e) => setPartA({ ...partA, doc_no: e.target.value })} className="font-mono" />
          </div>
          <div>
            <Label htmlFor="ewb-docdate">Doc Date</Label>
            <Input id="ewb-docdate" type="date" value={partA.doc_date} onChange={(e) => setPartA({ ...partA, doc_date: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="ewb-hsn">HSN</Label>
            <Input id="ewb-hsn" value={partA.hsn_code} onChange={(e) => setPartA({ ...partA, hsn_code: e.target.value })} className="font-mono" />
          </div>
          <div>
            <Label htmlFor="ewb-total">Total Invoice Value</Label>
            <Input id="ewb-total" type="number" value={partA.total_invoice_value} onChange={(e) => setPartA({ ...partA, total_invoice_value: Number(e.target.value) })} className="font-mono" />
          </div>
        </div>
      </Card>

      <Card className="p-4 space-y-3">
        <h2 className="text-sm font-semibold uppercase text-muted-foreground">Part B · Transport</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <Label htmlFor="ewb-vehicle">Vehicle No</Label>
            <Input id="ewb-vehicle" value={partB.vehicle_no ?? ''} onChange={(e) => setPartB({ ...partB, vehicle_no: e.target.value.toUpperCase() })} className="font-mono" />
          </div>
          <div>
            <Label htmlFor="ewb-distance">Distance (km)</Label>
            <Input id="ewb-distance" type="number" value={partB.approx_distance_km} onChange={(e) => setPartB({ ...partB, approx_distance_km: Number(e.target.value) })} className="font-mono" />
          </div>
        </div>
        {validation.errors.length > 0 && (
          <div className="text-xs text-destructive flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>{validation.errors.join(' · ')}</div>
          </div>
        )}
        {validation.ok && (
          <div className="text-xs text-emerald-500 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" /> Draft is valid
          </div>
        )}
      </Card>

      <div className="flex items-center gap-2">
        <Button onClick={handleGenerate} disabled={!validation.ok}>
          <Send className="h-4 w-4 mr-1" /> Generate EWB
        </Button>
      </div>

      <Card className="p-4">
        <h2 className="text-sm font-semibold uppercase text-muted-foreground mb-3">Saved E-Way Bills</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>EWB No</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Valid Until</TableHead>
              <TableHead className="text-right">Value</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {existing.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No EWBs yet</TableCell></TableRow>
            )}
            {existing.map((e) => (
              <TableRow key={e.ewb_no}>
                <TableCell className="font-mono">{e.ewb_no}</TableCell>
                <TableCell>
                  <Badge variant={e.status === 'generated' ? 'default' : 'secondary'}>{e.status}</Badge>
                </TableCell>
                <TableCell className="font-mono text-xs">{e.valid_until?.slice(0, 10) ?? '—'}</TableCell>
                <TableCell className="text-right font-mono">{inr(e.part_a.total_invoice_value)}</TableCell>
                <TableCell className="text-right">
                  {e.status === 'generated' && (
                    <Button size="sm" variant="outline" onClick={() => handleClose(e.ewb_no)}>
                      <XCircle className="h-3 w-3 mr-1" /> Close
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
