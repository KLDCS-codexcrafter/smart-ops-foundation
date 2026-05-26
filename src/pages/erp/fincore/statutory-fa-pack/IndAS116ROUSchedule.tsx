/**
 * IndAS116ROUSchedule.tsx — FAR-1 (Sprint 65) · Ind AS 116 ROU schedule
 */
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Building2 } from 'lucide-react';
import { generateAggregateDisclosure } from '@/lib/ind-as-116-lease-engine';
import { useEntityCode } from '@/hooks/useEntityCode';
import { DEFAULT_ENTITY_SHORTCODE } from '@/lib/default-entity';

export function IndAS116ROUSchedulePanel({ entityCode }: { entityCode: string }) {
  const fyStart = '2025-04-01';
  const fyEnd = '2026-03-31';
  const rows = useMemo(
    () => generateAggregateDisclosure(entityCode, fyStart, fyEnd),
    [entityCode],
  );

  return (
    <div className="p-6 space-y-4 animate-fade-in">
      <div>
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Building2 className="h-5 w-5 text-teal-500" /> Ind AS 116 · Right-of-Use Schedule
        </h2>
        <p className="text-xs text-muted-foreground">
          Aggregate disclosure · FY {fyStart} → {fyEnd} · Entity {entityCode}
        </p>
      </div>

      <Card className="glass-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Per-Lease Movement</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-xs text-muted-foreground p-4 text-center">
              No leases recorded for this entity.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Opening ROU</TableHead>
                  <TableHead>Additions</TableHead>
                  <TableHead>Amortization</TableHead>
                  <TableHead>Closing ROU</TableHead>
                  <TableHead>Interest</TableHead>
                  <TableHead>Cash Outflow</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, i) => (
                  <TableRow key={`row-${i}`}>
                    <TableCell className="font-mono">₹{r.openingRou.toLocaleString('en-IN')}</TableCell>
                    <TableCell className="font-mono">₹{r.additions.toLocaleString('en-IN')}</TableCell>
                    <TableCell className="font-mono">₹{r.amortization.toLocaleString('en-IN')}</TableCell>
                    <TableCell className="font-mono">₹{r.closingRou.toLocaleString('en-IN')}</TableCell>
                    <TableCell className="font-mono">₹{r.interestExpense.toLocaleString('en-IN')}</TableCell>
                    <TableCell className="font-mono">₹{r.totalCashOutflow.toLocaleString('en-IN')}</TableCell>
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

export default function IndAS116ROUSchedule() {
  const { entityCode } = useEntityCode();
  return <IndAS116ROUSchedulePanel entityCode={entityCode || DEFAULT_ENTITY_SHORTCODE} />;
}
