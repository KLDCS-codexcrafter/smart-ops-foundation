/**
 * @file        PoAgingCrossDeptPanel.tsx
 * @purpose     PO aging aggregated by originating department · joins bills-pending dimension.
 * @sprint      T-Phase-1.A.3.c-Procure360-OOB-Polish-PEQ-FU
 * @decisions   D-NEW-AP · D-NEW-AQ
 * @disciplines FR-19 · FR-25 · FR-30 · FR-50 · FR-53
 * @reuses      po-cross-dept-followup
 * @[JWT]       n/a · derived view
 */

import { useMemo } from 'react';
import { useEntityCode } from '@/hooks/useEntityCode';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { aggregatePoByDepartment, type CrossDeptPoBucket } from '@/lib/po-cross-dept-followup';

const fmtINR = (n: number): string => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export function PoAgingCrossDeptPanel(): JSX.Element {
  const { entityCode } = useEntityCode();
  const buckets = useMemo<CrossDeptPoBucket[]>(
    () => aggregatePoByDepartment(entityCode),
    [entityCode],
  );

  const kpis = useMemo(() => {
    const totals = buckets.reduce(
      (a, b) => ({
        depts: a.depts + 1,
        openPo: a.openPo + b.open_po_count,
        overdue: a.overdue + b.overdue_po_count,
        value: a.value + b.total_open_value,
      }),
      { depts: 0, openPo: 0, overdue: 0, value: 0 },
    );
    return totals;
  }, [buckets]);

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">PO Aging · Cross-Dept</h1>
        <p className="text-sm text-muted-foreground">
          Open POs and bills-pending grouped by originating department · per FR-25 · Trident B12.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Departments</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold font-mono">{kpis.depts}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Open POs</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold font-mono">{kpis.openPo}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Overdue POs</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold font-mono text-destructive">{kpis.overdue}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Open Value</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold font-mono">{fmtINR(kpis.value)}</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          {buckets.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No open POs to age.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-2">Department</th>
                  <th className="text-right p-2">Open POs</th>
                  <th className="text-right p-2">Overdue</th>
                  <th className="text-right p-2">Total Open Value</th>
                  <th className="text-right p-2">Oldest Overdue (d)</th>
                  <th className="text-right p-2">Bills Pending</th>
                  <th className="text-right p-2">Bills Pending Value</th>
                </tr>
              </thead>
              <tbody>
                {buckets.map((b) => (
                  <tr key={b.department_id} className="border-t">
                    <td className="p-2 font-medium">{b.department_name}</td>
                    <td className="p-2 text-right font-mono">{b.open_po_count}</td>
                    <td className="p-2 text-right font-mono">
                      {b.overdue_po_count > 0
                        ? <span className="text-destructive">{b.overdue_po_count}</span>
                        : 0}
                    </td>
                    <td className="p-2 text-right font-mono">{fmtINR(b.total_open_value)}</td>
                    <td className="p-2 text-right font-mono">{b.oldest_overdue_days}</td>
                    <td className="p-2 text-right font-mono">{b.bills_pending_count}</td>
                    <td className="p-2 text-right font-mono">{fmtINR(b.bills_pending_value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
