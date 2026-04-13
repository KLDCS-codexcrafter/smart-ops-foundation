/** attendance-entry.ts — Sprint 5 Attendance types */

// ── AttendanceRecord ──────────────────────────────────────────────
export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  date: string;                  // YYYY-MM-DD
  attendanceTypeId: string;
  attendanceTypeCode: string;    // P / A / HD / WFH / OD / OT / CO
  attendanceTypeColor: string;   // hex, from erp_attendance_types
  checkIn: string;               // HH:MM  (empty string if not applicable)
  checkOut: string;
  workHours: number;             // computed: checkout - checkin - breakHours
  breakHours: number;
  overtimeHours: number;
  isLate: boolean;
  lateMinutes: number;
  isEarlyOut: boolean;
  earlyOutMinutes: number;
  source: 'manual' | 'biometric' | 'geo_fence' | 'web';
  shiftCode: string;
  scheduledIn: string;           // from shift master
  scheduledOut: string;
  remarks: string;
  isHoliday: boolean;
  isWeeklyOff: boolean;
  regularizationStatus: 'none' | 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
}

// ── RegularizationRequest ─────────────────────────────────────────
export interface RegularizationRequest {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  date: string;
  originalCheckIn: string;
  originalCheckOut: string;
  requestedCheckIn: string;
  requestedCheckOut: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy: string;
  reviewRemarks: string;
  created_at: string;
  updated_at: string;
}

// ── GeoFence ─────────────────────────────────────────────────────
export interface GeoFence {
  id: string;
  name: string;
  location: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  isActive: boolean;
  created_at: string;
  updated_at: string;
}

export const ATTENDANCE_RECORDS_KEY      = 'erp_attendance_records';
export const REGULARIZATION_KEY          = 'erp_regularization_requests';
export const GEO_FENCES_KEY              = 'erp_geo_fences';

// ── Biometric parsed punch ────────────────────────────────────────
export interface BiometricPunch {
  rawLine: string;
  employeeCode: string;
  date: string;           // YYYY-MM-DD
  time: string;           // HH:MM
  parseOk: boolean;
  parseError?: string;
}

export interface BiometricDaySummary {
  employeeCode: string;
  date: string;
  checkIn: string;        // earliest punch
  checkOut: string;       // latest punch
  punchCount: number;
  employeeFound: boolean;
  employeeId: string;
  employeeName: string;
}
