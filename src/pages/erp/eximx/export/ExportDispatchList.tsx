/**
 * @file        src/pages/erp/eximx/export/ExportDispatchList.tsx
 * @purpose     5-leg outbound dispatch analytics · multi-leg-git.ts 0-diff (D-284 spirit)
 * @sprint      T-Phase-1.EX-7b-ShippingBill-EGM-LEO-DispatchMirror
 */
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Truck } from 'lucide-react';
import { loadDispatchMirrors } from '@/lib/export-dispatch-bridge';
import type { ExportDispatchMirror } from '@/types/export-dispatch-mirror';

export function ExportDispatchList(): JSX.Element {
  const entityCode = 'sinha-trading';
  const [mirrors, setMirrors] = useState<ExportDispatchMirror[]>([]);
  useEffect(() => { setMirrors(loadDispatchMirrors(entityCode)); }, []);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Export Dispatches</h1>
        <p className="text-sm text-muted-foreground">5-leg outbound mirror · CustomerWarehouse → OriginPort → Vessel → DestinationPort → ForeignBuyerWarehouse · multi-leg-git.ts 0-diff (D-284 spirit)</p>
      </div>

      <Card>
        <CardHeader><CardTitle><Truck className="w-4 h-4 inline mr-2" />Dispatch Register</CardTitle></CardHeader>
        <CardContent>
          {mirrors.length === 0 ? (
            <p className="text-sm text-muted-foreground">No dispatches yet · created from Export POs · auto-progresses with Shipping Bill workflow</p>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Dispatch No</TableHead><TableHead>Export PO</TableHead><TableHead>State</TableHead><TableHead>Leg 1</TableHead><TableHead>Leg 2</TableHead><TableHead>Leg 3 (Vessel)</TableHead><TableHead>Leg 4</TableHead><TableHead>Leg 5</TableHead></TableRow></TableHeader>
              <TableBody>
                {mirrors.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-mono">{m.dispatch_mirror_no}</TableCell>
                    <TableCell className="font-mono text-xs">{m.related_export_po_id}</TableCell>
                    <TableCell><Badge variant="outline">{m.overall_state}</Badge></TableCell>
                    <TableCell className="text-xs">{m.leg1.state}</TableCell>
                    <TableCell className="text-xs">{m.leg2.state}</TableCell>
                    <TableCell className="text-xs">{m.leg3.state}</TableCell>
                    <TableCell className="text-xs">{m.leg4.state}</TableCell>
                    <TableCell className="text-xs">{m.leg5.state}</TableCell>
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
