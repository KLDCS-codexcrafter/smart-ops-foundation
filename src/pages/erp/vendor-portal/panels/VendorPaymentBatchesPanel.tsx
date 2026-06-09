/**
 * @file        VendorPaymentBatchesPanel.tsx
 * @sprint      T-VPG-VendorPortal-Gaps
 */
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Banknote } from 'lucide-react';
import { listPaymentBatches } from '@/lib/vendor-risk-compliance-engine';
import { DEFAULT_ENTITY_SHORTCODE } from '@/lib/default-entity';
import type { VendorPaymentBatch } from '@/types/vendor-payment-batch';

function paiseToINR(p: number): string {
  return `₹${(p / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function VendorPaymentBatchesPanel(): JSX.Element {
  const entityCode = DEFAULT_ENTITY_SHORTCODE;
  const [batches, setBatches] = useState<VendorPaymentBatch[]>([]);
  useEffect(() => { setBatches(listPaymentBatches(entityCode)); }, [entityCode]);

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Banknote className="w-6 h-6" /> Payment Batches
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Grouping metadata only. Disbursement runs through existing PayOut engines unchanged.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Batches</CardTitle>
          <CardDescription>FY-stamped at birth · 8-year retention floor</CardDescription>
        </CardHeader>
        <CardContent>
          {batches.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">No payment batches yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b text-muted-foreground">
                  <th className="py-2 pr-2">Batch No</th>
                  <th className="py-2 pr-2">FY</th>
                  <th className="py-2 pr-2">Channel</th>
                  <th className="py-2 pr-2">Lines</th>
                  <th className="py-2 pr-2 text-right">Total</th>
                  <th className="py-2 pr-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((b) => (
                  <tr key={b.id} className="border-b last:border-0">
                    <td className="py-2 pr-2 font-mono text-xs">{b.batch_no}</td>
                    <td className="py-2 pr-2 font-mono text-xs">{b.financial_year}</td>
                    <td className="py-2 pr-2 text-xs">{b.channel}</td>
                    <td className="py-2 pr-2 font-mono">{b.line_count}</td>
                    <td className="py-2 pr-2 text-right font-mono">{paiseToINR(b.total_amount_paise)}</td>
                    <td className="py-2 pr-2"><Badge variant="outline">{b.status}</Badge></td>
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
