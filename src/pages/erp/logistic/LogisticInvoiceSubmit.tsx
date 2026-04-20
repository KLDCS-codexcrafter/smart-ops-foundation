/**
 * LogisticInvoiceSubmit.tsx — Transporter submits invoice line-by-line.
 * Sprint 15c-2. Gold accent. Writes to erp_transporter_invoices_{entity}
 * with upload_source='portal' so manufacturer's TransporterInvoiceInbox picks it up.
 * [JWT] POST /api/logistic/invoices
 */
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogisticLayout } from '@/features/logistic/LogisticLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, Upload } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { getLogisticSession, recordLogisticActivity } from '@/lib/logistic-auth-engine';
import {
  transporterInvoicesKey,
  type TransporterInvoice, type TransporterInvoiceLine,
} from '@/types/transporter-invoice';
import {
  lrAcceptancesKey, type LRAcceptance,
} from '@/types/logistic-portal';

interface LineDraft {
  id: string;
  lr_no: string;
  lr_date: string;
  weight: number;
  rate: number;
  amount: number;
  fuel: number;
  fov: number;
  stat: number;
  cod: number;
  demurrage: number;
  oda: number;
  gst: number;
  total: number;
}

const blankLine = (): LineDraft => ({
  id: crypto.randomUUID(),
  lr_no: '', lr_date: '',
  weight: 0, rate: 0, amount: 0,
  fuel: 0, fov: 0, stat: 0, cod: 0, demurrage: 0, oda: 0, gst: 0, total: 0,
});

