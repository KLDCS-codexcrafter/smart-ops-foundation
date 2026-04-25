/**
 * SalesReturnMemo.tsx — SalesX field-force return memo entry
 * Sprint 6B. Memo is the authorization; Credit Note is the accounting entry.
 * [JWT] GET/POST/PATCH /api/salesx/sales-return-memos
 */
import { useState, useMemo, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { SmartDateInput } from '@/components/ui/smart-date-input';
import { Save, Send, Plus, Trash2, Paperclip } from 'lucide-react';
import { toast } from 'sonner';
import { onEnterNext, useCtrlS } from '@/lib/keyboard';
import { samPersonsKey, type SAMPerson } from '@/types/sam-person';
import { vouchersKey } from '@/lib/finecore-engine';
import type { Voucher } from '@/types/voucher';
import { DEFAULT_ENTITY_SHORTCODE } from '@/lib/default-entity';
import {
  salesReturnMemosKey,
  SALES_RETURN_REASON_LABELS,
  type SalesReturnMemo,
  type SalesReturnMemoItem,
  type SalesReturnReason,
} from '@/types/sales-return-memo';

interface Props { entityCode: string }

const todayISO = () => new Date().toISOString().split('T')[0];

function fyShort(): string {
  const d = new Date();
  const y = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
  return `${String(y).slice(2)}-${String(y + 1).slice(2)}`;
}

function nextMemoNo(entityCode: string): string {
  const key = `erp_doc_seq_SRM_${entityCode}`;
  // [JWT] GET /api/procurement/sequences/SRM/:entityCode
  const raw = localStorage.getItem(key);
  const seq = raw ? parseInt(raw, 10) + 1 : 1;
  // [JWT] PATCH /api/procurement/sequences/SRM/:entityCode
  localStorage.setItem(key, String(seq));
  return `SRM/${fyShort()}/${String(seq).padStart(4, '0')}`;
}

function ls<T>(key: string): T[] {
  try { return JSON.parse(localStorage.getItem(key) || '[]') as T[]; }
  catch { return []; }
}

const RAISE_BY_TYPES = ['salesman', 'agent', 'broker', 'reference'];

export function SalesReturnMemoPanel({ entityCode }: Props) {
  // ── Header ─────────────────────────────────────────────────────────
  const [memoNo] = useState(() => nextMemoNo(entityCode));
  const [memoDate, setMemoDate] = useState(todayISO());

  // ── Raised By ──────────────────────────────────────────────────────
  const persons = useMemo(() =>
    ls<SAMPerson>(samPersonsKey(entityCode)).filter(p =>
      RAISE_BY_TYPES.includes(p.person_type) && p.is_active,
    ),
  [entityCode]);
  const [raisedById, setRaisedById] = useState<string>('');

  // ── Against Invoice (Sales / posted) ──────────────────────────────
  const salesInvoices = useMemo(() =>
    ls<Voucher>(vouchersKey(entityCode)).filter(v =>
      v.base_voucher_type === 'Sales' && v.status === 'posted' && !v.is_cancelled,
    ).sort((a, b) => b.date.localeCompare(a.date)),
  [entityCode]);
  const [againstInvoiceId, setAgainstInvoiceId] = useState<string>('');
  const selectedInvoice = useMemo(
    () => salesInvoices.find(v => v.id === againstInvoiceId) ?? null,
    [salesInvoices, againstInvoiceId],
  );

  // ── Reason ─────────────────────────────────────────────────────────
  const [reason, setReason] = useState<SalesReturnReason>('damaged_goods');
  const [reasonNote, setReasonNote] = useState('');

  // ── Items (pre-populated from invoice) ─────────────────────────────
  const [items, setItems] = useState<SalesReturnMemoItem[]>([]);

  // When invoice changes, hydrate item lines from invoice inventory_lines
  useEffect(() => {
    if (!selectedInvoice) { setItems([]); return; }
    const lines = (selectedInvoice.inventory_lines ?? []).map((l, i) => ({
      id: `srm-it-${Date.now()}-${i}`,
      item_name: l.item_name,
      description: null,
      qty: l.qty,
      uom: l.uom,
      rate: l.rate,
      amount: +(l.qty * l.rate).toFixed(2),
    }));
    setItems(lines);
  }, [selectedInvoice]);

  const updateLine = (idx: number, patch: Partial<SalesReturnMemoItem>) => {
    setItems(prev => prev.map((it, i) => {
      if (i !== idx) return it;
      const next = { ...it, ...patch };
      next.amount = +(next.qty * next.rate).toFixed(2);
      return next;
    }));
  };
  const removeLine = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));
  const addLine = () => setItems(prev => [...prev, {
    id: `srm-it-${Date.now()}`,
    item_name: '', description: null,
    qty: 1, uom: 'NOS', rate: 0, amount: 0,
  }]);

  const totalAmount = useMemo(
    () => +items.reduce((s, it) => s + it.amount, 0).toFixed(2),
    [items],
  );

  // ── Attachments (UI list only — actual upload deferred) ───────────
  const [attachments, setAttachments] = useState<string[]>([]);
  const handleAddAttachment = () => {
    const name = prompt('Attachment name (e.g. damage_photo_1.jpg)');
    if (name && name.trim()) setAttachments(prev => [...prev, name.trim()]);
  };
  const removeAttachment = (idx: number) =>
    setAttachments(prev => prev.filter((_, i) => i !== idx));

  // ── Validation ─────────────────────────────────────────────────────
  const validate = useCallback((): string | null => {
    if (!raisedById) return 'Select the person raising this memo';
    if (!againstInvoiceId || !selectedInvoice) return 'Select the original sales invoice';
    if (items.length === 0) return 'Add at least one item line';
    if (items.some(it => !it.item_name.trim())) return 'Every line must have an item name';
    if (items.some(it => it.qty <= 0)) return 'Item quantity must be positive';
    return null;
  }, [raisedById, againstInvoiceId, selectedInvoice, items]);

  // ── Persist ────────────────────────────────────────────────────────
  const persistMemo = useCallback((status: 'pending' | 'pending') => {
    const err = validate();
    if (err) { toast.error(err); return; }
    const person = persons.find(p => p.id === raisedById)!;
    const inv = selectedInvoice!;
    const now = new Date().toISOString();
    const memo: SalesReturnMemo = {
      id: `srm-${Date.now()}`,
      entity_id: entityCode,
      memo_no: memoNo,
      memo_date: memoDate,
      raised_by_person_id: person.id,
      raised_by_person_name: person.display_name,
      raised_by_person_type: person.person_type,
      customer_id: inv.party_id ?? '',
      customer_name: inv.party_name ?? '',
      against_invoice_id: inv.id,
      against_invoice_no: inv.voucher_no,
      against_invoice_date: inv.date,
      reason,
      reason_note: reasonNote.trim() || null,
      items,
      total_amount: totalAmount,
      attachments,
      status,
      approved_by_user: null,
      approved_at: null,
      approval_notes: null,
      rejection_reason: null,
      credit_note_voucher_id: null,
      credit_note_voucher_no: null,
      credit_note_posted_at: null,
      created_at: now,
      updated_at: now,
    };
    const key = salesReturnMemosKey(entityCode);
    // [JWT] GET /api/salesx/sales-return-memos
    const list = ls<SalesReturnMemo>(key);
    list.push(memo);
    // [JWT] POST /api/salesx/sales-return-memos
    localStorage.setItem(key, JSON.stringify(list));
    toast.success(`Sales Return Memo ${memoNo} submitted for approval`);
    // Reset form (memoNo stays — would be replaced by next sequence on a new entry)
    setRaisedById(''); setAgainstInvoiceId(''); setReason('damaged_goods');
    setReasonNote(''); setItems([]); setAttachments([]);
  }, [persons, raisedById, selectedInvoice, entityCode, memoNo, memoDate,
      reason, reasonNote, items, totalAmount, attachments, validate]);
   
  void persistMemo;

  const handleSubmit = useCallback(() => persistMemo('pending'), [persistMemo]);
  const handleSaveDraft = useCallback(() => {
    const err = validate();
    if (err) { toast.error(err); return; }
    // For Sprint 6B we treat draft same as pending status (workflow tightened in Sprint 6C).
    persistMemo('pending');
    toast.info('Saved as draft (pending approval)');
  }, [persistMemo, validate]);

  useCtrlS(handleSubmit);

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <div className="space-y-4" data-keyboard-form>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Sales Return Memo</h1>
          <p className="text-sm text-muted-foreground">
            Authorise a return raised by salesman / agent / broker before issuing a Credit Note.
          </p>
        </div>
        <Badge variant="outline" className="font-mono text-xs">{memoNo}</Badge>
      </div>

      {/* Header */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Memo Header</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs">Memo No</Label>
            <Input value={memoNo} disabled className="h-9 font-mono text-sm" />
          </div>
          <div>
            <Label className="text-xs">Memo Date</Label>
            <SmartDateInput value={memoDate} onChange={setMemoDate} />
          </div>
        </CardContent>
      </Card>

      {/* Raised By */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Raised By</CardTitle></CardHeader>
        <CardContent>
          <Label className="text-xs">Person</Label>
          <Select value={raisedById} onValueChange={setRaisedById}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Select salesman / agent / broker / reference" />
            </SelectTrigger>
            <SelectContent>
              {persons.length === 0 && (
                <SelectItem value="none" disabled>No SAM persons available</SelectItem>
              )}
              {persons.map(p => (
                <SelectItem key={p.id} value={p.id}>
                  {p.display_name} <span className="text-muted-foreground text-[10px] ml-1 capitalize">· {p.person_type}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Against Invoice */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Against Sales Invoice</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Select value={againstInvoiceId} onValueChange={setAgainstInvoiceId}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Select original invoice" />
            </SelectTrigger>
            <SelectContent>
              {salesInvoices.length === 0 && (
                <SelectItem value="none" disabled>No posted sales invoices</SelectItem>
              )}
              {salesInvoices.map(v => (
                <SelectItem key={v.id} value={v.id}>
                  {v.voucher_no} · {v.party_name ?? '—'} · ₹{v.net_amount.toLocaleString('en-IN')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedInvoice && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs bg-muted/30 rounded p-3">
              <div><span className="text-muted-foreground">Customer: </span>{selectedInvoice.party_name}</div>
              <div><span className="text-muted-foreground">Invoice Date: </span>{selectedInvoice.date}</div>
              <div><span className="text-muted-foreground">Net Amount: </span>₹{selectedInvoice.net_amount.toLocaleString('en-IN')}</div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reason */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Reason</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-xs">Reason</Label>
            <Select value={reason} onValueChange={v => setReason(v as SalesReturnReason)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(SALES_RETURN_REASON_LABELS) as SalesReturnReason[]).map(r => (
                  <SelectItem key={r} value={r}>{SALES_RETURN_REASON_LABELS[r]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Notes</Label>
            <Textarea
              value={reasonNote}
              onChange={e => setReasonNote(e.target.value)}
              placeholder="Add context for the approver"
              className="min-h-[72px] text-sm"
            />
          </div>
        </CardContent>
      </Card>

      {/* Items */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm">Return Items</CardTitle>
          <Button size="sm" variant="outline" onClick={addLine} className="h-7 text-xs">
            <Plus className="h-3.5 w-3.5 mr-1" /> Add Line
          </Button>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-xs text-muted-foreground py-6 text-center">
              Select an invoice above to pre-populate items, or add lines manually.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Item</TableHead>
                  <TableHead className="text-xs w-20 text-right">Qty</TableHead>
                  <TableHead className="text-xs w-20">UOM</TableHead>
                  <TableHead className="text-xs w-28 text-right">Rate ₹</TableHead>
                  <TableHead className="text-xs w-32 text-right">Amount ₹</TableHead>
                  <TableHead className="w-8" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((it, i) => (
                  <TableRow key={it.id}>
                    <TableCell>
                      <Input
                        value={it.item_name} onKeyDown={onEnterNext}
                        onChange={e => updateLine(i, { item_name: e.target.value })}
                        className="h-8 text-xs"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number" min={0} step="0.01"
                        value={it.qty} onKeyDown={onEnterNext}
                        onChange={e => updateLine(i, { qty: Number(e.target.value) || 0 })}
                        className="h-8 text-xs text-right font-mono"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={it.uom ?? ''} onKeyDown={onEnterNext}
                        onChange={e => updateLine(i, { uom: e.target.value })}
                        className="h-8 text-xs"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number" min={0} step="0.01"
                        value={it.rate} onKeyDown={onEnterNext}
                        onChange={e => updateLine(i, { rate: Number(e.target.value) || 0 })}
                        className="h-8 text-xs text-right font-mono"
                      />
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {it.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost" className="h-7 w-7"
                        onClick={() => removeLine(i)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Attachments */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Paperclip className="h-4 w-4" /> Attachments
          </CardTitle>
          <Button size="sm" variant="outline" onClick={handleAddAttachment} className="h-7 text-xs">
            <Plus className="h-3.5 w-3.5 mr-1" /> Add
          </Button>
        </CardHeader>
        <CardContent>
          {attachments.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">No attachments yet.</p>
          ) : (
            <ul className="space-y-1">
              {attachments.map((a, i) => (
                <li key={`${a}-${i}`} className="flex items-center justify-between text-xs bg-muted/30 rounded px-2 py-1">
                  <span className="font-mono">{a}</span>
                  <Button size="icon" variant="ghost" className="h-6 w-6"
                    onClick={() => removeAttachment(i)}>
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Totals */}
      <Card className="border-orange-500/30">
        <CardContent className="pt-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Total return value</p>
            <p className="text-2xl font-bold font-mono">
              ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleSaveDraft}>
              <Save className="h-4 w-4 mr-1" /> Save Draft
            </Button>
            <Button data-primary onClick={handleSubmit}
              className="bg-orange-500 hover:bg-orange-600">
              <Send className="h-4 w-4 mr-1" /> Submit
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SalesReturnMemoPage() {
  return <SalesReturnMemoPanel entityCode={DEFAULT_ENTITY_SHORTCODE} />;
}
