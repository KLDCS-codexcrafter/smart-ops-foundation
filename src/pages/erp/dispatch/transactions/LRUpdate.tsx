/**
 * LRUpdate.tsx — Post-hoc LR entry. Sprint 15a. Blue-600 primary.
 * Accepts ?dln=<voucher_id> in hash to pre-select.
 */

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import type { Voucher } from '@/types/voucher';
import { vouchersKey } from '@/lib/finecore-engine';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import { logAudit } from '@/lib/card-audit-engine';
import type { DispatchHubModule } from '../DispatchHubSidebar';

interface Props { onModuleChange: (m: DispatchHubModule) => void }

function ls<T>(k: string): T[] {
  try { const r = localStorage.getItem(k); return r ? JSON.parse(r) as T[] : []; }
  catch { return []; }
}
function ageDays(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

function readDlnIdFromHash(): string | null {
  const h = window.location.hash;
  const q = h.split('?')[1];
  if (!q) return null;
  const params = new URLSearchParams(q);
  return params.get('dln');
}

export function LRUpdatePanel(_: Props) {
  const { entityCode, userId } = useCardEntitlement();
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(() => readDlnIdFromHash());
  const [lrNo, setLrNo] = useState('');
  const [lrDate, setLrDate] = useState(new Date().toISOString().slice(0, 10));

  useEffect(() => {
    setVouchers(ls<Voucher>(vouchersKey(entityCode)));
  }, [entityCode]);

  const awaiting = useMemo(
    () => vouchers
      .filter(v => v.base_voucher_type === 'Delivery Note' && v.status === 'posted' && !v.lr_no)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [vouchers],
  );

  const selected = useMemo(
    () => vouchers.find(v => v.id === selectedId) ?? null,
    [vouchers, selectedId],
  );

  const handleSubmit = () => {
    if (!selected) { toast.error('Select a DLN first'); return; }
    if (!lrNo.trim()) { toast.error('LR number required'); return; }
    const all = ls<Voucher>(vouchersKey(entityCode));
    const updated = all.map(v => v.id === selected.id
      ? { ...v, lr_no: lrNo.trim(), lr_date: lrDate, updated_at: new Date().toISOString() }
      : v);
    // Copy-forward to linked SI (any voucher referencing this DLN with blank LR)
    let copied = 0;
    const final = updated.map(v => {
      if (v.base_voucher_type === 'Sales Invoice'
        && v.ref_voucher_id === selected.id && !v.lr_no) {
        copied += 1;
        return { ...v, lr_no: lrNo.trim(), lr_date: lrDate, updated_at: new Date().toISOString() };
      }
      return v;
    });
    // [JWT] PUT /api/accounting/vouchers/:id
    localStorage.setItem(vouchersKey(entityCode), JSON.stringify(final));
    setVouchers(final);
    logAudit({
      entityCode, userId, userName: userId,
      cardId: 'dispatch-hub' as never, moduleId: 'dh-t-lr-update',
      action: 'lr_updated', refId: selected.id,
    });
    toast.success(`LR ${lrNo} saved on ${selected.voucher_no}` + (copied ? ` · copied to ${copied} SI` : ''));
    setSelectedId(null); setLrNo(''); setLrDate(new Date().toISOString().slice(0, 10));
    window.history.replaceState(null, '', '#dh-t-lr-update');
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">LR Update</h1>
        <p className="text-sm text-muted-foreground">Enter Lorry Receipt against posted DLNs after pickup.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1">
          <CardContent className="pt-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Awaiting LR ({awaiting.length})
            </h2>
            {awaiting.length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center">All caught up.</p>
            ) : (
              <ul className="space-y-1 max-h-[60vh] overflow-y-auto">
                {awaiting.map(d => {
                  const a = ageDays(d.date);
                  const ageCls = a > 5 ? 'text-red-600' : a > 2 ? 'text-amber-600' : 'text-muted-foreground';
                  return (
                    <li key={d.id}>
                      <button
                        className={`w-full text-left p-2 rounded hover:bg-blue-500/10 ${selectedId === d.id ? 'bg-blue-500/15' : ''}`}
                        onClick={() => setSelectedId(d.id)}>
                        <div className="flex justify-between items-center">
                          <span className="font-mono text-xs">{d.voucher_no}</span>
                          <span className={`text-[10px] font-mono ${ageCls}`}>{a}d</span>
                        </div>
                        <div className="text-xs text-muted-foreground truncate">{d.party_name ?? '—'}</div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardContent className="pt-5 space-y-4">
            {!selected ? (
              <p className="text-sm text-muted-foreground py-12 text-center">Select a DLN from the left to enter its LR.</p>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">DLN No</p>
                    <p className="font-mono">{selected.voucher_no}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">DLN Date</p>
                    <p className="font-mono">{selected.date}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Party</p>
                    <p>{selected.party_name ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Transporter</p>
                    <p>{selected.transporter ?? '—'} <Badge variant="outline" className="ml-2 text-[9px]">vehicle {selected.vehicle_no ?? '—'}</Badge></p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs">LR Number</Label>
                    <Input value={lrNo} onChange={e => setLrNo(e.target.value)}
                      placeholder="e.g. OM/PUN/2025/0042" />
                  </div>
                  <div>
                    <Label className="text-xs">LR Date</Label>
                    <Input type="date" value={lrDate} onChange={e => setLrDate(e.target.value)} />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleSubmit} className="bg-blue-600 hover:bg-blue-700 text-white">
                    Save LR
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default LRUpdatePanel;
