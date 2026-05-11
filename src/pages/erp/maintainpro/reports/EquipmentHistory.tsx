/**
 * @file        src/pages/erp/maintainpro/reports/EquipmentHistory.tsx
 * @purpose     TDL Equipment Day Book · chronological event timeline per equipment · FR-42
 * @sprint      T-Phase-1.A.16c · Block B.4 · NEW
 */
import { useMemo, useState } from 'react';
import {
  listEquipment, listBreakdownReports, listWorkOrders,
  listPMTickoffs, listSparesIssues, listCalibrationCertificates,
} from '@/lib/maintainpro-engine';
import { MaintainProReportShell } from '@/components/maintainpro/MaintainProReportShell';

const E = 'DEMO';

interface TimelineEvent { key: string; at: string; kind: string; detail: string }

export function EquipmentHistory(): JSX.Element {
  const equipment = useMemo(() => listEquipment(E), []);
  const [selected, setSelected] = useState<string>(equipment[0]?.id ?? '');

  const events = useMemo<TimelineEvent[]>(() => {
    if (!selected) return [];
    const ev: TimelineEvent[] = [];
    listBreakdownReports(E).filter((b) => b.equipment_id === selected).forEach((b) => ev.push({ key: `b-${b.id}`, at: b.occurred_at, kind: 'Breakdown', detail: `${b.severity} · ${b.nature_of_complaint}` }));
    listWorkOrders(E).filter((w) => w.equipment_id === selected).forEach((w) => ev.push({ key: `w-${w.id}`, at: w.created_at, kind: 'Work Order', detail: `${w.wo_type} · ${w.status}` }));
    listPMTickoffs(E).filter((p) => p.equipment_id === selected).forEach((p) => ev.push({ key: `p-${p.id}`, at: p.actual_completion_date, kind: 'PM', detail: `${p.duration_minutes}m · ${p.status}` }));
    listSparesIssues(E).filter((s) => s.consuming_equipment_id === selected).forEach((s) => ev.push({ key: `s-${s.id}`, at: s.issued_at, kind: 'Spare Issue', detail: `qty ${s.qty} · ₹${s.total_cost}` }));
    listCalibrationCertificates(E).filter((c) => c.instrument_id === selected).forEach((c) => ev.push({ key: `c-${c.id}`, at: c.calibrated_on, kind: 'Calibration', detail: `${c.is_pass ? 'PASS' : 'FAIL'}` }));
    return ev.sort((a, b) => (a.at < b.at ? 1 : -1));
  }, [selected]);

  return (
    <MaintainProReportShell
      title="Equipment History"
      ssotBadge="TDL · FR-42"
      filters={
        <select className="border rounded px-2 py-1 text-sm bg-background" value={selected} onChange={(e) => setSelected(e.target.value)}>
          {equipment.length === 0 && <option value="">No equipment</option>}
          {equipment.map((eq) => <option key={eq.id} value={eq.id}>{eq.equipment_code} · {eq.equipment_name}</option>)}
        </select>
      }
    >
      <table className="w-full text-sm">
        <thead className="text-left text-muted-foreground">
          <tr><th className="p-2">Date</th><th className="p-2">Event</th><th className="p-2">Detail</th></tr>
        </thead>
        <tbody>
          {events.length === 0 && <tr><td colSpan={3} className="p-4 text-center text-muted-foreground">No events</td></tr>}
          {events.map((e) => (
            <tr key={e.key} className="border-t">
              <td className="p-2 font-mono text-xs">{e.at.slice(0, 10)}</td>
              <td className="p-2">{e.kind}</td>
              <td className="p-2">{e.detail}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </MaintainProReportShell>
  );
}

export default EquipmentHistory;
