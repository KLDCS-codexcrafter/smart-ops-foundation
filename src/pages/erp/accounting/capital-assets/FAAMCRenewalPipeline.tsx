/**
 * @file        src/pages/erp/accounting/capital-assets/FAAMCRenewalPipeline.tsx
 * @purpose     Cross-asset AMC renewal pipeline · 60/30/7 day visibility · FAR-CAP-14 · LEAK-12 closed
 * @sprint      T-Phase-4.FAR-2 · Block 8 · MOAT-44 (Tellicaller-style AMC renewal)
 */
import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Repeat, Phone } from 'lucide-react';
import { toast } from 'sonner';
import type { AssetUnitRecord } from '@/types/fixed-asset';
import { faUnitsKey } from '@/types/fixed-asset';
import { DEFAULT_ENTITY_SHORTCODE } from '@/lib/default-entity';

type RenewalStatus = 'upcoming' | 'imminent' | 'critical' | 'expired' | 'all';

const loadFAUnits = (entityCode: string): AssetUnitRecord[] => {
  try {
    const r = localStorage.getItem(faUnitsKey(entityCode));
    return r ? (JSON.parse(r) as AssetUnitRecord[]) : [];
  } catch { return []; }
};

function daysUntil(dateStr: string | undefined): number {
  if (!dateStr) return Infinity;
  return Math.floor((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

function classify(days: number): Exclude<RenewalStatus, 'all'> {
  if (days < 0) return 'expired';
  if (days <= 7) return 'critical';
  if (days <= 30) return 'imminent';
  return 'upcoming';
}

function statusBadge(s: Exclude<RenewalStatus, 'all'>): JSX.Element {
  const map: Record<Exclude<RenewalStatus, 'all'>, string> = {
    expired: 'bg-slate-500/10 text-slate-500 border-slate-400/30',
    critical: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30',
    imminent: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30',
    upcoming: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
  };
  return <Badge variant="outline" className={`text-[10px] capitalize ${map[s]}`}>{s}</Badge>;
}

interface Props { entityCode?: string }

export function FAAMCRenewalPipelinePanel({ entityCode = DEFAULT_ENTITY_SHORTCODE }: Props): JSX.Element {
  const [filter, setFilter] = useState<RenewalStatus>('all');

  const rows = useMemo(() => {
    const units = loadFAUnits(entityCode).filter(u => u.entity_id === entityCode && u.amc_expiry);
    return units
      .filter(u => daysUntil(u.amc_expiry) <= 60)
      .map(u => ({
        unit: u,
        daysToExpiry: daysUntil(u.amc_expiry),
        status: classify(daysUntil(u.amc_expiry)),
      }))
      .sort((a, b) => a.daysToExpiry - b.daysToExpiry);
  }, [entityCode]);

  const filtered = filter === 'all' ? rows : rows.filter(r => r.status === filter);

  const counts = useMemo(() => ({
    upcoming: rows.filter(r => r.status === 'upcoming').length,
    imminent: rows.filter(r => r.status === 'imminent').length,
    critical: rows.filter(r => r.status === 'critical').length,
    expired: rows.filter(r => r.status === 'expired').length,
  }), [rows]);

  const initiateRenewal = (assetId: string): void => {
    toast.success(`Renewal initiated for ${assetId}`);
  };

  return (
    <div className="p-6 space-y-4 animate-fade-in">
      <div className="flex items-center gap-3">
        <Repeat className="h-6 w-6 text-teal-500" />
        <div>
          <h2 className="text-xl font-bold">AMC Renewal Pipeline</h2>
          <p className="text-xs text-muted-foreground">
            Tellicaller-style cross-asset renewal pipeline · 60/30/7 day visibility · {rows.length} pipeline item(s)
          </p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Upcoming (60-30d)</p>
          <p className="text-2xl font-bold text-emerald-600">{counts.upcoming}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Imminent (30-7d)</p>
          <p className="text-2xl font-bold text-amber-600">{counts.imminent}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Critical (≤ 7d)</p>
          <p className="text-2xl font-bold text-red-600">{counts.critical}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Expired</p>
          <p className="text-2xl font-bold text-slate-500">{counts.expired}</p>
        </CardContent></Card>
      </div>

      <div className="flex items-center gap-2">
        <Select value={filter} onValueChange={v => setFilter(v as RenewalStatus)}>
          <SelectTrigger className="w-[180px] h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="upcoming">Upcoming</SelectItem>
            <SelectItem value="imminent">Imminent</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead className="text-xs">Asset ID</TableHead>
              <TableHead className="text-xs">Item</TableHead>
              <TableHead className="text-xs">AMC Expiry</TableHead>
              <TableHead className="text-xs">Days</TableHead>
              <TableHead className="text-xs">Status</TableHead>
              <TableHead className="text-xs">Action</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No renewal pipeline items for selected filter
                </TableCell></TableRow>
              ) : filtered.map(({ unit, daysToExpiry, status }) => (
                <TableRow key={unit.id}>
                  <TableCell className="font-mono text-xs">{unit.asset_id}</TableCell>
                  <TableCell className="text-xs">{unit.item_name}</TableCell>
                  <TableCell className="text-xs font-mono">{unit.amc_expiry}</TableCell>
                  <TableCell className="text-xs font-mono">{daysToExpiry < 0 ? `+${Math.abs(daysToExpiry)}` : daysToExpiry}</TableCell>
                  <TableCell>{statusBadge(status)}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => initiateRenewal(unit.asset_id)}>
                      <Phone className="h-3 w-3 mr-1" /> Initiate Renewal
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export default function FAAMCRenewalPipeline(): JSX.Element {
  return <FAAMCRenewalPipelinePanel />;
}
