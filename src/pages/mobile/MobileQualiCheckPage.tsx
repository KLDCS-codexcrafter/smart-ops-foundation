/**
 * MobileQualiCheckPage.tsx — Sprint 5-pre-3 · Block E · D-346
 * OperixGo QualiCheck landing page · today's stats + "New Inspection" CTA.
 *
 * Pattern note: NO [tick, setTick] + useMemo · uses [list, setList] + refresh() pattern.
 * Mirrors MobileGateGuardPage 4-pre-3 D-312 EXACTLY.
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, FlaskConical, Plus, ClipboardCheck, AlertTriangle, Activity } from 'lucide-react';
import MobileQualiCheckCapture from '@/components/mobile/MobileQualiCheckCapture';
import { OfflineIndicator } from '@/components/mobile/OfflineIndicator';
import { listPendingQa, listQaInspections } from '@/lib/qa-inspection-engine';
import { getPendingInspectionAlerts } from '@/lib/oob/qa-pending-inspection-alerts';

function getActiveEntityCode(): string {
  try { return localStorage.getItem('active_entity_code') ?? 'DEMO'; }
  catch { return 'DEMO'; }
}

export default function MobileQualiCheckPage(): JSX.Element {
  const navigate = useNavigate();
  const ENTITY = getActiveEntityCode();
  const [showCapture, setShowCapture] = useState(false);
  const [pending, setPending] = useState<number>(0);
  const [critical, setCritical] = useState<number>(0);
  const [today, setToday] = useState<number>(0);

  const refresh = (): void => {
    setPending(listPendingQa(ENTITY).length);
    const alerts = getPendingInspectionAlerts(ENTITY);
    setCritical(alerts.filter(a => a.severity === 'critical' || a.severity === 'escalated').length);
    const todayStr = new Date().toISOString().slice(0, 10);
    setToday(
      listQaInspections(ENTITY).filter(q => (q.inspection_date ?? '').slice(0, 10) === todayStr).length,
    );
  };

  useEffect(() => {
    refresh();
    const i = setInterval(refresh, 5000);
    return () => clearInterval(i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (showCapture) {
    return (
      <div>
        <div className="max-w-md mx-auto p-2">
          <Button variant="ghost" size="sm" onClick={() => { setShowCapture(false); refresh(); }}>
            <ArrowLeft className="h-4 w-4 mr-1" />Back
          </Button>
        </div>
        <MobileQualiCheckCapture />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 max-w-md mx-auto space-y-4">
      <header className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate('/operix-go')}>
          <ArrowLeft className="h-4 w-4 mr-1" />Operix Go
        </Button>
        <OfflineIndicator />
      </header>

      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <FlaskConical className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold">QualiCheck</h1>
          <p className="text-xs text-muted-foreground">Mobile inspection capture · 5-step · offline-resilient</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3 text-center">
          <ClipboardCheck className="h-4 w-4 mx-auto text-primary mb-1" />
          <div className="font-mono text-2xl font-semibold">{pending}</div>
          <div className="text-xs text-muted-foreground">Pending</div>
        </Card>
        <Card className="p-3 text-center">
          <AlertTriangle className="h-4 w-4 mx-auto text-destructive mb-1" />
          <div className="font-mono text-2xl font-semibold">{critical}</div>
          <div className="text-xs text-muted-foreground">Critical</div>
        </Card>
        <Card className="p-3 text-center">
          <Activity className="h-4 w-4 mx-auto text-emerald-600 mb-1" />
          <div className="font-mono text-2xl font-semibold">{today}</div>
          <div className="text-xs text-muted-foreground">Today</div>
        </Card>
      </div>

      <Button onClick={() => setShowCapture(true)} className="w-full h-14 text-base">
        <Plus className="h-5 w-5 mr-2" />New Inspection
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        Routes inspection to closure resolver on submit · 3 Stock Journals (Approved/Sample/Rejection) auto-posted.
      </p>
    </div>
  );
}
