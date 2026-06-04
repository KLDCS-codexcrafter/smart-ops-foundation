/**
 * @file        src/pages/erp/frontdesk/visitors/RollCallPage.tsx
 * @sprint      Sprint 145 · T-FrontDesk-A6F.1 · Block 4
 */
import { useMemo, useState } from 'react';
import { useEntityCode } from '@/hooks/useEntityCode';
import { buildMusterReport, getOverstays } from '@/lib/frontdesk-engine';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Printer, AlertTriangle } from 'lucide-react';

export function RollCallPage(): JSX.Element {
  const { entityCode } = useEntityCode();
  const [tick] = useState(0);
  const report = useMemo(() => buildMusterReport(entityCode), [entityCode, tick]);
  const overstays = useMemo(() => getOverstays(entityCode), [entityCode, tick]);
  const overstayIds = new Set(overstays.map((v) => v.badgeNo));

  return (
    <div className="p-6 space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Roll-Call / Muster</CardTitle>
            <p className="text-xs text-muted-foreground font-mono">
              Generated {new Date(report.generatedAt).toLocaleString('en-IN')} · {report.count} on-site
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-2" /> Print
          </Button>
        </CardHeader>
        <CardContent>
          {report.rows.length === 0 ? (
            <div className="text-sm text-muted-foreground p-8 text-center">No visitors on premises.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Badge</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Host</TableHead>
                  <TableHead>Check-in</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.rows.map((r) => (
                  <TableRow key={r.badgeNo}>
                    <TableCell className="font-mono">{r.badgeNo}</TableCell>
                    <TableCell>{r.name}</TableCell>
                    <TableCell>{r.host}</TableCell>
                    <TableCell className="font-mono text-xs">{r.checkInAt ? new Date(r.checkInAt).toLocaleString('en-IN') : '—'}</TableCell>
                    <TableCell className="font-mono">{r.vehicleNo ?? '—'}</TableCell>
                    <TableCell>
                      {overstayIds.has(r.badgeNo) ? (
                        <Badge variant="destructive" className="gap-1">
                          <AlertTriangle className="h-3 w-3" /> Overstay
                        </Badge>
                      ) : <Badge variant="default">On-site</Badge>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
