/**
 * @file        src/pages/mobile/MobileMaintenanceTechnicianPage.tsx
 * @purpose     Mobile landing for maintenance_technician role · 4 capture tile stubs (captures land at A.17 OOB-M9) + 3 active summary tiles · matches A.15b MobileSiteEngineerPage precedent
 * @sprint      T-Phase-1.A.16c · Block F.1 · Q-LOCK-3/4/5 · NEW
 * @decisions   D-NEW-DE Mobile Landing Page Pattern role-based · POSSIBLE 28th canonical (FR-72 candidate)
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Wrench, ClipboardCheck, Package, Camera, Activity, Calendar, AlertCircle } from 'lucide-react';
import { OfflineIndicator } from '@/components/mobile/OfflineIndicator';
import { listWorkOrders, listPMTickoffs, listInternalTickets } from '@/lib/maintainpro-engine';

const E = 'DEMO';

export default function MobileMaintenanceTechnicianPage(): JSX.Element {
  const navigate = useNavigate();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const i = setInterval(() => setTick((t) => t + 1), 5000);
    return () => clearInterval(i);
  }, []);

  const counts = useMemo(() => {
    void tick;
    return {
      activeWO: listWorkOrders(E).filter((w) => ['assigned', 'in_progress'].includes(w.status)).length,
      todayPM: listPMTickoffs(E).filter((p) => p.scheduled_date.slice(0, 10) === new Date().toISOString().slice(0, 10)).length,
      openTickets: listInternalTickets(E).filter((t) => t.status !== 'closed').length,
    };
  }, [tick]);

  return (
    <div className="min-h-screen bg-background p-4 max-w-md mx-auto space-y-4">
      <header className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate('/operix-go')}>
          <ArrowLeft className="h-4 w-4 mr-1" />Operix Go
        </Button>
        <OfflineIndicator />
      </header>

      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Wrench className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-lg font-bold">Maintenance Technician</h1>
          <p className="text-xs text-muted-foreground">MaintainPro mobile · field-first</p>
        </div>
      </div>

      <section>
        <div className="text-xs text-muted-foreground mb-2">Capture (available at A.17)</div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Capture Breakdown', Icon: AlertCircle },
            { label: 'PM Tick-off', Icon: ClipboardCheck },
            { label: 'Spares Issue', Icon: Package },
            { label: 'Asset Photo', Icon: Camera },
          ].map((t) => (
            <Card key={t.label} className="p-4 opacity-60 cursor-not-allowed">
              <t.Icon className="h-5 w-5 text-muted-foreground mb-2" />
              <div className="text-sm font-medium">{t.label}</div>
              <div className="text-xs text-muted-foreground">Available at A.17</div>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <div className="text-xs text-muted-foreground mb-2">Active summary</div>
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-3 text-center cursor-pointer" onClick={() => navigate('/erp/maintainpro')}>
            <Activity className="h-5 w-5 mx-auto text-primary mb-1" />
            <div className="text-xs text-muted-foreground">Active WOs</div>
            <div className="text-xl font-mono">{counts.activeWO}</div>
          </Card>
          <Card className="p-3 text-center cursor-pointer" onClick={() => navigate('/erp/maintainpro')}>
            <Calendar className="h-5 w-5 mx-auto text-primary mb-1" />
            <div className="text-xs text-muted-foreground">Today's PMs</div>
            <div className="text-xl font-mono">{counts.todayPM}</div>
          </Card>
          <Card className="p-3 text-center cursor-pointer" onClick={() => navigate('/erp/maintainpro')}>
            <AlertCircle className="h-5 w-5 mx-auto text-primary mb-1" />
            <div className="text-xs text-muted-foreground">Open Tickets</div>
            <div className="text-xl font-mono">{counts.openTickets}</div>
          </Card>
        </div>
      </section>
    </div>
  );
}
