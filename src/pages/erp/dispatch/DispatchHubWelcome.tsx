/**
 * DispatchHubWelcome.tsx — Dashboard with 4 KPI tiles + Awaiting-LR queue.
 * Sprint 15a. Blue-600 accent.
 */
// i18n: Sprint T-Phase-1.2.5h-c2-fix · minimum-viable migration

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Truck, ClipboardEdit, CheckCircle2, AlertTriangle, ArrowRight, Inbox } from 'lucide-react';
import type { Voucher } from '@/types/voucher';
import type { POD } from '@/types/pod';
import { podsKey } from '@/types/pod';
import { vouchersKey } from '@/lib/finecore-engine';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import type { DispatchHubModule } from './DispatchHubSidebar';
import { listInwardReceipts, listQuarantineQueue } from '@/lib/inward-receipt-engine';
import { listPendingVendorReturns } from '@/lib/vendor-return-engine';
import { useT } from '@/lib/i18n-engine';

interface Props { onModuleChange: (m: DispatchHubModule) => void }

function ls<T>(k: string): T[] {
  try { const r = localStorage.getItem(k); return r ? JSON.parse(r) as T[] : []; }
  catch { return []; }
}

function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
}

export function DispatchHubWelcomePanel({ onModuleChange }: Props) {
  const t = useT();
  const { entityCode } = useCardEntitlement();
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [pods, setPods] = useState<POD[]>([]);
  const [inwardCount, setInwardCount] = useState(0);
  const [quarantineCount, setQuarantineCount] = useState(0);
  const [vendorReturnCount, setVendorReturnCount] = useState(0);

  useEffect(() => {
    // [JWT] GET /api/accounting/vouchers
    setVouchers(ls<Voucher>(vouchersKey(entityCode)));
    // [JWT] GET /api/dispatch/pods
    setPods(ls<POD>(podsKey(entityCode)));
    // [JWT] GET /api/logistic/inward-receipts
    setInwardCount(listInwardReceipts(entityCode).length);
    setQuarantineCount(listQuarantineQueue(entityCode).length);
    // [JWT] GET /api/logistic/vendor-returns?status=pending
    setVendorReturnCount(listPendingVendorReturns(entityCode).length);
  }, [entityCode]);

  const dlns = useMemo(
    () => vouchers.filter(v => v.base_voucher_type === 'Delivery Note' && v.status === 'posted'),
    [vouchers],
  );

  const podByDln = useMemo(() => {
    const m = new Map<string, POD>();
    pods.forEach(p => m.set(p.dln_voucher_id, p));
    return m;
  }, [pods]);

  const kpis = useMemo(() => {
    const awaitingLR = dlns.filter(d => !d.lr_no).length;
    const inTransit = dlns.filter(d => d.lr_no && podByDln.get(d.id)?.status !== 'verified').length;
    const delivered = dlns.filter(d => podByDln.get(d.id)?.status === 'verified').length;
    const exceptions = pods.filter(p => p.status === 'disputed' || p.is_exception).length;
    return { awaitingLR, inTransit, delivered, exceptions };
  }, [dlns, podByDln, pods]);

  const awaitingQueue = useMemo(
    () => dlns.filter(d => !d.lr_no)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 10),
    [dlns],
  );

  const recentDeliveries = useMemo(
    () => pods.filter(p => p.status === 'verified')
      .sort((a, b) => new Date(b.captured_at).getTime() - new Date(a.captured_at).getTime())
      .slice(0, 10),
    [pods],
  );

  const KPI = [
    { label: 'Awaiting LR', value: kpis.awaitingLR, icon: ClipboardEdit, accent: 'text-amber-600 bg-amber-500/10' },
    { label: 'In Transit',  value: kpis.inTransit,  icon: Truck,         accent: 'text-blue-600 bg-blue-500/10' },
    { label: 'Delivered',   value: kpis.delivered,  icon: CheckCircle2,  accent: 'text-emerald-600 bg-emerald-500/10' },
    { label: 'Exceptions',  value: kpis.exceptions, icon: AlertTriangle, accent: 'text-red-600 bg-red-500/10' },
    { label: 'Inward Receipts', value: inwardCount, icon: Inbox, accent: 'text-primary bg-primary/10' },
    { label: 'In Quarantine', value: quarantineCount, icon: AlertTriangle, accent: 'text-warning bg-warning/10' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('dispatch.welcome.title', 'Dispatch Hub')}</h1>
        <p className="text-sm text-muted-foreground">LR · Packing Slip · POD · Exceptions</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {KPI.map(k => (
          <Card key={k.label}>
            <CardContent className="pt-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">{k.label}</p>
                  <p className="text-2xl font-bold mt-1 font-mono">{k.value}</p>
                </div>
                <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${k.accent}`}>
                  <k.icon className="h-4 w-4" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="pt-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Awaiting LR Queue</h2>
            <Button size="sm" variant="outline" className="border-blue-500/30 text-blue-600 hover:bg-blue-500/10"
              onClick={() => onModuleChange('dh-t-lr-update')}>
              Open LR Update <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
          {awaitingQueue.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No DLNs awaiting LR entry.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground uppercase border-b">
                    <th className="py-2">DLN No</th><th>Date</th><th>Party</th>
                    <th>Transporter</th><th>Age</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {awaitingQueue.map(d => {
                    const age = daysSince(d.date);
                    const ageClass = age > 5 ? 'text-red-600 font-semibold'
                      : age > 2 ? 'text-amber-600 font-semibold' : 'text-muted-foreground';
                    return (
                      <tr key={d.id} className="border-b hover:bg-blue-500/5">
                        <td className="py-2 font-mono text-xs">{d.voucher_no}</td>
                        <td className="font-mono text-xs">{d.date}</td>
                        <td>{d.party_name ?? '—'}</td>
                        <td className="text-xs">{d.transporter ?? '—'}</td>
                        <td className={`text-xs font-mono ${ageClass}`}>{age}d</td>
                        <td className="text-right">
                          <Button size="sm" variant="ghost" className="text-blue-600 h-7"
                            onClick={() => {
                              window.location.hash = `dh-t-lr-update?dln=${d.id}`;
                              onModuleChange('dh-t-lr-update');
                            }}>
                            Enter LR
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Recent Deliveries</h2>
          {recentDeliveries.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No verified PODs yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground uppercase border-b">
                    <th className="py-2">POD</th><th>DLN</th><th>Captured</th>
                    <th>Distance var.</th><th>Accuracy</th>
                  </tr>
                </thead>
                <tbody>
                  {recentDeliveries.map(p => (
                    <tr key={p.id} className="border-b">
                      <td className="py-2 font-mono text-xs">{p.id.slice(-8)}</td>
                      <td className="font-mono text-xs">{p.dln_voucher_no}</td>
                      <td className="text-xs">{new Date(p.captured_at).toLocaleString('en-IN')}</td>
                      <td className="font-mono text-xs">
                        {p.distance_from_ship_to_m != null ? `${Math.round(p.distance_from_ship_to_m)}m` : '—'}
                      </td>
                      <td className="font-mono text-xs">
                        {p.gps_accuracy_m != null ? `${Math.round(p.gps_accuracy_m)}m` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="mt-3">
            <Badge variant="outline" className="text-[10px]">Bell drawer auto-wired</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default DispatchHubWelcomePanel;