export default function LogisticInvoiceSubmit() {
  const session = getLogisticSession();
  const navigate = useNavigate();

  const [invoiceNo, setInvoiceNo] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [periodFrom, setPeriodFrom] = useState('');
  const [periodTo, setPeriodTo] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<LineDraft[]>([blankLine()]);

  const totals = useMemo(() => {
    const declared = lines.reduce((s, l) => s + l.amount + l.fuel + l.fov + l.stat + l.cod + l.demurrage + l.oda, 0);
    const gst = lines.reduce((s, l) => s + l.gst, 0);
    const grand = lines.reduce((s, l) => s + l.total, 0);
    return { declared, gst, grand };
  }, [lines]);

  if (!session) return <LogisticLayout><div /></LogisticLayout>;

  const updateLine = (id: string, field: keyof LineDraft, val: string | number) => {
    setLines(ls => ls.map(l => l.id === id ? { ...l, [field]: val } : l));
  };

  const addLine = () => setLines(ls => [...ls, blankLine()]);
  const removeLine = (id: string) => setLines(ls => ls.length > 1 ? ls.filter(l => l.id !== id) : ls);

  const loadAcceptedLRs = () => {
    try {
      const all: LRAcceptance[] = JSON.parse(localStorage.getItem(lrAcceptancesKey(session.entity_code)) ?? '[]');
      const accepted = all.filter(a => a.logistic_id === session.logistic_id && a.status === 'accepted');
      if (accepted.length === 0) { toast.info('No accepted LRs available to invoice'); return; }
      const newLines: LineDraft[] = accepted.map(a => ({
        ...blankLine(),
        lr_no: a.lr_no ?? a.dln_voucher_no,
        lr_date: a.lr_date ?? '',
      }));
      setLines(newLines);
      toast.success(`Loaded ${accepted.length} accepted LRs`);
    } catch { toast.error('Failed to load LRs'); }
  };

  const submit = () => {
    if (!invoiceNo.trim()) return toast.error('Invoice no is required');
    if (lines.length === 0) return toast.error('Add at least one line');
    const blanks = lines.filter(l => !l.lr_no.trim());
    if (blanks.length > 0) return toast.error('Every line needs an LR no');
    const seen = new Set<string>();
    for (const l of lines) {
      if (seen.has(l.lr_no)) return toast.error(`Duplicate LR: ${l.lr_no}`);
      seen.add(l.lr_no);
    }

    const now = new Date().toISOString();
    const invoiceId = `tinv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    const invLines: TransporterInvoiceLine[] = lines.map((l, i) => ({
      id: `tinvl-${invoiceId}-${i}`,
      invoice_id: invoiceId,
      line_no: i + 1,
      lr_no: l.lr_no.trim(),
      lr_date: l.lr_date || null,
      transporter_declared_weight_kg: l.weight,
      transporter_declared_rate: l.rate,
      transporter_declared_amount: l.amount,
      fuel_surcharge: l.fuel, fov: l.fov, statistical: l.stat,
      cod: l.cod, demurrage: l.demurrage, oda: l.oda,
      gst_amount: l.gst, total: l.total,
    }));

    const inv: TransporterInvoice = {
      id: invoiceId,
      entity_id: session.entity_code,
      invoice_no: invoiceNo.trim(),
      invoice_date: invoiceDate,
      logistic_id: session.logistic_id,
      logistic_name: session.party_name,
      period_from: periodFrom, period_to: periodTo,
      lines: invLines,
      total_declared: totals.declared,
      total_gst: totals.gst,
      grand_total: totals.grand,
      workflow_mode: 'flag_only',
      status: 'uploaded',
      uploaded_at: now,
      uploaded_by: session.party_name,
      upload_source: 'portal',
      notes,
      created_at: now,
      updated_at: now,
    };

    try {
      // [JWT] POST /api/dispatch/transporter-invoices
      const all: TransporterInvoice[] = JSON.parse(
        localStorage.getItem(transporterInvoicesKey(session.entity_code)) ?? '[]',
      );
      all.push(inv);
      localStorage.setItem(transporterInvoicesKey(session.entity_code), JSON.stringify(all));

      // Update LRAcceptance status to invoiced
      const allLRs: LRAcceptance[] = JSON.parse(
        localStorage.getItem(lrAcceptancesKey(session.entity_code)) ?? '[]',
      );
      const lrSet = new Set(invLines.map(l => l.lr_no));
      const updatedLRs = allLRs.map(a =>
        (a.logistic_id === session.logistic_id && (lrSet.has(a.lr_no ?? '') || lrSet.has(a.dln_voucher_no)))
          ? { ...a, status: 'invoiced' as const, updated_at: now }
          : a,
      );
      localStorage.setItem(lrAcceptancesKey(session.entity_code), JSON.stringify(updatedLRs));

      recordLogisticActivity(session.logistic_id, session.entity_code, 'invoice_submit', {
        ref_type: 'invoice', ref_id: invoiceId, ref_label: inv.invoice_no,
      });
      toast.success('Invoice submitted for review');
      navigate('/erp/logistic/dashboard');
    } catch { toast.error('Failed to submit invoice'); }
  };

  return (
    <LogisticLayout title="Submit New Invoice" subtitle="Line-by-line entry">
      <div className="space-y-4">
        <div className="flex justify-end">
          <Button variant="outline" onClick={loadAcceptedLRs} className="gap-1.5">
            <Upload className="h-3.5 w-3.5" /> Load accepted LRs
          </Button>
        </div>

        <Card>
          <CardContent className="p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <Label className="text-xs">Invoice No *</Label>
              <Input value={invoiceNo} onChange={e => setInvoiceNo(e.target.value)} className="font-mono text-xs" />
            </div>
            <div>
              <Label className="text-xs">Invoice Date</Label>
              <Input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} className="text-xs" />
            </div>
            <div>
              <Label className="text-xs">Period From</Label>
              <Input type="date" value={periodFrom} onChange={e => setPeriodFrom(e.target.value)} className="text-xs" />
            </div>
            <div>
              <Label className="text-xs">Period To</Label>
              <Input type="date" value={periodTo} onChange={e => setPeriodTo(e.target.value)} className="text-xs" />
            </div>
            <div className="md:col-span-4">
              <Label className="text-xs">Notes</Label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} className="text-xs" rows={2} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-2 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[10px]">LR No</TableHead>
                  <TableHead className="text-[10px]">LR Date</TableHead>
                  <TableHead className="text-[10px]">Weight</TableHead>
                  <TableHead className="text-[10px]">Rate</TableHead>
                  <TableHead className="text-[10px]">Amount</TableHead>
                  <TableHead className="text-[10px]">Fuel</TableHead>
                  <TableHead className="text-[10px]">FOV</TableHead>
                  <TableHead className="text-[10px]">Stat</TableHead>
                  <TableHead className="text-[10px]">COD</TableHead>
                  <TableHead className="text-[10px]">Dem</TableHead>
                  <TableHead className="text-[10px]">ODA</TableHead>
                  <TableHead className="text-[10px]">GST</TableHead>
                  <TableHead className="text-[10px]">Total</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map(l => (
                  <TableRow key={l.id}>
                    <TableCell><Input value={l.lr_no} onChange={e => updateLine(l.id, 'lr_no', e.target.value)} className="h-7 text-xs font-mono w-24" /></TableCell>
                    <TableCell><Input type="date" value={l.lr_date} onChange={e => updateLine(l.id, 'lr_date', e.target.value)} className="h-7 text-xs w-32" /></TableCell>
                    {(['weight','rate','amount','fuel','fov','stat','cod','demurrage','oda','gst','total'] as const).map(field => (
                      <TableCell key={field}>
                        <Input
                          type="number"
                          value={l[field] || ''}
                          onChange={e => updateLine(l.id, field, parseFloat(e.target.value) || 0)}
                          className="h-7 text-xs font-mono w-20"
                        />
                      </TableCell>
                    ))}
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => removeLine(l.id)} className="h-7 w-7 p-0">
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={addLine} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Add Row
          </Button>
          <div className="flex gap-6 text-xs font-mono">
            <span>Declared: ₹{totals.declared.toLocaleString('en-IN')}</span>
            <span>GST: ₹{totals.gst.toLocaleString('en-IN')}</span>
            <span className="font-bold">Grand Total: ₹{totals.grand.toLocaleString('en-IN')}</span>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => navigate('/erp/logistic/dashboard')}>Cancel</Button>
          <Button onClick={submit} style={{ background: 'hsl(48 96% 53%)', color: 'hsl(222 47% 11%)' }} className="hover:opacity-90">
            Submit Invoice
          </Button>
        </div>
      </div>
    </LogisticLayout>
  );
}
