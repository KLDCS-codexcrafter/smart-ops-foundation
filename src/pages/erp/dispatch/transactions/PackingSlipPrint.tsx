/**
 * PackingSlipPrint.tsx — A4 print preview. Sprint 15a.
 */

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Printer, Search } from 'lucide-react';
import type { Voucher } from '@/types/voucher';
import type { ItemPacking } from '@/types/item-packing';
import type { PackingSlip } from '@/types/packing-slip';
import { packingSlipsKey } from '@/types/packing-slip';
import { vouchersKey } from '@/lib/finecore-engine';
import { computePackingSlip } from '@/lib/packing-slip-engine';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import { toast } from 'sonner';

function ls<T>(k: string): T[] {
  try { const r = localStorage.getItem(k); return r ? JSON.parse(r) as T[] : []; }
  catch { return []; }
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
    </div>
  );
}

export default PackingSlipPrintPanel;
