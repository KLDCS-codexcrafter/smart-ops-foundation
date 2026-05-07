/**
 * @file     QCTrendChart.tsx
 * @sprint   T-Phase-1.3-3b-pre-3 · Block E · D-643
 * @purpose  Pass/fail trend over time · LineChart.
 */
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { QCTrendPoint } from '@/types/qc-dashboard-mode';

export interface QCTrendChartProps {
  data: QCTrendPoint[];
}

export function QCTrendChart({ data }: QCTrendChartProps): JSX.Element {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
        <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
        <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fontSize: 11 }} />
        <Tooltip />
        <Legend />
        <Line yAxisId="left" type="monotone" dataKey="pass_count" stroke="hsl(var(--success))" name="Pass" strokeWidth={2} />
        <Line yAxisId="left" type="monotone" dataKey="fail_count" stroke="hsl(var(--destructive))" name="Fail" strokeWidth={2} />
        <Line yAxisId="right" type="monotone" dataKey="pass_rate_pct" stroke="hsl(var(--primary))" name="Pass Rate %" strokeDasharray="5 5" />
      </LineChart>
    </ResponsiveContainer>
  );
}
