/**
 * MobileSupervisorTeamStatsPage.tsx — Per-person calls/visits stats
 * Sprint T-Phase-1.1.1l-c
 */
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BarChart3 } from 'lucide-react';
import type { MobileSession } from '../MobileRouter';
import type { SAMPerson } from '@/types/sam-person';
import { samPersonsKey } from '@/types/sam-person';
import { type CallSession, callSessionsKey } from '@/types/call-session';
import { type VisitLog, visitLogsKey } from '@/types/visit-log';

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

export default function MobileSupervisorTeamStatsPage() {
  const navigate = useNavigate();
  const session = useMemo(() => readSession(), []);

  const data = useMemo(() => {
    if (!session) return [];
    const persons = loadList<SAMPerson>(samPersonsKey(session.entity_code));
    const calls = loadList<CallSession>(callSessionsKey(session.entity_code));
    const visits = loadList<VisitLog>(visitLogsKey(session.entity_code));
    const today = new Date().toISOString().slice(0, 10);
    const monthPrefix = today.slice(0, 7);

    return persons.map(p => {
      const isTC = p.person_code.startsWith('TC-');
      const myCalls = calls.filter(c => c.telecaller_id === p.id);
      const myVisits = visits.filter(v => v.salesman_id === p.id);
      const callsToday = myCalls.filter(c => c.call_date === today).length;
      const callsMonth = myCalls.filter(c => c.call_date.startsWith(monthPrefix)).length;
      const visitsToday = myVisits.filter(v => v.check_in_time.slice(0, 10) === today).length;
      const visitsMonth = myVisits.filter(v => v.check_in_time.slice(0, 7) === monthPrefix).length;
      const conversionsToday = myCalls.filter(c => c.call_date === today && c.disposition === 'converted').length
        + myVisits.filter(v => v.check_in_time.slice(0, 10) === today && v.outcome === 'order_captured').length;
      return {
        person: p, isTC,
        callsToday, callsMonth, visitsToday, visitsMonth, conversionsToday,
      };
    }).filter(d => d.callsMonth > 0 || d.visitsMonth > 0);
  }, [session]);

  if (!session) return null;

  return (
    <div className="p-4 max-w-md mx-auto space-y-3 pb-12">
      <div className="flex items-center gap-2 mb-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/mobile/supervisor')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-base font-semibold">Team Stats</h1>
      </div>

      {data.length === 0 && (
        <Card className="p-6 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
          <BarChart3 className="h-8 w-8" />
          No activity yet this month.
        </Card>
      )}

      <div className="space-y-2">
        {data.map(d => (
          <Card key={d.person.id} className="p-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{d.person.display_name}</p>
              <span className="text-[10px] text-muted-foreground font-mono">{d.person.person_code}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-[11px]">
              <div>
                <p className="text-muted-foreground">Today</p>
                <p className="font-mono font-semibold">
                  {d.isTC ? `${d.callsToday} calls` : `${d.visitsToday} visits`}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Month</p>
                <p className="font-mono font-semibold">
                  {d.isTC ? `${d.callsMonth}` : `${d.visitsMonth}`}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Conv today</p>
                <p className="font-mono font-semibold text-green-700">{d.conversionsToday}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
