/**
 * @file        DepartmentWiseSummary.tsx
 * @sprint      T-Phase-1.2.6f-pre-2 · Block B
 */
import { useMemo } from 'react';
import { SkeletonRows } from '@/components/ui/SkeletonRows';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ShieldCheck } from 'lucide-react';
import { TableChartToggle } from '@/components/operix-core/report-framework';
import { signReport, getKpi, defaultChartConfig } from '@/lib/report-framework';
import { useMaterialIndents } from '@/hooks/useMaterialIndents';
import { useServiceRequests } from '@/hooks/useServiceRequests';
import { useCapitalIndents } from '@/hooks/useCapitalIndents';
import { useOrgStructure } from '@/hooks/useOrgStructure';
import { groupByDepartment, inrFmt } from '@/lib/requestx-report-engine';

export function DepartmentWiseSummaryPanel(): JSX.Element {
  const mi = useMaterialIndents();
  const sr = useServiceRequests();
  const ci = useCapitalIndents();
  const { departments } = useOrgStructure();

  const rows = useMemo(() => {
    const all = [...mi, ...sr, ...ci];
    const groups = groupByDepartment(all);
    return groups.map(g => {
      const canonical = departments.find(d => d.id === g.department_id);
      return { ...g, canonical_name: canonical?.name ?? g.department_name };
    });
  }, [mi, sr, ci, departments]);

  const total = rows.reduce((acc, g) => acc + g.total_value, 0);

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Department-wise Summary</h1>
        <p className="text-sm text-muted-foreground">
          Department names sourced from canonical OrgStructure SSOT (Command Center → Business Units).
        </p>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Total: {inrFmt(total)}</CardTitle></CardHeader>
        <CardContent>
          <SkeletonRows><Table>
            <TableHeader>
              <TableRow>
                <TableHead>Department</TableHead>
                <TableHead className="text-right">Indents</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead className="text-right">% of Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center text-xs text-muted-foreground">
                  No data.
                </TableCell></TableRow>
              )}
              {rows.map(g => (
                <TableRow key={g.department_id}>
                  <TableCell className="text-xs">{g.canonical_name}</TableCell>
                  <TableCell className="font-mono text-xs text-right">{g.count}</TableCell>
                  <TableCell className="font-mono text-xs text-right">{inrFmt(g.total_value)}</TableCell>
                  <TableCell className="font-mono text-xs text-right">
                    {total > 0 ? Math.round((g.total_value / total) * 100) : 0}%
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table></SkeletonRows>
        </CardContent>
      </Card>
      <DeptSummaryChartCard rows={rows} />
    </div>
  );
}

function DeptSummaryChartCard({ rows }: { rows: Array<{ department_id: string; canonical_name: string; total_value: number }> }): JSX.Element {
  const chartRows = useMemo(
    () => rows.map(r => ({ department: r.canonical_name, indent_value: r.total_value })),
    [rows],
  );
  const chartConfig = getKpi('rq-dept-summary')?.defaultChart ?? defaultChartConfig({
    chartType: 'column', xKey: 'department',
    series: [{ key: 'indent_value', label: 'Indent Value ₹' }],
    title: 'Indent value by department',
  });
  const integrityHash = useMemo(() => signReport(chartRows), [chartRows]);
  const shortHash = integrityHash.replace('fnv1a:', '').slice(0, 10);
  return (
    <Card className="p-3 space-y-2" data-testid="rq-dept-summary-toggle-host">
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="outline" className="text-[10px] font-mono" data-testid="rq-dept-summary-integrity-badge" title={integrityHash}>
          <ShieldCheck className="h-3 w-3 mr-1" />{shortHash}
        </Badge>
      </div>
      <TableChartToggle
        rows={chartRows}
        columns={[
          { key: 'department', label: 'Department' },
          { key: 'indent_value', label: 'Indent Value ₹', align: 'right' },
        ]}
        chartConfig={chartConfig}
        defaultView="table"
        emptyLabel="No department data"
      />
    </Card>
  );
}
