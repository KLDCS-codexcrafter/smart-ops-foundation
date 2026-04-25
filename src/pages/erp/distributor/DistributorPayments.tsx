/**
 * DistributorPayments.tsx — Distributor records "I paid X by RTGS UTR Y".
 * Sprint 10. Creates a DistributorPaymentIntimation; ERP accountant verifies + posts a Receipt.
 * [JWT] POST /api/distributor/payment-intimations
 */
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  IndianRupee, Send, Loader2, ClipboardList, CheckCircle2, Clock, XCircle,
} from 'lucide-react';
import { DistributorLayout } from '@/features/distributor/DistributorLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { getDistributorSession, loadDistributors, hasRolePermission } from '@/lib/distributor-auth-engine';
import { formatINR } from '@/lib/india-validations';
import {
  distributorIntimationsKey,
  type IntimationMode, type IntimationStatus, type DistributorPaymentIntimation,
} from '@/types/distributor-order';

// Sprint 10: portal currently runs as 'owner' role — extend session in Sprint 11.
const CURRENT_ROLE = 'owner' as const;

const INDIGO = 'hsl(231 48% 58%)';
const INDIGO_BG = 'hsl(231 48% 48% / 0.12)';

function ls<T>(k: string): T[] {
  try { const r = localStorage.getItem(k); return r ? (JSON.parse(r) as T[]) : []; } catch { return []; }
}
function setLs<T>(k: string, v: T[]): void { localStorage.setItem(k, JSON.stringify(v)); }

const schema = z.object({
  amount_rupees: z.coerce.number().positive('Amount must be greater than 0'),
  mode: z.enum(['rtgs', 'neft', 'imps', 'upi', 'cheque', 'cash', 'other']),
  utr_no: z.string().optional(),
  cheque_no: z.string().optional(),
  bank_name: z.string().optional(),
  paid_on: z.string().min(1, 'Payment date is required'),
  notes: z.string().optional(),
}).refine(d => d.mode === 'cash' || d.mode === 'other' || (d.utr_no || d.cheque_no), {
  message: 'Provide a UTR or cheque number',
  path: ['utr_no'],
});

type FormValues = z.infer<typeof schema>;

const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

const statusBadge: Record<IntimationStatus, { bg: string; fg: string; Icon: typeof CheckCircle2; label: string }> = {
  submitted:  { bg: 'hsl(231 48% 48% / 0.15)', fg: INDIGO, Icon: Clock, label: 'Submitted' },
  verifying:  { bg: 'hsl(38 92% 50% / 0.15)', fg: 'hsl(38 92% 50%)', Icon: Clock, label: 'Verifying' },
  converted:  { bg: 'hsl(142 71% 45% / 0.15)', fg: 'hsl(142 71% 45%)', Icon: CheckCircle2, label: 'Converted' },
  rejected:   { bg: 'hsl(0 72% 51% / 0.15)', fg: 'hsl(0 72% 51%)', Icon: XCircle, label: 'Rejected' },
  duplicate:  { bg: 'hsl(215 16% 47% / 0.15)', fg: 'hsl(215 16% 47%)', Icon: XCircle, label: 'Duplicate' },
};

export function DistributorPaymentsPanel() { return <DistributorPayments />; }

