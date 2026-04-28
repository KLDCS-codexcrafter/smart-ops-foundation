/**
 * MobileTeamLiveViewPage.tsx — Live agent + visit status grid
 * Sprint T-Phase-1.1.1l-c
 */
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Phone, MapPin, Circle } from 'lucide-react';
import type { MobileSession } from '../MobileRouter';
import {
  type AgentStatus, AGENT_STATE_LABELS, AGENT_STATE_COLORS, agentStatusKey,
} from '@/types/agent-status';
import { type VisitLog, visitLogsKey } from '@/types/visit-log';
import type { SAMPerson } from '@/types/sam-person';
import { samPersonsKey } from '@/types/sam-person';
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

export default function MobileTeamLiveViewPage() {
  const navigate = useNavigate();
  const session = useMemo(() => readSession(), []);

  const persons  = useMemo(() => session ? loadList<SAMPerson>(samPersonsKey(session.entity_code)) : [], [session]);
  const visits   = useMemo(() => session ? loadList<VisitLog>(visitLogsKey(session.entity_code)) : [], [session]);
  const statuses = useMemo(() => session ? loadList<AgentStatus>(agentStatusKey(session.entity_code)) : [], [session]);

  const telecallers = useMemo(
    () => persons.filter(p => p.person_code.startsWith('TC-')),
    [persons],
  );
  const salesmen = useMemo(
    () => persons.filter(p => p.person_code.startsWith('SM-') || p.person_code.startsWith('AG-') || p.person_code.startsWith('BR-')),
    [persons],
  );
  const statusByPerson = useMemo(() => {
    const m = new Map<string, AgentStatus>();
    for (const s of statuses) m.set(s.telecaller_id, s);
    return m;
  }, [statuses]);
  const activeVisitByPerson = useMemo(() => {
    const m = new Map<string, VisitLog>();
    for (const v of visits) {
      if (v.check_out_time === null) m.set(v.salesman_id, v);
    }
    return m;
  }, [visits]);

  if (!session) return null;

  return (
    <div className="p-4 max-w-md mx-auto space-y-3 pb-12">
      <div className="flex items-center gap-2 mb-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/mobile/supervisor')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-base font-semibold">Team Live View</h1>
      </div>

      <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1">
        <Phone className="h-3 w-3" /> Telecallers ({telecallers.length})
      </p>
      <div className="space-y-2">
        {telecallers.length === 0 && (
          <Card className="p-3 text-xs text-muted-foreground text-center">No telecallers configured.</Card>
        )}
        {telecallers.map(tc => {
          const s = statusByPerson.get(tc.id);
          const state = s?.state ?? 'offline';
          return (
            <Card key={tc.id} className="p-3">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{tc.display_name}</p>
                  <p className="text-[10px] text-muted-foreground font-mono">{tc.person_code}</p>
                </div>
                <Badge variant="outline" className={cn('text-[10px]', AGENT_STATE_COLORS[state])}>
                  <Circle className="h-2 w-2 mr-1 fill-current" />
                  {AGENT_STATE_LABELS[state]}
                </Badge>
              </div>
              {s && (
                <div className="grid grid-cols-3 gap-1 mt-2 text-[10px] text-muted-foreground">
                  <span>{s.calls_today} calls</span>
                  <span>{Math.floor(s.on_call_seconds_today / 60)}m talk</span>
                  <span>{Math.floor(s.break_seconds_today / 60)}m break</span>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1 mt-4">
        <MapPin className="h-3 w-3" /> Salesmen ({salesmen.length})
      </p>
      <div className="space-y-2">
        {salesmen.length === 0 && (
          <Card className="p-3 text-xs text-muted-foreground text-center">No salesmen configured.</Card>
        )}
        {salesmen.map(sm => {
          const activeVisit = activeVisitByPerson.get(sm.id);
          return (
            <Card key={sm.id} className="p-3">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{sm.display_name}</p>
                  <p className="text-[10px] text-muted-foreground font-mono">{sm.person_code}</p>
                </div>
                {activeVisit ? (
                  <Badge variant="outline" className="text-[10px] bg-green-500/10 text-green-700 border-green-500/30">
                    <MapPin className="h-2 w-2 mr-1" />
                    At {activeVisit.customer_name}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] bg-muted text-muted-foreground">
                    Idle
                  </Badge>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
