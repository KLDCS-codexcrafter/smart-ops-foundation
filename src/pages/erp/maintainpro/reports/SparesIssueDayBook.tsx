/**
 * @file        src/pages/erp/maintainpro/reports/SparesIssueDayBook.tsx
 * @purpose     TDL Spares Issue voucher · day-wise consumption ledger · FR-42
 * @sprint      T-Phase-1.A.16c · Block B.5 · NEW
 */
import { useMemo } from 'react';
import { listSparesIssues } from '@/lib/maintainpro-engine';
import { MaintainProReportShell } from '@/components/maintainpro/MaintainProReportShell';

const E = 'DEMO';

export function SparesIssueDayBook(): JSX.Element {
  const rows = useMemo(() => listSparesIssues(E).sort((a, b) => (a.issued_at < b.issued_at ? 1 : -1)), []);

  return (
    <MaintainProReportShell title="Spares Issue Day Book" ssotBadge="TDL · FR-42">
      <table className="w-full text-sm">
        <thead className="text-left text-muted-foreground">
          <tr><th className="p-2">Date</th><th className="p-2">Issue No</th><th className="p-2">Spare</th><th className="p-2">Qty</th><th className="p-2">Equipment</th><th className="p-2">WO / Breakdown</th><th className="p-2">Cost</th></tr>
        </thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan={7} className="p-4 text-center text-muted-foreground">No issues</td></tr>}
          {rows.map((r) => (
            <tr key={r.id} className="border-t">
              <td className="p-2 font-mono text-xs">{r.issued_at.slice(0, 10)}</td>
              <td className="p-2 font-mono text-xs">{r.issue_no}</td>
              <td className="p-2 font-mono text-xs">{r.spare_id}</td>
              <td className="p-2 font-mono">{r.qty}</td>
              <td className="p-2 font-mono text-xs">{r.consuming_equipment_id}</td>
              <td className="p-2 font-mono text-xs">{r.consuming_work_order_id ?? r.consuming_breakdown_id ?? '—'}</td>
              <td className="p-2 font-mono">₹{r.total_cost.toLocaleString('en-IN')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </MaintainProReportShell>
  );
}

export default SparesIssueDayBook;
