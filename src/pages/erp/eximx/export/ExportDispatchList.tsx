/**
 * @file        src/pages/erp/eximx/export/ExportDispatchList.tsx
 * @purpose     5-leg outbound dispatch analytics · multi-leg-git.ts 0-diff (D-284 spirit)
 * @sprint      T-Phase-1.EX-7b-ShippingBill-EGM-LEO-DispatchMirror
 *              + WMS3 rider · canon 5 export half · leg-1 truth now lives in Dispatch · mirror becomes a read
 */
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Truck } from 'lucide-react';
import { loadDispatchMirrors } from '@/lib/export-dispatch-bridge';
import type { ExportDispatchMirror } from '@/types/export-dispatch-mirror';
// W3 rider · canon 5 export half · leg-1 truth now lives in Dispatch · mirror becomes a read
import { getManifestForExportPO } from '@/lib/wms-manifest-engine';
import type { Manifest } from '@/types/wms-manifest';

export function ExportDispatchList(): JSX.Element {
  const entityCode = 'sinha-trading';
  const [mirrors, setMirrors] = useState<ExportDispatchMirror[]>([]);
  // W3 rider · per-row Dispatch manifest lookup · read-only · no store writes
  const [manifestByPo, setManifestByPo] = useState<Record<string, Manifest | null>>({});
  useEffect(() => {
    const ms = loadDispatchMirrors(entityCode);
    setMirrors(ms);
    const map: Record<string, Manifest | null> = {};
    for (const m of ms) {
      map[m.related_export_po_id] = getManifestForExportPO(entityCode, m.related_export_po_id);
    }
    setManifestByPo(map);
  }, []);

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
                {mirrors.map((m) => {
                  const mft = manifestByPo[m.related_export_po_id];
                  return (
                    <TableRow key={m.id}>
                      <TableCell className="font-mono">{m.dispatch_mirror_no}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {m.related_export_po_id}
                        {mft && (
                          <Badge variant="outline" className="ml-2 text-[10px]">
                            Leg-1 · Dispatch manifest {mft.manifest_no} · {mft.status}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell><Badge variant="outline">{m.overall_state}</Badge></TableCell>
                      <TableCell className="text-xs">{m.leg1.state}</TableCell>
                      <TableCell className="text-xs">{m.leg2.state}</TableCell>
                      <TableCell className="text-xs">{m.leg3.state}</TableCell>
                      <TableCell className="text-xs">{m.leg4.state}</TableCell>
                      <TableCell className="text-xs">{m.leg5.state}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
