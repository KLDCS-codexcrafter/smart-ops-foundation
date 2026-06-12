/**
 * MobileASNCreatePage.tsx — Vendor minimal ASN capture against open PO.
 * No ASN store exists in the codebase. Honest disposition: append a PoFollowup
 * with channel='whatsapp', outcome='partial' and structured notes — desktop
 * Procure360 already surfaces followups. ZERO new engines, ZERO new SIBLINGs.
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, PackageOpen } from 'lucide-react';
import { toast } from 'sonner';
import type { MobileSession } from '../MobileRouter';
import { type PurchaseOrderRecord, type PoFollowup, purchaseOrdersKey } from '@/types/po';

function readSession(): MobileSession | null {
  try { const raw = sessionStorage.getItem('opx_mobile_session'); return raw ? (JSON.parse(raw) as MobileSession) : null; } catch { return null; }
}
function loadList<T>(key: string): T[] { try { const raw = localStorage.getItem(key); return raw ? (JSON.parse(raw) as T[]) : []; } catch { return []; } }

export default function MobileASNCreatePage(): JSX.Element {
  const navigate = useNavigate();
  const session = useMemo(() => readSession(), []);
  const [poId, setPoId] = useState<string | null>(null);
  const [dispatchDate, setDispatchDate] = useState('');
  const [lrNo, setLrNo] = useState('');
  const [vehicleNo, setVehicleNo] = useState('');
  const [packages, setPackages] = useState('');
  const [version, setVersion] = useState(0);

  const pos = useMemo<PurchaseOrderRecord[]>(() => {
    if (!session) return [];
    return loadList<PurchaseOrderRecord>(purchaseOrdersKey(session.entity_code))
      .filter(p => p.status === 'sent_to_vendor' || p.status === 'approved' || p.status === 'partially_received');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, version]);

  function submit(): void {
    if (!session || !poId) { toast.error('Pick a PO'); return; }
    if (!dispatchDate || !lrNo.trim()) { toast.error('Dispatch date + LR no required'); return; }
    const key = purchaseOrdersKey(session.entity_code);
    const list = loadList<PurchaseOrderRecord>(key);
    const idx = list.findIndex(p => p.id === poId);
    if (idx < 0) return;
    const fu: PoFollowup = {
      id: `fu_${Date.now()}`,
      po_id: poId,
      channel: 'whatsapp',
      outcome: 'partial',
      notes: `ASN: LR ${lrNo.trim()} · dispatch ${dispatchDate} · vehicle ${vehicleNo || '—'} · ${packages || '—'} pkg`,
      next_action_due: dispatchDate,
      created_by_user_id: session.user_id || 'vendor-mobile',
      created_at: new Date().toISOString(),
    };
    list[idx] = { ...list[idx], followups: [...list[idx].followups, fu], updated_at: new Date().toISOString() };
    localStorage.setItem(key, JSON.stringify(list));
    toast.success(`ASN submitted for PO ${list[idx].po_no}`);
    setPoId(null); setDispatchDate(''); setLrNo(''); setVehicleNo(''); setPackages('');
    setVersion(v => v + 1);
  }

  if (!session) return <div className="p-6 text-center text-sm text-muted-foreground">Session required</div>;

  return (
    <div className="p-4 max-w-md mx-auto space-y-3 pb-12">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4" /></Button>
        <h1 className="text-base font-semibold">Create ASN</h1>
      </div>
      <Card className="p-3 space-y-3">
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Pick PO</label>
          <select className="w-full border rounded-lg p-2 bg-background text-sm"
            value={poId ?? ''} onChange={e => setPoId(e.target.value || null)}>
            <option value="">—</option>
            {pos.map(p => <option key={p.id} value={p.id}>{p.po_no} · {p.vendor_name}</option>)}
          </select>
        </div>
        <Input type="date" value={dispatchDate} onChange={e => setDispatchDate(e.target.value)} placeholder="Dispatch date" />
        <Input placeholder="LR / docket no" value={lrNo} onChange={e => setLrNo(e.target.value)} />
        <Input placeholder="Vehicle no (optional)" value={vehicleNo} onChange={e => setVehicleNo(e.target.value)} />
        <Input type="number" inputMode="numeric" placeholder="Packages (optional)" value={packages} onChange={e => setPackages(e.target.value)} />
        <Button className="w-full" onClick={submit}><PackageOpen className="h-4 w-4 mr-1" />Submit ASN</Button>
        {pos.length > 0 && <Badge variant="outline" className="text-[10px]">{pos.length} POs available</Badge>}
      </Card>
    </div>
  );
}
