/**
 * MobileManifestAckPage.tsx — Transporter manifest acknowledgement.
 * CONSUMES wms-manifest-engine.acknowledgeManifest (the SAME desktop write seam).
 * Writes the SAME ManifestAck.acknowledged_by + ack_at + discrepancy_note fields.
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Check, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import type { MobileSession } from '../MobileRouter';
import { type Manifest, manifestsKey } from '@/types/wms-manifest';
import { acknowledgeManifest } from '@/lib/wms-manifest-engine';

function readSession(): MobileSession | null {
  try { const raw = sessionStorage.getItem('opx_mobile_session'); return raw ? (JSON.parse(raw) as MobileSession) : null; } catch { return null; }
}
function loadList<T>(key: string): T[] { try { const raw = localStorage.getItem(key); return raw ? (JSON.parse(raw) as T[]) : []; } catch { return []; } }

export default function MobileManifestAckPage(): JSX.Element {
  const navigate = useNavigate();
  const session = useMemo(() => readSession(), []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [acknowledger, setAcknowledger] = useState('');
  const [packagesCounted, setPackagesCounted] = useState('');
  const [discrepancyNote, setDiscrepancyNote] = useState('');
  const [version, setVersion] = useState(0);

  const manifests = useMemo<Manifest[]>(() => {
    if (!session) return [];
    return loadList<Manifest>(manifestsKey(session.entity_code))
      .filter(m => m.status === 'finalized' || m.status === 'discrepancy')
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, version]);

  const selected = manifests.find(m => m.id === selectedId) ?? null;

  if (!session) return <div className="p-6 text-center text-sm text-muted-foreground">Session required</div>;

  function submit(): void {
    if (!session || !selected) return;
    if (!acknowledger.trim()) { toast.error('Enter your name'); return; }
    try {
      acknowledgeManifest(session.entity_code, selected.id, {
        acknowledged_by: acknowledger.trim(),
        packages_counted: packagesCounted ? Number(packagesCounted) : undefined,
        discrepancy_note: discrepancyNote.trim() || undefined,
      });
      toast.success(`Manifest ${selected.manifest_no} acknowledged`);
      setSelectedId(null); setAcknowledger(''); setPackagesCounted(''); setDiscrepancyNote('');
      setVersion(v => v + 1);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  if (selected) {
    return (
      <div className="p-4 max-w-md mx-auto space-y-3 pb-12">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setSelectedId(null)}><ArrowLeft className="h-4 w-4" /></Button>
          <h1 className="text-base font-semibold">Acknowledge Manifest</h1>
        </div>
        <Card className="p-3 space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Manifest</span><span className="font-mono">{selected.manifest_no}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Packages</span><span className="font-mono">{selected.total_packages}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Declared (kg)</span><span className="font-mono">{selected.total_declared_weight_kg}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Status</span><Badge variant="outline">{selected.status}</Badge></div>
        </Card>
        <div className="space-y-2">
          <Input placeholder="Acknowledged by (your name)" value={acknowledger} onChange={e => setAcknowledger(e.target.value)} />
          <Input type="number" inputMode="numeric" placeholder="Packages counted" value={packagesCounted} onChange={e => setPackagesCounted(e.target.value)} />
          <Textarea placeholder="Discrepancy note (optional)" value={discrepancyNote} onChange={e => setDiscrepancyNote(e.target.value)} />
        </div>
        <Button className="w-full" onClick={submit}>
          {discrepancyNote ? <><AlertTriangle className="h-4 w-4 mr-1" />Record Discrepancy</> : <><Check className="h-4 w-4 mr-1" />Acknowledge</>}
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-md mx-auto space-y-3 pb-12">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4" /></Button>
        <h1 className="text-base font-semibold">Manifest Ack</h1>
        <Badge variant="outline" className="ml-auto text-[10px]">{manifests.length}</Badge>
      </div>
      {manifests.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">No manifests awaiting acknowledgement</Card>
      ) : (
        <div className="space-y-2">
          {manifests.map(m => (
            <Card key={m.id} className="p-3 cursor-pointer hover:border-primary/40" onClick={() => setSelectedId(m.id)}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-mono">{m.manifest_no}</p>
                  <p className="text-[10px] text-muted-foreground">{m.transporter_name} · {m.total_packages} pkg · {m.total_declared_weight_kg}kg</p>
                </div>
                <Badge variant="outline" className="text-[9px]">{m.status}</Badge>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
