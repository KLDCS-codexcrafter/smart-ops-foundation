/**
 * MobileExpenseClaimPage.tsx — Field expense claim capture
 * Sprint T-Phase-1.1.1l-d · Writes to existing EXPENSE_CLAIMS_KEY
 * Approval handled by PayHub Employee Finance module (no new workflow needed).
 */
import { useState, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Camera, Save, Loader2, Receipt, X } from 'lucide-react';
import { toast } from 'sonner';
import type { MobileSession } from '../MobileRouter';
import {
  type ExpenseClaim, type ExpenseCategory,
  EXPENSE_CLAIMS_KEY, EXPENSE_CATEGORY_LABELS, EXPENSE_STATUS_COLORS,
} from '@/types/employee-finance';
import { cn } from '@/lib/utils';

function readSession(): MobileSession | null {
  try {
    const raw = sessionStorage.getItem('opx_mobile_session');
    return raw ? (JSON.parse(raw) as MobileSession) : null;
  } catch { return null; }
}

function loadClaims(): ExpenseClaim[] {
  try {
    const raw = localStorage.getItem(EXPENSE_CLAIMS_KEY);
    return raw ? (JSON.parse(raw) as ExpenseClaim[]) : [];
  } catch { return []; }
}

function saveClaims(list: ExpenseClaim[]): void {
  // [JWT] POST /api/hr/expense-claims
  localStorage.setItem(EXPENSE_CLAIMS_KEY, JSON.stringify(list));
}

const fmtINR = (n: number) => `₹${n.toLocaleString('en-IN')}`;

export default function MobileExpenseClaimPage() {
  const navigate = useNavigate();
  const session = useMemo(() => readSession(), []);
  const [allClaims, setAllClaims] = useState<ExpenseClaim[]>(() => loadClaims());

  const refreshClaims = useCallback(() => {
    setAllClaims(loadClaims());
  }, []);

  const myClaims = useMemo(
    () => allClaims
      .filter(c => c.employeeId === session?.user_id)
      .sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [allClaims, session],
  );

  const [showForm, setShowForm] = useState(false);
  const [category, setCategory] = useState<ExpenseCategory>('travel');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10));
  const [receiptDataUrl, setReceiptDataUrl] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleReceiptChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Receipt image too large (max 2 MB)');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setReceiptDataUrl(typeof reader.result === 'string' ? reader.result : '');
    reader.readAsDataURL(file);
  }, []);

  const resetForm = useCallback(() => {
    setCategory('travel');
    setAmount('');
    setDescription('');
    setExpenseDate(new Date().toISOString().slice(0, 10));
    setReceiptDataUrl('');
    setShowForm(false);
  }, []);

  const handleSubmit = useCallback(() => {
    if (!session) return;
    const amountN = Number(amount);
    if (!amountN || amountN <= 0) { toast.error('Enter a valid amount'); return; }
    if (!description.trim()) { toast.error('Description required'); return; }

    setBusy(true);
    const now = new Date().toISOString();
    const claim: ExpenseClaim = {
      id: `exp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      employeeId: session.user_id ?? '',
      employeeCode: session.user_id ?? '',
      employeeName: session.display_name,
      claimDate: now.slice(0, 10),
      expenseDate,
      category,
      description,
      amount: amountN,
      receiptRef: receiptDataUrl,
      status: 'submitted',
      approvedBy: '',
      approvedAmount: 0,
      rejectionReason: '',
      reimbursedDate: '',
      reimbursementMode: 'bank_transfer',
      created_at: now,
      updated_at: now,
    };
    const all = loadClaims();
    all.push(claim);
    saveClaims(all);
    refreshClaims();
    setBusy(false);
    resetForm();
    toast.success(`Claim submitted: ${fmtINR(amountN)}`);
  }, [session, amount, description, expenseDate, category, receiptDataUrl, resetForm, refreshClaims]);

  if (!session) return null;

  const totalSubmitted = myClaims.filter(c => c.status === 'submitted').reduce((s, c) => s + c.amount, 0);
  const totalReimbursed = myClaims.filter(c => c.status === 'reimbursed').reduce((s, c) => s + c.approvedAmount, 0);

  return (
    <div className="p-4 max-w-md mx-auto space-y-3 pb-12">
      <div className="flex items-center gap-2 mb-2">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-base font-semibold">Expenses</h1>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Card className="p-3">
          <p className="text-[10px] uppercase text-muted-foreground">Pending</p>
          <p className="text-base font-mono font-semibold text-amber-700">{fmtINR(totalSubmitted)}</p>
        </Card>
        <Card className="p-3">
          <p className="text-[10px] uppercase text-muted-foreground">Reimbursed</p>
          <p className="text-base font-mono font-semibold text-green-700">{fmtINR(totalReimbursed)}</p>
        </Card>
      </div>

      {!showForm ? (
        <Button
          className="w-full bg-violet-600 hover:bg-violet-700"
          onClick={() => setShowForm(true)}
        >
          <Receipt className="h-4 w-4 mr-2" /> New Expense Claim
        </Button>
      ) : (
        <Card className="p-3 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">New Claim</p>
            <Button variant="ghost" size="sm" onClick={resetForm}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Category</Label>
            <Select value={category} onValueChange={v => setCategory(v as ExpenseCategory)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(EXPENSE_CATEGORY_LABELS) as ExpenseCategory[]).map(c => (
                  <SelectItem key={c} value={c}>{EXPENSE_CATEGORY_LABELS[c]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Amount (₹)</Label>
              <Input type="number" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Date</Label>
              <Input type="date" value={expenseDate} onChange={e => setExpenseDate(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Description</Label>
            <Textarea rows={2} value={description} onChange={e => setDescription(e.target.value)} placeholder="Purpose / context" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Receipt Photo (optional)</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleReceiptChange}
              className="hidden"
            />
            <Button variant="outline" size="sm" className="w-full" onClick={() => fileInputRef.current?.click()}>
              <Camera className="h-4 w-4 mr-2" />
              {receiptDataUrl ? 'Replace Receipt' : 'Capture Receipt'}
            </Button>
            {receiptDataUrl && (
              <img src={receiptDataUrl} alt="Receipt" className="w-full max-h-40 object-contain rounded border mt-1" />
            )}
          </div>

          <Button className="w-full" disabled={busy} onClick={handleSubmit}>
            {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Submit Claim
          </Button>
        </Card>
      )}

      <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
        My Claims ({myClaims.length})
      </p>
      {myClaims.length === 0 ? (
        <Card className="p-6 text-center">
          <Receipt className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No claims yet</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {myClaims.slice(0, 50).map(c => (
            <Card key={c.id} className="p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{c.description}</p>
                  <p className="text-[10px] text-muted-foreground font-mono">
                    {c.expenseDate} · {EXPENSE_CATEGORY_LABELS[c.category]}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-mono font-semibold">{fmtINR(c.amount)}</p>
                  <Badge variant="outline" className={cn('text-[9px] mt-1', EXPENSE_STATUS_COLORS[c.status])}>
                    {c.status}
                  </Badge>
                </div>
              </div>
              {c.status === 'rejected' && c.rejectionReason && (
                <p className="text-[10px] text-red-600 mt-1">Rejected: {c.rejectionReason}</p>
              )}
              {c.status === 'reimbursed' && c.approvedAmount && c.approvedAmount !== c.amount && (
                <p className="text-[10px] text-green-700 mt-1">
                  Approved: {fmtINR(c.approvedAmount)} (partial)
                </p>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
