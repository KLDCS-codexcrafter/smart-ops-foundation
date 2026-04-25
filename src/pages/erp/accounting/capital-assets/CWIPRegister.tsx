/**
 * CWIPRegister.tsx — FC Sprint 4
 * fc-fa-cwip: Shows status=cwip units, Capitalise button
 * [JWT] Replace with GET /api/fixed-assets/units?status=cwip
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Package, CheckCircle2 } from 'lucide-react';
import { SmartDateInput } from '@/components/ui/smart-date-input';
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
const ss = <T,>(k: string, d: T[]) => {
  // [JWT] POST /api/fixed-assets/units
  localStorage.setItem(k, JSON.stringify(d));
};

interface Props { entityCode: string; }

export function CWIPRegisterPanel({ entityCode }: Props) {
  const [units, setUnits] = useState<AssetUnitRecord[]>(() => ls<AssetUnitRecord>(faUnitsKey(entityCode)).filter(u => u.entity_id === entityCode && u.status === 'cwip'));
  const [ptuOpen, setPtuOpen] = useState(false);
  const [ptuUnit, setPtuUnit] = useState<AssetUnitRecord | null>(null);
  const [ptuDate, setPtuDate] = useState('');

  const reload = () => setUnits(ls<AssetUnitRecord>(faUnitsKey(entityCode)).filter(u => u.entity_id === entityCode && u.status === 'cwip'));

  const handleCapitalise = () => {
    if (!ptuUnit || !ptuDate) { toast.error('Select date'); return; }
    const all = ls<AssetUnitRecord>(faUnitsKey(entityCode));
    const updated = all.map(u => u.id === ptuUnit.id ? { ...u, put_to_use_date: ptuDate, status: 'active' as const, updated_at: new Date().toISOString() } : u);
    // [JWT] PATCH /api/fixed-assets/units/:id
    ss(faUnitsKey(entityCode), updated);
    toast.success(`${ptuUnit.asset_id} capitalised (Put To Use: ${ptuDate})`);
    setPtuOpen(false); setPtuUnit(null); reload();
  };

  return (
    <div className="p-6 space-y-4 animate-fade-in" data-keyboard-form>
      <div>
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Package className="h-5 w-5 text-teal-500" /> Capital Work-in-Progress
        </h2>
        <p className="text-xs text-muted-foreground">{units.length} asset(s) awaiting capitalisation</p>
      </div>

      <div className="rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Asset ID</TableHead>
              <TableHead className="text-xs">Item</TableHead>
              <TableHead className="text-xs">Purchase Date</TableHead>
              <TableHead className="text-xs text-right">Cost</TableHead>
              <TableHead className="text-xs">Age (days)</TableHead>
              <TableHead className="text-xs">Location</TableHead>
              <TableHead className="text-xs">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {units.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No CWIP assets</TableCell></TableRow>
            )}
            {units.map(u => {
              const age = Math.floor((Date.now() - new Date(u.purchase_date).getTime()) / 86400000);
              return (
                <TableRow key={u.id}>
                  <TableCell className="font-mono text-xs">{u.asset_id}</TableCell>
                  <TableCell className="text-xs">{u.item_name}</TableCell>
                  <TableCell className="text-xs font-mono">{u.purchase_date}</TableCell>
                  <TableCell className="text-xs text-right font-mono">₹{u.gross_block_cost.toLocaleString('en-IN')}</TableCell>
                  <TableCell className={`text-xs font-mono ${age > 365 ? 'text-destructive font-bold' : ''}`}>
                    {age} {age > 365 && <Badge variant="outline" className="text-[8px] ml-1 bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30">Audit risk</Badge>}
                  </TableCell>
                  <TableCell className="text-xs">{u.location}</TableCell>
                  <TableCell>
                    <Button data-primary size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => { setPtuUnit(u); setPtuDate(''); setPtuOpen(true); }}>
                      <CheckCircle2 className="h-3 w-3 mr-1" /> Capitalise
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={ptuOpen} onOpenChange={setPtuOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Capitalise Asset</DialogTitle>
            <DialogDescription>Set put-to-use date for {ptuUnit?.asset_id}</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label className="text-xs">Put To Use Date *</Label>
            <SmartDateInput value={ptuDate} onChange={setPtuDate} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPtuOpen(false)}>Cancel</Button>
            <Button onClick={handleCapitalise}>Capitalise</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function CWIPRegister() { return <CWIPRegisterPanel entityCode={DEFAULT_ENTITY_SHORTCODE} />; }
