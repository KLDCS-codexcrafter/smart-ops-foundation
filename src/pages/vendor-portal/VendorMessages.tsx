/**
 * @file        src/pages/vendor-portal/VendorMessages.tsx
 * @purpose     Vendor messages view · READ + WhatsApp reply via existing wa_fallback_url
 * @sprint      T-Phase-1.A-c.3-VendorPortal-KYC-Invoice-Messages-Performance
 * @decisions   D-272 · A-c-Q7=C · A-c-Q10=B
 * @[JWT]       N/A · Phase 2 POST /api/vendor/portal/commlog-reply
 */
import { useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import VendorPortalLayout from './VendorPortalLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  MessageSquare, Search, Bot, ChevronRight, X, MessageCircle,
  ArrowDownLeft, ArrowUpRight, ExternalLink,
} from 'lucide-react';
import { getVendorSession, recordVendorActivity } from '@/lib/vendor-portal-auth-engine';
import {
  getVendorCommLogThreads, markVendorThreadOpened,
  type VendorCommLogThread,
} from '@/lib/vendor-portal-commlog-engine';

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function VendorMessages(): JSX.Element {
  const session = getVendorSession();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRfq, setSelectedRfq] = useState<string | null>(null);

  const threads = useMemo(
    () => session ? getVendorCommLogThreads(session) : [],
    [session]
  );

  const filtered = useMemo(() => {
    if (!searchQuery) return threads;
    const q = searchQuery.toLowerCase();
    return threads.filter((t) =>
      t.rfq_no.toLowerCase().includes(q)
      || t.entries.some((e) => e.subject.toLowerCase().includes(q) || e.body.toLowerCase().includes(q))
    );
  }, [threads, searchQuery]);

  const selectedThread: VendorCommLogThread | null = useMemo(
    () => filtered.find((t) => t.rfq_no === selectedRfq) ?? null,
    [filtered, selectedRfq]
  );

  const totalUnread = threads.reduce((s, t) => s + t.unread_count, 0);

  if (!session) return <Navigate to="/vendor-portal/login" replace />;

  const handleThreadSelect = (thread: VendorCommLogThread): void => {
    setSelectedRfq(thread.rfq_no);
    markVendorThreadOpened(thread.rfq_no, session);
    recordVendorActivity(session.vendor_id, session.entity_code, 'commlog_view', 'commlog', thread.rfq_no);
  };

  return (
    <VendorPortalLayout>
      <div className="space-y-6 max-w-6xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <MessageSquare className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                Messages
                {totalUnread > 0 && (
                  <Badge className="bg-amber-500/15 text-amber-700 border-amber-500/30 text-[10px]">
                    {totalUnread} unread
                  </Badge>
                )}
              </h1>
              <p className="text-sm text-muted-foreground">
                Messages from procurement · threaded by RFQ · reply via WhatsApp (in-portal reply Phase 2)
              </p>
            </div>
          </div>
          <Badge variant="outline" className="gap-1 text-[10px]">
            <Bot className="h-3 w-3" /> Saathi · Auto-translate · Phase 2
          </Badge>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search RFQ no or message text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Threads · {filtered.length}</CardTitle>
              <CardDescription>Sorted by most recent activity</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[500px] overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  {threads.length === 0 ? 'No messages yet' : 'No threads match filter'}
                </div>
              ) : (
                filtered.map((t) => {
                  const isSelected = selectedRfq === t.rfq_no;
                  const hasUnread = t.unread_count > 0;
                  return (
                    <button
                      key={t.rfq_no}
                      onClick={() => handleThreadSelect(t)}
                      className={`w-full text-left rounded-lg border p-3 transition-colors ${
                        isSelected
                          ? 'border-primary bg-primary/10'
                          : hasUnread
                            ? 'border-amber-500/30 bg-amber-500/5 hover:border-amber-500/50'
                            : 'border-border/50 hover:border-primary/40 hover:bg-primary/5'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className="text-sm font-medium font-mono">RFQ {t.rfq_no}</p>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {hasUnread && (
                            <Badge className="bg-amber-500/15 text-amber-700 border-amber-500/30 text-[9px]">
                              {t.unread_count}
                            </Badge>
                          )}
                          <span className="text-[10px] text-muted-foreground">{timeAgo(t.last_activity_at)}</span>
                        </div>
                      </div>
                      <p className="text-[11px] text-muted-foreground">{t.entries.length} message(s)</p>
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
                    {selectedThread ? `RFQ ${selectedThread.rfq_no}` : 'Select a thread'}
                  </CardTitle>
                  <CardDescription>
                    {selectedThread ? `${selectedThread.entries.length} message(s)` : 'Drill-down view'}
                  </CardDescription>
                </div>
                {selectedThread && (
                  <Button variant="ghost" size="sm" onClick={() => setSelectedRfq(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="max-h-[500px] overflow-y-auto">
              {!selectedThread ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  <ChevronRight className="h-6 w-6 mx-auto mb-2 text-muted-foreground/50" />
                  Click a thread on the left
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedThread.entries.map((e, idx) => {
                    const isInbound = e.direction === 'inbound';
                    return (
                      <div
                        key={`${e.id ?? idx}-${e.sent_at}`}
                        className={`rounded-lg border p-3 ${
                          isInbound
                            ? 'border-blue-500/30 bg-blue-500/5'
                            : 'border-border/50 bg-slate-500/5'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <Badge
                            variant="outline"
                            className={`text-[9px] gap-1 ${
                              isInbound
                                ? 'bg-blue-500/10 text-blue-700 border-blue-500/30'
                                : 'bg-slate-500/10 text-slate-700 border-slate-500/30'
                            }`}
                          >
                            {isInbound ? <><ArrowDownLeft className="h-3 w-3" /> From Admin</> : <><ArrowUpRight className="h-3 w-3" /> Your reply</>}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">{timeAgo(e.sent_at)}</span>
                        </div>
                        {e.subject && <p className="text-sm font-medium mb-1">{e.subject}</p>}
                        <p className="text-xs text-muted-foreground whitespace-pre-wrap">{e.body}</p>
                        {isInbound && e.wa_fallback_url && (
                          <a
                            href={e.wa_fallback_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-emerald-700 hover:underline mt-2"
                          >
                            <MessageCircle className="h-3 w-3" /> Reply via WhatsApp <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    );
                  })}
                  <Alert className="border-blue-500/30 bg-blue-500/5">
                    <MessageSquare className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-xs">
                      In-portal reply coming Phase 2 · use WhatsApp link above for now
                    </AlertDescription>
                  </Alert>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </VendorPortalLayout>
  );
}
