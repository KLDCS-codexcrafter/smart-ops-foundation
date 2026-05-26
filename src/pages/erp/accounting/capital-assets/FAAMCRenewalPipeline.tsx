/**
 * FAAMCRenewalPipeline.tsx — Sprint 66 FAR-2 · Block 8 · FAR-CAP-14
 * Cross-asset AMC renewal pipeline (60-30-7-overdue bands).
 * Reads from AssetUnitRecord amc_expiry · entity-scoped.
 * [JWT] Replace with GET /api/fa/amc-renewal-pipeline
 */
import { useMemo, useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { CalendarClock, Shield } from 'lucide-react';
import type { AssetUnitRecord } from '@/types/fixed-asset';
import { faUnitsKey } from '@/types/fixed-asset';

const ls = <T,>(k: string): T[] => {
  try {
    // [JWT] GET /api/fa/amc-pipeline?entityCode=...
    const r = localStorage.getItem(k);
    return r ? JSON.parse(r) : [];
  } catch { return []; }
};

const daysTo = (iso: string): number => {
  if (!iso) return Infinity;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
};

type Band = 'upcoming' | 'imminent' | 'critical' | 'expired';

const bandOf = (days: number): Band | null => {
  if (!Number.isFinite(days)) return null;
  if (days < 0) return 'expired';
  if (days <= 7) return 'critical';
  if (days <= 30) return 'imminent';
  if (days <= 60) return 'upcoming';
  return null;
};

const bandBadge = (b: Band) => {
  if (b === 'upcoming') return <Badge className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30">Upcoming (60-30d)</Badge>;
  if (b === 'imminent') return <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30">Imminent (30-7d)</Badge>;
  if (b === 'critical') return <Badge className="bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/30">Critical (≤7d)</Badge>;
  return <Badge className="bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30">Expired</Badge>;
};

interface Props { entityCode: string; }

export function FAAMCRenewalPipelinePanel({ entityCode }: Props) {
  const [units, setUnits] = useState<AssetUnitRecord[]>([]);

  useEffect(() => {
    setUnits(ls<AssetUnitRecord>(faUnitsKey(entityCode)).filter(u => u.entity_id === entityCode));
  }, [entityCode]);

  const rows = useMemo(() => {
    return units
      .map(u => ({ unit: u, days: daysTo(u.amc_expiry ?? ''), band: bandOf(daysTo(u.amc_expiry ?? '')) }))
      .filter(r => r.band !== null)
      .sort((a, b) => a.days - b.days);
  }, [units]);

  const handle = (label: string) => () => toast.success(label);

  return (
    <div className="space-y-4 p-4">
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <CalendarClock className="h-5 w-5" /> AMC Renewal Pipeline
        </h2>
        <p className="text-sm text-muted-foreground">
          Proactive 60-30-7-day cross-asset AMC renewal queue.
        </p>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Asset ID</TableHead>
            <TableHead>Item</TableHead>
            <TableHead>AMC Expiry</TableHead>
            <TableHead>Days</TableHead>
            <TableHead>Band</TableHead>
            <TableHead>Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                No assets in Renewal Pipeline window
              </TableCell>
            </TableRow>
          ) : rows.map(r => (
            <TableRow key={r.unit.id}>
              <TableCell className="font-mono">{r.unit.asset_id}</TableCell>
              <TableCell>{r.unit.item_name}</TableCell>
              <TableCell>{r.unit.amc_expiry ? new Date(r.unit.amc_expiry).toLocaleDateString('en-IN') : '—'}</TableCell>
              <TableCell className="font-mono">{r.days}</TableCell>
              <TableCell>{r.band && bandBadge(r.band)}</TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={handle('Renewal initiated')}>
                    <Shield className="h-3 w-3 mr-1" /> Initiate
                  </Button>
                  <Button size="sm" variant="ghost" onClick={handle('Marked renewed')}>Mark Renewed</Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default FAAMCRenewalPipelinePanel;
