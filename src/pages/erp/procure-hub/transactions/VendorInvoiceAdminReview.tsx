/**
 * @file        src/pages/erp/procure-hub/transactions/VendorInvoiceAdminReview.tsx
 * @purpose     Sprint B.1 · admin inbox for vendor-uploaded invoices (D-NEW-EC vendor portal A-c.3 ·
 *              vendor_invoices_<entity> localStorage) · 3-way match enforcement gate per B-Q5=B
 *              configurable threshold · approve / reject with reason · variance review per B-Q6=C
 *              both entry points (this is the global inbox · per-PO drill is via PoListPanel detail
 *              in Sprint B.2)
 * @who         Internal procurement / accounts admin
 * @when        2026-05-19 (Sprint B.1)
 * @sprint      T-Phase-1.B-1-P2P-Workflow-Closure
 * @iso         ISO 25010 Functional Suitability · Reliability (3-way match enforcement)
 * @whom        Audit Owner
 * @decisions   D-NEW-EN PI admin review pattern · type re-declared locally (vendor portal page
 *              0-diff per B-Q11=A) · status union expanded admin-side ·
 *              D-NEW-EO 3-way match enforcement gate · tolerance from pi-tolerance-helper ·
 *              D-NEW-EP Saathi placeholder for AI variance explanation Phase 2 ·
 *              D-NEW-EQ pi-tolerance-helper consumption (not freight-match-engine · semantic
 *              correctness · D-NEW-DX 7th sprint catch)
 * @disciplines FR-30 · FR-50 · FR-58
 * @reuses      po-management-engine.getPurchaseOrder · pi-tolerance-helper.resolveInvoiceTolerance ·
 *              pi-tolerance-helper.classifyPiVariance · grn-po-linkage-engine.getLinksForPo (for GRN context)
 * @[JWT]       Phase 2: POST /api/vendor-invoices/:id/approve · POST /api/vendor-invoices/:id/reject ·
 *              real bill-passing record creation server-side
 *
 * Status union (admin-extended locally · vendor portal writes 'pending_admin_review' only):
 *   'pending_admin_review' | 'approved' | 'rejected'
 *
 * Per B-Q11=A · vendor-portal/VendorInvoiceUpload.tsx 0-diff. Admin reads same localStorage key.
 */
import { useMemo, useState } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileCheck, AlertTriangle, CheckCircle2, XCircle, Lightbulb } from 'lucide-react';
import { toast } from 'sonner';
import { useEntityCode } from '@/hooks/useEntityCode';
import { getPurchaseOrder } from '@/lib/po-management-engine';
import {
  resolveInvoiceTolerance, classifyPiVariance,
  type PiVarianceClassification,
} from '@/lib/pi-tolerance-helper';
import { getLinksForPo } from '@/lib/grn-po-linkage-engine';
import { publishProcurementPulse } from '@/lib/procurement-pulse-stub';
import { ProcurementLineageBreadcrumb } from '@/components/procurement/ProcurementLineageBreadcrumb';

// Status union ADMIN-EXTENDED · vendor portal writes only 'pending_admin_review' (D-NEW-EC)
type VendorInvoiceStatus = 'pending_admin_review' | 'approved' | 'rejected';

/** LOCAL re-declaration of vendor portal type (B-Q11=A · vendor portal 0-diff) */
interface VendorInvoiceUploadRecord {
  id: string;
  entity_code: string;
  vendor_id: string;
  vendor_name: string;
  linked_po_id: string;
  linked_po_no: string;
  invoice_no: string;
  invoice_date: string;
  invoice_amount: number;
  notes?: string;
  attachment_filename?: string;
  uploaded_at: string;
  status: VendorInvoiceStatus;
  /** Admin-side extensions · added on approve/reject · vendor portal ignores */
  reviewed_at?: string;
  reviewed_by_user_id?: string;
  rejection_reason?: string;
  variance_pct?: number;
  match_classification?: PiVarianceClassification;
}

const vendorInvoicesKey = (entityCode: string): string => `vendor_invoices_${entityCode}`;

function loadAllInvoices(entityCode: string): VendorInvoiceUploadRecord[] {
  try {
    const raw = localStorage.getItem(vendorInvoicesKey(entityCode));
    return raw ? (JSON.parse(raw) as VendorInvoiceUploadRecord[]) : [];
  } catch { return []; }
}

function saveAllInvoices(entityCode: string, list: VendorInvoiceUploadRecord[]): void {
  try {
    localStorage.setItem(vendorInvoicesKey(entityCode), JSON.stringify(list));
  } catch { toast.error('Could not save · storage quota'); }
}

