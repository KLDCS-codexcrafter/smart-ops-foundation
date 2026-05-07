/**
 * @file     PassFailLogicSelector.tsx
 * @sprint   T-Phase-1.3-3b-pre-2 · Block G · D-632
 * @purpose  Q54=a polymorphic Pass/Fail mode selector (reuses ViewModeSelector).
 */
import { ViewModeSelector } from '@/components/ViewModeSelector';
import { CheckCircle2, BarChart2, ShieldAlert } from 'lucide-react';
import type { PassFailMode } from '@/types/qc-entry-mode';

export interface PassFailLogicSelectorProps {
  value: PassFailMode;
  onChange: (mode: PassFailMode) => void;
}

export function PassFailLogicSelector({ value, onChange }: PassFailLogicSelectorProps): JSX.Element {
  return (
    <ViewModeSelector<PassFailMode>
      value={value}
      onChange={onChange}
      storageKey="qc_passfail_mode"
      label="Logic:"
      options={[
        { id: 'per_param_and', label: 'All-Must-Pass (AND)', tooltip: 'STRICT · any failed line = overall FAIL · use for critical inspections', icon: ShieldAlert },
        { id: 'weighted_score', label: 'Weighted Score', tooltip: 'Critical params weighted 2x · pass if score ≥ 80%', icon: BarChart2 },
        { id: 'per_param_or', label: 'Any-Pass (OR)', tooltip: 'LENIENT · any passed line = overall PASS · for non-critical sample inspections', icon: CheckCircle2 },
      ]}
    />
  );
}
