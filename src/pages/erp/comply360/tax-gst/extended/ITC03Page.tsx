/**
 * @file Sprint 75 · ITC-03 (ITC reversal) surface
 */
import ExtendedFormShell from './ExtendedFormShell';
import { aggregateInwardSupplies } from '@/lib/comply360-gst-aggregator-engine';
import { buildITC03 } from '@/lib/comply360-gstr-builder-engine';

export default function ITC03Page(): JSX.Element {
  return (
    <ExtendedFormShell
      title="ITC Reversal"
      description="ITC reversal on composition opt-in or exempt-supply switch · Rule 44"
      formCode="ITC-03"
      fileTag="ITC03"
      periodKind="fy"
      build={({ entityId, gstin, fy, refreshTick }) => {
        void refreshTick;
        const reversed = aggregateInwardSupplies({ entity_id: entityId, gstin, fy: `FY${fy}`, return_period: '04-2025' });
        return buildITC03(reversed, { gstin, fy, reason: 'composition_optin' });
      }}
    />
  );
}
