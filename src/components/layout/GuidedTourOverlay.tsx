/**
 * GuidedTourOverlay.tsx — 4-5 step overlay shown first-visit per card
 */

import { useState, useEffect } from 'react';
import { ArrowRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import {
  TOURS, hasSeenTour, markTourSeen, type TourStep,
} from '@/lib/guided-tour-registry';
import type { CardId } from '@/types/card-entitlement';

interface GuidedTourProps {
  cardId: CardId;
}

export function GuidedTourOverlay({ cardId }: GuidedTourProps) {
  const steps: TourStep[] = TOURS[cardId] ?? [];
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (steps.length === 0) return;
    if (!hasSeenTour(cardId)) {
      setIdx(0);
      setOpen(true);
    }
  }, [cardId, steps.length]);

  if (steps.length === 0) return null;

  const step = steps[idx];
  const isLast = idx === steps.length - 1;

  const finish = () => {
    markTourSeen(cardId);
    setOpen(false);
  };

  const next = () => {
    if (isLast) finish();
    else setIdx(i => i + 1);
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) finish(); }}>
      <DialogContent className='max-w-md'>
        <div className='space-y-3'>
          <div className='flex items-center justify-between'>
            <span className='text-[10px] uppercase tracking-wider text-indigo-500'>
              Step {idx + 1} of {steps.length}
            </span>
            <Button size='sm' variant='ghost' onClick={finish} aria-label='Skip'>
              <X className='h-3 w-3' />
            </Button>
          </div>
          <h3 className='text-lg font-semibold'>{step.title}</h3>
          <p className='text-sm text-muted-foreground'>{step.body}</p>
          <div className='flex items-center justify-between pt-2'>
            <Button size='sm' variant='ghost' onClick={finish}>Skip tour</Button>
            <Button size='sm' onClick={next} className='bg-indigo-600 hover:bg-indigo-700'>
              {isLast ? 'Got it' : 'Next'}
              {!isLast && <ArrowRight className='h-3 w-3 ml-1' />}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default GuidedTourOverlay;
