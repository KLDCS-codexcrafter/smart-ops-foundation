/**
 * @file        RFQPublicForm.tsx
 * @sprint      T-Phase-1.2.6f-b-1 · Block B.4 · EXTENDED in place per D-271
 *              (was Sprint 3-a-fix 35-LOC placeholder).
 * @purpose     Full vendor quotation entry form · landed on from token URL or vendor inbox.
 *              Reads RFQ + parent enquiry · captures line quotes + header terms + compliance.
 *              Submits via vendor-quotation-engine.submitQuotation.
 * @decisions   D-255 (token-only first quote → onboarding) · D-271 · D-273
 * @[JWT]       POST /api/procure360/quotations
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams, Navigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { rfqsKey, type RFQ } from '@/types/rfq';
import {
  procurementEnquiriesKey,
  type ProcurementEnquiry,
  type ProcurementEnquiryLine,
} from '@/types/procurement-enquiry';
import { submitQuotation } from '@/lib/vendor-quotation-engine';
import {
  getVendorSession,
  recordVendorActivity,
} from '@/lib/vendor-portal-auth-engine';
import { markFirstQuoteSubmitted } from '@/lib/vendor-onboarding-engine';

interface LineDraft {
  enquiry_line_id: string;
  item_id: string;
  item_name: string;
  uom: string;
  qty_required: number;
  qty_quoted: number;
  rate: number;
  discount_percent: number;
  tax_percent: number;
  delivery_days: number;
  remarks: string;
  is_supplied: boolean;
}

function loadRfq(rfqId: string, entityCode: string): RFQ | null {
  try {
    const raw = localStorage.getItem(rfqsKey(entityCode));
    const list = raw ? (JSON.parse(raw) as RFQ[]) : [];
    return list.find(r => r.id === rfqId) ?? null;
  } catch {
    return null;
  }
}

function loadEnquiry(enquiryId: string, entityCode: string): ProcurementEnquiry | null {
  try {
    const raw = localStorage.getItem(procurementEnquiriesKey(entityCode));
    const list = raw ? (JSON.parse(raw) as ProcurementEnquiry[]) : [];
    return list.find(e => e.id === enquiryId) ?? null;
  } catch {
    return null;
  }
}

function lineAfterTax(l: Pick<LineDraft, 'qty_quoted' | 'rate' | 'discount_percent' | 'tax_percent'>): number {
  const gross = l.qty_quoted * l.rate;
  const afterDisc = gross * (1 - l.discount_percent / 100);
  return Math.round(afterDisc * (1 + l.tax_percent / 100) * 100) / 100;
}

function formatINR(n: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 2,
  }).format(n);
}

const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

export default function RFQPublicForm(): JSX.Element {
  const { rfqId } = useParams<{ rfqId: string }>();
  const [params] = useSearchParams();
  const entityFromUrl = params.get('entity') ?? '';
  const navigate = useNavigate();
  const session = getVendorSession();

  const entityCode = session?.entity_code || entityFromUrl;

  const rfq = useMemo(
    () => (rfqId && entityCode ? loadRfq(rfqId, entityCode) : null),
    [rfqId, entityCode],
  );
  const enquiry = useMemo(
    () => (rfq && entityCode ? loadEnquiry(rfq.parent_enquiry_id, entityCode) : null),
    [rfq, entityCode],
  );

  const [lines, setLines] = useState<LineDraft[]>([]);
  const [paymentTerms, setPaymentTerms] = useState('Net 30');
  const [paymentTermsDays, setPaymentTermsDays] = useState(30);
  const [deliveryTerms, setDeliveryTerms] = useState('FOB plant');
  const [validityDays, setValidityDays] = useState(7);
  const [gstin, setGstin] = useState('');
  const [msme, setMsme] = useState<'micro' | 'small' | 'medium' | 'none'>('none');
  const [tdsSection, setTdsSection] = useState('');
  const [rcm, setRcm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize line drafts from RFQ + enquiry
  useEffect(() => {
    if (!rfq || !enquiry) return;
    const matchedLines: ProcurementEnquiryLine[] = enquiry.lines.filter(l =>
      rfq.line_item_ids.includes(l.id),
    );
    const drafts: LineDraft[] = matchedLines.map(l => ({
      enquiry_line_id: l.id,
      item_id: l.item_id,
      item_name: l.item_name,
      uom: l.uom,
      qty_required: l.required_qty,
      qty_quoted: l.required_qty,
      rate: l.estimated_rate ?? 0,
      discount_percent: 0,
      tax_percent: 18,
      delivery_days: 7,
      remarks: '',
      is_supplied: true,
    }));
    setLines(drafts);
  }, [rfq, enquiry]);

  const totals = useMemo(() => {
    const supplied = lines.filter(l => l.is_supplied);
    const totalValue = supplied.reduce((s, l) => s + l.qty_quoted * l.rate, 0);
    const totalAfterTax = supplied.reduce((s, l) => s + lineAfterTax(l), 0);
    return {
      total_value: Math.round(totalValue * 100) / 100,
      total_tax: Math.round((totalAfterTax - totalValue) * 100) / 100,
      total_after_tax: Math.round(totalAfterTax * 100) / 100,
    };
  }, [lines]);

  const validityUntil = useMemo(() => {
    const d = new Date(Date.now() + validityDays * 86_400_000);
    return d.toISOString().slice(0, 10);
  }, [validityDays]);

  const canSubmit = useMemo(() => {
    if (busy) return false;
    if (lines.every(l => !l.is_supplied)) return false;
    if (!paymentTerms.trim() || !deliveryTerms.trim()) return false;
    return true;
  }, [busy, lines, paymentTerms, deliveryTerms]);

  // Gate: must have session OR be on a token-landing URL
  if (!session) {
    const tokenLanding = !!params.get('token');
    if (!tokenLanding) return <Navigate to="/vendor-portal/login" replace />;
    // Token landing without session: bounce to login with the same params
    const search = params.toString();
    return <Navigate to={`/vendor-portal/login?${search}`} replace />;
  }

  if (!rfq || !enquiry) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-muted/20">
        <Card className="max-w-lg w-full">
          <CardHeader><CardTitle>RFQ Not Found</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              We could not find RFQ <span className="font-mono">{rfqId}</span> for entity{' '}
              <span className="font-mono">{entityCode}</span>. It may have been cancelled or expired.
            </p>
            <Button variant="outline" className="mt-4" onClick={() => navigate('/vendor-portal/inbox')}>
              Back to Inbox
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Vendor-scope guard: this RFQ must belong to the logged-in vendor
  if (rfq.vendor_id !== session.vendor_id) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-muted/20">
        <Card className="max-w-lg w-full">
          <CardHeader><CardTitle>Not Authorized</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">This RFQ is not assigned to your vendor account.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const updateLine = (idx: number, patch: Partial<LineDraft>): void => {
    setLines(prev => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  };

  const doSubmit = async (status: 'draft' | 'submitted'): Promise<void> => {
    if (gstin.trim() && !GSTIN_RE.test(gstin.trim().toUpperCase())) {
      setError('GSTIN format is invalid (15 chars · 2 state · 10 PAN · 1 entity · Z · 1 check).');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const quotation = submitQuotation({
        parent_rfq_id: rfq.id,
        parent_enquiry_id: enquiry.id,
        entity_id: enquiry.entity_id,
        vendor_id: session.vendor_id,
        vendor_name: session.party_name,
        lines: lines.map(l => ({
          enquiry_line_id: l.enquiry_line_id,
          item_id: l.item_id,
          qty_quoted: l.is_supplied ? l.qty_quoted : 0,
          rate: l.rate,
          discount_percent: l.discount_percent,
          tax_percent: l.tax_percent,
          delivery_days: l.delivery_days,
          remarks: l.remarks,
          is_supplied: l.is_supplied,
        })),
        payment_terms: paymentTerms,
        payment_terms_days: paymentTermsDays,
        delivery_terms: deliveryTerms,
        validity_days: validityDays,
        vendor_gstin: gstin.trim() || null,
        vendor_msme_status: msme,
        tds_section: tdsSection.trim() || null,
        rcm_applicable: rcm,
        source: 'portal_submission',
        submitted_by: session.vendor_id,
      }, session.entity_code);

      if (status === 'draft') {
        recordVendorActivity(session.vendor_id, session.entity_code, 'quotation_draft_save', 'quotation', quotation.id, quotation.quotation_no);
        setBusy(false);
        return;
      }
      recordVendorActivity(session.vendor_id, session.entity_code, 'quotation_submit', 'quotation', quotation.id, quotation.quotation_no);

      // D-255 onboarding trigger: token-only path → onboarding modal
      if (session.is_token_only && session.must_change_password) {
        markFirstQuoteSubmitted(session.vendor_id, session.entity_code);
        navigate('/vendor-portal/onboarding', { replace: true });
        return;
      }

      navigate('/vendor-portal/inbox', { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Submission failed.');
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen p-6 bg-muted/10">
      <div className="max-w-6xl mx-auto space-y-4">
        {/* Header */}
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>Quotation for {rfq.rfq_no}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Enquiry <span className="font-mono">{enquiry.enquiry_no}</span> ·
                Entity <span className="font-mono">{session.entity_code}</span> ·
                Vendor {session.party_name}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1 text-xs text-muted-foreground">
              <Badge variant="outline">Status: {rfq.status}</Badge>
              <span>Sent: {rfq.sent_at ? new Date(rfq.sent_at).toLocaleDateString('en-IN') : '—'}</span>
              <span>Timeout: {rfq.timeout_at ? new Date(rfq.timeout_at).toLocaleDateString('en-IN') : '—'}</span>
            </div>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Lines + Terms */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Quote Lines</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>UOM</TableHead>
                      <TableHead className="text-right">Req Qty</TableHead>
                      <TableHead>Supply?</TableHead>
                      <TableHead className="text-right">Qty Quoted</TableHead>
                      <TableHead className="text-right">Rate</TableHead>
                      <TableHead className="text-right">Disc %</TableHead>
                      <TableHead className="text-right">Tax %</TableHead>
                      <TableHead className="text-right">Days</TableHead>
                      <TableHead className="text-right">Amt (after tax)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lines.map((l, idx) => (
                      <TableRow key={l.enquiry_line_id} className={!l.is_supplied ? 'opacity-50' : undefined}>
                        <TableCell className="text-sm">{l.item_name}</TableCell>
                        <TableCell className="text-xs font-mono">{l.uom}</TableCell>
                        <TableCell className="text-right font-mono">{l.qty_required}</TableCell>
                        <TableCell>
                          <Checkbox
                            checked={l.is_supplied}
                            onCheckedChange={(v) => updateLine(idx, { is_supplied: v === true })}
                          />
                        </TableCell>
                        <TableCell>
                          <Input type="number" disabled={!l.is_supplied} className="w-20 text-right font-mono"
                            value={l.qty_quoted}
                            onChange={(e) => updateLine(idx, { qty_quoted: Number(e.target.value) || 0 })} />
                        </TableCell>
                        <TableCell>
                          <Input type="number" disabled={!l.is_supplied} className="w-24 text-right font-mono"
                            value={l.rate}
                            onChange={(e) => updateLine(idx, { rate: Number(e.target.value) || 0 })} />
                        </TableCell>
                        <TableCell>
                          <Input type="number" disabled={!l.is_supplied} className="w-16 text-right font-mono"
                            value={l.discount_percent}
                            onChange={(e) => updateLine(idx, { discount_percent: Number(e.target.value) || 0 })} />
                        </TableCell>
                        <TableCell>
                          <Input type="number" disabled={!l.is_supplied} className="w-16 text-right font-mono"
                            value={l.tax_percent}
                            onChange={(e) => updateLine(idx, { tax_percent: Number(e.target.value) || 0 })} />
                        </TableCell>
                        <TableCell>
                          <Input type="number" disabled={!l.is_supplied} className="w-16 text-right font-mono"
                            value={l.delivery_days}
                            onChange={(e) => updateLine(idx, { delivery_days: Number(e.target.value) || 0 })} />
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {l.is_supplied ? formatINR(lineAfterTax(l)) : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs">Remarks (per line)</Label>
                    <p className="text-xs text-muted-foreground">Use the remarks textarea below — applied to all lines.</p>
                  </div>
                  <Textarea
                    placeholder="Optional notes …"
                    value={lines[0]?.remarks ?? ''}
                    onChange={(e) => setLines(prev => prev.map(l => ({ ...l, remarks: e.target.value })))}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Header Terms</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="pt">Payment Terms</Label>
                  <Input id="pt" value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="ptd">Payment Term Days</Label>
                  <Input id="ptd" type="number" value={paymentTermsDays}
                    onChange={(e) => setPaymentTermsDays(Number(e.target.value) || 0)} />
                </div>
                <div>
                  <Label htmlFor="dt">Delivery Terms</Label>
                  <Input id="dt" value={deliveryTerms} onChange={(e) => setDeliveryTerms(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="vd">Validity Days</Label>
                  <Input id="vd" type="number" value={validityDays}
                    onChange={(e) => setValidityDays(Number(e.target.value) || 0)} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Compliance</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="gstin">GSTIN</Label>
                  <Input id="gstin" value={gstin}
                    onChange={(e) => setGstin(e.target.value.toUpperCase())}
                    className="font-mono" placeholder="22ABCDE0000F1Z5" />
                </div>
                <div>
                  <Label htmlFor="msme">MSME Status</Label>
                  <Select value={msme} onValueChange={(v) => setMsme(v as typeof msme)}>
                    <SelectTrigger id="msme"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="micro">Micro</SelectItem>
                      <SelectItem value="small">Small</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="none">None</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="tds">TDS Section</Label>
                  <Input id="tds" value={tdsSection} onChange={(e) => setTdsSection(e.target.value)} />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <Checkbox id="rcm" checked={rcm} onCheckedChange={(v) => setRcm(v === true)} />
                  <Label htmlFor="rcm">RCM Applicable</Label>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Summary panel */}
          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Summary</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Row label="Lines supplied" value={`${lines.filter(l => l.is_supplied).length} / ${lines.length}`} />
                <Row label="Total value" value={formatINR(totals.total_value)} mono />
                <Row label="Total tax" value={formatINR(totals.total_tax)} mono />
                <Row label="Total after tax" value={formatINR(totals.total_after_tax)} mono strong />
                <Row label="Validity until" value={validityUntil} mono />
              </CardContent>
            </Card>

            {error && (
              <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>
            )}

            <div className="flex flex-col gap-2">
              <Button onClick={() => doSubmit('submitted')} disabled={!canSubmit}>
                {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Submit Quotation
              </Button>
              <Button variant="outline" onClick={() => doSubmit('draft')} disabled={busy}>
                Save Draft
              </Button>
              <Button variant="ghost" onClick={() => navigate('/vendor-portal/inbox')} disabled={busy}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, mono, strong }: {
  label: string; value: string; mono?: boolean; strong?: boolean;
}): JSX.Element {
  return (
    <div className="flex justify-between items-center">
      <span className="text-muted-foreground">{label}</span>
      <span className={`${mono ? 'font-mono' : ''} ${strong ? 'font-semibold' : ''}`}>{value}</span>
    </div>
  );
}
