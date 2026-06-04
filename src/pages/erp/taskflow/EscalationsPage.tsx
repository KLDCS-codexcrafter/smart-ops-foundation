/**
 * @file        src/pages/erp/taskflow/EscalationsPage.tsx
 * @purpose     S138 Governance · escalations list + evaluate-SLA-now button
 * @sprint      Sprint 138 · T-TaskFlow-A641.2 · Block 4
 */
import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { RefreshCw, CheckCircle2 } from 'lucide-react';
import { useEntityCode } from '@/hooks/useEntityCode';
import {
  listEscalations, resolveEscalation, evaluateSLA,
  type EscalationRecord,
} from '@/lib/taskflow-governance-engine';

export default function EscalationsPage(): JSX.Element {
  const { entityCode } = useEntityCode();
  const [rows, setRows] = useState<EscalationRecord[]>(() => listEscalations(entityCode));

  const refresh = useCallback(() => setRows(listEscalations(entityCode)), [entityCode]);

  const runEval = (): void => {
    try {
      const { breached, escalated } = evaluateSLA(entityCode);
      toast.success(`SLA evaluated · ${breached} breach(es) · ${escalated} new escalation(s)`);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'SLA evaluation failed');
    }
  };

  const resolve = (id: string): void => {
    resolveEscalation(entityCode, id);
    toast.success('Escalation resolved');
    refresh();
  };

  const sevVariant = (s: EscalationRecord['status']): 'default' | 'secondary' | 'destructive' => {
    if (s === 'resolved') return 'secondary';
    if (s === 'acknowledged') return 'default';
    return 'destructive';
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Escalations</h1>
          <p className="text-sm text-muted-foreground">
            Auto-generated from SLA breach detection. Manual escalations also surface here.
          </p>
        </div>
        <Button onClick={runEval} className="gap-2">
          <RefreshCw className="h-4 w-4" /> Evaluate SLA now
        </Button>
      </div>

      <Card className="rounded-2xl">
        <CardHeader><CardTitle className="text-base">Records ({rows.length})</CardTitle></CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No escalations. Click “Evaluate SLA now” to scan open tasks.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Escalated to</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead className="font-mono">Raised</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-mono text-xs">{e.taskId}</TableCell>
                    <TableCell><Badge variant="outline">{e.source}</Badge></TableCell>
                    <TableCell><Badge variant="secondary">{e.escalatedTo}</Badge></TableCell>
                    <TableCell className="text-sm">{e.reason}</TableCell>
                    <TableCell className="font-mono text-xs">{e.raisedAt}</TableCell>
                    <TableCell><Badge variant={sevVariant(e.status)}>{e.status}</Badge></TableCell>
                    <TableCell>
                      {e.status !== 'resolved' && (
                        <Button variant="ghost" size="sm" onClick={() => resolve(e.id)} className="gap-1">
                          <CheckCircle2 className="h-4 w-4" /> Resolve
                        </Button>
                      )}
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
