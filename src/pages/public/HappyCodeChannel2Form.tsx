/**
 * @file        src/pages/public/HappyCodeChannel2Form.tsx
 * @purpose     C.1d · Public Channel-2 NPS form · 7-day JWT verified · token in URL
 * @sprint      T-Phase-1.C.1d · Block E.1
 * @decisions   Q-LOCK-4 · stateless JWT verification · NO auth required (token IS auth)
 * @iso         Usability + Reliability
 */
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { verifyChannel2JWT, submitChannel2Feedback } from '@/lib/servicedesk-engine';

export default function HappyCodeChannel2Form(): JSX.Element {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const entity = params.get('entity') ?? 'OPRX';

  const verified = useMemo(() => verifyChannel2JWT(token), [token]);
  const [score, setScore] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if ('error' in verified) {
      toast.error(`Link ${verified.error}`);
    }
  }, [verified]);

  if ('error' in verified) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <Card className="glass-card p-8 max-w-md w-full text-center">
          <h1 className="text-xl font-semibold text-destructive">Link {verified.error}</h1>
          <p className="text-sm text-muted-foreground mt-2">
            This feedback link is no longer valid. Please contact support if you wish to share feedback.
          </p>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <Card className="glass-card p-8 max-w-md w-full text-center">
          <h1 className="text-xl font-semibold text-success">Thank you</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Your feedback has been recorded. We appreciate your time.
          </p>
        </Card>
      </div>
    );
  }

  const onSubmit = (): void => {
    if (score === null) { toast.error('Please pick a score from 0 to 10'); return; }
    try {
      submitChannel2Feedback(token, score, comment, entity);
      setSubmitted(true);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <Card className="glass-card p-8 max-w-xl w-full space-y-4">
        <div>
          <h1 className="text-2xl font-semibold">How likely are you to recommend us?</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Score 0 (not at all) to 10 (extremely likely)
          </p>
        </div>

        <div className="grid grid-cols-11 gap-1">
          {Array.from({ length: 11 }, (_, i) => (
            <Button
              key={i}
              variant={score === i ? 'default' : 'outline'}
              onClick={() => setScore(i)}
              className="font-mono h-12"
            >
              {i}
            </Button>
          ))}
        </div>

        <div className="space-y-2">
          <Label>Comments (optional)</Label>
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Share what worked well or what we could improve…"
            rows={4}
          />
        </div>

        <Button onClick={onSubmit} className="w-full" size="lg">
          Submit feedback
        </Button>
      </Card>
    </div>
  );
}