export default function DistributorPayments() {
  const session = getDistributorSession();
  const [submitting, setSubmitting] = useState(false);
  const [refresh, setRefresh] = useState(0);

  const distributor = session
    ? loadDistributors(session.entity_code).find(p => p.id === session.distributor_id) ?? null
    : null;

  // Cleanup-1a: `refresh` is bumped after a successful intimation submit so
  // the list re-reads localStorage and shows the new entry immediately.
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: manual refresh trigger
  const intimations = useMemo<DistributorPaymentIntimation[]>(() => {
    if (!session) return [];
    return ls<DistributorPaymentIntimation>(distributorIntimationsKey(session.entity_code))
      .filter(i => i.partner_id === session.distributor_id)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }, [session, refresh]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      amount_rupees: 0,
      mode: 'rtgs',
      utr_no: '',
      cheque_no: '',
      bank_name: '',
      paid_on: new Date().toISOString().slice(0, 10),
      notes: '',
    },
  });

  const mode = form.watch('mode');

  const onSubmit = async (v: FormValues) => {
    if (!session || !distributor) return;
    setSubmitting(true);
    try {
      const now = new Date().toISOString();
      const intimation: DistributorPaymentIntimation = {
        id: `pi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        partner_id: distributor.id,
        partner_code: distributor.partner_code,
        partner_name: distributor.legal_name,
        entity_code: session.entity_code,
        amount_paise: Math.round(v.amount_rupees * 100),
        mode: v.mode as IntimationMode,
        utr_no: v.utr_no || null,
        cheque_no: v.cheque_no || null,
        bank_name: v.bank_name || null,
        paid_on: v.paid_on,
        reference_invoices: [],
        notes: v.notes || '',
        status: 'submitted',
        linked_receipt_id: null,
        rejection_reason: null,
        reviewed_at: null,
        reviewed_by: null,
        created_at: now,
        updated_at: now,
      };
      const existing = ls<DistributorPaymentIntimation>(distributorIntimationsKey(session.entity_code));
      // [JWT] POST /api/distributor/payment-intimations
      setLs(distributorIntimationsKey(session.entity_code), [intimation, ...existing]);
      toast.success('Payment intimation submitted', {
        description: `${formatINR(intimation.amount_paise)} • ${v.mode.toUpperCase()}`,
      });
      form.reset({ ...form.getValues(), amount_rupees: 0, utr_no: '', cheque_no: '', notes: '' });
      setRefresh(x => x + 1);
    } finally {
      setSubmitting(false);
    }
  };

  if (!session || !distributor) {
    return <DistributorLayout title="Payments"><div className="text-sm text-muted-foreground">Sign in.</div></DistributorLayout>;
  }

  return (
    <DistributorLayout title="Payments" subtitle="Record a transfer — accountant will verify against bank statement">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-fade-in">
        {/* Form */}
        <div className="rounded-2xl border border-border/50 bg-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: INDIGO_BG }}>
              <IndianRupee className="h-4 w-4" style={{ color: INDIGO }} />
            </div>
            <h3 className="text-sm font-semibold text-foreground">New Payment Intimation</h3>
          </div>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="amount_rupees" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Amount (₹)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} className="rounded-lg font-mono" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="mode" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Mode</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(['rtgs', 'neft', 'imps', 'upi', 'cheque', 'cash', 'other'] as const).map(m => (
                          <SelectItem key={m} value={m}>{m.toUpperCase()}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              {(mode === 'rtgs' || mode === 'neft' || mode === 'imps' || mode === 'upi') && (
                <FormField control={form.control} name="utr_no" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">UTR / Reference No</FormLabel>
                    <FormControl><Input {...field} className="rounded-lg font-mono" placeholder="e.g. SBIN0123456789" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              )}

              {mode === 'cheque' && (
                <div className="grid grid-cols-2 gap-3">
                  <FormField control={form.control} name="cheque_no" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Cheque No</FormLabel>
                      <FormControl><Input {...field} className="rounded-lg font-mono" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="bank_name" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Bank</FormLabel>
                      <FormControl><Input {...field} className="rounded-lg" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              )}

              <FormField control={form.control} name="paid_on" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Paid on</FormLabel>
                  <FormControl><Input type="date" {...field} className="rounded-lg" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Notes</FormLabel>
                  <FormControl><Textarea rows={2} {...field} className="rounded-lg text-sm" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {hasRolePermission(CURRENT_ROLE, 'record_payment') ? (
                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-lg gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Submit Intimation
                </Button>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-2">
                  Your role does not have permission to record payments.
                </p>
              )}
            </form>
          </Form>
        </div>

        {/* History */}
        <div className="rounded-2xl border border-border/50 bg-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: INDIGO_BG }}>
              <ClipboardList className="h-4 w-4" style={{ color: INDIGO }} />
            </div>
            <h3 className="text-sm font-semibold text-foreground">My Intimations</h3>
          </div>
          {intimations.length === 0 ? (
            <p className="text-xs text-muted-foreground py-8 text-center">No intimations submitted yet.</p>
          ) : (
            <div className="space-y-2">
              {intimations.map(i => {
                const s = statusBadge[i.status];
                return (
                  <div key={i.id} className="rounded-lg border border-border/30 p-3">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="text-sm font-bold font-mono text-foreground">{formatINR(i.amount_paise)}</p>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded"
                        style={{ background: s.bg, color: s.fg }}>
                        <s.Icon className="h-3 w-3" /> {s.label}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {i.mode.toUpperCase()} • {formatDate(i.paid_on)}
                      {i.utr_no && <> • UTR <span className="font-mono">{i.utr_no}</span></>}
                      {i.cheque_no && <> • Chq <span className="font-mono">{i.cheque_no}</span></>}
                    </p>
                    {i.rejection_reason && (
                      <p className="text-[11px] text-destructive mt-1">Reason: {i.rejection_reason}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </DistributorLayout>
  );
}
