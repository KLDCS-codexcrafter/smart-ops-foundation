/**
 * @file        src/pages/vendor-portal/VendorInvoiceUpload.tsx
 * @purpose     Vendor invoice upload · A-c-Q8=C manual PO link · no OCR
 * @sprint      T-Phase-1.A-c.3-VendorPortal-KYC-Invoice-Messages-Performance
 * @decisions   D-272 · A-c-Q8=C · D-NEW-EC direct localStorage write
 * @[JWT]       N/A · Phase 2 POST /api/vendor/invoices
 */
import { useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import VendorPortalLayout from './VendorPortalLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileUp, Upload, CheckCircle, FileText, Bot, Clock } from 'lucide-react';
import { getVendorSession, recordVendorActivity } from '@/lib/vendor-portal-auth-engine';
import { listPurchaseOrders } from '@/lib/po-management-engine';
import { useT } from '@/lib/i18n-engine';

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
  status: 'pending_admin_review';
}

const vendorInvoicesKey = (entityCode: string): string => `vendor_invoices_${entityCode}`;

function loadInvoices(entityCode: string, vendorId: string): VendorInvoiceUploadRecord[] {
  try {
    const raw = localStorage.getItem(vendorInvoicesKey(entityCode));
    const all = raw ? (JSON.parse(raw) as VendorInvoiceUploadRecord[]) : [];
    return all.filter((i) => i.vendor_id === vendorId).sort((a, b) => b.uploaded_at.localeCompare(a.uploaded_at));
  } catch { return []; }
}

function saveInvoice(record: VendorInvoiceUploadRecord): void {
  try {
    const raw = localStorage.getItem(vendorInvoicesKey(record.entity_code));
    const all = raw ? (JSON.parse(raw) as VendorInvoiceUploadRecord[]) : [];
    all.push(record);
    localStorage.setItem(vendorInvoicesKey(record.entity_code), JSON.stringify(all));
  } catch { /* quota silent */ }
}

function formatINR(n: number): string {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n);
}

function formatDate(iso: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN');
}

