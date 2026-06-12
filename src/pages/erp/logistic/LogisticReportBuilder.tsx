/**
 * @file        LogisticReportBuilder.tsx
 * @sprint      RPT-9c · Builder Rollout — Ops Cards · Logistic route-mode mount
 * @purpose     Wraps the frozen <ReportBuilder cardId="logistics" /> inside LogisticLayout.
 *              Logistic is the transporter portal — route-driven (mirrors PayOut RPT-9b pattern).
 *              ZERO edits to ReportBuilder; additive route only.
 */
import { LogisticLayout } from '@/features/logistic/LogisticLayout';
import ReportBuilder from '@/components/operix-core/report-framework/ReportBuilder';

export default function LogisticReportBuilder() {
  return (
    <LogisticLayout title="Report Builder" subtitle="Build your own report on transporter data">
      <ReportBuilder cardId="logistics" />
    </LogisticLayout>
  );
}
