/**
 * @file        MasterVisibilityHeatmapPage.tsx
 * @purpose     First-Class Standalone Page #26 · Master Visibility Heatmap
 *              Matrix view: Companies (X) × Master Types (Y) · cells coloured
 *              green (synced) / yellow (per-entity override exists) / red (missing).
 * @route       /erp/command-center/master-visibility-heatmap
 * @reads       master-replication-engine · cross-company-reports-engine · field-lock-metadata-engine
 * @writes      delegates "Sync All Missing" to master-replication-engine.replicateToAllEntities
 * @sprint      T-Phase-6.A.0.5 · Sprint 100 · Block 3
 */
import { useState, useMemo } from 'react';
import { Grid3x3, Sparkles, Eye, ShieldAlert, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { loadEntities } from '@/data/mock-entities';
import {
  ALL_MASTER_TYPES,
  replicateToAllEntities,
  type MasterType,
} from '@/lib/master-replication-engine';
import { ALL_CROSS_CO_REPORTS } from '@/lib/cross-company-reports-engine';

type CellState = 'green' | 'yellow' | 'red';

/** Heatmap colour logic — pure for testability.
 *  - red    : missing in target entity
 *  - yellow : present + a per-entity override exists for any field
 *  - green  : present and fully synced
 */
export function classifyCell(input: {
  present: boolean;
  hasOverride: boolean;
}): CellState {
  if (!input.present) return 'red';
  if (input.hasOverride) return 'yellow';
  return 'green';
}

function readEntityMaster(entityCode: string, mt: MasterType): unknown[] {
  try {
    const raw = localStorage.getItem(`erp_${entityCode}_master_${mt}`);
    return raw ? (JSON.parse(raw) as unknown[]) : [];
  } catch {
    return [];
  }
}

function readOverrideRules(entityCode: string, mt: MasterType): unknown[] {
  try {
    const raw = localStorage.getItem(`erp_${entityCode}_master_override_${mt}`);
    return raw ? (JSON.parse(raw) as unknown[]) : [];
  } catch {
    return [];
  }
}

const STATE_STYLE: Record<CellState, string> = {
  green: 'bg-success/15 text-success border-success/30',
  yellow: 'bg-warning/15 text-warning border-warning/30',
  red: 'bg-destructive/15 text-destructive border-destructive/30',
};

const STATE_ICON: Record<CellState, React.ReactNode> = {
  green: <Sparkles className="h-3 w-3" />,
  yellow: <AlertTriangle className="h-3 w-3" />,
  red: <ShieldAlert className="h-3 w-3" />,
};

export default function MasterVisibilityHeatmapPage() {
  const [, setTick] = useState(0);
  const entities = useMemo(() => loadEntities(), []);

  const matrix = ALL_MASTER_TYPES.map((mt) => {
    const cells = entities.map((e) => {
      const list = readEntityMaster(e.shortCode, mt);
      const overrides = readOverrideRules(e.shortCode, mt);
      const state = classifyCell({
        present: list.length > 0,
        hasOverride: overrides.length > 0,
      });
      return { entity: e, state, count: list.length };
    });
    return { master_type: mt, cells };
  });

  const totalMissing = matrix.reduce(
    (sum, row) => sum + row.cells.filter((c) => c.state === 'red').length, 0,
  );

  const syncRow = (mt: MasterType) => {
    try {
      const present = entities.find((e) => readEntityMaster(e.shortCode, mt).length > 0);
      if (!present) {
        toast.error(`No source entity has any ${mt} masters to replicate from`);
        return;
      }
      replicateToAllEntities({
        master_type: mt,
        source_entity: present.shortCode,
        record_id: 'BULK_SYNC_MISSING',
        record: { id: 'BULK_SYNC_MISSING' },
      });
      toast.success(`Sync triggered for ${mt}`);
      setTick((t) => t + 1);
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <div className="p-6 space-y-4 animate-fade-in">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Grid3x3 className="h-5 w-5 text-primary" />
            Master Visibility Heatmap
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            {ALL_MASTER_TYPES.length} master types × {entities.length} companies ·
            Green = synced · Yellow = per-entity override · Red = missing.
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="text-[10px] font-mono">
            {ALL_CROSS_CO_REPORTS.length} cross-co reports
          </Badge>
          <Badge variant="destructive" className="text-[10px] font-mono">
            {totalMissing} missing cells
          </Badge>
        </div>
      </div>

      <Card className="glass-card">
        <CardContent className="p-3 overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr>
                <th className="text-left p-2 text-muted-foreground">Master Type</th>
                {entities.map((e) => (
                  <th key={e.id} className="p-2 text-left text-muted-foreground font-mono">
                    {e.shortCode}
                  </th>
                ))}
                <th className="p-2 text-right text-muted-foreground">Action</th>
              </tr>
            </thead>
            <tbody>
              {matrix.map((row) => (
                <tr key={row.master_type} className="border-t border-border/40">
                  <td className="p-2 font-mono text-foreground">{row.master_type}</td>
                  {row.cells.map((c) => (
                    <td key={c.entity.id} className="p-2">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border ${STATE_STYLE[c.state]}`}
                        title={`${c.entity.name} · ${c.count} records · ${c.state}`}
                      >
                        {STATE_ICON[c.state]}
                        <span className="font-mono">{c.count}</span>
                      </span>
                    </td>
                  ))}
                  <td className="p-2 text-right">
                    <Button size="sm" variant="outline" onClick={() => syncRow(row.master_type)}>
                      <Eye className="h-3 w-3 mr-1" /> Sync All Missing
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
