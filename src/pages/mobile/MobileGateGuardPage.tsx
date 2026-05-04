/**
 * MobileGateGuardPage.tsx — Sprint 4-pre-3 · Block D · D-312
 * OperixGo Gate Guard landing page · today's stats + "New Gate Pass" CTA.
 *
 * Pattern note: NO [tick, setTick] + useMemo · uses [list, setList] + refresh() pattern.
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, DoorOpen, Plus, LogIn, LogOut, Activity } from 'lucide-react';
import MobileGateGuardCapture from '@/components/mobile/MobileGateGuardCapture';
import { OfflineIndicator } from '@/components/mobile/OfflineIndicator';
import {
  listInwardQueue, listOutwardQueue, listGatePasses,
} from '@/lib/gateflow-engine';
import { DEFAULT_ENTITY_SHORTCODE } from '@/lib/default-entity';

const ENTITY = DEFAULT_ENTITY_SHORTCODE;

export default function MobileGateGuardPage() {
  const navigate = useNavigate();
  const [showCapture, setShowCapture] = useState(false);
  const [inward, setInward] = useState<number>(0);
  const [outward, setOutward] = useState<number>(0);
  const [today, setToday] = useState<number>(0);

  const refresh = () => {
    setInward(listInwardQueue(ENTITY).length);
    setOutward(listOutwardQueue(ENTITY).length);
    const todayStr = new Date().toISOString().slice(0, 10);
    setToday(
      listGatePasses(ENTITY).filter((gp) => gp.entry_time.slice(0, 10) === todayStr).length,
    );
  };

  useEffect(() => {
    refresh();
    const i = setInterval(refresh, 5000);
    return () => clearInterval(i);
  }, []);

  if (showCapture) {
    return (
      <div>
        <div className="max-w-md mx-auto p-2">
          <Button variant="ghost" size="sm" onClick={() => { setShowCapture(false); refresh(); }}>
            <ArrowLeft className="h-4 w-4 mr-1" />Back
          </Button>
        </div>
        <MobileGateGuardCapture />
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
          <DoorOpen className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Gate Guard</h1>
          <p className="text-xs text-muted-foreground">Quick gate pass capture · QR + camera</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3 text-center">
          <Activity className="h-4 w-4 mx-auto text-primary mb-1" />
          <div className="font-mono text-2xl font-semibold">{today}</div>
          <div className="text-xs text-muted-foreground">Today</div>
        </Card>
        <Card className="p-3 text-center">
          <LogIn className="h-4 w-4 mx-auto text-emerald-600 mb-1" />
          <div className="font-mono text-2xl font-semibold">{inward}</div>
          <div className="text-xs text-muted-foreground">Inward open</div>
        </Card>
        <Card className="p-3 text-center">
          <LogOut className="h-4 w-4 mx-auto text-amber-600 mb-1" />
          <div className="font-mono text-2xl font-semibold">{outward}</div>
          <div className="text-xs text-muted-foreground">Outward open</div>
        </Card>
      </div>

      <Button onClick={() => setShowCapture(true)} className="w-full h-14 text-base">
        <Plus className="h-5 w-5 mr-2" />New Gate Pass
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        QR scan auto-fills vehicle from master · works offline · syncs when online.
      </p>
    </div>
  );
}
