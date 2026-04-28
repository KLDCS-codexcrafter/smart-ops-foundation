/**
 * MobileTelecallerCallLogPage.tsx — Reverse-chrono own call history
 * Sprint T-Phase-1.1.1l-b
 */
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, History, ExternalLink } from 'lucide-react';
import type { MobileSession } from '../MobileRouter';
import { type CallSession, type CallDisposition, callSessionsKey } from '@/types/call-session';
import { cn } from '@/lib/utils';

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

const DISPOSITION_LABELS: Record<CallDisposition, string> = {
  interested: 'Interested',
  not_interested: 'Not Interested',
  callback: 'Callback',
  no_answer: 'No Answer',
  wrong_number: 'Wrong Number',
  dnd: 'DND',
  converted: 'Converted',
};

const DISPOSITION_COLORS: Record<CallDisposition, string> = {
  interested:     'bg-blue-500/10 text-blue-700 border-blue-500/30',
  not_interested: 'bg-red-500/10 text-red-700 border-red-500/30',
  callback:       'bg-amber-500/10 text-amber-700 border-amber-500/30',
  no_answer:      'bg-slate-500/10 text-slate-700 border-slate-500/30',
  wrong_number:   'bg-purple-500/10 text-purple-700 border-purple-500/30',
  dnd:            'bg-pink-500/10 text-pink-700 border-pink-500/30',
  converted:      'bg-green-500/10 text-green-700 border-green-500/30',
};

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
    timeZone: 'Asia/Kolkata',
  });
}

function fmtDuration(secs: number): string {
  if (secs < 60) return `${secs}s`;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}m ${s}s`;
}

export default function MobileTelecallerCallLogPage() {
  const navigate = useNavigate();
  const session = useMemo(() => readSession(), []);
  const calls = useMemo(() => session ? loadList<CallSession>(callSessionsKey(session.entity_code)) : [], [session]);

  const myCalls = useMemo(
    () => calls
      .filter(c => c.telecaller_id === session?.user_id)
      .sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [calls, session],
  );

  if (!session) return null;

  return (
    <div className="p-4 max-w-md mx-auto space-y-3 pb-12">
      <div className="flex items-center gap-2 mb-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/mobile/telecaller')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-base font-semibold">Call Log</h1>
        <Badge variant="outline" className="text-[10px] ml-auto">{myCalls.length}</Badge>
      </div>

      {myCalls.length === 0 ? (
        <Card className="p-6 text-center">
          <History className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm font-medium">No calls yet</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {myCalls.slice(0, 200).map(c => (
            <Card key={c.id} className="p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{c.contact_name ?? 'Contact'}</p>
                  <p className="text-[11px] text-muted-foreground font-mono">{c.phone_number}</p>
                  <p className="text-[10px] text-muted-foreground">{fmtDateTime(c.created_at)} · {fmtDuration(c.duration_seconds || 0)}</p>
                </div>
                <Badge variant="outline" className={cn('text-[10px] shrink-0', DISPOSITION_COLORS[c.disposition])}>
                  {DISPOSITION_LABELS[c.disposition]}
                </Badge>
              </div>
              {c.enquiry_no && (
                <Badge variant="outline" className="text-[10px] mt-2 bg-green-500/10 text-green-700 border-green-500/30 inline-flex items-center gap-1">
                  <ExternalLink className="h-2.5 w-2.5" /> {c.enquiry_no}
                </Badge>
              )}
              {c.notes && <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">{c.notes}</p>}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
