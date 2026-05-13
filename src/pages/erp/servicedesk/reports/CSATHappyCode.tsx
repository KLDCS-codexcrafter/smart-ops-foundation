/**
 * @file        src/pages/erp/servicedesk/reports/CSATHappyCode.tsx
 * @purpose     C.1d · CSAT report · 3-channel HappyCode · OTP/Email/Verbal coverage + NPS
 * @sprint      T-Phase-1.C.1d · Block D.4
 * @iso         Functional Suitability + Usability
 */
import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { listHappyCodeFeedback } from '@/lib/servicedesk-engine';
import type { HappyCodeFeedback } from '@/types/servicedesk';

interface ChannelStat {
  channel: string;
  captured: number;
  coverage_pct: number;
  avg_nps: number | null;
}

function npsAvg(scores: (number | null)[]): number | null {
  const valid = scores.filter((s): s is number => typeof s === 'number');
  if (!valid.length) return null;
  return Math.round((valid.reduce((s, v) => s + v, 0) / valid.length) * 10) / 10;
}

function computeStats(feedbacks: HappyCodeFeedback[]): ChannelStat[] {
  const total = feedbacks.length;
  const ch1 = feedbacks.filter((f) => f.otp_verified).length;
  const ch2 = feedbacks.filter((f) => f.channel_2_responded_at !== null).length;
  const ch3 = feedbacks.filter((f) => f.channel_3_captured_at !== null).length;
  const pct = (n: number): number => (total > 0 ? Math.round((n / total) * 100) : 0);
  return [
    {
      channel: 'Channel 1 · OTP gate',
      captured: ch1,
      coverage_pct: pct(ch1),
      avg_nps: null,
    },
    {
      channel: 'Channel 2 · Email NPS (7-day JWT)',
      captured: ch2,
      coverage_pct: pct(ch2),
      avg_nps: npsAvg(feedbacks.map((f) => f.channel_2_nps_score)),
    },
    {
      channel: 'Channel 3 · Verbal inline (engineer)',
      captured: ch3,
      coverage_pct: pct(ch3),
      avg_nps: npsAvg(feedbacks.map((f) => f.channel_3_nps_score)),
    },
  ];
}

export function CSATHappyCode(): JSX.Element {
  const [feedbacks, setFeedbacks] = useState<HappyCodeFeedback[]>([]);
  useEffect(() => setFeedbacks(listHappyCodeFeedback()), []);

  const stats = useMemo(() => computeStats(feedbacks), [feedbacks]);
  const happiness_avg = useMemo(
    () => npsAvg(feedbacks.map((f) => f.channel_3_happiness_score)),
    [feedbacks],
  );

  return (
    <div className="p-6 space-y-4 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold">CSAT · HappyCode (3-channel)</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Channel coverage + average NPS · entity OPRX · {feedbacks.length} feedback records
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((s) => (
          <Card key={s.channel} className="glass-card p-4">
            <div className="text-xs text-muted-foreground">{s.channel}</div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-mono">{s.captured}</span>
              <span className="text-xs text-muted-foreground">/ {feedbacks.length}</span>
            </div>
            <div className="flex items-center justify-between mt-2">
              <Badge variant="outline" className="text-xs">{s.coverage_pct}% coverage</Badge>
              {s.avg_nps !== null && (
                <span className="text-xs font-mono text-success">NPS {s.avg_nps}</span>
              )}
            </div>
          </Card>
        ))}
      </div>

      {happiness_avg !== null && (
        <Card className="glass-card p-4">
          <div className="text-xs text-muted-foreground">Average Happiness Score (Channel 3)</div>
          <div className="text-3xl font-mono mt-1 text-primary">{happiness_avg} / 10</div>
        </Card>
      )}

      <Card className="glass-card overflow-x-auto">
        {feedbacks.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No HappyCode feedback yet · gates fire on ticket close.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border">
              <tr>
                <th className="text-left p-3 font-medium">Ticket</th>
                <th className="text-left p-3 font-medium">Customer</th>
                <th className="text-center p-3 font-medium">Ch1 OTP</th>
                <th className="text-center p-3 font-medium">Ch2 Email NPS</th>
                <th className="text-center p-3 font-medium">Ch3 Verbal NPS</th>
                <th className="text-center p-3 font-medium">Ch3 Happiness</th>
              </tr>
            </thead>
            <tbody>
              {feedbacks.map((f) => (
                <tr key={f.id} className="border-b border-border/50">
                  <td className="p-3 font-mono text-xs">{f.ticket_id}</td>
                  <td className="p-3 font-mono text-xs">{f.customer_id}</td>
                  <td className="p-3 text-center">
                    {f.otp_verified ? <span className="text-success">✓</span> : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="p-3 text-center font-mono">
                    {f.channel_2_nps_score ?? <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="p-3 text-center font-mono">
                    {f.channel_3_nps_score ?? <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="p-3 text-center font-mono">
                    {f.channel_3_happiness_score ?? <span className="text-muted-foreground">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
