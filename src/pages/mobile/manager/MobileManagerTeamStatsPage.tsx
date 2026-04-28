/**
 * MobileManagerTeamStatsPage.tsx — Org-wide aggregate + top/bottom 5
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
import { type Enquiry, enquiriesKey } from '@/types/enquiry';
import { type Quotation, quotationsKey } from '@/types/quotation';
import { type Order, ordersKey } from '@/types/order';

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
const fmtINR = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

export default function MobileManagerTeamStatsPage() {
  const navigate = useNavigate();
  const session = useMemo(() => readSession(), []);

  const data = useMemo(() => {
    if (!session) return null;
    const today = new Date().toISOString().slice(0, 10);
    const monthPrefix = today.slice(0, 7);
    const calls = loadList<CallSession>(callSessionsKey(session.entity_code));
    const visits = loadList<VisitLog>(visitLogsKey(session.entity_code));
    const enquiries = loadList<Enquiry>(enquiriesKey(session.entity_code));
    const quotations = loadList<Quotation>(quotationsKey(session.entity_code));
    const orders = loadList<Order>(ordersKey(session.entity_code))
      .filter(o => o.base_voucher_type === 'Sales Order');
    const persons = loadList<SAMPerson>(samPersonsKey(session.entity_code));

    const callsToday = calls.filter(c => c.call_date === today).length;
    const callsMonth = calls.filter(c => c.call_date.startsWith(monthPrefix)).length;
    const visitsToday = visits.filter(v => v.check_in_time.slice(0, 10) === today).length;
    const visitsMonth = visits.filter(v => v.check_in_time.slice(0, 7) === monthPrefix).length;
    const enqMonth = enquiries.filter(e => (e.created_at ?? '').startsWith(monthPrefix)).length;
    const quoMonth = quotations.filter(q => (q.created_at ?? '').startsWith(monthPrefix)).length;
    const soMonth = orders.filter(o => o.date.startsWith(monthPrefix)).length;

    const valByPerson = new Map<string, number>();
    for (const o of orders) {
      const sid = (o as { salesman_id?: string | null }).salesman_id;
      if (!sid) continue;
      valByPerson.set(sid, (valByPerson.get(sid) ?? 0) + (o.net_amount ?? 0));
    }
    const ranked = persons
      .map(p => ({ p, v: valByPerson.get(p.id) ?? 0 }))
      .filter(r => r.v > 0)
      .sort((a, b) => b.v - a.v);
    const top5 = ranked.slice(0, 5);
    const bottom5 = persons
      .filter(p => (valByPerson.get(p.id) ?? 0) === 0
        && (p.person_code.startsWith('SM-') || p.person_code.startsWith('AG-')))
      .slice(0, 5);

    return {
      callsToday, callsMonth, visitsToday, visitsMonth,
      enqMonth, quoMonth, soMonth, top5, bottom5,
    };
  }, [session]);

  if (!session || !data) return null;

  return (
    <div className="p-4 max-w-md mx-auto space-y-3 pb-12">
      <div className="flex items-center gap-2 mb-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/mobile/manager')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-base font-semibold">Team Stats</h1>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Card className="p-3">
          <p className="text-[10px] uppercase text-muted-foreground">Calls today</p>
          <p className="text-xl font-bold font-mono">{data.callsToday}</p>
          <p className="text-[10px] text-muted-foreground">Month: {data.callsMonth}</p>
        </Card>
        <Card className="p-3">
          <p className="text-[10px] uppercase text-muted-foreground">Visits today</p>
          <p className="text-xl font-bold font-mono">{data.visitsToday}</p>
          <p className="text-[10px] text-muted-foreground">Month: {data.visitsMonth}</p>
        </Card>
        <Card className="p-3">
          <p className="text-[10px] uppercase text-muted-foreground">Enquiries (m)</p>
          <p className="text-xl font-bold font-mono">{data.enqMonth}</p>
        </Card>
        <Card className="p-3">
          <p className="text-[10px] uppercase text-muted-foreground">Quotations (m)</p>
          <p className="text-xl font-bold font-mono">{data.quoMonth}</p>
        </Card>
        <Card className="p-3 col-span-2">
          <p className="text-[10px] uppercase text-muted-foreground">SOs booked (m)</p>
          <p className="text-2xl font-bold font-mono">{data.soMonth}</p>
        </Card>
      </div>

      <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mt-3">Top 5 Performers</p>
      {data.top5.length === 0 && (
        <Card className="p-3 text-xs text-muted-foreground text-center flex items-center justify-center gap-2">
          <BarChart3 className="h-4 w-4" /> No SO activity yet
        </Card>
      )}
      <div className="space-y-1">
        {data.top5.map(r => (
          <Card key={r.p.id} className="p-2 flex items-center justify-between">
            <p className="text-xs font-medium">{r.p.display_name}</p>
            <p className="text-xs font-mono font-semibold text-green-700">{fmtINR(r.v)}</p>
          </Card>
        ))}
      </div>

      {data.bottom5.length > 0 && (
        <>
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mt-3">Need Attention</p>
          <div className="space-y-1">
            {data.bottom5.map(p => (
              <Card key={p.id} className="p-2 flex items-center justify-between">
                <p className="text-xs font-medium">{p.display_name}</p>
                <p className="text-xs font-mono text-red-700">No SO</p>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
