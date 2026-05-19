/**
 * @file        src/pages/vendor-portal/VendorBidSubmission.tsx
 * @purpose     Authenticated in-portal quote submission · CONSUME ONLY submitQuotation engine.
 * @sprint      T-Phase-1.A-c.2-VendorPortal-RFQ-Bid-PO-Flows
 * @decisions   D-272 · D-271 · D-273 · A-c-Q10=B · A-c-Q11=A · D-NEW-DX 3rd validation
 * @reuses      vendor-quotation-engine.submitQuotation · vendor-onboarding-engine.markFirstQuoteSubmitted
 * @[JWT]       POST /api/procure360/quotations (via engine)
 */
import { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import VendorPortalLayout from './VendorPortalLayout';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Send, Loader2, ArrowLeft, CheckCircle, Bot, AlertCircle,
  Sparkles, Lightbulb, AlertTriangle, Info, Mic, MicOff,
} from 'lucide-react';
import { rfqsKey, type RFQ } from '@/types/rfq';
import {
  procurementEnquiriesKey, type ProcurementEnquiry,
} from '@/types/procurement-enquiry';
import { submitQuotation } from '@/lib/vendor-quotation-engine';
import { getVendorSession, recordVendorActivity } from '@/lib/vendor-portal-auth-engine';
import { markFirstQuoteSubmitted } from '@/lib/vendor-onboarding-engine';
import { scopeRfqsForVendor } from '@/lib/vendor-portal-scope';
import { dMul, dSub, roundTo, resolveMoneyPrecision } from '@/lib/decimal-helpers';
import { useT } from '@/lib/i18n-engine';
import {
  generateQuoteCoachReport,
  type QuoteCoachReport,
} from '@/lib/vendor-quote-coach-engine';
import {
  isSpeechRecognitionSupported, transcribeVoice,
} from '@/lib/voice-to-order-engine';

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
}

function loadRfq(rfqId: string, entityCode: string): RFQ | null {
  try {
    const raw = localStorage.getItem(rfqsKey(entityCode));
    if (!raw) return null;
    const list = JSON.parse(raw) as RFQ[];
    return list.find((r) => r.id === rfqId) ?? null;
  } catch { return null; }
}

function loadEnquiry(enquiryId: string, entityCode: string): ProcurementEnquiry | null {
  try {
    const raw = localStorage.getItem(procurementEnquiriesKey(entityCode));
    if (!raw) return null;
    const list = JSON.parse(raw) as ProcurementEnquiry[];
    return list.find((e) => e.id === enquiryId) ?? null;
  } catch { return null; }
}

const MP = resolveMoneyPrecision(null, null);

function lineAmount(line: LineDraft): { basic: number; after_tax: number } {
  const gross = dMul(line.qty_quoted, line.rate);
  const discount = dMul(gross, line.discount_percent / 100);
  const basic = roundTo(dSub(gross, discount), MP);
  const tax = dMul(basic, line.tax_percent / 100);
  const after_tax = roundTo(basic + tax, MP);
  return { basic, after_tax };
}

