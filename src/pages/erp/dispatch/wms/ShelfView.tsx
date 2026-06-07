/**
 * ShelfView.tsx — WMS2 · Shelf View (Sprint WMS2)
 *
 * Honesty line (verbatim · AC9):
 *   "Bin occupancy reflects placements recorded since WMS2 — pre-existing
 *    stock is not auto-assigned to bins. Supplier ASN feeds arrive with
 *    Wave-2."
 */

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Boxes } from 'lucide-react';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import type { Godown } from '@/types/godown';
import { getShelfView, type ShelfBin } from '@/lib/wms-putaway-engine';

const HONESTY_LINE =
  'Bin occupancy reflects placements recorded since WMS2 — pre-existing stock is not auto-assigned to bins. Supplier ASN feeds arrive with Wave-2.';

function readGodowns(): Godown[] {
  try {
    const raw = localStorage.getItem('erp_godowns');
    return raw ? (JSON.parse(raw) as Godown[]) : [];
  } catch { return []; }
}

export function WMS2ShelfViewPanel() {
  const { entityCode } = useCardEntitlement();
  const godowns = useMemo(() => readGodowns(), []);
  const [godownId, setGodownId] = useState<string>(godowns[0]?.id ?? '');
  const [bins, setBins] = useState<ShelfBin[]>([]);

  useEffect(() => {
    if (!godownId) { setBins([]); return; }
    setBins(getShelfView(entityCode, godownId));
  }, [entityCode, godownId]);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
        {HONESTY_LINE}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2"><Boxes className="h-4 w-4" /> Shelf View</CardTitle>
          <div className="w-64">
            <Select value={godownId} onValueChange={setGodownId}>
              <SelectTrigger><SelectValue placeholder="Pick a godown" /></SelectTrigger>
              <SelectContent>
                {godowns.map((g) => (
                  <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {bins.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6 text-center">
              {godownId ? 'No bins for this godown.' : 'Pick a godown to view shelf.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {bins.map((b) => {
                const measured = b.capacity != null;
                const pct = measured && b.capacity! > 0
                  ? Math.min(100, Math.round((b.placed_qty / b.capacity!) * 100))
                  : 0;
                return (
                  <Card key={b.bin_label_id} className="border-border">
                    <CardContent className="p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-sm">{b.location_code}</span>
                        {b.empty
                          ? <Badge variant="outline">no recorded placements</Badge>
                          : <Badge>{b.placed_qty} placed</Badge>}
                      </div>
                      {measured ? (
                        <>
                          <div className="h-2 w-full rounded bg-muted overflow-hidden">
                            <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {b.placed_qty} / {b.capacity} {b.capacity_unit ?? ''} ({pct}%)
                          </div>
                        </>
                      ) : (
                        <Badge variant="outline" className="text-[10px]">capacity unmeasured</Badge>
                      )}
                      {b.items.length > 0 && (
                        <div className="border-t pt-1 text-xs space-y-0.5">
                          {b.items.map((it) => (
                            <div key={it.item_id} className="flex justify-between">
                              <span className="truncate">{it.item_name}</span>
                              <span className="font-mono">{it.qty}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default WMS2ShelfViewPanel;
