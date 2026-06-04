/**
 * @file        src/pages/erp/taskflow/BlockedListPage.tsx
 * @purpose     S138 Governance · I'm-Blocked artifact list (TF-33)
 * @sprint      Sprint 138 · T-TaskFlow-A641.2 · Block 4
 */
import { useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { CheckCircle2 } from 'lucide-react';
import { useEntityCode } from '@/hooks/useEntityCode';
import { getOpenBlocked, resolveBlocked, type BlockedRecord } from '@/lib/taskflow-governance-engine';

export default function BlockedListPage(): JSX.Element {
  const { entityCode } = useEntityCode();
  const [rows, setRows] = useState<BlockedRecord[]>(() => getOpenBlocked(entityCode));

  const resolve = (id: string): void => {
    try {
      resolveBlocked(entityCode, id, 'me', 'Resolved from Blocked list');
      toast.success('Blocker resolved');
      setRows(getOpenBlocked(entityCode));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Resolve failed');
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Blocked Tasks</h1>
        <p className="text-sm text-muted-foreground">Open “I’m Blocked” artifacts across the organisation.</p>
      </div>
      <Card className="rounded-2xl">
        <CardHeader><CardTitle className="text-base">Open ({rows.length})</CardTitle></CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Nothing blocked — clear runway.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Blocked by</TableHead>
                  <TableHead className="font-mono">Raised</TableHead>
                  <TableHead>Raised by</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-mono text-xs">{b.taskId}</TableCell>
                    <TableCell className="text-sm">{b.reason}</TableCell>
                    <TableCell>
                      {b.blockedByUserId && <Badge variant="outline">user · {b.blockedByUserId}</Badge>}
                      {b.blockedByDependency && <Badge variant="outline">dep · {b.blockedByDependency}</Badge>}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{b.raisedAt}</TableCell>
                    <TableCell className="font-mono text-xs">{b.raisedByUserId}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost" onClick={() => resolve(b.id)} className="gap-1">
                        <CheckCircle2 className="h-4 w-4" /> Resolve
                      </Button>
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
