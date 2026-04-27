/**
 * @file     BulkPayBuilder.tsx
 * @purpose  Build BulkPaymentBatch from approved Payment Requisitions ·
 *           maker-sign · checker-approve (separation of duties · disabled when
 *           current user === maker_user_id) · execute · download bank file ·
 *           audit trail timeline.
 * @sprint   T-T8.7-SmartAP (Group B Sprint B.7)
 *
 * Pure presentation · IMPORTS engine functions only · NO engine signature changes.
 */
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  Plus, FileSpreadsheet, Send, ShieldCheck, Play, Download, AlertTriangle,
  Building2, Clock,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { useEntityCode } from '@/hooks/useEntityCode';
import { SelectCompanyGate } from '@/components/layout/SelectCompanyGate';
import {
  listBatches, getBatch, getApprovedRequisitions,
  createBulkBatch, signByMaker, approveByChecker, rejectBatch, executeBatch,
} from '@/lib/bulk-pay-engine';
import {
  listSupportedBanks, validateBatchForBank, generateBankFile, downloadBankFile,
} from '@/lib/bank-file-engine';
import {
  BULK_BATCH_STATUS_COLORS, BULK_BATCH_STATUS_LABEL,
  type BulkPaymentBatch, type BankCode, type BankFileFormat,
} from '@/types/smart-ap';
import { getCurrentUser } from '@/lib/auth-helpers';

interface BankLedgerRow {
  id: string; ledgerType?: string; bankName?: string;
  ledger_name?: string; name?: string;
}

