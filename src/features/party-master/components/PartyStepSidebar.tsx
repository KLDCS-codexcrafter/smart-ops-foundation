/**
 * @file     PartyStepSidebar.tsx
 * @purpose  Step-sidebar shell for party masters. Wraps ProgressStepper.
 *           Mirrors pattern from ParentCompany.tsx.
 * @sprint   T-H1.5-C-S4
 */
import { ProgressStepper } from '@/components/company/ProgressStepper';

interface Step { id: number; title: string; description: string; }

interface PartyStepSidebarProps {
  steps: Step[];
  currentStep: number;
  onStepClick: (s: number) => void;
  completedSteps: number[];
  children: React.ReactNode;
}

export function PartyStepSidebar({
  steps, currentStep, onStepClick, completedSteps, children,
}: PartyStepSidebarProps) {
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