interface InvoiceReviewContext {
  po_amount: number;
  invoice_amount: number;
  variance: number;
  variance_pct: number;
  tolerance_pct: number;
  classification: PiVarianceClassification;
  grn_count: number;
}

function buildReviewContext(
  inv: VendorInvoiceUploadRecord,
  entityCode: string,
): InvoiceReviewContext | null {
  const po = getPurchaseOrder(inv.linked_po_id, entityCode);
  if (!po) return null;
  const poAmount = po.total_after_tax;
  const variance = inv.invoice_amount - poAmount;
  const variancePct = poAmount > 0 ? (Math.abs(variance) / poAmount) * 100 : 0;
  const tolerance = resolveInvoiceTolerance(entityCode);
  const classification = classifyPiVariance(variancePct, tolerance.pct);
  const grnLinks = getLinksForPo(po.id, entityCode);
  return {
    po_amount: poAmount,
    invoice_amount: inv.invoice_amount,
    variance,
    variance_pct: variancePct,
    tolerance_pct: tolerance.pct,
    classification,
    grn_count: grnLinks.length,
  };
}

const inr = (n: number): string =>
  `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function VendorInvoiceAdminReviewPanel(): JSX.Element {
  const { entityCode } = useEntityCode();
  const [invoices, setInvoices] = useState<VendorInvoiceUploadRecord[]>(() =>
    loadAllInvoices(entityCode),
  );
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [selected, setSelected] = useState<VendorInvoiceUploadRecord | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');
  const [showReject, setShowReject] = useState(false);

  const refresh = (): void => setInvoices(loadAllInvoices(entityCode));

  const counts = useMemo(() => {
    const c = { pending: 0, approved: 0, rejected: 0, all: invoices.length };
    for (const i of invoices) {
      if (i.status === 'pending_admin_review') c.pending += 1;
      else if (i.status === 'approved') c.approved += 1;
      else if (i.status === 'rejected') c.rejected += 1;
    }
    return c;
  }, [invoices]);

  const filtered = useMemo(() => {
    if (activeTab === 'all') return invoices;
    const targetStatus: VendorInvoiceStatus = activeTab === 'pending'
      ? 'pending_admin_review' : activeTab;
    return invoices.filter((i) => i.status === targetStatus);
  }, [invoices, activeTab]);

  const selectedContext = useMemo(
    () => (selected ? buildReviewContext(selected, entityCode) : null),
    [selected, entityCode],
  );

  const handleApprove = (): void => {
    if (!selected || !selectedContext) return;
    if (selectedContext.classification === 'breach') {
      toast.error(`Cannot approve · variance ${selectedContext.variance_pct.toFixed(1)}% breaches tolerance ${selectedContext.tolerance_pct}% · reject or request vendor correction`);
      // Sprint B.2 · publish breach event (D-NEW-ET)
      publishProcurementPulse({
        severity: 'critical',
        message: `Vendor invoice ${selected.invoice_no} variance ${selectedContext.variance_pct.toFixed(1)}% breaches tolerance · admin review queue blocked`,
      });
      return;
    }
    const list = loadAllInvoices(entityCode);
    const idx = list.findIndex((i) => i.id === selected.id);
    if (idx < 0) { toast.error('Invoice not found'); return; }
    list[idx] = {
      ...list[idx],
      status: 'approved',
      reviewed_at: new Date().toISOString(),
      reviewed_by_user_id: 'mock-user',
      variance_pct: selectedContext.variance_pct,
      match_classification: selectedContext.classification,
    };
    saveAllInvoices(entityCode, list);
    refresh();
    setSelected(null);
    toast.success(`Invoice ${selected.invoice_no} approved`);
  };

  const handleReject = (): void => {
    if (!selected) return;
    if (!rejectReason.trim()) { toast.error('Rejection reason required'); return; }
    const list = loadAllInvoices(entityCode);
    const idx = list.findIndex((i) => i.id === selected.id);
    if (idx < 0) { toast.error('Invoice not found'); return; }
    list[idx] = {
      ...list[idx],
      status: 'rejected',
      reviewed_at: new Date().toISOString(),
      reviewed_by_user_id: 'mock-user',
      rejection_reason: rejectReason.trim(),
    };
    saveAllInvoices(entityCode, list);
    refresh();
    setShowReject(false);
    setRejectReason('');
    setSelected(null);
    toast.success(`Invoice ${selected.invoice_no} rejected`);
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Vendor Invoice Admin Review</h1>
        <Badge variant="outline" className="gap-1 text-xs">
          <FileCheck className="h-3 w-3 text-emerald-600" />
          {counts.pending} pending · {counts.approved} approved
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList>
          <TabsTrigger value="pending">Pending ({counts.pending})</TabsTrigger>
          <TabsTrigger value="approved">Approved ({counts.approved})</TabsTrigger>
          <TabsTrigger value="rejected">Rejected ({counts.rejected})</TabsTrigger>
          <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardContent className="pt-6">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">No invoices in this status.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice No</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>PO</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-mono text-xs">{inv.invoice_no}</TableCell>
                    <TableCell>{inv.vendor_name}</TableCell>
                    <TableCell className="font-mono text-xs">{inv.linked_po_no}</TableCell>
                    <TableCell className="text-right font-mono">{inr(inv.invoice_amount)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(inv.uploaded_at).toLocaleDateString('en-IN')}
                    </TableCell>
                    <TableCell>
                      {inv.status === 'pending_admin_review' && (
                        <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-700 border-amber-500/30">Pending</Badge>
                      )}
                      {inv.status === 'approved' && (
                        <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-700 border-emerald-500/30">Approved</Badge>
                      )}
                      {inv.status === 'rejected' && (
                        <Badge variant="outline" className="text-[10px] bg-red-500/10 text-red-700 border-red-500/30">Rejected</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => setSelected(inv)}>Review</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Review Dialog · 3-way match enforcement per B-Q5=B · D-NEW-EO */}
      <Dialog open={selected !== null} onOpenChange={(o) => { if (!o) setSelected(null); }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Review Invoice · {selected?.invoice_no}</DialogTitle>
            <DialogDescription>
              Vendor · {selected?.vendor_name} · PO · {selected?.linked_po_no}
            </DialogDescription>
          </DialogHeader>

          {selectedContext && selected && (
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">3-Way Match Status</CardTitle>
                  <CardDescription className="text-xs">
                    Tolerance · {selectedContext.tolerance_pct.toFixed(1)}% · {selectedContext.grn_count} GRN(s) linked to PO
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">PO Amount</p>
                      <p className="font-mono font-medium">{inr(selectedContext.po_amount)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Invoice Amount</p>
                      <p className="font-mono font-medium">{inr(selectedContext.invoice_amount)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Variance</p>
                      <p className={`font-mono font-medium ${
                        selectedContext.classification === 'breach' ? 'text-red-700' :
                        selectedContext.classification === 'variance' ? 'text-amber-700' : 'text-emerald-700'
                      }`}>
                        {selectedContext.variance >= 0 ? '+' : ''}{inr(selectedContext.variance)} ({selectedContext.variance_pct.toFixed(2)}%)
                      </p>
                    </div>
                  </div>

                  {selectedContext.classification === 'within' && (
                    <Alert className="border-emerald-500/30 bg-emerald-500/5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <AlertDescription className="text-xs">
                        Within tolerance · safe to approve
                      </AlertDescription>
                    </Alert>
                  )}
                  {selectedContext.classification === 'variance' && (
                    <Alert className="border-amber-500/30 bg-amber-500/5">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      <AlertDescription className="text-xs">
                        Variance detected ({selectedContext.variance_pct.toFixed(1)}%) · review before approving · may indicate rounding or partial delivery
                      </AlertDescription>
                    </Alert>
                  )}
                  {selectedContext.classification === 'breach' && (
                    <Alert variant="destructive" className="border-red-500/30 bg-red-500/5">
                      <XCircle className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        Variance {selectedContext.variance_pct.toFixed(1)}% breaches tolerance ({selectedContext.tolerance_pct}%) ·
                        approve BLOCKED · reject or request vendor correction
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="rounded border border-blue-500/30 bg-blue-500/5 p-2 mt-2">
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Lightbulb className="h-3 w-3 text-blue-600" />
                      Saathi · Phase 2: AI variance explanation · auto-suggest acceptable reasons
                    </p>
                  </div>
                </CardContent>
              </Card>

              {selected.notes && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Vendor Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs">{selected.notes}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)}>Close</Button>
            <Button variant="destructive" onClick={() => setShowReject(true)} disabled={selected?.status !== 'pending_admin_review'}>
              Reject
            </Button>
            <Button
              onClick={handleApprove}
              disabled={selected?.status !== 'pending_admin_review' || !selectedContext || selectedContext.classification === 'breach'}
            >
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject reason dialog */}
      <Dialog open={showReject} onOpenChange={setShowReject}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Invoice · {selected?.invoice_no}</DialogTitle>
            <DialogDescription>Provide a reason · vendor will see this on their portal.</DialogDescription>
          </DialogHeader>
          <Textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="e.g. PO rate mismatch · GST mismatch · qty discrepancy"
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowReject(false); setRejectReason(''); }}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject} disabled={!rejectReason.trim()}>Confirm Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
