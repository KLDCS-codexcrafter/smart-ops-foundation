/**
 * PDFInvoiceUpload.tsx — Sprint 15c-3
 * MODULE ID: dh-t-pdf-invoice-upload
 * Digital PDF invoice extractor with 3-step flow: Upload → Review → Finalize.
 * [JWT] POST /api/dispatch/transporter-invoices (upload_source='pdf')
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { FileUp, AlertTriangle, CheckCircle2, X, Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import {
  extractInvoiceFromPDF, type ExtractionResult, type ExtractedInvoiceLine,
} from '@/lib/pdf-invoice-extractor';
import {
  type TransporterInvoice, type TransporterInvoiceLine,
  type WorkflowMode, transporterInvoicesKey,
} from '@/types/transporter-invoice';

const MAX_BYTES = 5 * 1024 * 1024; // 5MB

interface LogisticOption { id: string; partyName: string; partyCode: string; }

function loadLogistics(): LogisticOption[] {
  try {
    // [JWT] GET /api/masters/logistics
    const r = localStorage.getItem('erp_group_logistic_master');
    if (!r) return [];
    const arr = JSON.parse(r) as Array<{ id: string; partyName: string; partyCode: string; status?: string }>;
    return arr.filter(l => l.status !== 'inactive').map(l => ({
      id: l.id, partyName: l.partyName, partyCode: l.partyCode,
    }));
  } catch { return []; }
}

function ls<T>(k: string): T[] {
  try { const r = localStorage.getItem(k); return r ? (JSON.parse(r) as T[]) : []; }
  catch { return []; }
}

function fmtINR(n: number) {
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

interface ReviewedLine extends ExtractedInvoiceLine {
  reviewed: boolean;
  removed: boolean;
  edits: { lr_no?: string; lr_date?: string; weight?: number; total?: number };
}

export function PDFInvoiceUploadPanel() {
  const { entityCode, userId } = useCardEntitlement();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [logistics, setLogistics] = useState<LogisticOption[]>([]);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [file, setFile] = useState<File | null>(null);
  const [logisticId, setLogisticId] = useState<string>('');
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extracted, setExtracted] = useState<ExtractionResult | null>(null);
  const [reviewedLines, setReviewedLines] = useState<ReviewedLine[]>([]);

  // Step 3 — invoice meta
  const [invoiceNo, setInvoiceNo] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [periodFrom, setPeriodFrom] = useState(() => {
    const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10);
  });
  const [periodTo, setPeriodTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [workflowMode, setWorkflowMode] = useState<WorkflowMode>('flag_only');

  useEffect(() => { setLogistics(loadLogistics()); }, []);

  const reset = useCallback(() => {
    setStep(1); setFile(null); setLogisticId(''); setError(null);
    setExtracted(null); setReviewedLines([]); setInvoiceNo('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const handleFile = useCallback((f: File) => {
    setError(null);
    if (f.type !== 'application/pdf') {
      setError('Only PDF files are supported.');
      return;
    }
    if (f.size > MAX_BYTES) {
      setError('PDF exceeds 5MB limit.');
      return;
    }
    setFile(f);
  }, []);

  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  const runExtraction = useCallback(async () => {
    if (!file || !logisticId) {
      toast.error('Select a transporter and PDF first.');
      return;
    }
    setExtracting(true); setError(null);
    try {
      const buf = await file.arrayBuffer();
      const result = await extractInvoiceFromPDF(buf);
      if (result.ok === false) {
        switch (result.reason) {
          case 'scanned_pdf_not_supported':
            setError('This PDF appears to be scanned (no text layer). Use the CSV upload or manual entry option instead. Scanned-PDF OCR is coming soon.');
            break;
          case 'empty_pdf': setError('PDF contains no pages.'); break;
          case 'parse_error': setError(`Could not read PDF. Error: ${result.error}`); break;
          case 'not_a_pdf': setError('File is not a valid PDF.'); break;
        }
        return;
      }
      setExtracted(result);
      setReviewedLines(result.lines.map(l => ({
        ...l, reviewed: l.overall_confidence >= 80, removed: false, edits: {},
      })));
      // Pre-fill invoice meta from header
      const invH = result.header.invoice_no?.value;
      if (invH) setInvoiceNo(String(invH));
      const dateH = result.header.invoice_date?.value;
      if (dateH) setInvoiceDate(String(dateH));
      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setExtracting(false);
    }
  }, [file, logisticId]);

  const updateLine = (idx: number, patch: Partial<ReviewedLine>) => {
    setReviewedLines(prev => prev.map((l, i) => i === idx ? { ...l, ...patch } : l));
  };

  const updateLineEdit = (idx: number, edit: Partial<ReviewedLine['edits']>) => {
    setReviewedLines(prev => prev.map((l, i) =>
      i === idx ? { ...l, edits: { ...l.edits, ...edit }, reviewed: true } : l));
  };

  const addManualLine = () => {
    const nextNo = (reviewedLines.length === 0
      ? 0 : Math.max(...reviewedLines.map(l => l.line_no))) + 1;
    setReviewedLines(prev => [...prev, {
      line_no: nextNo,
      fields: [],
      overall_confidence: 100,
      reviewed: true,
      removed: false,
      edits: { lr_no: '', total: 0 },
    }]);
  };

  const activeLines = reviewedLines.filter(l => !l.removed);
  const highConf = activeLines.filter(l => l.overall_confidence >= 80).length;
  const needReview = activeLines.filter(l =>
    l.overall_confidence < 60 && !l.reviewed).length;

  const canFinalize = activeLines.length > 0 && needReview === 0
    && invoiceNo.trim().length > 0 && logisticId !== '';

  const getLineValue = (l: ReviewedLine, field: 'lr_no' | 'lr_date' | 'weight' | 'total'): string | number => {
    if (l.edits[field] !== undefined) return l.edits[field] as string | number;
    const f = l.fields.find(x => {
      if (field === 'lr_no') return x.field === 'lr_no';
      if (field === 'lr_date') return x.field === 'lr_date';
      if (field === 'weight') return x.field === 'transporter_declared_weight_kg';
      if (field === 'total') return x.field === 'total';
      return false;
    });
    return f?.value ?? (field === 'weight' || field === 'total' ? 0 : '');
  };

  const submitInvoice = () => {
    if (!canFinalize) return;
    const logistic = logistics.find(l => l.id === logisticId);
    if (!logistic) {
      toast.error('Selected transporter not found.');
      return;
    }
    const now = new Date().toISOString();
    const invoiceId = `inv-pdf-${Date.now()}`;
    const lines: TransporterInvoiceLine[] = activeLines.map((l, idx) => {
      const lrNo = String(getLineValue(l, 'lr_no') ?? '');
      const lrDate = String(getLineValue(l, 'lr_date') ?? '');
      const weight = Number(getLineValue(l, 'weight') ?? 0);
      const total = Number(getLineValue(l, 'total') ?? 0);
      return {
        id: `til-${invoiceId}-${idx}`,
        invoice_id: invoiceId,
        line_no: idx + 1,
        lr_no: lrNo,
        lr_date: lrDate || null,
        transporter_declared_weight_kg: weight,
        transporter_declared_rate: 0,
        transporter_declared_amount: total,
        fuel_surcharge: 0, fov: 0, statistical: 0, cod: 0, demurrage: 0, oda: 0,
        gst_amount: 0,
        total: total,
      };
    });
    const totalDeclared = lines.reduce((s, l) => s + l.transporter_declared_amount, 0);
    const grandTotal = lines.reduce((s, l) => s + l.total, 0);
    const inv: TransporterInvoice = {
      id: invoiceId,
      entity_id: entityCode,
      invoice_no: invoiceNo.trim(),
      invoice_date: invoiceDate,
      logistic_id: logisticId,
      logistic_name: logistic.partyName,
      period_from: periodFrom,
      period_to: periodTo,
      lines,
      total_declared: totalDeclared,
      total_gst: 0,
      grand_total: grandTotal,
      workflow_mode: workflowMode,
      tolerance_pct: null,
      tolerance_amount: null,
      status: 'uploaded',
      uploaded_at: now,
      uploaded_by: userId,
      upload_source: 'pdf',
      original_filename: file?.name,
      created_at: now,
      updated_at: now,
    };
    const all = ls<TransporterInvoice>(transporterInvoicesKey(entityCode));
    all.push(inv);
    // [JWT] POST /api/dispatch/transporter-invoices
    localStorage.setItem(transporterInvoicesKey(entityCode), JSON.stringify(all));
    toast.success(`Invoice ${inv.invoice_no} created from PDF — ${lines.length} lines.`);
    reset();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <FileUp className="h-5 w-5 text-blue-600" />
            PDF Invoice Upload
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Extract transporter invoice data from digital PDFs · Step {step} of 3
          </p>
        </div>
        {step !== 1 && (
          <Button variant="outline" size="sm" onClick={reset}>
            <X className="h-3.5 w-3.5 mr-1" /> Cancel
          </Button>
        )}
      </div>

      {/* STEP 1 — Upload */}
      {step === 1 && (
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Transporter *</Label>
                <Select value={logisticId} onValueChange={setLogisticId}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select transporter…" />
                  </SelectTrigger>
                  <SelectContent>
                    {logistics.length === 0 && (
                      <div className="p-2 text-xs text-muted-foreground">No transporters configured.</div>
                    )}
                    {logistics.map(l => (
                      <SelectItem key={l.id} value={l.id}>{l.partyName} ({l.partyCode})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div
              onDragOver={e => e.preventDefault()}
              onDrop={onDrop}
              className="border-2 border-dashed border-blue-500/40 rounded-lg p-10 text-center hover:bg-blue-500/5 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
            >
              <FileUp className="h-10 w-10 mx-auto text-blue-600 mb-3" />
              <p className="text-sm font-semibold">Drop PDF here or click to browse</p>
              <p className="text-xs text-muted-foreground mt-1">
                application/pdf · Max 5MB · Digital PDFs only (scanned not supported)
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={onFileInput}
              />
            </div>

            {file && (
              <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-blue-500/15 rounded flex items-center justify-center">
                    <FileUp className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setFile(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            {error && (
              <div className="border rounded-lg p-3 flex items-start gap-2 bg-destructive/10 border-destructive/40">
                <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <p className="text-xs">{error}</p>
              </div>
            )}

            <div className="flex justify-end">
              <Button
                disabled={!file || !logisticId || extracting}
                onClick={runExtraction}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {extracting && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
                {extracting ? 'Extracting…' : 'Extract'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 2 — Review */}
      {step === 2 && extracted && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-3 text-xs">
                <Badge variant="outline">{extracted.total_pages} pages</Badge>
                <span className="text-muted-foreground">
                  <strong className="text-foreground font-mono">{activeLines.length}</strong> lines extracted ·
                  <strong className="text-emerald-600 font-mono"> {highConf}</strong> high confidence ·
                  <strong className="text-amber-600 font-mono"> {needReview}</strong> need review
                </span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={addManualLine}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add line
                </Button>
                <Button
                  size="sm"
                  disabled={needReview > 0 || activeLines.length === 0}
                  onClick={() => setStep(3)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Continue
                </Button>
              </div>
            </div>

            {extracted.warnings.length > 0 && (
              <div className="border rounded-lg p-2 bg-amber-500/10 border-amber-500/40">
                <p className="text-[11px] font-semibold text-amber-700 mb-1">Warnings</p>
                <ul className="text-[11px] text-muted-foreground space-y-0.5">
                  {extracted.warnings.slice(0, 3).map((w, i) => (
                    <li key={`warn-${i}`}>· {w}</li>
                  ))}
                </ul>
              </div>
            )}

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>LR No</TableHead>
                  <TableHead>LR Date</TableHead>
                  <TableHead className="text-right">Weight (kg)</TableHead>
                  <TableHead className="text-right">Total (₹)</TableHead>
                  <TableHead className="text-center">Confidence</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeLines.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-xs text-muted-foreground py-6">
                      No lines extracted. Add manually or upload a different PDF.
                    </TableCell>
                  </TableRow>
                )}
                {reviewedLines.map((l, idx) => {
                  if (l.removed) return null;
                  const conf = l.overall_confidence;
                  const confColor = conf >= 80 ? 'text-emerald-600 bg-emerald-500/10'
                    : conf >= 60 ? 'text-amber-600 bg-amber-500/10'
                    : 'text-destructive bg-destructive/10';
                  return (
                    <TableRow key={`pdf-line-${l.line_no}-${idx}`}>
                      <TableCell className="font-mono text-xs">{l.line_no}</TableCell>
                      <TableCell>
                        <Input
                          value={String(getLineValue(l, 'lr_no'))}
                          onChange={e => updateLineEdit(idx, { lr_no: e.target.value })}
                          className="h-8 text-xs font-mono"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="date"
                          value={String(getLineValue(l, 'lr_date'))}
                          onChange={e => updateLineEdit(idx, { lr_date: e.target.value })}
                          className="h-8 text-xs"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={Number(getLineValue(l, 'weight'))}
                          onChange={e => updateLineEdit(idx, { weight: parseFloat(e.target.value) || 0 })}
                          className="h-8 text-xs font-mono text-right"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={Number(getLineValue(l, 'total'))}
                          onChange={e => updateLineEdit(idx, { total: parseFloat(e.target.value) || 0 })}
                          className="h-8 text-xs font-mono text-right"
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={`text-[10px] ${confColor}`}>
                          {conf.toFixed(0)}%
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {!l.reviewed && (
                            <Button size="sm" variant="ghost"
                              onClick={() => updateLine(idx, { reviewed: true })}
                              className="h-7 px-2"
                              title="Mark reviewed"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                            </Button>
                          )}
                          <Button size="sm" variant="ghost"
                            onClick={() => updateLine(idx, { removed: true })}
                            className="h-7 px-2"
                            title="Remove line"
                          >
                            <X className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* STEP 3 — Finalize */}
      {step === 3 && extracted && (
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Invoice No *</Label>
                <Input value={invoiceNo} onChange={e => setInvoiceNo(e.target.value)}
                  className="mt-1 font-mono" />
              </div>
              <div>
                <Label className="text-xs">Invoice Date</Label>
                <Input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)}
                  className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Period From</Label>
                <Input type="date" value={periodFrom} onChange={e => setPeriodFrom(e.target.value)}
                  className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Period To</Label>
                <Input type="date" value={periodTo} onChange={e => setPeriodTo(e.target.value)}
                  className="mt-1" />
              </div>
            </div>

            <div>
              <Label className="text-xs">Workflow Mode</Label>
              <RadioGroup value={workflowMode} onValueChange={(v) => setWorkflowMode(v as WorkflowMode)}
                className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-2">
                <label className="flex items-start gap-2 border rounded-lg p-3 cursor-pointer hover:bg-muted/50">
                  <RadioGroupItem value="flag_only" id="wf-flag" className="mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Flag Only</p>
                    <p className="text-[10px] text-muted-foreground">Mark variances; manual decisions</p>
                  </div>
                </label>
                <label className="flex items-start gap-2 border rounded-lg p-3 cursor-pointer hover:bg-muted/50">
                  <RadioGroupItem value="auto_approve" id="wf-auto" className="mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Auto Approve</p>
                    <p className="text-[10px] text-muted-foreground">Within tolerance auto-approved</p>
                  </div>
                </label>
                <label className="flex items-start gap-2 border rounded-lg p-3 cursor-pointer hover:bg-muted/50">
                  <RadioGroupItem value="dispute_ticket" id="wf-disp" className="mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Auto Dispute</p>
                    <p className="text-[10px] text-muted-foreground">Over-billed lines auto-dispute</p>
                  </div>
                </label>
              </RadioGroup>
            </div>

            <div className="border-t pt-3 flex items-center justify-between">
              <div className="text-xs text-muted-foreground">
                {activeLines.length} lines · Grand Total{' '}
                <span className="font-mono text-foreground font-semibold">
                  {fmtINR(activeLines.reduce((s, l) => s + Number(getLineValue(l, 'total')), 0))}
                </span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setStep(2)}>Back</Button>
                <Button
                  disabled={!canFinalize}
                  onClick={submitInvoice}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Create Invoice
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default PDFInvoiceUploadPanel;
