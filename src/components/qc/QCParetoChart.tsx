/**
 * @file     QCParetoChart.tsx
 * @sprint   T-Phase-1.3-3b-pre-3 · Block F · D-644
 * @purpose  Q60=c · 4-grouping Pareto · ComposedChart · ViewModeSelector consumer #7.
 */
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine, ResponsiveContainer,
} from 'recharts';
import { Settings2, Package, Cog, User } from 'lucide-react';
import { ViewModeSelector } from '@/components/ViewModeSelector';
import type { ParetoData, ParetoGroupingMode } from '@/types/qc-dashboard-mode';

export interface QCParetoChartProps {
  data: ParetoData;
  grouping: ParetoGroupingMode;
  onGroupingChange: (g: ParetoGroupingMode) => void;
}

export function QCParetoChart({ data, grouping, onGroupingChange }: QCParetoChartProps): JSX.Element {
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <ViewModeSelector<ParetoGroupingMode>
          value={grouping}
          onChange={onGroupingChange}
          label="Group by:"
          options={[
            { id: 'per_parameter', label: 'Parameter', tooltip: 'Most granular · best for SPC root-cause analysis', icon: Settings2 },
            { id: 'per_item', label: 'Item', tooltip: 'Item-level rollup · matches procurement vocabulary', icon: Package },
            { id: 'per_machine', label: 'Machine', tooltip: 'Machine-level · best for OEE + maintenance correlation', icon: Cog },
            { id: 'per_inspector', label: 'Inspector', tooltip: 'Inspector-level · best for quality calibration', icon: User },
          ]}
        />
      </div>

      <ResponsiveContainer width="100%" height={350}>
        <ComposedChart data={data.bins} margin={{ top: 5, right: 30, left: 0, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={80} />
          <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
          <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fontSize: 11 }} />
          <Tooltip />
          <Legend />
          <Bar yAxisId="left" dataKey="fail_count" fill="hsl(var(--destructive))" name="Failure Count" />
          <Line yAxisId="right" type="monotone" dataKey="cumulative_pct" stroke="hsl(var(--primary))" name="Cumulative %" strokeWidth={2} />
          <ReferenceLine yAxisId="right" y={80} stroke="hsl(var(--warning))" strokeDasharray="5 5" label={{ value: '80%', position: 'right', fontSize: 10 }} />
        </ComposedChart>
      </ResponsiveContainer>

      <div className="text-xs text-muted-foreground text-center">
        Showing {data.bins.length} {grouping.replace('per_', '')}(s) · 80% line indicates Pareto threshold
      </div>
    </div>
  );
}
