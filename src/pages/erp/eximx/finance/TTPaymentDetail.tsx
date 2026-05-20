/**
 * @file        src/pages/erp/eximx/finance/TTPaymentDetail.tsx
 * @purpose     TT Detail · 4-way integration peak · Form 15CA + voucher runtime preview
 * @sprint      T-Phase-1.EX-8-TT-Hedge-MonthEnd-DayBook-VoucherRuntime
 */
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sparkles, ArrowLeft, Banknote } from 'lucide-react';
import { getTTPayment } from '@/lib/tt-payment-engine';
import { loadForm15CAs } from '@/lib/form-15ca-15cb-engine';
import { TTPaymentSaathiPanel } from '../saathi/TTPaymentSaathiPanel';
import type { TTPayment } from '@/types/tt-payment';
import type { Form15CASubmission } from '@/types/form-15ca-15cb';
import { FORM_15CA_PART_DESCRIPTIONS } from '@/types/form-15ca-15cb';

export function TTPaymentDetail({ ttPaymentId, onBack }: { ttPaymentId: string; onBack: () => void }): JSX.Element {
  const entityCode = 'sinha-trading';
  const [tt, setTt] = useState<TTPayment | null>(null);
  const [form15CA, setForm15CA] = useState<Form15CASubmission | null>(null);
  const [showSaathi, setShowSaathi] = useState(false);

  useEffect(() => {
    const t = getTTPayment(entityCode, ttPaymentId);
    setTt(t);
    if (t?.related_form_15ca_submission_id) {
      const all = loadForm15CAs(entityCode);
      setForm15CA(all.find((f) => f.id === t.related_form_15ca_submission_id) ?? null);
    }
  }, [ttPaymentId]);

  if (!tt) return <div className="p-6">TT Payment not found</div>;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}><ArrowLeft className="w-4 h-4 mr-2" />Back</Button>
        <Button variant="outline" onClick={() => setShowSaathi(!showSaathi)}><Sparkles className="w-4 h-4 mr-2" />{showSaathi ? 'Hide' : 'Show'} Saathi</Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold">{tt.tt_payment_no}</h1>
        <p className="text-sm text-muted-foreground">{tt.related_import_po_no} · {tt.amount_foreign.toLocaleString('en-IN')} {tt.currency_code} → ₹{tt.amount_inr.toLocaleString('en-IN')} · {tt.status.replace(/_/g, ' ')}</p>
      </div>

      <div className={`grid ${showSaathi ? 'lg:grid-cols-3' : 'lg:grid-cols-2'} gap-6`}>
        <div className="lg:col-span-2">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Status</div><Badge variant="outline">{tt.status.replace(/_/g, ' ')}</Badge></CardContent></Card>
            <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Buying Rate</div><div className="font-mono font-bold">{tt.buying_rate_applied}</div></CardContent></Card>
            <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Bank Charges</div><div className="font-mono">₹{tt.bank_charges_inr.toLocaleString('en-IN')}</div></CardContent></Card>
            <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Total Debit</div><div className="font-mono font-bold">₹{tt.total_debit_inr.toLocaleString('en-IN')}</div></CardContent></Card>
          </div>

          <Card className="mb-6">
            <CardHeader><CardTitle className="text-sm">Cross-Master Lineage · 4-Way Integration</CardTitle></CardHeader>
            <CardContent className="text-sm space-y-1">
              <div>ImportPO: <code>{tt.related_import_po_no}</code></div>
              <div>Foreign Vendor: <code>{tt.related_foreign_vendor_id}</code></div>
              <div>Form 15CA Submission: <code>{tt.related_form_15ca_submission_id ?? '—'}</code></div>
              <div>AutoPostedVoucher (via runtime): <code>{tt.related_auto_posted_voucher_id ?? 'pending'}</code></div>
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader><CardTitle className="text-sm"><Banknote className="w-4 h-4 inline mr-2" />Bank Transfer Details</CardTitle></CardHeader>
            <CardContent className="text-sm space-y-1">
              <div>AD Bank: {tt.ad_bank_name} ({tt.ad_bank_code})</div>
              <div>Beneficiary Bank: {tt.beneficiary_bank_name}</div>
              <div>Beneficiary Account: <code>{tt.beneficiary_account_no}</code></div>
              <div>SWIFT: <code>{tt.beneficiary_swift_code}</code></div>
              <div>RBI Purpose Code: <code>{tt.rbi_purpose_code}</code> · {tt.rbi_purpose_description}</div>
            </CardContent>
          </Card>

          {form15CA && (
            <Card className="mb-6 border-primary">
              <CardHeader><CardTitle className="text-sm">Form 15CA/15CB Submission</CardTitle></CardHeader>
              <CardContent className="text-sm space-y-1">
                <div>Ref: <code>{form15CA.form_15ca_ref}</code> · <Badge variant="outline">{form15CA.part}</Badge></div>
                <div className="text-xs text-muted-foreground">{FORM_15CA_PART_DESCRIPTIONS[form15CA.part]}</div>
                <div>Status: <Badge variant="outline">{form15CA.status.replace(/_/g, ' ')}</Badge></div>
                {form15CA.efiling_acknowledgment_no && <div>e-filing ACK: <code>{form15CA.efiling_acknowledgment_no}</code></div>}
                {form15CA.dtaa_country_code && <div>DTAA: {form15CA.dtaa_country_code} · {form15CA.dtaa_article_ref}</div>}
              </CardContent>
            </Card>
          )}
        </div>

        {showSaathi && <div className="lg:col-span-1"><TTPaymentSaathiPanel tt={tt} form15CA={form15CA} /></div>}
      </div>
    </div>
  );
}
