import React, { useState, useMemo, useCallback } from 'react';
import { format, parseISO } from 'date-fns';
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
import { Separator } from '@/components/ui/separator';
import { UserCog, Mail, Monitor, Shield, Plus, Check,
  Eye, Trash2, BarChart2 } from 'lucide-react';
import { toast } from 'sonner';
import type { AccessRole, EmailTemplate, ActivityLog, ESSConfig,
  AdminTab, RoleLevel, TemplateEvent, ActivityCategory } from '@/types/admin-config';
import { ACCESS_ROLES_KEY, EMAIL_TEMPLATES_KEY, ACTIVITY_LOGS_KEY, ESS_CONFIG_KEY,
  ROLE_LEVEL_LABELS, TEMPLATE_EVENT_LABELS, ACTIVITY_CATEGORY_COLORS,
  DEFAULT_MODULES, makeDefaultRoles } from '@/types/admin-config';
import type { Employee } from '@/types/employee';
import type { PayrollRun } from '@/types/payroll-run';
import type { LeaveRequest } from '@/types/leave-management';
import type { AttendanceRecord } from '@/types/attendance-entry';
import type { ITDeclaration } from '@/types/it-declaration';
import { EMPLOYEES_KEY } from '@/types/employee';
import { PAYROLL_RUNS_KEY } from '@/types/payroll-run';
import { LEAVE_REQUESTS_KEY } from '@/types/leave-management';
import { ATTENDANCE_RECORDS_KEY } from '@/types/attendance-entry';
import { IT_DECLARATIONS_KEY } from '@/types/it-declaration';
import { toIndianFormat, onEnterNext, useCtrlS } from '@/lib/keyboard';

/* ── helpers ─────────────────────────────────────────────────────── */
const ROLE_LEVEL_COLORS: Record<RoleLevel, string> = {
  superadmin: 'bg-red-500/10 text-red-700 border-red-500/30',
  hr_admin:   'bg-violet-500/10 text-violet-700 border-violet-500/30',
  hr_manager: 'bg-blue-500/10 text-blue-700 border-blue-500/30',
  manager:    'bg-amber-500/10 text-amber-700 border-amber-500/30',
  employee:   'bg-green-500/10 text-green-700 border-green-500/30',
};

/* ── Component ───────────────────────────────────────────────────── */
interface AdminAndMonitoringPanelProps { defaultTab?: AdminTab; }

