/**
 * MobileVendorInvoiceSubmitPage.tsx — Vendor submits invoice into the
 * existing 3-way-match intake. Writes a BillPassingRecord with status
 * 'pending_match' into billPassingKey — the SAME intake the desktop reads.
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, FileUp } from 'lucide-react';
import { toast } from 'sonner';
import type { MobileSession } from '../MobileRouter';
import { type PurchaseOrderRecord, purchaseOrdersKey } from '@/types/po';
import { type BillPassingRecord, billPassingKey } from '@/types/bill-passing';
import { ReportSendHeader } from '@/components/operix-core/report-framework/ReportSendHeader';

function readSession(): MobileSession | null {
  try { const raw = sessionStorage.getItem('opx_mobile_session'); return raw ? (JSON.parse(raw) as MobileSession) : null; } catch { return null; }
}
function loadList<T>(key: string): T[] { try { const raw = localStorage.getItem(key); return raw ? (JSON.parse(raw) as T[]) : []; } catch { return []; } }

export default function MobileVendorInvoiceSubmitPage(): JSX.Element {
  const navigate = useNavigate();
  const session = useMemo(() => readSession(), []);
  const [poId, setPoId] = useState<string | null>(null);
  const [invoiceNo, setInvoiceNo] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [invoiceValue, setInvoiceValue] = useState('');
  const [lastSubmitted, setLastSubmitted] = useState<BillPassingRecord | null>(null);

  const pos = useMemo<PurchaseOrderRecord[]>(() => {
    if (!session) return [];
    return loadList<PurchaseOrderRecord>(purchaseOrdersKey(session.entity_code))
      .filter(p => p.status !== 'cancelled' && p.status !== 'draft');
  }, [session]);

  function submit(): void {
    if (!session || !poId) { toast.error('Pick a PO'); return; }
    if (!invoiceNo.trim() || !invoiceDate || !invoiceValue) { toast.error('Invoice no, date, value required'); return; }
    const po = pos.find(p => p.id === poId);
    if (!po) return;
    const value = Number(invoiceValue);
    if (Number.isNaN(value) || value <= 0) { toast.error('Invalid value'); return; }
    const now = new Date().toISOString();
    const record: BillPassingRecord = {
      id: `bp_${Date.now()}`,
      bill_no: `BP-MOB-${Date.now()}`,
      bill_date: now.slice(0, 10),
      entity_id: session.entity_code,
      branch_id: po.branch_id,
      po_id: po.id, po_no: po.po_no,
      git_id: null,
      vendor_id: po.vendor_id, vendor_name: po.vendor_name,
      vendor_invoice_no: invoiceNo.trim(),
      vendor_invoice_date: invoiceDate,
      match_type: '3-way',
      qa_inspection_id: null,
      lines: [],
      total_invoice_value: value,
      total_po_value: po.total_after_tax,
      total_grn_value: 0,
      total_variance: value - po.total_after_tax,
      variance_pct: po.total_after_tax > 0 ? ((value - po.total_after_tax) / po.total_after_tax) * 100 : 0,
      tolerance_pct: 0,
      tolerance_amount: 0,
      approver_user_id: null,
      approval_notes: '',
      approved_at: null,
      fcpi_voucher_id: null,
      fcpi_drafted_at: null,
      mode_of_payment_id: null,
      terms_of_payment_id: null,
      terms_of_delivery_id: null,
      narration: 'Submitted via vendor mobile',
      terms_conditions: '',
      status: 'pending_match',
      notes: '',
      created_by: session.user_id || 'vendor-mobile',
      created_at: now,
      updated_at: now,
    };
    const key = billPassingKey(session.entity_code);
    const list = loadList<BillPassingRecord>(key);
    list.push(record);
    localStorage.setItem(key, JSON.stringify(list));
    setLastSubmitted(record);
    toast.success(`Invoice ${invoiceNo} sent to 3-way-match intake`);
    setPoId(null); setInvoiceNo(''); setInvoiceDate(''); setInvoiceValue('');
  }

  if (!session) return <div className="p-6 text-center text-sm text-muted-foreground">Session required</div>;

  return (
    <div className="p-4 max-w-md mx-auto space-y-3 pb-12">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4" /></Button>
        <h1 className="text-base font-semibold">Submit Invoice</h1>
      </div>
      <Card className="p-3 space-y-3">
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Pick PO</label>
          <select className="w-full border rounded-lg p-2 bg-background text-sm"
            value={poId ?? ''} onChange={e => setPoId(e.target.value || null)}>
            <option value="">—</option>
            {pos.map(p => <option key={p.id} value={p.id}>{p.po_no} · ₹{p.total_after_tax.toLocaleString('en-IN')}</option>)}
          </select>
        </div>
        <Input placeholder="Vendor invoice no" value={invoiceNo} onChange={e => setInvoiceNo(e.target.value)} />
        <Input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} />
        <Input type="number" inputMode="decimal" placeholder="Invoice value (₹)" value={invoiceValue} onChange={e => setInvoiceValue(e.target.value)} />
        <Button className="w-full" onClick={submit}><FileUp className="h-4 w-4 mr-1" />Submit to 3-way-match</Button>
      </Card>

      {lastSubmitted && (
        <Card className="p-3 space-y-2">
          <div className="text-xs font-semibold">Submission confirmation</div>
          <div className="flex justify-between text-xs"><span className="text-muted-foreground">Bill</span><span className="font-mono">{lastSubmitted.bill_no}</span></div>
          <div className="flex justify-between text-xs"><span className="text-muted-foreground">Status</span><Badge variant="outline" className="text-[9px]">{lastSubmitted.status}</Badge></div>
          <ReportSendHeader title={`Invoice ${lastSubmitted.vendor_invoice_no}`}
            rows={[{ invoice_no: lastSubmitted.vendor_invoice_no, value: lastSubmitted.total_invoice_value, status: lastSubmitted.status }]} />
        </Card>
      )}
    </div>
  );
}
