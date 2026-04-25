/**
 * DepreciationWorkings.tsx — FC Sprint 4
 * fc-fa-depreciation: FY selector + Compute + Post All
 * [JWT] Replace with GET/POST /api/fixed-assets/depreciation
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { Calculator, CheckCircle2 } from 'lucide-react';
import { onEnterNext } from '@/lib/keyboard';
import type { AssetUnitRecord, DepreciationEntry } from '@/types/fixed-asset';
import { faUnitsKey, faDeprKey } from '@/types/fixed-asset';
import { computeDepreciationForUnits } from '@/lib/depreciationEngine';
import { postVoucher, generateVoucherNo } from '@/lib/finecore-engine';
import type { Voucher } from '@/types/voucher';
import { DEFAULT_ENTITY_SHORTCODE } from '@/lib/default-entity';

const ls = <T,>(k: string): T[] => {
  try {
    // [JWT] GET /api/fixed-assets/storage/:key
    const r = localStorage.getItem(k);
    return r ? JSON.parse(r) : [];
  } catch { return []; }
};
const ss = <T,>(k: string, d: T[]) => {
  // [JWT] POST /api/fixed-assets/storage/:key
  localStorage.setItem(k, JSON.stringify(d));
};

interface Props { entityCode: string; }

export function DepreciationWorkingsPanel({ entityCode }: Props) {
  const defaultFY = (() => {
    const now = new Date();
    const y = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    return `${String(y).slice(2)}-${String(y + 1).slice(2)}`;
  })();
  const [fy, setFy] = useState(defaultFY);
  const [entries, setEntries] = useState<DepreciationEntry[]>([]);
  const [computed, setComputed] = useState(false);

  const handleCompute = () => {
    const units = ls<AssetUnitRecord>(faUnitsKey(entityCode)).filter(u => u.entity_id === entityCode);
    // [JWT] GET /api/accounting/ledger-definitions
    const ldefs = ls<Record<string, unknown>>(`erp_group_ledger_definitions_${entityCode}`)
      .filter(d => d.ledgerType === 'asset')
      .map(d => ({ id: String(d.id), depreciationMethod: String(d.depreciationMethod ?? ''), depreciationRate: Number(d.depreciationRate ?? 0), usefulLifeYears: Number(d.usefulLifeYears ?? 0), name: String(d.name ?? '') }));
    const result = computeDepreciationForUnits(units, fy, entityCode, ldefs);
    setEntries(result);
    setComputed(true);
    toast.success(`Computed depreciation for ${result.length} unit(s)`);
  };

  const handlePostAll = () => {
    if (entries.length === 0) { toast.error('Nothing to post'); return; }
    const units = ls<AssetUnitRecord>(faUnitsKey(entityCode));
    const deprStore = ls<DepreciationEntry>(faDeprKey(entityCode));

    for (const entry of entries) {
      if (entry.status === 'posted') continue;
      const voucherNo = generateVoucherNo('DEP', entityCode);
      const voucher: Voucher = {
        id: `v-dep-${Date.now()}-${entry.id}`,
        voucher_no: voucherNo,
        voucher_type_id: 'depreciation', voucher_type_name: 'Depreciation',
        base_voucher_type: 'Depreciation', entity_id: entityCode,
        date: entry.period_to,
        ledger_lines: [
          { id: `ll-dr-${Date.now()}`, ledger_id: 'depr-exp', ledger_code: 'DTAN', ledger_name: 'Depreciation Expense', ledger_group_code: 'E-DEP', dr_amount: entry.depreciation_amount, cr_amount: 0, narration: '' },
          { id: `ll-cr-${Date.now()}`, ledger_id: 'accum-depr', ledger_code: 'ADEP', ledger_name: 'Accumulated Depreciation', ledger_group_code: 'ADEP', dr_amount: 0, cr_amount: entry.depreciation_amount, narration: '' },
        ],
        gross_amount: entry.depreciation_amount, total_discount: 0, total_taxable: 0,
        total_cgst: 0, total_sgst: 0, total_igst: 0, total_cess: 0, total_tax: 0,
        round_off: 0, net_amount: entry.depreciation_amount, tds_applicable: false,
        narration: `Depreciation FY ${fy} for ${entry.asset_id}`,
        terms_conditions: '', payment_enforcement: '', payment_instrument: '',
        status: 'draft', created_by: 'Admin',
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      };
      postVoucher(voucher, entityCode);
      entry.status = 'posted';
      entry.journal_id = voucher.id;

      // Update unit
      const unit = units.find(u => u.id === entry.asset_unit_id);
      if (unit) {
        unit.accumulated_depreciation += entry.depreciation_amount;
        unit.net_book_value = unit.gross_block_cost - unit.accumulated_depreciation;
        unit.opening_wdv = entry.closing_wdv;
        unit.updated_at = new Date().toISOString();
      }
      deprStore.push(entry);
    }

    // [JWT] PATCH /api/fixed-assets/units
    ss(faUnitsKey(entityCode), units);
    // [JWT] POST /api/fixed-assets/depreciation
    ss(faDeprKey(entityCode), deprStore);
    setEntries([...entries]);
    toast.success(`Posted ${entries.filter(e => e.status === 'posted').length} depreciation JV(s)`);
  };

  return (
    <div className="p-6 space-y-4 animate-fade-in" data-keyboard-form>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Calculator className="h-5 w-5 text-teal-500" /> Depreciation Workings
          </h2>
          <p className="text-xs text-muted-foreground">Compute and post depreciation for FY {fy}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Financial Year</Label>
            <Input value={fy} onChange={e => { setFy(e.target.value); setComputed(false); }} onKeyDown={onEnterNext} className="h-8 w-24 font-mono text-xs" placeholder="25-26" />
          </div>
          <Button data-primary onClick={handleCompute} className="mt-5">Compute Depreciation</Button>
          {computed && entries.length > 0 && (
            <Button data-primary onClick={handlePostAll} className="mt-5" variant="default">
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Post All
            </Button>
          )}
        </div>
      </div>

      {computed && (
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Asset ID</TableHead>
                <TableHead className="text-xs">Ledger</TableHead>
                <TableHead className="text-xs">Method</TableHead>
                <TableHead className="text-xs text-right">Opening WDV</TableHead>
                <TableHead className="text-xs text-right">Rate</TableHead>
                <TableHead className="text-xs">180-day?</TableHead>
                <TableHead className="text-xs text-right">Depr Amount</TableHead>
                <TableHead className="text-xs text-right">Closing WDV</TableHead>
                <TableHead className="text-xs">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.length === 0 && (
                <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">No active units for depreciation</TableCell></TableRow>
              )}
              {entries.map(e => (
                <TableRow key={e.id}>
                  <TableCell className="font-mono text-xs">{e.asset_id}</TableCell>
                  <TableCell className="text-xs">{e.ledger_definition_id}</TableCell>
                  <TableCell className="text-xs uppercase">{e.method}</TableCell>
                  <TableCell className="text-xs text-right font-mono">₹{e.opening_wdv.toLocaleString('en-IN')}</TableCell>
                  <TableCell className="text-xs text-right font-mono">{e.rate_applied}%</TableCell>
                  <TableCell>
                    {e.is_half_rate ? <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30">Yes</Badge> : <span className="text-xs text-muted-foreground">No</span>}
                  </TableCell>
                  <TableCell className="text-xs text-right font-mono font-bold">₹{e.depreciation_amount.toLocaleString('en-IN')}</TableCell>
                  <TableCell className="text-xs text-right font-mono">₹{e.closing_wdv.toLocaleString('en-IN')}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-[10px] capitalize ${e.status === 'posted' ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'bg-blue-500/10 text-blue-700 dark:text-blue-400'}`}>{e.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

export default function DepreciationWorkings() { return <DepreciationWorkingsPanel entityCode={DEFAULT_ENTITY_SHORTCODE} />; }
