/**
 * MobileJobCardPage.tsx — Mobile Job Card capture (D-585 · Q17=a extension)
 * Sprint T-Phase-1.3-3-PlantOps-pre-2 · Block J
 *
 * Operator clock-in/clock-out + qty capture from shop floor.
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Square, Pause } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useJobCards } from '@/hooks/useJobCards';
import { startJobCard, completeJobCard, holdJobCard } from '@/lib/job-card-engine';
import type { JobCard } from '@/types/job-card';

interface SessionLite { user_id: string | null; display_name: string }
function readSession(): SessionLite | null {
  try {
    // [JWT] GET /api/mobile/auth/session
    const raw = sessionStorage.getItem('opx_mobile_session');
    return raw ? JSON.parse(raw) as SessionLite : null;
  } catch { return null; }
}

export default function MobileJobCardPage(): JSX.Element {
  const navigate = useNavigate();
  const session = readSession();
  const { jobCards, reload } = useJobCards();

  const myActive = useMemo(
    () => jobCards.filter(jc => jc.status === 'planned' || jc.status === 'in_progress' || jc.status === 'on_hold'),
    [jobCards],
  );

  const [selectedId, setSelectedId] = useState<string>('');
  const [producedQty, setProducedQty] = useState('');
  const [rejectedQty, setRejectedQty] = useState('0');
  const [busy, setBusy] = useState(false);
  const selected: JobCard | undefined = jobCards.find(jc => jc.id === selectedId);

  const user = { id: session?.user_id ?? 'mobile', name: session?.display_name ?? 'Mobile User' };

  const handleStart = async (): Promise<void> => {
    if (!selected) return;
    setBusy(true);
    try {
      // [JWT] PATCH /api/plant-ops/job-cards/:id/start
      startJobCard(selected, user);
      toast.success(`Started ${selected.doc_no}`);
      reload();
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  };

  const handleComplete = async (): Promise<void> => {
    if (!selected) return;
    const qty = Number(producedQty);
    const rej = Number(rejectedQty || '0');
    if (qty <= 0) { toast.error('Enter produced qty'); return; }
    setBusy(true);
    try {
      // [JWT] PATCH /api/plant-ops/job-cards/:id/complete
      completeJobCard(selected, {
        produced_qty: qty,
        rejected_qty: rej,
        rework_qty: 0,
        wastage_qty: 0,
        wastage_reason: null,
        wastage_notes: '',
        remarks: 'Mobile capture',
        employee_hourly_rate: 150,
        machine_hourly_rate: 200,
      }, user);
      toast.success(`Completed ${selected.doc_no}`);
      setProducedQty(''); setRejectedQty('0'); setSelectedId('');
      reload();
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  };

  const handleHold = async (): Promise<void> => {
    if (!selected) return;
    setBusy(true);
    try {
      holdJobCard(selected, user, 'Mobile breakdown report');
      toast.success(`Held ${selected.doc_no}`);
      reload();
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen bg-background p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate('/operix-go')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold">Job Card</h1>
      </div>

      <Card className="p-4 space-y-3">
        <Label>Select Job Card</Label>
        <Select value={selectedId} onValueChange={setSelectedId}>
          <SelectTrigger><SelectValue placeholder="Choose active JC" /></SelectTrigger>
          <SelectContent>
            {myActive.map(jc => (
              <SelectItem key={jc.id} value={jc.id}>
                {jc.doc_no} · {jc.production_order_no} · {jc.status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selected && (
          <div className="text-xs text-muted-foreground space-y-1 font-mono">
            <div>Machine: {selected.employee_code}</div>
            <div>Planned: {selected.planned_qty} {selected.uom}</div>
            <div>Status: {selected.status}</div>
          </div>
        )}
      </Card>

      {selected?.status === 'planned' && (
        <Button className="w-full" onClick={handleStart} disabled={busy}>
          <Play className="h-4 w-4 mr-2" /> Clock In
        </Button>
      )}

      {selected?.status === 'in_progress' && (
        <Card className="p-4 space-y-3">
          <div>
            <Label>Produced Qty</Label>
            <Input type="number" inputMode="decimal" value={producedQty} onChange={e => setProducedQty(e.target.value)} />
          </div>
          <div>
            <Label>Rejected Qty</Label>
            <Input type="number" inputMode="decimal" value={rejectedQty} onChange={e => setRejectedQty(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={handleHold} disabled={busy}>
              <Pause className="h-4 w-4 mr-2" /> Hold
            </Button>
            <Button className="flex-1" onClick={handleComplete} disabled={busy}>
              <Square className="h-4 w-4 mr-2" /> Complete
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
