/**
 * PackingSlipPrint.tsx — A4 print preview. Sprint 15a + 15b override section.
 */

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Printer, Search, Save } from 'lucide-react';
import type { Voucher } from '@/types/voucher';
import type { ItemPacking } from '@/types/item-packing';
import type { PackingSlip } from '@/types/packing-slip';
import { packingSlipsKey } from '@/types/packing-slip';
import { vouchersKey } from '@/lib/finecore-engine';
import { computePackingSlip } from '@/lib/packing-slip-engine';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import { toast } from 'sonner';
// Sprint 15b — override capture
import {
  type PackingBOM, type PackingBOMActual,
  packingBOMsKey, packingBOMActualsKey,
} from '@/types/packing-bom';
import { expandDLN, computeActualVariance } from '@/lib/packing-bom-engine';

function ls<T>(k: string): T[] {
  try { const r = localStorage.getItem(k); return r ? JSON.parse(r) as T[] : []; }
  catch { return []; }
}

interface OverrideRow {
  key: string; // item_id|material_id
  item_id: string; item_code: string;
  material_id: string; material_code: string; material_name: string; material_uom: string;
  standard_qty: number;
  actual_qty: number;
}

export function PackingSlipPrintPanel() {
  const { entityCode, userId } = useCardEntitlement();
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [slips, setSlips] = useState<PackingSlip[]>([]);
  const [search, setSearch] = useState('');
  const [activeSlip, setActiveSlip] = useState<PackingSlip | null>(null);

  useEffect(() => {
    setVouchers(ls<Voucher>(vouchersKey(entityCode)));
    setSlips(ls<PackingSlip>(packingSlipsKey(entityCode)));
  }, [entityCode]);

  const dlns = useMemo(
    () => vouchers
      .filter(v => v.base_voucher_type === 'Delivery Note' && v.status === 'posted')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 20),
    [vouchers],
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return dlns;
    const n = search.toLowerCase();
    return dlns.filter(d => d.voucher_no.toLowerCase().includes(n)
      || (d.party_name ?? '').toLowerCase().includes(n));
  }, [dlns, search]);

  const generate = (dln: Voucher) => {
    const existing = slips.find(s => s.dln_voucher_id === dln.id);
    if (existing) { setActiveSlip(existing); return; }
    const itemPackings = ls<ItemPacking>('erp_item_packing_master');
    const slip = computePackingSlip({
      dln, itemPackings, generatedBy: userId, entityCode,
      shipToAddress: '', shipToCity: '', shipToState: '', shipToPincode: '',
    });
    const next = [...slips, slip];
    // [JWT] POST /api/dispatch/packing-slips
    localStorage.setItem(packingSlipsKey(entityCode), JSON.stringify(next));
    setSlips(next); setActiveSlip(slip);
  };

  // Sprint 15b — override capture state
  const [overrideRows, setOverrideRows] = useState<OverrideRow[]>([]);
  const [packerName, setPackerName] = useState('');
  const [reason, setReason] = useState('');

  // Build standard rows from active BOMs whenever activeSlip changes
  useEffect(() => {
    if (!activeSlip) { setOverrideRows([]); return; }
    const dln = vouchers.find(v => v.id === activeSlip.dln_voucher_id);
    if (!dln) { setOverrideRows([]); return; }
    const boms = ls<PackingBOM>(packingBOMsKey(entityCode));
    const { materials } = expandDLN(dln, boms);
    // Aggregate by item+material
    const map = new Map<string, OverrideRow>();
    for (const m of materials) {
      const key = `${m.source_item_id}|${m.material_id}`;
      const ex = map.get(key);
      if (ex) ex.standard_qty += m.qty;
      else map.set(key, {
        key,
        item_id: m.source_item_id, item_code: m.source_item_code,
        material_id: m.material_id, material_code: m.material_code,
        material_name: m.material_name, material_uom: m.material_uom,
        standard_qty: m.qty, actual_qty: m.qty,
      });
    }
    setOverrideRows(Array.from(map.values()));
  }, [activeSlip, vouchers, entityCode]);

  const printSlip = () => {
    if (!activeSlip) return;
    const updated = slips.map(s => s.id === activeSlip.id
      ? { ...s, printed_count: s.printed_count + 1, status: 'printed' as const } : s);
    localStorage.setItem(packingSlipsKey(entityCode), JSON.stringify(updated));
    setSlips(updated);
    setActiveSlip({ ...activeSlip, printed_count: activeSlip.printed_count + 1, status: 'printed' });
    window.print();
    toast.success('Sent to printer');
  };

  const saveOverrides = () => {
    if (!activeSlip) return;
    const changed = overrideRows.filter(r => r.actual_qty !== r.standard_qty);
    if (changed.length === 0) { toast.info('No overrides to save'); return; }
    const now = new Date().toISOString();
    const allActuals = ls<PackingBOMActual>(packingBOMActualsKey(entityCode));
    const newActuals: PackingBOMActual[] = changed.map((r, i) => {
      const { variance_qty, variance_pct } = computeActualVariance(r.standard_qty, r.actual_qty);
      return {
        id: `pba-${Date.now()}-${i}`,
        entity_id: entityCode,
        dln_voucher_id: activeSlip.dln_voucher_id,
        packing_slip_id: activeSlip.id,
        item_id: r.item_id,
        material_id: r.material_id,
        standard_qty: r.standard_qty,
        actual_qty: r.actual_qty,
        variance_qty, variance_pct,
        reason: reason || undefined,
        packer_id: packerName || userId,
        packer_name: packerName || userId,
        captured_at: now,
      };
    });
    allActuals.push(...newActuals);
    // [JWT] POST /api/dispatch/packing-bom-actuals
    localStorage.setItem(packingBOMActualsKey(entityCode), JSON.stringify(allActuals));
    toast.success(`Saved ${newActuals.length} override(s)`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between print:hidden">
        <h1 className="text-xl font-bold">Packing Slip</h1>
        {activeSlip && (
          <Button onClick={printSlip} className="bg-blue-600 hover:bg-blue-700 text-white">
            <Printer className="h-3.5 w-3.5 mr-1.5" />Print
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 print:block">
        <Card className="lg:col-span-1 print:hidden">
          <CardContent className="pt-5 space-y-3">
            <Label className="text-xs">Search DLN</Label>
            <div className="flex gap-2 items-center">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="DLN no or party" />
            </div>
            <div className="space-y-1 max-h-[60vh] overflow-y-auto">
              {filtered.map(d => (
                <button key={d.id}
                  className={`w-full text-left p-2 rounded hover:bg-blue-500/10 ${activeSlip?.dln_voucher_id === d.id ? 'bg-blue-500/15' : ''}`}
                  onClick={() => generate(d)}>
                  <div className="font-mono text-xs">{d.voucher_no}</div>
                  <div className="text-xs text-muted-foreground truncate">{d.party_name ?? '—'} · {d.date}</div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 print:shadow-none print:border-0">
          <CardContent className="pt-5">
            {!activeSlip ? (
              <p className="text-sm text-muted-foreground py-12 text-center">Select a DLN to generate its packing slip.</p>
            ) : (
              <div className="space-y-4">
                <div className="text-center border-b pb-3">
                  <h2 className="text-lg font-bold">PACKING SLIP</h2>
                  <p className="text-xs text-muted-foreground font-mono">{activeSlip.id}</p>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">DLN No</p>
                    <p className="font-mono">{activeSlip.dln_voucher_no}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">DLN Date</p>
                    <p className="font-mono">{activeSlip.dln_date}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Party</p>
                    <p>{activeSlip.party_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Transporter</p>
                    <p>{activeSlip.transporter_name ?? '—'} · {activeSlip.vehicle_no ?? '—'}</p>
                  </div>
                </div>

                <table className="w-full text-sm border-t border-b">
                  <thead>
                    <tr className="text-left text-xs uppercase text-muted-foreground">
                      <th className="py-2">Item</th><th>UOM</th><th className="text-right">Qty</th>
                      <th className="text-right">Cartons</th><th className="text-right">Loose</th>
                      <th className="text-right">Gross kg</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeSlip.lines.map(l => (
                      <tr key={l.id} className="border-t">
                        <td className="py-1.5">{l.item_name}</td>
                        <td className="text-xs">{l.uom}</td>
                        <td className="text-right font-mono">{l.qty}</td>
                        <td className="text-right font-mono">{l.full_cartons}</td>
                        <td className="text-right font-mono">{l.loose_packs}</td>
                        <td className="text-right font-mono">{l.total_gross_kg.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t font-semibold">
                      <td className="py-2" colSpan={3}>Totals</td>
                      <td className="text-right font-mono">{activeSlip.total_full_cartons}</td>
                      <td className="text-right font-mono">{activeSlip.total_loose_packs}</td>
                      <td className="text-right font-mono">{activeSlip.total_gross_kg.toFixed(2)}</td>
                    </tr>
                  </tfoot>
                </table>

                <div className="grid grid-cols-3 gap-4 text-xs pt-8">
                  <div className="border-t pt-1">Packed by</div>
                  <div className="border-t pt-1">Checked by</div>
                  <div className="border-t pt-1">Driver acknowledgment</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {activeSlip && overrideRows.length > 0 && (
        <Card className="print:hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Actual vs Standard — Packing Material Override</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Packer name</Label>
                <Input value={packerName} onChange={e => setPackerName(e.target.value)} placeholder="Who packed this?" />
              </div>
              <div>
                <Label className="text-xs">Reason for variance</Label>
                <Input value={reason} onChange={e => setReason(e.target.value)} placeholder="Optional…" />
              </div>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Material</TableHead>
                  <TableHead>UOM</TableHead>
                  <TableHead className="text-right">Standard</TableHead>
                  <TableHead className="text-right w-[140px]">Actual</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overrideRows.map(r => (
                  <TableRow key={r.key}>
                    <TableCell className="font-mono text-xs">{r.item_code}</TableCell>
                    <TableCell className="text-xs">{r.material_code} · {r.material_name}</TableCell>
                    <TableCell className="text-xs">{r.material_uom}</TableCell>
                    <TableCell className="text-right font-mono">{r.standard_qty.toFixed(3)}</TableCell>
                    <TableCell>
                      <Input type="number" step="0.001" className="h-8 text-right font-mono"
                        value={r.actual_qty}
                        onChange={e => setOverrideRows(rows => rows.map(x =>
                          x.key === r.key ? { ...x, actual_qty: parseFloat(e.target.value || '0') } : x))} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex justify-end">
              <Button onClick={saveOverrides} className="bg-blue-600 hover:bg-blue-700 text-white">
                <Save className="h-3.5 w-3.5 mr-1" /> Save Overrides
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default PackingSlipPrintPanel;
