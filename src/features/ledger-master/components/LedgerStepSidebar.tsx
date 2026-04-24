/**
 * @file     LedgerStepSidebar.tsx
 * @purpose  Step-sidebar shell for ledger master Panels. Wraps ProgressStepper.
 *           Mirrors PartyStepSidebar pattern from S4.
 * @sprint   T-H1.5-C-S6.5a
 * @finding  CC-059
 */
import { ProgressStepper } from '@/components/company/ProgressStepper';

interface Step { id: number; title: string; description: string; }

interface LedgerStepSidebarProps {
  steps: Step[];
  currentStep: number;
  onStepClick: (s: number) => void;
  completedSteps: number[];
  children: React.ReactNode;
}

export function LedgerStepSidebar({
  steps, currentStep, onStepClick, completedSteps, children,
}: LedgerStepSidebarProps) {
  return (
    <div className="flex w-full gap-4">
      <aside className="w-60 shrink-0 border-r border-border pr-3 overflow-y-auto max-h-[70vh]">
        <ProgressStepper
          steps={steps}
          currentStep={currentStep}
          onStepClick={onStepClick}
          completedSteps={completedSteps}
        />
      </aside>
      <main className="flex-1 overflow-y-auto max-h-[70vh] pr-1">
        {children}
      </main>
    </div>
  );
}
