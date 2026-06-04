/**
 * @file        src/pages/erp/taskflow/RemindersPage.tsx
 * @purpose     S138 Governance · TaskReminder list + snooze + trigger (TF-13)
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
import { BellOff, Clock4, Trash2 } from 'lucide-react';
import { useEntityCode } from '@/hooks/useEntityCode';
import {
  listReminders, snoozeReminder, markTriggered, deleteReminder,
} from '@/lib/taskflow-governance-engine';
import type { TaskReminder } from '@/types/taskflow';

export default function RemindersPage(): JSX.Element {
  const { entityCode } = useEntityCode();
  const [rows, setRows] = useState<TaskReminder[]>(() => listReminders(entityCode));

  const refresh = (): void => setRows(listReminders(entityCode));

  const snooze = (id: string, h: number): void => {
    snoozeReminder(entityCode, id, h);
    toast.success(`Snoozed ${h}h`);
    refresh();
  };
  const trigger = (id: string): void => {
    markTriggered(entityCode, id);
    toast.success('Marked triggered');
    refresh();
  };
  const remove = (id: string): void => {
    deleteReminder(entityCode, id);
    refresh();
  };

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reminders</h1>
        <p className="text-sm text-muted-foreground">
          Snooze or dismiss task-level reminders. [JWT] server scheduler arrives P2BB.
        </p>
      </div>
      <Card className="rounded-2xl">
        <CardHeader><CardTitle className="text-base">All ({rows.length})</CardTitle></CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No reminders configured.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead className="font-mono">When</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.taskId}</TableCell>
                    <TableCell className="font-mono text-xs">{r.userId}</TableCell>
                    <TableCell className="text-sm">{r.message}</TableCell>
                    <TableCell className="font-mono text-xs">{r.reminderDate}</TableCell>
                    <TableCell>
                      {r.isTriggered
                        ? <Badge variant="secondary">triggered</Badge>
                        : <Badge variant="outline">pending</Badge>}
                    </TableCell>
                    <TableCell className="space-x-1">
                      <Button size="sm" variant="ghost" onClick={() => snooze(r.id, 1)} className="gap-1">
                        <Clock4 className="h-4 w-4" /> +1h
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => trigger(r.id)} className="gap-1">
                        <BellOff className="h-4 w-4" /> Trigger
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => remove(r.id)} className="gap-1">
                        <Trash2 className="h-4 w-4" />
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
