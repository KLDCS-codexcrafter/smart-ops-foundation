/**
 * @file        src/pages/erp/servicedesk/customer-hub/CustomerCommLog.tsx
 * @purpose     C.1e · S23 · aggregate reminders + cascade fires per customer
 * @sprint      T-Phase-1.C.1e · Block H.10
 * @iso         Usability
 */
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  listAllRemindersForCustomer,
} from '@/lib/servicedesk-engine';

const ENTITY = 'OPRX';

export function CustomerCommLog(): JSX.Element {
  const [cid, setCid] = useState('C-1');
  const reminders = listAllRemindersForCustomer(cid, ENTITY);

  return (
    <div className="p-6 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Customer Communication Log</h1>
          <p className="text-sm text-muted-foreground mt-1">{reminders.length} reminder events</p>
        </div>
        <Input className="max-w-xs" placeholder="Customer ID" value={cid} onChange={(e) => setCid(e.target.value)} />
      </div>
      <Card className="glass-card overflow-x-auto">
        {reminders.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">No comm history for {cid}</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border"><tr className="text-left">
              <th className="p-3">When</th><th className="p-3">Type</th>
              <th className="p-3">Status</th><th className="p-3">Channel</th>
            </tr></thead>
            <tbody>{reminders.map((r) => (
              <tr key={r.id} className="border-b border-border/50">
                <td className="p-3 font-mono text-xs">{r.created_at.slice(0, 16)}</td>
                <td className="p-3 text-xs">{r.reminder_type}</td>
                <td className="p-3"><Badge variant="secondary">{r.status}</Badge></td>
                <td className="p-3 text-xs">{r.fired_via_channel ?? '—'}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
