/**
 * @file        src/pages/erp/comply360/calendar/CalendarPage.tsx
 * @purpose     Sprint 78b · Compliance Calendar mega-menu shell · consumes comply360-calendar-engine.
 *              First live surface under the 'calendar' sidebar group (Coming Soon since S69).
 * @sprint      Sprint 78b · T-Phase-5.A.1.10-PASS-B · Block 3
 * @decisions   D-S69-1 (NATIVE) · DP-S78-1 (calendar = mega-menu) · FR-106
 */
import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { CalendarDays, Building2 } from 'lucide-react';
import {
  buildCalendar,
  calendarForMonth,
  nextUpcomingEvents,
  type CalendarEvent,
} from '@/lib/comply360-calendar-engine';

const ENTITIES = ['DEMO-CORP-01', 'ACME-PVT-LTD', 'BHARAT-AGRO-LLP'];
const FYS = ['2025-26', '2026-27'];
const MONTHS = [
  ['Apr', 4], ['May', 5], ['Jun', 6], ['Jul', 7], ['Aug', 8], ['Sep', 9],
  ['Oct', 10], ['Nov', 11], ['Dec', 12], ['Jan', 1], ['Feb', 2], ['Mar', 3],
] as const;

function statusClass(status: CalendarEvent['status']): string {
  switch (status) {
    case 'filed': return 'text-success';
    case 'overdue': return 'text-destructive';
    case 'breach': return 'text-destructive';
    default: return 'text-warning';
  }
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${String(d.getUTCDate()).padStart(2, '0')} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export default function CalendarPage(): JSX.Element {
  const [entity, setEntity] = useState<string>(ENTITIES[0]);
  const [fy, setFy] = useState<string>(FYS[0]);
  const [view, setView] = useState<'upcoming' | 'month' | 'all'>('upcoming');
  const [monthIdx, setMonthIdx] = useState<number>(0);

  const all = useMemo<CalendarEvent[]>(() => buildCalendar(entity, fy), [entity, fy]);
  const upcoming = useMemo<CalendarEvent[]>(() => nextUpcomingEvents(entity, 20), [entity]);
  const monthEvents = useMemo<CalendarEvent[]>(() => {
    const [, m] = MONTHS[monthIdx];
    const year = ['Jan', 'Feb', 'Mar'].includes(MONTHS[monthIdx][0]) ? 2027 : 2026;
    return calendarForMonth(entity, year, m);
  }, [entity, monthIdx]);

  const list = view === 'upcoming' ? upcoming : view === 'month' ? monthEvents : all;

  return (
    <div className="p-4 max-w-7xl mx-auto space-y-4">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <CalendarDays className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold">Compliance Calendar</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            FY 25-26 statutory dates · GST · TDS · ROC · Tax Audit · Income Tax · MSME (seeded by comply360-calendar-engine).
          </p>
        </div>
      </div>

      <Card className="p-3 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <label className="text-xs font-medium">Entity</label>
          <select
            className="text-xs bg-background border rounded-md px-2 py-1"
            value={entity}
            onChange={(e) => setEntity(e.target.value)}
          >
            {ENTITIES.map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium">FY</label>
          <select
            className="text-xs bg-background border rounded-md px-2 py-1"
            value={fy}
            onChange={(e) => setFy(e.target.value)}
          >
            {FYS.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
        {view === 'month' && (
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium">Month</label>
            <select
              className="text-xs bg-background border rounded-md px-2 py-1"
              value={monthIdx}
              onChange={(e) => setMonthIdx(Number(e.target.value))}
            >
              {MONTHS.map(([m], i) => <option key={m} value={i}>{m}</option>)}
            </select>
          </div>
        )}
        <div className="ml-auto text-xs font-mono text-muted-foreground">
          {list.length} obligation{list.length === 1 ? '' : 's'}
        </div>
      </Card>

      <Tabs value={view} onValueChange={(v) => setView(v as 'upcoming' | 'month' | 'all')}>
        <TabsList>
          <TabsTrigger value="upcoming">Upcoming (next 20)</TabsTrigger>
          <TabsTrigger value="month">By Month</TabsTrigger>
          <TabsTrigger value="all">Full FY</TabsTrigger>
        </TabsList>
        <TabsContent value={view}>
          {list.length === 0 ? (
            <Card className="p-8 text-center text-sm text-muted-foreground">
              No statutory obligations for the selected view.
            </Card>
          ) : (
            <Card className="overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-muted/40">
                  <tr className="text-left">
                    <th className="px-3 py-2 font-medium">Due Date</th>
                    <th className="px-3 py-2 font-medium">Module</th>
                    <th className="px-3 py-2 font-medium">Obligation</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((e) => (
                    <tr key={e.id} className="border-t hover:bg-muted/20">
                      <td className="px-3 py-2 font-mono">{formatDate(e.due_date)}</td>
                      <td className="px-3 py-2 text-muted-foreground">{e.module}</td>
                      <td className="px-3 py-2">{e.label}</td>
                      <td className={`px-3 py-2 font-medium ${statusClass(e.status)}`}>{e.status}</td>
                      <td className="px-3 py-2 font-mono text-[10px] text-muted-foreground">{e.source_id}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
