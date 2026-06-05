/**
 * @file   src/pages/erp/ecomx/orders/EcomXOrdersPage.tsx
 * @sprint Sprint 153 · EcomX · dual-layer order register + Parked B2B resolution
 */
import { useCallback, useMemo, useRef, useState } from 'react';
import { Paperclip, Receipt } from 'lucide-react';
import { toast } from 'sonner';
import { useEntityCode } from '@/hooks/useEntityCode';
import { listEcOrders, resolveUnmatchedOrder, recordPackingEvidence, listPackingEvidence } from '@/lib/ecomx-engine';
import { loadPartyMaster } from '@/lib/party-master-engine';
import type { EcOrderLayer } from '@/types/ecomx';
import { Button } from '@/components/ui/button';

type Tab = 'all' | 'b2c' | 'b2b_matched' | 'parked';

const LAYER_LABEL: Record<EcOrderLayer, string> = {
  b2c_consolidated: 'B2C',
  b2b_matched:      'B2B matched',
  b2b_unmatched:    'B2B parked',
};

export function EcomXOrdersPage(): JSX.Element {
  const { entityCode } = useEntityCode();
  const [tab, setTab] = useState<Tab>('all');
  const [tick, setTick] = useState(0);

  const rows = useMemo(() => {
    if (!entityCode) return [];
    if (tab === 'all') return listEcOrders(entityCode);
    if (tab === 'b2c') return listEcOrders(entityCode, { layer: 'b2c_consolidated' });
    if (tab === 'b2b_matched') return listEcOrders(entityCode, { layer: 'b2b_matched' });
    return listEcOrders(entityCode, { status: 'parked_unmatched' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityCode, tab, tick]);

  const parties = useMemo(() => entityCode ? loadPartyMaster(entityCode) : [], [entityCode]);

  const evidenceByOrder = useMemo(() => {
    if (!entityCode) return new Map<string, number>();
    const m = new Map<string, number>();
    listPackingEvidence(entityCode).forEach((e) => m.set(e.ecOrderId, (m.get(e.ecOrderId) ?? 0) + 1));
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityCode, tick]);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const pendingOrderId = useRef<string | null>(null);

  const onAttachClick = useCallback((ecOrderId: string) => {
    pendingOrderId.current = ecOrderId;
    fileInputRef.current?.click();
  }, []);

  const onFileSelected = useCallback((ev: React.ChangeEvent<HTMLInputElement>) => {
    const file = ev.target.files?.[0];
    const ecOrderId = pendingOrderId.current;
    ev.target.value = '';
    if (!file || !ecOrderId || !entityCode) return;
    try {
      // Binary is NEVER persisted — metadata only.  [JWT] P2BB · upload to CDN, replace file_url.
      recordPackingEvidence(entityCode, {
        ecOrderId,
        fileName: file.name,
        sizeBytes: file.size,
        durationSec: null,
        capturedVia: 'file_upload',
        note: '',
        uploadedBy: 'self',
        originatingDepartmentId: 'ecomx',
      });
      toast.success('Packing evidence recorded (metadata only).');
      setTick((t) => t + 1);
    } catch (e) { toast.error((e as Error).message); }
  }, [entityCode]);

  const onResolve = useCallback((ecOrderId: string, partyId: string) => {
    if (!entityCode || !partyId) return;
    try {
      resolveUnmatchedOrder(entityCode, ecOrderId, partyId);
      toast.success('Parked order resolved → booked.');
      setTick((t) => t + 1);
    } catch (e) { toast.error((e as Error).message); }
  }, [entityCode]);

  if (!entityCode) return <div className="p-6 text-sm text-muted-foreground">Select an entity.</div>;

  return (
    <div className="p-4 sm:p-6 md:p-10 animate-fade-in space-y-6">
      <header>
        <h1 className="text-xl md:text-2xl font-semibold flex items-center gap-2"><Receipt className="h-5 w-5" /> Orders</h1>
        <p className="text-sm text-muted-foreground mt-1">DP-EC-5 · dual-layer ingestion · parked rows carry NO voucher until resolved.</p>
      </header>

      <div className="flex flex-wrap gap-2">
        {(['all', 'b2c', 'b2b_matched', 'parked'] as const).map((t) => (
          <Button key={t} size="sm" variant={tab === t ? 'default' : 'outline'} onClick={() => setTab(t)}>
            {t === 'all' ? 'All' : t === 'b2c' ? 'B2C' : t === 'b2b_matched' ? 'B2B matched' : 'Parked B2B'}
          </Button>
        ))}
      </div>

      <section className="glass-card rounded-2xl p-4">
        {rows.length === 0 ? (
          <div className="text-xs text-muted-foreground p-6 text-center">No orders in this view.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground border-b">
                <tr>
                  <th className="text-left py-2">MP Order #</th>
                  <th className="text-left">Date</th>
                  <th className="text-left">Layer</th>
                  <th className="text-left">SO #</th>
                  <th className="text-left">Buyer</th>
                  <th className="text-left">State</th>
                  <th className="text-right">Gross ₹</th>
                  <th className="text-left">Status</th>
                  {tab === 'parked' && <th className="text-left">Resolve → party</th>}
                </tr>
              </thead>
              <tbody>
                {rows.map((o) => (
                  <tr key={o.id} className="border-b border-border/40">
                    <td className="py-2 font-mono text-xs">{o.marketplaceOrderId}</td>
                    <td className="text-xs">{o.orderDate}</td>
                    <td>{LAYER_LABEL[o.layer]}</td>
                    <td className="font-mono text-xs">{o.soDocNo ?? '—'}</td>
                    <td>{o.endCustomerName || '—'}</td>
                    <td>{o.endCustomerState || '—'}</td>
                    <td className="text-right font-mono">{o.grossAmount.toFixed(2)}</td>
                    <td>{o.status}</td>
                    {tab === 'parked' && (
                      <td>
                        <select
                          className="px-2 py-1 rounded-md bg-background border border-border text-xs"
                          defaultValue=""
                          onChange={(e) => onResolve(o.id, e.target.value)}
                        >
                          <option value="">Pick party…</option>
                          {parties.map((p) => <option key={p.id} value={p.id}>{p.party_name}</option>)}
                        </select>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
