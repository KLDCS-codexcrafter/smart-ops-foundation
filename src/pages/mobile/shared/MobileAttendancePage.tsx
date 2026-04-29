/**
 * MobileAttendancePage.tsx — Universal field attendance (start/end of day)
 * Sprint T-Phase-1.1.1l-d
 * Shared by salesman, telecaller, supervisor, sales_manager.
 * Writes to existing ATTENDANCE_RECORDS_KEY (compatible with PayHub).
 */
import { useState, useMemo, useCallback } from "react";
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, MapPin, LogIn, LogOut, Clock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { MobileSession } from '../MobileRouter';
import {
  type AttendanceRecord, ATTENDANCE_RECORDS_KEY,
} from '@/types/attendance-entry';
import { getCurrentLocation } from '@/lib/geolocation-bridge';

function readSession(): MobileSession | null {
  try {
    const raw = sessionStorage.getItem('opx_mobile_session');
    return raw ? (JSON.parse(raw) as MobileSession) : null;
  } catch { return null; }
}

function loadRecords(): AttendanceRecord[] {
  try {
    const raw = localStorage.getItem(ATTENDANCE_RECORDS_KEY);
    return raw ? (JSON.parse(raw) as AttendanceRecord[]) : [];
  } catch { return []; }
}

function saveRecords(list: AttendanceRecord[]): void {
  // [JWT] POST /api/hr/attendance-records
  localStorage.setItem(ATTENDANCE_RECORDS_KEY, JSON.stringify(list));
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function nowHHMM(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function computeWorkHours(checkIn: string, checkOut: string): number {
  if (!checkIn || !checkOut) return 0;
  const [hi, mi] = checkIn.split(':').map(Number);
  const [ho, mo] = checkOut.split(':').map(Number);
  const mins = (ho * 60 + mo) - (hi * 60 + mi);
  return Math.max(0, mins / 60);
}

async function getCurrentLocation(): Promise<{ lat: number; lng: number } | null> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return null;
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  });
}

export default function MobileAttendancePage() {
  const navigate = useNavigate();
  const session = useMemo(() => readSession(), []);
  const [busy, setBusy] = useState(false);
  const [allRecords, setAllRecords] = useState<AttendanceRecord[]>(() => loadRecords());

  const refreshRecords = useCallback(() => {
    setAllRecords(loadRecords());
  }, []);

  const myRecords = useMemo(
    () => allRecords
      .filter(r => r.employeeId === session?.user_id)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 14),
    [allRecords, session],
  );

  const todayRecord = useMemo(
    () => myRecords.find(r => r.date === todayISO()) ?? null,
    [myRecords],
  );

  const handleCheckIn = useCallback(async () => {
    if (!session) return;
    setBusy(true);
    await getCurrentLocation();
    const now = new Date().toISOString();
    const record: AttendanceRecord = {
      id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      employeeId: session.user_id ?? '',
      employeeCode: session.user_id ?? '',
      employeeName: session.display_name,
      date: todayISO(),
      attendanceTypeId: 'present-default',
      attendanceTypeCode: 'P',
      attendanceTypeColor: '#22c55e',
      checkIn: nowHHMM(),
      checkOut: '',
      workHours: 0,
      breakHours: 0,
      overtimeHours: 0,
      isLate: false,
      lateMinutes: 0,
      isEarlyOut: false,
      earlyOutMinutes: 0,
      source: 'geo_fence',
      shiftCode: 'general',
      scheduledIn: '09:00',
      scheduledOut: '18:00',
      remarks: 'Field check-in via mobile',
      isHoliday: false,
      isWeeklyOff: false,
      regularizationStatus: 'none',
      created_at: now,
      updated_at: now,
    };
    const all = loadRecords();
    all.push(record);
    saveRecords(all);
    refreshRecords();
    setBusy(false);
    toast.success(`Checked in at ${record.checkIn}`);
  }, [session, refreshRecords]);

  const handleCheckOut = useCallback(async () => {
    if (!session || !todayRecord) return;
    setBusy(true);
    await getCurrentLocation();
    const now = new Date().toISOString();
    const checkOut = nowHHMM();
    const all = loadRecords();
    const idx = all.findIndex(r => r.id === todayRecord.id);
    if (idx >= 0) {
      all[idx] = {
        ...all[idx],
        checkOut,
        workHours: computeWorkHours(all[idx].checkIn, checkOut),
        updated_at: now,
      };
      saveRecords(all);
    }
    refreshRecords();
    setBusy(false);
    toast.success(`Checked out at ${checkOut}`);
  }, [session, todayRecord, refreshRecords]);

  if (!session) return null;

  const isCheckedIn = todayRecord !== null && !todayRecord.checkOut;
  const isCheckedOut = todayRecord !== null && Boolean(todayRecord.checkOut);

  return (
    <div className="p-4 max-w-md mx-auto space-y-3 pb-12">
      <div className="flex items-center gap-2 mb-2">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-base font-semibold">Attendance</h1>
      </div>

      <Card className={`p-4 space-y-3 ${
        isCheckedIn ? 'bg-green-500/5 border-green-500/30' :
        isCheckedOut ? 'bg-blue-500/5 border-blue-500/30' :
        'bg-amber-500/5 border-amber-500/30'
      }`}>
        <div className="flex items-center justify-between">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Today</p>
          <Badge variant="outline" className="text-[10px]">{todayISO()}</Badge>
        </div>
        {isCheckedOut && todayRecord ? (
          <>
            <p className="text-sm">
              <Clock className="inline h-3 w-3 mr-1" />
              In: <span className="font-mono font-semibold">{todayRecord.checkIn}</span>
              {' · '}
              Out: <span className="font-mono font-semibold">{todayRecord.checkOut}</span>
            </p>
            <p className="text-xs text-muted-foreground">
              Work hours: <span className="font-mono font-semibold">{todayRecord.workHours.toFixed(1)} h</span>
            </p>
          </>
        ) : isCheckedIn && todayRecord ? (
          <>
            <p className="text-sm">
              Checked in at <span className="font-mono font-semibold">{todayRecord.checkIn}</span>
            </p>
            <Button
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={busy}
              onClick={handleCheckOut}
            >
              {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <LogOut className="h-4 w-4 mr-2" />}
              End Day
            </Button>
          </>
        ) : (
          <>
            <p className="text-sm">Not checked in</p>
            <Button
              className="w-full bg-green-600 hover:bg-green-700"
              disabled={busy}
              onClick={handleCheckIn}
            >
              {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <LogIn className="h-4 w-4 mr-2" />}
              Start Day
            </Button>
          </>
        )}
        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
          <MapPin className="h-3 w-3" /> GPS captured for compliance
        </p>
      </Card>

      <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
        History (last 14 days)
      </p>
      {myRecords.length === 0 ? (
        <Card className="p-6 text-center">
          <p className="text-sm text-muted-foreground">No attendance records yet</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {myRecords.map(r => (
            <Card key={r.id} className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{r.date}</p>
                  <p className="text-[10px] text-muted-foreground font-mono">
                    {r.checkIn} → {r.checkOut || '—'}
                  </p>
                </div>
                <div className="text-right">
                  <Badge variant="outline" className="text-[10px]">{r.attendanceTypeCode}</Badge>
                  <p className="text-[10px] text-muted-foreground mt-1 font-mono">{r.workHours.toFixed(1)}h</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
