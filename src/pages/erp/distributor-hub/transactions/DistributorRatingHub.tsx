/**
 * DistributorRatingHub.tsx — Tenant-side rating UI
 * List all distributors, let tenant rate each on 3 dimensions,
 * show composite score + credit grade + recommended credit limit.
 * Module id: dh-t-ratings
 */
import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Star } from 'lucide-react';
import { toast } from 'sonner';
import { distributorsKey, type Distributor } from '@/types/distributor';
import {
  ratingsKey, type RatingEntry, type RatingDimension,
} from '@/types/distributor-rating';
import { computeComposite, recommendedCreditLimit } from '@/lib/distributor-rating-engine';
import { formatINR } from '@/lib/india-validations';
import { DEFAULT_ENTITY_SHORTCODE } from '@/lib/default-entity';

const ENTITY = DEFAULT_ENTITY_SHORTCODE;

const DIMENSIONS: { id: RatingDimension; label: string }[] = [
  { id: 'payment_reliability', label: 'Payment reliability (×2 weight)' },
  { id: 'order_volume',        label: 'Order volume / activity' },
  { id: 'quality_adherence',   label: 'Quality / returns discipline' },
];

export function DistributorRatingHubPanel() {
  const [rev, setRev] = useState(0);

  const distributors = useMemo<Distributor[]>(() => {
    void rev;
    try {
      // [JWT] GET /api/distributors
      const raw = localStorage.getItem(distributorsKey(ENTITY));
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }, [rev]);

  const ratings = useMemo<RatingEntry[]>(() => {
    void rev;
    try {
      // [JWT] GET /api/distributor/ratings
      const raw = localStorage.getItem(ratingsKey(ENTITY));
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }, [rev]);

  const submitRating = (distributorId: string, dim: RatingDimension, stars: number) => {
    const entry: RatingEntry = {
      id: `rat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      entity_id: ENTITY,
      distributor_id: distributorId,
      direction: 'tenant_to_distributor',
      dimension: dim,
      stars,
      comment: null,
      rated_by: 'tenant-admin',
      rated_at: new Date().toISOString(),
    };
    try {
      // [JWT] POST /api/distributor/ratings
      const next = [...ratings, entry];
      localStorage.setItem(ratingsKey(ENTITY), JSON.stringify(next));
      setRev(r => r + 1);
      toast.success(`Rated ${stars} stars`);
    } catch {
      toast.error('Failed to save rating');
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-4 animate-fade-in">
      <div>
        <h2 className="text-xl font-bold">Distributor Ratings &amp; Credit Score</h2>
        <p className="text-sm text-muted-foreground">
          Two-way ratings drive composite credit score (300-900). Recommended credit limits scale with grade.
        </p>
      </div>

      {distributors.length === 0 && (
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">
          No distributors yet. Onboard one from the Distributor Hub.
        </CardContent></Card>
      )}

      {distributors.map(d => {
        const score = computeComposite(d.id, ratings);
        const recLimit = recommendedCreditLimit(score, d.credit_limit_paise ?? 0);
        const gradeColour =
          score.credit_grade === 'A+' || score.credit_grade === 'A'
            ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
            : score.credit_grade === 'B'
            ? 'bg-amber-500/10 text-amber-600 border-amber-500/30'
            : 'bg-red-500/10 text-red-600 border-red-500/30';
        return (
          <Card key={d.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{d.legal_name}</CardTitle>
                <span className={`text-xs px-2 py-0.5 rounded border font-mono ${gradeColour}`}>
                  Grade {score.credit_grade} · {score.credit_score}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-muted-foreground">Tenant → Distributor avg: </span>
                  <span className="font-mono">{score.tenant_to_distributor_avg}/5</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Distributor → Tenant avg: </span>
                  <span className="font-mono">{score.distributor_to_tenant_avg}/5</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Current limit: </span>
                  <span className="font-mono">{formatINR(d.credit_limit_paise ?? 0)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Recommended: </span>
                  <strong className="font-mono">{formatINR(recLimit)}</strong>
                </div>
              </div>

              <div className="space-y-1.5">
                {DIMENSIONS.map(dim => (
                  <div key={dim.id} className="flex items-center justify-between text-xs">
                    <span>{dim.label}</span>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map(s => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => submitRating(d.id, dim.id, s)}
                          className="hover:scale-110 transition-transform"
                          aria-label={`${s} stars`}
                        >
                          <Star className="h-3.5 w-3.5 text-amber-400" fill="currentColor" />
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export default DistributorRatingHubPanel;