export default function VendorInvoiceUpload(): JSX.Element {
  const session = getVendorSession();
  const t = useT();
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [linkedPoId, setLinkedPoId] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [invoiceAmount, setInvoiceAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [attachmentName, setAttachmentName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const eligiblePos = useMemo(() => {
    if (!session) return [];
    return listPurchaseOrders(session.entity_code).filter(
      (po) => po.vendor_id === session.vendor_id
    );
  }, [session]);

  const invoices = useMemo(() => {
    if (!session) return [];
    return loadInvoices(session.entity_code, session.vendor_id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, refreshCounter]);

  if (!session) return <Navigate to="/vendor-portal/login" replace />;

  const selectedPo = eligiblePos.find((po) => po.id === linkedPoId);
  const amountNum = parseFloat(invoiceAmount) || 0;
  const variance = selectedPo ? amountNum - selectedPo.total_after_tax : 0;
  const variancePct = selectedPo && selectedPo.total_after_tax > 0
    ? (variance / selectedPo.total_after_tax) * 100
    : 0;
  const hasVariance = Math.abs(variancePct) > 1;

  const canSubmit = !!linkedPoId && invoiceNo.trim().length > 0 && !!invoiceDate && amountNum > 0 && !submitting;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (file) setAttachmentName(file.name);
  };

  const handleSubmit = (): void => {
    if (!canSubmit || !selectedPo) {
      setError('All required fields must be filled');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const record: VendorInvoiceUploadRecord = {
        id: `vinv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        entity_code: session.entity_code,
        vendor_id: session.vendor_id,
        vendor_name: session.party_name,
        linked_po_id: selectedPo.id,
        linked_po_no: selectedPo.po_no,
        invoice_no: invoiceNo.trim(),
        invoice_date: invoiceDate,
        invoice_amount: amountNum,
        notes: notes.trim() || undefined,
        attachment_filename: attachmentName || undefined,
        uploaded_at: new Date().toISOString(),
        status: 'pending_admin_review',
      };
      saveInvoice(record);
      recordVendorActivity(session.vendor_id, session.entity_code, 'profile_view', 'profile', record.id, 'invoice_uploaded');
      setSuccess(true);
      setLinkedPoId('');
      setInvoiceNo('');
      setInvoiceDate('');
      setInvoiceAmount('');
      setNotes('');
      setAttachmentName('');
      setRefreshCounter((c) => c + 1);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <VendorPortalLayout>
      <div className="space-y-6 max-w-5xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileUp className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{t('vendor.invoice.title', 'Upload Invoice')}</h1>
              <p className="text-sm text-muted-foreground">
                {t('vendor.invoice.subtitle', 'Link to PO · enter invoice details · admin reviews')}
              </p>
            </div>
          </div>
          <Badge variant="outline" className="gap-1 text-[10px]">
            <Bot className="h-3 w-3" /> {t('vendor.saathi.invoice_reminder', 'Saathi · Invoice reminders · Phase 2')}
          </Badge>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">New Invoice</CardTitle>
            <CardDescription>Select a PO · enter invoice details · attach file (filename recorded · Phase 2 stores binary)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-xs">Link to Purchase Order</Label>
              <Select value={linkedPoId} onValueChange={setLinkedPoId}>
                <SelectTrigger>
                  <SelectValue placeholder={`Select PO (${eligiblePos.length} available)`} />
                </SelectTrigger>
                <SelectContent>
                  {eligiblePos.length === 0 ? (
                    <div className="px-3 py-4 text-sm text-muted-foreground">No POs available to link</div>
                  ) : (
                    eligiblePos.map((po) => (
                      <SelectItem key={po.id} value={po.id}>
                        {po.po_no} · {formatDate(po.po_date)} · ₹{formatINR(po.total_after_tax)}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {selectedPo && (
                <p className="text-[11px] text-muted-foreground mt-1">
                  PO total: ₹{formatINR(selectedPo.total_after_tax)} · {selectedPo.lines.length} line(s) · expected{' '}
                  {formatDate(selectedPo.expected_delivery_date)}
                </p>
              )}
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="invoice-no" className="text-xs">Invoice Number</Label>
                <Input id="invoice-no" value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} placeholder="INV-2026-001" />
              </div>
              <div>
                <Label htmlFor="invoice-date" className="text-xs">Invoice Date</Label>
                <Input id="invoice-date" type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="invoice-amount" className="text-xs">Invoice Amount (₹)</Label>
                <Input id="invoice-amount" type="number" value={invoiceAmount} onChange={(e) => setInvoiceAmount(e.target.value)} placeholder="0" />
              </div>
            </div>

            {selectedPo && amountNum > 0 && hasVariance && (
              <Alert variant={Math.abs(variancePct) > 5 ? 'destructive' : 'default'}>
                <AlertDescription className="text-xs">
                  <strong>Variance: {variancePct >= 0 ? '+' : ''}{variancePct.toFixed(1)}%</strong> · invoice ₹{formatINR(amountNum)} vs
                  PO ₹{formatINR(selectedPo.total_after_tax)} · {Math.abs(variancePct) > 5 ? 'will require admin justification' : 'within tolerance · admin will verify'}
                </AlertDescription>
              </Alert>
            )}

            <div>
              <Label htmlFor="invoice-file" className="text-xs">Attach File (PDF / image · filename recorded only in Phase 1)</Label>
              <Input id="invoice-file" type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={handleFileChange} />
              {attachmentName && (
                <p className="text-[11px] text-muted-foreground mt-1">Selected: {attachmentName}</p>
              )}
            </div>

            <div>
              <Label htmlFor="invoice-notes" className="text-xs">Notes (optional)</Label>
              <Textarea id="invoice-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything procurement should know" rows={2} />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {success && (
              <Alert className="border-emerald-500/30 bg-emerald-500/5">
                <CheckCircle className="h-4 w-4 text-emerald-600" />
                <AlertDescription>{t('vendor.invoice.success', 'Invoice uploaded · pending admin review')}</AlertDescription>
              </Alert>
            )}

            <Button onClick={handleSubmit} disabled={!canSubmit} className="w-full gap-2">
              {submitting ? <Clock className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {t('vendor.invoice.btn_upload', 'Upload Invoice')}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              {t('vendor.invoice.history_title', 'Uploaded Invoices')} ({invoices.length})
            </CardTitle>
            <CardDescription>Your invoice submission history · most recent first</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {invoices.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No invoices uploaded yet
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice No</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Linked PO</TableHead>
                    <TableHead className="text-right">Amount ₹</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-mono text-sm">{inv.invoice_no}</TableCell>
                      <TableCell className="text-xs">{formatDate(inv.invoice_date)}</TableCell>
                      <TableCell className="font-mono text-xs">{inv.linked_po_no}</TableCell>
                      <TableCell className="text-right font-mono font-bold">₹{formatINR(inv.invoice_amount)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[9px] bg-amber-500/10 text-amber-700 border-amber-500/30">
                          Pending Review
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </VendorPortalLayout>
  );
}
