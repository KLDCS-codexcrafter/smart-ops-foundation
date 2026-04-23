/**
 * DistributorRateUs.tsx — Distributor rates the tenant
 * Lives on the distributor portal at /erp/distributor/rate-us
 * Same 5-star pattern but direction = 'distributor_to_tenant'
 */
import { useState } from 'react';
import { DistributorLayout } from '@/features/distributor/DistributorLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Star, Send } from 'lucide-react';
import { toast } from 'sonner';
import {
import { DEFAULT_ENTITY_SHORTCODE } from '@/lib/default-entity';
  ratingsKey, type RatingEntry, type RatingDimension,
} from '@/types/distributor-rating';

const ENTITY = DEFAULT_ENTITY_SHORTCODE;

const DIMENSIONS: { id: RatingDimension; label: string }[] = [
  { id: 'fulfilment_speed', label: 'How fast do we ship your orders?' },
  { id: 'pricing_fairness', label: 'Is pricing fair and transparent?' },
  { id: 'support_quality',  label: 'Support responsiveness and quality' },
];

type DraftMap = Record<RatingDimension, number>;

const EMPTY_DRAFT: DraftMap = {
  fulfilment_speed: 0, pricing_fairness: 0, support_quality: 0,
  payment_reliability: 0, order_volume: 0, quality_adherence: 0,
};

export default function DistributorRateUs() {
  const distributorId = 'd-sharma'; // in real use, from session
  const [draft, setDraft] = useState<DraftMap>(EMPTY_DRAFT);
  const [comment, setComment] = useState('');

  const submit = () => {
    const now = new Date().toISOString();
    const entries: RatingEntry[] = DIMENSIONS
      .filter(d => draft[d.id] > 0)
      .map(d => ({
        id: `rat-${Date.now()}-${d.id}`,
        entity_id: ENTITY,
        distributor_id: distributorId,
        direction: 'distributor_to_tenant',
        dimension: d.id,
        stars: draft[d.id],
        comment: comment || null,
        rated_by: 'distributor-user',
        rated_at: now,
      }));
    if (entries.length === 0) {
      toast.error('Please rate at least one dimension');
      return;
    }
    try {
      // [JWT] POST /api/distributor/ratings
      const raw = localStorage.getItem(ratingsKey(ENTITY));
      const existing: RatingEntry[] = raw ? JSON.parse(raw) : [];
      localStorage.setItem(ratingsKey(ENTITY), JSON.stringify([...existing, ...entries]));
      toast.success('Thank you for your feedback');
      setDraft(EMPTY_DRAFT);
      setComment('');
    } catch {
      toast.error('Failed to submit');
    }
  };

  return (
    <DistributorLayout title="Rate Us" subtitle="Help us serve you better">
      <div className="p-4 md:p-6 max-w-2xl space-y-4 animate-fade-in">
        <div>
          <h1 className="text-xl font-bold">Rate your experience</h1>
          <p className="text-sm text-muted-foreground">Your feedback helps us improve.</p>
        </div>

        {DIMENSIONS.map(d => (
          <Card key={d.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{d.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setDraft(prev => ({ ...prev, [d.id]: s }))}
                    className={`h-8 w-8 rounded-md border transition-all ${
                      s <= draft[d.id]
                        ? 'bg-amber-400 border-amber-500'
                        : 'bg-muted border-muted hover:bg-amber-100'
                    }`}
                    aria-label={`${s} stars`}
                  >
                    <Star
                      className={`h-4 w-4 mx-auto ${s <= draft[d.id] ? 'text-white' : 'text-muted-foreground'}`}
                      fill={s <= draft[d.id] ? 'currentColor' : 'none'}
                    />
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Comments (optional)</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Any specific feedback?"
              rows={3}
            />
          </CardContent>
        </Card>

        <Button onClick={submit} className="bg-indigo-600 hover:bg-indigo-700" data-primary="true">
          <Send className="h-4 w-4 mr-1.5" />Submit feedback
        </Button>
      </div>
    </DistributorLayout>
  );
}
