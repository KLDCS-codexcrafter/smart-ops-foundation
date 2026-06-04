/**
 * @file        src/pages/erp/taskflow/OperixChatInboxPage.tsx
 * @purpose     OperixChat Inbox · two-pane conversations list + thread view + composer
 * @sprint      Sprint 140 · T-TaskFlow-A641.4 · OperixChat MVP · TF-16 mount point #1
 * @decisions   State-driven refetch (no tick-in-useMemo idiom · S139.T1 lesson applied).
 *              Voice notes captured via MediaRecorder behind feature detection.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { Mic, Send, Pin, Flag, Trash2, MessageSquare } from 'lucide-react';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import {
  listConversationsForUser, listMessages, sendMessage, markConversationRead,
  pinMessage, flagMessage, softDeleteMessage, getUnreadCount,
  VOICE_NOTE_MAX_SECONDS, VOICE_NOTE_MAX_BYTES,
} from '@/lib/operix-chat-engine';
import type { Conversation, ChatMessage } from '@/types/operix-chat';

export default function OperixChatInboxPage(): JSX.Element {
  const { entityCode } = useEntityCode();
  const user = useCurrentUser();
  const userId = user?.id ?? 'demo-user';

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordStartRef = useRef<number>(0);

  const refreshConversations = useCallback(() => {
    setConversations(listConversationsForUser(entityCode, userId));
  }, [entityCode, userId]);

  const refreshMessages = useCallback(() => {
    if (!selectedId) { setMessages([]); return; }
    setMessages(listMessages(entityCode, selectedId));
  }, [entityCode, selectedId]);

  useEffect(() => { refreshConversations(); }, [refreshConversations]);
  useEffect(() => { refreshMessages(); }, [refreshMessages]);

  // mark-read when a conversation is selected
  useEffect(() => {
    if (!selectedId) return;
    const touched = markConversationRead(entityCode, selectedId, userId);
    if (touched > 0) refreshConversations();
  }, [selectedId, entityCode, userId, refreshConversations]);

  const selected = useMemo(
    () => conversations.find((c) => c.id === selectedId) ?? null,
    [conversations, selectedId],
  );

  const onSendText = (): void => {
    if (!selected || !draft.trim()) return;
    try {
      sendMessage(entityCode, selected.id, {
        senderId: userId, type: 'text', content: draft.trim(),
      });
      setDraft('');
      refreshMessages();
      refreshConversations();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const onStartRecord = async (): Promise<void> => {
    if (typeof window === 'undefined' || typeof window.MediaRecorder === 'undefined') {
      toast.error('Voice recording not supported in this browser');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      chunksRef.current = [];
      recordStartRef.current = Date.now();
      mr.ondataavailable = (ev) => { if (ev.data.size > 0) chunksRef.current.push(ev.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || 'audio/webm' });
        const seconds = Math.round((Date.now() - recordStartRef.current) / 1000);
        if (blob.size > VOICE_NOTE_MAX_BYTES) {
          toast.error('Voice note exceeds ~1MB cap'); return;
        }
        if (seconds > VOICE_NOTE_MAX_SECONDS) {
          toast.error(`Voice note exceeds ${VOICE_NOTE_MAX_SECONDS}s cap`); return;
        }
        const dataUrl: string = await new Promise((res) => {
          const r = new FileReader();
          r.onloadend = () => res(String(r.result));
          r.readAsDataURL(blob);
        });
        if (!selected) return;
        try {
          sendMessage(entityCode, selected.id, {
            senderId: userId, type: 'voice', content: dataUrl,
            voiceMeta: { durationSeconds: seconds, mimeType: blob.type, sizeBytes: blob.size },
          });
          refreshMessages();
          refreshConversations();
        } catch (e) { toast.error((e as Error).message); }
      };
      mr.start();
      setRecording(true);
    } catch {
      toast.error('Microphone permission denied');
    }
  };

  const onStopRecord = (): void => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-4 p-4 h-[calc(100vh-180px)]">
      <Card className="rounded-2xl glass-card overflow-hidden flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="h-4 w-4" /> Inbox
            <Badge variant="secondary" className="ml-auto font-mono">{conversations.length}</Badge>
          </CardTitle>
        </CardHeader>
        <ScrollArea className="flex-1">
          <ul className="divide-y divide-border">
            {conversations.length === 0 ? (
              <li className="p-6 text-center text-sm text-muted-foreground">
                No conversations yet. Start one from Channels.
              </li>
            ) : conversations.map((c) => {
              const unread = getUnreadCount(entityCode, c.id, userId);
              return (
                <li
                  key={c.id}
                  onClick={() => setSelectedId(c.id)}
                  className={`p-3 cursor-pointer hover:bg-muted/40 ${selectedId === c.id ? 'bg-muted/60' : ''}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium truncate">{c.title}</p>
                    {unread > 0 && (
                      <Badge variant="destructive" className="font-mono text-[10px]">{unread}</Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground font-mono">
                    {c.channelType} · {c.participants.filter((p) => !p.removedAt).length} active
                  </p>
                </li>
              );
            })}
          </ul>
        </ScrollArea>
      </Card>

      <Card className="rounded-2xl glass-card flex flex-col overflow-hidden">
        <CardHeader className="pb-2 border-b border-border">
          <CardTitle className="text-base">
            {selected ? selected.title : 'Select a conversation'}
          </CardTitle>
        </CardHeader>
        <ScrollArea className="flex-1 p-4">
          {selected ? (
            <ul className="space-y-3">
              {messages.map((m) => (
                <li key={m.id} className={`flex ${m.senderId === userId ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                    m.type === 'system'
                      ? 'bg-muted text-muted-foreground text-xs italic mx-auto'
                      : m.senderId === userId
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-secondary-foreground'
                  }`}>
                    {m.deletedAt ? (
                      <em className="opacity-60">{m.content}</em>
                    ) : m.type === 'voice' ? (
                      <audio controls src={m.content} className="max-w-[220px]" />
                    ) : (
                      <p className="whitespace-pre-wrap break-words">{m.content}</p>
                    )}
                    <p className="text-[10px] opacity-70 mt-1 font-mono">
                      {m.createdAt.slice(11, 16)} · {m.deliveryStatus}
                      {m.isPinned && ' · pinned'}{m.isFlagged && ' · flagged'}
                    </p>
                    {m.type !== 'system' && !m.deletedAt && (
                      <div className="flex gap-1 mt-1">
                        <Button size="icon" variant="ghost" className="h-5 w-5"
                          onClick={() => { pinMessage(entityCode, m.id, !m.isPinned); refreshMessages(); }}>
                          <Pin className="h-3 w-3" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-5 w-5"
                          onClick={() => { flagMessage(entityCode, m.id, !m.isFlagged); refreshMessages(); }}>
                          <Flag className="h-3 w-3" />
                        </Button>
                        {m.senderId === userId && (
                          <Button size="icon" variant="ghost" className="h-5 w-5"
                            onClick={() => { softDeleteMessage(entityCode, m.id, userId); refreshMessages(); }}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </li>
              ))}
              {messages.length === 0 && (
                <li className="text-center text-sm text-muted-foreground py-6">
                  No messages yet — say hello.
                </li>
              )}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-12">
              Pick a conversation on the left.
            </p>
          )}
        </ScrollArea>
        {selected && (
          <div className="p-3 border-t border-border flex items-center gap-2">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSendText(); } }}
              placeholder="Type a message…"
              className="rounded-lg"
            />
            {recording ? (
              <Button onClick={onStopRecord} variant="destructive" size="icon" className="rounded-lg">
                <Mic className="h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={onStartRecord} variant="outline" size="icon" className="rounded-lg" title="Record voice note">
                <Mic className="h-4 w-4" />
              </Button>
            )}
            <Button onClick={onSendText} size="icon" className="rounded-lg" disabled={!draft.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
