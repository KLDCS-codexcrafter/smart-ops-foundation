/**
 * MobileSmartInsightsPage.tsx — Mobile Smart Insights feed
 * Sprint T-Phase-1.1.1l-c · Generates insights live (matches web SmartInsightsPanel pattern)
 */
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Sparkles } from 'lucide-react';
import type { MobileSession } from '../MobileRouter';
import {
  type SmartInsight, INSIGHT_CATEGORY_LABELS, INSIGHT_SEVERITY_COLORS,
} from '@/types/smart-insight';
import { generateAllInsights } from '@/lib/insight-generators';
import { type Campaign, campaignsKey } from '@/types/campaign';
import { type Lead, leadsKey } from '@/types/lead';
import { type CallSession, callSessionsKey } from '@/types/call-session';
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

export default function MobileSmartInsightsPage() {
  const navigate = useNavigate();
  const session = useMemo(() => readSession(), []);

  const insights = useMemo<SmartInsight[]>(() => {
    if (!session) return [];
    const campaigns = loadList<Campaign>(campaignsKey(session.entity_code));
    const leads = loadList<Lead>(leadsKey(session.entity_code));
    const sessions = loadList<CallSession>(callSessionsKey(session.entity_code));
    try {
      // [JWT] GET /api/salesx/smart-insights — generated live like web SmartInsightsPanel
      return generateAllInsights({
        campaigns,
        leads,
        sessions,
        profiles: [],
        capacities: [],
        reviews: [],
      });
    } catch {
      return [];
    }
  }, [session]);

  if (!session) return null;

  return (
    <div className="p-4 max-w-md mx-auto space-y-3 pb-12">
      <div className="flex items-center gap-2 mb-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/mobile/manager')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-base font-semibold">Smart Insights</h1>
        <Badge variant="outline" className="text-[10px] ml-auto">{insights.length}</Badge>
      </div>

      {insights.length === 0 ? (
        <Card className="p-6 text-center flex flex-col items-center gap-2">
          <Sparkles className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium">No insights yet</p>
          <p className="text-xs text-muted-foreground">
            Insights appear as your team accumulates leads, calls, and campaigns.
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {insights.map(i => (
            <Card key={i.id} className="p-3 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold truncate">{i.title}</p>
                <Badge variant="outline" className={cn('text-[10px] shrink-0', INSIGHT_SEVERITY_COLORS[i.severity])}>
                  {i.severity}
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground">{i.narrative}</p>
              {i.recommendation && (
                <p className="text-[11px] text-blue-700">→ {i.recommendation}</p>
              )}
              <div className="flex items-center justify-between text-[10px]">
                <Badge variant="outline" className="text-[10px]">{INSIGHT_CATEGORY_LABELS[i.category]}</Badge>
                <span className="text-muted-foreground">
                  {new Date(i.generated_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
