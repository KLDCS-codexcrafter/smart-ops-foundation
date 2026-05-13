/**
 * @file        src/pages/erp/servicedesk/reports/AMCRenewalForecast.tsx
 * @purpose     Q-LOCK-8 · 6-month renewal forecast · Recharts BarChart · group-by + drill-down
 * @sprint      T-Phase-1.C.1b · Block F.1
 * @iso        Functional Suitability + Usability
 */
import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { listAMCRecords } from '@/lib/servicedesk-engine';
import type { AMCRecord } from '@/types/servicedesk';
import { AMCRenewalForecastDrillDown } from './AMCRenewalForecastDrillDown';
import { buildForecast, type GroupBy } from './AMCRenewalForecast.utils';

export function AMCRenewalForecast(): JSX.Element {
  const [records, setRecords] = useState<AMCRecord[]>([]);
  const [groupBy, setGroupBy] = useState<GroupBy>('oem');
  const [drill, setDrill] = useState<string | null>(null);

  useEffect(() => setRecords(listAMCRecords()), []);

  const data = useMemo(() => buildForecast(records, groupBy), [records, groupBy]);
  const empty = data.every((d) => d.total === 0);

  const drillRecords = useMemo(() => {
    if (!drill) return [];
    const idx = data.findIndex((d) => d.month === drill);
    if (idx === -1) return [];
    const now = new Date();
    return records.filter((r) => {
      if (!r.contract_end) return false;
      const end = new Date(r.contract_end);
      const monthDiff = (end.getFullYear() - now.getFullYear()) * 12 + (end.getMonth() - now.getMonth());
      return monthDiff === idx;
    });
  }, [drill, data, records]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">6-Month Renewal Forecast</h1>
      <div className="flex gap-2">
        {(['oem', 'branch', 'service_tier'] as GroupBy[]).map((g) => (
          <Button key={g} size="sm" variant={groupBy === g ? 'default' : 'outline'} onClick={() => setGroupBy(g)}>
            {g}
          </Button>
        ))}
      </div>
      <Card className="p-5">
        {empty ? (
          <div className="p-12 text-center text-sm text-muted-foreground">No expiring AMCs in next 6 months.</div>
        ) : (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} onClick={(e) => { if (e?.activeLabel) setDrill(String(e.activeLabel)); }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="total" name="Total ₹" fill="hsl(var(--primary))" />
                <Bar dataKey="risk_adjusted" name="Risk-adjusted ₹" fill="hsl(var(--accent))" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>
      <AMCRenewalForecastDrillDown
        open={!!drill}
        month={drill}
        records={drillRecords}
        onClose={() => setDrill(null)}
      />
    </div>
  );
}
