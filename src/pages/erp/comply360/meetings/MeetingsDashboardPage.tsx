/**
 * @file        src/pages/erp/comply360/meetings/MeetingsDashboardPage.tsx
 * @purpose     Meetings dashboard · Board · AGM · EGM · Committees · quorum · voting · 29th Standalone Page
 * @sprint      Sprint 103 · T-Phase-6.A.1.2 · Arc 1 UX surfacing · DP-PH6-6A
 * @reads-from  comply360-meetings-engine (FR-44 · USE-SITE READ · engine 0-DIFF)
 *              · Meeting · AttendanceRecord · VotingRecord · checkQuorum · MGT-7 context
 * [JWT] Phase 8: GET /api/comply360/meetings/* (engine wraps; surface unchanged)
 */
import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Users2, Vote, CalendarCheck2 } from 'lucide-react';
import {
  listMeetings,
  recordMeeting,
  checkQuorum,
  getMGT7MeetingContext,
  type MeetingType,
} from '@/lib/comply360-meetings-engine';

const FY = '2025-26';
const TYPES: MeetingType[] = ['Board', 'AGM', 'EGM', 'Audit_Committee', 'CSR_Committee', 'Nomination_Committee'];

export default function MeetingsDashboardPage(): JSX.Element {
  const [tab, setTab] = useState<'overview' | 'by-type' | 'voting'>('overview');

  const meetings = useMemo(() => listMeetings({ fy: FY }), []);
  const byType = useMemo(() => {
    const acc: Record<MeetingType, number> = {
      Board: 0, AGM: 0, EGM: 0, Audit_Committee: 0, CSR_Committee: 0, Nomination_Committee: 0,
    };
    for (const m of meetings) acc[m.meeting_type] += 1;
    return acc;
  }, [meetings]);
  const quorumMet = useMemo(() => meetings.filter((m) => m.is_quorum_met).length, [meetings]);
  const quorumFailed = meetings.length - quorumMet;
  const mgt7 = useMemo(() => getMGT7MeetingContext(FY), []);

  const liveQuorum = useMemo(() => {
    const m = meetings[0];
    if (!m) return null;
    // Engine read · checkQuorum derives from attendance ledger.
    return { meetingId: m.id, ...checkQuorum(m.id) };
  }, [meetings]);

  const handleSeed = (): void => {
    if (meetings.length > 0) return;
    // [JWT] POST /api/comply360/meetings — wraps engine.recordMeeting
    recordMeeting({
      meeting_type: 'Board',
      fy: FY,
      meeting_date: new Date().toISOString().slice(0, 10),
      meeting_number: 'BM-2025-01',
      agenda_items: ['Approval of audited accounts', 'Declaration of dividend'],
      minutes_summary: 'Quorum present · resolutions passed unanimously.',
      required_quorum: 3,
      attendees_count: 4,
      recorded_by_bap: 'mr-a-client',
    });
  };

  return (
    <div className="p-6 space-y-4">
      <header className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Users2 className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Meetings · Board · AGM · Committees</h1>
          <p className="text-sm text-muted-foreground">
            Standalone Page #29 · reads <span className="font-mono">comply360-meetings-engine</span> · quorum · attendance · voting · MGT-7 linkage
          </p>
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">Meetings · FY {FY}</div>
          <div className="text-2xl font-bold font-mono">{meetings.length}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">Quorum met</div>
          <div className="text-2xl font-bold font-mono text-success">{quorumMet}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">Quorum failed</div>
          <div className={`text-2xl font-bold font-mono ${quorumFailed > 0 ? 'text-warning' : ''}`}>{quorumFailed}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">MGT-7 linkage</div>
          <div className="text-sm font-mono mt-1">{mgt7.mgt7_filing_id ?? '—'}</div>
        </Card>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="by-type">By type</TabsTrigger>
          <TabsTrigger value="voting">Voting · Quorum</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-3">
          {meetings.length === 0 ? (
            <Card className="p-4">
              <p className="text-xs text-muted-foreground">
                No meetings recorded for FY {FY}.{' '}
                <button type="button" className="underline text-primary" onClick={handleSeed}>
                  Seed demo Board meeting
                </button>
              </p>
            </Card>
          ) : (
            <Card className="p-4">
              <table className="w-full text-xs">
                <thead className="text-muted-foreground">
                  <tr><th className="text-left p-2">#</th><th className="text-left p-2">Type</th><th className="text-left p-2">Date</th><th className="text-left p-2">Attendees</th><th className="text-left p-2">Quorum</th></tr>
                </thead>
                <tbody>
                  {meetings.map((m) => (
                    <tr key={m.id} className="border-t border-border">
                      <td className="p-2 font-mono">{m.meeting_number}</td>
                      <td className="p-2">{m.meeting_type}</td>
                      <td className="p-2 font-mono">{m.meeting_date}</td>
                      <td className="p-2 font-mono">{m.attendees_count}/{m.required_quorum}</td>
                      <td className="p-2">
                        <Badge variant={m.is_quorum_met ? 'default' : 'destructive'}>
                          {m.is_quorum_met ? 'MET' : 'FAILED'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="by-type">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {TYPES.map((t) => (
              <Card key={t} className="p-3">
                <div className="text-xs text-muted-foreground">{t.replace(/_/g, ' ')}</div>
                <div className="text-2xl font-bold font-mono">{byType[t]}</div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="voting">
          <Card className="p-4">
            <h2 className="font-semibold text-sm flex items-center gap-2">
              <Vote className="h-4 w-4 text-primary" /> Live quorum probe (latest meeting)
            </h2>
            {liveQuorum ? (
              <p className="text-xs text-muted-foreground mt-2 font-mono">
                Meeting {liveQuorum.meetingId} · {liveQuorum.attendees}/{liveQuorum.required} ·{' '}
                <span className={liveQuorum.is_quorum_met ? 'text-success' : 'text-warning'}>
                  {liveQuorum.is_quorum_met ? 'MET' : 'NOT MET'}
                </span>
              </p>
            ) : (
              <p className="text-xs text-muted-foreground mt-2">No meeting to probe.</p>
            )}
          </Card>
          <Card className="p-4 mt-3">
            <h2 className="font-semibold text-sm flex items-center gap-2">
              <CalendarCheck2 className="h-4 w-4 text-primary" /> MGT-7 annual return context
            </h2>
            <p className="text-xs text-muted-foreground mt-2 font-mono">
              FY {FY} · linked filing: {mgt7.mgt7_filing_id ?? 'not linked'}
            </p>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
