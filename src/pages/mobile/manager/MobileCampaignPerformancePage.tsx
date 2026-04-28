/**
 * MobileCampaignPerformancePage.tsx — Campaigns with ROI
 * Sprint T-Phase-1.1.1l-c
 */
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Megaphone } from 'lucide-react';
import type { MobileSession } from '../MobileRouter';
import { type Campaign, campaignsKey, CAMPAIGN_TYPE_LABELS } from '@/types/campaign';

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

const fmtINR = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

export default function MobileCampaignPerformancePage() {
  const navigate = useNavigate();
  const session = useMemo(() => readSession(), []);

  const campaigns = useMemo(() => {
    if (!session) return [];
    return loadList<CampaignLite>(campaignsKey(session.entity_code))
      .sort((a, b) => (b.performance_metrics?.roi_pct ?? 0) - (a.performance_metrics?.roi_pct ?? 0));
  }, [session]);

  if (!session) return null;

  return (
    <div className="p-4 max-w-md mx-auto space-y-3 pb-12">
      <div className="flex items-center gap-2 mb-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/mobile/manager')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-base font-semibold">Campaign Performance</h1>
      </div>

      {campaigns.length === 0 && (
        <Card className="p-6 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
          <Megaphone className="h-8 w-8" />
          Run campaigns to see performance.
        </Card>
      )}

      <div className="space-y-2">
        {campaigns.map(c => (
          <Card key={c.id} className="p-3 space-y-1">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium truncate">{c.campaign_name ?? c.name ?? 'Campaign'}</p>
              <Badge variant="outline" className="text-[10px]">{CAMPAIGN_TYPE_LABELS[c.campaign_type]}</Badge>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">
                Revenue: <span className="font-mono">{fmtINR(c.outcome_tracking?.revenue_attributed ?? 0)}</span>
              </span>
              <span className="font-mono font-semibold text-green-700">
                ROI {(c.performance_metrics?.roi_pct ?? 0).toFixed(0)}%
              </span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
