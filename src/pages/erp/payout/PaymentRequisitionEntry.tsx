/**
 * @file     PaymentRequisitionEntry.tsx
 * @purpose  Universal Payment Requisition entry screen · 21 type picker +
 *           type-specific form variants · URL-param pre-population for
 *           cross-module Request Payment buttons.
 * @sprint   T-T8.4-Requisition-Universal · Group B Sprint B.4
 *
 * URL params: /erp/payout/requisition?type={X}&linkedId={Y}
 *
 * [DEFERRED · Support & Back Office] approval routing UI · attachment upload ·
 *   email/SMS/WhatsApp triggers. See Future_Task_Register · Capabilities 1-3.
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  FileText, Wallet, Users, Receipt, Building2, AlertCircle, ArrowLeft, Send,
  Banknote, Briefcase, Heart, RefreshCw, Coins, HardHat, Phone, Repeat,
} from 'lucide-react';
import {
  PAYMENT_TYPE_LABELS, PAYMENT_TYPE_CATEGORY,
  type PaymentRequestType, type PaymentTypeCategory,
} from '@/types/payment-requisition';
import { createRequisition, ROUTING_RULES } from '@/lib/payment-requisition-engine';
import { DEFAULT_ENTITY_SHORTCODE } from '@/lib/default-entity';
import { DEPARTMENTS_KEY } from '@/types/org-structure';
import type { Department } from '@/types/org-structure';

const TYPE_ICON: Record<PaymentRequestType, typeof FileText> = {
  vendor_invoice: FileText, vendor_advance: Wallet,
  employee_reimbursement: Receipt, employee_advance: Banknote, employee_loan_disbursement: Briefcase,
  statutory_tds: AlertCircle, statutory_gst: AlertCircle, statutory_pf: AlertCircle,
  statutory_esi: AlertCircle, statutory_pt: AlertCircle,
  loan_emi: RefreshCw,
  director_remuneration: Users, director_drawings: Users,
  customer_refund: RefreshCw, petty_cash_refill: Coins,
  capital_expenditure: HardHat, professional_fees: Briefcase,
  subscription_utility: Phone, inter_company_transfer: Repeat,
  donation_csr: Heart, other_adhoc: FileText,
};

const CATEGORY_LABELS: Record<PaymentTypeCategory, string> = {
  vendor: 'Vendor', employee: 'Employee', statutory: 'Statutory', director: 'Director / Founder', other: 'Other',
};

function loadDepartments(): Department[] {
  try {
    // [JWT] GET /api/departments
    const raw = localStorage.getItem(DEPARTMENTS_KEY);
    return raw ? (JSON.parse(raw) as Department[]) : [];
  } catch { return []; }
}

interface FormState {
  amount: string;
  purpose: string;
  notes: string;
  vendorName: string;
  employeeName: string;
  payeeName: string;
  costCenter: string;
  glAccount: string;
  departmentId: string;
}

const BLANK: FormState = {
  amount: '', purpose: '', notes: '', vendorName: '', employeeName: '', payeeName: '',
  costCenter: '', glAccount: '', departmentId: '',
};

export default function PaymentRequisitionEntry() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const entityCode = DEFAULT_ENTITY_SHORTCODE;
  const departments = useMemo(() => loadDepartments(), []);

  const initialType = (params.get('type') as PaymentRequestType | null);
  const linkedId = params.get('linkedId') ?? '';

  const [type, setType] = useState<PaymentRequestType | null>(initialType);
  const [form, setForm] = useState<FormState>(BLANK);

  // Pre-populate from URL params: keep linkedId in the right field
  useEffect(() => {
    if (initialType) setType(initialType);
  }, [initialType]);

  const grouped = useMemo(() => {
    const groups: Record<PaymentTypeCategory, PaymentRequestType[]> = {
      vendor: [], employee: [], statutory: [], director: [], other: [],
    };
    (Object.keys(PAYMENT_TYPE_LABELS) as PaymentRequestType[]).forEach(t => {
      groups[PAYMENT_TYPE_CATEGORY[t]].push(t);
    });
    return groups;
  }, []);

  const rule = type ? ROUTING_RULES[type] : null;

  const handleSubmit = () => {
    if (!type) { toast.error('Pick a payment type'); return; }
    const amt = Number(form.amount);
    if (!amt || amt <= 0) { toast.error('Amount must be greater than 0'); return; }
    if (!form.purpose.trim()) { toast.error('Purpose is required'); return; }

    const dept = departments.find(d => d.id === form.departmentId);
    const cat = PAYMENT_TYPE_CATEGORY[type];

    const result = createRequisition({
      entityCode,
      request_type: type,
      department_id: dept?.id ?? '',
      department_name: dept?.name ?? 'Unassigned',
      division_id: dept?.division_id ?? undefined,
      amount: amt,
      purpose: form.purpose.trim(),
      notes: form.notes.trim() || undefined,
      cost_center_suggestion: form.costCenter.trim() || undefined,
      gl_account_suggestion: form.glAccount.trim() || undefined,
      vendor_name: cat === 'vendor' ? form.vendorName.trim() || undefined : undefined,
      employee_name: cat === 'employee' ? form.employeeName.trim() || undefined : undefined,
      // Stash linkedId into the matching foreign-key slot
      linked_purchase_invoice_id: type === 'vendor_invoice' ? linkedId || undefined : undefined,
      linked_expense_claim_id: type === 'employee_reimbursement' ? linkedId || undefined : undefined,
      linked_salary_advance_id: type === 'employee_advance' ? linkedId || undefined : undefined,
      linked_loan_application_id: type === 'employee_loan_disbursement' ? linkedId || undefined : undefined,
      linked_emi_schedule_id: type === 'loan_emi' ? linkedId || undefined : undefined,
      linked_cwip_entry_id: type === 'capital_expenditure' ? linkedId || undefined : undefined,
      linked_challan_id: cat === 'statutory' ? linkedId || undefined : undefined,
    });

    if (!result.ok) {
      toast.error(result.errors?.join('; ') ?? 'Failed to create requisition');
      return;
    }
    if (result.status === 'paid') {
      toast.success(`Auto-paid · voucher ${result.voucherNo}`);
    } else {
      toast.success(`Requisition ${result.requisitionId} submitted`);
    }
    navigate('/erp/payout/requisition-history');
  };

  // ── Step 1 · Type picker ──
  if (!type) {
    return (
      <div className="p-6 space-y-4 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold flex items-center gap-2">
              <Send className="h-5 w-5 text-violet-500" /> Universal Payment Requisition
            </h1>
            <p className="text-xs text-muted-foreground">
              Select a payment type to start · 21 types · 2-level approval (Department-head → Accounts) · statutory auto-approves
            </p>
          </div>
        </div>

        {(Object.keys(grouped) as PaymentTypeCategory[]).map(cat => (
          <div key={cat} className="space-y-2">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold">{CATEGORY_LABELS[cat]}</h2>
              <Badge variant="outline" className="text-[10px]">{grouped[cat].length}</Badge>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {grouped[cat].map(t => {
                const Icon = TYPE_ICON[t];
                const r = ROUTING_RULES[t];
                const tag = r.autoApprove ? 'Auto-approved' : r.levels === 1 ? '1-level (Founder)' : '2-level';
                return (
                  <Card key={t} onClick={() => setType(t)}
                    className="cursor-pointer hover:border-violet-500/40 hover:shadow-md transition-all rounded-2xl">
                    <CardContent className="p-3 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-violet-500 shrink-0" />
                        <span className="text-xs font-semibold truncate">{PAYMENT_TYPE_LABELS[t]}</span>
                      </div>
                      <Badge variant="outline" className="text-[9px] py-0">{tag}</Badge>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // ── Step 2 · Type-specific form ──
  const Icon = TYPE_ICON[type];
  const cat = PAYMENT_TYPE_CATEGORY[type];

  return (
    <div className="p-6 space-y-4 animate-fade-in" data-keyboard-form>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setType(null)} className="h-8">
            <ArrowLeft className="h-4 w-4 mr-1" /> Change type
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <Icon className="h-5 w-5 text-violet-500" />
          <h1 className="text-base font-bold">{PAYMENT_TYPE_LABELS[type]}</h1>
          {rule?.autoApprove && (
            <Badge variant="outline" className="text-[10px] bg-green-500/10 text-green-700 border-green-500/30">
              Auto-approved · creates voucher immediately
            </Badge>
          )}
          {rule && !rule.autoApprove && rule.levels === 1 && (
            <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-700 border-amber-500/30">
              1-level · Founder approval
            </Badge>
          )}
          {rule && !rule.autoApprove && rule.levels === 2 && (
            <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-700 border-blue-500/30">
              2-level · Dept-head → Accounts
            </Badge>
          )}
        </div>
      </div>

      {linkedId && (
        <Card className="rounded-xl border-violet-500/30 bg-violet-500/5">
          <CardContent className="p-3 text-xs flex items-center gap-2">
            <FileText className="h-3.5 w-3.5 text-violet-500" />
            Pre-linked record: <span className="font-mono">{linkedId}</span>
          </CardContent>
        </Card>
      )}

      <Card className="rounded-2xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Requisition details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Amount (₹) *</Label>
              <Input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })}
                placeholder="0.00" className="font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Department</Label>
              <Select value={form.departmentId} onValueChange={v => setForm({ ...form, departmentId: v })}>
                <SelectTrigger className="text-xs h-9"><SelectValue placeholder="Select department" /></SelectTrigger>
                <SelectContent>
                  {departments.length === 0 && <SelectItem value="__none__" disabled>No departments configured</SelectItem>}
                  {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {cat === 'vendor' && (
            <div className="space-y-1.5">
              <Label className="text-xs">Vendor name</Label>
              <Input value={form.vendorName} onChange={e => setForm({ ...form, vendorName: e.target.value })} placeholder="Vendor / payee" />
            </div>
          )}

          {cat === 'employee' && (
            <div className="space-y-1.5">
              <Label className="text-xs">Employee name</Label>
              <Input value={form.employeeName} onChange={e => setForm({ ...form, employeeName: e.target.value })} placeholder="Employee name" />
            </div>
          )}

          {cat === 'director' && (
            <div className="space-y-1.5">
              <Label className="text-xs">Payee name (Director / Partner)</Label>
              <Input value={form.payeeName} onChange={e => setForm({ ...form, payeeName: e.target.value, vendorName: e.target.value })} placeholder="Director name" />
            </div>
          )}

          {cat === 'other' && (
            <div className="space-y-1.5">
              <Label className="text-xs">Payee name (optional)</Label>
              <Input value={form.payeeName} onChange={e => setForm({ ...form, payeeName: e.target.value, vendorName: e.target.value })} placeholder="Payee" />
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs">Purpose *</Label>
            <Input value={form.purpose} onChange={e => setForm({ ...form, purpose: e.target.value })}
              placeholder="Brief reason for this payment" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Cost-center suggestion</Label>
              <Input value={form.costCenter} onChange={e => setForm({ ...form, costCenter: e.target.value })} placeholder="Optional" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">GL account suggestion</Label>
              <Input value={form.glAccount} onChange={e => setForm({ ...form, glAccount: e.target.value })} placeholder="Optional" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Notes / attachments reference</Label>
            <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
              placeholder="Additional context · attachment URL placeholder · Phase 1" rows={3} />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => navigate('/erp/payout/dashboard')}>Cancel</Button>
        <Button data-primary onClick={handleSubmit}>
          <Send className="h-4 w-4 mr-1" /> Submit Requisition
        </Button>
      </div>

      <p className="text-[10px] text-muted-foreground">
        Routing is hardcoded for Phase 1 per Q-HH (a). Sophisticated approval workflow · email/SMS/WhatsApp ·
        delegation · escalation are deferred to the Support &amp; Back Office horizon.
      </p>
    </div>
  );
}
