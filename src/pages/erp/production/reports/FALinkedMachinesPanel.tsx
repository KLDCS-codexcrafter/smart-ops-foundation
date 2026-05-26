/**
 * @file        src/pages/erp/production/reports/FALinkedMachinesPanel.tsx
 * @purpose     Production · Machines whose fixed_asset_id is populated · joined to FA records
 * @sprint      T-Phase-4.FAR-2 · Block 5 · FK-CAP-6 UI (Q-LOCK-4 A)
 */
import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Boxes, Link2 } from 'lucide-react';
import { useMachines } from '@/hooks/useMachines';
import { useEntityCode } from '@/hooks/useEntityCode';
import { faUnitsKey } from '@/types/fixed-asset';
import type { AssetUnitRecord } from '@/types/fixed-asset';

const loadFAUnits = (entityCode: string): AssetUnitRecord[] => {
  try {
    // [JWT] GET /api/fixed-assets/units
    const r = localStorage.getItem(faUnitsKey(entityCode));
    return r ? (JSON.parse(r) as AssetUnitRecord[]) : [];
  } catch { return []; }
};

export function FALinkedMachinesPanel(): JSX.Element {
  const { entityCode } = useEntityCode();
  const { allMachines } = useMachines();
  const faUnits = useMemo(() => loadFAUnits(entityCode), [entityCode]);

  const linked = useMemo(
    () => allMachines.filter(m => m.fixed_asset_id),
    [allMachines],
  );

  const findFA = (id: string | null | undefined): AssetUnitRecord | undefined =>
    id ? faUnits.find(u => u.id === id) : undefined;

  return (
    <div className="p-6 space-y-4 animate-fade-in">
      <div className="flex items-center gap-3">
        <Boxes className="h-6 w-6 text-teal-500" />
        <div>
          <h2 className="text-xl font-bold">FA-Linked Machines</h2>
          <p className="text-xs text-muted-foreground">
            Machines with a linked Fixed Asset record · {linked.length} of {allMachines.length}
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Machine Code</TableHead>
                <TableHead className="text-xs">Name</TableHead>
                <TableHead className="text-xs">Linked Asset ID</TableHead>
                <TableHead className="text-xs">Item</TableHead>
                <TableHead className="text-xs">IT Block</TableHead>
                <TableHead className="text-xs">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {linked.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No machines linked to a Fixed Asset yet. Use Machine Master to link.
                  </TableCell>
                </TableRow>
              ) : linked.map(m => {
                const fa = findFA(m.fixed_asset_id);
                return (
                  <TableRow key={m.id}>
                    <TableCell className="font-mono text-xs">{m.code}</TableCell>
                    <TableCell className="text-xs">{m.name}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {fa ? (
                        <span className="inline-flex items-center gap-1">
                          <Link2 className="h-3 w-3" /> {fa.asset_id}
                        </span>
                      ) : '—'}
                    </TableCell>
                    <TableCell className="text-xs">{fa?.item_name ?? '—'}</TableCell>
                    <TableCell className="text-xs">{fa?.it_act_block ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">{m.current_status}</Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export default FALinkedMachinesPanel;
