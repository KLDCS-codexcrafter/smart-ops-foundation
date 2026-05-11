/**
 * @file        src/pages/erp/maintainpro/reports/CalibrationStatusReport.tsx
 * @purpose     TDL Calibration master report · 30/60/90 due buckets · quarantine flag · FR-42
 * @sprint      T-Phase-1.A.16c · Block B.2 · NEW
 */
import { useMemo } from 'react';
import { listCalibrationInstruments, isCalibrationInstrumentQuarantined } from '@/lib/maintainpro-engine';
import { MaintainProReportShell } from '@/components/maintainpro/MaintainProReportShell';

const E = 'DEMO';

export function CalibrationStatusReport(): JSX.Element {
  const rows = useMemo(() => {
    const now = Date.now();
    return listCalibrationInstruments(E).map((c) => {
      const due = new Date(c.due_date).getTime();
      const days = Math.floor((due - now) / 86400000);
      const bucket = days < 0 ? 'Overdue' : days <= 30 ? '0–30 days' : days <= 60 ? '31–60 days' : days <= 90 ? '61–90 days' : '>90 days';
      return { ...c, days, bucket, quarantined: isCalibrationInstrumentQuarantined(E, c.id) };
    }).sort((a, b) => a.days - b.days);
  }, []);

  return (
    <MaintainProReportShell title="Calibration Status Report" ssotBadge="TDL · FR-42">
      <table className="w-full text-sm">
        <thead className="text-left text-muted-foreground">
          <tr><th className="p-2">Instrument</th><th className="p-2">Range</th><th className="p-2">Accuracy</th><th className="p-2">Calibrated On</th><th className="p-2">Due</th><th className="p-2">Bucket</th><th className="p-2">Status</th></tr>
        </thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan={7} className="p-4 text-center text-muted-foreground">No instruments</td></tr>}
          {rows.map((r) => (
            <tr key={r.id} className="border-t">
              <td className="p-2 font-mono text-xs">{r.instrument_code} · {r.test_equipment}</td>
              <td className="p-2">{r.range}</td>
              <td className="p-2">{r.accuracy}</td>
              <td className="p-2 font-mono text-xs">{r.calibrated_on}</td>
              <td className="p-2 font-mono text-xs">{r.due_date}</td>
              <td className="p-2">{r.bucket}</td>
              <td className="p-2">{r.quarantined ? <span className="text-destructive">Quarantined</span> : r.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </MaintainProReportShell>
  );
}

export default CalibrationStatusReport;
