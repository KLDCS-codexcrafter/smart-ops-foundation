/**
 * @file        src/pages/erp/taskflow/HandoverPage.tsx
 * @purpose     S142 · TF-35 · Handover Protocol — tasks + conversations + documents.
 * @sprint      Sprint 142 · T-TaskFlow-A641.6 · Block 4
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useEmployees } from '@/hooks/useEmployees';
import {
  generateHandoverPacket, executeHandover, listHandovers,
} from '@/lib/operix-handover-engine';
import type { HandoverPacket, HandoverRecord } from '@/types/handover';
import { ArrowRightLeft, FileSearch } from 'lucide-react';

export default function HandoverPage(): JSX.Element {
  const { entityCode } = useEntityCode();
  const user = useCurrentUser();
  const byUserId = user?.id ?? 'demo-user';
  const { employees } = useEmployees();
  const [fromId, setFromId] = useState<string>('');
  const [toId, setToId] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [removeAfter, setRemoveAfter] = useState<boolean>(false);
  const [packet, setPacket] = useState<HandoverPacket | null>(null);
  const [records, setRecords] = useState<HandoverRecord[]>([]);

  const refresh = useCallback(() => {
    setRecords(listHandovers(entityCode));
  }, [entityCode]);

  useEffect(() => { refresh(); }, [refresh]);

  const peopleOptions = useMemo(() => {
    return employees.map((e) => ({ id: e.id, name: e.displayName || e.id }));
  }, [employees]);

  const onPreview = (): void => {
    if (!fromId.trim()) { toast.error('Pick a "from" user'); return; }
    try {
      setPacket(generateHandoverPacket(entityCode, fromId.trim()));
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed'); }
  };

  const onExecute = (): void => {
    if (!fromId.trim() || !toId.trim()) { toast.error('Pick both users'); return; }
    if (fromId.trim() === toId.trim()) { toast.error('From and to must differ'); return; }
    try {
      const rec = executeHandover(entityCode, fromId.trim(), toId.trim(), byUserId, {
        removeFromConversationsAfterTransfer: removeAfter,
        note: note.trim() || null,
      });
      toast.success(`Handover ${rec.id} executed`);
      setPacket(null);
      refresh();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed'); }
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold">Handover Protocol</h1>
        <p className="text-sm text-muted-foreground">
          Transfer open tasks, owned conversations, and document references when a person exits or moves.
        </p>
      </div>

      <Card className="glass-card rounded-2xl">
        <CardHeader><CardTitle className="text-base">New handover</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>From user ID</Label>
              <Input value={fromId} onChange={(e) => setFromId(e.target.value)} placeholder="u-alice" className="rounded-lg font-mono" />
              {peopleOptions.length > 0 && (
                <p className="text-xs text-muted-foreground">e.g. {peopleOptions.slice(0, 3).map((p) => p.id).join(' · ')}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>To user ID</Label>
              <Input value={toId} onChange={(e) => setToId(e.target.value)} placeholder="u-bob" className="rounded-lg font-mono" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Note (optional)</Label>
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Reason for handover" className="rounded-lg" />
            </div>
            <div className="flex items-center gap-2 md:col-span-2">
              <Switch checked={removeAfter} onCheckedChange={setRemoveAfter} id="rm" />
              <Label htmlFor="rm" className="text-sm">Remove "from" user from conversations after ownership transfer</Label>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onPreview}><FileSearch className="h-4 w-4 mr-2" />Preview packet</Button>
            <Button onClick={onExecute} disabled={!packet}><ArrowRightLeft className="h-4 w-4 mr-2" />Execute handover</Button>
          </div>
        </CardContent>
      </Card>

      {packet && (
        <Card className="glass-card rounded-2xl">
          <CardHeader><CardTitle className="text-base">Handover packet preview</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <KpiCard label="Open tasks" value={packet.openTasks.length} />
              <KpiCard label="Owned conversations" value={packet.ownedConversations.length} />
              <KpiCard label="Owned documents" value={packet.ownedDocuments.length} />
            </div>
            {packet.openTasks.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Open tasks to reassign</p>
                <ul className="text-xs font-mono space-y-1 max-h-40 overflow-auto">
                  {packet.openTasks.map((t) => <li key={t.taskId}>{t.code} · {t.title} · {t.status}</li>)}
                </ul>
              </div>
            )}
            {packet.ownedConversations.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Conversations to transfer ownership</p>
                <ul className="text-xs font-mono space-y-1 max-h-40 overflow-auto">
                  {packet.ownedConversations.map((c) => <li key={c.conversationId}>{c.title} · {c.channelType} · {c.participantCount} members</li>)}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="glass-card rounded-2xl">
        <CardHeader><CardTitle className="text-base">Handover history</CardTitle></CardHeader>
        <CardContent>
          {records.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No handovers executed yet.</p>
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>From</TableHead><TableHead>To</TableHead>
                <TableHead>Tasks</TableHead><TableHead>Conversations</TableHead><TableHead>Documents</TableHead>
                <TableHead>Executed at</TableHead><TableHead>Note</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {records.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.fromUserId}</TableCell>
                    <TableCell className="font-mono text-xs">{r.toUserId}</TableCell>
                    <TableCell><Badge variant="outline" className="font-mono">{r.taskIds.length}</Badge></TableCell>
                    <TableCell><Badge variant="outline" className="font-mono">{r.conversationIds.length}</Badge></TableCell>
                    <TableCell><Badge variant="outline" className="font-mono">{r.documentIds.length}</Badge></TableCell>
                    <TableCell className="font-mono text-xs">{new Date(r.executedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[240px] truncate">{r.note ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: string | number }): JSX.Element {
  return (
    <Card className="glass-card rounded-2xl">
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold font-mono mt-1">{value}</p>
      </CardContent>
    </Card>
  );
}
