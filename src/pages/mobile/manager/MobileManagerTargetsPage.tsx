/**
 * MobileManagerTargetsPage.tsx — All targets with achievement + edit (manager)
 * Sprint T-Phase-1.1.1l-c · uses real SalesTarget + targetsKey
 * Sprint T-Phase-1.1.1q · Fix 5 — manager target editing via bottom sheet
 */
import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import { ArrowLeft, Target, Pencil, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { MobileSession } from '../MobileRouter';
import { type SalesTarget, targetsKey } from '@/pages/erp/salesx/masters/TargetMaster.types';
import { type Quotation, quotationsKey } from '@/types/quotation';
import { cn } from '@/lib/utils';

function readSession(): MobileSession | null {
  try {
    const raw = sessionStorage.getItem('opx_mobile_session');
    return raw ? (JSON.parse(raw) as MobileSession) : null;
  } catch { return null; }
}
function loadList<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch { return []; }
}

const ACHIEVED_STAGES = new Set(['confirmed', 'proforma', 'sales_order']);
const fmtINR = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

function paceTone(pct: number): string {
  if (pct >= 80) return 'bg-green-500/15 text-green-700 border-green-500/40';
  if (pct >= 50) return 'bg-amber-500/15 text-amber-700 border-amber-500/40';
  return 'bg-red-500/15 text-red-700 border-red-500/40';
}

interface Row {
  t: SalesTarget;
  achieved: number;
  pct: number;
}

function buildRows(session: MobileSession): Row[] {
  const targets = loadList<SalesTarget>(targetsKey(session.entity_code)).filter(t => t.is_active);
  const quotations = loadList<Quotation>(quotationsKey(session.entity_code));
  const achievedTotal = quotations
    .filter(q => ACHIEVED_STAGES.has(q.quotation_stage))
    .reduce((s, q) => s + (q.total_amount ?? 0), 0);
  return targets.map(t => {
    const pct = t.target_value > 0 ? (achievedTotal / t.target_value) * 100 : 0;
    return { t, achieved: achievedTotal, pct };
  }).sort((a, b) => b.pct - a.pct);
}

export default function MobileManagerTargetsPage() {
  const navigate = useNavigate();
  const session = useMemo(() => readSession(), []);
  const [rows, setRows] = useState<Row[]>(() => session ? buildRows(session) : []);

  const [editingTarget, setEditingTarget] = useState<SalesTarget | null>(null);
  const [editValue, setEditValue] = useState('');
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(() => {
    if (session) setRows(buildRows(session));
  }, [session]);

  const handleEdit = useCallback((t: SalesTarget) => {
    setEditingTarget(t);
    setEditValue(String(t.target_value));
  }, []);

  const handleSave = useCallback(() => {
    if (!editingTarget || !session) return;
    const newValue = Number(editValue);
    if (!newValue || newValue <= 0) {
      toast.error('Enter a valid target value');
      return;
    }
    setBusy(true);
    const all = loadList<SalesTarget>(targetsKey(session.entity_code));
    const idx = all.findIndex(t => t.id === editingTarget.id);
    if (idx >= 0) {
      all[idx] = {
        ...all[idx],
        target_value: newValue,
        updated_at: new Date().toISOString(),
      };
      // [JWT] PATCH /api/salesx/targets/:id
      localStorage.setItem(targetsKey(session.entity_code), JSON.stringify(all));
      toast.success(`Target updated to ${fmtINR(newValue)}`);
    }
    setBusy(false);
    setEditingTarget(null);
    setEditValue('');
    refresh();
  }, [editingTarget, editValue, session, refresh]);

  if (!session) return null;

  return (
    <div className="p-4 max-w-md mx-auto space-y-3 pb-12">
      <div className="flex items-center gap-2 mb-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/mobile/manager')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-base font-semibold">Team Targets</h1>
      </div>

      {rows.length === 0 && (
        <Card className="p-6 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
          <Target className="h-8 w-8" />
          No active targets configured.
        </Card>
      )}

      <div className="space-y-2">
        {rows.map(r => (
          <Card key={r.t.id} className="p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{r.t.person_name ?? 'Company-wide'}</p>
                <p className="text-[10px] text-muted-foreground">{r.t.period_label} · {r.t.dimension}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Badge variant="outline" className={cn('text-[10px]', paceTone(r.pct))}>
                  {r.pct.toFixed(0)}%
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => handleEdit(r.t)}
                  aria-label="Edit target"
                >
                  <Pencil className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <div className="text-[11px] font-mono">
              <span className="text-green-700 font-semibold">{fmtINR(r.achieved)}</span>
              <span className="text-muted-foreground"> / {fmtINR(r.t.target_value)}</span>
            </div>
            <div className="h-1.5 bg-muted rounded overflow-hidden">
              <div className="h-full bg-blue-500" style={{ width: `${Math.min(100, r.pct)}%` }} />
            </div>
          </Card>
        ))}
      </div>

      <Sheet open={editingTarget !== null} onOpenChange={open => !open && setEditingTarget(null)}>
        <SheetContent side="bottom" className="max-w-md mx-auto">
          <SheetHeader>
            <SheetTitle className="text-base">Edit Target</SheetTitle>
          </SheetHeader>
          {editingTarget && (
            <div className="space-y-3 mt-3">
              <div>
                <p className="text-xs font-medium">{editingTarget.person_name ?? 'Company-wide'}</p>
                <p className="text-[11px] text-muted-foreground capitalize">
                  {editingTarget.dimension.replace('_', ' ')} · {editingTarget.period_label}
                </p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Target Value (₹)</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setEditingTarget(null)}>
                  Cancel
                </Button>
                <Button className="flex-1" disabled={busy} onClick={handleSave}>
                  {busy
                    ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    : <Save className="h-4 w-4 mr-2" />}
                  Save
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
