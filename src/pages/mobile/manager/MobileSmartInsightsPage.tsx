/**
 * MobileSmartInsightsPage.tsx — Mobile Smart Insights feed
 * Sprint T-Phase-1.1.1l-c
 * No persistent storage key for insights yet — render empty state if none.
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

const smartInsightsKey = (e: string) => `erp_smart_insights_${e}`;

export default function MobileSmartInsightsPage() {
  const navigate = useNavigate();
  const session = useMemo(() => readSession(), []);

  const insights = useMemo(() => {
    if (!session) return [];
    return loadList<SmartInsight>(smartInsightsKey(session.entity_code))
      .sort((a, b) => new Date(b.generated_at).getTime() - new Date(a.generated_at).getTime());
  }, [session]);

  if (!session) return null;

  return (
    <div className="p-4 max-w-md mx-auto space-y-3 pb-12">
      <div className="flex items-center gap-2 mb-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/mobile/manager')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-base font-semibold">Smart Insights</h1>
      </div>

      {insights.length === 0 && (
        <Card className="p-6 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
          <Sparkles className="h-8 w-8" />
          No insights generated yet. Visit the desktop SalesX dashboard to generate insights.
        </Card>
      )}

      <div className="space-y-2">
        {insights.map(i => (
          <Card key={i.id} className="p-3 space-y-2">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="text-[10px]">{INSIGHT_CATEGORY_LABELS[i.category]}</Badge>
              <Badge variant="outline" className={cn('text-[10px]', INSIGHT_SEVERITY_COLORS[i.severity])}>
                {i.severity}
              </Badge>
            </div>
            <p className="text-sm font-medium">{i.title}</p>
            <p className="text-[11px] text-muted-foreground">{i.narrative}</p>
            {i.recommendation && (
              <p className="text-[11px] text-blue-700">→ {i.recommendation}</p>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
