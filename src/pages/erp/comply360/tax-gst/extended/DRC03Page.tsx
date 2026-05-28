/**
 * @file Sprint 75 · DRC-03 (Voluntary payment / demand settlement) surface
 */
import ExtendedFormShell from './ExtendedFormShell';
import { buildDRC03 } from '@/lib/comply360-gstr-builder-engine';

export default function DRC03Page(): JSX.Element {
  return (
    <ExtendedFormShell
      title="Voluntary Payment / Demand Settlement"
      description="Form DRC-03 · voluntary tax payment or SCN settlement · Rule 142(2)/(3)"
      formCode="DRC-03"
      fileTag="DRC03"
      periodKind="none"
      build={({ gstin, refreshTick }) => {
        void refreshTick;
        return buildDRC03(
          { igst: 0, cgst: 0, sgst: 0, cess: 0, interest: 0, penalty: 0 },
          { gstin, cause: 'voluntary', payment_date: '2026-04-15' },
        );
      }}
    />
  );
}