export default function VendorBidSubmission(): JSX.Element {
  const navigate = useNavigate();
  const { rfqId } = useParams<{ rfqId: string }>();
  const session = getVendorSession();
  const t = useT();

  const rfq = useMemo(
    () => (session && rfqId) ? loadRfq(rfqId, session.entity_code) : null,
    [rfqId, session]
  );

  const enquiry = useMemo(
    () => (rfq && session) ? loadEnquiry(rfq.parent_enquiry_id, session.entity_code) : null,
    [rfq, session]
  );

  const isAuthorized = useMemo(() => {
    if (!session || !rfq) return false;
    const scoped = scopeRfqsForVendor([rfq], session);
    return scoped.length > 0;
  }, [session, rfq]);

  const [lines, setLines] = useState<LineDraft[]>([]);
  const [paymentTerms, setPaymentTerms] = useState('Net 30 days');
  const [paymentTermsDays, setPaymentTermsDays] = useState(30);
  const [deliveryTerms, setDeliveryTerms] = useState('Ex-works');
  const [validityDays, setValidityDays] = useState(15);
  const [gstin, setGstin] = useState('');
  const [msmeStatus, setMsmeStatus] = useState<'micro' | 'small' | 'medium' | 'none'>('none');
  const [rcmApplicable, setRcmApplicable] = useState(false);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Voice notes state · per A-d-Q6=B-light + A-d-Q13=B (vendor reviews)
  const voiceSupported = isSpeechRecognitionSupported();
  const [voiceLang, setVoiceLang] = useState<'en-IN' | 'hi-IN'>('en-IN');
  const [voiceListening, setVoiceListening] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const handleVoiceCapture = async (): Promise<void> => {
    setVoiceError(null);
    setVoiceListening(true);
    try {
      const text = await transcribeVoice(voiceLang);
      setNotes((current) => current ? `${current}\n${text}` : text);
    } catch (e) {
      setVoiceError(e instanceof Error ? e.message : 'Voice transcription failed');
    } finally {
      setVoiceListening(false);
    }
  };

  useEffect(() => {
    if (!enquiry) return;
    setLines(enquiry.lines.map((l) => ({
      enquiry_line_id: l.id,
      item_id: l.item_id,
      item_name: l.item_name,
      uom: l.uom,
      qty_required: l.required_qty,
      qty_quoted: l.required_qty,
      rate: 0,
      discount_percent: 0,
      tax_percent: 18,
    })));
  }, [enquiry]);

  const totals = useMemo(() => {
    let basic = 0;
    let afterTax = 0;
    lines.forEach((l) => {
      const a = lineAmount(l);
      basic += a.basic;
      afterTax += a.after_tax;
    });
    return { basic, afterTax, tax: afterTax - basic };
  }, [lines]);

  // Quote Coach state · per A-d-Q5=B + A-d-Q12=B
  const coachReport: QuoteCoachReport | null = useMemo(() => {
    if (!session || !rfq) return null;
    if (lines.length === 0 || !lines.some((l) => l.rate > 0)) return null;
    return generateQuoteCoachReport({
      vendor_id: session.vendor_id,
      entity_code: session.entity_code,
      current_lines: lines.map((l) => ({
        enquiry_line_id: l.enquiry_line_id,
        item_id: l.item_id,
        rate: l.rate,
        discount_percent: l.discount_percent,
        tax_percent: l.tax_percent,
        qty_quoted: l.qty_quoted,
      })),
    });
  }, [session, rfq, lines]);


  if (!session) return <Navigate to="/vendor-portal/login" replace />;
  if (!rfq) return (
    <VendorPortalLayout>
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>RFQ not found.</AlertDescription>
      </Alert>
    </VendorPortalLayout>
  );
  if (!isAuthorized) return (
    <VendorPortalLayout>
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>You don't have access to this RFQ.</AlertDescription>
      </Alert>
    </VendorPortalLayout>
  );

  const updateLine = (idx: number, patch: Partial<LineDraft>): void => {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  };

  const canSubmit = lines.every((l) => l.rate > 0 && l.qty_quoted > 0) && totals.basic > 0 && !submitting;

  const handleSubmit = (): void => {
    if (!canSubmit) {
      setError('All lines must have rate > 0 and qty > 0');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      // D-NEW-DX 3rd validation · empirical schema match · lines shape mirrors VendorQuotationLine
      submitQuotation({
        parent_rfq_id: rfq.id,
        parent_enquiry_id: rfq.parent_enquiry_id,
        entity_id: session.entity_code,
        vendor_id: session.vendor_id,
        vendor_name: session.party_name,
        lines: lines.map((l) => ({
          enquiry_line_id: l.enquiry_line_id,
          item_id: l.item_id,
          qty_quoted: l.qty_quoted,
          rate: l.rate,
          discount_percent: l.discount_percent,
          tax_percent: l.tax_percent,
          delivery_days: 7,
          remarks: '',
          is_supplied: true,
        })),
        payment_terms: paymentTerms,
        payment_terms_days: paymentTermsDays,
        delivery_terms: deliveryTerms,
        validity_days: validityDays,
        vendor_gstin: gstin || null,
        vendor_msme_status: msmeStatus,
        rcm_applicable: rcmApplicable,
        source: 'portal_submission',
        submitted_by: session.party_name,
      }, session.entity_code);
      markFirstQuoteSubmitted(session.vendor_id, session.entity_code);
      recordVendorActivity(
        session.vendor_id, session.entity_code, 'quotation_submit',
        'rfq', rfq.id, rfq.rfq_no, notes || undefined,
      );
      setSuccess(true);
      setTimeout(() => navigate('/vendor-portal/enquiries'), 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <VendorPortalLayout>
        <Card className="border-emerald-500/30 bg-emerald-500/5 max-w-2xl">
          <CardContent className="p-8 text-center space-y-3">
            <CheckCircle className="h-12 w-12 text-emerald-600 mx-auto" />
            <h2 className="text-xl font-bold">{t('vendor.bid.success_title', 'Quotation Submitted')}</h2>
            <p className="text-sm text-muted-foreground">
              {t('vendor.bid.success_msg', 'Your bid for RFQ {rfq_no} has been submitted · redirecting…', { rfq_no: rfq.rfq_no })}
            </p>
          </CardContent>
        </Card>
      </VendorPortalLayout>
    );
  }

  return (
    <VendorPortalLayout>
      <div className="space-y-6 max-w-5xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/vendor-portal/enquiries')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Send className="h-6 w-6 text-primary" />
                {t('vendor.bid.title', 'Submit Bid')} · {rfq.rfq_no}
              </h1>
              <p className="text-sm text-muted-foreground">
                {t('vendor.bid.subtitle', 'Quote line rates · review terms · submit')}
              </p>
            </div>
          </div>
          <Badge variant="outline" className="gap-1 text-[10px]">
            <Sparkles className="h-3 w-3" /> {t('vendor.coach.live', 'AI Quote Coach v2 · Live')}
          </Badge>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t('vendor.bid.line_items', 'Line Items')} ({lines.length})</CardTitle>
            <CardDescription>Enter rate · adjust qty if partial · discount + tax%</CardDescription>
          </CardHeader>
          <CardContent>
            {lines.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No line items in parent enquiry</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('vendor.bid.col_item', 'Item')}</TableHead>
                    <TableHead className="w-20 text-right">{t('vendor.bid.col_qty_req', 'Qty Req')}</TableHead>
                    <TableHead className="w-20 text-right">{t('vendor.bid.col_qty_quote', 'Qty Quote')}</TableHead>
                    <TableHead className="w-24 text-right">{t('vendor.bid.col_rate', 'Rate ₹')}</TableHead>
                    <TableHead className="w-20 text-right">{t('vendor.bid.col_discount', 'Disc %')}</TableHead>
                    <TableHead className="w-20 text-right">{t('vendor.bid.col_tax', 'Tax %')}</TableHead>
                    <TableHead className="w-28 text-right">{t('vendor.bid.col_line_total', 'Line Total')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((l, idx) => {
                    const a = lineAmount(l);
                    return (
                      <TableRow key={l.enquiry_line_id}>
                        <TableCell className="text-sm">
                          <p className="font-medium">{l.item_name}</p>
                          <p className="text-[10px] text-muted-foreground">{l.uom}</p>
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">{l.qty_required}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={l.qty_quoted}
                            onChange={(e) => updateLine(idx, { qty_quoted: parseFloat(e.target.value) || 0 })}
                            className="h-8 text-right font-mono text-xs"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={l.rate}
                            onChange={(e) => updateLine(idx, { rate: parseFloat(e.target.value) || 0 })}
                            className="h-8 text-right font-mono text-xs"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={l.discount_percent}
                            onChange={(e) => updateLine(idx, { discount_percent: parseFloat(e.target.value) || 0 })}
                            className="h-8 text-right font-mono text-xs"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={l.tax_percent}
                            onChange={(e) => updateLine(idx, { tax_percent: parseFloat(e.target.value) || 0 })}
                            className="h-8 text-right font-mono text-xs"
                          />
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm font-bold">
                          ₹{new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(a.after_tax)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t('vendor.bid.terms_title', 'Terms & Compliance')}</CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="payment-terms" className="text-xs">{t('vendor.bid.payment_terms', 'Payment Terms')}</Label>
              <Input id="payment-terms" value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="payment-days" className="text-xs">{t('vendor.bid.payment_days', 'Payment Days')}</Label>
              <Input
                id="payment-days"
                type="number"
                value={paymentTermsDays}
                onChange={(e) => setPaymentTermsDays(parseInt(e.target.value, 10) || 0)}
              />
            </div>
            <div>
              <Label htmlFor="delivery-terms" className="text-xs">{t('vendor.bid.delivery_terms', 'Delivery Terms')}</Label>
              <Input id="delivery-terms" value={deliveryTerms} onChange={(e) => setDeliveryTerms(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="validity-days" className="text-xs">{t('vendor.bid.validity_days', 'Validity (days)')}</Label>
              <Input
                id="validity-days"
                type="number"
                value={validityDays}
                onChange={(e) => setValidityDays(parseInt(e.target.value, 10) || 0)}
              />
            </div>
            <div>
              <Label htmlFor="gstin" className="text-xs">{t('vendor.bid.gstin', 'GSTIN')}</Label>
              <Input id="gstin" value={gstin} onChange={(e) => setGstin(e.target.value)} placeholder="15-char GSTIN" />
            </div>
            <div>
              <Label className="text-xs">{t('vendor.bid.msme_status', 'MSME Status')}</Label>
              <Select value={msmeStatus} onValueChange={(v) => setMsmeStatus(v as typeof msmeStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not MSME</SelectItem>
                  <SelectItem value="micro">Micro</SelectItem>
                  <SelectItem value="small">Small</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2 flex items-center gap-2 pt-2">
              <Checkbox id="rcm" checked={rcmApplicable} onCheckedChange={(c) => setRcmApplicable(c === true)} />
              <Label htmlFor="rcm" className="text-xs cursor-pointer">{t('vendor.bid.rcm_applicable', 'RCM (Reverse Charge) applicable')}</Label>
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="notes" className="text-xs">{t('vendor.bid.notes', 'Notes (optional)')}</Label>
              <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="text-sm space-y-1 font-mono">
              <div>Basic: ₹{new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(totals.basic)}</div>
              <div>Tax: ₹{new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(totals.tax)}</div>
              <div className="text-base font-bold">Total: ₹{new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(totals.afterTax)}</div>
            </div>
            <div className="flex items-center gap-2">
              {error && (
                <Alert variant="destructive" className="py-1 px-3 text-xs">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <Button onClick={handleSubmit} disabled={!canSubmit} size="lg" className="gap-2">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {t('vendor.bid.btn_submit', 'Submit Quotation')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </VendorPortalLayout>
  );
}
