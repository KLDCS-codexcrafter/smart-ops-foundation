/**
 * DemoOutwardMemo.tsx — SalesX Demo Outward (D-193)
 * Salesman → prospect full demo unit, mandatory return tracking.
 * ServiceDesk hook is Phase 1.5.5d (this file keeps it as `[JWT]` stub only).
 * [JWT] GET/POST/PATCH /api/salesx/demo-outward-memos
 */
import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { SmartDateInput } from '@/components/ui/smart-date-input';
import {
  Send, Plus, Trash2, Paperclip, RotateCcw, AlertTriangle,
  CheckCircle2, XCircle, PlayCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { onEnterNext, useCtrlS } from '@/lib/keyboard';
import { isPeriodLocked, periodLockMessage } from '@/lib/period-lock-engine';
import { samPersonsKey, type SAMPerson } from '@/types/sam-person';
import {
  demoOutwardMemosKey,
  DOM_STATUS_LABELS,
  DOM_RETURN_CONDITION_LABELS,
  type DemoOutwardMemo,
  type DemoOutwardMemoItem,
  type DOMStatus,
  type DOMPeriodDays,
  type DOMReturnCondition,
} from '@/types/demo-outward-memo';

interface Props { entityCode: string }

const todayISO = () => new Date().toISOString().split('T')[0];

function fyShort(): string {
  const d = new Date();
  const y = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
  return `${String(y).slice(2)}-${String(y + 1).slice(2)}`;
}

function nextMemoNo(entityCode: string): string {
  const key = `erp_doc_seq_DOM_${entityCode}`;
  // [JWT] GET /api/procurement/sequences/DOM/:entityCode
  const raw = localStorage.getItem(key);
  const seq = raw ? parseInt(raw, 10) + 1 : 1;
  // [JWT] PATCH /api/procurement/sequences/DOM/:entityCode
  localStorage.setItem(key, String(seq));
  return `DOM/${fyShort()}/${String(seq).padStart(4, '0')}`;
}

function ls<T>(key: string): T[] {
  try { return JSON.parse(localStorage.getItem(key) || '[]') as T[]; }
  catch { return []; }
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

const RAISE_BY_TYPES = ['salesman', 'agent', 'broker', 'reference'];
const PERIOD_OPTIONS: DOMPeriodDays[] = [14, 30, 60, 90];

export function DemoOutwardMemoPanel({ entityCode }: Props) {
  const [memoNo] = useState(() => nextMemoNo(entityCode));
  const [memoDate, setMemoDate] = useState(todayISO());

  const persons = useMemo(() =>
    ls<SAMPerson>(samPersonsKey(entityCode)).filter(p =>
      RAISE_BY_TYPES.includes(p.person_type) && p.is_active,
    ),
  [entityCode]);
  const [raisedById, setRaisedById] = useState<string>('');

  const [recipientName, setRecipientName] = useState('');
  const [recipientCompany, setRecipientCompany] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [recipientAddress, setRecipientAddress] = useState('');

  const [periodDays, setPeriodDays] = useState<DOMPeriodDays>(14);
  const [demoStartDate, setDemoStartDate] = useState<string>('');
  const demoEndDate = useMemo(
    () => demoStartDate ? addDays(demoStartDate, periodDays) : '',
    [demoStartDate, periodDays],
  );

  const [items, setItems] = useState<DemoOutwardMemoItem[]>([]);
  const updateLine = (idx: number, patch: Partial<DemoOutwardMemoItem>) => {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, ...patch } : it));
  };
  const removeLine = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));
  const addLine = () => setItems(prev => [...prev, {
    id: `dom-it-${Date.now()}`,
    item_name: '', description: null, qty: 1, uom: 'NOS', serial_no: null,
    unit_value: 0, amount: 0,
  }]);

  const [attachments, setAttachments] = useState<string[]>([]);
  const handleAddAttachment = () => {
    const name = prompt('Attachment name (e.g. demo_unit_photo.jpg)');
    if (name && name.trim()) setAttachments(prev => [...prev, name.trim()]);
  };
  const removeAttachment = (idx: number) =>
    setAttachments(prev => prev.filter((_, i) => i !== idx));

  // Overdue badge — only meaningful AFTER persistence; here we surface it
  // for the user once a start date is set and end date is past.
  const isOverdue = useMemo(
    () => !!demoEndDate && demoEndDate < todayISO(),
    [demoEndDate],
  );

  const validate = useCallback((): string | null => {
    if (!raisedById) return 'Select the person raising this memo';
    if (!recipientName.trim()) return 'Recipient name is required';
    if (items.length === 0) return 'Add at least one item line';
    if (items.some(it => !it.item_name.trim())) return 'Every line must have an item name';
    if (items.some(it => it.qty <= 0)) return 'Item quantity must be positive';
    return null;
  }, [raisedById, recipientName, items]);

  const persist = useCallback((
    status: DOMStatus,
    extras?: Partial<DemoOutwardMemo>,
  ) => {
    const err = validate();
    if (err) { toast.error(err); return; }
    const person = persons.find(p => p.id === raisedById)!;
    const now = new Date().toISOString();
    const startISO = demoStartDate || (status === 'demo_active' || status === 'dispatched'
      ? todayISO() : null);
    const endISO = startISO ? addDays(startISO, periodDays) : null;
    const memo: DemoOutwardMemo = {
      id: `dom-${Date.now()}`,
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
      items,
      demo_period_days: periodDays,
      demo_start_date: startISO,
      demo_end_date: endISO,
      return_condition: null,
      returned_at: null,
      converted_so_no: null,
      converted_at: null,
      lost_reason: null,
      // [JWT] Phase 1.5.5d stub — service desk wiring deferred.
      service_desk_ticket_id: null,
      attachments,
      status,
      dispatched_at: (status === 'dispatched' || status === 'demo_active') ? now : null,
      // Sprint T-Phase-1.1.1p-v2 — party / godown / dispatch fields default empty.
      customer_id: null, customer_name: null,
      salesman_id: null, salesman_name: null,
      agent_id: null, agent_name: null,
      broker_id: null, broker_name: null,
      engineer_emp_id: null, engineer_name: null,
      outward_godown_id: null, outward_godown_name: null,
      issued_by_dispatch: false,
      dispatch_issued_at: null, dispatch_issued_by: null,
      // Sprint T-Phase-1.1.1q · Demo units are always refundable by nature.
      pending_expense_voucher: false,
      created_at: now,
      updated_at: now,
      ...extras,
    };
    const key = demoOutwardMemosKey(entityCode);
    // [JWT] GET /api/salesx/demo-outward-memos
    const list = ls<DemoOutwardMemo>(key);
    list.push(memo);
    // [JWT] POST /api/salesx/demo-outward-memos
    localStorage.setItem(key, JSON.stringify(list));
    toast.success(`Demo Outward ${memoNo} · ${DOM_STATUS_LABELS[status]}`);
    setRaisedById(''); setRecipientName(''); setRecipientCompany('');
    setRecipientPhone(''); setRecipientAddress('');
    setPeriodDays(14); setDemoStartDate('');
    setItems([]); setAttachments([]);
  }, [persons, raisedById, entityCode, memoNo, memoDate,
      recipientName, recipientCompany, recipientPhone, recipientAddress,
      periodDays, demoStartDate, items, attachments, validate]);

  const handleDispatch = useCallback(() => persist('dispatched'), [persist]);
  const handleStartDemo = useCallback(() => {
    if (!demoStartDate) setDemoStartDate(todayISO());
    persist('demo_active');
  }, [persist, demoStartDate]);
  const handleReturned = useCallback(() => {
    const cond = (prompt('Return condition (good / damaged / partial)', 'good') ?? '').trim().toLowerCase();
    if (!['good', 'damaged', 'partial'].includes(cond)) {
      toast.error('Invalid return condition');
      return;
    }
    persist('returned', {
      return_condition: cond as DOMReturnCondition,
      returned_at: new Date().toISOString(),
    });
  }, [persist]);
  const handleConverted = useCallback(() => {
    const so = (prompt('Sales Order No (e.g. SO/25-26/0001)') ?? '').trim();
    if (!so) { toast.error('SO number required to convert'); return; }
    persist('converted', {
      converted_so_no: so,
      converted_at: new Date().toISOString(),
    });
  }, [persist]);
  const handleLost = useCallback(() => {
    const reason = (prompt('Lost reason') ?? '').trim();
    if (!reason) { toast.error('Lost reason required'); return; }
    persist('lost', { lost_reason: reason });
  }, [persist]);

  useCtrlS(handleDispatch);

  // Sprint T-Phase-1.1.1p-v2 — read-only banner for last DOM issued by Dispatch.
  const existingDOMs = useMemo(() => ls<DemoOutwardMemo>(demoOutwardMemosKey(entityCode)), [entityCode]);
  const lastIssued = useMemo(
    () => existingDOMs.find(m => m.memo_no === memoNo && m.issued_by_dispatch) ?? null,
    [existingDOMs, memoNo],
  );

  return (
    <div className="space-y-4" data-keyboard-form>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Demo Outward Memo</h1>
          <p className="text-sm text-muted-foreground">
            Send a full demo unit to a prospect. Mandatory return tracking.
          </p>
        </div>
        <Badge variant="outline" className="font-mono text-xs">{memoNo}</Badge>
      </div>

      {lastIssued && (
        <Card className="border-blue-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              Last issued by Dispatch · {lastIssued.memo_no}
              <Badge variant="secondary" className="ml-2 text-[10px]">read-only</Badge>
              {(lastIssued.pending_expense_voucher ?? false) && (
                <Badge variant="outline" className="ml-2 text-[10px] bg-amber-500/10 text-amber-700 border-amber-500/30">
                  Phase 2: expense voucher pending
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
            <div><span className="text-muted-foreground">Customer: </span>{lastIssued.customer_name ?? '—'}</div>
            <div><span className="text-muted-foreground">Salesman: </span>{lastIssued.salesman_name ?? '—'}</div>
            <div><span className="text-muted-foreground">Agent / Broker: </span>{lastIssued.agent_name ?? lastIssued.broker_name ?? '—'}</div>
            <div><span className="text-muted-foreground">Engineer: </span>{lastIssued.engineer_name ?? '—'}</div>
            <div><span className="text-muted-foreground">Godown: </span>{lastIssued.outward_godown_name ?? '—'}</div>
            <div><span className="text-muted-foreground">Demo Period: </span>{lastIssued.demo_period_days} days</div>
          </CardContent>
        </Card>
      )}

      {isOverdue && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Demo Overdue</AlertTitle>
          <AlertDescription>
            Demo end date ({demoEndDate}) has passed. Mark Returned, Converted, or Lost.
          </AlertDescription>
        </Alert>
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
            {memoDate && isPeriodLocked(memoDate, entityCode) && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-50 dark:bg-amber-950/30 p-2 mt-1">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <div className="text-[11px] text-amber-800 dark:text-amber-300">
                  <p className="font-medium">Period locked</p>
                  <p className="text-amber-700 dark:text-amber-400">
                    {periodLockMessage(memoDate, entityCode)} The downstream voucher will fail unless the period lock is lifted. You can still save this memo as a draft.
                  </p>
                </div>
              </div>
            )}
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
          <div>
            <Label className="text-xs">Address</Label>
            <Input value={recipientAddress} onChange={e => setRecipientAddress(e.target.value)}
              onKeyDown={onEnterNext} className="h-9 text-sm" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Demo Period</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <Label className="text-xs">Period</Label>
            <Select value={String(periodDays)}
              onValueChange={v => setPeriodDays(Number(v) as DOMPeriodDays)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PERIOD_OPTIONS.map(p => (
                  <SelectItem key={p} value={String(p)}>{p} days</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Demo Start (auto on Start Demo)</Label>
            <SmartDateInput value={demoStartDate} onChange={setDemoStartDate} />
          </div>
          <div>
            <Label className="text-xs">Demo End</Label>
            <Input value={demoEndDate} disabled className="h-9 text-sm font-mono" />
          </div>
          <div className="md:col-span-3">
            <Label className="text-xs">ServiceDesk Ticket</Label>
            {/* [JWT] Phase 1.5.5d stub — wiring deferred */}
            <Input value="—" disabled className="h-9 text-sm font-mono" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm">Demo Items</CardTitle>
          <Button size="sm" variant="outline" onClick={addLine} className="h-7 text-xs">
            <Plus className="h-3.5 w-3.5 mr-1" /> Add Line
          </Button>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-xs text-muted-foreground py-6 text-center">
              Add at least one demo item line.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Item</TableHead>
                  <TableHead className="text-xs">Description</TableHead>
                  <TableHead className="text-xs w-20 text-right">Qty</TableHead>
                  <TableHead className="text-xs w-20">UOM</TableHead>
                  <TableHead className="text-xs w-32">Serial No</TableHead>
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
                      <Input value={it.serial_no ?? ''} onKeyDown={onEnterNext}
                        onChange={e => updateLine(i, { serial_no: e.target.value || null })}
                        className="h-8 text-xs font-mono" />
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

      <p className="text-[10px] text-muted-foreground">
        Return conditions: {Object.values(DOM_RETURN_CONDITION_LABELS).join(' · ')}
      </p>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button variant="outline" onClick={handleLost} className="gap-2">
          <XCircle className="h-4 w-4" /> Mark Lost
        </Button>
        <Button variant="outline" onClick={handleConverted} className="gap-2">
          <CheckCircle2 className="h-4 w-4" /> Mark Converted
        </Button>
        <Button variant="outline" onClick={handleReturned} className="gap-2">
          <RotateCcw className="h-4 w-4" /> Mark Returned
        </Button>
        <Button variant="outline" onClick={handleStartDemo} className="gap-2">
          <PlayCircle className="h-4 w-4" /> Start Demo
        </Button>
        <Button onClick={handleDispatch} className="gap-2">
          <Send className="h-4 w-4" /> Dispatch
        </Button>
      </div>
    </div>
  );
}
