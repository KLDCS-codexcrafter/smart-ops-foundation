/**
 * MobileVendorHome.tsx — Vendor mobile worklist landing.
 * CONSUMES purchaseOrdersKey (POs) + billPassingKey (invoices).
 * Wave-2 chip mirrors customer/distributor external-persona gating.
 */
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Info, Check, PackageOpen, FileUp, IndianRupee, FileText, Inbox } from 'lucide-react';
import type { MobileSession } from '../MobileRouter';
import { type PurchaseOrderRecord, purchaseOrdersKey } from '@/types/po';
import { type BillPassingRecord, billPassingKey } from '@/types/bill-passing';

function readSession(): MobileSession | null {
  try { const raw = sessionStorage.getItem('opx_mobile_session'); return raw ? (JSON.parse(raw) as MobileSession) : null; } catch { return null; }
}
function loadList<T>(key: string): T[] { try { const raw = localStorage.getItem(key); return raw ? (JSON.parse(raw) as T[]) : []; } catch { return []; } }

const TILES = [
  { id: 'po-ack',    to: '/mobile/vendor/po-ack',   icon: Check,       label: 'PO Acknowledge' },
  { id: 'asn',       to: '/mobile/vendor/asn',      icon: PackageOpen, label: 'Create ASN' },
  { id: 'invoice',   to: '/mobile/vendor/invoice',  icon: FileUp,      label: 'Submit Invoice' },
  { id: 'payments',  to: '/mobile/vendor/payments', icon: IndianRupee, label: 'Payments' },
  { id: 'docs',      to: '/mobile/vendor/docs',     icon: FileText,    label: 'Documents' },
] as const;

export default function MobileVendorHome(): JSX.Element {
  const navigate = useNavigate();
  const session = useMemo(() => readSession(), []);

  const pos = useMemo<PurchaseOrderRecord[]>(() => {
    if (!session) return [];
    return loadList<PurchaseOrderRecord>(purchaseOrdersKey(session.entity_code));
  }, [session]);
  const bills = useMemo<BillPassingRecord[]>(() => {
    if (!session) return [];
    return loadList<BillPassingRecord>(billPassingKey(session.entity_code));
  }, [session]);

  const counts = useMemo(() => ({
    openPo: pos.filter(p => p.status === 'sent_to_vendor' || p.status === 'approved').length,
    partial: pos.filter(p => p.status === 'partially_received').length,
    submitted: bills.length,
  }), [pos, bills]);

  if (!session) return <div className="p-6 text-center text-sm text-muted-foreground">Session required</div>;

  return (
    <div className="p-4 max-w-md mx-auto space-y-4 pb-12">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/operix-go')}><ArrowLeft className="h-4 w-4" /></Button>
        <h1 className="text-base font-semibold">Vendor</h1>
      </div>

      <Card className="p-3 border-amber-500/40 bg-amber-500/5">
        <div className="flex items-start gap-2 text-xs">
          <Info className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-muted-foreground">
            Vendor app is <strong>built now</strong>. External vendor login opens at <strong>Wave-2</strong>.
          </p>
        </div>
      </Card>

      <div className="grid grid-cols-3 gap-2 text-center">
        <Card className="p-2"><div className="text-[10px] text-muted-foreground">Open POs</div><div className="font-mono font-bold">{counts.openPo}</div></Card>
        <Card className="p-2"><div className="text-[10px] text-muted-foreground">Partial</div><div className="font-mono font-bold">{counts.partial}</div></Card>
        <Card className="p-2"><div className="text-[10px] text-muted-foreground">Bills</div><div className="font-mono font-bold">{counts.submitted}</div></Card>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {TILES.map(t => (
          <button key={t.id} onClick={() => navigate(t.to)}
            className="rounded-2xl border bg-card/60 p-4 text-left hover:border-primary/40 transition-all">
            <t.icon className="h-5 w-5 text-primary mb-2" />
            <div className="text-sm font-medium">{t.label}</div>
          </button>
        ))}
      </div>

      <Card className="p-3">
        <div className="flex items-center gap-2 text-xs font-semibold mb-2 text-muted-foreground"><Inbox className="h-3 w-3" />Recent POs</div>
        {pos.length === 0 ? (
          <p className="text-xs text-muted-foreground">No POs</p>
        ) : (
          <div className="space-y-1">
            {pos.slice(0, 5).map(p => (
              <div key={p.id} className="flex justify-between text-xs">
                <span className="font-mono truncate">{p.po_no}</span>
                <Badge variant="outline" className="text-[9px]">{p.status}</Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
