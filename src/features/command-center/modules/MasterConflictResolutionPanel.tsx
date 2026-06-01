/**
 * MasterConflictResolutionPanel — Sprint 98 Block 4 · real merge UI for
 * idea-3-conflict-resolution-engine. Operates on shared/group stores
 * (e.g. erp_inventory_items, erp_group_customer_master) and lets the
 * operator pick a survivor + commit the merge with audit trail.
 */
import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Layers, AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import {
  scanForDuplicates,
  buildMergePlan,
  commitMerge,
  type DuplicateCandidate,
} from '@/lib/idea-3-conflict-resolution-engine';
import { useEntityCode } from '@/hooks/useEntityCode';
import type { MasterType } from '@/lib/master-replication-engine';

interface StoreDescriptor {
  master_type: MasterType;
  label: string;
  storage_key: string; // global / group-level
}

const STORES: StoreDescriptor[] = [
  { master_type: 'item',     label: 'Inventory Items (global)',  storage_key: 'erp_inventory_items' },
  { master_type: 'customer', label: 'Customers (group)',         storage_key: 'erp_group_customer_master' },
  { master_type: 'vendor',   label: 'Vendors (group)',           storage_key: 'erp_group_vendor_master' },
  { master_type: 'ledger',   label: 'Ledgers (group)',           storage_key: 'erp_group_ledger_definitions' },
  { master_type: 'stock_group', label: 'Stock Groups (global)',  storage_key: 'erp_stock_groups' },
];

function readStore(key: string): Record<string, unknown>[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Record<string, unknown>[]) : [];
  } catch { return []; }
}

function writeStore(key: string, val: Record<string, unknown>[]): void {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* ignore */ }
}

export function MasterConflictResolutionPanel() {
  const { entityCode } = useEntityCode();
  const [selectedKey, setSelectedKey] = useState<string>(STORES[0].storage_key);
  const [candidates, setCandidates] = useState<DuplicateCandidate[]>([]);
  const [scanning, setScanning] = useState(false);

  const descriptor = useMemo(
    () => STORES.find((s) => s.storage_key === selectedKey) ?? STORES[0],
    [selectedKey],
  );

  const runScan = () => {
    setScanning(true);
    const records = readStore(descriptor.storage_key);
    const found = scanForDuplicates({
      master_type: descriptor.master_type,
      records,
    });
    setCandidates(found);
    setScanning(false);
    toast.success(`Scanned ${records.length} record(s) · ${found.length} duplicate pair(s)`);
  };

  useEffect(() => { setCandidates([]); }, [selectedKey]);

  const onMerge = (cand: DuplicateCandidate, survivor: 'a' | 'b') => {
    const records = readStore(descriptor.storage_key);
    const plan = buildMergePlan({
      master_type: cand.master_type,
      survivor: survivor === 'a' ? cand.record_a : cand.record_b,
      loser:    survivor === 'a' ? cand.record_b : cand.record_a,
    });
    if (!plan.survivor_id || !plan.loser_id) {
      toast.error('Records missing id field · cannot merge');
      return;
    }
    const next = commitMerge({
      plan,
      records,
      entity_code: entityCode || 'GROUP',
      actor: 'cc_operator',
    });
    writeStore(descriptor.storage_key, next);
    setCandidates((prev) => prev.filter((c) => c.id !== cand.id));
    toast.success(`Merged · survivor=${plan.survivor_id}`);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Master Conflict Resolution</h2>
        <p className="text-sm text-muted-foreground">
          Within-store dedup for shared / group masters (DP-PH6-NEW-24).
          Survivor wins per field · loser fields fill gaps.
        </p>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Layers className="w-4 h-4" /> Scan a master store
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <Select value={selectedKey} onValueChange={setSelectedKey}>
              <SelectTrigger className="w-[320px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STORES.map((s) => (
                  <SelectItem key={s.storage_key} value={s.storage_key}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={runScan} disabled={scanning} variant="default">
              <RefreshCw className="w-4 h-4 mr-2" /> Scan
            </Button>
            <Badge variant="outline" className="font-mono text-xs">
              {descriptor.storage_key}
            </Badge>
          </div>

          {candidates.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground border border-dashed rounded-lg">
              <CheckCircle2 className="w-6 h-6 mx-auto mb-2 text-success" />
              No duplicate pairs found · run a scan to look for likely dupes.
            </div>
          ) : (
            <ScrollArea className="h-[420px]">
              <div className="space-y-3">
                {candidates.map((c) => (
                  <Card key={c.id} className="border-warning/40">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-warning" />
                          <span className="text-sm font-medium">
                            {c.master_type} · similarity{' '}
                            <span className="font-mono">{(c.similarity * 100).toFixed(0)}%</span>
                          </span>
                          <Badge variant="outline" className="text-xs">
                            matched: {c.matched_fields.join(', ')}
                          </Badge>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <pre className="p-2 rounded bg-muted/40 overflow-x-auto font-mono">
                          {JSON.stringify(c.record_a, null, 2)}
                        </pre>
                        <pre className="p-2 rounded bg-muted/40 overflow-x-auto font-mono">
                          {JSON.stringify(c.record_b, null, 2)}
                        </pre>
                      </div>
                      <div className="flex gap-2 justify-end">
                        <Button size="sm" variant="outline" onClick={() => onMerge(c, 'a')}>
                          Keep Left
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => onMerge(c, 'b')}>
                          Keep Right
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
