import { useEffect, useRef, useState } from 'react';
import { Check, AlertCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Step { id: number; title: string; description: string; }
interface ProgressStepperProps {
  steps: Step[];
  currentStep: number;
  onStepClick: (s: number) => void;
  completedSteps?: number[];
  stepsWithErrors?: number[];
}

export function ProgressStepper({
  steps, currentStep, onStepClick,
  completedSteps = [], stepsWithErrors = [],
}: ProgressStepperProps) {
  const [displayPct, setDisplayPct] = useState(0);
  const raf = useRef<number | null>(null);
  const validatable = steps.filter(s => s.title !== 'Audit Trail');
  const target = validatable.length > 0
    ? Math.round((completedSteps.length / validatable.length) * 100) : 0;

  useEffect(() => {
    const start = displayPct, end = target, dur = 500, t0 = performance.now();
    const go = (now: number) => {
      const t = Math.min((now - t0) / dur, 1);
      const e = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      setDisplayPct(Math.round(start + (end - start) * e));
      if (t < 1) raf.current = requestAnimationFrame(go);
    };
    raf.current = requestAnimationFrame(go);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [target]); // eslint-disable-line

  const allDone = target === 100;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">Setup Progress</p>
        {allDone && <span className="text-xs">🎉</span>}
      </div>
      <Progress value={displayPct} className="h-2" />
      <p className={cn('text-lg font-bold', allDone ? 'text-primary' : 'text-foreground')}>
        {displayPct}%
      </p>
      {allDone && (
        <p className="text-xs text-primary">All steps complete — ready to save!</p>
      )}

      <div className="space-y-1 mt-4">
        {steps.map(step => {
          const isActive = currentStep === step.id;
          const isDone = completedSteps.includes(step.id);
          const hasErr = stepsWithErrors.includes(step.id);
          return (
            <button
              key={step.id}
              onClick={() => onStepClick(step.id)}
              className={cn(
                'w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
                isActive
                  ? 'bg-primary/10 border border-primary/20'
                  : 'hover:bg-muted/50 border border-transparent',
              )}
            >
              <div className={cn(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                hasErr ? 'bg-destructive text-destructive-foreground' :
                isDone ? 'bg-primary text-primary-foreground' :
                isActive ? 'bg-primary/20 text-primary border border-primary/30' :
                'bg-muted text-muted-foreground',
              )}>
                {hasErr ? <AlertCircle className="h-3.5 w-3.5" /> :
                 isDone ? <Check className="h-3.5 w-3.5" /> :
                 step.id}
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn('text-xs font-medium', isActive ? 'text-primary' : 'text-foreground')}>
                  {step.title}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">{step.description}</p>
              </div>
              {isDone && !hasErr && (
                <Badge variant="outline" className="text-[10px] bg-primary/5 text-primary border-primary/20 shrink-0">
                  Done
                </Badge>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
