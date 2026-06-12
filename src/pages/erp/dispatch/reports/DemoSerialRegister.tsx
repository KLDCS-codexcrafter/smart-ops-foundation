/**
 * DemoSerialRegister.tsx — 012 · Demo serial tracking register
 * Sprint A.4-Residual · CONSUMES demo-outward-memo.serial_no via
 * dispatch-residual-engine.buildDemoSerialRegister. Honest empty when none.
 */
import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ShieldCheck } from 'lucide-react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { PageFloorShell } from '@/components/shared/PageFloorShell';
import { buildDemoSerialRegister } from '@/lib/dispatch-residual-engine';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import { TableChartToggle } from '@/components/operix-core/report-framework';
import { signReport, getKpi, defaultChartConfig } from '@/lib/report-framework';

export function DemoSerialRegisterPanel() {
  const { entityCode } = useCardEntitlement();
  const rows = useMemo(() => buildDemoSerialRegister(entityCode), [entityCode]);

  const byStatus = new Map<string, number>();
  for (const r of rows) byStatus.set(r.status, (byStatus.get(r.status) ?? 0) + 1);
  const chartRows = Array.from(byStatus.entries()).map(([status, count]) => ({ status, count }));
  const cfg = getKpi('dp-demo-serial')?.defaultChart ?? defaultChartConfig({
    chartType: 'column', xKey: 'status',
    series: [{ key: 'count', label: 'Serials' }],
    title: 'Demo serials by status',
  });
  const hash = signReport(chartRows);
  const short = hash.replace('fnv1a:', '').slice(0, 10);

  return (
    <>
      <PageFloorShell
        title="Demo Serial Register"
        subtitle="Per-serial tracking of demo units issued via DOM · honest empty when no serials captured"
        isEmpty={rows.length === 0}
        emptyMessage="No demo units with serial numbers issued yet."
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Serial No</TableHead>
              <TableHead className="text-xs">Item</TableHead>
              <TableHead className="text-xs">DOM</TableHead>
              <TableHead className="text-xs">Date</TableHead>
              <TableHead className="text-xs">Recipient</TableHead>
              <TableHead className="text-xs">Due</TableHead>
              <TableHead className="text-xs">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={`${r.memo_id}-${r.item_id}-${r.serial_no}`}>
                <TableCell className="font-mono text-xs">{r.serial_no}</TableCell>
                <TableCell className="text-xs">{r.item_name}</TableCell>
                <TableCell className="font-mono text-xs">{r.memo_no}</TableCell>
                <TableCell className="font-mono text-xs">{r.memo_date}</TableCell>
                <TableCell className="text-xs">{r.recipient_name}</TableCell>
                <TableCell className="font-mono text-xs">{r.return_due_date ?? '—'}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Badge variant="outline" className="text-[10px]">{r.status}</Badge>
                    {r.is_overdue && (
                      <Badge variant="destructive" className="text-[10px]">overdue</Badge>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </PageFloorShell>
      <Card className="p-3 space-y-2 mt-4" data-testid="dp-demo-serial-toggle-host">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-[10px] font-mono" data-testid="dp-demo-serial-integrity-badge" title={hash}>
            <ShieldCheck className="h-3 w-3 mr-1" />{short}
          </Badge>
        </div>
        <TableChartToggle
          rows={chartRows}
          columns={[
            { key: 'status', label: 'Status' },
            { key: 'count', label: 'Serials', align: 'right' },
          ]}
          chartConfig={cfg}
          defaultView="table"
          emptyLabel="No demo serials"
        />
      </Card>
    </>
  );
}

export default DemoSerialRegisterPanel;
