/**
 * LeaveRequests.tsx — Sprint 6 Leave Management
 * 4-tab screen: Leave Requests · Leave Balance · Approval Delegation · Comp-Off
 */
import React, { useState, useMemo, useCallback } from 'react';
import { format, parseISO, differenceInCalendarDays } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { SmartDateInput } from '@/components/ui/smart-date-input';
import { Separator } from '@/components/ui/separator';
import {
  CalendarDays, UserCheck, ArrowRightLeft, RotateCcw, Plus, Check, X,
  Clock, AlertTriangle, Info
} from 'lucide-react';
import { toast } from 'sonner';
import { useLeaveManagement, computeLeaveDays, getEffectiveApprover,
  computeLeaveBalance } from '@/hooks/useLeaveManagement';
import type { LeaveRequest, ApprovalDelegation, CompOffEntry } from '@/types/leave-management';
import { LEAVE_STATUS_COLORS } from '@/types/leave-management';
import type { Employee } from '@/types/employee';
import type { LeaveType, HolidayCalendar } from '@/types/payroll-masters';
import { EMPLOYEES_KEY } from '@/types/employee';
import { LEAVE_TYPES_KEY, HOLIDAY_CALENDARS_KEY } from '@/types/payroll-masters';
import { onEnterNext, useCtrlS } from '@/lib/keyboard';

