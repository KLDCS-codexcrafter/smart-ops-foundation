/**
 * @file Sprint 76b · ITC-04 job-work challan surface · consumes Pass A buildITC04.
 * @sprint Sprint 76b · T-Phase-5.A.1.8-PASS-B · Block 5
 */
import ExtendedFormShell from './ExtendedFormShell';
import { buildITC04, type JobWorkChallan } from '@/lib/comply360-gstr-builder-engine';

const SAMPLE_CHALLANS: JobWorkChallan[] = [
  {
    challan_no: 'JW/2026/0001', challan_date: '2026-04-12',
    job_worker_gstin: '27ABCDE1234F1Z5',
    hsn_code: '7308', description: 'MS fabrication parts',
    qty_sent: 500, qty_received: 480, uom: 'KG', taxable_value: 125000,
  },
  {
    challan_no: 'JW/2026/0002', challan_date: '2026-04-20',
    hsn_code: '8483', description: 'Shaft turning',
    qty_sent: 120, qty_received: 120, uom: 'NOS', taxable_value: 54000,
  },
];

export default function ITC04Page(): JSX.Element {
  return (
    <ExtendedFormShell
      title="Job-work Challan Return"
      description="Half-yearly statement of goods sent to / received from job-workers · Rule 45"
      formCode="ITC-04"
      fileTag="ITC04"
      periodKind="period"
      build={({ gstin, fy, period, refreshTick }) => {
        void refreshTick;
        return buildITC04(SAMPLE_CHALLANS, { gstin, fy, return_period: period });
      }}
    />
  );
}
