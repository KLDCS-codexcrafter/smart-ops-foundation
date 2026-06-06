/**
 * @file        src/pages/erp/taskflow/ChatGovernancePage.tsx
 * @purpose     S142 · TF-30d · Conversation retention, escalations, and export.
 * @sprint      Sprint 142 · T-TaskFlow-A641.6 · Block 4
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useEntityCode } from '@/hooks/useEntityCode';
import {
  upsertRetentionPolicy, listRetentionPolicies, evaluateRetention,
  archiveConversations, deleteConversationsPerPolicy,
  listConversationEscalations, resolveConversationEscalation,
} from '@/lib/operix-chat-engine';
import type { ChannelType, ConversationRetentionPolicy, ConversationEscalationRecord } from '@/types/operix-chat';
import { ShieldCheck, AlertTriangle } from 'lucide-react';

const CHANNELS: ChannelType[] = [
  'direct', 'group', 'department', 'task', 'customer', 'vendor', 'audit',
  'email_thread', 'whatsapp_thread', 'sms_thread',
];

export default function ChatGovernancePage(): JSX.Element {
  const { entityCode } = useEntityCode();
  const [policies, setPolicies] = useState<ConversationRetentionPolicy[]>([]);
  const [escalations, setEscalations] = useState<ConversationEscalationRecord[]>([]);
  const [channelType, setChannelType] = useState<string>('default');
  const [archiveAfterDays, setArchiveAfterDays] = useState<string>('90');
  const [retentionDays, setRetentionDays] = useState<string>('365');
  const [allowExport, setAllowExport] = useState<boolean>(true);
  const [allowDelete, setAllowDelete] = useState<boolean>(false);

  const refresh = useCallback(() => {
    setPolicies(listRetentionPolicies(entityCode));
    setEscalations(listConversationEscalations(entityCode));
  }, [entityCode]);

  useEffect(() => { refresh(); }, [refresh]);

  // `policies` is a reactivity tripwire: evaluateRetention reads the store directly, so we
  // include the state slice in deps to re-run on mutation. `void` consumes the dep cleanly.
  const evaluation = useMemo(() => { void policies; return evaluateRetention(entityCode); }, [entityCode, policies]);

  const onSavePolicy = (): void => {
    try {
      upsertRetentionPolicy(entityCode, {
        channelType: channelType === 'default' ? null : (channelType as ChannelType),
        archiveAfterDays: archiveAfterDays.trim() ? Number(archiveAfterDays) : null,
        retentionDays: retentionDays.trim() ? Number(retentionDays) : null,
        allowExport, allowDelete,
        isActive: true,
      });
      toast.success('Retention policy saved');
      refresh();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed'); }
  };

  const onRunArchive = (): void => {
    const n = archiveConversations(entityCode, evaluation.toArchive.map((a) => a.conversationId));
    toast.success(`Archived ${n} conversation(s)`);
    refresh();
  };

  const onRunDelete = (): void => {
    try {
      const allowed = evaluation.toDelete.filter((d) => d.allowDelete).map((d) => d.conversationId);
      const n = deleteConversationsPerPolicy(entityCode, allowed);
      toast.success(`Soft-deleted ${n} conversation(s)`);
      refresh();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed'); }
  };

  const onResolveEsc = (id: string): void => {
    try { resolveConversationEscalation(entityCode, id); toast.success('Escalation resolved'); refresh(); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Failed'); }
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold">Chat Governance</h1>
        <p className="text-sm text-muted-foreground">
          Retention policies, archive/delete evaluation, and conversation escalations.
        </p>
      </div>

      <Tabs defaultValue="policies">
        <TabsList>
          <TabsTrigger value="policies">Retention Policies</TabsTrigger>
          <TabsTrigger value="run">Run Retention</TabsTrigger>
          <TabsTrigger value="escalations">
            Escalations
            {escalations.filter((e) => e.status === 'open').length > 0 && (
              <Badge variant="destructive" className="ml-2">{escalations.filter((e) => e.status === 'open').length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="policies" className="space-y-4 mt-4">
          <Card className="glass-card rounded-2xl">
            <CardHeader><CardTitle className="text-base">New / update policy</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Channel scope</Label>
                  <Select value={channelType} onValueChange={setChannelType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Default (all channels)</SelectItem>
                      {CHANNELS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Archive after (days)</Label>
                  <Input type="number" value={archiveAfterDays} onChange={(e) => setArchiveAfterDays(e.target.value)} className="rounded-lg font-mono" />
                </div>
                <div className="space-y-2">
                  <Label>Retention (days)</Label>
                  <Input type="number" value={retentionDays} onChange={(e) => setRetentionDays(e.target.value)} className="rounded-lg font-mono" />
                </div>
                <div className="flex items-center gap-6 pt-6">
                  <div className="flex items-center gap-2">
                    <Switch checked={allowExport} onCheckedChange={setAllowExport} id="ae" />
                    <Label htmlFor="ae">Allow export</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={allowDelete} onCheckedChange={setAllowDelete} id="ad" />
                    <Label htmlFor="ad">Allow delete</Label>
                  </div>
                </div>
              </div>
              <Button onClick={onSavePolicy}><ShieldCheck className="h-4 w-4 mr-2" />Save policy</Button>
            </CardContent>
          </Card>

          <Card className="glass-card rounded-2xl">
            <CardHeader><CardTitle className="text-base">Active policies</CardTitle></CardHeader>
            <CardContent>
              {policies.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">No policies defined yet.</p>
              ) : (
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Channel</TableHead><TableHead>Archive after</TableHead><TableHead>Retention</TableHead>
                    <TableHead>Export</TableHead><TableHead>Delete</TableHead><TableHead>Active</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {policies.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-mono text-xs">{p.channelType ?? 'default'}</TableCell>
                        <TableCell className="font-mono text-xs">{p.archiveAfterDays ?? '—'}</TableCell>
                        <TableCell className="font-mono text-xs">{p.retentionDays ?? '—'}</TableCell>
                        <TableCell>{p.allowExport ? <Badge variant="secondary">yes</Badge> : <Badge variant="outline">no</Badge>}</TableCell>
                        <TableCell>{p.allowDelete ? <Badge variant="destructive">yes</Badge> : <Badge variant="outline">no</Badge>}</TableCell>
                        <TableCell>{p.isActive ? <Badge>active</Badge> : <Badge variant="outline">inactive</Badge>}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="run" className="space-y-4 mt-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="glass-card rounded-2xl">
              <CardHeader><CardTitle className="text-base">To archive ({evaluation.toArchive.length})</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {evaluation.toArchive.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nothing due for archival.</p>
                ) : (
                  <>
                    <ul className="text-xs font-mono space-y-1 max-h-48 overflow-auto">
                      {evaluation.toArchive.map((a) => <li key={a.conversationId}>{a.conversationId.slice(0, 14)}… · {a.reason}</li>)}
                    </ul>
                    <Button size="sm" onClick={onRunArchive}>Archive now</Button>
                  </>
                )}
              </CardContent>
            </Card>
            <Card className="glass-card rounded-2xl">
              <CardHeader><CardTitle className="text-base">To delete ({evaluation.toDelete.length})</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {evaluation.toDelete.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nothing due for deletion.</p>
                ) : (
                  <>
                    <ul className="text-xs font-mono space-y-1 max-h-48 overflow-auto">
                      {evaluation.toDelete.map((d) => (
                        <li key={d.conversationId}>
                          {d.conversationId.slice(0, 14)}… · {d.reason} {d.allowDelete ? '' : '(blocked: policy forbids)'}
                        </li>
                      ))}
                    </ul>
                    <Button size="sm" variant="destructive" onClick={onRunDelete}>Soft-delete (policy-allowed only)</Button>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="escalations" className="space-y-4 mt-4">
          <Card className="glass-card rounded-2xl">
            <CardHeader><CardTitle className="text-base">Conversation escalations</CardTitle></CardHeader>
            <CardContent>
              {escalations.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">No escalations raised yet.</p>
              ) : (
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Conversation</TableHead><TableHead>Reason</TableHead>
                    <TableHead>Raised by</TableHead><TableHead>Raised at</TableHead>
                    <TableHead>Status</TableHead><TableHead className="text-right">Action</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {escalations.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell className="font-mono text-xs">{e.conversationId.slice(0, 14)}…</TableCell>
                        <TableCell className="max-w-[300px] truncate">{e.reason}</TableCell>
                        <TableCell className="font-mono text-xs">{e.raisedByUserId}</TableCell>
                        <TableCell className="font-mono text-xs">{new Date(e.raisedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</TableCell>
                        <TableCell>
                          {e.status === 'open'
                            ? <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />open</Badge>
                            : <Badge variant="outline">resolved</Badge>}
                        </TableCell>
                        <TableCell className="text-right">
                          {e.status === 'open' && (
                            <Button size="sm" variant="outline" onClick={() => onResolveEsc(e.id)}>Resolve</Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
