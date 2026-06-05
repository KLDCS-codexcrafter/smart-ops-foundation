/**
 * @file        src/pages/erp/frontdesk/mail/MailOutwardPage.tsx
 * @sprint      Sprint 147 + S148.T1 hotfix · Mail Room — Outward (TDL-parity UI)
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import {
  createOutwardMail, markSent, confirmDelivery, getUnconfirmedOutward, listMail,
  backfillMailNumbers,
} from '@/lib/frontdesk-records-engine';
import type { DispatchMode, MailItem, MailKind } from '@/types/frontdesk';
import { MailEditDialog } from './mail-shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { AlertTriangle, Pencil, Printer, FileDown, Hash } from 'lucide-react';

const MODES: { value: DispatchMode; label: string }[] = [
  { value: 'rpad', label: 'RPAD' }, { value: 'speed_post', label: 'Speed Post' },
  { value: 'courier', label: 'Courier' }, { value: 'hand_delivery', label: 'Hand Delivery' },
];

import { MAIL_OUTWARD_CSV_COLUMNS } from './mail-constants';

function firstOfMonth(): string {
  const d = new Date(); d.setUTCDate(1);
  return d.toISOString().slice(0, 10);
}
function todayISO(): string { return new Date().toISOString().slice(0, 10); }
function csvEscape(s: string | number | null | undefined): string {
  const v = s == null ? '' : String(s);
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export function MailOutwardPage(): JSX.Element {
  const { entityCode } = useEntityCode();
  const user = useCurrentUser();
  const [openCreate, setOpenCreate] = useState(false);
  const [sendTarget, setSendTarget] = useState<MailItem | null>(null);
  const [editTarget, setEditTarget] = useState<MailItem | null>(null);
  const [mode, setMode] = useState<DispatchMode>('courier');
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState<string>(firstOfMonth());
  const [to, setTo] = useState<string>(todayISO());

  const compute = useCallback((): MailItem[] => {
    const fromIso = from ? `${from}T00:00:00.000Z` : undefined;
    const toIso = to ? `${to}T23:59:59.999Z` : undefined;
    const items = listMail(entityCode, { direction: 'outward', dateFromISO: fromIso, dateToISO: toIso });
    const needle = search.trim().toLowerCase();
    return needle
      ? items.filter((m) =>
          (m.mailNo ?? '').toLowerCase().includes(needle) ||
          m.description.toLowerCase().includes(needle) ||
          (m.toText ?? '').toLowerCase().includes(needle))
      : items;
  }, [entityCode, search, from, to]);

  const [rows, setRows] = useState<MailItem[]>(() => compute());
  const reload = useCallback(() => setRows(compute()), [compute]);
  useEffect(() => { reload(); }, [reload]);

  const ageing = getUnconfirmedOutward(entityCode);

  function statusBadge(m: MailItem): JSX.Element {
    if (m.deliveryConfirmed) return <Badge variant="outline">delivered</Badge>;
    if (m.sentAt) return <Badge variant="secondary">sent · awaiting confirmation</Badge>;
    return <Badge variant="default">pending</Badge>;
  }

  function handleSend(): void {
    if (!sendTarget) return;
    try {
      markSent(entityCode, sendTarget.id, { dispatchMode: mode });
      toast.success('Marked sent');
      setSendTarget(null); reload();
    } catch (e) { toast.error((e as Error).message); }
  }

  function handleConfirm(m: MailItem): void {
    try { confirmDelivery(entityCode, m.id); toast.success('Delivery confirmed'); reload(); }
    catch (e) { toast.error((e as Error).message); }
  }

  function handleAssignNumbers(): void {
    try {
      const n = backfillMailNumbers(entityCode, user?.id ?? 'reception');
      toast.success(n > 0 ? `Assigned ${n} mail numbers` : 'All mail already numbered');
      reload();
    } catch (e) { toast.error((e as Error).message); }
  }

  function exportCSV(): void {
    const header = MAIL_OUTWARD_CSV_COLUMNS.join(',');
    const lines = rows.map((m) => {
      const ageRow = ageing.find((a) => a.mail.id === m.id);
      return [
        m.mailNo ?? '',
        new Date(m.createdAt).toLocaleDateString('en-IN'),
        m.kind,
        m.description,
        m.toText ?? m.toPartyId ?? '',
        m.dispatchMode ?? '',
        m.deliveryConfirmed ? 'delivered' : (m.sentAt ? 'sent' : 'pending'),
        ageRow?.missingProofWarn ? 'MISSING' : (m.proofOfDispatchDocId ? 'attached' : ''),
      ].map(csvEscape).join(',');
    });
    const blob = new Blob([[header, ...lines].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `mail-outward-${from}-${to}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-6 space-y-4 print:p-2">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between print:hidden">
          <CardTitle>Outward Mail · {ageing.length} unconfirmed</CardTitle>
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
            <Button onClick={() => setOpenCreate(true)}>New outward</Button>
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
                placeholder="mail no / description / recipient" className="h-8" />
            </div>
          </div>
          {rows.length === 0 ? (
            <div className="text-sm text-muted-foreground p-8 text-center">No outward mail in range.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mail No</TableHead>
                  <TableHead>Created</TableHead><TableHead>Kind</TableHead>
                  <TableHead>Description</TableHead><TableHead>Recipient</TableHead>
                  <TableHead>Mode</TableHead><TableHead>Status</TableHead>
                  <TableHead>Proof</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((m) => {
                  const ageRow = ageing.find((a) => a.mail.id === m.id);
                  return (
                    <TableRow key={m.id}>
                      <TableCell className="font-mono text-xs">{m.mailNo ?? '—'}</TableCell>
                      <TableCell className="font-mono text-xs">{new Date(m.createdAt).toLocaleDateString('en-IN')}</TableCell>
                      <TableCell><Badge variant="outline">{m.kind}</Badge></TableCell>
                      <TableCell className="text-sm">{m.description}</TableCell>
                      <TableCell className="text-sm">{m.toText ?? m.toPartyId ?? '—'}</TableCell>
                      <TableCell className="text-sm">{m.dispatchMode ?? '—'}</TableCell>
                      <TableCell>
                        {statusBadge(m)}
                        {ageRow && ageRow.ageDays > 0 && (
                          <span className="ml-1 text-xs text-muted-foreground font-mono">{ageRow.ageDays}d</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {ageRow?.missingProofWarn ? (
                          <Badge variant="destructive" className="gap-1">
                            <AlertTriangle className="h-3 w-3" /> missing proof
                          </Badge>
                        ) : (m.proofOfDispatchDocId ? <Badge variant="outline">attached</Badge> : '—')}
                      </TableCell>
                      <TableCell className="text-right space-x-1 print:hidden">
                        <Button size="sm" variant="ghost" onClick={() => setEditTarget(m)} title="Edit descriptive fields">
                          <Pencil className="h-3 w-3" />
                        </Button>
                        {!m.sentAt && (
                          <Button size="sm" variant="outline" onClick={() => setSendTarget(m)}>Sent</Button>
                        )}
                        {m.sentAt && !m.deliveryConfirmed && (
                          <Button size="sm" variant="outline" onClick={() => handleConfirm(m)}>Confirm</Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <OutwardCreateDialog
        open={openCreate} onClose={() => { setOpenCreate(false); reload(); }}
        entityCode={entityCode} userId={user?.id ?? 'reception'}
      />

      <MailEditDialog
        target={editTarget}
        onClose={() => { setEditTarget(null); reload(); }}
        entityCode={entityCode}
        userId={user?.id ?? 'reception'}
      />

      <Dialog open={!!sendTarget} onOpenChange={(v) => { if (!v) setSendTarget(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Mark sent</DialogTitle></DialogHeader>
          {sendTarget && (
            <div className="space-y-3">
              <div className="text-sm">{sendTarget.description}</div>
              <div>
                <Label>Dispatch mode</Label>
                <Select value={mode} onValueChange={(v) => setMode(v as DispatchMode)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{MODES.map((k) => <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground">
                Proof-of-dispatch can be attached after marking sent. RPAD / Speed Post will warn if proof is missing &gt; 2 days.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSendTarget(null)}>Cancel</Button>
            <Button onClick={handleSend}>Mark sent</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface CreateProps { open: boolean; onClose: () => void; entityCode: string; userId: string }
function OutwardCreateDialog({ open, onClose, entityCode, userId }: CreateProps): JSX.Element {
  const [kind, setKind] = useState<MailKind>('letter');
  const [description, setDescription] = useState('');
  const [toText, setToText] = useState('');
  const [awb, setAwb] = useState('');
  const [courierName, setCourierName] = useState('');

  function submit(): void {
    try {
      createOutwardMail(entityCode, {
        entityId: entityCode, createdByUserId: userId, kind, description,
        toText: toText || null, awbDocketNo: awb || null, courierName: courierName || null,
      });
      toast.success('Outward mail logged');
      setKind('letter'); setDescription(''); setToText(''); setAwb(''); setCourierName('');
      onClose();
    } catch (e) { toast.error((e as Error).message); }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>New outward mail</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Kind</Label>
            <Select value={kind} onValueChange={(v) => setKind(v as MailKind)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="letter">Letter</SelectItem>
                <SelectItem value="document">Document</SelectItem>
                <SelectItem value="parcel">Parcel</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Description</Label><Input value={description} onChange={(e) => setDescription(e.target.value)} /></div>
          <div><Label>Recipient (free-text)</Label><Input value={toText} onChange={(e) => setToText(e.target.value)} /></div>
          <div><Label>Courier name</Label><Input value={courierName} onChange={(e) => setCourierName(e.target.value)} /></div>
          <div><Label>AWB / Docket #</Label><Input value={awb} onChange={(e) => setAwb(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={submit}>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
