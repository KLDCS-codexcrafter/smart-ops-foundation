/**
 * @file        src/pages/erp/taskflow/OperixChatChannelsPage.tsx
 * @purpose     OperixChat Channels · grouped channel list + new-channel dialog (TF-24 ten types)
 * @sprint      Sprint 140 · T-TaskFlow-A641.4 · OperixChat MVP · TF-16 mount point #2
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Plus, Hash } from 'lucide-react';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useEmployees } from '@/hooks/useEmployees';
import { createConversation, listConversations, archiveConversation } from '@/lib/operix-chat-engine';
import type { ChannelType, Conversation } from '@/types/operix-chat';

const CHANNEL_TYPES: ChannelType[] = [
  'direct', 'group', 'department',
  'task', 'customer', 'vendor', 'audit',
  'email_thread', 'whatsapp_thread', 'sms_thread',
];

export default function OperixChatChannelsPage(): JSX.Element {
  const { entityCode } = useEntityCode();
  const user = useCurrentUser();
  const userId = user?.id ?? 'demo-user';
  const { employees } = useEmployees();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<{ channelType: ChannelType; title: string; participantIds: string[] }>({
    channelType: 'group', title: '', participantIds: [userId],
  });

  const refresh = useCallback(() => {
    setConversations(listConversations(entityCode, { includeArchived: true }));
  }, [entityCode]);

  useEffect(() => { refresh(); }, [refresh]);

  const grouped = useMemo(() => {
    const map = new Map<ChannelType, Conversation[]>();
    for (const t of CHANNEL_TYPES) map.set(t, []);
    for (const c of conversations) map.get(c.channelType)?.push(c);
    return map;
  }, [conversations]);

  const onCreate = (): void => {
    try {
      const participants = Array.from(new Set([userId, ...form.participantIds]));
      if (form.channelType === 'direct' && participants.length !== 2) {
        toast.error('Direct conversations require exactly one other participant');
        return;
      }
      createConversation(entityCode, {
        channelType: form.channelType,
        title: form.title.trim() || undefined,
        ownerId: userId,
        createdByUserId: userId,
        participantUserIds: participants,
      });
      setOpen(false);
      setForm({ channelType: 'group', title: '', participantIds: [userId] });
      refresh();
      toast.success('Channel created');
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Channels</h1>
          <p className="text-sm text-muted-foreground">Organisation-owned conversations across {CHANNEL_TYPES.length} channel types.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-lg gap-2"><Plus className="h-4 w-4" /> New channel</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create channel</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Channel type</Label>
                <Select value={form.channelType} onValueChange={(v) => setForm((f) => ({ ...f, channelType: v as ChannelType }))}>
                  <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CHANNEL_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Title</Label>
                <Input className="rounded-lg" value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Optional — auto-titled if blank" />
              </div>
              <div>
                <Label className="text-xs">Add participant</Label>
                <Select value="" onValueChange={(v) => {
                  if (!v) return;
                  setForm((f) => f.participantIds.includes(v) ? f : { ...f, participantIds: [...f.participantIds, v] });
                }}>
                  <SelectTrigger className="rounded-lg"><SelectValue placeholder="Select employee…" /></SelectTrigger>
                  <SelectContent>
                    {employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.displayName}</SelectItem>)}
                  </SelectContent>
                </Select>
                <div className="flex flex-wrap gap-1 mt-2">
                  {form.participantIds.map((id) => (
                    <Badge key={id} variant="secondary" className="font-mono text-[10px]">
                      {employees.find((e) => e.id === id)?.displayName ?? id}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)} className="rounded-lg">Cancel</Button>
              <Button onClick={onCreate} className="rounded-lg">Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
        {CHANNEL_TYPES.map((t) => {
          const list = grouped.get(t) ?? [];
          return (
            <Card key={t} className="rounded-2xl glass-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Hash className="h-4 w-4" /> {t}
                  <Badge variant="secondary" className="ml-auto font-mono">{list.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {list.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No channels.</p>
                ) : list.map((c) => (
                  <div key={c.id} className="flex items-center justify-between text-xs">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{c.title}</p>
                      <p className="font-mono text-[10px] text-muted-foreground">
                        {c.participants.filter((p) => !p.removedAt).length} active{c.isArchived && ' · archived'}
                      </p>
                    </div>
                    {!c.isArchived && (
                      <Button variant="ghost" size="sm" className="h-6 text-[10px]"
                        onClick={() => { archiveConversation(entityCode, c.id); refresh(); }}>
                        Archive
                      </Button>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
