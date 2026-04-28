/**
 * SampleOutwardMemo.tsx — SalesX Sample Outward (D-192)
 * Salesman → architect / prospect / quality-trial recipient.
 * Memo is the authorization. NO ServiceDesk hook (D-192 explicit).
 * [JWT] GET/POST/PATCH /api/salesx/sample-outward-memos
 */
import { useState, useMemo, useCallback } from 'react';
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
import { Send, Plus, Trash2, Paperclip, CheckCircle2, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { onEnterNext, useCtrlS } from '@/lib/keyboard';
import { samPersonsKey, type SAMPerson } from '@/types/sam-person';
import {
  sampleOutwardMemosKey,
  SOM_PURPOSE_LABELS,
  SOM_STATUS_LABELS,
  type SampleOutwardMemo,
  type SampleOutwardMemoItem,
  type SOMPurpose,
  type SOMStatus,
} from '@/types/sample-outward-memo';

interface Props { entityCode: string }

const todayISO = () => new Date().toISOString().split('T')[0];

function fyShort(): string {
  const d = new Date();
  const y = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
  return `${String(y).slice(2)}-${String(y + 1).slice(2)}`;
}

function nextMemoNo(entityCode: string): string {
  const key = `erp_doc_seq_SOM_${entityCode}`;
  // [JWT] GET /api/procurement/sequences/SOM/:entityCode
  const raw = localStorage.getItem(key);
  const seq = raw ? parseInt(raw, 10) + 1 : 1;
  // [JWT] PATCH /api/procurement/sequences/SOM/:entityCode
  localStorage.setItem(key, String(seq));
  return `SOM/${fyShort()}/${String(seq).padStart(4, '0')}`;
}

function ls<T>(key: string): T[] {
  try { return JSON.parse(localStorage.getItem(key) || '[]') as T[]; }
  catch { return []; }
}

const RAISE_BY_TYPES = ['salesman', 'agent', 'broker', 'reference'];

const STATUS_VARIANT: Record<SOMStatus, 'outline' | 'secondary' | 'default'> = {
  draft: 'outline',
  dispatched: 'secondary',
  returned: 'secondary',
  completed: 'default',
};

export function SampleOutwardMemoPanel({ entityCode }: Props) {
  const [memoNo] = useState(() => nextMemoNo(entityCode));
  const [memoDate, setMemoDate] = useState(todayISO());

  const persons = useMemo(() =>
    ls<SAMPerson>(samPersonsKey(entityCode)).filter(p =>
      RAISE_BY_TYPES.includes(p.person_type) && p.is_active,
    ),
  [entityCode]);
  const [raisedById, setRaisedById] = useState<string>('');

  // Recipient (free text)
  const [recipientName, setRecipientName] = useState('');
  const [recipientCompany, setRecipientCompany] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [recipientAddress, setRecipientAddress] = useState('');

  const [purpose, setPurpose] = useState<SOMPurpose>('architect_trial');
  const [purposeNote, setPurposeNote] = useState('');

  const [expectReturn, setExpectReturn] = useState(false);
  const [returnDueDate, setReturnDueDate] = useState<string>('');

  const [items, setItems] = useState<SampleOutwardMemoItem[]>([]);
  const updateLine = (idx: number, patch: Partial<SampleOutwardMemoItem>) => {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, ...patch } : it));
  };
  const removeLine = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));
  const addLine = () => setItems(prev => [...prev, {
    id: `som-it-${Date.now()}`,
    item_name: '', description: null, qty: 1, uom: 'NOS',
    unit_value: 0, amount: 0,
  }]);

  const [attachments, setAttachments] = useState<string[]>([]);
  const handleAddAttachment = () => {
    const name = prompt('Attachment name (e.g. sample_photo.jpg)');
    if (name && name.trim()) setAttachments(prev => [...prev, name.trim()]);
  };
  const removeAttachment = (idx: number) =>
    setAttachments(prev => prev.filter((_, i) => i !== idx));

  const validate = useCallback((): string | null => {
    if (!raisedById) return 'Select the person raising this memo';
    if (!recipientName.trim()) return 'Recipient name is required';
    if (items.length === 0) return 'Add at least one item line';
    if (items.some(it => !it.item_name.trim())) return 'Every line must have an item name';
    if (items.some(it => it.qty <= 0)) return 'Item quantity must be positive';
    if (expectReturn && !returnDueDate) return 'Return due date required when return expected';
    return null;
  }, [raisedById, recipientName, items, expectReturn, returnDueDate]);

  const persist = useCallback((status: SOMStatus) => {
    const err = validate();
    if (err) { toast.error(err); return; }
    const person = persons.find(p => p.id === raisedById)!;
    const now = new Date().toISOString();
    const memo: SampleOutwardMemo = {
      id: `som-${Date.now()}`,
      entity_id: entityCode,
      memo_no: memoNo,
      memo_date: memoDate,
      raised_by_person_id: person.id,
      raised_by_person_name: person.display_name,
      raised_by_person_type: person.person_type,
      recipient_name: recipientName.trim(),
      recipient_company: recipientCompany.trim() || null,
      recipient_phone: recipientPhone.trim() || null,
      recipient_address: recipientAddress.trim() || null,
      purpose,
      purpose_note: purposeNote.trim() || null,
      items,
      expect_return: expectReturn,
      return_due_date: expectReturn ? returnDueDate : null,
      returned_at: null,
      attachments,
      status,
      dispatched_at: status === 'dispatched' ? now : null,
      completed_at: status === 'completed' ? now : null,
      // Sprint T-Phase-1.1.1p-v2 — party / refundable / dispatch fields default empty.
      // SalesX raises only; Dispatch fills these on issue.
      customer_id: null, customer_name: null,
      salesman_id: null, salesman_name: null,
      agent_id: null, agent_name: null,
      broker_id: null, broker_name: null,
      engineer_emp_id: null, engineer_name: null,
      is_refundable: false,
      outward_godown_id: null, outward_godown_name: null,
      issued_by_dispatch: false,
      dispatch_issued_at: null, dispatch_issued_by: null,
      unit_value: 0, total_value: 0,
      created_at: now,
      updated_at: now,
    };
    const key = sampleOutwardMemosKey(entityCode);
    // [JWT] GET /api/salesx/sample-outward-memos
    const list = ls<SampleOutwardMemo>(key);
    list.push(memo);
    // [JWT] POST /api/salesx/sample-outward-memos
    localStorage.setItem(key, JSON.stringify(list));
    toast.success(`Sample Outward ${memoNo} · ${SOM_STATUS_LABELS[status]}`);
    setRaisedById(''); setRecipientName(''); setRecipientCompany('');
    setRecipientPhone(''); setRecipientAddress(''); setPurpose('architect_trial');
    setPurposeNote(''); setExpectReturn(false); setReturnDueDate('');
    setItems([]); setAttachments([]);
  }, [persons, raisedById, entityCode, memoNo, memoDate,
      recipientName, recipientCompany, recipientPhone, recipientAddress,
      purpose, purposeNote, items, expectReturn, returnDueDate, attachments, validate]);

  const handleDispatch = useCallback(() => persist('dispatched'), [persist]);
  useCtrlS(handleDispatch);

  // Sprint T-Phase-1.1.1p-v2 — Show issued-by-Dispatch info banner with party fields
  // (read-only) when the most recent persisted SOM has been issued.
  const existingMemos = useMemo(() => ls<SampleOutwardMemo>(sampleOutwardMemosKey(entityCode)), [entityCode]);
  const lastIssued = useMemo(
    () => existingMemos.slice().reverse().find(m => m.issued_by_dispatch) ?? null,
    [existingMemos],
  );

  return (
    <div className="space-y-4" data-keyboard-form>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Sample Outward Memo</h1>
          <p className="text-sm text-muted-foreground">
            Send a small physical sample to an architect, prospect, or quality-trial target.
          </p>
        </div>
        <Badge variant={STATUS_VARIANT.draft} className="font-mono text-xs">{memoNo}</Badge>
      </div>

      {lastIssued && (
        <Card className="border-blue-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              Last issued by Dispatch · {lastIssued.memo_no}
              <Badge variant="secondary" className="ml-2 text-[10px]">read-only</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
            <div><span className="text-muted-foreground">Customer: </span>{lastIssued.customer_name ?? '—'}</div>
            <div><span className="text-muted-foreground">Salesman: </span>{lastIssued.salesman_name ?? '—'}</div>
            <div><span className="text-muted-foreground">Agent / Broker: </span>{lastIssued.agent_name ?? lastIssued.broker_name ?? '—'}</div>
            <div><span className="text-muted-foreground">Engineer: </span>{lastIssued.engineer_name ?? '—'}</div>
            <div><span className="text-muted-foreground">Refundable: </span>{lastIssued.is_refundable ? 'Yes' : 'No (consumed)'}</div>
            <div><span className="text-muted-foreground">Godown: </span>{lastIssued.outward_godown_name ?? '—'}</div>
          </CardContent>
        </Card>
      )}

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

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Recipient</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Name *</Label>
            <Input value={recipientName} onChange={e => setRecipientName(e.target.value)}
              onKeyDown={onEnterNext} className="h-9 text-sm" />
          </div>
          <div>
            <Label className="text-xs">Company</Label>
            <Input value={recipientCompany} onChange={e => setRecipientCompany(e.target.value)}
              onKeyDown={onEnterNext} className="h-9 text-sm" />
          </div>
          <div>
            <Label className="text-xs">Phone</Label>
            <Input value={recipientPhone} onChange={e => setRecipientPhone(e.target.value)}
              onKeyDown={onEnterNext} className="h-9 text-sm" />
          </div>
          <div className="md:col-span-1">
            <Label className="text-xs">Address</Label>
            <Input value={recipientAddress} onChange={e => setRecipientAddress(e.target.value)}
              onKeyDown={onEnterNext} className="h-9 text-sm" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Purpose</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-xs">Purpose</Label>
            <Select value={purpose} onValueChange={v => setPurpose(v as SOMPurpose)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(SOM_PURPOSE_LABELS) as SOMPurpose[]).map(p => (
                  <SelectItem key={p} value={p}>{SOM_PURPOSE_LABELS[p]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Notes</Label>
            <Textarea value={purposeNote} onChange={e => setPurposeNote(e.target.value)}
              placeholder="Optional context" className="min-h-[60px] text-sm" />
          </div>
          <div className="flex items-center gap-3">
            <input id="som-expect-return" type="checkbox" checked={expectReturn}
              onChange={e => setExpectReturn(e.target.checked)} />
            <Label htmlFor="som-expect-return" className="text-xs cursor-pointer">
              Sample expected to return
            </Label>
            {expectReturn && (
              <div className="flex items-center gap-2">
                <Label className="text-xs">Return Due</Label>
                <SmartDateInput value={returnDueDate} onChange={setReturnDueDate} />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm">Sample Items</CardTitle>
          <Button size="sm" variant="outline" onClick={addLine} className="h-7 text-xs">
            <Plus className="h-3.5 w-3.5 mr-1" /> Add Line
          </Button>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-xs text-muted-foreground py-6 text-center">
              Add at least one sample item line.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Item</TableHead>
                  <TableHead className="text-xs">Description</TableHead>
                  <TableHead className="text-xs w-20 text-right">Qty</TableHead>
                  <TableHead className="text-xs w-20">UOM</TableHead>
                  <TableHead className="w-8" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((it, i) => (
                  <TableRow key={it.id}>
                    <TableCell>
                      <Input value={it.item_name} onKeyDown={onEnterNext}
                        onChange={e => updateLine(i, { item_name: e.target.value })}
                        className="h-8 text-xs" />
                    </TableCell>
                    <TableCell>
                      <Input value={it.description ?? ''} onKeyDown={onEnterNext}
                        onChange={e => updateLine(i, { description: e.target.value || null })}
                        className="h-8 text-xs" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Input type="number" min={0} step="0.01"
                        value={it.qty} onKeyDown={onEnterNext}
                        onChange={e => updateLine(i, { qty: Number(e.target.value) || 0 })}
                        className="h-8 text-xs text-right font-mono" />
                    </TableCell>
                    <TableCell>
                      <Input value={it.uom ?? ''} onKeyDown={onEnterNext}
                        onChange={e => updateLine(i, { uom: e.target.value })}
                        className="h-8 text-xs" />
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
                  <span>{a}</span>
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

      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" onClick={() => persist('returned')} className="gap-2">
          <RotateCcw className="h-4 w-4" /> Mark Returned
        </Button>
        <Button variant="outline" onClick={() => persist('completed')} className="gap-2">
          <CheckCircle2 className="h-4 w-4" /> Mark Completed
        </Button>
        <Button onClick={handleDispatch} className="gap-2">
          <Send className="h-4 w-4" /> Dispatch Sample
        </Button>
      </div>
    </div>
  );
}
