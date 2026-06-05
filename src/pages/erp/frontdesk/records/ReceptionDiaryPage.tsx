/**
 * @file        src/pages/erp/frontdesk/records/ReceptionDiaryPage.tsx
 * @sprint      Sprint 147 · T-FrontDesk-A6F.3 · Block 4 · Reception Diary (DP-FD-16 · COMPUTED)
 */
import { useMemo, useState } from 'react';
import { useEntityCode } from '@/hooks/useEntityCode';
import { buildReceptionDiary } from '@/lib/frontdesk-records-engine';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export function ReceptionDiaryPage(): JSX.Element {
  const { entityCode } = useEntityCode();
  const [day, setDay] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const diary = useMemo(() => buildReceptionDiary(entityCode, day), [entityCode, day]);

  return (
    <div className="p-6 space-y-4 print:p-2">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Reception Diary · {day}</CardTitle>
          <div className="flex items-center gap-2">
            <Input type="date" value={day} onChange={(e) => setDay(e.target.value)} className="w-40" />
            <Button variant="outline" onClick={() => window.print()}>Print</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <section>
            <h3 className="font-semibold mb-2">Visitors</h3>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <Stat label="Checked in" value={diary.visitorsIn} />
              <Stat label="Checked out" value={diary.visitorsOut} />
              <Stat label="Still on site" value={diary.overstaysOpen} />
            </div>
          </section>

          <Section title={`Unclaimed inward mail (${diary.unclaimedInwardMail.length})`}
            empty="None — clean board.">
            {diary.unclaimedInwardMail.map((m) => (
              <Row key={m.mailId} left={m.description} right={`${m.toEmployeeName} · ${m.ageDays}d`} />
            ))}
          </Section>

          <Section title={`Unconfirmed outward (${diary.unconfirmedOutward.length})`}
            empty="None — all confirmed.">
            {diary.unconfirmedOutward.map((m) => (
              <Row key={m.mailId} left={m.description}
                right={`sent ${new Date(m.sentAt).toLocaleDateString('en-IN')} · ${m.ageDays}d`} />
            ))}
          </Section>

          <Section title={`Asset custody overdue (${diary.custodyOverdue.length})`}
            empty="No overdue custody.">
            {diary.custodyOverdue.map((r) => (
              <Row key={r.recordId} left={r.assetLabel}
                right={`${r.employeeName} · due ${new Date(r.dueBackAt).toLocaleDateString('en-IN')}`} />
            ))}
          </Section>

          <Section title={`Tomorrow's appointments (${diary.tomorrowsAppointments.length})`}
            empty="None scheduled.">
            {diary.tomorrowsAppointments.map((a, i) => (
              <Row key={`${a.startAt}-${i}`} left={a.title}
                right={`${a.executiveName} · ${new Date(a.startAt).toLocaleTimeString('en-IN')}`} />
            ))}
          </Section>

          {diary.expectedCouriers.length > 0 && (
            <Section title={`Expected couriers (${diary.expectedCouriers.length})`} empty="">
              {diary.expectedCouriers.map((c) => (
                <Row key={c.mailId} left={c.description} right={<Badge variant="outline">courier</Badge>} />
              ))}
            </Section>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }): JSX.Element {
  return (
    <div className="rounded-md border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl font-bold font-mono">{value}</div>
    </div>
  );
}

function Section({ title, empty, children }:
  { title: string; empty: string; children: React.ReactNode }): JSX.Element {
  const empty_ = (Array.isArray(children) ? children.length === 0 : !children);
  return (
    <section>
      <h3 className="font-semibold mb-2">{title}</h3>
      {empty_ ? <div className="text-sm text-muted-foreground">{empty}</div>
        : <div className="space-y-1">{children}</div>}
    </section>
  );
}

function Row({ left, right }: { left: React.ReactNode; right: React.ReactNode }): JSX.Element {
  return (
    <div className="flex items-center justify-between text-sm border-b py-1 last:border-0">
      <span>{left}</span>
      <span className="text-muted-foreground">{right}</span>
    </div>
  );
}
