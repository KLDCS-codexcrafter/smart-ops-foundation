/**
 * @file        src/pages/erp/servicedesk/customer-hub/CustomerReminders.tsx
 * @purpose     C.1e · Birthday/Anniversary CRM reminders · OOB-11 · MOAT #24 criterion 12
 * @sprint      T-Phase-1.C.1e · Block E.4
 * @iso         Usability
 */
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  createCustomerReminder,
  fireReminderNow,
  snoozeReminder,
  dismissReminder,
  listUpcomingReminders,
} from '@/lib/servicedesk-engine';
import { customerReminderKey, type CustomerReminder, type ReminderStatus } from '@/types/customer-reminder';

const ENTITY = 'OPRX';

function readAll(): CustomerReminder[] {
  try {
    const raw = localStorage.getItem(customerReminderKey(ENTITY));
    return raw ? (JSON.parse(raw) as CustomerReminder[]) : [];
  } catch { return []; }
}

export function CustomerReminders(): JSX.Element {
  const [tab, setTab] = useState<ReminderStatus>('pending');
  const [refresh, setRefresh] = useState(0);
  const all = readAll();
  const filtered = all.filter((r) => r.status === tab)
    .sort((a, b) => a.trigger_date.localeCompare(b.trigger_date));

  const reload = (): void => setRefresh((r) => r + 1);

  const handleSeed = (): void => {
    createCustomerReminder({
      entity_id: ENTITY,
      customer_id: 'C-1',
      reminder_type: 'birthday',
      trigger_date: new Date(Date.now() + 7 * 86400_000).toISOString().slice(0, 10),
      advance_days: 3,
      template_id: null,
      notes: 'Demo reminder',
      created_by: 'current_user',
    });
    toast.success('Reminder created');
    reload();
  };

  const handleFire = (id: string): void => {
    fireReminderNow(id, 'current_user', 'in_app', ENTITY);
    toast.success('Reminder fired');
    reload();
  };

  const handleSnooze = (id: string): void => {
    snoozeReminder(id, 'current_user', new Date(Date.now() + 7 * 86400_000).toISOString(), ENTITY);
    toast.success('Snoozed 7 days');
    reload();
  };

  const handleDismiss = (id: string): void => {
    dismissReminder(id, 'current_user', 'manual', ENTITY);
    toast.success('Dismissed');
    reload();
  };

  return (
    <div className="p-6 space-y-4 animate-fade-in" key={refresh}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Customer Reminders</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {listUpcomingReminders(30, ENTITY).length} upcoming · next 30 days
          </p>
        </div>
        <Button onClick={handleSeed}>+ Create Reminder</Button>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as ReminderStatus)}>
        <TabsList>
          <TabsTrigger value="pending">Upcoming</TabsTrigger>
          <TabsTrigger value="fired">Fired</TabsTrigger>
          <TabsTrigger value="snoozed">Snoozed</TabsTrigger>
          <TabsTrigger value="dismissed">Dismissed</TabsTrigger>
        </TabsList>
        <TabsContent value={tab}>
          <Card className="glass-card overflow-x-auto">
            {filtered.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">No reminders</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="border-b border-border"><tr className="text-left">
                  <th className="p-3">Customer</th><th className="p-3">Type</th>
                  <th className="p-3">Trigger</th><th className="p-3">Status</th>
                  <th className="p-3"></th>
                </tr></thead>
                <tbody>{filtered.map((r) => (
                  <tr key={r.id} className="border-b border-border/50">
                    <td className="p-3 font-mono text-xs">{r.customer_id}</td>
                    <td className="p-3 text-xs">{r.reminder_type}</td>
                    <td className="p-3 font-mono text-xs">{r.trigger_date}</td>
                    <td className="p-3"><Badge variant="secondary">{r.status}</Badge></td>
                    <td className="p-3 text-right">
                      {r.status === 'pending' && (
                        <div className="flex gap-1 justify-end">
                          <Button size="sm" variant="default" onClick={() => handleFire(r.id)}>Fire</Button>
                          <Button size="sm" variant="outline" onClick={() => handleSnooze(r.id)}>Snooze</Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDismiss(r.id)}>Dismiss</Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}</tbody>
              </table>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
