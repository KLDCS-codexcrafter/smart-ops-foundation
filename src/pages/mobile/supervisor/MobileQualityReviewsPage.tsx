/**
 * MobileQualityReviewsPage.tsx — Read-only call quality review list
 * Sprint T-Phase-1.1.1l-c
 */
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Star } from 'lucide-react';
import type { MobileSession } from '../MobileRouter';
import { type CallReview, REVIEW_STATUS_LABELS, REVIEW_STATUS_COLORS } from '@/types/call-quality';
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

const callReviewsKey = (e: string) => `erp_call_reviews_${e}`;

export default function MobileQualityReviewsPage() {
  const navigate = useNavigate();
  const session = useMemo(() => readSession(), []);

  const reviews = useMemo(() => {
    if (!session) return [];
    return loadList<CallReview>(callReviewsKey(session.entity_code))
      .sort((a, b) => new Date(b.reviewed_at).getTime() - new Date(a.reviewed_at).getTime());
  }, [session]);

  if (!session) return null;

  return (
    <div className="p-4 max-w-md mx-auto space-y-3 pb-12">
      <div className="flex items-center gap-2 mb-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/mobile/supervisor')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-base font-semibold">Quality Reviews</h1>
      </div>
      {reviews.length === 0 && (
        <Card className="p-6 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
          <Star className="h-8 w-8" />
          No call quality reviews yet.
        </Card>
      )}
      <div className="space-y-2">
        {reviews.map(r => (
          <Card key={r.id} className="p-3 space-y-1">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{r.telecaller_name}</p>
              <Badge variant="outline" className={cn('text-[10px]', REVIEW_STATUS_COLORS[r.status])}>
                {REVIEW_STATUS_LABELS[r.status]}
              </Badge>
            </div>
            <p className="text-[10px] text-muted-foreground font-mono">{r.call_session_no}</p>
            <div className="flex items-center justify-between text-[11px] mt-1">
              <span className="text-muted-foreground">Reviewed by {r.reviewer_name}</span>
              <span className="font-mono font-semibold">{r.total_score.toFixed(1)} / 100</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
