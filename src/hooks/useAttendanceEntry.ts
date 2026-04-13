/**
 * useAttendanceEntry.ts — Sprint 5 Attendance hooks
 * [JWT] GET/POST/PUT /api/pay-hub/attendance
 */
import { useState } from 'react';
import { toast } from 'sonner';
import type { AttendanceRecord, RegularizationRequest, GeoFence,
  BiometricPunch, BiometricDaySummary } from '@/types/attendance-entry';
import { ATTENDANCE_RECORDS_KEY, REGULARIZATION_KEY, GEO_FENCES_KEY } from '@/types/attendance-entry';

// ── Loaders ───────────────────────────────────────────────────────
const loadRecords = (): AttendanceRecord[] => {
  try {
    // [JWT] GET /api/pay-hub/attendance/records
    const raw = localStorage.getItem(ATTENDANCE_RECORDS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [];
};
const saveRecords = (items: AttendanceRecord[]) => {
  // [JWT] PUT /api/pay-hub/attendance/records
  localStorage.setItem(ATTENDANCE_RECORDS_KEY, JSON.stringify(items));
};

const loadRegularizations = (): RegularizationRequest[] => {
  try {
    // [JWT] GET /api/pay-hub/attendance/regularizations
    const raw = localStorage.getItem(REGULARIZATION_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [];
};
const saveRegularizations = (items: RegularizationRequest[]) => {
  // [JWT] PUT /api/pay-hub/attendance/regularizations
  localStorage.setItem(REGULARIZATION_KEY, JSON.stringify(items));
};

const loadGeoFences = (): GeoFence[] => {
  try {
    // [JWT] GET /api/pay-hub/attendance/geo-fences
    const raw = localStorage.getItem(GEO_FENCES_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [];
};
const saveGeoFences = (items: GeoFence[]) => {
  // [JWT] PUT /api/pay-hub/attendance/geo-fences
  localStorage.setItem(GEO_FENCES_KEY, JSON.stringify(items));
};

// ── Geo-fence math (Haversine) ────────────────────────────────────
export function isWithinGeoFence(
  location: { lat: number; lng: number },
  center: { lat: number; lng: number },
  radiusMeters: number
): boolean {
  const R = 6371e3;
  const φ1 = (location.lat * Math.PI) / 180;
  const φ2 = (center.lat * Math.PI) / 180;
  const Δφ = ((center.lat - location.lat) * Math.PI) / 180;
  const Δλ = ((center.lng - location.lng) * Math.PI) / 180;
  const a = Math.sin(Δφ/2)**2 + Math.cos(φ1)*Math.cos(φ2)*Math.sin(Δλ/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)) <= radiusMeters;
}

// ── Biometric file parser ─────────────────────────────────────────
// Handles common ZKTeco / TDL-05 formats:
//   "EMP001  20250115  0902"            space/tab separated
//   "EMP001  2025-01-15  09:02:34"      with dashes and seconds
//   "1234  2025-01-15 09:02:34  1  0"   with extra columns
export function parseBiometricFile(content: string): BiometricPunch[] {
  const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);
  return lines.map(rawLine => {
    try {
      const parts = rawLine.trim().split(/[\s\t]+/).filter(Boolean);
      if (parts.length < 2) return null;

      const empCode = parts[0].toUpperCase().trim();

      // Find date part: look for 8-digit YYYYMMDD or YYYY-MM-DD pattern
      let dateStr = '';
      let timeStr = '';
      for (let i = 1; i < parts.length; i++) {
        const p = parts[i].replace(/-/g, '');
        if (/^\d{8}$/.test(p) && !dateStr) {
          dateStr = `${p.slice(0,4)}-${p.slice(4,6)}-${p.slice(6,8)}`;
        } else if (/^\d{4,6}$/.test(parts[i].replace(/:/g,'')) && !timeStr) {
          const t = parts[i].replace(/:/g,'').slice(0,4);
          timeStr = `${t.slice(0,2)}:${t.slice(2,4)}`;
        }
      }

      // Also handle "2025-01-15 09:02:34" as two separate tokens
      if (!dateStr) {
        const datePart = parts.find(p => /^\d{4}-\d{2}-\d{2}$/.test(p));
        if (datePart) dateStr = datePart;
      }
      if (!timeStr) {
        const timePart = parts.find(p => /^\d{2}:\d{2}(:\d{2})?$/.test(p));
        if (timePart) timeStr = timePart.slice(0,5);
      }

      if (!dateStr || !timeStr || !empCode) {
        return { rawLine, employeeCode: empCode, date: '', time: '', parseOk: false,
          parseError: 'Could not parse date or time' };
      }

      return { rawLine, employeeCode: empCode, date: dateStr, time: timeStr, parseOk: true };
    } catch {
      return { rawLine, employeeCode: '', date: '', time: '', parseOk: false, parseError: 'Parse error' };
    }
  }).filter((p): p is BiometricPunch => p !== null);
}

// ── Group punches into day summaries ─────────────────────────────
export function groupBiometricPunches(
  punches: BiometricPunch[],
  employees: { id: string; empCode: string; displayName: string }[]
): BiometricDaySummary[] {
  // Group by empCode + date
  const map = new Map<string, BiometricPunch[]>();
  punches.filter(p => p.parseOk).forEach(p => {
    const key = `${p.employeeCode}__${p.date}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(p);
  });

  return Array.from(map.entries()).map(([key, ps]) => {
    const sorted = ps.slice().sort((a,b) => a.time.localeCompare(b.time));
    const [empCode, date] = key.split('__');
    const emp = employees.find(e => e.empCode === empCode
      || e.empCode.replace(/^0+/,'') === empCode.replace(/^0+/,''));
    return {
      employeeCode: empCode, date,
      checkIn: sorted[0].time,
      checkOut: sorted.length > 1 ? sorted[sorted.length-1].time : '',
      punchCount: sorted.length,
      employeeFound: !!emp,
      employeeId: emp?.id || '',
      employeeName: emp?.displayName || '(not found)',
    };
  });
}

// ── Work hours computation ────────────────────────────────────────
export function computeWorkHours(
  checkIn: string, checkOut: string, breakHours: number = 1
): number {
  if (!checkIn || !checkOut) return 0;
  const [ih, im] = checkIn.split(':').map(Number);
  const [oh, om] = checkOut.split(':').map(Number);
  let totalMins = (oh * 60 + om) - (ih * 60 + im);
  if (totalMins < 0) totalMins += 24 * 60; // overnight
  return Math.max(0, Math.round((totalMins / 60 - breakHours) * 100) / 100);
}

// ── Late / Early out computation ─────────────────────────────────
export function computeLate(
  checkIn: string, scheduledIn: string, graceMinutes: number
): { isLate: boolean; lateMinutes: number } {
  if (!checkIn || !scheduledIn) return { isLate: false, lateMinutes: 0 };
  const [ih, im] = checkIn.split(':').map(Number);
  const [sh, sm] = scheduledIn.split(':').map(Number);
  const diff = (ih * 60 + im) - (sh * 60 + sm);
  const lateMinutes = Math.max(0, diff - graceMinutes);
  return { isLate: lateMinutes > 0, lateMinutes };
}

// ── Main hook ─────────────────────────────────────────────────────
export function useAttendanceEntry() {
  const [records, setRecords] = useState<AttendanceRecord[]>(loadRecords);
  const [regularizations, setRegularizations] = useState<RegularizationRequest[]>(loadRegularizations);
  const [geoFences, setGeoFences] = useState<GeoFence[]>(loadGeoFences);

  // ── Attendance record CRUD ───────────────────────────────────
  const upsertRecord = (rec: AttendanceRecord) => {
    const all = loadRecords();
    const existing = all.findIndex(r => r.employeeId === rec.employeeId && r.date === rec.date);
    const updated = existing >= 0
      ? all.map((r,i) => i === existing ? { ...rec, updated_at: new Date().toISOString() } : r)
      : [...all, rec];
    setRecords(updated); saveRecords(updated);
    // [JWT] PUT /api/pay-hub/attendance/records
  };

  const upsertMany = (recs: AttendanceRecord[]) => {
    const all = loadRecords();
    const map = new Map(all.map(r => [`${r.employeeId}__${r.date}`, r]));
    recs.forEach(r => map.set(`${r.employeeId}__${r.date}`, { ...r, updated_at: new Date().toISOString() }));
    const updated = Array.from(map.values());
    setRecords(updated); saveRecords(updated);
    toast.success(`${recs.length} attendance record${recs.length !== 1 ? 's' : ''} saved`);
    // [JWT] POST /api/pay-hub/attendance/records/bulk
  };

  const getByDate = (date: string) =>
    records.filter(r => r.date === date);

  // ── Regularization CRUD ──────────────────────────────────────
  const createRegularization = (form: Omit<RegularizationRequest,"id"|"created_at"|"updated_at">) => {
    const now = new Date().toISOString();
    const item: RegularizationRequest = { ...form, id: `reg-${Date.now()}`, created_at: now, updated_at: now };
    const all = loadRegularizations();
    const updated = [...all, item];
    setRegularizations(updated); saveRegularizations(updated);
    toast.success('Regularization request created');
    // [JWT] POST /api/pay-hub/attendance/regularizations
  };

  const approveRegularization = (id: string, reviewedBy: string, remarks: string) => {
    const all = loadRegularizations();
    const updated = all.map(r => r.id === id
      ? { ...r, status: 'approved' as const, reviewedBy, reviewRemarks: remarks, updated_at: new Date().toISOString() }
      : r);
    setRegularizations(updated); saveRegularizations(updated);
    toast.success('Request approved');
    // [JWT] PATCH /api/pay-hub/attendance/regularizations/:id/approve
  };

  const rejectRegularization = (id: string, reviewedBy: string, remarks: string) => {
    const all = loadRegularizations();
    const updated = all.map(r => r.id === id
      ? { ...r, status: 'rejected' as const, reviewedBy, reviewRemarks: remarks, updated_at: new Date().toISOString() }
      : r);
    setRegularizations(updated); saveRegularizations(updated);
    toast.success('Request rejected');
    // [JWT] PATCH /api/pay-hub/attendance/regularizations/:id/reject
  };

  // ── Geo-fence CRUD ───────────────────────────────────────────
  const createGeoFence = (form: Omit<GeoFence,"id"|"created_at"|"updated_at">) => {
    const now = new Date().toISOString();
    const item: GeoFence = { ...form, id: `gf-${Date.now()}`, created_at: now, updated_at: now };
    const all = loadGeoFences();
    const updated = [...all, item];
    setGeoFences(updated); saveGeoFences(updated);
    toast.success(`Geo-fence '${item.name}' created`);
    // [JWT] POST /api/pay-hub/attendance/geo-fences
  };

  const updateGeoFence = (id: string, patch: Partial<GeoFence>) => {
    const all = loadGeoFences();
    const updated = all.map(g => g.id === id ? { ...g, ...patch, updated_at: new Date().toISOString() } : g);
    setGeoFences(updated); saveGeoFences(updated);
    toast.success('Geo-fence updated');
  };

  const toggleGeoFence = (id: string) => {
    const g = geoFences.find(x => x.id === id);
    if (g) updateGeoFence(id, { isActive: !g.isActive });
  };

  return {
    records, regularizations, geoFences,
    upsertRecord, upsertMany, getByDate,
    createRegularization, approveRegularization, rejectRegularization,
    createGeoFence, updateGeoFence, toggleGeoFence,
  };
}
