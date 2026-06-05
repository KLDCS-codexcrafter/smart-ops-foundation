/**
 * @file        src/pages/erp/frontdesk/mail/MailInwardPage.tsx
 * @sprint      Sprint 147 + S148.T1 hotfix · Mail Room — Inward (TDL-parity UI)
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useEmployees } from '@/hooks/useEmployees';
import {
  createInwardMail, acknowledgeInwardMail, getUnclaimedInward, listMail,
  backfillMailNumbers, updateMail,
} from '@/lib/frontdesk-records-engine';
import type { MailItem, MailKind } from '@/types/frontdesk';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Pencil, Printer, FileDown, Hash } from 'lucide-react';

const KINDS: { value: MailKind; label: string }[] = [
  { value: 'letter', label: 'Letter' }, { value: 'document', label: 'Document' },
  { value: 'parcel', label: 'Parcel' }, { value: 'gift', label: 'Gift' },
];

import { MailEditDialog, MAIL_INWARD_CSV_COLUMNS } from './mail-shared';

export { MAIL_INWARD_CSV_COLUMNS, MAIL_EDITABLE_KEYS } from './mail-shared';


function firstOfMonth(): string {
  const d = new Date(); d.setUTCDate(1);
  return d.toISOString().slice(0, 10);
}
function todayISO(): string { return new Date().toISOString().slice(0, 10); }

function csvEscape(s: string | number | null | undefined): string {
  const v = s == null ? '' : String(s);
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export function MailInwardPage(): JSX.Element {
  const { entityCode } = useEntityCode();
  const user = useCurrentUser();
  const { employees } = useEmployees();
  const empOptions = employees.map((e) => ({ id: e.id, name: e.displayName }));
  const [kind, setKind] = useState<MailKind | 'all'>('all');
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState<string>(firstOfMonth());
  const [to, setTo] = useState<string>(todayISO());
  const [openCreate, setOpenCreate] = useState(false);
  const [ackTarget, setAckTarget] = useState<MailItem | null>(null);
  const [editTarget, setEditTarget] = useState<MailItem | null>(null);
  const [overrideReason, setOverrideReason] = useState('');

  const compute = useCallback((): MailItem[] => {
    const fromIso = from ? `${from}T00:00:00.000Z` : undefined;
    const toIso = to ? `${to}T23:59:59.999Z` : undefined;
    const items = listMail(entityCode, { direction: 'inward', dateFromISO: fromIso, dateToISO: toIso });
    const k = kind === 'all' ? items : items.filter((m) => m.kind === kind);
    const needle = search.trim().toLowerCase();
    return needle
      ? k.filter((m) =>
          (m.mailNo ?? '').toLowerCase().includes(needle) ||
          m.description.toLowerCase().includes(needle) ||
          (m.fromText ?? '').toLowerCase().includes(needle) ||
          (m.toEmployeeName ?? '').toLowerCase().includes(needle))
      : k;
  }, [entityCode, kind, search, from, to]);

  const [rows, setRows] = useState<MailItem[]>(() => compute());
  const reload = useCallback(() => setRows(compute()), [compute]);
  useEffect(() => { reload(); }, [reload]);

  const unclaimed = useMemo(() => getUnclaimedInward(entityCode), [entityCode, rows]);

  function ageBadge(m: MailItem): JSX.Element {
    if (m.acknowledgedAt) return <Badge variant="outline">acknowledged</Badge>;
    const days = Math.floor((Date.now() - new Date(m.receivedAt ?? m.createdAt).getTime()) / 86400000);
    if (days >= 3) return <Badge variant="destructive">{days}d unclaimed</Badge>;
    return <Badge variant="secondary">{days}d unclaimed</Badge>;
  }

  function handleAck(): void {
    if (!ackTarget) return;
    try {
      acknowledgeInwardMail(entityCode, ackTarget.id, user?.id ?? 'reception',
        overrideReason ? { overrideReason } : {});
      toast.success('Acknowledged');
      setAckTarget(null); setOverrideReason(''); reload();
    } catch (e) { toast.error((e as Error).message); }
  }

  function handleAssignNumbers(): void {
    try {
      const n = backfillMailNumbers(entityCode, user?.id ?? 'reception');
      toast.success(n > 0 ? `Assigned ${n} mail numbers` : 'All mail already numbered');
      reload();
    } catch (e) { toast.error((e as Error).message); }
  }

  function exportCSV(): void {
    const header = MAIL_INWARD_CSV_COLUMNS.join(',');
    const lines = rows.map((m) => [
      m.mailNo ?? '',
      m.receivedAt ? new Date(m.receivedAt).toLocaleString('en-IN') : '',
      m.kind,
      m.description,
      m.kind === 'gift' ? (m.giftDeclaredByEmployeeId ?? '') : (m.toEmployeeName ?? ''),
      m.fromText ?? m.fromPartyId ?? '',
      m.acknowledgedAt ? 'acknowledged' : 'unclaimed',
    ].map(csvEscape).join(','));
    const blob = new Blob([[header, ...lines].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `mail-inward-${from}-${to}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-6 space-y-4 print:p-2">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between print:hidden">
          <CardTitle>Inward Mail · {unclaimed.length} unclaimed</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleAssignNumbers}>
              <Hash className="h-3 w-3 mr-1" /> Assign numbers
            </Button>
            <Button variant="outline" size="sm" onClick={exportCSV}>
              <FileDown className="h-3 w-3 mr-1" /> CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="h-3 w-3 mr-1" /> Print
            </Button>
            <Button onClick={() => setOpenCreate(true)}>Log inward</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3 print:hidden">
            <div>
              <Label className="text-xs">From</Label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-8 w-40" />
            </div>
            <div>
              <Label className="text-xs">To</Label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-8 w-40" />
            </div>
            <div className="flex-1 min-w-[200px]">
              <Label className="text-xs">Search</Label>
              <Input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="mail no / description / addressee / from" className="h-8" />
            </div>
          </div>
          <Tabs value={kind} onValueChange={(v) => setKind(v as MailKind | 'all')}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              {KINDS.map((k) => <TabsTrigger key={k.value} value={k.value}>{k.label}</TabsTrigger>)}
            </TabsList>
          </Tabs>
          {rows.length === 0 ? (
            <div className="text-sm text-muted-foreground p-8 text-center">No inward mail in range.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mail No</TableHead>
                  <TableHead>Received</TableHead><TableHead>Kind</TableHead>
                  <TableHead>Description</TableHead><TableHead>Addressee / Declared by</TableHead>
                  <TableHead>From</TableHead><TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-mono text-xs">{m.mailNo ?? '—'}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {m.receivedAt ? new Date(m.receivedAt).toLocaleString('en-IN') : '—'}
                    </TableCell>
                    <TableCell><Badge variant="outline">{m.kind}</Badge></TableCell>
                    <TableCell>
                      <div className="text-sm">{m.description}</div>
                      {m.kind === 'gift' && m.giftApproxValue != null && (
                        <div className="text-xs text-muted-foreground font-mono">approx ₹{m.giftApproxValue}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {m.kind === 'gift'
                        ? (empOptions.find((e) => e.id === m.giftDeclaredByEmployeeId)?.name ?? m.giftDeclaredByEmployeeId ?? '—')
                        : (m.toEmployeeName ?? '—')}
                    </TableCell>
                    <TableCell className="text-sm">{m.fromText ?? m.fromPartyId ?? '—'}</TableCell>
                    <TableCell>{ageBadge(m)}</TableCell>
                    <TableCell className="text-right space-x-1 print:hidden">
                      <Button size="sm" variant="ghost" onClick={() => setEditTarget(m)} title="Edit descriptive fields">
                        <Pencil className="h-3 w-3" />
                      </Button>
                      {!m.acknowledgedAt && (
                        <Button size="sm" variant="outline" onClick={() => setAckTarget(m)}>Ack</Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <InwardCreateDialog
        open={openCreate} onClose={() => { setOpenCreate(false); reload(); }}
        entityCode={entityCode} userId={user?.id ?? 'reception'}
        employees={empOptions}
      />

      <MailEditDialog
        target={editTarget}
        onClose={() => { setEditTarget(null); reload(); }}
        entityCode={entityCode}
        userId={user?.id ?? 'reception'}
      />

      <Dialog open={!!ackTarget} onOpenChange={(v) => { if (!v) { setAckTarget(null); setOverrideReason(''); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Acknowledge inward mail</DialogTitle></DialogHeader>
          {ackTarget && (
            <div className="space-y-3">
              <div className="text-sm">{ackTarget.description}</div>
              <div className="text-xs text-muted-foreground">
                Addressee: {ackTarget.toEmployeeName ?? '—'} ({ackTarget.toEmployeeId ?? '—'})
              </div>
              <div>
                <Label>Reception override reason (leave blank for addressee self-ack)</Label>
                <Input value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="e.g. addressee on leave, parcel handed to assistant" />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setAckTarget(null); setOverrideReason(''); }}>Cancel</Button>
            <Button onClick={handleAck}>Acknowledge</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


interface CreateProps {
  open: boolean; onClose: () => void;
  entityCode: string; userId: string;
  employees: { id: string; name: string }[];
}
function InwardCreateDialog({ open, onClose, entityCode, userId, employees }: CreateProps): JSX.Element {
  const [kind, setKind] = useState<MailKind>('letter');
  const [description, setDescription] = useState('');
  const [fromText, setFromText] = useState('');
  const [toEmployeeId, setToEmployeeId] = useState<string>('');
  const [giftGiverText, setGiftGiverText] = useState('');
  const [giftDeclaredBy, setGiftDeclaredBy] = useState<string>('');
  const [giftValue, setGiftValue] = useState('');
  const [notes, setNotes] = useState('');

  function submit(): void {
    try {
      const emp = employees.find((e) => e.id === toEmployeeId);
      const declared = employees.find((e) => e.id === giftDeclaredBy);
      createInwardMail(entityCode, {
        entityId: entityCode, createdByUserId: userId,
        kind, description, fromText: fromText || null,
        toEmployeeId: kind === 'gift' ? null : (emp?.id ?? null),
        toEmployeeName: kind === 'gift' ? null : (emp?.name ?? null),
        giftGiverText: kind === 'gift' ? (giftGiverText || null) : null,
        giftDeclaredByEmployeeId: kind === 'gift' ? (declared?.id ?? null) : null,
        giftApproxValue: kind === 'gift' && giftValue ? Number(giftValue) : null,
        notes: notes || null,
      });
      toast.success('Inward mail logged');
      setKind('letter'); setDescription(''); setFromText(''); setToEmployeeId('');
      setGiftGiverText(''); setGiftDeclaredBy(''); setGiftValue(''); setNotes('');
      onClose();
    } catch (e) { toast.error((e as Error).message); }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Log inward mail</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Kind</Label>
            <Select value={kind} onValueChange={(v) => setKind(v as MailKind)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{KINDS.map((k) => <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Description</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} /></div>
          <div><Label>From (sender)</Label>
            <Input value={fromText} onChange={(e) => setFromText(e.target.value)} placeholder="Free-text" /></div>
          {kind === 'gift' ? (
            <>
              <div><Label>Gift giver</Label>
                <Input value={giftGiverText} onChange={(e) => setGiftGiverText(e.target.value)} /></div>
              <div><Label>Declared by (employee)</Label>
                <Select value={giftDeclaredBy} onValueChange={setGiftDeclaredBy}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                  </SelectContent>
                </Select></div>
              <div><Label>Approx value (₹)</Label>
                <Input type="number" value={giftValue} onChange={(e) => setGiftValue(e.target.value)} /></div>
            </>
          ) : (
            <div><Label>Addressee (employee)</Label>
              <Select value={toEmployeeId} onValueChange={setToEmployeeId}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                </SelectContent>
              </Select></div>
          )}
          <div><Label>Notes (tracking #, AWB, etc.)</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={submit}>Log</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
