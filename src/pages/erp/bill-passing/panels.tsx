/**
 * panels.tsx — Sprint T-Phase-1.2.6f-c-2 · Block B · Bill Passing panels
 * 4 exports: BillPassingWelcome · PendingBillsPanel · MatchReviewPanel · ApprovedForFcpiPanel
 */
import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Inbox, AlertTriangle, CheckCircle2, FileSearch, Activity } from 'lucide-react';
import { toast } from 'sonner';
import { useEntityCode } from '@/hooks/useEntityCode';
import {
  listBillPassing, listPendingMatch, listMatchedWithVariance, listApprovedForFcpi,
  runMatch, approveBill, rejectBill, createBillPassing,
  type CreateBillPassingLineInput,
} from '@/lib/bill-passing-engine';
import { listPurchaseOrders, getPurchaseOrder } from '@/lib/po-management-engine';
import { listGitStage1 } from '@/lib/git-engine';
import { draftPiFromBill } from '@/lib/finance-pi-bridge';
import type { BillPassingRecord, LineMatchStatus } from '@/types/bill-passing';
import type { BillPassingModule } from './BillPassingSidebar.types';

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

function formatINR(n: number): string {
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function statusVariant(s: BillPassingRecord['status']): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (s) {
    case 'matched_clean': case 'approved_for_fcpi': case 'fcpi_drafted': return 'default';
    case 'matched_with_variance': case 'awaiting_qa': return 'secondary';
    case 'rejected': case 'qa_failed': case 'cancelled': return 'destructive';
    default: return 'outline';
  }
}

function lineStatusBadge(s: LineMatchStatus): { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string } {
  switch (s) {
    case 'clean': return { variant: 'default', label: 'Clean' };
    case 'qty_variance': return { variant: 'secondary', label: 'Qty Δ' };
    case 'rate_variance': return { variant: 'secondary', label: 'Rate Δ' };
    case 'tax_variance': return { variant: 'destructive', label: 'Tax Δ' };
    case 'total_variance': return { variant: 'destructive', label: 'Total Δ' };
    case 'unmatched': return { variant: 'destructive', label: 'Unmatched' };
  }
}

const MOCK_USER = 'mock-user-001';

// ----------------------------------------------------------------------------
// BillPassingWelcome
// ----------------------------------------------------------------------------

