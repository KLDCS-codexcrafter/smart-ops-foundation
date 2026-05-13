/**
 * @file        src/pages/erp/servicedesk/amc-pipeline/AMCActiveList.tsx
 * @purpose     Q-LOCK-9 · Active AMCs list
 * @sprint      T-Phase-1.C.1b · Block D.4
 * @iso        Functional Suitability
 */
import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getAMCsByLifecycleStage } from '@/lib/servicedesk-engine';
import type { AMCRecord } from '@/types/servicedesk';

export function AMCActiveList(): JSX.Element {
  const [list, setList] = useState<AMCRecord[]>([]);
  useEffect(() => setList(getAMCsByLifecycleStage('active')), []);
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Active AMCs</h1>
      <Card className="p-0 overflow-hidden">
        {list.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">No active AMCs.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr className="text-left">
                <th className="px-4 py-2">AMC Code</th>
                <th className="px-4 py-2">Customer</th>
                <th className="px-4 py-2">OEM</th>
                <th className="px-4 py-2">End</th>
                <th className="px-4 py-2 text-right">Value</th>
                <th className="px-4 py-2">Risk</th>
              </tr>
            </thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="px-4 py-2 font-mono text-xs">{r.amc_code || r.id.slice(0, 12)}</td>
                  <td className="px-4 py-2">{r.customer_id}</td>
                  <td className="px-4 py-2">{r.oem_name}</td>
                  <td className="px-4 py-2 font-mono text-xs">{r.contract_end ?? '—'}</td>
                  <td className="px-4 py-2 text-right font-mono">₹{(r.contract_value_paise / 100).toLocaleString('en-IN')}</td>
                  <td className="px-4 py-2"><Badge variant="outline">{r.risk_bucket}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
