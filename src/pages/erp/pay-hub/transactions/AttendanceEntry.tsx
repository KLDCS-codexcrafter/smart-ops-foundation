/**
 * AttendanceEntry.tsx — Sprint 5
 * 4-tab screen: Daily Entry · Biometric Import · Regularization · Geo-Fence Config
 */
import React, { useState, useMemo, useCallback, useRef } from 'react';
import { format } from 'date-fns';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { SmartDateInput } from '@/components/ui/smart-date-input';
import { UserCheck, Upload, RotateCcw, MapPin, Plus, Search, Check, X, ChevronLeft, ChevronRight, Download, AlertTriangle, Save } from 'lucide-react';
import { toast } from 'sonner';
import { useAttendanceEntry, parseBiometricFile, groupBiometricPunches,
  computeWorkHours, computeLate } from '@/hooks/useAttendanceEntry';
import type { AttendanceRecord, BiometricDaySummary, GeoFence } from '@/types/attendance-entry';
import type { Employee } from '@/types/employee';
import type { AttendanceType, Shift, HolidayCalendar } from '@/types/payroll-masters';
import { EMPLOYEES_KEY } from '@/types/employee';
import { ATTENDANCE_TYPES_KEY, SHIFTS_KEY, HOLIDAY_CALENDARS_KEY } from '@/types/payroll-masters';
import { onEnterNext, useCtrlS } from '@/lib/keyboard';