export function BillPassingWelcome({
  onNavigate,
}: { onNavigate: (m: BillPassingModule) => void }): JSX.Element {
  const { entityCode } = useEntityCode();
  const all = useMemo(() => listBillPassing(entityCode), [entityCode]);

  const pending = all.filter((b) => b.status === 'pending_match' || b.status === 'awaiting_qa').length;
  const variance = all.filter((b) => b.status === 'matched_with_variance').length;
  const awaitingQa = all.filter((b) => b.status === 'awaiting_qa').length;
  const approved = all.filter((b) => b.status === 'approved_for_fcpi' || b.status === 'fcpi_drafted').length;

  const stats = [
    { id: 'pending-bills' as const, label: 'Pending Match', value: pending, icon: Inbox },
    { id: 'match-review' as const, label: 'Variance Review', value: variance, icon: AlertTriangle },
    { id: 'pending-bills' as const, label: '4-way Awaiting QA', value: awaitingQa, icon: Activity },
    { id: 'approved-for-fcpi' as const, label: 'Approved for FCPI', value: approved, icon: CheckCircle2 },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Bill Passing</h1>
        <p className="text-sm text-muted-foreground">
          3-way / 4-way match · Vendor invoice reconciliation · FinCore PI auto-draft.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <Card
            key={`${s.id}-${i}`}
            className="cursor-pointer hover:bg-accent transition-colors"
            onClick={() => onNavigate(s.id)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{s.label}</CardTitle>
              <s.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono">{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// New Bill Dialog (used by PendingBillsPanel)
// ----------------------------------------------------------------------------

interface NewBillDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  entityCode: string;
  onCreated: () => void;
}

function NewBillDialog({ open, onOpenChange, entityCode, onCreated }: NewBillDialogProps): JSX.Element {
  const pos = useMemo(() => listPurchaseOrders(entityCode), [entityCode]);
  const gits = useMemo(() => listGitStage1(entityCode), [entityCode]);

  const [poId, setPoId] = useState<string>('');
  const [gitId, setGitId] = useState<string>('');
  const [vendorInvoiceNo, setVendorInvoiceNo] = useState('');
  const [vendorInvoiceDate, setVendorInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [linesInput, setLinesInput] = useState<Record<string, { qty: string; rate: string; tax: string; insp: boolean }>>({});

  const selectedPo = poId ? getPurchaseOrder(poId, entityCode) : null;
  const matchingGits = gitId === '' ? gits.filter((g) => g.po_id === poId) : gits;

  const reset = (): void => {
    setPoId(''); setGitId(''); setVendorInvoiceNo('');
    setVendorInvoiceDate(new Date().toISOString().slice(0, 10));
    setLinesInput({});
  };

  const handleSubmit = async (): Promise<void> => {
    if (!poId || !vendorInvoiceNo.trim()) {
      toast.error('PO and Vendor Invoice No are required');
      return;
    }
    const lines: CreateBillPassingLineInput[] = (selectedPo?.lines ?? [])
      .map((pl) => {
        const li = linesInput[pl.id];
        if (!li) return null;
        const qty = parseFloat(li.qty);
        const rate = parseFloat(li.rate);
        const tax = parseFloat(li.tax);
        if (!Number.isFinite(qty) || !Number.isFinite(rate)) return null;
        return {
          po_line_id: pl.id,
          invoice_qty: qty,
          invoice_rate: rate,
          invoice_tax_pct: Number.isFinite(tax) ? tax : 0,
          requires_inspection: li.insp,
        };
      })
      .filter((x): x is CreateBillPassingLineInput => x !== null);
    if (lines.length === 0) {
      toast.error('At least one line required');
      return;
    }

    try {
      await createBillPassing(
        {
          po_id: poId,
          git_id: gitId || null,
          vendor_invoice_no: vendorInvoiceNo,
          vendor_invoice_date: vendorInvoiceDate,
          lines,
        },
        entityCode,
        MOCK_USER,
      );
      toast.success('Bill created');
      reset();
      onCreated();
      onOpenChange(false);
    } catch (e) {
      toast.error(`Failed: ${(e as Error).message}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Bill Passing</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Purchase Order *</Label>
              <Select value={poId} onValueChange={(v) => { setPoId(v); setGitId(''); setLinesInput({}); }}>
                <SelectTrigger><SelectValue placeholder="Select PO" /></SelectTrigger>
                <SelectContent>
                  {pos.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.po_no} · {p.vendor_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>GIT Record (optional)</Label>
              <Select value={gitId} onValueChange={setGitId} disabled={!poId}>
                <SelectTrigger><SelectValue placeholder="None (early bill)" /></SelectTrigger>
                <SelectContent>
                  {matchingGits.map((g) => (
                    <SelectItem key={g.id} value={g.id}>{g.git_no} · {g.status}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Vendor Invoice No *</Label>
              <Input value={vendorInvoiceNo} onChange={(e) => setVendorInvoiceNo(e.target.value)} />
            </div>
            <div>
              <Label>Vendor Invoice Date</Label>
              <Input type="date" value={vendorInvoiceDate} onChange={(e) => setVendorInvoiceDate(e.target.value)} />
            </div>
          </div>

          {selectedPo && (
            <div>
              <Label>Lines (PO baseline shown · enter invoice values)</Label>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">PO Qty</TableHead>
                    <TableHead className="text-right">PO Rate</TableHead>
                    <TableHead>Inv Qty</TableHead>
                    <TableHead>Inv Rate</TableHead>
                    <TableHead>Tax %</TableHead>
                    <TableHead className="text-center">QA?</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedPo.lines.map((pl) => {
                    const cur = linesInput[pl.id] ?? { qty: '', rate: '', tax: String(pl.tax_pct), insp: false };
                    return (
                      <TableRow key={pl.id}>
                        <TableCell>{pl.item_name}</TableCell>
                        <TableCell className="text-right font-mono">{pl.qty}</TableCell>
                        <TableCell className="text-right font-mono">{formatINR(pl.rate)}</TableCell>
                        <TableCell>
                          <Input
                            value={cur.qty}
                            onChange={(e) => setLinesInput({ ...linesInput, [pl.id]: { ...cur, qty: e.target.value } })}
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={cur.rate}
                            onChange={(e) => setLinesInput({ ...linesInput, [pl.id]: { ...cur, rate: e.target.value } })}
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={cur.tax}
                            onChange={(e) => setLinesInput({ ...linesInput, [pl.id]: { ...cur, tax: e.target.value } })}
                            className="h-8 w-16"
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <input
                            type="checkbox"
                            checked={cur.insp}
                            onChange={(e) => setLinesInput({ ...linesInput, [pl.id]: { ...cur, insp: e.target.checked } })}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit}>Create Bill</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ----------------------------------------------------------------------------
// Bill Detail Dialog (used by all panels)
// ----------------------------------------------------------------------------

function BillDetailDialog({
  bill, open, onOpenChange,
}: { bill: BillPassingRecord | null; open: boolean; onOpenChange: (v: boolean) => void }): JSX.Element | null {
  if (!bill) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{bill.bill_no} · {bill.vendor_name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div><span className="text-muted-foreground">PO:</span> <span className="font-mono">{bill.po_no}</span></div>
            <div><span className="text-muted-foreground">Match:</span> <Badge variant="outline">{bill.match_type}</Badge></div>
            <div><span className="text-muted-foreground">Status:</span> <Badge variant={statusVariant(bill.status)}>{bill.status}</Badge></div>
            <div><span className="text-muted-foreground">Variance:</span> <span className="font-mono">{bill.variance_pct.toFixed(2)}%</span></div>
            <div><span className="text-muted-foreground">Invoice:</span> <span className="font-mono">{formatINR(bill.total_invoice_value)}</span></div>
            <div><span className="text-muted-foreground">PO Total:</span> <span className="font-mono">{formatINR(bill.total_po_value)}</span></div>
            <div><span className="text-muted-foreground">GRN Value:</span> <span className="font-mono">{formatINR(bill.total_grn_value)}</span></div>
            <div><span className="text-muted-foreground">Variance ₹:</span> <span className="font-mono">{formatINR(bill.total_variance)}</span></div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Item</TableHead>
                <TableHead className="text-right">PO Qty</TableHead>
                <TableHead className="text-right">GRN Qty</TableHead>
                <TableHead className="text-right">Inv Qty</TableHead>
                <TableHead className="text-right">PO Rate</TableHead>
                <TableHead className="text-right">Inv Rate</TableHead>
                <TableHead className="text-right">Inv Total</TableHead>
                <TableHead>Match</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bill.lines.map((l) => {
                const b = lineStatusBadge(l.match_status);
                return (
                  <TableRow key={l.id}>
                    <TableCell>{l.line_no}</TableCell>
                    <TableCell>{l.item_name}</TableCell>
                    <TableCell className="text-right font-mono">{l.po_qty}</TableCell>
                    <TableCell className="text-right font-mono">{l.grn_qty}</TableCell>
                    <TableCell className="text-right font-mono">{l.invoice_qty}</TableCell>
                    <TableCell className="text-right font-mono">{formatINR(l.po_rate)}</TableCell>
                    <TableCell className="text-right font-mono">{formatINR(l.invoice_rate)}</TableCell>
                    <TableCell className="text-right font-mono">{formatINR(l.invoice_total)}</TableCell>
                    <TableCell><Badge variant={b.variant}>{b.label}</Badge></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {bill.lines.some((l) => l.variance_reason) && (
            <div className="text-xs space-y-1">
              <div className="font-semibold">Variance Notes</div>
              {bill.lines.filter((l) => l.variance_reason).map((l) => (
                <div key={l.id} className="text-muted-foreground">L{l.line_no}: {l.variance_reason}</div>
              ))}
            </div>
          )}
          {bill.approval_notes && (
            <div className="text-xs">
              <div className="font-semibold">Approval Notes</div>
              <div className="text-muted-foreground whitespace-pre-wrap">{bill.approval_notes}</div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ----------------------------------------------------------------------------
// PendingBillsPanel
// ----------------------------------------------------------------------------

export function PendingBillsPanel(): JSX.Element {
  const { entityCode } = useEntityCode();
  const [tick, setTick] = useState(0);
  const list = useMemo(() => listPendingMatch(entityCode), [entityCode, tick]);
  const [newOpen, setNewOpen] = useState(false);
  const [detail, setDetail] = useState<BillPassingRecord | null>(null);

  const handleRunMatch = async (id: string): Promise<void> => {
    try {
      await runMatch(id, entityCode, MOCK_USER);
      toast.success('Match recomputed');
      setTick((t) => t + 1);
    } catch (e) {
      toast.error(`Match failed: ${(e as Error).message}`);
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Pending Bills</h1>
          <p className="text-sm text-muted-foreground">Vendor invoices awaiting 3-way / 4-way match.</p>
        </div>
        <Button onClick={() => setNewOpen(true)}>+ New Bill</Button>
      </div>
      <Card>
        <CardContent className="p-0">
          {list.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              <FileSearch className="h-10 w-10 mx-auto mb-2 opacity-50" />
              No pending bills.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bill No</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>PO</TableHead>
                  <TableHead>Inv No</TableHead>
                  <TableHead>Match</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Invoice ₹</TableHead>
                  <TableHead className="text-right">Variance %</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((b) => (
                  <TableRow key={b.id} className="cursor-pointer" onClick={() => setDetail(b)}>
                    <TableCell className="font-mono">{b.bill_no}</TableCell>
                    <TableCell>{b.vendor_name}</TableCell>
                    <TableCell className="font-mono">{b.po_no}</TableCell>
                    <TableCell>{b.vendor_invoice_no}</TableCell>
                    <TableCell><Badge variant="outline">{b.match_type}</Badge></TableCell>
                    <TableCell><Badge variant={statusVariant(b.status)}>{b.status}</Badge></TableCell>
                    <TableCell className="text-right font-mono">{formatINR(b.total_invoice_value)}</TableCell>
                    <TableCell className="text-right font-mono">{b.variance_pct.toFixed(2)}%</TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Button size="sm" variant="outline" onClick={() => handleRunMatch(b.id)}>Run Match</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <NewBillDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        entityCode={entityCode}
        onCreated={() => setTick((t) => t + 1)}
      />
      <BillDetailDialog bill={detail} open={!!detail} onOpenChange={(v) => !v && setDetail(null)} />
    </div>
  );
}

// ----------------------------------------------------------------------------
// MatchReviewPanel
// ----------------------------------------------------------------------------

export function MatchReviewPanel(): JSX.Element {
  const { entityCode } = useEntityCode();
  const [tick, setTick] = useState(0);
  const list = useMemo(() => listMatchedWithVariance(entityCode), [entityCode, tick]);
  const [reviewBill, setReviewBill] = useState<BillPassingRecord | null>(null);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [mode, setMode] = useState<'approve' | 'reject'>('approve');

  // 3-c-3 placeholder fields (free text in 3-c-2 · 3-c-3 wires CC masters)
  const [modeOfPayment, setModeOfPayment] = useState('');
  const [termsOfPayment, setTermsOfPayment] = useState('');
  const [termsOfDelivery, setTermsOfDelivery] = useState('');
  const [narration, setNarration] = useState('');
  const [tnc, setTnc] = useState('');

  const reset = (): void => {
    setApprovalNotes(''); setRejectReason(''); setMode('approve');
    setModeOfPayment(''); setTermsOfPayment(''); setTermsOfDelivery('');
    setNarration(''); setTnc('');
  };

  const handleApprove = async (): Promise<void> => {
    if (!reviewBill) return;
    if (!approvalNotes.trim()) { toast.error('Approval notes required for variance override'); return; }
    try {
      const approved = await approveBill(reviewBill.id, approvalNotes, entityCode, MOCK_USER);
      // D-287: trigger FinCore PI auto-draft
      if (approved) {
        await draftPiFromBill(approved.id, entityCode, MOCK_USER);
      }
      toast.success('Bill approved · FCPI draft created');
      setReviewBill(null);
      reset();
      setTick((t) => t + 1);
    } catch (e) {
      toast.error(`Approve failed: ${(e as Error).message}`);
    }
  };

  const handleReject = async (): Promise<void> => {
    if (!reviewBill) return;
    if (!rejectReason.trim()) { toast.error('Rejection reason required'); return; }
    try {
      await rejectBill(reviewBill.id, rejectReason, entityCode, MOCK_USER);
      toast.success('Bill rejected');
      setReviewBill(null);
      reset();
      setTick((t) => t + 1);
    } catch (e) {
      toast.error(`Reject failed: ${(e as Error).message}`);
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Match Review</h1>
        <p className="text-sm text-muted-foreground">Bills with variance · approve with override or reject.</p>
      </div>
      <Card>
        <CardContent className="p-0">
          {list.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No variance bills awaiting review.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bill No</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>PO</TableHead>
                  <TableHead className="text-right">Variance ₹</TableHead>
                  <TableHead className="text-right">Variance %</TableHead>
                  <TableHead>Variance Lines</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((b) => {
                  const vCount = b.lines.filter((l) => l.match_status !== 'clean').length;
                  const severity = Math.abs(b.variance_pct) >= 5
                    ? 'destructive' : Math.abs(b.variance_pct) >= 2 ? 'secondary' : 'outline';
                  return (
                    <TableRow key={b.id}>
                      <TableCell className="font-mono">{b.bill_no}</TableCell>
                      <TableCell>{b.vendor_name}</TableCell>
                      <TableCell className="font-mono">{b.po_no}</TableCell>
                      <TableCell className="text-right font-mono">{formatINR(b.total_variance)}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={severity}>{b.variance_pct.toFixed(2)}%</Badge>
                      </TableCell>
                      <TableCell><span className="font-mono">{vCount}</span> / {b.lines.length}</TableCell>
                      <TableCell>
                        <Button size="sm" onClick={() => setReviewBill(b)}>Review</Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!reviewBill} onOpenChange={(v) => { if (!v) { setReviewBill(null); reset(); } }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review Bill {reviewBill?.bill_no}</DialogTitle>
          </DialogHeader>
          {reviewBill && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div><span className="text-muted-foreground">Vendor:</span> {reviewBill.vendor_name}</div>
                <div><span className="text-muted-foreground">PO:</span> <span className="font-mono">{reviewBill.po_no}</span></div>
                <div><span className="text-muted-foreground">Variance:</span> <span className="font-mono">{formatINR(reviewBill.total_variance)} ({reviewBill.variance_pct.toFixed(2)}%)</span></div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Match</TableHead>
                    <TableHead>Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reviewBill.lines.filter((l) => l.match_status !== 'clean').map((l) => {
                    const b = lineStatusBadge(l.match_status);
                    return (
                      <TableRow key={l.id}>
                        <TableCell>{l.item_name}</TableCell>
                        <TableCell><Badge variant={b.variant}>{b.label}</Badge></TableCell>
                        <TableCell className="text-xs text-muted-foreground">{l.variance_reason}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              <div className="border rounded-md p-3 space-y-3">
                <div className="text-sm font-semibold">3-c-3 Placeholder Fields (free text in 3-c-2 · masters in 3-c-3)</div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <Label>Mode of Payment</Label>
                    <Input value={modeOfPayment} onChange={(e) => setModeOfPayment(e.target.value)} placeholder="e.g. NEFT" className="h-8" />
                  </div>
                  <div>
                    <Label>Terms of Payment</Label>
                    <Input value={termsOfPayment} onChange={(e) => setTermsOfPayment(e.target.value)} placeholder="e.g. 30 days credit" className="h-8" />
                  </div>
                  <div>
                    <Label>Terms of Delivery</Label>
                    <Input value={termsOfDelivery} onChange={(e) => setTermsOfDelivery(e.target.value)} placeholder="e.g. FOR Destination" className="h-8" />
                  </div>
                  <div>
                    <Label>Narration</Label>
                    <Input value={narration} onChange={(e) => setNarration(e.target.value)} className="h-8" />
                  </div>
                </div>
                <div>
                  <Label>Terms &amp; Conditions</Label>
                  <Textarea value={tnc} onChange={(e) => setTnc(e.target.value)} rows={2} />
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant={mode === 'approve' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setMode('approve')}
                >Approve</Button>
                <Button
                  variant={mode === 'reject' ? 'destructive' : 'outline'}
                  size="sm"
                  onClick={() => setMode('reject')}
                >Reject</Button>
              </div>

              {mode === 'approve' ? (
                <div>
                  <Label>Approval Notes (required for variance override)</Label>
                  <Textarea
                    value={approvalNotes}
                    onChange={(e) => setApprovalNotes(e.target.value)}
                    rows={3}
                    placeholder="Reason for override · CFO approval ref · etc."
                  />
                </div>
              ) : (
                <div>
                  <Label>Rejection Reason</Label>
                  <Textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    rows={3}
                    placeholder="Vendor invoice does not match · etc."
                  />
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setReviewBill(null); reset(); }}>Cancel</Button>
            {mode === 'approve'
              ? <Button onClick={handleApprove}>Approve &amp; Draft FCPI</Button>
              : <Button variant="destructive" onClick={handleReject}>Reject</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ----------------------------------------------------------------------------
// ApprovedForFcpiPanel
// ----------------------------------------------------------------------------

export function ApprovedForFcpiPanel(): JSX.Element {
  const { entityCode } = useEntityCode();
  const list = useMemo(() => listApprovedForFcpi(entityCode), [entityCode]);
  const [detail, setDetail] = useState<BillPassingRecord | null>(null);

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Approved for FCPI</h1>
        <p className="text-sm text-muted-foreground">Approved bills · FinCore PI auto-draft inbox.</p>
      </div>
      <Card>
        <CardContent className="p-0">
          {list.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No approved bills yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bill No</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>PO</TableHead>
                  <TableHead>Approved</TableHead>
                  <TableHead className="text-right">Invoice ₹</TableHead>
                  <TableHead>FCPI</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((b) => (
                  <TableRow key={b.id} className="cursor-pointer" onClick={() => setDetail(b)}>
                    <TableCell className="font-mono">{b.bill_no}</TableCell>
                    <TableCell>{b.vendor_name}</TableCell>
                    <TableCell className="font-mono">{b.po_no}</TableCell>
                    <TableCell className="text-xs">{b.approved_at ? new Date(b.approved_at).toLocaleString('en-IN') : '—'}</TableCell>
                    <TableCell className="text-right font-mono">{formatINR(b.total_invoice_value)}</TableCell>
                    <TableCell className="font-mono text-xs">{b.fcpi_voucher_id ?? '—'}</TableCell>
                    <TableCell><Badge variant={statusVariant(b.status)}>{b.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <BillDetailDialog bill={detail} open={!!detail} onOpenChange={(v) => !v && setDetail(null)} />
    </div>
  );
}