export function AdminAndMonitoringPanel({ defaultTab = 'ess' }: AdminAndMonitoringPanelProps) {

  // ── Cross-module reads ───────────────────────────────────────
  const activeEmployees = useMemo<Employee[]>(() => {
    try {
      // [JWT] GET /api/pay-hub/employees
      const raw = localStorage.getItem(EMPLOYEES_KEY);
      if (raw) return (JSON.parse(raw) as Employee[]).filter(e => e.status === 'active');
    } catch { /* ignore */ }
    return [];
  }, []);

  // ── ESS Config state (single record) ────────────────────────
  const [essConfig, setEssConfig] = useState<ESSConfig>(() => {
    try {
      // [JWT] GET /api/pay-hub/admin/ess-config
      const raw = localStorage.getItem(ESS_CONFIG_KEY);
      if (raw) return JSON.parse(raw);
    } catch { /* ignore */ }
    return {
      id: 'ess-config', payslipAccess: true, leaveApplicationAccess: true,
      attendanceViewAccess: true, itDeclarationAccess: true, reimbursementAccess: true,
      profileEditAccess: false, documentDownloadAccess: true, announcementsAccess: true,
      updated_at: new Date().toISOString(),
    };
  });
  const saveEssConfig = (cfg: ESSConfig) => {
    // [JWT] PUT /api/pay-hub/admin/ess-config
    localStorage.setItem(ESS_CONFIG_KEY, JSON.stringify(cfg));
    setEssConfig(cfg);
    toast.success('ESS configuration saved');
  };

  // ── Access Roles state (seed defaults if empty) ──────────────
  const [roles, setRoles] = useState<AccessRole[]>(() => {
    try {
      // [JWT] GET /api/pay-hub/admin/roles
      const raw = localStorage.getItem(ACCESS_ROLES_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.length > 0) return parsed;
      }
    } catch { /* ignore */ }
    const now = new Date().toISOString();
    const seeded = makeDefaultRoles().map((r, i) => ({
      ...r, id: `role-${i + 1}`, created_at: now, updated_at: now,
    }));
    // [JWT] PUT /api/pay-hub/admin/roles (seed)
    localStorage.setItem(ACCESS_ROLES_KEY, JSON.stringify(seeded));
    return seeded;
  });
  const saveRoles = (items: AccessRole[]) => {
    // [JWT] PUT /api/pay-hub/admin/roles
    localStorage.setItem(ACCESS_ROLES_KEY, JSON.stringify(items));
    setRoles(items);
  };

  // ── Email Templates state ────────────────────────────────────
  const [templates, setTemplates] = useState<EmailTemplate[]>(() => {
    try {
      // [JWT] GET /api/pay-hub/admin/email-templates
      const raw = localStorage.getItem(EMAIL_TEMPLATES_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });
  const saveTemplates = (items: EmailTemplate[]) => {
    // [JWT] PUT /api/pay-hub/admin/email-templates
    localStorage.setItem(EMAIL_TEMPLATES_KEY, JSON.stringify(items));
    setTemplates(items);
  };

  // ── Activity Logs state ──────────────────────────────────────
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>(() => {
    try {
      // [JWT] GET /api/pay-hub/admin/activity-logs
      const raw = localStorage.getItem(ACTIVITY_LOGS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });
  const saveActivityLogs = (items: ActivityLog[]) => {
    // [JWT] PUT /api/pay-hub/admin/activity-logs
    localStorage.setItem(ACTIVITY_LOGS_KEY, JSON.stringify(items));
    setActivityLogs(items);
  };

  // ── Role Sheet ───────────────────────────────────────────────
  const [roleSheetOpen, setRoleSheetOpen] = useState(false);
  const [roleEditId, setRoleEditId] = useState<string | null>(null);
  const BLANK_ROLE = {
    roleCode: '', roleName: '', level: 'manager' as RoleLevel,
    description: '', isSystemRole: false,
    assignedEmployeeIds: [] as string[],
    permissions: DEFAULT_MODULES.map(m => ({
      module: m, canView: true, canCreate: false,
      canEdit: false, canDelete: false, canApprove: false,
    })),
  };
  const [roleForm, setRoleForm] = useState(BLANK_ROLE);

  const handleRoleSave = useCallback(() => {
    if (!roleSheetOpen) return;
    if (!roleForm.roleName.trim()) return toast.error('Role name required');
    const now = new Date().toISOString();
    if (roleEditId) {
      saveRoles(roles.map(r => r.id !== roleEditId ? r : { ...r, ...roleForm, updated_at: now }));
    } else {
      const code = `ROLE-${String(roles.length + 1).padStart(3, '0')}`;
      saveRoles([...roles, {
        ...roleForm, id: `role-${Date.now()}`, roleCode: code,
        created_at: now, updated_at: now,
      }]);
    }
    toast.success('Role saved');
    setRoleSheetOpen(false); setRoleEditId(null); setRoleForm(BLANK_ROLE);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleSheetOpen, roleForm, roleEditId, roles]);

  // ── Template Sheet ───────────────────────────────────────────
  const [templateSheetOpen, setTemplateSheetOpen] = useState(false);
  const [templateEditId, setTemplateEditId] = useState<string | null>(null);
  const BLANK_TMPL = {
    event: 'custom' as TemplateEvent, name: '', subject: '',
    bodyHtml: '', isActive: true, lastUsed: '',
  };
  const [templateForm, setTemplateForm] = useState(BLANK_TMPL);
  const tuf = <K extends keyof typeof BLANK_TMPL>(k: K, v: (typeof BLANK_TMPL)[K]) =>
    setTemplateForm(prev => ({ ...prev, [k]: v }));

  const detectedPlaceholders = useMemo(() => {
    const matches = templateForm.bodyHtml.match(/\{\{[^}]+\}\}/g);
    return matches ? [...new Set(matches)] : [];
  }, [templateForm.bodyHtml]);

  const handleTemplateSave = useCallback(() => {
    if (!templateSheetOpen) return;
    if (!templateForm.name.trim()) return toast.error('Template name required');
    if (!templateForm.subject.trim()) return toast.error('Subject required');
    const now = new Date().toISOString();
    const placeholders = templateForm.bodyHtml.match(/\{\{[^}]+\}\}/g) || [];
    if (templateEditId) {
      saveTemplates(templates.map(t => t.id !== templateEditId ? t
        : { ...t, ...templateForm, placeholders: [...new Set(placeholders)], updated_at: now }));
    } else {
      const code = `TMPL-${String(templates.length + 1).padStart(6, '0')}`;
      saveTemplates([...templates, {
        ...templateForm, id: `tmpl-${Date.now()}`, templateCode: code,
        placeholders: [...new Set(placeholders)],
        created_at: now, updated_at: now,
      }]);
    }
    toast.success('Template saved');
    setTemplateSheetOpen(false); setTemplateEditId(null); setTemplateForm(BLANK_TMPL);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateSheetOpen, templateForm, templateEditId, templates]);

  // ── Activity Sheet ───────────────────────────────────────────
  const [activitySheetOpen, setActivitySheetOpen] = useState(false);
  const BLANK_ACT = {
    employeeId: '', employeeCode: '', employeeName: '',
    date: '', productiveHours: 0, neutralHours: 0, unproductiveHours: 0,
    topApps: '', notes: '', source: 'manual',
  };
  const [actForm, setActForm] = useState(BLANK_ACT);
  const auf = <K extends keyof typeof BLANK_ACT>(k: K, v: (typeof BLANK_ACT)[K]) =>
    setActForm(prev => ({ ...prev, [k]: v }));

  const actTotal = actForm.productiveHours + actForm.neutralHours + actForm.unproductiveHours;
  const actScore = actTotal > 0 ? Math.round((actForm.productiveHours / actTotal) * 100) : 0;

  const handleActivitySave = useCallback(() => {
    if (!activitySheetOpen) return;
    if (!actForm.employeeId) return toast.error('Select an employee');
    if (!actForm.date) return toast.error('Date is required');
    const total = actForm.productiveHours + actForm.neutralHours + actForm.unproductiveHours;
    const score = total > 0 ? Math.round((actForm.productiveHours / total) * 100) : 0;
    const now = new Date().toISOString();
    const apps = actForm.topApps.split(',').map(s => s.trim()).filter(Boolean).slice(0, 5);
    saveActivityLogs([...activityLogs, {
      id: `act-${Date.now()}`,
      employeeId: actForm.employeeId, employeeCode: actForm.employeeCode,
      employeeName: actForm.employeeName, date: actForm.date,
      productiveHours: actForm.productiveHours, neutralHours: actForm.neutralHours,
      unproductiveHours: actForm.unproductiveHours,
      totalTrackedHours: total, productivityScore: score,
      topApplications: apps, notes: actForm.notes, source: actForm.source,
      created_at: now, updated_at: now,
    }]);
    toast.success('Activity logged');
    setActivitySheetOpen(false); setActForm(BLANK_ACT);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activitySheetOpen, actForm, activityLogs]);

  // ── masterSave ────────────────────────────────────────────────
  const masterSave = useCallback(() => {
    if (roleSheetOpen) { handleRoleSave(); return; }
    if (templateSheetOpen) { handleTemplateSave(); return; }
    if (activitySheetOpen) { handleActivitySave(); return; }
  }, [roleSheetOpen, templateSheetOpen, activitySheetOpen, handleRoleSave, handleTemplateSave, handleActivitySave]);
  useCtrlS(masterSave);

  // ── ESS Preview state ────────────────────────────────────────
  const [essEmpId, setEssEmpId] = useState('');

  const essPayslips = useMemo(() => {
    if (!essEmpId) return [];
    try {
      // [JWT] GET /api/pay-hub/payroll/runs
      const raw = localStorage.getItem(PAYROLL_RUNS_KEY);
      if (!raw) return [];
      const runs = JSON.parse(raw) as PayrollRun[];
      const slips: Array<{ period: string; gross: number; net: number; status: string }> = [];
      runs.sort((a, b) => b.payPeriod.localeCompare(a.payPeriod));
      for (const run of runs) {
        const ps = run.payslips.find(p => p.employeeId === essEmpId);
        if (ps) slips.push({ period: run.payPeriod, gross: ps.grossEarnings, net: ps.netPay, status: run.status });
        if (slips.length >= 3) break;
      }
      return slips;
    } catch { return []; }
  }, [essEmpId]);

  const essLeaves = useMemo(() => {
    if (!essEmpId) return [];
    try {
      // [JWT] GET /api/pay-hub/leaves
      const raw = localStorage.getItem(LEAVE_REQUESTS_KEY);
      if (!raw) return [];
      return (JSON.parse(raw) as LeaveRequest[])
        .filter(l => l.employeeId === essEmpId)
        .slice(-5);
    } catch { return []; }
  }, [essEmpId]);

  const essAttendance = useMemo(() => {
    if (!essEmpId) return null;
    try {
      // [JWT] GET /api/pay-hub/attendance
      const raw = localStorage.getItem(ATTENDANCE_RECORDS_KEY);
      if (!raw) return null;
      const prefix = format(new Date(), 'yyyy-MM');
      const recs = (JSON.parse(raw) as AttendanceRecord[])
        .filter(r => r.employeeId === essEmpId && r.date.startsWith(prefix));
      const present = recs.filter(r => r.attendanceTypeCode === 'P').length;
      const absent = recs.filter(r => r.attendanceTypeCode === 'A').length;
      const late = recs.filter(r => r.isLate).length;
      return { present, absent, late, total: recs.length };
    } catch { return null; }
  }, [essEmpId]);

  const essITDeclaration = useMemo(() => {
    if (!essEmpId) return null;
    try {
      // [JWT] GET /api/pay-hub/it-declarations
      const raw = localStorage.getItem(IT_DECLARATIONS_KEY);
      if (!raw) return null;
      return (JSON.parse(raw) as ITDeclaration[]).find(d => d.employeeId === essEmpId) || null;
    } catch { return null; }
  }, [essEmpId]);

  // ── Access Control state ─────────────────────────────────────
  const [expandedRoleId, setExpandedRoleId] = useState<string | null>(null);

  // ── Template filter state ────────────────────────────────────
  const [tmplFilter, setTmplFilter] = useState<string>('all');
  const [tmplActiveOnly, setTmplActiveOnly] = useState(false);

  const filteredTemplates = useMemo(() => {
    return templates.filter(t => {
      if (tmplFilter !== 'all' && t.event !== tmplFilter) return false;
      if (tmplActiveOnly && !t.isActive) return false;
      return true;
    });
  }, [templates, tmplFilter, tmplActiveOnly]);

  // ── Activity filter state ────────────────────────────────────
  const [actFilterEmp, setActFilterEmp] = useState('all');
  const [actFilterDate, setActFilterDate] = useState('');

  const filteredLogs = useMemo(() => {
    return activityLogs.filter(l => {
      if (actFilterEmp !== 'all' && l.employeeId !== actFilterEmp) return false;
      if (actFilterDate && l.date !== actFilterDate) return false;
      return true;
    });
  }, [activityLogs, actFilterEmp, actFilterDate]);

  // ── Department productivity ──────────────────────────────────
  const deptProductivity = useMemo(() => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const cutoff = format(sevenDaysAgo, 'yyyy-MM-dd');
    const recentLogs = activityLogs.filter(l => l.date >= cutoff);
    const deptMap = new Map<string, number[]>();
    recentLogs.forEach(l => {
      const emp = activeEmployees.find(e => e.id === l.employeeId);
      const dept = emp?.departmentName || 'Unknown';
      if (!deptMap.has(dept)) deptMap.set(dept, []);
      deptMap.get(dept)!.push(l.productivityScore);
    });
    return [...deptMap.entries()].map(([dept, scores]) => ({
      dept,
      avgScore: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
    })).sort((a, b) => b.avgScore - a.avgScore);
  }, [activityLogs, activeEmployees]);

  // ── Stats ────────────────────────────────────────────────────
  const thisWeekLogs = useMemo(() => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const cutoff = format(sevenDaysAgo, 'yyyy-MM-dd');
    return activityLogs.filter(l => l.date >= cutoff).length;
  }, [activityLogs]);

  const scoreColor = (s: number) => s >= 80 ? 'bg-green-500' : s >= 60 ? 'bg-amber-500' : 'bg-red-500';
  const scoreBadge = (s: number) => s >= 80 ? 'text-green-700 bg-green-500/10' : s >= 60 ? 'text-amber-700 bg-amber-500/10' : 'text-red-700 bg-red-500/10';

  /* ── RENDER ─────────────────────────────────────────────────── */
  return (
    <div className="space-y-4" data-keyboard-form>
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-violet-500/15 flex items-center justify-center">
          <UserCog className="h-5 w-5 text-violet-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Admin & Monitoring</h1>
          <p className="text-xs text-muted-foreground">ESS Portal · Access Control · Email Templates · Activity Monitoring</p>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-3 text-center">
          <p className="text-2xl font-bold">{activeEmployees.length}</p>
          <p className="text-xs text-muted-foreground">Active Employees</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-2xl font-bold">{roles.length}</p>
          <p className="text-xs text-muted-foreground">Access Roles</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-2xl font-bold">{templates.length}</p>
          <p className="text-xs text-muted-foreground">Email Templates</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-2xl font-bold">{thisWeekLogs}</p>
          <p className="text-xs text-muted-foreground">Activity Records This Week</p>
        </CardContent></Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue={defaultTab}>
        <TabsList>
          <TabsTrigger value="ess"><UserCog className="h-3.5 w-3.5 mr-1" /> ESS Portal</TabsTrigger>
          <TabsTrigger value="access"><Shield className="h-3.5 w-3.5 mr-1" /> Access Control</TabsTrigger>
          <TabsTrigger value="templates"><Mail className="h-3.5 w-3.5 mr-1" /> Email Templates</TabsTrigger>
          <TabsTrigger value="activity"><Monitor className="h-3.5 w-3.5 mr-1" /> Activity Monitoring</TabsTrigger>
        </TabsList>

        {/* ══════ TAB: ESS Portal ══════ */}
        <TabsContent value="ess" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* LEFT: ESS Feature Configuration */}
            <Card>
              <CardContent className="p-4 space-y-3">
                <h3 className="text-sm font-bold">ESS Feature Configuration</h3>
                <Separator />
                {([
                  ['payslipAccess', 'Payslip Access'],
                  ['leaveApplicationAccess', 'Leave Application'],
                  ['attendanceViewAccess', 'Attendance View'],
                  ['itDeclarationAccess', 'IT Declaration'],
                  ['reimbursementAccess', 'Expense Reimbursement'],
                  ['profileEditAccess', 'Profile Edit'],
                  ['documentDownloadAccess', 'Document Download'],
                  ['announcementsAccess', 'Announcements'],
                ] as [keyof ESSConfig, string][]).map(([key, label]) => (
                  <div key={key} className="flex items-center justify-between">
                    <Label className="text-xs">{label}</Label>
                    <Switch
                      checked={essConfig[key] as boolean}
                      onCheckedChange={v => setEssConfig({ ...essConfig, [key]: v, updated_at: new Date().toISOString() })}
                    />
                  </div>
                ))}
                <Button size="sm" data-primary onClick={() => saveEssConfig(essConfig)}>
                  <Check className="h-3.5 w-3.5 mr-1" /> Save Configuration
                </Button>
              </CardContent>
            </Card>

            {/* RIGHT: ESS Portal Preview */}
            <Card>
              <CardContent className="p-4 space-y-3">
                <h3 className="text-sm font-bold">ESS Portal Preview</h3>
                <Select value={essEmpId} onValueChange={setEssEmpId}>
                  <SelectTrigger className="text-xs"><SelectValue placeholder="Select employee to preview" /></SelectTrigger>
                  <SelectContent>
                    {activeEmployees.map(e => <SelectItem key={e.id} value={e.id}>{e.empCode} — {e.displayName}</SelectItem>)}
                  </SelectContent>
                </Select>

                {!essEmpId && <p className="text-xs text-muted-foreground text-center py-6">Select an employee to preview their ESS portal</p>}

                {essEmpId && (
                  <div className="space-y-3">
                    {/* Payslips */}
                    {essConfig.payslipAccess ? (
                      <div>
                        <h4 className="text-xs font-semibold mb-1">📄 My Payslips</h4>
                        {essPayslips.length === 0 ? (
                          <p className="text-[10px] text-muted-foreground">No payslips available</p>
                        ) : (
                          <Table>
                            <TableHeader><TableRow>
                              <TableHead className="text-[10px]">Period</TableHead>
                              <TableHead className="text-[10px]">Gross</TableHead>
                              <TableHead className="text-[10px]">Net</TableHead>
                              <TableHead className="text-[10px]">Status</TableHead>
                            </TableRow></TableHeader>
                            <TableBody>
                              {essPayslips.map((ps, i) => (
                                <TableRow key={i}>
                                  <TableCell className="text-[10px]">{ps.period}</TableCell>
                                  <TableCell className="text-[10px]">₹{toIndianFormat(ps.gross)}</TableCell>
                                  <TableCell className="text-[10px]">₹{toIndianFormat(ps.net)}</TableCell>
                                  <TableCell><Badge variant="outline" className="text-[8px]">{ps.status}</Badge></TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                      </div>
                    ) : <p className="text-[10px] text-muted-foreground italic">📄 Payslip Access — Feature disabled</p>}

                    {/* Leaves */}
                    {essConfig.leaveApplicationAccess ? (
                      <div>
                        <h4 className="text-xs font-semibold mb-1">🌴 My Leaves</h4>
                        {essLeaves.length === 0 ? (
                          <p className="text-[10px] text-muted-foreground">No leave requests</p>
                        ) : (
                          <div className="space-y-1">
                            {essLeaves.map(l => (
                              <div key={l.id} className="flex items-center gap-2 text-[10px]">
                                <Badge variant="outline" className="text-[8px]">{l.leaveTypeName}</Badge>
                                <span>{l.fromDate} → {l.toDate}</span>
                                <Badge variant="outline" className="text-[8px]">{l.status}</Badge>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : <p className="text-[10px] text-muted-foreground italic">🌴 Leave Application — Feature disabled</p>}

                    {/* Attendance */}
                    {essConfig.attendanceViewAccess ? (
                      <div>
                        <h4 className="text-xs font-semibold mb-1">📋 Attendance (This Month)</h4>
                        {!essAttendance ? (
                          <p className="text-[10px] text-muted-foreground">No attendance data</p>
                        ) : (
                          <div className="flex gap-4 text-[10px]">
                            <span className="text-green-600">Present: {essAttendance.present}</span>
                            <span className="text-red-600">Absent: {essAttendance.absent}</span>
                            <span className="text-amber-600">Late: {essAttendance.late}</span>
                          </div>
                        )}
                      </div>
                    ) : <p className="text-[10px] text-muted-foreground italic">📋 Attendance View — Feature disabled</p>}

                    {/* IT Declaration */}
                    {essConfig.itDeclarationAccess ? (
                      <div>
                        <h4 className="text-xs font-semibold mb-1">📝 IT Declaration</h4>
                        <p className="text-[10px]">
                          Form 12BB submitted: {essITDeclaration ? <span className="text-green-600 font-semibold">Yes ({essITDeclaration.regime})</span> : <span className="text-red-600">No</span>}
                        </p>
                      </div>
                    ) : <p className="text-[10px] text-muted-foreground italic">📝 IT Declaration — Feature disabled</p>}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ══════ TAB: Access Control ══════ */}
        <TabsContent value="access" className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">System roles cannot be modified. Create custom roles for specific job functions or teams.</p>
            <Button size="sm" onClick={() => { setRoleEditId(null); setRoleForm(BLANK_ROLE); setRoleSheetOpen(true); }}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Custom Role
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Role Code</TableHead>
                <TableHead className="text-xs">Role Name</TableHead>
                <TableHead className="text-xs">Level</TableHead>
                <TableHead className="text-xs">Assigned</TableHead>
                <TableHead className="text-xs">System</TableHead>
                <TableHead className="text-xs">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roles.map(r => (
                <React.Fragment key={r.id}>
                  <TableRow className="cursor-pointer hover:bg-muted/40"
                    onClick={() => setExpandedRoleId(expandedRoleId === r.id ? null : r.id)}>
                    <TableCell className="text-xs font-mono">{r.roleCode}</TableCell>
                    <TableCell className="text-xs font-medium">{r.roleName}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[10px] ${ROLE_LEVEL_COLORS[r.level] || ''}`}>
                        {ROLE_LEVEL_LABELS[r.level]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      <div className="flex items-center gap-1">
                        <span>{r.assignedEmployeeIds.length}</span>
                        {r.assignedEmployeeIds.slice(0, 3).map(eid => {
                          const emp = activeEmployees.find(e => e.id === eid);
                          return emp ? (
                            <span key={eid} className="h-5 w-5 rounded-full bg-violet-500/20 text-[8px] flex items-center justify-center font-bold text-violet-700">
                              {emp.displayName.split(' ').map(w => w[0]).join('').slice(0, 2)}
                            </span>
                          ) : null;
                        })}
                      </div>
                    </TableCell>
                    <TableCell>
                      {r.isSystemRole && <Badge variant="outline" className="text-[10px] bg-slate-500/10 text-slate-600">System</Badge>}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                        {r.isSystemRole ? (
                          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => {
                            setRoleEditId(r.id);
                            setRoleForm({
                              roleCode: r.roleCode, roleName: r.roleName, level: r.level,
                              description: r.description, isSystemRole: r.isSystemRole,
                              assignedEmployeeIds: r.assignedEmployeeIds,
                              permissions: r.permissions,
                            });
                            setRoleSheetOpen(true);
                          }}>Edit Assignments</Button>
                        ) : (
                          <>
                            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => {
                              setRoleEditId(r.id);
                              setRoleForm({
                                roleCode: r.roleCode, roleName: r.roleName, level: r.level,
                                description: r.description, isSystemRole: r.isSystemRole,
                                assignedEmployeeIds: r.assignedEmployeeIds,
                                permissions: r.permissions,
                              });
                              setRoleSheetOpen(true);
                            }}>Edit</Button>
                            <Button size="sm" variant="ghost" className="h-7 text-xs text-red-600" onClick={() => {
                              saveRoles(roles.filter(x => x.id !== r.id));
                              toast.success('Role deleted');
                            }}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                  {expandedRoleId === r.id && (
                    <TableRow>
                      <TableCell colSpan={6} className="bg-muted/20 p-3">
                        <p className="text-xs font-semibold mb-2">Permissions — {r.roleName}</p>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-[10px]">Module</TableHead>
                              <TableHead className="text-[10px] text-center">View</TableHead>
                              <TableHead className="text-[10px] text-center">Create</TableHead>
                              <TableHead className="text-[10px] text-center">Edit</TableHead>
                              <TableHead className="text-[10px] text-center">Delete</TableHead>
                              <TableHead className="text-[10px] text-center">Approve</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {r.permissions.map(p => (
                              <TableRow key={p.module}>
                                <TableCell className="text-[10px] capitalize">{p.module}</TableCell>
                                {(['canView', 'canCreate', 'canEdit', 'canDelete', 'canApprove'] as const).map(perm => (
                                  <TableCell key={perm} className="text-center">
                                    {p[perm] ? <Check className="h-3 w-3 text-green-600 mx-auto" /> : <span className="text-muted-foreground">—</span>}
                                  </TableCell>
                                ))}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </TabsContent>

        {/* ══════ TAB: Email Templates ══════ */}
        <TabsContent value="templates" className="space-y-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <Select value={tmplFilter} onValueChange={setTmplFilter}>
                <SelectTrigger className="w-48 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Events</SelectItem>
                  {(Object.keys(TEMPLATE_EVENT_LABELS) as TemplateEvent[]).map(e => (
                    <SelectItem key={e} value={e}>{TEMPLATE_EVENT_LABELS[e]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-1">
                <Switch checked={tmplActiveOnly} onCheckedChange={setTmplActiveOnly} />
                <Label className="text-xs">Active only</Label>
              </div>
            </div>
            <Button size="sm" onClick={() => { setTemplateEditId(null); setTemplateForm(BLANK_TMPL); setTemplateSheetOpen(true); }}>
              <Plus className="h-3.5 w-3.5 mr-1" /> New Template
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Code</TableHead>
                <TableHead className="text-xs">Event</TableHead>
                <TableHead className="text-xs">Name</TableHead>
                <TableHead className="text-xs">Subject</TableHead>
                <TableHead className="text-xs">Active</TableHead>
                <TableHead className="text-xs">Last Used</TableHead>
                <TableHead className="text-xs">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTemplates.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No templates found</TableCell></TableRow>
              )}
              {filteredTemplates.map(t => (
                <TableRow key={t.id}>
                  <TableCell className="text-xs font-mono">{t.templateCode}</TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">{TEMPLATE_EVENT_LABELS[t.event]}</Badge></TableCell>
                  <TableCell className="text-xs font-medium">{t.name}</TableCell>
                  <TableCell className="text-xs max-w-[200px] truncate">{t.subject}</TableCell>
                  <TableCell>
                    {t.isActive ? <Badge className="text-[10px] bg-green-500/10 text-green-700 border-green-500/30">Active</Badge>
                      : <Badge variant="outline" className="text-[10px]">Inactive</Badge>}
                  </TableCell>
                  <TableCell className="text-xs">{t.lastUsed ? format(parseISO(t.lastUsed), 'dd MMM yyyy') : '—'}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => {
                        setTemplateEditId(t.id);
                        setTemplateForm({
                          event: t.event, name: t.name, subject: t.subject,
                          bodyHtml: t.bodyHtml, isActive: t.isActive, lastUsed: t.lastUsed,
                        });
                        setTemplateSheetOpen(true);
                      }}>Edit</Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => {
                        saveTemplates(templates.map(x => x.id !== t.id ? x : { ...x, isActive: !x.isActive, updated_at: new Date().toISOString() }));
                      }}>{t.isActive ? 'Deactivate' : 'Activate'}</Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => {
                        toast.info(`Preview: ${t.subject}\n\n${t.bodyHtml.slice(0, 200)}...`);
                      }}>
                        <Eye className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>

        {/* ══════ TAB: Activity Monitoring ══════ */}
        <TabsContent value="activity" className="space-y-4">
          <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-3">
            <p className="text-xs text-blue-700 dark:text-blue-300">
              <Monitor className="h-3.5 w-3.5 inline mr-1" />
              Activity Monitoring tracks employee productivity. In production, data is collected via the OS agent.
              Use this panel to review data, manually log entries, and configure monitoring.
            </p>
          </div>

          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold flex items-center gap-1">
              <BarChart2 className="h-4 w-4" /> Productivity This Week (Last 7 Days)
            </h3>
            <Button size="sm" onClick={() => { setActForm(BLANK_ACT); setActivitySheetOpen(true); }}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Log Activity
            </Button>
          </div>

          {/* SECTION A: Department Productivity Dashboard */}
          {deptProductivity.length === 0 ? (
            <p className="text-xs text-muted-foreground">No activity data this week. Log entries to see department productivity.</p>
          ) : (
            <div className="space-y-2">
              {deptProductivity.map(d => (
                <div key={d.dept} className="flex items-center gap-3">
                  <span className="text-xs w-28 truncate">{d.dept}</span>
                  <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
                    <div
                      style={{ width: `${d.avgScore}%` }}
                      className={`h-full rounded-full transition-all ${scoreColor(d.avgScore)}`}
                    />
                  </div>
                  <span className="text-xs font-mono w-10 text-right">{d.avgScore}%</span>
                </div>
              ))}
            </div>
          )}

          <Separator />

          {/* SECTION B: Individual Activity Log */}
          <h3 className="text-sm font-bold">Individual Activity Log</h3>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={actFilterEmp} onValueChange={setActFilterEmp}>
              <SelectTrigger className="w-48 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Employees</SelectItem>
                {activeEmployees.map(e => <SelectItem key={e.id} value={e.id}>{e.empCode} — {e.displayName}</SelectItem>)}
              </SelectContent>
            </Select>
            <SmartDateInput value={actFilterDate} onChange={setActFilterDate} />
            {actFilterDate && <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setActFilterDate('')}>Clear Date</Button>}
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Employee</TableHead>
                <TableHead className="text-xs">Date</TableHead>
                <TableHead className="text-xs">Productive</TableHead>
                <TableHead className="text-xs">Neutral</TableHead>
                <TableHead className="text-xs">Unproductive</TableHead>
                <TableHead className="text-xs">Score</TableHead>
                <TableHead className="text-xs">Source</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No activity logs found</TableCell></TableRow>
              )}
              {filteredLogs.map(l => (
                <TableRow key={l.id}>
                  <TableCell className="text-xs">{l.employeeName}</TableCell>
                  <TableCell className="text-xs">{l.date ? format(parseISO(l.date), 'dd MMM yyyy') : '—'}</TableCell>
                  <TableCell className="text-xs">{l.productiveHours}h</TableCell>
                  <TableCell className="text-xs">{l.neutralHours}h</TableCell>
                  <TableCell className="text-xs">{l.unproductiveHours}h</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-[10px] ${scoreBadge(l.productivityScore)}`}>
                      {l.productivityScore}%
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">
                    <Badge variant="outline" className="text-[10px]">{l.source}</Badge>
                    {l.topApplications.length > 0 && (
                      <div className="flex flex-wrap gap-0.5 mt-0.5">
                        {l.topApplications.map((app, i) => (
                          <span key={i} className="text-[8px] bg-muted px-1 rounded">{app}</span>
                        ))}
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>

      {/* ═══ Role Sheet ═══ */}
      <Sheet open={roleSheetOpen} onOpenChange={v => { if (!v) { setRoleSheetOpen(false); setRoleEditId(null); setRoleForm(BLANK_ROLE); } }}>
        <SheetContent className="sm:max-w-xl overflow-y-auto">
          <SheetHeader><SheetTitle>{roleEditId ? 'Edit Role' : 'New Custom Role'}</SheetTitle></SheetHeader>
          <div className="space-y-3 py-4" data-keyboard-form>
            <div><Label className="text-xs">Role Name *</Label><Input value={roleForm.roleName} onChange={e => setRoleForm({ ...roleForm, roleName: e.target.value })} onKeyDown={onEnterNext} disabled={roleForm.isSystemRole} /></div>
            <div>
              <Label className="text-xs">Level</Label>
              <Select value={roleForm.level} onValueChange={v => setRoleForm({ ...roleForm, level: v as RoleLevel })} disabled={roleForm.isSystemRole}>
                <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(ROLE_LEVEL_LABELS) as RoleLevel[]).map(l => (
                    <SelectItem key={l} value={l}>{ROLE_LEVEL_LABELS[l]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Description</Label><Textarea value={roleForm.description} onChange={e => setRoleForm({ ...roleForm, description: e.target.value })} rows={2} disabled={roleForm.isSystemRole} /></div>

            {/* Assigned Employees */}
            <div>
              <Label className="text-xs">Assigned Employees</Label>
              <div className="border rounded p-2 max-h-32 overflow-y-auto space-y-1">
                {activeEmployees.map(emp => (
                  <div key={emp.id} className="flex items-center gap-2">
                    <input type="checkbox" className="h-3 w-3"
                      checked={roleForm.assignedEmployeeIds.includes(emp.id)}
                      onChange={e => {
                        const ids = e.target.checked
                          ? [...roleForm.assignedEmployeeIds, emp.id]
                          : roleForm.assignedEmployeeIds.filter(id => id !== emp.id);
                        setRoleForm({ ...roleForm, assignedEmployeeIds: ids });
                      }}
                    />
                    <span className="text-xs">{emp.empCode} — {emp.displayName}</span>
                  </div>
                ))}
                {activeEmployees.length === 0 && <p className="text-[10px] text-muted-foreground">No active employees</p>}
              </div>
            </div>

            {/* Permissions */}
            {!roleForm.isSystemRole && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label className="text-xs">Permissions</Label>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => {
                      setRoleForm({
                        ...roleForm,
                        permissions: roleForm.permissions.map(p => ({ ...p, canView: true })),
                      });
                    }}>View All</Button>
                    <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => {
                      setRoleForm({
                        ...roleForm,
                        permissions: roleForm.permissions.map(p => ({
                          ...p, canView: true, canCreate: true, canEdit: true, canDelete: true, canApprove: true,
                        })),
                      });
                    }}>Grant All</Button>
                  </div>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-[10px]">Module</TableHead>
                      <TableHead className="text-[10px] text-center">View</TableHead>
                      <TableHead className="text-[10px] text-center">Create</TableHead>
                      <TableHead className="text-[10px] text-center">Edit</TableHead>
                      <TableHead className="text-[10px] text-center">Delete</TableHead>
                      <TableHead className="text-[10px] text-center">Approve</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {roleForm.permissions.map((p, idx) => (
                      <TableRow key={p.module}>
                        <TableCell className="text-[10px] capitalize">{p.module}</TableCell>
                        {(['canView', 'canCreate', 'canEdit', 'canDelete', 'canApprove'] as const).map(perm => (
                          <TableCell key={perm} className="text-center">
                            <Switch className="scale-75"
                              checked={p[perm]}
                              onCheckedChange={v => {
                                const perms = [...roleForm.permissions];
                                perms[idx] = { ...perms[idx], [perm]: v };
                                setRoleForm({ ...roleForm, permissions: perms });
                              }}
                            />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
          <SheetFooter>
            <Button data-primary onClick={handleRoleSave}>Save Role</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ═══ Template Sheet ═══ */}
      <Sheet open={templateSheetOpen} onOpenChange={v => { if (!v) { setTemplateSheetOpen(false); setTemplateEditId(null); setTemplateForm(BLANK_TMPL); } }}>
        <SheetContent className="sm:max-w-2xl overflow-y-auto">
          <SheetHeader><SheetTitle>{templateEditId ? 'Edit Template' : 'New Email Template'}</SheetTitle></SheetHeader>
          <div className="space-y-3 py-4" data-keyboard-form>
            <div>
              <Label className="text-xs">Event *</Label>
              <Select value={templateForm.event} onValueChange={v => tuf('event', v as TemplateEvent)}>
                <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(TEMPLATE_EVENT_LABELS) as TemplateEvent[]).map(e => (
                    <SelectItem key={e} value={e}>{TEMPLATE_EVENT_LABELS[e]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Template Name *</Label><Input value={templateForm.name} onChange={e => tuf('name', e.target.value)} onKeyDown={onEnterNext} /></div>
            <div>
              <Label className="text-xs">Subject *</Label>
              <Input value={templateForm.subject} onChange={e => tuf('subject', e.target.value)} onKeyDown={onEnterNext} />
              <p className="text-[10px] text-muted-foreground mt-0.5">Use {'{{employeeName}}'}, {'{{companyName}}'}, {'{{date}}'}, etc.</p>
            </div>
            <div>
              <Label className="text-xs">Body (HTML) *</Label>
              <Textarea value={templateForm.bodyHtml} onChange={e => tuf('bodyHtml', e.target.value)} rows={12} />
              <p className="text-[10px] text-muted-foreground mt-0.5">HTML is supported. Use {'{{placeholders}}'} for dynamic values.</p>
              {detectedPlaceholders.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  <span className="text-[10px] text-muted-foreground">Detected:</span>
                  {detectedPlaceholders.map(p => (
                    <Badge key={p} variant="outline" className="text-[10px]">{p}</Badge>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={templateForm.isActive} onCheckedChange={v => tuf('isActive', v)} />
              <Label className="text-xs">Active</Label>
            </div>
          </div>
          <SheetFooter>
            <Button data-primary onClick={handleTemplateSave}>Save Template</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ═══ Activity Sheet ═══ */}
      <Sheet open={activitySheetOpen} onOpenChange={v => { if (!v) { setActivitySheetOpen(false); setActForm(BLANK_ACT); } }}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader><SheetTitle>Log Activity</SheetTitle></SheetHeader>
          <div className="space-y-3 py-4" data-keyboard-form>
            <div>
              <Label className="text-xs">Employee *</Label>
              <Select value={actForm.employeeId} onValueChange={v => {
                const emp = activeEmployees.find(e => e.id === v);
                auf('employeeId', v);
                auf('employeeCode', emp?.empCode || '');
                auf('employeeName', emp?.displayName || '');
              }}>
                <SelectTrigger className="text-xs"><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>{activeEmployees.map(e => <SelectItem key={e.id} value={e.id}>{e.empCode} — {e.displayName}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Date *</Label><SmartDateInput value={actForm.date} onChange={v => auf('date', v)} /></div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs">Productive hrs</Label>
                <Input type="number" step="0.5" min="0" value={actForm.productiveHours}
                  onChange={e => auf('productiveHours', parseFloat(e.target.value) || 0)} onKeyDown={onEnterNext} />
              </div>
              <div>
                <Label className="text-xs">Neutral hrs</Label>
                <Input type="number" step="0.5" min="0" value={actForm.neutralHours}
                  onChange={e => auf('neutralHours', parseFloat(e.target.value) || 0)} onKeyDown={onEnterNext} />
              </div>
              <div>
                <Label className="text-xs">Unproductive hrs</Label>
                <Input type="number" step="0.5" min="0" value={actForm.unproductiveHours}
                  onChange={e => auf('unproductiveHours', parseFloat(e.target.value) || 0)} onKeyDown={onEnterNext} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Total Tracked</Label>
                <Input value={`${actTotal}h`} readOnly className="bg-muted" />
              </div>
              <div>
                <Label className="text-xs">Productivity Score</Label>
                <Input value={`${actScore}%`} readOnly className="bg-muted" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Top Applications</Label>
              <Input value={actForm.topApps} onChange={e => auf('topApps', e.target.value)} onKeyDown={onEnterNext}
                placeholder="e.g. VS Code, Chrome, Slack, Zoom, Figma" />
              <p className="text-[10px] text-muted-foreground mt-0.5">Comma-separated, up to 5</p>
            </div>
            <div><Label className="text-xs">Notes</Label><Textarea value={actForm.notes} onChange={e => auf('notes', e.target.value)} rows={3} /></div>
            <div>
              <Label className="text-xs">Source</Label>
              <Select value={actForm.source} onValueChange={v => auf('source', v)}>
                <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual Entry</SelectItem>
                  <SelectItem value="agent_upload">Agent Upload</SelectItem>
                  <SelectItem value="import">CSV Import</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <SheetFooter>
            <Button data-primary onClick={handleActivitySave}>Save Activity Log</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default function AdminAndMonitoring() {
  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen bg-background flex flex-col">
        <ERPHeader breadcrumbs={[{ label: 'Operix Core', href: '/erp/dashboard' }, { label: 'Pay Hub' }, { label: 'Admin & Monitoring' }]} showDatePicker={false} showCompany={false} />
        <div className="flex-1 overflow-auto p-6">
          <AdminAndMonitoringPanel />
        </div>
      </div>
    </SidebarProvider>
  );
}
