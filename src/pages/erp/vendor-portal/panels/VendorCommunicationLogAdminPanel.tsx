/**
 * @file        VendorCommunicationLogAdminPanel.tsx
 * @sprint      T-Phase-1.A-b.2-VendorPortal-Communications-Categories
 * @decisions   D-NEW-DN · A-b-Q7=B mark-as-read + drill-down · A-b-Q8=C Saathi badge · A-b-Q9=C
 */
import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  MessageSquare, Search, MailOpen, CheckCheck, ChevronRight, X, Bot, Activity,
} from 'lucide-react';
import { communicationLogKey, type CommunicationLogEntry } from '@/lib/vendor-rfq-notify';
import { DEFAULT_ENTITY_SHORTCODE } from '@/lib/default-entity';

interface AdminThread {
  thread_key: string;
  vendor_id: string;
  vendor_name: string;
  rfq_no: string | null;
  entries: CommunicationLogEntry[];
  last_activity_at: string;
  total_count: number;
  unread_count: number;
}

function buildAdminThreads(entityCode: string, readKeysSession: Set<string>): AdminThread[] {
  let all: CommunicationLogEntry[] = [];
  try {
    const raw = localStorage.getItem(communicationLogKey(entityCode));
    all = raw ? (JSON.parse(raw) as CommunicationLogEntry[]) : [];
  } catch { return []; }

  const buckets: Record<string, CommunicationLogEntry[]> = {};
  for (const e of all) {
    const rfq = e.ref_rfq_no ?? 'no-rfq';
    const key = `${e.party_id}::${rfq}`;
    (buckets[key] ??= []).push(e);
  }

  return Object.entries(buckets)
    .map(([thread_key, entries]) => {
      const sorted = [...entries].sort((a, b) => a.sent_at.localeCompare(b.sent_at));
      const last = sorted.reduce((max, e) => (e.sent_at > max ? e.sent_at : max), '');
      const unread = sorted.filter(e =>
        (e.status === 'sent' || e.status === 'queued') && !readKeysSession.has(`${thread_key}::${e.sent_at}`),
      ).length;
      const first = sorted[0];
      return {
        thread_key,
        vendor_id: first?.party_id ?? '',
        vendor_name: first?.party_name ?? 'Unknown vendor',
        rfq_no: first?.ref_rfq_no ?? null,
        entries: sorted,
        last_activity_at: last,
        total_count: sorted.length,
        unread_count: unread,
      };
    })
    .sort((a, b) => b.last_activity_at.localeCompare(a.last_activity_at));
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export function VendorCommunicationLogAdminPanel(): JSX.Element {
  const entityCode = useMemo(() => {
    try {
      return localStorage.getItem('active_entity_code') ?? DEFAULT_ENTITY_SHORTCODE;
    } catch { return DEFAULT_ENTITY_SHORTCODE; }
  }, []);

  const [readKeysSession, setReadKeysSession] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedThread, setSelectedThread] = useState<AdminThread | null>(null);
  const [refreshCounter, setRefreshCounter] = useState(0);

  const threads = useMemo(
    () => buildAdminThreads(entityCode, readKeysSession),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entityCode, readKeysSession, refreshCounter],
  );

  const filtered = useMemo(() => {
    if (!searchQuery) return threads;
    const q = searchQuery.toLowerCase();
    return threads.filter(t =>
      t.vendor_name.toLowerCase().includes(q)
      || (t.rfq_no ?? '').toLowerCase().includes(q),
    );
  }, [threads, searchQuery]);

  const totalUnread = threads.reduce((s, t) => s + t.unread_count, 0);

  const markThreadRead = (thread: AdminThread): void => {
    const newSet = new Set(readKeysSession);
    thread.entries.forEach(e => newSet.add(`${thread.thread_key}::${e.sent_at}`));
    setReadKeysSession(newSet);
    setRefreshCounter(c => c + 1);
  };

  const markAllRead = (): void => {
    const newSet = new Set(readKeysSession);
    threads.forEach(t => t.entries.forEach(e => newSet.add(`${t.thread_key}::${e.sent_at}`)));
    setReadKeysSession(newSet);
    setRefreshCounter(c => c + 1);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-lg bg-slate-500/15 flex items-center justify-center">
            <MessageSquare className="h-6 w-6 text-slate-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              Vendor Communication Log
              <Badge variant="outline" className="text-[10px]">Admin View</Badge>
              {totalUnread > 0 && (
                <Badge className="bg-amber-500/15 text-amber-700 border-amber-500/30 text-[10px]">
                  {totalUnread} unread
                </Badge>
              )}
            </h1>
            <p className="text-sm text-muted-foreground">
              Aggregate view · all vendor threads · mark-as-read · drill-down to entries
            </p>
          </div>
        </div>
        <Badge variant="outline" className="gap-1 text-[10px]">
          <Bot className="h-3 w-3" />Saathi · auto-reply suggestions · Phase 2
        </Badge>
      </div>

      <Card>
        <CardContent className="p-4 flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search vendor or RFQ"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
          <Button variant="outline" size="sm" onClick={markAllRead} disabled={totalUnread === 0} className="gap-1">
            <CheckCheck className="h-4 w-4" />
            Mark all read
          </Button>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Threads · {filtered.length}</CardTitle>
            <CardDescription>Sorted by most recent activity</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[500px] overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                {threads.length === 0 ? 'No communication threads yet' : 'No threads match filter'}
              </div>
            ) : (
              filtered.map(t => {
                const isSelected = selectedThread?.thread_key === t.thread_key;
                const hasUnread = t.unread_count > 0;
                return (
                  <button
                    key={t.thread_key}
                    onClick={() => setSelectedThread(t)}
                    className={`w-full text-left rounded-lg border p-3 transition-colors ${
                      isSelected
                        ? 'border-slate-500 bg-slate-500/10'
                        : hasUnread
                          ? 'border-amber-500/30 bg-amber-500/5 hover:border-amber-500/50'
                          : 'border-border/50 hover:border-slate-500/40 hover:bg-slate-500/5'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className="text-sm font-medium truncate">{t.vendor_name}</p>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {hasUnread && (
                          <Badge className="bg-amber-500/15 text-amber-700 border-amber-500/30 text-[9px]">
                            {t.unread_count}
                          </Badge>
                        )}
                        <span className="text-[10px] text-muted-foreground">{timeAgo(t.last_activity_at)}</span>
                      </div>
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">
                      RFQ {t.rfq_no ?? '—'} · {t.total_count} message(s)
                    </p>
                  </button>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <CardTitle className="text-base truncate">
                  {selectedThread ? selectedThread.vendor_name : 'Select a thread'}
                </CardTitle>
                <CardDescription>
                  {selectedThread ? `RFQ ${selectedThread.rfq_no ?? '—'} · ${selectedThread.total_count} entries` : 'Drill-down view'}
                </CardDescription>
              </div>
              {selectedThread && (
                <div className="flex items-center gap-1">
                  {selectedThread.unread_count > 0 && (
                    <Button variant="outline" size="sm" onClick={() => markThreadRead(selectedThread)} className="gap-1">
                      <MailOpen className="h-4 w-4" />
                      Mark read
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => setSelectedThread(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="max-h-[500px] overflow-y-auto">
            {!selectedThread ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                <ChevronRight className="h-6 w-6 mx-auto mb-2 text-muted-foreground/50" />
                Click a thread on the left to view entries
              </div>
            ) : (
              <div className="space-y-2">
                {selectedThread.entries.map((e, idx) => (
                  <div key={`${e.sent_at}-${idx}`} className="rounded border border-border/50 p-2">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <Badge
                        variant="outline"
                        className={`text-[9px] ${
                          e.direction === 'inbound'
                            ? 'bg-blue-500/10 text-blue-700 border-blue-500/30'
                            : 'bg-slate-500/10 text-slate-700 border-slate-500/30'
                        }`}
                      >
                        {e.direction === 'inbound' ? '← Vendor' : '→ Admin'}
                      </Badge>
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Activity className="h-3 w-3" />
                        {new Date(e.sent_at).toLocaleString('en-IN')}
                      </div>
                    </div>
                    <p className="text-xs font-medium">{e.subject}</p>
                    <p className="text-xs text-muted-foreground whitespace-pre-wrap">{e.body}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
