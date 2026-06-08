/**
 * PackingReplenishmentSuggestions.tsx — 007 · Packing-material replenishment
 * Sprint A.4-Residual · CONSUMES PackingMaterialMaster levels via
 * dispatch-residual-engine.triggerPackingReplenishment. Honest empty.
 */
import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { PageFloorShell } from '@/components/shared/PageFloorShell';
import { triggerPackingReplenishment } from '@/lib/dispatch-residual-engine';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';

export function PackingReplenishmentSuggestionsPanel() {
  const { entityCode } = useCardEntitlement();
  const rows = useMemo(
    () => triggerPackingReplenishment(entityCode),
    [entityCode],
  );

  return (
    <PageFloorShell
      title="Packing Replenishment Suggestions"
      subtitle="Materials at or below reorder level · suggests purchase qty · no fabricated stock"
      isEmpty={rows.length === 0}
      emptyMessage="All packing materials above reorder level."
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs">Code</TableHead>
            <TableHead className="text-xs">Material</TableHead>
            <TableHead className="text-xs">UOM</TableHead>
            <TableHead className="text-xs text-right">Stock</TableHead>
            <TableHead className="text-xs text-right">Reorder Lvl</TableHead>
            <TableHead className="text-xs text-right">Shortfall</TableHead>
            <TableHead className="text-xs text-right">Suggest Qty</TableHead>
            <TableHead className="text-xs">Urgency</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.material_id}>
              <TableCell className="font-mono text-xs">{r.code}</TableCell>
              <TableCell className="text-xs">{r.name}</TableCell>
              <TableCell className="text-xs">{r.uom}</TableCell>
              <TableCell className="text-right font-mono text-xs">{r.current_stock}</TableCell>
              <TableCell className="text-right font-mono text-xs">{r.reorder_level}</TableCell>
              <TableCell className="text-right font-mono text-xs">{r.shortfall}</TableCell>
              <TableCell className="text-right font-mono text-xs">{r.reorder_qty}</TableCell>
              <TableCell>
                <Badge
                  variant={r.urgency === 'critical' ? 'destructive' : 'outline'}
                  className="text-[10px]"
                >
                  {r.urgency}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </PageFloorShell>
  );
}

export default PackingReplenishmentSuggestionsPanel;
