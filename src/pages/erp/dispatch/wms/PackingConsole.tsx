/**
 * PackingConsole.tsx — WMS1 · Packing Console (Sprint WMS1)
 *
 * Completed picklists → create Pack Group → Mark Packed (generates
 * packing slip via EXISTING packing-slip-engine ONLY).
 *
 * Honesty line (verbatim · AC8):
 *   "Picker identity is free-text until Wave-2 auth; barcode scanning
 *    arrives with Wave-2."
 */

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Package, FileCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import type { PackGroup, Picklist } from '@/types/wms-pick-pack';
import { packGroupsKey, picklistsKey } from '@/types/wms-pick-pack';
import { createPackGroup, markPacked, getPickPackSummary } from '@/lib/wms-pick-pack-engine';

function readPicklists(entityCode: string): Picklist[] {
  try {
    const raw = localStorage.getItem(picklistsKey(entityCode));
    return raw ? (JSON.parse(raw) as Picklist[]) : [];
  } catch { return []; }
}
function readPackGroups(entityCode: string): PackGroup[] {
  try {
    const raw = localStorage.getItem(packGroupsKey(entityCode));
    return raw ? (JSON.parse(raw) as PackGroup[]) : [];
  } catch { return []; }
}

export function WMS1PackingConsolePanel() {
  const { entityCode } = useCardEntitlement();
  const [version, setVersion] = useState(0);

  const [summary, setSummary] = useState(() => getPickPackSummary(entityCode));
  const [completedPicklists, setCompletedPicklists] = useState<Picklist[]>(
    () => readPicklists(entityCode).filter((p) => p.status === 'completed'),
  );
  const [packGroups, setPackGroups] = useState<PackGroup[]>(() => readPackGroups(entityCode));

  useEffect(() => {
    setSummary(getPickPackSummary(entityCode));
    setCompletedPicklists(readPicklists(entityCode).filter((p) => p.status === 'completed'));
    setPackGroups(readPackGroups(entityCode));
  }, [entityCode, version]);

  function handleCreate(picklistId: string) {
    const pg = createPackGroup(entityCode, picklistId);
    if (!pg) {
      toast.error('Could not create pack group (picklist not completed).');
      return;
    }
    toast.success(`Pack group ${pg.pack_group_no} created.`);
    setVersion((v) => v + 1);
  }

  function handlePack(packGroupId: string) {
    const result = markPacked(entityCode, packGroupId);
    if (!result) {
      toast.error('Could not mark packed.');
      return;
    }
    toast.success(`Packing slip ${result.packingSlip.id} generated.`);
    setVersion((v) => v + 1);
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Packing Console · WMS1</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Build pack groups from completed picklists and generate packing slips via the existing engine. Picker identity is free-text until Wave-2 auth; barcode scanning arrives with Wave-2.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Completed Picklists</div>
            <div className="text-2xl font-mono font-bold text-foreground mt-1">{summary.picklists.completed}</div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Pack Groups · Open</div>
            <div className="text-2xl font-mono font-bold text-foreground mt-1">{summary.packGroups.open}</div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Pack Groups · Packed</div>
            <div className="text-2xl font-mono font-bold text-foreground mt-1">{summary.packGroups.packed}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-4 w-4" /> Ready to Pack
          </CardTitle>
        </CardHeader>
        <CardContent>
          {completedPicklists.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">No completed picklists yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Picklist #</TableHead>
                  <TableHead>Bucket</TableHead>
                  <TableHead>Lines</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {completedPicklists.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">{p.picklist_no}</TableCell>
                    <TableCell><Badge variant="outline">{p.bucket}</Badge></TableCell>
                    <TableCell className="font-mono">{p.lines.length}</TableCell>
                    <TableCell>
                      <Button size="sm" onClick={() => handleCreate(p.id)}>Create Pack Group</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileCheck className="h-4 w-4" /> Pack Groups
          </CardTitle>
        </CardHeader>
        <CardContent>
          {packGroups.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">No pack groups yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pack Group #</TableHead>
                  <TableHead>Lines</TableHead>
                  <TableHead>BOM Applied</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Packing Slip</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {packGroups.map((pg) => (
                  <TableRow key={pg.id}>
                    <TableCell className="font-mono text-xs">{pg.pack_group_no}</TableCell>
                    <TableCell className="font-mono">{pg.lines.length}</TableCell>
                    <TableCell className="text-xs">
                      {pg.bom_applied ? <Badge variant="outline">{pg.bom_applied}</Badge> : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell><Badge variant={pg.status === 'packed' ? 'default' : 'outline'}>{pg.status}</Badge></TableCell>
                    <TableCell className="font-mono text-xs">{pg.packing_slip_id ?? '—'}</TableCell>
                    <TableCell>
                      {pg.status === 'open' && (
                        <Button size="sm" variant="outline" onClick={() => handlePack(pg.id)}>Mark Packed</Button>
                      )}
                    </TableCell>
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

export default WMS1PackingConsolePanel;
