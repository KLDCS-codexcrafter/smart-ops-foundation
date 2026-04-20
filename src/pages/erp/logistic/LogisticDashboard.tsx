/**
 * LogisticDashboard.tsx — Transporter portal dashboard.
 * Sprint 15c-2. Gold accent. KPIs + activity timeline + rate-card health.
 * [JWT] GET /api/logistic/dashboard
 */
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogisticLayout } from '@/features/logistic/LogisticLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Truck, FileText, IndianRupee, AlertCircle, Activity } from 'lucide-react';
import { getLogisticSession } from '@/lib/logistic-auth-engine';
import {
  lrAcceptancesKey, logisticActivityKey,
  type LRAcceptance, type LogisticActivity,
} from '@/types/logistic-portal';
import {
  transporterInvoicesKey, type TransporterInvoice,
} from '@/types/transporter-invoice';
import { disputesKey, type Dispute } from '@/types/freight-reconciliation';
import { transporterRateCardsKey, type TransporterRateCard } from '@/types/transporter-rate';

const fmt = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

function ageDays(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
}

export default function LogisticDashboard() {
  const session = getLogisticSession();
  const navigate = useNavigate();

  const data = useMemo(() => {
    if (!session) return null;
    const ent = session.entity_code;
    const lid = session.logistic_id;
    let lrs: LRAcceptance[] = [];
    let invs: TransporterInvoice[] = [];
    let dsp: Dispute[] = [];
    let acts: LogisticActivity[] = [];
    let cards: TransporterRateCard[] = [];
    try {
      lrs = JSON.parse(localStorage.getItem(lrAcceptancesKey(ent)) ?? '[]')
        .filter((l: LRAcceptance) => l.logistic_id === lid);
      invs = JSON.parse(localStorage.getItem(transporterInvoicesKey(ent)) ?? '[]')
        .filter((i: TransporterInvoice) => i.logistic_id === lid);
      dsp = JSON.parse(localStorage.getItem(disputesKey(ent)) ?? '[]')
        .filter((d: Dispute) => d.logistic_id === lid);
      acts = JSON.parse(localStorage.getItem(logisticActivityKey(ent)) ?? '[]')
        .filter((a: LogisticActivity) => a.logistic_id === lid);
      cards = JSON.parse(localStorage.getItem(transporterRateCardsKey(ent)) ?? '[]')
        .filter((c: TransporterRateCard) => c.logistic_id === lid);
    } catch { /* ignore */ }

    const awaiting = lrs.filter(l => l.status === 'awaiting');
    const oldestAwaiting = awaiting.reduce(
      (max, l) => Math.max(max, ageDays(l.created_at)), 0);
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
    const invMonth = invs.filter(i => new Date(i.invoice_date) >= monthStart);
    const invMonthTotal = invMonth.reduce((s, i) => s + i.grand_total, 0);
    const ytdPaid = invs.filter(i => i.status === 'paid').reduce((s, i) => s + i.grand_total, 0);
    const openDsp = dsp.filter(d =>
      !['resolved_in_favor_of_us', 'resolved_in_favor_of_transporter', 'resolved_split', 'withdrawn'].includes(d.status),
    );
    const dspAmt = openDsp.reduce((s, d) => s + d.amount_in_dispute, 0);

    const today = new Date();
    const activeCard = cards.find(c =>
      new Date(c.effective_from).getTime() <= today.getTime() &&
      (c.effective_to === null || new Date(c.effective_to).getTime() >= today.getTime()),
    );

    return {
      awaiting, oldestAwaiting,
      invMonthCount: invMonth.length, invMonthTotal,
      ytdPaid,
      openDspCount: openDsp.length, dspAmt,
      recentActs: acts.slice(-20).reverse(),
      recentLRs: lrs.slice(-5).reverse(),
      hasActiveCard: !!activeCard,
    };
  }, [session]);

  if (!session || !data) return <LogisticLayout title="Dashboard"><div /></LogisticLayout>;

  const greet = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  return (
    <LogisticLayout title="Dashboard" subtitle={session.party_name}>
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold">{greet}, {session.party_name}</h2>
          <p className="text-xs text-muted-foreground mt-1">
            {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} ·
            {' '}Entity {session.entity_code}
          </p>
        </div>

        {!data.hasActiveCard && (
          <div className="border rounded-lg p-4 flex items-start gap-3"
            style={{ background: 'hsl(48 96% 53% / 0.1)', borderColor: 'hsl(48 96% 53% / 0.4)' }}>
            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" style={{ color: 'hsl(38 92% 45%)' }} />
            <div>
              <p className="text-sm font-semibold">Rate card not yet configured</p>
              <p className="text-xs text-muted-foreground mt-1">
                Your rate card is not yet set up. Contact the manufacturer admin to configure it.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <Card
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate('/erp/logistic/lr-queue')}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <Truck className="h-4 w-4 text-muted-foreground" />
                {data.oldestAwaiting > 2 && (
                  <Badge variant="outline" className="text-[10px]" style={{
                    background: data.oldestAwaiting > 4 ? 'hsl(0 84% 60% / 0.15)' : 'hsl(38 92% 50% / 0.15)',
                    color: data.oldestAwaiting > 4 ? 'hsl(0 84% 60%)' : 'hsl(38 92% 45%)',
                  }}>
                    {data.oldestAwaiting}d old
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2">LRs Awaiting Acceptance</p>
              <p className="text-2xl font-bold font-mono mt-1">{data.awaiting.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground mt-2">Invoices This Month</p>
              <p className="text-2xl font-bold font-mono mt-1">{data.invMonthCount}</p>
              <p className="text-[10px] text-muted-foreground font-mono">{fmt(data.invMonthTotal)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <IndianRupee className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground mt-2">Payments Received (YTD)</p>
              <p className="text-2xl font-bold font-mono mt-1">{fmt(data.ytdPaid)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground mt-2">Open Disputes</p>
              <p className="text-2xl font-bold font-mono mt-1">{data.openDspCount}</p>
              <p className="text-[10px] text-muted-foreground font-mono">{fmt(data.dspAmt)}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold">Recent Activity</h3>
              </div>
              {data.recentActs.length === 0 ? (
                <p className="text-xs text-muted-foreground">No activity yet.</p>
              ) : (
                <ul className="space-y-2">
                  {data.recentActs.map(a => (
                    <li key={a.id} className="flex items-center justify-between text-xs border-b border-border/40 pb-1.5">
                      <span className="capitalize">{a.kind.replace(/_/g, ' ')}</span>
                      <span className="text-muted-foreground font-mono">
                        {new Date(a.at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold mb-3">Recent LRs</h3>
              {data.recentLRs.length === 0 ? (
                <p className="text-xs text-muted-foreground">No LRs yet.</p>
              ) : (
                <ul className="space-y-2">
                  {data.recentLRs.map(l => (
                    <li key={l.id} className="flex items-center justify-between text-xs border-b border-border/40 pb-1.5">
                      <span className="font-mono">{l.dln_voucher_no}</span>
                      <Badge variant="outline" className="text-[10px] capitalize">{l.status}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </LogisticLayout>
  );
}
