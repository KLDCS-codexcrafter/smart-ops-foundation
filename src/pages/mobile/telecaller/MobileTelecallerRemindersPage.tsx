/**
 * MobileTelecallerRemindersPage.tsx — Overdue follow-ups + today's callbacks
 * Sprint T-Phase-1.1.1l-b
 */
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, AlertCircle, Clock, ChevronRight } from 'lucide-react';
import type { MobileSession } from '../MobileRouter';
import { type Enquiry, enquiriesKey } from '@/types/enquiry';
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

interface OverdueRow {
  enquiry: Enquiry;
  dueDate: string;
}

export default function MobileTelecallerRemindersPage() {
  const navigate = useNavigate();
  const session = useMemo(() => readSession(), []);
  const enquiries = useMemo(() => session ? loadList<Enquiry>(enquiriesKey(session.entity_code)) : [], [session]);
  const calls = useMemo(() => session ? loadList<CallSession>(callSessionsKey(session.entity_code)) : [], [session]);

  const today = new Date().toISOString().slice(0, 10);

  const overdue = useMemo<OverdueRow[]>(() => {
    if (!session) return [];
    const rows: OverdueRow[] = [];
    for (const e of enquiries) {
      if (e.assigned_executive_id !== session.user_id) continue;
      const last = e.follow_ups[e.follow_ups.length - 1];
      const due = last?.follow_up_date;
      if (due && due < today) {
        rows.push({ enquiry: e, dueDate: due });
      }
    }
    return rows.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }, [enquiries, session, today]);

  const callbacks = useMemo(() =>
    calls
      .filter(c => c.telecaller_id === session?.user_id)
      .filter(c => c.disposition === 'callback' && c.follow_up_date === today)
      .sort((a, b) => (a.follow_up_time ?? '').localeCompare(b.follow_up_time ?? '')),
    [calls, session, today],
  );

  if (!session) return null;

  return (
    <div className="p-4 max-w-md mx-auto space-y-3 pb-12">
      <div className="flex items-center gap-2 mb-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/mobile/telecaller')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-base font-semibold">Reminders</h1>
        <Badge variant="outline" className="text-[10px] ml-auto">{overdue.length + callbacks.length}</Badge>
      </div>

      <p className="text-[11px] uppercase tracking-wider text-red-700 font-semibold flex items-center gap-1">
        <AlertCircle className="h-3 w-3" /> Overdue Follow-ups ({overdue.length})
      </p>
      {overdue.length === 0 ? (
        <Card className="p-3 text-center text-xs text-muted-foreground">All caught up</Card>
      ) : (
        <div className="space-y-2">
          {overdue.map(({ enquiry: e, dueDate }) => (
            <Card
              key={e.id}
              className="p-3 cursor-pointer border-l-4 border-l-red-500 active:scale-[0.99]"
              onClick={() => navigate(`/mobile/telecaller/active-call?phone=${encodeURIComponent(e.mobile ?? '')}&contactName=${encodeURIComponent(e.contact_person ?? '')}`)}
            >
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-[10px] text-muted-foreground">{e.enquiry_no}</p>
                  <p className="text-sm font-medium truncate">{e.contact_person ?? e.customer_name ?? '—'}</p>
                  <p className="text-[10px] text-red-700">Due: {dueDate}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </div>
            </Card>
          ))}
        </div>
      )}

      <p className="text-[11px] uppercase tracking-wider text-amber-700 font-semibold flex items-center gap-1 mt-4">
        <Clock className="h-3 w-3" /> Today's Callbacks ({callbacks.length})
      </p>
      {callbacks.length === 0 ? (
        <Card className="p-3 text-center text-xs text-muted-foreground">No callbacks scheduled</Card>
      ) : (
        <div className="space-y-2">
          {callbacks.map(c => (
            <Card
              key={c.id}
              className="p-3 cursor-pointer border-l-4 border-l-amber-500 active:scale-[0.99]"
              onClick={() => navigate(`/mobile/telecaller/active-call?phone=${encodeURIComponent(c.phone_number)}&contactName=${encodeURIComponent(c.contact_name ?? '')}`)}
            >
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{c.contact_name ?? 'Contact'}</p>
                  <p className="text-[11px] text-muted-foreground font-mono">{c.phone_number}</p>
                  {c.follow_up_time && <p className="text-[10px] text-amber-700">At {c.follow_up_time}</p>}
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
