/**
 * @file        src/pages/erp/servicedesk/customer-hub/ServiceAvailedTracker.tsx
 * @purpose     C.1e · OOB-21 · AMC stock consumption tracker
 * @sprint      T-Phase-1.C.1e · Block H.8
 * @iso         Functional Suitability
 */
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  computeRemainingServices,
  recordServiceAvailed,
  getAMCsByLifecycleStage,
} from '@/lib/servicedesk-engine';

const ENTITY = 'OPRX';

export function ServiceAvailedTracker(): JSX.Element {
  const [refresh, setRefresh] = useState(0);
  const amcs = [
    ...getAMCsByLifecycleStage('active', ENTITY),
    ...getAMCsByLifecycleStage('service_delivery', ENTITY),
  ];

  const handleRecord = (amcId: string): void => {
    try {
      recordServiceAvailed(amcId, `manual_${Date.now()}`, 0, ENTITY);
      toast.success('Service recorded');
      setRefresh((r) => r + 1);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="p-6 space-y-4 animate-fade-in" key={refresh}>
      <div>
        <h1 className="text-2xl font-semibold">Service Availed · AMC Stock Consumption</h1>
        <p className="text-sm text-muted-foreground mt-1">{amcs.length} active AMCs</p>
      </div>
      <Card className="glass-card overflow-x-auto">
        {amcs.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">No active AMCs</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border"><tr className="text-left">
              <th className="p-3">AMC</th><th className="p-3">Customer</th>
              <th className="p-3">Included</th><th className="p-3">Availed</th>
              <th className="p-3">Remaining</th><th className="p-3"></th>
            </tr></thead>
            <tbody>{amcs.map((a) => {
              const r = computeRemainingServices(a.id, ENTITY);
              return (
                <tr key={a.id} className="border-b border-border/50">
                  <td className="p-3 font-mono text-xs">{a.amc_code}</td>
                  <td className="p-3 font-mono text-xs">{a.customer_id}</td>
                  <td className="p-3 font-mono text-xs">{r.included}</td>
                  <td className="p-3 font-mono text-xs">{r.availed}</td>
                  <td className="p-3"><Badge variant={r.remaining > 0 ? 'secondary' : 'destructive'}>{r.remaining}</Badge></td>
                  <td className="p-3 text-right">
                    <Button size="sm" variant="outline" onClick={() => handleRecord(a.id)}>Record Service</Button>
                  </td>
                </tr>
              );
            })}</tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
