/**
 * @file src/pages/erp/qulicheak/IqcEntryPage.tsx
 * @purpose Wraps QCEntryPage with ViewModeSelector for 3 IQC variants (Standard/Sample/Pre-Dispatch)
 * @sprint T-Phase-1.A.5.c-Qulicheak-Welder-Vendor-ISO-IQC
 * @decisions D-NEW-BQ (IqcEntryPage NEW wrap pattern · QCEntryPage zero-touch preserved)
 * @reuses QCEntryPage (53-protected · zero functional change) · ViewModeSelector (existing canonical)
 * @disciplines FR-19 (sibling · QCEntryPage zero-touch) · FR-58 (Shell pattern)
 */
import { useState } from 'react';
import { QCEntryPage } from '@/pages/erp/qulicheak/QCEntryPage';
import { ViewModeSelector } from '@/components/ViewModeSelector';

type IqcVariant = 'standard' | 'sample' | 'pre_dispatch';

const VARIANT_OPTIONS = [
  { id: 'standard' as const, label: 'Standard IQC', tooltip: 'Full inward inspection per quality plan' },
  { id: 'sample' as const, label: 'Sample Inspection', tooltip: 'Statistical sampling per AQL · partial check' },
  { id: 'pre_dispatch' as const, label: 'Pre-Dispatch QC', tooltip: 'Outbound finished-goods QC before shipment' },
];

const VARIANT_DESCRIPTIONS: Record<IqcVariant, string> = {
  standard: 'Standard incoming quality check · entire lot inspected per spec.',
  sample: 'Sample inspection · pull n units per AQL · accept/reject the lot.',
  pre_dispatch: 'Pre-dispatch quality check · finished goods verified before shipment.',
};

export function IqcEntryPage(): JSX.Element {
  const [variant, setVariant] = useState<IqcVariant>('standard');

  return (
    <div className="space-y-2">
      <div className="px-6 pt-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">IQC Entry</h1>
          <p className="text-sm text-muted-foreground mt-1">{VARIANT_DESCRIPTIONS[variant]}</p>
        </div>
        <ViewModeSelector<IqcVariant>
          value={variant}
          onChange={setVariant}
          options={VARIANT_OPTIONS}
          storageKey="qulicheak.iqc.variant"
          label="Mode"
        />
      </div>
      <QCEntryPage inspectionId="" onBack={() => { /* IQC wrap · no parent stack */ }} />
    </div>
  );
}
