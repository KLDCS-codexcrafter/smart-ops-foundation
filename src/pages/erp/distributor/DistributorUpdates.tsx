/**
 * DistributorUpdates.tsx — Inbox of broadcasts received by the partner.
 * Sprint 10. Filters by audience match (all_partners or matching tier).
 */
import { useMemo } from 'react';
import { Megaphone, Calendar, MessageSquare, Mail, Bell } from 'lucide-react';
import { DistributorLayout } from '@/features/distributor/DistributorLayout';
import { getDistributorSession, loadDistributors } from '@/lib/distributor-auth-engine';
import { distributorBroadcastsKey, type BroadcastMessage } from '@/types/distributor-order';

const INDIGO = 'hsl(231 48% 58%)';
const INDIGO_BG = 'hsl(231 48% 48% / 0.12)';

function ls<T>(k: string): T[] {
  try { const r = localStorage.getItem(k); return r ? (JSON.parse(r) as T[]) : []; } catch { return []; }
}

const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

export function DistributorUpdatesPanel() { return <DistributorUpdates />; }

export default function DistributorUpdates() {
  const session = getDistributorSession();
  const distributor = session
    ? loadDistributors(session.entity_code).find(p => p.id === session.distributor_id) ?? null
    : null;

  const broadcasts = useMemo<BroadcastMessage[]>(() => {
    if (!session || !partner) return [];
    const all = ls<BroadcastMessage>(distributorBroadcastsKey(session.entity_code));
    return all
      .filter(b => b.status === 'sent')
      .filter(b => {
        if (b.audience.kind === 'all_partners') return true;
        if (b.audience.kind === 'tier') return b.audience.tier === distributor.tier;
        if (b.audience.kind === 'partner_ids') return b.audience.ids.includes(distributor.id);
        return false;
      })
      .sort((a, b) => (b.sent_at ?? '').localeCompare(a.sent_at ?? ''));
  }, [session, distributor]);

  if (!session || !partner) {
    return <DistributorLayout title="Updates"><div className="text-sm text-muted-foreground">Sign in.</div></DistributorLayout>;
  }

  return (
    <DistributorLayout title="Updates" subtitle={`${broadcasts.length} message${broadcasts.length === 1 ? '' : 's'}`}>
      <div className="space-y-3 animate-fade-in">
        {broadcasts.length === 0 ? (
          <div className="rounded-2xl border border-border/50 p-12 text-center">
            <Megaphone className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">No updates yet.</p>
          </div>
        ) : broadcasts.map(b => (
          <div key={b.id} className="rounded-2xl border border-border/50 bg-card p-5">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: INDIGO_BG }}>
                <Megaphone className="h-4 w-4" style={{ color: INDIGO }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{b.title}</p>
                <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{b.body}</p>
                <div className="mt-3 flex items-center gap-3 text-[11px] text-muted-foreground">
                  {b.sent_at && (
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> {formatDate(b.sent_at)}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5">
                    {b.channels.includes('whatsapp') && <MessageSquare className="h-3 w-3" />}
                    {b.channels.includes('email') && <Mail className="h-3 w-3" />}
                    {b.channels.includes('in_portal') && <Bell className="h-3 w-3" />}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </DistributorLayout>
  );
}
