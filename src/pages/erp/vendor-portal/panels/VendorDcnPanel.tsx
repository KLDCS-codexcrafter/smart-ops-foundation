/**
 * @file        VendorDcnPanel.tsx
 * @sprint      T-VPG-VendorPortal-Gaps
 */
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileMinus2 } from 'lucide-react';
import { listDcns } from '@/lib/vendor-risk-compliance-engine';
import { DEFAULT_ENTITY_SHORTCODE } from '@/lib/default-entity';
import type { VendorDcn } from '@/types/vendor-dcn';

function paiseToINR(p: number): string {
  return `₹${(p / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function VendorDcnPanel(): JSX.Element {
  const entityCode = DEFAULT_ENTITY_SHORTCODE;
  const [dcns, setDcns] = useState<VendorDcn[]>([]);
  useEffect(() => { setDcns(listDcns(entityCode)); }, [entityCode]);

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileMinus2 className="w-6 h-6" /> Debit / Credit Notes
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Intent registry. Actual accounting vouchers are posted via FinCore engines.
        </p>
      </div>
      <Card>
        <CardHeader><CardTitle>DCN Register</CardTitle></CardHeader>
        <CardContent>
          {dcns.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">No DCNs yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b text-muted-foreground">
                  <th className="py-2 pr-2">FY</th>
                  <th className="py-2 pr-2">Kind</th>
                  <th className="py-2 pr-2">Vendor</th>
                  <th className="py-2 pr-2">Reason</th>
                  <th className="py-2 pr-2 text-right">Amount</th>
                  <th className="py-2 pr-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {dcns.map((d) => (
                  <tr key={d.id} className="border-b last:border-0">
                    <td className="py-2 pr-2 font-mono text-xs">{d.financial_year}</td>
                    <td className="py-2 pr-2">{d.kind === 'debit_note' ? 'DN' : 'CN'}</td>
                    <td className="py-2 pr-2 font-mono text-xs">{d.party_id}</td>
                    <td className="py-2 pr-2 text-xs">{d.reason}</td>
                    <td className="py-2 pr-2 text-right font-mono">{paiseToINR(d.amount_paise)}</td>
                    <td className="py-2 pr-2"><Badge variant="outline">{d.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
