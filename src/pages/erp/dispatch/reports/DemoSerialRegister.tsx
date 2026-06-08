/**
 * DemoSerialRegister.tsx — 012 · Demo serial tracking register
 * Sprint A.4-Residual · CONSUMES demo-outward-memo.serial_no via
 * dispatch-residual-engine.buildDemoSerialRegister. Honest empty when none.
 */
import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { PageFloorShell } from '@/components/shared/PageFloorShell';
import { buildDemoSerialRegister } from '@/lib/dispatch-residual-engine';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';

export function DemoSerialRegisterPanel() {
  const { entityCode } = useCardEntitlement();
  const rows = useMemo(() => buildDemoSerialRegister(entityCode), [entityCode]);

  return (
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
  );
}

export default DemoSerialRegisterPanel;