const inr = (n: number): string =>
  '₹' + Math.abs(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

interface Props { entityCode: string; }

function BulkPayBuilderPanel({ entityCode }: Props) {
  const [refreshTick, setRefreshTick] = useState(0);
  const [selectedReqIds, setSelectedReqIds] = useState<string[]>([]);
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null);
  const [comment, setComment] = useState<string>('');
  const [bankCode, setBankCode] = useState<BankCode>('HDFC');
  const [fileFormat, setFileFormat] = useState<BankFileFormat>('NEFT');
  const [sourceBankId, setSourceBankId] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const currentUser = getCurrentUser();

  const refresh = (): void => setRefreshTick(x => x + 1);

  const approvedReqs = useMemo(() => {
    void refreshTick;
    return getApprovedRequisitions(entityCode);
  }, [entityCode, refreshTick]);

  const batches = useMemo(() => {
    void refreshTick;
    return listBatches(entityCode);
  }, [entityCode, refreshTick]);

  const activeBatch: BulkPaymentBatch | null = useMemo(() => {
    void refreshTick;
    return activeBatchId ? getBatch(entityCode, activeBatchId) : null;
  }, [activeBatchId, entityCode, refreshTick]);

  const banks = useMemo(() => listSupportedBanks(), []);

  const bankLedgers = useMemo<BankLedgerRow[]>(() => {
    try {
      const raw = localStorage.getItem(`erp_group_ledger_definitions_${entityCode}`);
      if (!raw) return [];
      const arr = JSON.parse(raw) as BankLedgerRow[];
      return arr.filter(l => l.ledgerType === 'bank');
    } catch { return []; }
  }, [entityCode]);

  // Auto-select first bank ledger if none chosen
  useEffect(() => {
    if (!sourceBankId && bankLedgers.length > 0) {
      setSourceBankId(bankLedgers[0].id);
    }
  }, [bankLedgers, sourceBankId]);

  const totalSelected = useMemo(() => {
    const set = new Set(selectedReqIds);
    return approvedReqs
      .filter(r => set.has(r.id))
      .reduce((s, r) => s + r.amount, 0);
  }, [approvedReqs, selectedReqIds]);

  const supportedFormats = useMemo(
    () => banks.find(b => b.bank_code === bankCode)?.supported_formats ?? ['NEFT'],
    [banks, bankCode],
  );

  useEffect(() => {
    if (!supportedFormats.includes(fileFormat)) setFileFormat(supportedFormats[0] as BankFileFormat);
  }, [supportedFormats, fileFormat]);

  // ── Actions ─────────────────────────────────────────────────────────
  const handleCreate = (): void => {
    if (selectedReqIds.length === 0) {
      toast.error('Select at least one approved requisition');
      return;
    }
    if (!sourceBankId) {
      toast.error('Pick a source bank ledger first');
      return;
    }
    try {
      const sourceLedger = bankLedgers.find(l => l.id === sourceBankId);
      const batch = createBulkBatch({
        entityCode,
        requisitionIds: selectedReqIds,
        source_bank_ledger_id: sourceBankId,
        source_bank_ledger_name: sourceLedger?.bankName ?? sourceLedger?.ledger_name ?? sourceLedger?.name,
        target_bank_code: bankCode,
        file_format: fileFormat,
        notes: notes || undefined,
      });
      setActiveBatchId(batch.id);
      setSelectedReqIds([]);
      setNotes('');
      toast.success(`Created batch ${batch.batch_no}`);
      refresh();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleSign = (): void => {
    if (!activeBatch) return;
    try {
      signByMaker(entityCode, activeBatch.id, comment);
      toast.success('Maker-signed');
      setComment('');
      refresh();
    } catch (err) { toast.error((err as Error).message); }
  };

  const handleApprove = (): void => {
    if (!activeBatch) return;
    try {
      approveByChecker(entityCode, activeBatch.id, comment);
      toast.success('Checker-approved');
      setComment('');
      refresh();
    } catch (err) { toast.error((err as Error).message); }
  };

  const handleReject = (level: 'maker' | 'checker'): void => {
    if (!activeBatch) return;
    try {
      rejectBatch(entityCode, activeBatch.id, level, comment || 'Rejected');
      toast.success(`Rejected by ${level}`);
      setComment('');
      refresh();
    } catch (err) { toast.error((err as Error).message); }
  };

  const handleExecute = (): void => {
    if (!activeBatch) return;
    try {
      const updated = executeBatch(entityCode, activeBatch.id);
      const okCount = updated.individual_results.filter(r => r.ok).length;
      toast.success(`Executed · ${okCount}/${updated.individual_results.length} succeeded`);
      refresh();
    } catch (err) { toast.error((err as Error).message); }
  };

  const handleDownloadFile = (): void => {
    if (!activeBatch) return;
    if (!activeBatch.target_bank_code || !activeBatch.file_format) {
      toast.error('Batch is missing bank/format selection');
      return;
    }
    const errors = validateBatchForBank(entityCode, activeBatch.id, activeBatch.target_bank_code);
    if (errors.length > 0) {
      toast.error(`${errors.length} validation issue(s) · first: ${errors[0].message}`);
      return;
    }
    try {
      const file = generateBankFile(entityCode, activeBatch.id, activeBatch.target_bank_code, activeBatch.file_format);
      downloadBankFile(file);
      toast.success(`Downloaded ${file.filename} · ${file.row_count} rows · ${inr(file.total_amount)}`);
    } catch (err) { toast.error((err as Error).message); }
  };

  // Maker-Checker disable logic
  const isMakerSelf = activeBatch?.maker_user_id === currentUser.id;
  const canSign = activeBatch?.status === 'draft';
  const canApprove = activeBatch?.status === 'maker_signed' && !isMakerSelf;
  const canExecute = activeBatch?.status === 'checker_approved';

  const validationIssues = useMemo(() => {
    if (!activeBatch?.target_bank_code) return [];
    return validateBatchForBank(entityCode, activeBatch.id, activeBatch.target_bank_code);
  }, [activeBatch, entityCode]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* LEFT: Approved requisitions checklist */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center justify-between">
              <span className="flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-violet-500" />
                Approved Requisitions ({approvedReqs.length})
              </span>
              {selectedReqIds.length > 0 && (
                <Badge variant="outline" className="text-[10px]">
                  {selectedReqIds.length} selected · {inr(totalSelected)}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {approvedReqs.length === 0
              ? <p className="text-xs text-muted-foreground">No approved requisitions available. Approve requisitions in the Requisition Inbox first.</p>
              : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10"></TableHead>
                      <TableHead>Vendor / Payee</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Purpose</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {approvedReqs.map(r => {
                      const checked = selectedReqIds.includes(r.id);
                      return (
                        <TableRow key={r.id} className="text-xs">
                          <TableCell>
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(v) => {
                                setSelectedReqIds(prev =>
                                  v ? [...prev, r.id] : prev.filter(id => id !== r.id));
                              }}
                            />
                          </TableCell>
                          <TableCell>{r.vendor_name ?? r.requested_by_name}</TableCell>
                          <TableCell className="text-muted-foreground">{r.request_type}</TableCell>
                          <TableCell className="max-w-[260px] truncate" title={r.purpose}>{r.purpose}</TableCell>
                          <TableCell className="text-right font-mono">{inr(r.amount)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
          </CardContent>
        </Card>

        {/* RIGHT: New batch form */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Plus className="h-4 w-4 text-violet-500" />New Batch
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-xs font-medium mb-1 block">Source Bank</label>
              <Select value={sourceBankId} onValueChange={setSourceBankId}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select bank ledger" /></SelectTrigger>
                <SelectContent>
                  {bankLedgers.length === 0
                    ? <SelectItem value="__none__" disabled>No bank ledgers configured</SelectItem>
                    : bankLedgers.map(l => (
                      <SelectItem key={l.id} value={l.id} className="text-xs">
                        {l.bankName ?? l.ledger_name ?? l.name ?? l.id}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium mb-1 block">Target Bank</label>
                <Select value={bankCode} onValueChange={(v) => setBankCode(v as BankCode)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {banks.map(b => (
                      <SelectItem key={b.bank_code} value={b.bank_code} className="text-xs">
                        {b.bank_code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">Format</label>
                <Select value={fileFormat} onValueChange={(v) => setFileFormat(v as BankFileFormat)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {supportedFormats.map(f => (
                      <SelectItem key={f} value={f} className="text-xs">{f}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Notes (optional)</label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)}
                className="text-xs min-h-[60px]" placeholder="Internal note about this batch" />
            </div>
            <Button onClick={handleCreate} className="w-full" size="sm"
              disabled={selectedReqIds.length === 0}>
              <Plus className="h-3.5 w-3.5 mr-1" />Create Draft Batch
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Batches list + active workflow */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">All Batches ({batches.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[480px] overflow-y-auto">
            {batches.length === 0
              ? <p className="text-xs text-muted-foreground">No batches yet.</p>
              : batches.map(b => (
                <button
                  key={b.id}
                  onClick={() => setActiveBatchId(b.id)}
                  className={`w-full text-left p-2 rounded-md border text-xs transition-colors ${
                    activeBatchId === b.id
                      ? 'border-violet-500/50 bg-violet-500/10'
                      : 'border-border/40 hover:bg-muted/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-medium">{b.batch_no}</span>
                    <Badge variant="outline" className={`${BULK_BATCH_STATUS_COLORS[b.status]} text-[9px] px-1 py-0`}>
                      {BULK_BATCH_STATUS_LABEL[b.status]}
                    </Badge>
                  </div>
                  <div className="text-muted-foreground mt-1">
                    {b.count} reqs · {inr(b.total_amount)} · {b.target_bank_code ?? '—'}
                  </div>
                </button>
              ))}
          </CardContent>
        </Card>

        {/* Active batch panel */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center justify-between">
              <span>{activeBatch ? `Batch ${activeBatch.batch_no}` : 'Select a batch to view actions'}</span>
              {activeBatch && (
                <Badge variant="outline" className={BULK_BATCH_STATUS_COLORS[activeBatch.status]}>
                  {BULK_BATCH_STATUS_LABEL[activeBatch.status]}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!activeBatch
              ? <p className="text-xs text-muted-foreground">Pick a batch from the list to maker-sign · checker-approve · execute · download bank file.</p>
              : (
                <div className="space-y-4">
                  {/* Summary */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div>
                      <div className="text-muted-foreground">Requisitions</div>
                      <div className="font-mono font-semibold">{activeBatch.count}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Total</div>
                      <div className="font-mono font-semibold">{inr(activeBatch.total_amount)}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Bank · Format</div>
                      <div className="font-mono font-semibold">
                        {activeBatch.target_bank_code ?? '—'} · {activeBatch.file_format ?? '—'}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Source</div>
                      <div className="font-mono font-semibold truncate" title={activeBatch.source_bank_ledger_name}>
                        <Building2 className="h-3 w-3 inline mr-1" />
                        {activeBatch.source_bank_ledger_name ?? '—'}
                      </div>
                    </div>
                  </div>

                  {/* Validation badge */}
                  {validationIssues.length > 0 && (
                    <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-2 text-xs flex items-start gap-2">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-600 mt-0.5 shrink-0" />
                      <div>
                        <div className="font-medium">{validationIssues.length} validation issue(s)</div>
                        <ul className="mt-1 space-y-0.5">
                          {validationIssues.slice(0, 3).map((e, i) => (
                            <li key={i}>· {e.vendor_name}: {e.message}</li>
                          ))}
                          {validationIssues.length > 3 && <li>· …{validationIssues.length - 3} more</li>}
                        </ul>
                      </div>
                    </div>
                  )}

                  {/* Comment + actions */}
                  <div>
                    <label className="text-xs font-medium mb-1 block">Comment</label>
                    <Input value={comment} onChange={e => setComment(e.target.value)}
                      className="text-xs h-8" placeholder="Action comment (audit trail)" />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="default" disabled={!canSign}
                      onClick={handleSign}>
                      <Send className="h-3.5 w-3.5 mr-1" />Maker-Sign
                    </Button>
                    <Button size="sm" variant="default"
                      disabled={!canApprove}
                      title={isMakerSelf ? 'Separation of duties · maker cannot approve own batch' : undefined}
                      onClick={handleApprove}>
                      <ShieldCheck className="h-3.5 w-3.5 mr-1" />Checker-Approve
                    </Button>
                    <Button size="sm" variant="default" disabled={!canExecute}
                      onClick={handleExecute}>
                      <Play className="h-3.5 w-3.5 mr-1" />Execute
                    </Button>
                    <Button size="sm" variant="outline"
                      disabled={!activeBatch.target_bank_code}
                      onClick={handleDownloadFile}>
                      <Download className="h-3.5 w-3.5 mr-1" />Download Bank File
                    </Button>
                    {(activeBatch.status === 'draft' || activeBatch.status === 'maker_signed') && (
                      <Button size="sm" variant="destructive"
                        onClick={() => handleReject(activeBatch.status === 'draft' ? 'maker' : 'checker')}>
                        Reject
                      </Button>
                    )}
                  </div>

                  {isMakerSelf && activeBatch.status === 'maker_signed' && (
                    <p className="text-xs text-amber-600 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Separation-of-duties: you signed as maker · a different user must check-approve.
                    </p>
                  )}

                  {/* Execution results */}
                  {activeBatch.individual_results.length > 0 && (
                    <div>
                      <h4 className="text-xs font-medium mb-1">Execution Results</h4>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Requisition</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Voucher</TableHead>
                            <TableHead>Error</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {activeBatch.individual_results.map((r, i) => (
                            <TableRow key={i} className="text-xs">
                              <TableCell className="font-mono">{r.requisition_id.slice(-8)}</TableCell>
                              <TableCell>
                                {r.ok
                                  ? <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 border-emerald-500/30 text-[9px]">OK</Badge>
                                  : <Badge variant="outline" className="bg-red-500/10 text-red-700 border-red-500/30 text-[9px]">FAIL</Badge>}
                              </TableCell>
                              <TableCell className="font-mono">{r.voucher_no ?? '—'}</TableCell>
                              <TableCell className="text-destructive">{r.error ?? ''}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  {/* Audit timeline */}
                  <div>
                    <h4 className="text-xs font-medium mb-1 flex items-center gap-1">
                      <Clock className="h-3 w-3" />Audit Trail
                    </h4>
                    <ol className="space-y-1.5 text-xs border-l-2 border-violet-500/30 pl-3">
                      {activeBatch.approval_chain.map((e, i) => (
                        <li key={i} className="relative">
                          <span className="absolute -left-[14px] top-1 h-2 w-2 rounded-full bg-violet-500" />
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[9px] px-1 py-0">{e.level}</Badge>
                            <span className="font-medium">{e.action}</span>
                            <span className="text-muted-foreground">by {e.user_name}</span>
                            <span className="text-muted-foreground ml-auto font-mono">
                              {new Date(e.timestamp).toLocaleString('en-IN', { hour12: false })}
                            </span>
                          </div>
                          {e.comment && <div className="text-muted-foreground italic mt-0.5">{e.comment}</div>}
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

interface ExternalProps { entityCode?: string; }

export function BulkPayBuilderScreen() { return <BulkPayBuilder />; }

export default function BulkPayBuilder({ entityCode: passedCode }: ExternalProps = {}) {
  const { entityCode: ctxCode } = useEntityCode();
  const entityCode = passedCode ?? ctxCode;
  if (!entityCode) {
    return (
      <SelectCompanyGate
        title="Select a company to use Bulk Pay"
        description="Bulk Pay batches are scoped to a specific company."
      />
    );
  }
  return <BulkPayBuilderPanel entityCode={entityCode} />;
}
