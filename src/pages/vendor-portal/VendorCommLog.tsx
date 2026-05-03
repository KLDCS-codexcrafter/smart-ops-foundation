/**
 * @file        VendorCommLog.tsx
 * @sprint      T-Phase-1.2.6f-b-1 · Block C.2
 * @purpose     Conversation thread view per RFQ · scoped to logged-in vendor.
 */
import { useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import VendorPortalShell from './VendorPortalShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Mail, MessageSquare, Inbox } from 'lucide-react';
import {
  getVendorSession,
  recordVendorActivity,
} from '@/lib/vendor-portal-auth-engine';
import {
  getVendorCommLogThreads,
  type VendorCommLogThread,
} from '@/lib/vendor-portal-commlog-engine';

const CHANNEL_ICON: Record<string, typeof Mail> = {
  email: Mail,
  whatsapp: MessageSquare,
  internal: Inbox,
  sms: MessageSquare,
};

export default function VendorCommLog(): JSX.Element {
  const session = getVendorSession();
  const [selectedRfq, setSelectedRfq] = useState<string | null>(null);

  const threads: VendorCommLogThread[] = useMemo(
    () => (session ? getVendorCommLogThreads(session) : []),
    [session],
  );

  if (!session) return <Navigate to="/vendor-portal/login" replace />;

  const active = threads.find(t => t.rfq_no === selectedRfq) ?? threads[0] ?? null;
  if (active && active.rfq_no !== selectedRfq) {
    // Auto-select first thread silently — but don't trigger render loop.
  }

  const openThread = (t: VendorCommLogThread): void => {
    setSelectedRfq(t.rfq_no);
    recordVendorActivity(session.vendor_id, session.entity_code, 'commlog_view', 'commlog', t.rfq_no, t.rfq_no);
  };

  return (
    <VendorPortalShell>
      <Card>
        <CardHeader>
          <CardTitle>Communication Log</CardTitle>
          <p className="text-sm text-muted-foreground">
            All RFQ messages addressed to {session.party_name}
          </p>
        </CardHeader>
        <CardContent>
          {threads.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">No messages yet.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 min-h-[400px]">
              {/* Thread list */}
              <ScrollArea className="md:col-span-1 border rounded-lg max-h-[600px]">
                <ul className="divide-y">
                  {threads.map((t) => {
                    const isActive = active?.rfq_no === t.rfq_no;
                    return (
                      <li key={t.rfq_no}>
                        <button
                          onClick={() => openThread(t)}
                          className={`w-full text-left px-3 py-3 hover:bg-muted/50 transition-colors ${
                            isActive ? 'bg-muted/60' : ''
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-mono text-xs">{t.rfq_no}</span>
                            {t.unread_count > 0 && (
                              <Badge variant="default" className="text-xs h-5">{t.unread_count}</Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {t.entries.length} msg · {new Date(t.last_activity_at).toLocaleDateString('en-IN')}
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </ScrollArea>

              {/* Messages */}
              <div className="md:col-span-2 border rounded-lg p-4">
                {!active ? (
                  <div className="text-sm text-muted-foreground text-center py-8">
                    Select a thread to view messages.
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b pb-2">
                      <span className="font-mono text-sm">{active.rfq_no}</span>
                      <span className="text-xs text-muted-foreground">{active.entries.length} message(s)</span>
                    </div>
                    <ScrollArea className="h-[500px] pr-2">
                      <div className="space-y-3">
                        {active.entries.map((e) => {
                          const Icon = CHANNEL_ICON[e.channel] ?? Mail;
                          return (
                            <div key={e.id} className="border rounded-lg p-3 bg-muted/20">
                              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                                <Icon className="h-3 w-3" />
                                <span className="uppercase">{e.channel}</span>
                                <span>·</span>
                                <span>{new Date(e.sent_at).toLocaleString('en-IN')}</span>
                                <span>·</span>
                                <Badge variant="outline" className="text-[10px] h-4 px-1">{e.status}</Badge>
                              </div>
                              <div className="font-medium text-sm">{e.subject}</div>
                              <div className="text-sm text-muted-foreground whitespace-pre-wrap mt-1">
                                {e.body}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </VendorPortalShell>
  );
}
