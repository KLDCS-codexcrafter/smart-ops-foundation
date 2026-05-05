/**
 * LRTracker.tsx — All DLN/SI grouped by status. Sprint 15a.
 * Blue-600 accent. 6 tabs + CSV export.
 */

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Download, Search } from 'lucide-react';
import type { Voucher } from '@/types/voucher';
import type { POD } from '@/types/pod';
import { podsKey } from '@/types/pod';
import { vouchersKey } from '@/lib/finecore-engine';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import { toast } from 'sonner';
import type { DispatchHubModule } from '../DispatchHubSidebar';
import PODDetailDialog from '../components/PODDetailDialog';

interface Props { onModuleChange: (m: DispatchHubModule) => void }

type TabKey = 'all' | 'awaiting' | 'lr_issued' | 'in_transit' | 'delivered' | 'exception';

function ls<T>(k: string): T[] {
  try { const r = localStorage.getItem(k); return r ? JSON.parse(r) as T[] : []; }
  catch { return []; }
}

function ageDays(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

export function LRTrackerPanel({ onModuleChange }: Props) {
  const { entityCode } = useCardEntitlement();
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [pods, setPods] = useState<POD[]>([]);
  const [tab, setTab] = useState<TabKey>('all');
  const [search, setSearch] = useState('');
  const [podDialog, setPodDialog] = useState<POD | null>(null);
  const [podOpen, setPodOpen] = useState(false);

  useEffect(() => {
    setVouchers(ls<Voucher>(vouchersKey(entityCode)));
    setPods(ls<POD>(podsKey(entityCode)));
  }, [entityCode]);

  const dlns = useMemo(
    () => vouchers.filter(v => v.base_voucher_type === 'Delivery Note' && v.status !== 'cancelled'),
    [vouchers],
  );
  const podByDln = useMemo(() => {
    const m = new Map<string, POD>();
    pods.forEach(p => m.set(p.dln_voucher_id, p));
    return m;
  }, [pods]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return dlns.filter(d => {
      const pod = podByDln.get(d.id);
      const isException = pod?.status === 'disputed' || pod?.is_exception === true;
      const isDelivered = pod?.status === 'verified';
      const hasLR = !!d.lr_no;
      const inTransit = hasLR && !pod && ageDays(d.lr_date ?? d.date) >= 1;

      let show = true;
      if (tab === 'awaiting') show = !hasLR;
      else if (tab === 'lr_issued') show = hasLR && !pod;
      else if (tab === 'in_transit') show = inTransit;
      else if (tab === 'delivered') show = isDelivered;
      else if (tab === 'exception') show = isException;

      if (!show) return false;
      if (!needle) return true;
      return (
        d.voucher_no.toLowerCase().includes(needle)
        || (d.party_name ?? '').toLowerCase().includes(needle)
        || (d.lr_no ?? '').toLowerCase().includes(needle)
      );
    });
  }, [dlns, podByDln, tab, search]);

  const exportCSV = () => {
    const headers = ['DLN No', 'DLN Date', 'Party', 'Transporter', 'LR No', 'LR Date', 'Age', 'POD Status'];
    const rows = filtered.map(d => {
      const pod = podByDln.get(d.id);
      return [
        d.voucher_no, d.date, d.party_name ?? '', d.transporter ?? '',
        d.lr_no ?? '', d.lr_date ?? '', ageDays(d.date),
        pod?.status ?? 'no_pod',
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
    });
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `lr-tracker-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success('Exported');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">LR Tracker</h1>
        <Button size="sm" variant="outline" onClick={exportCSV}
          className="border-blue-500/30 text-blue-600 hover:bg-blue-500/10">
          <Download className="h-3.5 w-3.5 mr-1.5" />Export CSV
        </Button>
      </div>

      <Card>
        <CardContent className="pt-5 space-y-4">
          <div className="flex gap-2 items-center">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search DLN no, party, LR no…" className="max-w-sm" />
          </div>

          <Tabs value={tab} onValueChange={v => setTab(v as TabKey)}>
            <TabsList className="flex-wrap h-auto">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="awaiting">Awaiting LR</TabsTrigger>
              <TabsTrigger value="lr_issued">LR Issued</TabsTrigger>
              <TabsTrigger value="in_transit">In Transit</TabsTrigger>
              <TabsTrigger value="delivered">Delivered</TabsTrigger>
              <TabsTrigger value="exception">Exception</TabsTrigger>
            </TabsList>
            <TabsContent value={tab} className="mt-4">
              {filtered.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No matching DLNs.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase text-muted-foreground border-b">
                        <th className="py-2">DLN No</th><th>Date</th><th>Party</th>
                        <th>Transporter</th><th>LR No</th><th>LR Date</th>
                        <th>Age</th><th>POD</th><th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map(d => {
                        const pod = podByDln.get(d.id);
                        const age = ageDays(d.date);
                        return (
                          <tr key={d.id} className="border-b hover:bg-blue-500/5">
                            <td className="py-2 font-mono text-xs">{d.voucher_no}</td>
                            <td className="font-mono text-xs">{d.date}</td>
                            <td>{d.party_name ?? '—'}</td>
                            <td className="text-xs">{d.transporter ?? '—'}</td>
                            <td className="font-mono text-xs">{d.lr_no ?? '—'}</td>
                            <td className="font-mono text-xs">{d.lr_date ?? '—'}</td>
                            <td className="font-mono text-xs">{age}d</td>
                            <td>
                              <Badge
                                variant="outline"
                                className={`text-[10px] ${pod ? 'cursor-pointer hover:bg-blue-500/10' : ''}`}
                                onClick={() => { if (pod) { setPodDialog(pod); setPodOpen(true); } }}
                              >
                                {pod?.status ?? 'none'}
                              </Badge>
                            </td>
                            <td className="text-right">
                              {!d.lr_no && (
                                <Button size="sm" variant="ghost" className="text-blue-600 h-7"
                                  onClick={() => {
                                    window.location.hash = `dh-t-lr-update?dln=${d.id}`;
                                    onModuleChange('dh-t-lr-update');
                                  }}>Enter LR</Button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

export default LRTrackerPanel;
