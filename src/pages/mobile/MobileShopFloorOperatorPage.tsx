/**
 * @file     MobileShopFloorOperatorPage.tsx
 * @sprint   T-Phase-3.PROD-3 · ST8 · Q-LOCK-10 Option A · Operator-first mobile landing
 *           Q-LOCK-2 Option A · operator-only · supervisor/manager use web
 */
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Factory, FileText, Wrench, ClipboardCheck, Activity, QrCode } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useJobCards } from '@/hooks/useJobCards';
import { useMachines } from '@/hooks/useMachines';
import { useEntityCode } from '@/hooks/useEntityCode';
import { listMachinesByHealth } from '@/lib/iot-machine-bridge';
import { useMemo } from 'react';

export default function MobileShopFloorOperatorPage(): JSX.Element {
  const navigate = useNavigate();
  const { entityCode } = useEntityCode();
  const { jobCards } = useJobCards();
  const { machines } = useMachines();

  const today = new Date().toISOString().slice(0, 10);
  const todaysCards = jobCards.filter(jc =>
    jc.scheduled_start.slice(0, 10) === today &&
    (jc.status === 'planned' || jc.status === 'in_progress'),
  );

  const healthSummary = useMemo(() => {
    if (!entityCode) return { healthy: 0, degraded: 0, critical: 0 };
    const healths = listMachinesByHealth(entityCode);
    return {
      healthy: healths.filter(h => h.status === 'healthy').length,
      degraded: healths.filter(h => h.status === 'degraded').length,
      critical: healths.filter(h => h.status === 'critical').length,
    };
  }, [entityCode]);

  return (
    <div className="p-4 max-w-md mx-auto space-y-4">
      <header className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/operix-go')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-lg font-semibold">Shop Floor Operator</h1>
      </header>

      <Card className="p-4 space-y-2">
        <p className="text-xs uppercase text-muted-foreground">Today · {today}</p>
        <p className="text-2xl font-bold font-mono">{todaysCards.length} job cards</p>
        <p className="text-xs text-muted-foreground">
          {todaysCards.filter(c => c.status === 'in_progress').length} in progress ·
          {' '}{todaysCards.filter(c => c.status === 'planned').length} planned
        </p>
      </Card>

      <Card className="p-4 space-y-2">
        <p className="text-xs uppercase text-muted-foreground flex items-center gap-1">
          <Activity className="h-3 w-3" /> Machine Health (24h)
        </p>
        <div className="flex gap-4 text-sm">
          <span className="text-success">● {healthSummary.healthy} healthy</span>
          <span className="text-warning">● {healthSummary.degraded} degraded</span>
          <span className="text-destructive">● {healthSummary.critical} critical</span>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <QuickActionCard icon={FileText} label="Confirm Production" sub="Voice + Barcode" onClick={() => navigate('/operix-go/production/confirmation')} />
        <QuickActionCard icon={Wrench} label="Job Card" sub="Clock in/out" onClick={() => navigate('/operix-go/production/job-card')} />
        <QuickActionCard icon={ClipboardCheck} label="Material Issue" sub="Scan barcode" onClick={() => navigate('/operix-go/production/material-issue')} />
        <QuickActionCard icon={Factory} label="Job Work Out" sub="Vendor flow" onClick={() => navigate('/operix-go/production/job-work-out')} />
        {/* [Sprint 68 FAR-4 · Block 7 · Q-LOCK-6 A · Mobile QR cockpit for FA verification] */}
        <QuickActionCard icon={QrCode} label="Asset QR Scan" sub="Verify · Reassign" onClick={() => navigate('/mobile/fa-scan')} />
      </div>

      <p className="text-[10px] text-muted-foreground text-center pt-2">
        Voice · Barcode · Offline-first · PWA — no install needed
      </p>
    </div>
  );
}

interface QuickActionProps {
  icon: typeof FileText;
  label: string;
  sub: string;
  onClick: () => void;
}

function QuickActionCard({ icon: Icon, label, sub, onClick }: QuickActionProps): JSX.Element {
  return (
    <button
      onClick={onClick}
      className="rounded-xl border bg-card p-4 text-left transition-all hover:scale-[1.02]"
    >
      <Icon className="h-5 w-5 text-primary mb-2" />
      <p className="font-semibold text-sm">{label}</p>
      <p className="text-xs text-muted-foreground">{sub}</p>
    </button>
  );
}
