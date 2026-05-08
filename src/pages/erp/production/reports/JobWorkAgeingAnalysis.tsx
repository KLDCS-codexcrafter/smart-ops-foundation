/**
 * @file        JobWorkAgeingAnalysis.tsx
 * @sprint      T-Phase-1.A.2.c-Job-Work-Tally-Parity
 * @decisions   D-NEW-X
 */
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Hourglass, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useJobWorkOutOrders } from '@/hooks/useJobWorkOutOrders';
import { useEntityCode } from '@/hooks/useEntityCode';
import { round2 } from '@/lib/decimal-helpers';

type Bucket = '0-30' | '31-60' | '61-90' | '90+';

export function JobWorkAgeingAnalysisPanel(): JSX.Element {
  const { entityCode } = useEntityCode();
  const { jwos } = useJobWorkOutOrders(entityCode);

  const { byVendor, summary } = useMemo(() => {
    const today = Date.now();
    const buckets: Record<Bucket, { qty: number; value: number; vendors: Set<string> }> = {
      '0-30': { qty: 0, value: 0, vendors: new Set() },
      '31-60': { qty: 0, value: 0, vendors: new Set() },
      '61-90': { qty: 0, value: 0, vendors: new Set() },
      '90+': { qty: 0, value: 0, vendors: new Set() },
    };
    const vmap = new Map<string, Record<Bucket, number>>();
    for (const j of jwos) {
      if (j.status !== 'sent' && j.status !== 'partially_received') continue;
      for (const l of j.lines) {
        const pending = l.sent_qty - l.received_qty;
        if (pending <= 0) continue;
        const ageDays = Math.floor((today - new Date(j.jwo_date).getTime()) / 86400000);
        const b: Bucket = ageDays <= 30 ? '0-30' : ageDays <= 60 ? '31-60' : ageDays <= 90 ? '61-90' : '90+';
        buckets[b].qty += pending;
        buckets[b].value = round2(buckets[b].value + pending * l.job_work_rate);
        buckets[b].vendors.add(j.vendor_id);
        const vrow = vmap.get(j.vendor_name) ?? { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };
        vrow[b] += pending;
        vmap.set(j.vendor_name, vrow);
      }
    }
    return {
      byVendor: Array.from(vmap.entries()).map(([vendor, b]) => ({ vendor, ...b })),
      summary: (Object.keys(buckets) as Bucket[]).map(b => ({
        bucket: b, qty: buckets[b].qty, value: buckets[b].value, vendors: buckets[b].vendors.size,
      })),
    };
  }, [jwos]);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-2"><Hourglass className="h-5 w-5 text-primary" /><h1 className="text-2xl font-bold">Job Work Ageing Analysis</h1></div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {summary.map(s => (
          <Card key={s.bucket}>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                {s.bucket === '90+' && s.qty > 0 && <AlertTriangle className="h-3 w-3 text-destructive" />}
                {s.bucket} days
              </div>
              <div className="text-xl font-mono">{s.qty}</div>
              <div className="text-xs text-muted-foreground">₹{s.value.toLocaleString('en-IN')} · {s.vendors} vendor(s)</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Vendor Ageing Distribution</CardTitle></CardHeader>
        <CardContent style={{ height: 360 }}>
          {byVendor.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">No pending stock</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byVendor}>
                <XAxis dataKey="vendor" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="0-30" stackId="a" fill="hsl(var(--primary))" />
                <Bar dataKey="31-60" stackId="a" fill="hsl(var(--secondary))" />
                <Bar dataKey="61-90" stackId="a" fill="hsl(var(--warning, 38 92% 50%))" />
                <Bar dataKey="90+" stackId="a" fill="hsl(var(--destructive))" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default JobWorkAgeingAnalysisPanel;
