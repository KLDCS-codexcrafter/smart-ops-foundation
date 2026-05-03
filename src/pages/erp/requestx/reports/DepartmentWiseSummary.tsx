/**
 * @file        DepartmentWiseSummary.tsx
 * @sprint      T-Phase-1.2.6f-pre-2 · Block B
 */
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
          <Table>
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
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
