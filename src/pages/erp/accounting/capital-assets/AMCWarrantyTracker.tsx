/**
 * AMCWarrantyTracker.tsx — FC Sprint 4
 * fc-fa-amc: 3 tabs — Warranty | AMC | Service History
 * [JWT] Replace with GET /api/fixed-assets/units
 */
import { useState, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Shield } from 'lucide-react';
import type { AssetUnitRecord } from '@/types/fixed-asset';
import { faUnitsKey } from '@/types/fixed-asset';
import { DEFAULT_ENTITY_SHORTCODE } from '@/lib/default-entity';

const ls = <T,>(k: string): T[] => {
  try {
    // [JWT] GET /api/fixed-assets/units
    const r = localStorage.getItem(k);
    return r ? JSON.parse(r) : [];
  } catch { return []; }
};

function daysUntil(dateStr: string | undefined): number {
  if (!dateStr) return Infinity;
  return Math.floor((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

function expiryBadge(dateStr: string | undefined) {
  const days = daysUntil(dateStr);
  if (days < 0) return <Badge variant="outline" className="text-[10px] bg-slate-500/10 text-slate-500">Expired</Badge>;
  if (days <= 30) return <Badge variant="outline" className="text-[10px] bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30">{days}d</Badge>;
  if (days <= 90) return <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30">{days}d</Badge>;
  return <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">{days}d</Badge>;
}

interface Props { entityCode: string; }

export function AMCWarrantyTrackerPanel({ entityCode }: Props) {
  const units = useMemo(() => ls<AssetUnitRecord>(faUnitsKey(entityCode)).filter(u => u.entity_id === entityCode && u.status === 'active'), [entityCode]);
  const [tab, setTab] = useState('warranty');

  const warrantyUnits = useMemo(() => units.filter(u => u.warranty_expiry).sort((a, b) => (a.warranty_expiry ?? '').localeCompare(b.warranty_expiry ?? '')), [units]);
  const amcUnits = useMemo(() => units.filter(u => u.amc_expiry).sort((a, b) => (a.amc_expiry ?? '').localeCompare(b.amc_expiry ?? '')), [units]);

  return (
    <div className="p-6 space-y-4 animate-fade-in">
      <div>
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Shield className="h-5 w-5 text-teal-500" /> AMC & Warranty Tracker
        </h2>
        <p className="text-xs text-muted-foreground">Track warranty, AMC, and service history for active assets</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="warranty">Warranty ({warrantyUnits.length})</TabsTrigger>
          <TabsTrigger value="amc">AMC ({amcUnits.length})</TabsTrigger>
          <TabsTrigger value="history">Service History</TabsTrigger>
        </TabsList>

        <TabsContent value="warranty">
          <div className="rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Asset ID</TableHead>
                  <TableHead className="text-xs">Item</TableHead>
                  <TableHead className="text-xs">Warranty Expiry</TableHead>
                  <TableHead className="text-xs">Days Left</TableHead>
                  <TableHead className="text-xs">Location</TableHead>
                  <TableHead className="text-xs">Custodian</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {warrantyUnits.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No warranty records</TableCell></TableRow>
                )}
                {warrantyUnits.map(u => (
                  <TableRow key={u.id}>
                    <TableCell className="font-mono text-xs">{u.asset_id}</TableCell>
                    <TableCell className="text-xs">{u.item_name}</TableCell>
                    <TableCell className="text-xs font-mono">{u.warranty_expiry}</TableCell>
                    <TableCell>{expiryBadge(u.warranty_expiry)}</TableCell>
                    <TableCell className="text-xs">{u.location}</TableCell>
                    <TableCell className="text-xs">{u.custodian_name}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="amc">
          <div className="rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Asset ID</TableHead>
                  <TableHead className="text-xs">Item</TableHead>
                  <TableHead className="text-xs">AMC Expiry</TableHead>
                  <TableHead className="text-xs">Days Left</TableHead>
                  <TableHead className="text-xs">Location</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {amcUnits.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No AMC records</TableCell></TableRow>
                )}
                {amcUnits.map(u => (
                  <TableRow key={u.id}>
                    <TableCell className="font-mono text-xs">{u.asset_id}</TableCell>
                    <TableCell className="text-xs">{u.item_name}</TableCell>
                    <TableCell className="text-xs font-mono">{u.amc_expiry}</TableCell>
                    <TableCell>{expiryBadge(u.amc_expiry)}</TableCell>
                    <TableCell className="text-xs">{u.location}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="history">
          <div className="rounded-xl border border-border p-8 text-center text-muted-foreground text-sm">
            Service history from Expense Booking vouchers tagged to asset units will appear here.
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function AMCWarrantyTracker() { return <AMCWarrantyTrackerPanel entityCode={DEFAULT_ENTITY_SHORTCODE} />; }
