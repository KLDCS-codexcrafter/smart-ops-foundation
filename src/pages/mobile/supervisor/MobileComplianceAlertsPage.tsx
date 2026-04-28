/**
 * MobileComplianceAlertsPage.tsx — Unresolved compliance alerts inbox
 * Shared by Supervisor + Sales Manager routes.
 * Sprint T-Phase-1.1.1l-c
 */
import { useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, AlertTriangle, MapPin } from 'lucide-react';
import type { MobileSession } from '../MobileRouter';
import {
  type ComplianceAlert, complianceAlertsKey,
  COMPLIANCE_ALERT_LABELS, COMPLIANCE_ALERT_COLORS,
} from '@/types/compliance-alert';
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
function saveList<T>(key: string, list: T[]): void {
  try { localStorage.setItem(key, JSON.stringify(list)); } catch { /* ignore */ }
}

export default function MobileComplianceAlertsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const session = useMemo(() => readSession(), []);
  const [tick, setTick] = useState(0);

  const backTo = location.pathname.startsWith('/mobile/manager') ? '/mobile/manager' : '/mobile/supervisor';

  const alerts = useMemo(() => {
    if (!session) return [];
    return loadList<ComplianceAlert>(complianceAlertsKey(session.entity_code))
      .filter(a => a.resolved_at === null)
      .sort((a, b) => new Date(b.detected_at).getTime() - new Date(a.detected_at).getTime());
    // tick triggers recompute
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, tick]);

  const handleAcknowledge = (alertId: string) => {
    if (!session) return;
    const all = loadList<ComplianceAlert>(complianceAlertsKey(session.entity_code));
    const idx = all.findIndex(a => a.id === alertId);
    if (idx < 0) return;
    all[idx] = {
      ...all[idx],
      resolved_at: new Date().toISOString(),
      resolved_by_id: session.user_id,
      resolved_by_name: session.display_name,
    };
    saveList(complianceAlertsKey(session.entity_code), all);
    setTick(t => t + 1);
  };

  if (!session) return null;

  return (
    <div className="p-4 max-w-md mx-auto space-y-3 pb-12">
      <div className="flex items-center gap-2 mb-2">
        <Button variant="ghost" size="sm" onClick={() => navigate(backTo)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-base font-semibold">Compliance Alerts</h1>
      </div>

      {alerts.length === 0 && (
        <Card className="p-6 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
          <AlertTriangle className="h-8 w-8" />
          No unresolved alerts. All clear.
        </Card>
      )}

      <div className="space-y-2">
        {alerts.map(a => (
          <Card key={a.id} className="p-3 space-y-2">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className={cn('text-[10px]', COMPLIANCE_ALERT_COLORS[a.kind])}>
                {COMPLIANCE_ALERT_LABELS[a.kind]}
              </Badge>
              <span className="text-[10px] text-muted-foreground">{a.severity}</span>
            </div>
            <div>
              <p className="text-sm font-medium">{a.user_name}</p>
              <p className="text-[10px] text-muted-foreground font-mono">{a.user_role}</p>
            </div>
            <div className="text-[11px] text-muted-foreground space-y-0.5">
              <p>Detected: {new Date(a.detected_at).toLocaleString('en-IN')}</p>
              {a.context.battery_pct !== undefined && <p>Battery: {a.context.battery_pct}%</p>}
              {a.context.halt_minutes !== undefined && <p>Stationary: {a.context.halt_minutes} min</p>}
              {a.context.offline_minutes !== undefined && <p>Offline: {a.context.offline_minutes} min</p>}
              {a.context.last_known_lat !== undefined && a.context.last_known_lng !== undefined && (
                <a
                  href={`https://www.google.com/maps?q=${a.context.last_known_lat},${a.context.last_known_lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                >
                  <MapPin className="h-3 w-3" /> Last location
                </a>
              )}
            </div>
            <Button size="sm" variant="outline" className="w-full h-7 text-xs" onClick={() => handleAcknowledge(a.id)}>
              Acknowledge
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
