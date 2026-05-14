/**
 * @file        src/pages/erp/servicedesk/engineers/EngineerBurnoutDashboard.tsx
 * @purpose     S31 Engineer Burnout Dashboard · >15 tickets/wk = flag
 * @sprint      T-Phase-1.C.1f · Block G.2
 * @iso         Functional Suitability + Usability
 */
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { detectEngineerBurnout } from '@/lib/servicedesk-engine';

export function EngineerBurnoutDashboard(): JSX.Element {
  const flags = detectEngineerBurnout().sort((a, b) => b.tickets_this_week - a.tickets_this_week);
  const chart = flags.map((f) => ({ name: f.engineer_id.slice(0, 12), tickets: f.tickets_this_week }));

  const tone = (n: number): 'destructive' | 'secondary' | 'default' => {
    if (n > 15) return 'destructive';
    if (n >= 11) return 'secondary';
    return 'default';
  };

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Engineer Burnout Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          S31 Tier 2 OOB · {flags.length} engineer(s) tracked · &gt;15 tickets/week = burnout flag
        </p>
      </div>

      <Card className="p-4">
        <h2 className="font-semibold mb-3">Weekly Ticket Load</h2>
        {chart.length === 0 ? (
          <p className="text-sm text-muted-foreground">No assigned tickets in last 7 days.</p>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="tickets" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <Card className="p-0 overflow-hidden">
        {flags.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">No engineers with assigned tickets this week.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr className="text-left">
                <th className="p-3 font-medium">Engineer</th>
                <th className="p-3 font-medium">Tickets (7d)</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {flags.map((f) => (
                <tr key={f.engineer_id} className={`border-t ${f.is_burnout_flag ? 'bg-destructive/5' : ''}`}>
                  <td className="p-3 font-mono text-xs">{f.engineer_id}</td>
                  <td className="p-3 font-mono">{f.tickets_this_week}</td>
                  <td className="p-3">
                    <Badge variant={tone(f.tickets_this_week)}>
                      {f.is_burnout_flag ? 'BURNOUT' : f.tickets_this_week >= 11 ? 'High load' : 'OK'}
                    </Badge>
                  </td>
                  <td className="p-3">
                    {f.is_burnout_flag && <Button size="sm" variant="outline">Reassign</Button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <p className="text-xs text-muted-foreground">{/* [JWT] Phase 2: historical trend aggregation */}Trend chart wired in Phase 2.</p>
    </div>
  );
}