export function LeaveRequestsPanel() {
  const { requests, delegations, compOff, stats,
    createRequest, approveRequest, rejectRequest, cancelRequest,
    createDelegation, updateDelegation, addCompOff } = useLeaveManagement();

  // ── Cross-module reads ───────────────────────────────────────
  const employees = useMemo<Employee[]>(() => {
    try {
      // [JWT] GET /api/pay-hub/employees
      const raw = localStorage.getItem(EMPLOYEES_KEY);
      if (raw) return JSON.parse(raw);
    } catch { /* ignore */ }
    return [];
  }, []);

  const activeEmployees = useMemo(() => employees.filter(e => e.status === 'active'), [employees]);

  const leaveTypes = useMemo<LeaveType[]>(() => {
    try {
      // [JWT] GET /api/pay-hub/masters/leave-types
      const raw = localStorage.getItem(LEAVE_TYPES_KEY);
      if (raw) return (JSON.parse(raw) as LeaveType[]).filter(l => l.status === 'active');
    } catch { /* ignore */ }
    return [];
  }, []);

  const holidayDates = useMemo<Set<string>>(() => {
    try {
      // [JWT] GET /api/pay-hub/masters/holiday-calendars
      const raw = localStorage.getItem(HOLIDAY_CALENDARS_KEY);
      if (raw) {
        const cals: HolidayCalendar[] = JSON.parse(raw);
        return new Set(cals
          .filter(c => c.status !== 'inactive')
          .flatMap(c => c.holidays.map(h => h.date)));
      }
    } catch { /* ignore */ }
    return new Set<string>();
  }, []);

  // ── Sheet state ──────────────────────────────────────────────
  // NEW REQUEST Sheet
  const [reqSheetOpen, setReqSheetOpen] = useState(false);
  const BLANK_REQ = {
    employeeId: '', employeeCode: '', employeeName: '', departmentName: '',
    leaveTypeId: '', leaveTypeCode: '', leaveTypeName: '',
    fromDate: '', toDate: '', halfDay: false, halfDaySession: '' as '' | 'morning' | 'afternoon',
    totalDays: 0, reason: '', documentRef: '',
    status: 'pending' as const, approverId: '', approverName: '',
    approvedAt: '', approverRemarks: '', cancelledAt: '', cancelReason: '',
  };
  const [reqForm, setReqForm] = useState(BLANK_REQ);
  const ruf = <K extends keyof typeof BLANK_REQ>(k: K, v: (typeof BLANK_REQ)[K]) =>
    setReqForm(prev => ({ ...prev, [k]: v }));

  // DELEGATION Sheet
  const [delSheetOpen, setDelSheetOpen] = useState(false);
  const [delEditId, setDelEditId] = useState<string | null>(null);
  const BLANK_DEL = {
    delegatorId: '', delegatorCode: '', delegatorName: '',
    delegateeId: '', delegateeCode: '', delegateeName: '',
    fromDate: '', toDate: '', allLeaveTypes: true, leaveTypeCodes: [] as string[],
    isActive: true, reason: '',
  };
  const [delForm, setDelForm] = useState(BLANK_DEL);

  // COMP-OFF Sheet
  const [coSheetOpen, setCoSheetOpen] = useState(false);
  const BLANK_CO = {
    employeeId: '', employeeCode: '', employeeName: '',
    workedDate: '', workedHours: 8, daysEarned: 1 as number, expiryDate: '',
    linkedLeaveRequestId: '', status: 'available' as const, addedBy: 'Admin', remarks: '',
  };
  const [coForm, setCoForm] = useState(BLANK_CO);

  // ── Approve/Reject inline state ──────────────────────────────
  const [actionId, setActionId] = useState<string | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');
  const [actionRemarks, setActionRemarks] = useState('');

  // ── Filter state for requests tab ────────────────────────────
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // ── Balance tab employee selector ────────────────────────────
  const [balanceEmpId, setBalanceEmpId] = useState('');

  // ── Computed days (live preview in request sheet) ────────────
  const selectedEmployee = useMemo(() =>
    activeEmployees.find(e => e.id === reqForm.employeeId) || null
  , [activeEmployees, reqForm.employeeId]);

  const computedDays = useMemo(() => computeLeaveDays(
    reqForm.fromDate, reqForm.toDate, reqForm.halfDay,
    selectedEmployee?.weeklyOff || ['Sunday'], holidayDates
  ), [reqForm.fromDate, reqForm.toDate, reqForm.halfDay, selectedEmployee, holidayDates]);

  // ── Auto-detect effective approver ───────────────────────────
  const effectiveApprover = useMemo(() => {
    if (!selectedEmployee?.reportingManagerId) return null;
    return getEffectiveApprover(
      selectedEmployee.reportingManagerId,
      selectedEmployee.reportingManagerName,
      reqForm.fromDate, reqForm.toDate, delegations, reqForm.leaveTypeCode
    );
  }, [selectedEmployee, reqForm.fromDate, reqForm.toDate, reqForm.leaveTypeCode, delegations]);

  // ── Validate leave request ────────────────────────────────────
  const selectedLeaveType = useMemo(() =>
    leaveTypes.find(l => l.id === reqForm.leaveTypeId) || null
  , [leaveTypes, reqForm.leaveTypeId]);

  const reqValidation = useMemo(() => {
    const warnings: string[] = [];
    if (!reqForm.fromDate || !reqForm.toDate) return warnings;

    const lt = selectedLeaveType;
    if (!lt) return warnings;

    // Advance notice check
    const today = new Date().toISOString().slice(0, 10);
    const noticeDays = differenceInCalendarDays(parseISO(reqForm.fromDate), parseISO(today));
    if (lt.advanceNoticeDays > 0 && noticeDays < lt.advanceNoticeDays) {
      warnings.push(`This leave type requires ${lt.advanceNoticeDays} day(s) advance notice`);
    }

    // Max days check
    if (lt.maxDaysAtOnce > 0 && computedDays > lt.maxDaysAtOnce) {
      warnings.push(`Maximum ${lt.maxDaysAtOnce} day(s) allowed at once for ${lt.name}`);
    }

    // Gender check
    if (selectedEmployee && lt.applicableGender !== 'all' && lt.applicableGender !== selectedEmployee.gender) {
      warnings.push(`${lt.name} is applicable for ${lt.applicableGender} employees only`);
    }

    // Balance check
    if (selectedEmployee && lt.code !== 'CO') {
      const openingBal = lt.code === 'EL' ? (selectedEmployee.elOpeningBalance || 0) : 0;
      const bal = computeLeaveBalance(selectedEmployee.id, lt.code, lt.daysPerYear,
        lt.proRata, openingBal, selectedEmployee.doj, requests);
      if (bal.balance < computedDays) {
        warnings.push(`Insufficient balance — available: ${bal.balance} day(s), requested: ${computedDays}`);
      }
    }

    return warnings;
  }, [reqForm, selectedLeaveType, selectedEmployee, computedDays, requests]);

  // ── handleReqSave ─────────────────────────────────────────────
  const handleReqSave = useCallback(() => {
    if (!reqSheetOpen) return;
    if (!reqForm.employeeId) return toast.error('Select an employee');
    if (!reqForm.leaveTypeId) return toast.error('Select a leave type');
    if (!reqForm.fromDate) return toast.error('From date is required');
    if (!reqForm.toDate) return toast.error('To date is required');
    if (reqForm.toDate < reqForm.fromDate)
      return toast.error('To date cannot be before From date');
    if (!reqForm.reason.trim()) return toast.error('Reason is required');
    const approver = effectiveApprover || { id: '', name: 'Not assigned' };
    createRequest({
      ...reqForm,
      totalDays: computedDays,
      approverId: approver.id,
      approverName: approver.name,
    });
    setReqSheetOpen(false);
    setReqForm(BLANK_REQ);
  }, [reqSheetOpen, reqForm, computedDays, effectiveApprover, createRequest]);

  // ── handleDelSave ─────────────────────────────────────────────
  const handleDelSave = useCallback(() => {
    if (!delSheetOpen) return;
    if (!delForm.delegatorId || !delForm.delegateeId)
      return toast.error('Delegator and delegatee are required');
    if (!delForm.fromDate || !delForm.toDate) return toast.error('Date range required');
    if (delEditId) updateDelegation(delEditId, delForm);
    else createDelegation(delForm);
    setDelSheetOpen(false);
  }, [delSheetOpen, delForm, delEditId, createDelegation, updateDelegation]);

  // ── handleCoSave ──────────────────────────────────────────────
  const handleCoSave = useCallback(() => {
    if (!coSheetOpen) return;
    if (!coForm.employeeId || !coForm.workedDate)
      return toast.error('Employee and worked date are required');
    addCompOff(coForm);
    setCoSheetOpen(false);
    setCoForm(BLANK_CO);
  }, [coSheetOpen, coForm, addCompOff]);

  // ── masterSave (single Ctrl+S) ────────────────────────────────
  const masterSave = useCallback(() => {
    if (reqSheetOpen) { handleReqSave(); return; }
    if (delSheetOpen) { handleDelSave(); return; }
    if (coSheetOpen) { handleCoSave(); return; }
  }, [reqSheetOpen, delSheetOpen, coSheetOpen, handleReqSave, handleDelSave, handleCoSave]);
  useCtrlS(masterSave);

  // ── Filtered requests ─────────────────────────────────────────
  const filteredRequests = useMemo(() => {
    if (statusFilter === 'all') return requests;
    return requests.filter(r => r.status === statusFilter);
  }, [requests, statusFilter]);

  // ── FY display ────────────────────────────────────────────────
  const fyDisplay = useMemo(() => {
    const now = new Date();
    const fyStartYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    return `FY ${fyStartYear}-${String(fyStartYear + 1).slice(2)}`;
  }, []);

  // ── Balance data for selected employee ────────────────────────
  const balanceEmployee = useMemo(() =>
    activeEmployees.find(e => e.id === balanceEmpId) || null
  , [activeEmployees, balanceEmpId]);

  const balanceData = useMemo(() => {
    if (!balanceEmployee) return [];
    return leaveTypes.map(lt => {
      const openingBal = lt.code === 'EL' ? (balanceEmployee.elOpeningBalance || 0) : 0;
      const bal = computeLeaveBalance(balanceEmployee.id, lt.code, lt.daysPerYear,
        lt.proRata, openingBal, balanceEmployee.doj, requests);
      return { ...bal, leaveType: lt };
    });
  }, [balanceEmployee, leaveTypes, requests]);

  const balanceCompOff = useMemo(() => {
    if (!balanceEmployee) return 0;
    return compOff
      .filter(c => c.employeeId === balanceEmployee.id && c.status === 'available')
      .reduce((s, c) => s + c.daysEarned, 0);
  }, [balanceEmployee, compOff]);

  // ── Filtered leave types by gender ────────────────────────────
  const filteredLeaveTypes = useMemo(() => {
    if (!selectedEmployee) return leaveTypes;
    return leaveTypes.filter(lt =>
      lt.applicableGender === 'all' || lt.applicableGender === selectedEmployee.gender
    );
  }, [leaveTypes, selectedEmployee]);

  // ── Leave balance in request sheet ────────────────────────────
  const reqLeaveBalance = useMemo(() => {
    if (!selectedEmployee || !selectedLeaveType || selectedLeaveType.code === 'CO') return null;
    const openingBal = selectedLeaveType.code === 'EL' ? (selectedEmployee.elOpeningBalance || 0) : 0;
    return computeLeaveBalance(selectedEmployee.id, selectedLeaveType.code,
      selectedLeaveType.daysPerYear, selectedLeaveType.proRata, openingBal,
      selectedEmployee.doj, requests);
  }, [selectedEmployee, selectedLeaveType, requests]);

  // ── Document required check ───────────────────────────────────
  const showDocRef = useMemo(() => {
    if (!selectedLeaveType) return false;
    if (selectedLeaveType.documentRequired) return true;
    if (selectedLeaveType.documentRequiredAfterDays > 0 && computedDays > selectedLeaveType.documentRequiredAfterDays) return true;
    return false;
  }, [selectedLeaveType, computedDays]);

  return (
    <div className="space-y-4" data-keyboard-form>
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-violet-500/15 flex items-center justify-center">
            <CalendarDays className="h-5 w-5 text-violet-500" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Leave Requests</h2>
            <p className="text-xs text-muted-foreground">Apply, approve & track employee leaves</p>
          </div>
        </div>
        <Button
          data-primary
          className="bg-violet-600 hover:bg-violet-700 text-white"
          onClick={() => { setReqForm(BLANK_REQ); setReqSheetOpen(true); }}
        >
          <Plus className="h-4 w-4 mr-1" /> New Request
        </Button>
      </div>

      {/* ── Stats strip ────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-3">
        <Card><CardContent className="p-3">
          <p className="text-[10px] text-muted-foreground uppercase">Pending Approvals</p>
          <p className="text-xl font-bold text-amber-600">{stats.pendingCount}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3">
          <p className="text-[10px] text-muted-foreground uppercase">Approved This Month</p>
          <p className="text-xl font-bold text-green-600">{stats.approvedThisMonth}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3">
          <p className="text-[10px] text-muted-foreground uppercase">Active Delegations</p>
          <p className="text-xl font-bold text-blue-600">{stats.activeDelegations}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3">
          <p className="text-[10px] text-muted-foreground uppercase">Comp-Off Available</p>
          <p className="text-xl font-bold text-violet-600">{stats.availableCompOff}</p>
        </CardContent></Card>
      </div>

      {/* ── Main Tabs ──────────────────────────────────────────── */}
      <Tabs defaultValue="requests">
        <TabsList>
          <TabsTrigger value="requests" className="gap-1">
            <CalendarDays className="h-3.5 w-3.5" /> Leave Requests
            {stats.pendingCount > 0 && (
              <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0 h-4">{stats.pendingCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="balance" className="gap-1">
            <UserCheck className="h-3.5 w-3.5" /> Leave Balance
          </TabsTrigger>
          <TabsTrigger value="delegation" className="gap-1">
            <ArrowRightLeft className="h-3.5 w-3.5" /> Approval Delegation
          </TabsTrigger>
          <TabsTrigger value="compoff" className="gap-1">
            <RotateCcw className="h-3.5 w-3.5" /> Comp-Off
          </TabsTrigger>
        </TabsList>

        {/* ── TAB 1: Leave Requests ──────────────────────────── */}
        <TabsContent value="requests" className="space-y-3">
          <div className="flex gap-2">
            {['all', 'pending', 'approved', 'rejected', 'cancelled'].map(s => (
              <Button
                key={s}
                variant={statusFilter === s ? 'default' : 'outline'}
                size="sm"
                className="text-xs capitalize"
                onClick={() => setStatusFilter(s)}
              >
                {s}
              </Button>
            ))}
          </div>
          {filteredRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
              <CalendarDays className="h-8 w-8 mb-2 opacity-40" />
              <p className="text-sm">No leave requests yet. Click + New Request to start.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Leave Type</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Days</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Approver</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.map(r => (
                  <React.Fragment key={r.id}>
                    <TableRow>
                      <TableCell className="text-xs">
                        <div>{r.employeeName}</div>
                        <div className="text-muted-foreground text-[10px]">{r.employeeCode}</div>
                      </TableCell>
                      <TableCell className="text-xs">{r.leaveTypeName}</TableCell>
                      <TableCell className="text-xs">{r.fromDate}</TableCell>
                      <TableCell className="text-xs">{r.toDate}</TableCell>
                      <TableCell className="text-xs font-medium">{r.totalDays}{r.halfDay ? ' (½)' : ''}</TableCell>
                      <TableCell className="text-xs max-w-[150px] truncate">{r.reason}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] ${LEAVE_STATUS_COLORS[r.status]}`}>
                          {r.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {r.approverName}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {r.status === 'pending' && (
                            <>
                              <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] text-green-600"
                                onClick={() => { setActionId(r.id); setActionType('approve'); setActionRemarks(''); }}>
                                <Check className="h-3 w-3 mr-0.5" /> Approve
                              </Button>
                              <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] text-red-600"
                                onClick={() => { setActionId(r.id); setActionType('reject'); setActionRemarks(''); }}>
                                <X className="h-3 w-3 mr-0.5" /> Reject
                              </Button>
                            </>
                          )}
                          {(r.status === 'approved' || r.status === 'pending') && (
                            <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] text-muted-foreground"
                              onClick={() => cancelRequest(r.id, 'Cancelled by admin')}>
                              <X className="h-3 w-3 mr-0.5" /> Cancel
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                    {actionId === r.id && (
                      <TableRow>
                        <TableCell colSpan={9}>
                          <div className="flex items-center gap-2 p-2" data-keyboard-form>
                            <Input
                              className="text-xs h-7 max-w-xs"
                              placeholder="Add remarks (optional)"
                              value={actionRemarks}
                              onChange={e => setActionRemarks(e.target.value)}
                              onKeyDown={onEnterNext}
                            />
                            <Button
                              data-primary
                              size="sm"
                              className={`h-7 text-xs ${actionType === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'} text-white`}
                              onClick={() => {
                                if (actionType === 'approve') approveRequest(r.id, 'Admin', actionRemarks);
                                else rejectRequest(r.id, 'Admin', actionRemarks);
                                setActionId(null);
                              }}
                            >
                              Confirm
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 text-xs"
                              onClick={() => setActionId(null)}>
                              Cancel
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        {/* ── TAB 2: Leave Balance ───────────────────────────── */}
        <TabsContent value="balance" className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-64">
              <Label className="text-xs">Select Employee</Label>
              <Select value={balanceEmpId} onValueChange={setBalanceEmpId}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Choose employee" />
                </SelectTrigger>
                <SelectContent>
                  {activeEmployees.map(e => (
                    <SelectItem key={e.id} value={e.id} className="text-xs">
                      {e.empCode} — {e.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Badge variant="outline" className="text-xs">{fyDisplay}</Badge>
          </div>

          {balanceEmployee ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Leave Type</TableHead>
                  <TableHead className="text-right">Opening</TableHead>
                  <TableHead className="text-right">Earned (this FY)</TableHead>
                  <TableHead className="text-right">Availed</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead>Encashable</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {balanceData.map(bd => (
                  <TableRow key={bd.leaveType.id}>
                    <TableCell className="text-xs font-medium">{bd.leaveType.name} ({bd.leaveType.code})</TableCell>
                    <TableCell className="text-xs text-right">{bd.opening}</TableCell>
                    <TableCell className="text-xs text-right">{bd.earned}</TableCell>
                    <TableCell className="text-xs text-right">{bd.availed}</TableCell>
                    <TableCell className="text-right">
                      <span className={`text-xs font-bold ${bd.balance > 5 ? 'text-green-600' : bd.balance >= 1 ? 'text-amber-600' : 'text-red-600'}`}>
                        {bd.balance}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs">{bd.leaveType.encashable ? 'Yes' : 'No'}</TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell className="text-xs font-medium">Comp-Off (CO)</TableCell>
                  <TableCell className="text-xs text-right">—</TableCell>
                  <TableCell className="text-xs text-right">—</TableCell>
                  <TableCell className="text-xs text-right">—</TableCell>
                  <TableCell className="text-right">
                    <span className={`text-xs font-bold ${balanceCompOff > 0 ? 'text-green-600' : 'text-muted-foreground'}`}>
                      {balanceCompOff}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs">No</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
              <UserCheck className="h-8 w-8 mb-2 opacity-40" />
              <p className="text-sm">Select an employee to view leave balance</p>
            </div>
          )}
        </TabsContent>

        {/* ── TAB 3: Approval Delegation ─────────────────────── */}
        <TabsContent value="delegation" className="space-y-3">
          <div className="flex justify-between items-center">
            <p className="text-xs text-muted-foreground">
              Managers can delegate approval authority to a subordinate for a date range.
            </p>
            <Button
              data-primary
              size="sm"
              className="bg-violet-600 hover:bg-violet-700 text-white text-xs"
              onClick={() => { setDelForm(BLANK_DEL); setDelEditId(null); setDelSheetOpen(true); }}
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> New Delegation
            </Button>
          </div>

          {delegations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
              <ArrowRightLeft className="h-8 w-8 mb-2 opacity-40" />
              <p className="text-sm">No delegations configured</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Delegator</TableHead>
                  <TableHead>Delegatee</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Scope</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {delegations.map(d => (
                  <TableRow key={d.id}>
                    <TableCell className="text-xs">
                      <div>{d.delegatorName}</div>
                      <div className="text-muted-foreground text-[10px]">{d.delegatorCode}</div>
                    </TableCell>
                    <TableCell className="text-xs">
                      <div>{d.delegateeName}</div>
                      <div className="text-muted-foreground text-[10px]">{d.delegateeCode}</div>
                    </TableCell>
                    <TableCell className="text-xs">{d.fromDate}</TableCell>
                    <TableCell className="text-xs">{d.toDate}</TableCell>
                    <TableCell className="text-xs">{d.allLeaveTypes ? 'All Types' : d.leaveTypeCodes.join(', ')}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[10px] ${d.isActive ? 'bg-green-500/10 text-green-700 border-green-500/30' : 'bg-slate-500/10 text-slate-500 border-slate-400/30'}`}>
                        {d.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px]"
                        onClick={() => {
                          setDelForm({
                            delegatorId: d.delegatorId, delegatorCode: d.delegatorCode, delegatorName: d.delegatorName,
                            delegateeId: d.delegateeId, delegateeCode: d.delegateeCode, delegateeName: d.delegateeName,
                            fromDate: d.fromDate, toDate: d.toDate, allLeaveTypes: d.allLeaveTypes,
                            leaveTypeCodes: d.leaveTypeCodes, isActive: d.isActive, reason: d.reason,
                          });
                          setDelEditId(d.id);
                          setDelSheetOpen(true);
                        }}
                      >
                        Edit
                      </Button>
                      {d.isActive && (
                        <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] text-red-600"
                          onClick={() => updateDelegation(d.id, { isActive: false })}>
                          Deactivate
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        {/* ── TAB 4: Comp-Off ────────────────────────────────── */}
        <TabsContent value="compoff" className="space-y-3">
          <div className="flex justify-between items-center">
            <div className="rounded-md border border-blue-500/30 bg-blue-500/5 p-3 text-xs text-blue-700 leading-relaxed flex-1 mr-3">
              <p className="flex items-center gap-1 font-semibold mb-1"><Info className="h-3.5 w-3.5" /> About Comp-Off</p>
              <p>Comp-off is earned when an employee works on a scheduled holiday or weekly off.
                HR manually records comp-off earned. Employees avail it via Leave Requests (CO leave type).</p>
            </div>
            <Button
              data-primary
              size="sm"
              className="bg-violet-600 hover:bg-violet-700 text-white text-xs shrink-0"
              onClick={() => { setCoForm(BLANK_CO); setCoSheetOpen(true); }}
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> Add Comp-Off
            </Button>
          </div>

          {compOff.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
              <RotateCcw className="h-8 w-8 mb-2 opacity-40" />
              <p className="text-sm">No comp-off entries yet</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Worked Date</TableHead>
                    <TableHead>Hours</TableHead>
                    <TableHead>Days Earned</TableHead>
                    <TableHead>Expiry Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Remarks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {compOff.map(c => (
                    <TableRow key={c.id}>
                      <TableCell className="text-xs">
                        <div>{c.employeeName}</div>
                        <div className="text-muted-foreground text-[10px]">{c.employeeCode}</div>
                      </TableCell>
                      <TableCell className="text-xs">{c.workedDate}</TableCell>
                      <TableCell className="text-xs">{c.workedHours}</TableCell>
                      <TableCell className="text-xs font-medium">{c.daysEarned}</TableCell>
                      <TableCell className="text-xs">{c.expiryDate}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] ${
                          c.status === 'available' ? 'bg-green-500/10 text-green-700 border-green-500/30' :
                          c.status === 'availed' ? 'bg-blue-500/10 text-blue-700 border-blue-500/30' :
                          'bg-slate-500/10 text-slate-500 border-slate-400/30'
                        }`}>
                          {c.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs max-w-[150px] truncate">{c.remarks}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="text-xs text-muted-foreground text-right">
                Total available comp-off across all employees: <span className="font-bold text-violet-600">{stats.availableCompOff} day(s)</span>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* NEW REQUEST Sheet                                          */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <Sheet open={reqSheetOpen} onOpenChange={setReqSheetOpen}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>New Leave Request</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 py-4" data-keyboard-form>
            {/* Employee */}
            <div>
              <Label className="text-xs">Employee *</Label>
              <Select value={reqForm.employeeId} onValueChange={id => {
                const emp = activeEmployees.find(e => e.id === id);
                if (emp) {
                  setReqForm(prev => ({
                    ...prev,
                    employeeId: emp.id,
                    employeeCode: emp.empCode,
                    employeeName: emp.displayName,
                    departmentName: emp.departmentName,
                  }));
                }
              }}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {activeEmployees.map(e => (
                    <SelectItem key={e.id} value={e.id} className="text-xs">
                      {e.empCode} — {e.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Leave Type */}
            <div>
              <Label className="text-xs">Leave Type *</Label>
              <Select value={reqForm.leaveTypeId} onValueChange={id => {
                const lt = leaveTypes.find(l => l.id === id);
                if (lt) {
                  setReqForm(prev => ({
                    ...prev,
                    leaveTypeId: lt.id,
                    leaveTypeCode: lt.code,
                    leaveTypeName: lt.name,
                  }));
                }
              }}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select leave type" />
                </SelectTrigger>
                <SelectContent>
                  {filteredLeaveTypes.map(lt => (
                    <SelectItem key={lt.id} value={lt.id} className="text-xs">
                      {lt.code} — {lt.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">From Date *</Label>
                <SmartDateInput value={reqForm.fromDate} onChange={v => ruf('fromDate', v)} />
              </div>
              <div>
                <Label className="text-xs">To Date *</Label>
                <SmartDateInput value={reqForm.toDate} onChange={v => ruf('toDate', v)} />
                {reqForm.toDate && reqForm.fromDate && reqForm.toDate < reqForm.fromDate && (
                  <p className="text-[10px] text-red-500 mt-0.5">To date cannot be before From date</p>
                )}
              </div>
            </div>

            {/* Half Day */}
            {selectedLeaveType?.halfDayAllowed && (
              <div className="flex items-center gap-3">
                <Switch checked={reqForm.halfDay} onCheckedChange={v => ruf('halfDay', v)} />
                <Label className="text-xs">Half Day</Label>
              </div>
            )}

            {/* Half Day Session */}
            {reqForm.halfDay && (
              <div>
                <Label className="text-xs">Session</Label>
                <Select value={reqForm.halfDaySession} onValueChange={v => ruf('halfDaySession', v as 'morning' | 'afternoon' | '')}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select session" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="morning" className="text-xs">Morning</SelectItem>
                    <SelectItem value="afternoon" className="text-xs">Afternoon</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Days Computed */}
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-violet-500" />
              <span className="text-sm font-bold text-violet-600">{computedDays} working day(s)</span>
            </div>

            {/* Leave Balance */}
            {reqLeaveBalance && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Current Balance:</span>
                <span className={`text-xs font-bold ${reqLeaveBalance.balance < computedDays ? 'text-amber-600' : 'text-green-600'}`}>
                  {reqLeaveBalance.balance} day(s)
                </span>
                {reqLeaveBalance.balance < computedDays && (
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                )}
              </div>
            )}

            <Separator />

            {/* Reason */}
            <div>
              <Label className="text-xs">Reason *</Label>
              <Textarea
                className="text-xs"
                placeholder="Enter reason for leave"
                value={reqForm.reason}
                onChange={e => ruf('reason', e.target.value)}
              />
            </div>

            {/* Document Reference */}
            {showDocRef && (
              <div>
                <Label className="text-xs">Document Reference</Label>
                <Input className="h-8 text-xs" value={reqForm.documentRef}
                  onChange={e => ruf('documentRef', e.target.value)}
                  onKeyDown={onEnterNext}
                  placeholder="Reference number or filename" />
              </div>
            )}

            {/* Effective Approver */}
            {effectiveApprover && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">Approver:</span>
                <span className="font-medium">{effectiveApprover.name}</span>
                {effectiveApprover.isDelegated && (
                  <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-blue-500/30 text-blue-600">
                    delegated
                  </Badge>
                )}
              </div>
            )}

            {/* Warnings */}
            {reqValidation.length > 0 && (
              <div className="space-y-1">
                {reqValidation.map((w) => (
                  <div key={w} className="rounded-md border border-amber-500/30 bg-amber-500/5 p-2 text-[11px] text-amber-700 flex items-start gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    {w}
                  </div>
                ))}
              </div>
            )}
          </div>
          <SheetFooter>
            <Button data-primary className="bg-violet-600 hover:bg-violet-700 text-white" onClick={handleReqSave}>
              Submit Request
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* DELEGATION Sheet                                           */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <Sheet open={delSheetOpen} onOpenChange={setDelSheetOpen}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{delEditId ? 'Edit Delegation' : 'New Delegation'}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 py-4" data-keyboard-form>
            {/* Delegator */}
            <div>
              <Label className="text-xs">Delegator (Manager) *</Label>
              <Select value={delForm.delegatorId} onValueChange={id => {
                const emp = activeEmployees.find(e => e.id === id);
                if (emp) setDelForm(prev => ({ ...prev, delegatorId: emp.id, delegatorCode: emp.empCode, delegatorName: emp.displayName }));
              }}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select manager" /></SelectTrigger>
                <SelectContent>
                  {activeEmployees.map(e => (
                    <SelectItem key={e.id} value={e.id} className="text-xs">{e.empCode} — {e.displayName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Delegatee */}
            <div>
              <Label className="text-xs">Delegatee (Receives Authority) *</Label>
              <Select value={delForm.delegateeId} onValueChange={id => {
                const emp = activeEmployees.find(e => e.id === id);
                if (emp) setDelForm(prev => ({ ...prev, delegateeId: emp.id, delegateeCode: emp.empCode, delegateeName: emp.displayName }));
              }}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select delegatee" /></SelectTrigger>
                <SelectContent>
                  {activeEmployees.map(e => (
                    <SelectItem key={e.id} value={e.id} className="text-xs">{e.empCode} — {e.displayName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date range */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">From Date *</Label>
                <SmartDateInput value={delForm.fromDate} onChange={v => setDelForm(prev => ({ ...prev, fromDate: v }))} />
              </div>
              <div>
                <Label className="text-xs">To Date *</Label>
                <SmartDateInput value={delForm.toDate} onChange={v => setDelForm(prev => ({ ...prev, toDate: v }))} />
              </div>
            </div>

            {/* All Leave Types */}
            <div className="flex items-center gap-3">
              <Switch checked={delForm.allLeaveTypes} onCheckedChange={v => setDelForm(prev => ({ ...prev, allLeaveTypes: v }))} />
              <Label className="text-xs">All Leave Types</Label>
            </div>

            {/* Specific leave types */}
            {!delForm.allLeaveTypes && (
              <div className="space-y-1">
                <Label className="text-xs">Select Leave Types</Label>
                <div className="flex flex-wrap gap-2">
                  {leaveTypes.map(lt => {
                    const selected = delForm.leaveTypeCodes.includes(lt.code);
                    return (
                      <Badge
                        key={lt.id}
                        variant={selected ? 'default' : 'outline'}
                        className="cursor-pointer text-[10px]"
                        onClick={() => {
                          setDelForm(prev => ({
                            ...prev,
                            leaveTypeCodes: selected
                              ? prev.leaveTypeCodes.filter(c => c !== lt.code)
                              : [...prev.leaveTypeCodes, lt.code],
                          }));
                        }}
                      >
                        {lt.code}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Active */}
            <div className="flex items-center gap-3">
              <Switch checked={delForm.isActive} onCheckedChange={v => setDelForm(prev => ({ ...prev, isActive: v }))} />
              <Label className="text-xs">Active</Label>
            </div>

            {/* Reason */}
            <div>
              <Label className="text-xs">Reason</Label>
              <Input className="h-8 text-xs" value={delForm.reason}
                onChange={e => setDelForm(prev => ({ ...prev, reason: e.target.value }))}
                onKeyDown={onEnterNext}
                placeholder="e.g. Going on annual leave" />
            </div>
          </div>
          <SheetFooter>
            <Button data-primary className="bg-violet-600 hover:bg-violet-700 text-white" onClick={handleDelSave}>
              {delEditId ? 'Update Delegation' : 'Create Delegation'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* COMP-OFF Sheet                                             */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <Sheet open={coSheetOpen} onOpenChange={setCoSheetOpen}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Add Comp-Off</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 py-4" data-keyboard-form>
            {/* Employee */}
            <div>
              <Label className="text-xs">Employee *</Label>
              <Select value={coForm.employeeId} onValueChange={id => {
                const emp = activeEmployees.find(e => e.id === id);
                if (emp) setCoForm(prev => ({ ...prev, employeeId: emp.id, employeeCode: emp.empCode, employeeName: emp.displayName }));
              }}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>
                  {activeEmployees.map(e => (
                    <SelectItem key={e.id} value={e.id} className="text-xs">{e.empCode} — {e.displayName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Worked Date */}
            <div>
              <Label className="text-xs">Worked Date *</Label>
              <SmartDateInput value={coForm.workedDate} onChange={v => setCoForm(prev => ({ ...prev, workedDate: v }))} />
              <p className="text-[10px] text-muted-foreground mt-0.5">The holiday/weekend they worked</p>
            </div>

            {/* Hours Worked */}
            <div>
              <Label className="text-xs">Hours Worked *</Label>
              <Input className="h-8 text-xs" type="number" value={coForm.workedHours}
                onChange={e => setCoForm(prev => ({ ...prev, workedHours: Number(e.target.value) }))}
                onKeyDown={onEnterNext} />
            </div>

            {/* Days Earned */}
            <div>
              <Label className="text-xs">Days Earned *</Label>
              <Select value={String(coForm.daysEarned)} onValueChange={v => setCoForm(prev => ({ ...prev, daysEarned: Number(v) }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0.5" className="text-xs">0.5 (Half Day)</SelectItem>
                  <SelectItem value="1" className="text-xs">1.0 (Full Day)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Expiry Date */}
            <div>
              <Label className="text-xs">Expiry Date *</Label>
              <SmartDateInput value={coForm.expiryDate} onChange={v => setCoForm(prev => ({ ...prev, expiryDate: v }))} />
              <p className="text-[10px] text-muted-foreground mt-0.5">Typically 3 months from worked date</p>
            </div>

            {/* Remarks */}
            <div>
              <Label className="text-xs">Remarks</Label>
              <Input className="h-8 text-xs" value={coForm.remarks}
                onChange={e => setCoForm(prev => ({ ...prev, remarks: e.target.value }))}
                onKeyDown={onEnterNext}
                placeholder="Optional notes" />
            </div>
          </div>
          <SheetFooter>
            <Button data-primary className="bg-violet-600 hover:bg-violet-700 text-white" onClick={handleCoSave}>
              Add Comp-Off
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default function LeaveRequests() {
  return <LeaveRequestsPanel />;
}
