/**
 * MobileCallQueuePage.tsx — Today's call queue (own assigned leads + callbacks due)
 * Sprint T-Phase-1.1.1l-b · Reuses Lead + CallSession
 */
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Phone, Clock, ChevronRight } from 'lucide-react';
import type { MobileSession } from '../MobileRouter';
import { type Lead, leadsKey, LEAD_PLATFORM_LABELS, LEAD_PLATFORM_COLORS } from '@/types/lead';
import { type CallSession, callSessionsKey } from '@/types/call-session';

function readSession(): MobileSession | null {
  try {
    const raw = sessionStorage.getItem('opx_mobile_session');
    return raw ? (JSON.parse(raw) as MobileSession) : null;
  } catch { return null; }
}

function loadList<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch { return []; }
}

export default function MobileCallQueuePage() {
  const navigate = useNavigate();
  const session = useMemo(() => readSession(), []);
  const leads = useMemo(() => session ? loadList<Lead>(leadsKey(session.entity_code)) : [], [session]);
  const calls = useMemo(() => session ? loadList<CallSession>(callSessionsKey(session.entity_code)) : [], [session]);

  const myOpenLeads = useMemo(() =>
    leads
      .filter(l => l.assigned_telecaller_id === session?.user_id && l.is_active)
      .filter(l => l.status === 'new' || l.status === 'contacted' || l.status === 'qualified')
      .sort((a, b) => (a.priority === 'high' ? -1 : 1) - (b.priority === 'high' ? -1 : 1)),
    [leads, session],
  );

  const today = new Date().toISOString().slice(0, 10);
  const callbacksDue = useMemo(() =>
    calls
      .filter(c => c.telecaller_id === session?.user_id)
      .filter(c => c.disposition === 'callback' && c.follow_up_date === today)
      .sort((a, b) => (a.follow_up_time ?? '').localeCompare(b.follow_up_time ?? '')),
    [calls, session, today],
  );

  if (!session) return null;

  const handleStartCall = (lead: Lead) => {
    navigate(`/mobile/telecaller/active-call?leadId=${lead.id}`);
  };

  const handleCallback = (call: CallSession) => {
    navigate(`/mobile/telecaller/active-call?phone=${encodeURIComponent(call.phone_number)}&contactName=${encodeURIComponent(call.contact_name ?? '')}`);
  };

  return (
    <div className="p-4 max-w-md mx-auto space-y-3 pb-12">
      <div className="flex items-center gap-2 mb-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/mobile/telecaller')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-base font-semibold">Call Queue</h1>
        <Badge variant="outline" className="text-[10px] ml-auto">{myOpenLeads.length + callbacksDue.length}</Badge>
      </div>

      {callbacksDue.length > 0 && (
        <>
          <p className="text-[11px] uppercase tracking-wider text-amber-700 font-semibold flex items-center gap-1">
            <Clock className="h-3 w-3" /> Callbacks Due Today ({callbacksDue.length})
          </p>
          <div className="space-y-2">
            {callbacksDue.map(c => (
              <Card
                key={c.id}
                className="p-3 cursor-pointer active:scale-[0.99] border-l-4 border-l-amber-500"
                onClick={() => handleCallback(c)}
              >
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{c.contact_name ?? 'Contact'}</p>
                    <p className="text-[11px] text-muted-foreground font-mono">{c.phone_number}</p>
                    {c.follow_up_time && (
                      <p className="text-[10px] text-amber-700">{c.follow_up_time}</p>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1">
        <Phone className="h-3 w-3" /> Open Leads ({myOpenLeads.length})
      </p>

      {myOpenLeads.length === 0 ? (
        <Card className="p-6 text-center">
          <Phone className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm font-medium">No open leads</p>
          <p className="text-xs text-muted-foreground mt-1">Check the Lead Inbox.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {myOpenLeads.map(l => (
            <Card
              key={l.id}
              className="p-3 cursor-pointer active:scale-[0.99]"
              onClick={() => handleStartCall(l)}
            >
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm truncate">{l.contact_name}</p>
                    {l.priority === 'high' && (
                      <Badge variant="outline" className="text-[9px] bg-red-500/10 text-red-700 border-red-500/30">HIGH</Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground font-mono">{l.phone ?? '—'}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Badge variant="outline" className={`text-[9px] ${LEAD_PLATFORM_COLORS[l.platform]}`}>
                      {LEAD_PLATFORM_LABELS[l.platform]}
                    </Badge>
                    {l.product_interest && (
                      <span className="text-[10px] text-muted-foreground truncate">{l.product_interest}</span>
                    )}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
