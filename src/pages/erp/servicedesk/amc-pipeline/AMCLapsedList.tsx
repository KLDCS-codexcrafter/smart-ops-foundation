/**
 * @file        src/pages/erp/servicedesk/amc-pipeline/AMCLapsedList.tsx
 * @purpose     Q-LOCK-9 · Lapsed AMCs · re-engage stub
 * @sprint      T-Phase-1.C.1b · Block D.6
 * @iso        Functional Suitability
 */
import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { getAMCsByLifecycleStage } from '@/lib/servicedesk-engine';
import type { AMCRecord } from '@/types/servicedesk';

export function AMCLapsedList(): JSX.Element {
  const [list, setList] = useState<AMCRecord[]>([]);
  useEffect(() => setList(getAMCsByLifecycleStage('lapsed')), []);
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Lapsed AMCs</h1>
      <Card className="p-0 overflow-hidden">
        {list.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">No lapsed AMCs.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr className="text-left">
                <th className="px-4 py-2">Customer</th>
                <th className="px-4 py-2">OEM</th>
                <th className="px-4 py-2">Reason</th>
                <th className="px-4 py-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="px-4 py-2">{r.customer_id}</td>
                  <td className="px-4 py-2">{r.oem_name}</td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">{r.applicability_reason || '—'}</td>
                  <td className="px-4 py-2 text-right">
                    <Button size="sm" variant="outline" onClick={() => toast.info('Re-engage flow lands in C.1c')}>
                      Re-engage
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
