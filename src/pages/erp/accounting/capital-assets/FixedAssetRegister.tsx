/**
 * FixedAssetRegister.tsx — FC Sprint 4
 * fc-fa-register: Main register — one row per AssetUnitRecord
 * Filter panel + expand row + quick actions + CSV export
 * [JWT] Replace with GET /api/fixed-assets/units
 */
import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { Search, Download, Layers } from 'lucide-react';
import { onEnterNext } from '@/lib/keyboard';
import type { AssetUnitRecord, AssetUnitStatus, ITActBlock } from '@/types/fixed-asset';
import { faUnitsKey, IT_ACT_BLOCK_LABELS } from '@/types/fixed-asset';

const ls = <T,>(k: string): T[] => {
  try {
    // [JWT] GET /api/fixed-assets/units
    const r = localStorage.getItem(k);
    return r ? JSON.parse(r) : [];
  } catch { return []; }
};

const STATUS_BADGES: Record<string, string> = {
  active: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
  cwip: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30',
  disposed: 'bg-slate-500/10 text-slate-500 border-slate-400/30',
  written_off: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30',
  transferred: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30',
};

interface Props { entityCode: string; }

export function FixedAssetRegisterPanel({ entityCode }: Props) {
  const units = useMemo(() => ls<AssetUnitRecord>(faUnitsKey(entityCode)).filter(u => u.entity_id === entityCode), [entityCode]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<AssetUnitStatus | 'all'>('all');
  const [blockFilter, setBlockFilter] = useState<ITActBlock | 'all'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() => units.filter(u => {
    if (statusFilter !== 'all' && u.status !== statusFilter) return false;
    if (blockFilter !== 'all' && u.it_act_block !== blockFilter) return false;
    const q = search.toLowerCase();
    return !q || u.asset_id.toLowerCase().includes(q) || u.item_name.toLowerCase().includes(q) ||
      u.custodian_name.toLowerCase().includes(q) || u.department.toLowerCase().includes(q);
  }), [units, search, statusFilter, blockFilter]);

  const exportCSV = () => {
    const headers = ['Asset ID', 'Item', 'IT Act Block', 'Purchase Date', 'Put To Use', 'Gross Block', 'Accum Depr', 'NBV', 'Location', 'Department', 'Custodian', 'Status'];
    const rows = filtered.map(u => [u.asset_id, u.item_name, u.it_act_block, u.purchase_date, u.put_to_use_date, u.gross_block_cost, u.accumulated_depreciation, u.net_book_value, u.location, u.department, u.custodian_name, u.status]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `fa_register_${entityCode}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported');
  };

  return (
    <div className="p-6 space-y-4 animate-fade-in" data-keyboard-form>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Layers className="h-5 w-5 text-teal-500" /> Fixed Asset Register
          </h2>
          <p className="text-xs text-muted-foreground">{filtered.length} unit(s) · Entity: {entityCode}</p>
        </div>
        <Button size="sm" variant="outline" onClick={exportCSV}><Download className="h-3.5 w-3.5 mr-1" /> Export CSV</Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Search asset ID, item, custodian..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-9" onKeyDown={onEnterNext} />
        </div>
        <Select value={statusFilter} onValueChange={v => setStatusFilter(v as AssetUnitStatus | 'all')}>
          <SelectTrigger className="w-[140px] h-9"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="cwip">CWIP</SelectItem>
            <SelectItem value="disposed">Disposed</SelectItem>
            <SelectItem value="written_off">Written Off</SelectItem>
          </SelectContent>
        </Select>
        <Select value={blockFilter} onValueChange={v => setBlockFilter(v as ITActBlock | 'all')}>
          <SelectTrigger className="w-[200px] h-9"><SelectValue placeholder="IT Act Block" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Blocks</SelectItem>
            {(Object.keys(IT_ACT_BLOCK_LABELS) as ITActBlock[]).map(k => (
              <SelectItem key={k} value={k}>{k}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Register Table */}
      <div className="rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Asset ID</TableHead>
              <TableHead className="text-xs">Item Name</TableHead>
              <TableHead className="text-xs">IT Act Block</TableHead>
              <TableHead className="text-xs">Purchase</TableHead>
              <TableHead className="text-xs">Put To Use</TableHead>
              <TableHead className="text-xs text-right">Gross Block</TableHead>
              <TableHead className="text-xs text-right">Accum Depr</TableHead>
              <TableHead className="text-xs text-right">NBV</TableHead>
              <TableHead className="text-xs">Location</TableHead>
              <TableHead className="text-xs">Custodian</TableHead>
              <TableHead className="text-xs">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={11} className="text-center text-muted-foreground py-8">No asset units found</TableCell></TableRow>
            )}
            {filtered.map(u => (
              <>
                <TableRow key={u.id} className="cursor-pointer" onClick={() => setExpandedId(expandedId === u.id ? null : u.id)}>
                  <TableCell className="font-mono text-xs">{u.asset_id}</TableCell>
                  <TableCell className="text-xs">{u.item_name}</TableCell>
                  <TableCell className="text-xs">{u.it_act_block}</TableCell>
                  <TableCell className="text-xs font-mono">{u.purchase_date}</TableCell>
                  <TableCell className="text-xs font-mono">{u.put_to_use_date || '—'}</TableCell>
                  <TableCell className="text-xs text-right font-mono">₹{u.gross_block_cost.toLocaleString('en-IN')}</TableCell>
                  <TableCell className="text-xs text-right font-mono">₹{u.accumulated_depreciation.toLocaleString('en-IN')}</TableCell>
                  <TableCell className="text-xs text-right font-mono">₹{u.net_book_value.toLocaleString('en-IN')}</TableCell>
                  <TableCell className="text-xs">{u.location}</TableCell>
                  <TableCell className="text-xs">{u.custodian_name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-[10px] capitalize ${STATUS_BADGES[u.status] || ''}`}>{u.status.replace('_', ' ')}</Badge>
                  </TableCell>
                </TableRow>
                {expandedId === u.id && (
                  <TableRow key={`${u.id}-detail`}>
                    <TableCell colSpan={11} className="bg-muted/30 p-4">
                      <div className="grid grid-cols-4 gap-4 text-xs">
                        <div><span className="text-muted-foreground">Department:</span> {u.department}</div>
                        <div><span className="text-muted-foreground">Salvage:</span> ₹{u.salvage_value.toLocaleString('en-IN')}</div>
                        <div><span className="text-muted-foreground">IT Rate:</span> {u.it_act_depr_rate}%</div>
                        <div><span className="text-muted-foreground">Opening WDV:</span> ₹{u.opening_wdv.toLocaleString('en-IN')}</div>
                        {u.warranty_expiry && <div><span className="text-muted-foreground">Warranty:</span> {u.warranty_expiry}</div>}
                        {u.insurance_expiry && <div><span className="text-muted-foreground">Insurance:</span> {u.insurance_expiry}</div>}
                        {u.amc_expiry && <div><span className="text-muted-foreground">AMC:</span> {u.amc_expiry}</div>}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export default function FixedAssetRegister() { return <FixedAssetRegisterPanel entityCode="SMRT" />; }