export function AttendanceEntryPanel() {
  const { records, regularizations, geoFences,
    upsertRecord: _upsertRecord, upsertMany, getByDate,
    createRegularization, approveRegularization, rejectRegularization,
    createGeoFence, updateGeoFence, toggleGeoFence } = useAttendanceEntry();

  // ── Cross-module reads ───────────────────────────────────────
  const activeEmployees = useMemo<Employee[]>(() => {
    try {
      // [JWT] GET /api/pay-hub/employees
      const raw = localStorage.getItem(EMPLOYEES_KEY);
      if (raw) return (JSON.parse(raw) as Employee[]).filter(e => e.status === 'active');
    } catch { /* ignore */ }
    return [];
  }, []);

  const attendanceTypes = useMemo<AttendanceType[]>(() => {
    try {
      // [JWT] GET /api/pay-hub/masters/attendance-types
      const raw = localStorage.getItem(ATTENDANCE_TYPES_KEY);
      if (raw) return (JSON.parse(raw) as AttendanceType[]).filter(t => t.status === 'active');
    } catch { /* ignore */ }
    return [];
  }, []);

  const shifts = useMemo<Shift[]>(() => {
    try {
      // [JWT] GET /api/pay-hub/masters/shifts
      const raw = localStorage.getItem(SHIFTS_KEY);
      if (raw) return JSON.parse(raw);
    } catch { /* ignore */ }
    return [];
  }, []);

  // Flatten holiday dates from all active HolidayCalendar objects
  const holidayDates = useMemo<Set<string>>(() => {
    try {
      // [JWT] GET /api/pay-hub/masters/holiday-calendars
      const raw = localStorage.getItem(HOLIDAY_CALENDARS_KEY);
      if (raw) {
        const cals: HolidayCalendar[] = JSON.parse(raw);
        const dates = cals
          .filter(c => c.status !== 'inactive')
          .flatMap(c => c.holidays.map(h => h.date));
        return new Set(dates);
      }
    } catch { /* ignore */ }
    return new Set<string>();
  }, []);

  // ── Daily Entry state ────────────────────────────────────────
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [deptFilter, setDeptFilter] = useState('all');
  const [empSearch, setEmpSearch] = useState('');

  // In-progress row edits: map of employeeId → partial AttendanceRecord
  const [rowEdits, setRowEdits] = useState<Record<string,Partial<AttendanceRecord>>>({});

  // Records already saved for selected date
  const savedForDate = useMemo(() => {
    const map = new Map<string, AttendanceRecord>();
    getByDate(selectedDate).forEach(r => map.set(r.employeeId, r));
    return map;
  }, [records, selectedDate]); // eslint-disable-line react-hooks/exhaustive-deps

  // Filtered employees for the grid
  const gridEmployees = useMemo(() => {
    return activeEmployees.filter(e => {
      const q = empSearch.toLowerCase();
      const matchSearch = !q || e.displayName.toLowerCase().includes(q) || e.empCode.toLowerCase().includes(q);
      const matchDept = deptFilter === 'all' || e.departmentId === deptFilter;
      return matchSearch && matchDept;
    });
  }, [activeEmployees, empSearch, deptFilter]);

  // Helper: get current row value for an employee
  const getRowVal = (empId: string) => ({
    ...(savedForDate.get(empId) || {}),
    ...(rowEdits[empId] || {}),
  });

  // Helper: update a field in the row edit buffer
  const setRowField = (empId: string, field: string, value: unknown) => {
    setRowEdits(prev => ({ ...prev, [empId]: { ...(prev[empId] || {}), [field]: value } }));
  };

  // Bulk mark all filtered employees
  const bulkMark = (typeCode: string) => {
    const type = attendanceTypes.find(t => t.code === typeCode);
    if (!type) return;
    const edits: Record<string,Partial<AttendanceRecord>> = {};
    gridEmployees.forEach(e => {
      edits[e.id] = { attendanceTypeCode: type.code, attendanceTypeId: type.id,
        attendanceTypeColor: type.color };
    });
    setRowEdits(prev => ({ ...prev, ...edits }));
    toast.success(`All employees marked as ${type.name}`);
  };

  // Save all edited rows for the selected date
  const saveDayAttendance = useCallback(() => {
    const now = new Date().toISOString();
    const toSave: AttendanceRecord[] = [];
    const dateIsHoliday = holidayDates.has(selectedDate);
    const dayName = format(new Date(selectedDate + 'T12:00:00'), 'EEEE');

    gridEmployees.forEach(emp => {
      const existing = savedForDate.get(emp.id);
      const edit = rowEdits[emp.id];
      if (!edit && existing) return; // no changes
      if (!edit && !existing) return; // never touched

      const merged = { ...(existing || {}), ...(edit || {}) };
      if (!merged.attendanceTypeCode) return; // not marked, skip

      const shift = shifts.find(s => s.code === emp.shiftCode)
        || shifts.find(s => s.status === 'active') || null;
      const isWeeklyOff = shift ? shift.weeklyOff.includes(dayName) : dayName === 'Sunday';

      const checkIn  = (merged.checkIn as string) || '';
      const checkOut = (merged.checkOut as string) || '';
      const wh = computeWorkHours(checkIn, checkOut, shift?.breakDuration ? shift.breakDuration/60 : 1);
      const { isLate, lateMinutes } = computeLate(
        checkIn, shift?.startTime || '', shift?.gracePeriodIn || 10);

      const rec: AttendanceRecord = {
        id: existing?.id || `att-${Date.now()}-${emp.id}`,
        employeeId: emp.id, employeeCode: emp.empCode, employeeName: emp.displayName,
        date: selectedDate,
        attendanceTypeId: (merged.attendanceTypeId as string) || '',
        attendanceTypeCode: (merged.attendanceTypeCode as string) || '',
        attendanceTypeColor: (merged.attendanceTypeColor as string) || '#6366f1',
        checkIn, checkOut,
        workHours: wh, breakHours: shift ? shift.breakDuration/60 : 1,
        overtimeHours: Math.max(0, wh - (shift?.fullDayHours || 8)),
        isLate, lateMinutes, isEarlyOut: false, earlyOutMinutes: 0,
        source: 'manual',
        shiftCode: emp.shiftCode || '',
        scheduledIn: shift?.startTime || '', scheduledOut: shift?.endTime || '',
        remarks: (merged.remarks as string) || '',
        isHoliday: dateIsHoliday, isWeeklyOff,
        regularizationStatus: 'none',
        created_at: existing?.created_at || now, updated_at: now,
      };
      toSave.push(rec);
    });

    if (toSave.length === 0) { toast.error('No changes to save'); return; }
    upsertMany(toSave);
    setRowEdits({});
  }, [gridEmployees, rowEdits, savedForDate, selectedDate, holidayDates, shifts, upsertMany]);

  // ── Biometric Import state ─────────────────────────────────────
  const [bioFile, setBioFile] = useState<File | null>(null);
  const [bioPunches, setBioPunches] = useState<BiometricDaySummary[]>([]);
  const [bioParseErrors, setBioParseErrors] = useState<number>(0);
  const [bioImporting, setBioImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleBioFile = useCallback((file: File) => {
    setBioFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const punches = parseBiometricFile(content);
      const errors = punches.filter(p => !p.parseOk).length;
      setBioParseErrors(errors);
      const summaries = groupBiometricPunches(punches, activeEmployees.map(emp => ({
        id: emp.id, empCode: emp.empCode, displayName: emp.displayName,
      })));
      setBioPunches(summaries);
      toast.success(`Parsed ${punches.length} lines: ${summaries.length} day-summaries, ${errors} errors`);
    };
    reader.readAsText(file);
  }, [activeEmployees]);

  const importBiometric = useCallback(() => {
    if (bioPunches.length === 0) return;
    setBioImporting(true);
    const now = new Date().toISOString();
    const recs: AttendanceRecord[] = bioPunches.filter(s => s.employeeFound).map(s => {
      const shift = shifts.find(sh => sh.status === 'active');
      const wh = computeWorkHours(s.checkIn, s.checkOut, shift?.breakDuration ? shift.breakDuration/60 : 1);
      const { isLate, lateMinutes } = computeLate(s.checkIn, shift?.startTime || '', shift?.gracePeriodIn || 10);
      const dateIsHoliday = holidayDates.has(s.date);
      const dayName = format(new Date(s.date + 'T12:00:00'), 'EEEE');
      const isWeeklyOff = shift ? shift.weeklyOff.includes(dayName) : dayName === 'Sunday';
      const pType = attendanceTypes.find(t => t.baseType === 'present') || attendanceTypes[0];

      return {
        id: `att-bio-${Date.now()}-${s.employeeId}`,
        employeeId: s.employeeId, employeeCode: s.employeeCode, employeeName: s.employeeName,
        date: s.date,
        attendanceTypeId: pType?.id || '', attendanceTypeCode: pType?.code || 'P',
        attendanceTypeColor: pType?.color || '#22c55e',
        checkIn: s.checkIn, checkOut: s.checkOut,
        workHours: wh, breakHours: shift ? shift.breakDuration/60 : 1,
        overtimeHours: Math.max(0, wh - (shift?.fullDayHours || 8)),
        isLate, lateMinutes, isEarlyOut: false, earlyOutMinutes: 0,
        source: 'biometric' as const,
        shiftCode: shift?.code || '', scheduledIn: shift?.startTime || '', scheduledOut: shift?.endTime || '',
        remarks: `Bio import: ${s.punchCount} punches`,
        isHoliday: dateIsHoliday, isWeeklyOff,
        regularizationStatus: 'none' as const,
        created_at: now, updated_at: now,
      };
    });

    upsertMany(recs);
    setBioImporting(false);
    setBioPunches([]);
    setBioFile(null);
  }, [bioPunches, shifts, holidayDates, attendanceTypes, upsertMany]);

  // ── Regularization state ───────────────────────────────────────
  const [regSheetOpen, setRegSheetOpen] = useState(false);
  const [regFilter, setRegFilter] = useState('all');
  const [regForm, setRegForm] = useState({
    employeeId: '', employeeCode: '', employeeName: '',
    date: '', originalCheckIn: '', originalCheckOut: '',
    requestedCheckIn: '', requestedCheckOut: '',
    reason: '', status: 'pending' as const, reviewedBy: '', reviewRemarks: '',
  });

  const filteredRegs = useMemo(() => {
    if (regFilter === 'all') return regularizations;
    return regularizations.filter(r => r.status === regFilter);
  }, [regularizations, regFilter]);

  const handleRegSave = useCallback(() => {
    if (!regSheetOpen) return;
    if (!regForm.employeeId || !regForm.date || !regForm.reason) {
      toast.error('Employee, date and reason are required'); return;
    }
    createRegularization(regForm);
    setRegSheetOpen(false);
  }, [regSheetOpen, regForm, createRegularization]);

  // ── Geo-fence state ────────────────────────────────────────────
  const [gfSheetOpen, setGfSheetOpen] = useState(false);
  const [gfEditId, setGfEditId] = useState<string | null>(null);
  const BLANK_GF = { name: '', location: '', latitude: 0, longitude: 0, radiusMeters: 200, isActive: true };
  const [gfForm, setGfForm] = useState(BLANK_GF);

  const handleGfSave = useCallback(() => {
    if (!gfSheetOpen) return;
    if (!gfForm.name.trim()) { toast.error('Fence name required'); return; }
    if (gfEditId) updateGeoFence(gfEditId, gfForm);
    else createGeoFence(gfForm);
    setGfSheetOpen(false);
  }, [gfSheetOpen, gfForm, gfEditId, createGeoFence, updateGeoFence]);

  // ── Master Ctrl+S ──────────────────────────────────────────────
  const masterSave = useCallback(() => {
    if (gfSheetOpen) { handleGfSave(); return; }
    if (regSheetOpen) { handleRegSave(); return; }
    saveDayAttendance();
  }, [gfSheetOpen, regSheetOpen, handleGfSave, handleRegSave, saveDayAttendance]);
  const isFormActive = true;
  useCtrlS(isFormActive ? masterSave : () => {});

  // ── Department list for filter ─────────────────────────────────
  const departments = useMemo(() => {
    const set = new Set(activeEmployees.map(e => e.departmentName).filter(Boolean));
    return Array.from(set).sort();
  }, [activeEmployees]);

  // ── Day stats ──────────────────────────────────────────────────
  const dayStats = useMemo(() => {
    let present = 0, absent = 0, halfDay = 0, wfhOd = 0, notMarked = 0;
    gridEmployees.forEach(emp => {
      const row = getRowVal(emp.id);
      const code = (row.attendanceTypeCode as string) || '';
      if (!code) { notMarked++; return; }
      const type = attendanceTypes.find(t => t.code === code);
      if (!type) { notMarked++; return; }
      switch (type.baseType) {
        case 'present': present++; break;
        case 'absent': absent++; break;
        case 'half_day': halfDay++; break;
        case 'work_from_home': case 'on_duty': wfhOd++; break;
        default: present++; break;
      }
    });
    return { present, absent, halfDay, wfhOd, notMarked };
  }, [gridEmployees, rowEdits, savedForDate, attendanceTypes]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Inline approve/reject remarks state ────────────────────────
  const [actionRegId, setActionRegId] = useState<string | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');
  const [actionRemarks, setActionRemarks] = useState('');

  // ── RENDER ─────────────────────────────────────────────────────
  return (
    <div className="space-y-4" data-keyboard-form>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <UserCheck className="h-6 w-6 text-violet-500" />
          <div>
            <h2 className="text-xl font-bold">Attendance Entry</h2>
            <p className="text-xs text-muted-foreground">Daily attendance, biometric import & regularization</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="daily">
        <TabsList>
          <TabsTrigger value="daily"><UserCheck className="h-3.5 w-3.5 mr-1.5" />Daily Entry</TabsTrigger>
          <TabsTrigger value="biometric"><Upload className="h-3.5 w-3.5 mr-1.5" />Biometric Import</TabsTrigger>
          <TabsTrigger value="regularization"><RotateCcw className="h-3.5 w-3.5 mr-1.5" />Regularization</TabsTrigger>
          <TabsTrigger value="geofence"><MapPin className="h-3.5 w-3.5 mr-1.5" />Geo-Fence Config</TabsTrigger>
        </TabsList>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* TAB 1 — DAILY ENTRY                                        */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <TabsContent value="daily" className="space-y-3">
          {/* Top toolbar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button size="icon" variant="ghost" onClick={() => {
                const d = new Date(selectedDate + 'T12:00:00');
                d.setDate(d.getDate() - 1);
                setSelectedDate(format(d, 'yyyy-MM-dd'));
                setRowEdits({});
              }}><ChevronLeft className="h-4 w-4" /></Button>
              <SmartDateInput value={selectedDate} onChange={v => { setSelectedDate(v); setRowEdits({}); }}
                className="w-40 text-xs" />
              <Button size="icon" variant="ghost" onClick={() => {
                const d = new Date(selectedDate + 'T12:00:00');
                d.setDate(d.getDate() + 1);
                setSelectedDate(format(d, 'yyyy-MM-dd'));
                setRowEdits({});
              }}><ChevronRight className="h-4 w-4" /></Button>
              {holidayDates.has(selectedDate) && (
                <Badge className="bg-amber-500/15 text-amber-700 border-amber-500/30">Holiday</Badge>
              )}
            </div>
            <div className="flex gap-2">
              {attendanceTypes.find(t => t.baseType === 'present') && (
                <Button size="sm" variant="outline" onClick={() => {
                  const p = attendanceTypes.find(t => t.baseType === 'present');
                  if (p) bulkMark(p.code);
                }}>Mark All Present</Button>
              )}
              {attendanceTypes.find(t => t.baseType === 'absent') && (
                <Button size="sm" variant="outline" onClick={() => {
                  const a = attendanceTypes.find(t => t.baseType === 'absent');
                  if (a) bulkMark(a.code);
                }}>Mark All Absent</Button>
              )}
              <Button size="sm" className="bg-violet-600 hover:bg-violet-700 text-white" data-primary
                onClick={saveDayAttendance}>
                <Save className="h-3.5 w-3.5 mr-1" /> Save Day
              </Button>
            </div>
          </div>

          {/* Filter row */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="pl-8 text-xs" placeholder="Search by name or code…"
                value={empSearch} onChange={e => setEmpSearch(e.target.value)} onKeyDown={onEnterNext} />
            </div>
            <Select value={deptFilter} onValueChange={setDeptFilter}>
              <SelectTrigger className="w-44 text-xs"><SelectValue placeholder="All Departments" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Stats strip */}
          <div className="grid grid-cols-5 gap-3">
            {[
              { label: 'Present', value: dayStats.present, color: 'text-green-600' },
              { label: 'Absent', value: dayStats.absent, color: 'text-red-600' },
              { label: 'Half Day', value: dayStats.halfDay, color: 'text-amber-600' },
              { label: 'WFH / OD', value: dayStats.wfhOd, color: 'text-blue-600' },
              { label: 'Not Marked', value: dayStats.notMarked, color: 'text-muted-foreground' },
            ].map(s => (
              <Card key={s.label}>
                <CardContent className="p-3 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</p>
                  <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Attendance Grid */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Emp Code</TableHead>
                <TableHead className="text-xs">Name</TableHead>
                <TableHead className="text-xs">Dept</TableHead>
                <TableHead className="text-xs">Shift</TableHead>
                <TableHead className="text-xs">Attendance Type</TableHead>
                <TableHead className="text-xs">Check In</TableHead>
                <TableHead className="text-xs">Check Out</TableHead>
                <TableHead className="text-xs">Work Hrs</TableHead>
                <TableHead className="text-xs">Late</TableHead>
                <TableHead className="text-xs">Remarks</TableHead>
                <TableHead className="text-xs">Source</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {gridEmployees.length === 0 && (
                <TableRow><TableCell colSpan={11} className="text-center text-muted-foreground py-8">
                  No active employees found. Add employees in Employee Master first.
                </TableCell></TableRow>
              )}
              {gridEmployees.map(emp => {
                const row = getRowVal(emp.id);
                const _saved = savedForDate.get(emp.id);
                const dayName = format(new Date(selectedDate + 'T12:00:00'), 'EEEE');
                const shift = shifts.find(s => s.code === emp.shiftCode) || shifts.find(s => s.status === 'active');
                const isWeeklyOff = shift ? shift.weeklyOff.includes(dayName) : dayName === 'Sunday';
                const isHoliday = holidayDates.has(selectedDate);
                const checkIn = (row.checkIn as string) || '';
                const checkOut = (row.checkOut as string) || '';
                const wh = computeWorkHours(checkIn, checkOut, shift?.breakDuration ? shift.breakDuration / 60 : 1);
                const { isLate, lateMinutes } = computeLate(checkIn, shift?.startTime || '', shift?.gracePeriodIn || 10);
                const source = (row.source as string) || 'manual';

                if (isHoliday || isWeeklyOff) {
                  return (
                    <TableRow key={emp.id} className={isHoliday ? 'bg-amber-500/5' : 'bg-muted/30'}>
                      <TableCell className="font-mono text-xs text-violet-600">{emp.empCode}</TableCell>
                      <TableCell className="text-xs font-medium">{emp.displayName}</TableCell>
                      <TableCell className="text-xs">{emp.departmentName || '—'}</TableCell>
                      <TableCell className="text-xs">{emp.shiftCode || '—'}</TableCell>
                      <TableCell colSpan={7}>
                        <Badge variant="outline" className={isHoliday ? 'text-amber-600 border-amber-500/30' : 'text-muted-foreground'}>
                          {isHoliday ? 'Holiday' : 'Weekly Off'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                }

                return (
                  <TableRow key={emp.id}>
                    <TableCell className="font-mono text-xs text-violet-600">{emp.empCode}</TableCell>
                    <TableCell className="text-xs font-medium">{emp.displayName}</TableCell>
                    <TableCell className="text-xs">{emp.departmentName || '—'}</TableCell>
                    <TableCell className="text-xs">{emp.shiftCode || '—'}</TableCell>
                    <TableCell>
                      <Select value={(row.attendanceTypeCode as string) || ''}
                        onValueChange={v => {
                          const t = attendanceTypes.find(at => at.code === v);
                          if (t) {
                            setRowField(emp.id, 'attendanceTypeCode', t.code);
                            setRowField(emp.id, 'attendanceTypeId', t.id);
                            setRowField(emp.id, 'attendanceTypeColor', t.color);
                          }
                        }}>
                        <SelectTrigger className="w-32 text-xs h-8"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          {attendanceTypes.map(t => (
                            <SelectItem key={t.id} value={t.code}>
                              <span className="flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: t.color }} />
                                {t.code} — {t.name}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input type="time" className="text-xs h-8 w-24" value={checkIn}
                        onChange={e => setRowField(emp.id, 'checkIn', e.target.value)}
                        onKeyDown={onEnterNext} />
                    </TableCell>
                    <TableCell>
                      <Input type="time" className="text-xs h-8 w-24" value={checkOut}
                        onChange={e => setRowField(emp.id, 'checkOut', e.target.value)}
                        onKeyDown={onEnterNext} />
                    </TableCell>
                    <TableCell className="text-xs font-mono">
                      {wh > 0 ? wh.toFixed(2) : '—'}
                    </TableCell>
                    <TableCell>
                      {isLate && (
                        <Badge variant="outline" className="text-amber-600 border-amber-500/30 text-[10px]">
                          {lateMinutes}m
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Input className="text-xs h-8 w-24" placeholder="…"
                        value={(row.remarks as string) || ''}
                        onChange={e => setRowField(emp.id, 'remarks', e.target.value)}
                        onKeyDown={onEnterNext} />
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">{source}</Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* TAB 2 — BIOMETRIC IMPORT                                   */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <TabsContent value="biometric" className="space-y-4">
          {/* Format hint */}
          <Card className="border-blue-500/30 bg-blue-500/5">
            <CardContent className="p-3 text-xs text-blue-700 leading-relaxed">
              <p className="font-semibold mb-1">Supported Biometric File Formats</p>
              <p>Upload a <code>.txt</code>, <code>.csv</code>, or <code>.log</code> file with one punch per line.</p>
              <p className="mt-1">Formats accepted:</p>
              <ul className="list-disc ml-4 mt-1 space-y-0.5">
                <li><code>EMP001  20250115  0902</code> — space/tab separated, YYYYMMDD + HHMM</li>
                <li><code>EMP001  2025-01-15  09:02:34</code> — with dashes and seconds</li>
                <li><code>1234  2025-01-15 09:02:34  1  0</code> — extra columns ignored</li>
              </ul>
            </CardContent>
          </Card>

          {/* Upload area */}
          <Card
            className="border-dashed border-2 hover:border-violet-500/50 transition-colors cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}
            onDrop={e => {
              e.preventDefault(); e.stopPropagation();
              const f = e.dataTransfer.files[0];
              if (f) handleBioFile(f);
            }}
          >
            <CardContent className="p-8 text-center">
              <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm font-medium">{bioFile ? bioFile.name : 'Drop biometric file here or click to browse'}</p>
              <p className="text-xs text-muted-foreground mt-1">Accepts .txt, .csv, .log</p>
              <input ref={fileInputRef} type="file" accept=".txt,.csv,.log" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleBioFile(f); }} />
            </CardContent>
          </Card>

          {/* Parse results */}
          {bioPunches.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge variant="outline">{bioPunches.length} day-summaries</Badge>
                  {bioParseErrors > 0 && (
                    <Badge variant="outline" className="text-red-600 border-red-500/30">
                      <AlertTriangle className="h-3 w-3 mr-1" />{bioParseErrors} parse errors
                    </Badge>
                  )}
                </div>
                <Button size="sm" className="bg-violet-600 hover:bg-violet-700 text-white" data-primary
                  onClick={importBiometric} disabled={bioImporting}>
                  <Download className="h-3.5 w-3.5 mr-1" /> Import {bioPunches.filter(s => s.employeeFound).length} Records
                </Button>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Emp Code</TableHead>
                    <TableHead className="text-xs">Employee</TableHead>
                    <TableHead className="text-xs">Date</TableHead>
                    <TableHead className="text-xs">Check In</TableHead>
                    <TableHead className="text-xs">Check Out</TableHead>
                    <TableHead className="text-xs">Punches</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bioPunches.map((s) => (
                    <TableRow key={`${s.employeeCode}-${s.date}`}>
                      <TableCell className="font-mono text-xs">{s.employeeCode}</TableCell>
                      <TableCell className="text-xs">{s.employeeName}</TableCell>
                      <TableCell className="text-xs">{s.date}</TableCell>
                      <TableCell className="font-mono text-xs">{s.checkIn}</TableCell>
                      <TableCell className="font-mono text-xs">{s.checkOut || '—'}</TableCell>
                      <TableCell className="text-xs">{s.punchCount}</TableCell>
                      <TableCell>
                        {s.employeeFound ? (
                          <Badge variant="outline" className="text-green-600 border-green-500/30 text-[10px]">
                            <Check className="h-3 w-3 mr-0.5" />Found
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-red-600 border-red-500/30 text-[10px]">
                            <X className="h-3 w-3 mr-0.5" />Not Found
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* TAB 3 — REGULARIZATION                                     */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <TabsContent value="regularization" className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {(['all', 'pending', 'approved', 'rejected'] as const).map(f => (
                <Button key={f} size="sm" variant={regFilter === f ? 'default' : 'outline'}
                  onClick={() => setRegFilter(f)} className="text-xs capitalize">{f}</Button>
              ))}
            </div>
            <Button size="sm" className="bg-violet-600 hover:bg-violet-700 text-white"
              onClick={() => {
                setRegForm({
                  employeeId: '', employeeCode: '', employeeName: '',
                  date: '', originalCheckIn: '', originalCheckOut: '',
                  requestedCheckIn: '', requestedCheckOut: '',
                  reason: '', status: 'pending', reviewedBy: '', reviewRemarks: '',
                });
                setRegSheetOpen(true);
              }}>
              <Plus className="h-3.5 w-3.5 mr-1" /> New Request
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Employee</TableHead>
                <TableHead className="text-xs">Date</TableHead>
                <TableHead className="text-xs">Original In/Out</TableHead>
                <TableHead className="text-xs">Requested In/Out</TableHead>
                <TableHead className="text-xs">Reason</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRegs.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No regularization requests.
                </TableCell></TableRow>
              )}
              {filteredRegs.map(r => (
                <React.Fragment key={r.id}>
                  <TableRow>
                    <TableCell className="text-xs">{r.employeeName} ({r.employeeCode})</TableCell>
                    <TableCell className="text-xs">{r.date}</TableCell>
                    <TableCell className="font-mono text-xs">{r.originalCheckIn || '—'} / {r.originalCheckOut || '—'}</TableCell>
                    <TableCell className="font-mono text-xs">{r.requestedCheckIn} / {r.requestedCheckOut}</TableCell>
                    <TableCell className="text-xs max-w-[200px] truncate">{r.reason}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={
                        r.status === 'pending' ? 'text-amber-600 border-amber-500/30' :
                        r.status === 'approved' ? 'text-green-600 border-green-500/30' :
                        'text-red-600 border-red-500/30'
                      }>{r.status}</Badge>
                    </TableCell>
                    <TableCell>
                      {r.status === 'pending' && (
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="h-7 w-7"
                            onClick={() => { setActionRegId(r.id); setActionType('approve'); setActionRemarks(''); }}>
                            <Check className="h-3.5 w-3.5 text-green-600" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7"
                            onClick={() => { setActionRegId(r.id); setActionType('reject'); setActionRemarks(''); }}>
                            <X className="h-3.5 w-3.5 text-red-600" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                  {actionRegId === r.id && (
                    <TableRow>
                      <TableCell colSpan={7} className="bg-muted/30 px-6 py-3">
                        <div className="flex items-center gap-2">
                          <Input className="text-xs flex-1" placeholder="Remarks (optional)"
                            value={actionRemarks} onChange={e => setActionRemarks(e.target.value)}
                            onKeyDown={onEnterNext} />
                          <Button size="sm" variant={actionType === 'approve' ? 'default' : 'destructive'}
                            onClick={() => {
                              if (actionType === 'approve') approveRegularization(r.id, 'Admin', actionRemarks);
                              else rejectRegularization(r.id, 'Admin', actionRemarks);
                              setActionRegId(null);
                            }}>
                            {actionType === 'approve' ? 'Confirm Approve' : 'Confirm Reject'}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setActionRegId(null)}>Cancel</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>

          {/* Regularization Sheet */}
          <Sheet open={regSheetOpen} onOpenChange={setRegSheetOpen}>
            <SheetContent className="sm:max-w-lg overflow-y-auto">
              <SheetHeader>
                <SheetTitle>New Regularization Request</SheetTitle>
              </SheetHeader>
              <div className="space-y-4 py-4" data-keyboard-form>
                <div>
                  <Label className="text-xs">Employee *</Label>
                  <Select value={regForm.employeeId} onValueChange={v => {
                    const emp = activeEmployees.find(e => e.id === v);
                    if (emp) setRegForm(p => ({ ...p, employeeId: emp.id, employeeCode: emp.empCode, employeeName: emp.displayName }));
                  }}>
                    <SelectTrigger className="text-xs mt-1"><SelectValue placeholder="Select employee" /></SelectTrigger>
                    <SelectContent>
                      {activeEmployees.map(e => <SelectItem key={e.id} value={e.id}>{e.empCode} — {e.displayName}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Date *</Label>
                  <SmartDateInput value={regForm.date} onChange={v => setRegForm(p => ({ ...p, date: v }))} className="text-xs mt-1" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Original Check In</Label>
                    <Input type="time" className="text-xs mt-1" value={regForm.originalCheckIn}
                      onChange={e => setRegForm(p => ({ ...p, originalCheckIn: e.target.value }))} onKeyDown={onEnterNext} />
                  </div>
                  <div>
                    <Label className="text-xs">Original Check Out</Label>
                    <Input type="time" className="text-xs mt-1" value={regForm.originalCheckOut}
                      onChange={e => setRegForm(p => ({ ...p, originalCheckOut: e.target.value }))} onKeyDown={onEnterNext} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Requested Check In *</Label>
                    <Input type="time" className="text-xs mt-1" value={regForm.requestedCheckIn}
                      onChange={e => setRegForm(p => ({ ...p, requestedCheckIn: e.target.value }))} onKeyDown={onEnterNext} />
                  </div>
                  <div>
                    <Label className="text-xs">Requested Check Out *</Label>
                    <Input type="time" className="text-xs mt-1" value={regForm.requestedCheckOut}
                      onChange={e => setRegForm(p => ({ ...p, requestedCheckOut: e.target.value }))} onKeyDown={onEnterNext} />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Reason *</Label>
                  <Textarea className="text-xs mt-1" rows={3} value={regForm.reason}
                    onChange={e => setRegForm(p => ({ ...p, reason: e.target.value }))} />
                </div>
              </div>
              <SheetFooter>
                <Button variant="outline" onClick={() => setRegSheetOpen(false)}>Cancel</Button>
                <Button className="bg-violet-600 hover:bg-violet-700 text-white" data-primary onClick={handleRegSave}>
                  Submit Request
                </Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* TAB 4 — GEO-FENCE CONFIG                                   */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <TabsContent value="geofence" className="space-y-3">
          {/* Explanation card */}
          <Card className="border-green-500/30 bg-green-500/5">
            <CardContent className="p-3 text-xs text-green-700 leading-relaxed">
              <p className="font-semibold mb-1">About Geo-Fences</p>
              <p>Geo-fences define virtual boundaries around office locations.
                Employees can only check-in via mobile when within the defined radius.
                Configure one fence per office/branch location.</p>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">{geoFences.length} geo-fences configured</p>
            <Button size="sm" className="bg-violet-600 hover:bg-violet-700 text-white"
              onClick={() => { setGfForm({ ...BLANK_GF }); setGfEditId(null); setGfSheetOpen(true); }}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Add Geo-Fence
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Name</TableHead>
                <TableHead className="text-xs">Location</TableHead>
                <TableHead className="text-xs">Coordinates</TableHead>
                <TableHead className="text-xs">Radius (m)</TableHead>
                <TableHead className="text-xs">Active</TableHead>
                <TableHead className="text-xs">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {geoFences.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No geo-fences configured yet.
                </TableCell></TableRow>
              )}
              {geoFences.map(gf => (
                <TableRow key={gf.id}>
                  <TableCell className="text-xs font-medium">{gf.name}</TableCell>
                  <TableCell className="text-xs">{gf.location || '—'}</TableCell>
                  <TableCell className="text-xs">
                    <span className="font-mono">{gf.latitude}, {gf.longitude}</span>
                    <a href={`https://maps.google.com/?q=${gf.latitude},${gf.longitude}`} target="_blank"
                      rel="noopener noreferrer" className="text-blue-600 hover:underline ml-2 text-[10px]">
                      View on Map →
                    </a>
                  </TableCell>
                  <TableCell className="text-xs font-mono">{gf.radiusMeters}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={gf.isActive ? 'text-green-600 border-green-500/30' : 'text-muted-foreground'}>
                      {gf.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => {
                        setGfForm({ name: gf.name, location: gf.location, latitude: gf.latitude,
                          longitude: gf.longitude, radiusMeters: gf.radiusMeters, isActive: gf.isActive });
                        setGfEditId(gf.id);
                        setGfSheetOpen(true);
                      }}>Edit</Button>
                      <Button size="sm" variant="ghost" onClick={() => toggleGeoFence(gf.id)}>
                        {gf.isActive ? 'Disable' : 'Enable'}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Geo-fence Sheet */}
          <Sheet open={gfSheetOpen} onOpenChange={setGfSheetOpen}>
            <SheetContent className="sm:max-w-lg overflow-y-auto">
              <SheetHeader>
                <SheetTitle>{gfEditId ? 'Edit Geo-Fence' : 'Add Geo-Fence'}</SheetTitle>
              </SheetHeader>
              <div className="space-y-4 py-4" data-keyboard-form>
                <div>
                  <Label className="text-xs">Fence Name *</Label>
                  <Input className="text-xs mt-1" value={gfForm.name}
                    onChange={e => setGfForm(p => ({ ...p, name: e.target.value }))} onKeyDown={onEnterNext} />
                </div>
                <div>
                  <Label className="text-xs">Location / Branch</Label>
                  <Input className="text-xs mt-1" placeholder="e.g. Mumbai HO" value={gfForm.location}
                    onChange={e => setGfForm(p => ({ ...p, location: e.target.value }))} onKeyDown={onEnterNext} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Latitude *</Label>
                    <Input type="number" step="0.000001" className="text-xs mt-1" value={gfForm.latitude || ''}
                      onChange={e => setGfForm(p => ({ ...p, latitude: parseFloat(e.target.value) || 0 }))}
                      onKeyDown={onEnterNext} />
                    <p className="text-[10px] text-muted-foreground mt-0.5">Decimal degrees. Example: 19.075984 (Mumbai)</p>
                  </div>
                  <div>
                    <Label className="text-xs">Longitude *</Label>
                    <Input type="number" step="0.000001" className="text-xs mt-1" value={gfForm.longitude || ''}
                      onChange={e => setGfForm(p => ({ ...p, longitude: parseFloat(e.target.value) || 0 }))}
                      onKeyDown={onEnterNext} />
                    <p className="text-[10px] text-muted-foreground mt-0.5">Example: 72.877656 (Mumbai)</p>
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Radius (metres) *</Label>
                  <Input type="number" className="text-xs mt-1" value={gfForm.radiusMeters}
                    onChange={e => setGfForm(p => ({ ...p, radiusMeters: parseInt(e.target.value) || 200 }))}
                    onKeyDown={onEnterNext} />
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Recommended: 100m (tight) to 500m (loose). Accounts for GPS drift.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Label className="text-xs">Active</Label>
                  <Switch checked={gfForm.isActive} onCheckedChange={v => setGfForm(p => ({ ...p, isActive: v }))} />
                </div>
                {(gfForm.latitude !== 0 && gfForm.longitude !== 0) && (
                  <a href={`https://maps.google.com/?q=${gfForm.latitude},${gfForm.longitude}`} target="_blank"
                    rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
                    <MapPin className="h-3 w-3 inline mr-1" />Preview on Google Maps →
                  </a>
                )}
              </div>
              <SheetFooter>
                <Button variant="outline" onClick={() => setGfSheetOpen(false)}>Cancel</Button>
                <Button className="bg-violet-600 hover:bg-violet-700 text-white" data-primary onClick={handleGfSave}>
                  {gfEditId ? 'Update Fence' : 'Create Fence'}
                </Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function AttendanceEntry() {
  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen bg-background flex flex-col">
        <ERPHeader
          breadcrumbs={[
            { label: 'Operix Core', href: '/erp/dashboard' },
            { label: 'Pay Hub', href: '/erp/pay-hub' },
            { label: 'Attendance Entry' },
          ]}
          showDatePicker={false} showCompany={false}
        />
        <div className="flex-1 overflow-auto p-6">
          <AttendanceEntryPanel />
        </div>
      </div>
    </SidebarProvider>
  );
}
