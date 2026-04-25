/**
 * InvoiceUploadWizard.tsx — Sprint 15c-1
 * 4-step CSV/Excel upload wizard. Uses xlsx library (already in deps).
 */

import { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Download, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import { logAudit } from '@/lib/card-audit-engine';
import {
  type TransporterInvoice, type TransporterInvoiceLine, type WorkflowMode,
  type MappableField, type InvoiceColumnMapping,
  MAPPABLE_FIELDS, transporterInvoicesKey, invoiceColumnMappingsKey,
} from '@/types/transporter-invoice';
import { parseInvoiceFile } from './InvoiceUploadWizard.helpers';

// Backward-compat re-export.
export { parseInvoiceFile } from './InvoiceUploadWizard.helpers';

interface LogisticLite { id: string; partyName: string; logisticType: string }

interface ParsedRow { [col: string]: string | number | null }

function nowISO() { return new Date().toISOString(); }
function ls<T>(k: string): T[] {
  try { const r = localStorage.getItem(k); return r ? (JSON.parse(r) as T[]) : []; }
  catch { return []; }
}

function autoSuggestMapping(headers: string[]): Record<string, string> {
  const m: Record<string, string> = {};
  for (const h of headers) {
    const norm = h.toLowerCase().replace(/[\s_#-]/g, '');
    const match: MappableField | undefined =
      norm.includes('lrno') || norm === 'lr' ? 'lr_no' :
      norm.includes('lrdate') ? 'lr_date' :
      norm.includes('weight') ? 'transporter_declared_weight_kg' :
      norm === 'rate' || norm.includes('ratepkg') ? 'transporter_declared_rate' :
      norm === 'amount' || norm.includes('basicfreight') ? 'transporter_declared_amount' :
      norm.includes('fuel') ? 'fuel_surcharge' :
      norm.includes('fov') ? 'fov' :
      norm.includes('statistical') || norm.includes('docket') ? 'statistical' :
      norm.includes('cod') ? 'cod' :
      norm.includes('demur') ? 'demurrage' :
      norm.includes('oda') ? 'oda' :
      norm.includes('gst') || norm.includes('tax') ? 'gst_amount' :
      norm.includes('total') || norm.includes('grand') ? 'total' :
      norm.includes('note') || norm.includes('remark') ? 'notes' :
      undefined;
    if (match) m[h] = match;
  }
  return m;
}

interface Props {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  logistics: LogisticLite[];
  onCreated: () => void;
}

export function InvoiceUploadWizard({ open, onOpenChange, logistics, onCreated }: Props) {
  const { entityCode, userId } = useCardEntitlement();
  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [logisticId, setLogisticId] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [saveMapping, setSaveMapping] = useState(true);
  const [invoiceNo, setInvoiceNo] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [periodFrom, setPeriodFrom] = useState('');
  const [periodTo, setPeriodTo] = useState('');
  const [workflowMode, setWorkflowMode] = useState<WorkflowMode>('flag_only');
  const [tolPct, setTolPct] = useState('');
  const [tolAmt, setTolAmt] = useState('');

  useEffect(() => {
    if (!open) {
      setStep(1); setFile(null); setLogisticId(''); setHeaders([]); setRows([]);
      setMapping({}); setSaveMapping(true);
      setInvoiceNo(''); setPeriodFrom(''); setPeriodTo('');
      setTolPct(''); setTolAmt(''); setWorkflowMode('flag_only');
    }
  }, [open]);

  // Pre-fill mapping from saved per transporter
  useEffect(() => {
    if (logisticId && headers.length > 0) {
      const savedAll = ls<InvoiceColumnMapping>(invoiceColumnMappingsKey(entityCode));
      const saved = savedAll.find(m => m.logistic_id === logisticId);
      if (saved) {
        setMapping(saved.mapping);
        return;
      }
      setMapping(autoSuggestMapping(headers));
    }
  }, [logisticId, headers, entityCode]);

  const handleFileChange = async (f: File) => {
    setFile(f);
    try {
      const buf = await f.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const arr = XLSX.utils.sheet_to_json<Record<string, string | number>>(sheet, { defval: '' });
      if (arr.length === 0) {
        toast.error('File is empty');
        return;
      }
      const hdr = Object.keys(arr[0]);
      setHeaders(hdr);
      setRows(arr as ParsedRow[]);
    } catch {
      toast.error('Could not parse file. Please use CSV or XLSX.');
    }
  };

  const downloadTemplate = () => {
    const headerRow = MAPPABLE_FIELDS.join(',');
    const sampleRow = MAPPABLE_FIELDS.map(f =>
      f === 'lr_no' ? 'LR123456' :
      f === 'lr_date' ? '2026-04-01' : '0').join(',');
    const blob = new Blob([`${headerRow}\n${sampleRow}`], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'transporter-invoice-template.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const parsed = useMemo(() => parseInvoiceFile(rows, mapping), [rows, mapping]);

  const handleCreate = () => {
    if (!invoiceNo.trim()) { toast.error('Enter invoice number'); return; }
    if (parsed.lines.length === 0) { toast.error('No valid lines parsed'); return; }
    const log = logistics.find(l => l.id === logisticId);
    const id = `inv-${Date.now()}`;
    const lines = parsed.lines.map((l, i) => ({ ...l, invoice_id: id, line_no: i + 1 }));
    const totalGst = lines.reduce((s, l) => s + l.gst_amount, 0);
    const grand = lines.reduce((s, l) => s + l.total, 0);
    const inv: TransporterInvoice = {
      id, entity_id: entityCode,
      invoice_no: invoiceNo.trim(), invoice_date: invoiceDate,
      logistic_id: logisticId, logistic_name: log?.partyName ?? 'Unknown',
      period_from: periodFrom || invoiceDate, period_to: periodTo || invoiceDate,
      lines,
      total_declared: grand - totalGst, total_gst: totalGst, grand_total: grand,
      workflow_mode: workflowMode,
      tolerance_pct: tolPct ? Number(tolPct) : null,
      tolerance_amount: tolAmt ? Number(tolAmt) * 100 : null,
      status: 'uploaded',
      uploaded_at: nowISO(), uploaded_by: userId,
      upload_source: file?.name.toLowerCase().endsWith('.csv') ? 'csv' : 'xlsx',
      original_filename: file?.name,
      created_at: nowISO(), updated_at: nowISO(),
    };
    const all = ls<TransporterInvoice>(transporterInvoicesKey(entityCode));
    all.push(inv);
    try {
      // [JWT] POST /api/dispatch/transporter-invoices
      localStorage.setItem(transporterInvoicesKey(entityCode), JSON.stringify(all));
    } catch { /* ignore */ }

    if (saveMapping) {
      const allMaps = ls<InvoiceColumnMapping>(invoiceColumnMappingsKey(entityCode));
      const next = allMaps.filter(m => m.logistic_id !== logisticId).concat({
        id: `icm-${Date.now()}`, logistic_id: logisticId,
        mapping, sample_filename: file?.name, saved_at: nowISO(),
      });
      try {
        // [JWT] POST /api/dispatch/invoice-mappings
        localStorage.setItem(invoiceColumnMappingsKey(entityCode), JSON.stringify(next));
      } catch { /* ignore */ }
    }

    logAudit({
      entityCode, userId, userName: userId,
      cardId: 'dispatch-hub', moduleId: 'dh-t-transporter-invoice',
      action: 'master_save', refType: 'transporter-invoice', refId: inv.id,
      refLabel: `Uploaded ${inv.invoice_no} (${lines.length} lines)`,
    });
    toast.success(`Invoice ${invoiceNo} created with ${lines.length} lines`);
    onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload Transporter Invoice — Step {step} of 4</DialogTitle>
          <DialogDescription>
            {step === 1 && 'Pick a transporter and the invoice file (CSV or Excel).'}
            {step === 2 && 'Map your columns to our invoice fields.'}
            {step === 3 && 'Preview parsed rows and validation warnings.'}
            {step === 4 && 'Set invoice metadata and create.'}
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Transporter</Label>
              <Select value={logisticId} onValueChange={setLogisticId}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  {logistics.map(l => (
                    <SelectItem key={l.id} value={l.id}>{l.partyName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Invoice file</Label>
              <Input type="file" accept=".csv,.xlsx,.xls" onChange={e => {
                const f = e.target.files?.[0]; if (f) void handleFileChange(f);
              }} />
              {file && <p className="text-xs text-muted-foreground mt-1">{file.name} · {headers.length} columns · {rows.length} rows</p>}
            </div>
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              <Download className="h-3.5 w-3.5 mr-1" /> Download template
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">Map each spreadsheet column to one of our invoice fields. Unmapped columns are ignored.</p>
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Spreadsheet Column</TableHead>
                    <TableHead>Sample</TableHead>
                    <TableHead>Map to field</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {headers.map(h => (
                    <TableRow key={h}>
                      <TableCell className="font-mono text-xs">{h}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{String(rows[0]?.[h] ?? '')}</TableCell>
                      <TableCell>
                        <Select value={mapping[h] ?? '__skip__'} onValueChange={(v) => {
                          setMapping(prev => {
                            const next = { ...prev };
                            if (v === '__skip__') delete next[h];
                            else next[h] = v;
                            return next;
                          });
                        }}>
                          <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__skip__">— skip —</SelectItem>
                            {MAPPABLE_FIELDS.map(f => (
                              <SelectItem key={f} value={f}>{f}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="saveMap" checked={saveMapping} onCheckedChange={(b) => setSaveMapping(!!b)} />
              <Label htmlFor="saveMap" className="text-xs">Save this mapping for future uploads from this transporter</Label>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <div className="flex gap-3 text-xs">
              <Badge variant="outline" className="bg-emerald-500/15 text-emerald-600">{parsed.lines.length} valid rows</Badge>
              <Badge variant="outline" className="bg-amber-500/15 text-amber-600">{parsed.warnings.length} warnings</Badge>
            </div>
            {parsed.warnings.length > 0 && (
              <div className="border rounded-lg p-2 max-h-32 overflow-y-auto bg-amber-500/5">
                {parsed.warnings.slice(0, 30).map((w, i) => (
                  <p key={`w-${i}`} className="text-xs text-amber-700">{w}</p>
                ))}
              </div>
            )}
            <div className="border rounded-lg overflow-x-auto max-h-80">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">LR</TableHead>
                    <TableHead className="text-xs">Date</TableHead>
                    <TableHead className="text-xs text-right">Wt</TableHead>
                    <TableHead className="text-xs text-right">Amount</TableHead>
                    <TableHead className="text-xs text-right">GST</TableHead>
                    <TableHead className="text-xs text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsed.lines.slice(0, 20).map(l => (
                    <TableRow key={l.id}>
                      <TableCell className="font-mono text-xs">{l.lr_no}</TableCell>
                      <TableCell className="text-xs">{l.lr_date ?? '—'}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{l.transporter_declared_weight_kg}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{l.transporter_declared_amount.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{l.gst_amount.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{l.total.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Invoice No</Label>
                <Input value={invoiceNo} onChange={e => setInvoiceNo(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Invoice Date</Label>
                <Input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Period From</Label>
                <Input type="date" value={periodFrom} onChange={e => setPeriodFrom(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Period To</Label>
                <Input type="date" value={periodTo} onChange={e => setPeriodTo(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Tolerance % (override)</Label>
                <Input type="number" value={tolPct} onChange={e => setTolPct(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Tolerance ₹ (override)</Label>
                <Input type="number" value={tolAmt} onChange={e => setTolAmt(e.target.value)} />
              </div>
            </div>
            <div>
              <Label className="text-xs">Workflow Mode</Label>
              <RadioGroup value={workflowMode} onValueChange={(v) => setWorkflowMode(v as WorkflowMode)} className="flex gap-4 mt-1">
                <div className="flex items-center gap-2"><RadioGroupItem value="flag_only" id="w-fo" /><Label htmlFor="w-fo">Flag only</Label></div>
                <div className="flex items-center gap-2"><RadioGroupItem value="auto_approve" id="w-aa" /><Label htmlFor="w-aa">Auto approve</Label></div>
                <div className="flex items-center gap-2"><RadioGroupItem value="dispute_ticket" id="w-dt" /><Label htmlFor="w-dt">Dispute ticket</Label></div>
              </RadioGroup>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          {step > 1 && <Button variant="outline" onClick={() => setStep(step - 1)}>Back</Button>}
          {step < 4 && (
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              disabled={
                (step === 1 && (!file || !logisticId)) ||
                (step === 2 && !Object.values(mapping).includes('lr_no'))
              }
              onClick={() => setStep(step + 1)}
            >
              Next
            </Button>
          )}
          {step === 4 && (
            <Button onClick={handleCreate} className="bg-blue-600 hover:bg-blue-700">
              <Upload className="h-4 w-4 mr-1" /> Create Invoice
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
