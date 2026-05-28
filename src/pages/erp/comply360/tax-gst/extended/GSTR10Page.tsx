/**
 * @file Sprint 75 · GSTR-10 (Final return on cancellation) surface
 */
import ExtendedFormShell from './ExtendedFormShell';
import { aggregateInwardSupplies } from '@/lib/comply360-gst-aggregator-engine';
import { buildGSTR10 } from '@/lib/comply360-gstr-builder-engine';

export default function GSTR10Page(): JSX.Element {
  return (
    <ExtendedFormShell
      title="Final Return on Cancellation"
      description="Final return filed on cancellation of GST registration · Section 45"
      formCode="GSTR-10"
      fileTag="GSTR10"
      periodKind="none"
      build={({ entityId, gstin, refreshTick }) => {
        void refreshTick;
        const closingStock = aggregateInwardSupplies({ entity_id: entityId, gstin, fy: 'FY2024-25', return_period: '03-2026' });
        return buildGSTR10(closingStock, {
          gstin,
          cancellation_order_no: 'CNCL/PLACEHOLDER',
          cancellation_date: '2026-03-31',
          effective_date: '2026-04-01',
        });
      }}
    />
  );
}
