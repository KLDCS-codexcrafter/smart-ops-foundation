/**
 * MobileTransporterHome.tsx — Transporter mobile worklist (assigned LRs)
 * Sprint M1 · Mobile-ARC Close · CONSUMES lrAcceptancesKey only.
 * External-persona gating mirrors distributor/customer convention: built-now, opened-Wave-2.
 */
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Truck, PackageCheck, Camera, AlertTriangle, IndianRupee, Info } from 'lucide-react';
import type { MobileSession } from '../MobileRouter';
import { type LRAcceptance, lrAcceptancesKey } from '@/types/logistic-portal';

function readSession(): MobileSession | null {
  try { const raw = sessionStorage.getItem('opx_mobile_session'); return raw ? (JSON.parse(raw) as MobileSession) : null; } catch { return null; }
}
function loadList<T>(key: string): T[] { try { const raw = localStorage.getItem(key); return raw ? (JSON.parse(raw) as T[]) : []; } catch { return []; } }

function ageDays(iso?: string | null): number | null {
  if (!iso) return null;
  const d = new Date(iso).getTime(); if (Number.isNaN(d)) return null;
  return Math.max(0, Math.floor((Date.now() - d) / 86_400_000));
}
function ageChipClass(days: number | null): string {
  if (days === null) return 'bg-slate-500/10 text-slate-700 border-slate-500/30';
  if (days <= 1) return 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30';
  if (days <= 3) return 'bg-amber-500/10 text-amber-700 border-amber-500/30';
  return 'bg-red-500/10 text-red-700 border-red-500/30';
}

const TILES = [
  { id: 'lr-queue',  to: '/mobile/transporter/lr-queue',  icon: Truck, label: 'LR Queue' },
  { id: 'manifest',  to: '/mobile/transporter/manifest',  icon: PackageCheck, label: 'Manifest Ack' },
  { id: 'pod',       to: '/mobile/transporter/pod',       icon: Camera, label: 'POD Capture' },
  { id: 'disputes',  to: '/mobile/transporter/disputes',  icon: AlertTriangle, label: 'Disputes' },
  { id: 'payments',  to: '/mobile/transporter/payments',  icon: IndianRupee, label: 'Payments' },
] as const;

export default function MobileTransporterHome(): JSX.Element {
  const navigate = useNavigate();
  const session = useMemo(() => readSession(), []);

  const lrs = useMemo<LRAcceptance[]>(() => {
    if (!session) return [];
    return loadList<LRAcceptance>(lrAcceptancesKey(session.entity_code))
      .sort((a, b) => (b.created_at).localeCompare(a.created_at));
  }, [session]);

  const counts = useMemo(() => ({
    awaiting:  lrs.filter(l => l.status === 'awaiting').length,
    accepted:  lrs.filter(l => l.status === 'accepted').length,
    rejected:  lrs.filter(l => l.status === 'rejected').length,
    invoiced:  lrs.filter(l => l.status === 'invoiced').length,
  }), [lrs]);

  if (!session) return <div className="p-6 text-center text-sm text-muted-foreground">Session required</div>;

  return (
    <div className="p-4 max-w-md mx-auto space-y-4 pb-12">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/operix-go')}><ArrowLeft className="h-4 w-4" /></Button>
        <h1 className="text-base font-semibold">Transporter</h1>
      </div>

      <Card className="p-3 border-amber-500/40 bg-amber-500/5">
        <div className="flex items-start gap-2 text-xs">
          <Info className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-muted-foreground">
            Transporter app is <strong>built now</strong>. External transporter login opens at <strong>Wave-2</strong>.
          </p>
        </div>
      </Card>

      <div className="grid grid-cols-4 gap-2 text-center">
        <Card className="p-2"><div className="text-[10px] text-muted-foreground">Awaiting</div><div className="font-mono font-bold">{counts.awaiting}</div></Card>
        <Card className="p-2"><div className="text-[10px] text-muted-foreground">Accepted</div><div className="font-mono font-bold">{counts.accepted}</div></Card>
        <Card className="p-2"><div className="text-[10px] text-muted-foreground">Rejected</div><div className="font-mono font-bold">{counts.rejected}</div></Card>
        <Card className="p-2"><div className="text-[10px] text-muted-foreground">Invoiced</div><div className="font-mono font-bold">{counts.invoiced}</div></Card>
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

      <div>
        <div className="text-xs font-semibold mb-2 text-muted-foreground">Recent assigned LRs</div>
        {lrs.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">No LRs assigned</Card>
        ) : (
          <div className="space-y-2">
            {lrs.slice(0, 8).map(l => {
              const days = ageDays(l.created_at);
              return (
                <Card key={l.id} className="p-3" data-testid="lr-row">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium font-mono truncate">{l.dln_voucher_no}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">{l.lr_no ?? '—'} · {l.created_at.slice(0, 10)}</p>
                    </div>
                    <div className="text-right shrink-0 space-y-1">
                      <Badge variant="outline" className="text-[9px]">{l.status}</Badge>
                      <Badge variant="outline" className={`text-[9px] block ${ageChipClass(days)}`}>{days === null ? '—' : `${days}d`}</Badge>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
