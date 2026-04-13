/**
 * PayHubDashboard.tsx — Zone 0 Welcome Dashboard
 * Pre-built template — works on day 1 with graceful empty states.
 */
import { useMemo } from 'react';
import { format, addMonths, differenceInDays, startOfMonth, endOfMonth } from 'date-fns';
import {
  Users, IndianRupee, Clock, Briefcase, CheckCircle2, Circle,
  ArrowRight, Calendar, Cake, PartyPopper, UserPlus, Shield,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { cn } from '@/lib/utils';

// ── Safe data reads ─────────────────────────────────────────────────────

function safeReadCount(key: string): number {
  try {
    // [JWT] GET /api/pay-hub/dashboard/count/:key
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw).length;
  } catch { /* ignore */ }
  return 0;
}

function safeReadJson<T>(key: string, fallback: T): T {
  try {
    // [JWT] GET /api/pay-hub/dashboard/read/:key
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return fallback;
}

// ── Fallback holidays ───────────────────────────────────────────────────

const FALLBACK_HOLIDAYS = (() => {
  const y = new Date().getFullYear();
  return [
    { date: `${y}-01-26`, name: 'Republic Day', type: 'National' },
    { date: `${y}-03-14`, name: 'Holi', type: 'National' },
    { date: `${y}-08-15`, name: 'Independence Day', type: 'National' },
    { date: `${y}-10-02`, name: 'Gandhi Jayanti', type: 'National' },
    { date: `${y}-10-12`, name: 'Dussehra', type: 'National' },
    { date: `${y}-10-31`, name: 'Diwali', type: 'National' },
    { date: `${y}-11-01`, name: 'Diwali (Day 2)', type: 'National' },
    { date: `${y}-12-25`, name: 'Christmas', type: 'National' },
  ];
})();

// ── Statutory due dates ─────────────────────────────────────────────────

function getStatutoryDueDates() {
  const today = new Date();
  const nextMonth = addMonths(today, 1);
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();

  const epfDue = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 15);
  const esiDue = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 21);
  const ptDue = new Date(today.getFullYear(), today.getMonth(), 28);
  const tdsDue = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 7);

  // 24Q quarterly: May 31, Jul 31, Oct 31, Jan 31
  const quarterlyDates = [
    new Date(currentYear, 4, 31),  // May
    new Date(currentYear, 6, 31),  // Jul
    new Date(currentYear, 9, 31),  // Oct
    new Date(currentYear + 1, 0, 31), // Jan next year
  ];
  const q24Due = quarterlyDates.find(d => d >= today) ?? quarterlyDates[0];

  const items = [
    { label: 'EPF Challan', due: epfDue },
    { label: 'ESI Challan', due: esiDue },
    { label: 'PT Challan', due: ptDue },
    { label: 'TDS Challan', due: tdsDue },
    { label: '24Q Return', due: q24Due },
  ];

  return items.map(item => {
    const days = differenceInDays(item.due, today);
    let color = 'text-emerald-600 bg-emerald-500/10';
    if (days < 0) color = 'text-red-600 bg-red-500/10';
    else if (days <= 7) color = 'text-amber-600 bg-amber-500/10';
    return { ...item, days, color, dateStr: format(item.due, 'dd MMM yyyy') };
  });
}

// ── Panel export ────────────────────────────────────────────────────────

export function PayHubDashboardPanel() {
  const data = useMemo(() => {
    // [JWT] GET /api/pay-hub/dashboard/stats
    const payHeadCount = safeReadCount('erp_pay_heads');
    const ssCount = safeReadCount('erp_salary_structures');
    const gradeCount = safeReadCount('erp_pay_grades');
    const employeeCount = safeReadCount('erp_employees');
    const leaveCount = safeReadJson<{ status?: string }[]>('erp_leave_requests', [])
      .filter(r => r.status === 'pending').length;
    const deptCount = safeReadCount('erp_departments');
    const divCount = safeReadCount('erp_divisions');
    const jobReqCount = safeReadJson<{ status?: string }[]>('erp_job_requisitions', [])
      .filter(r => r.status === 'open').length;

    let companyName = 'Your Company';
    try {
      // [JWT] GET /api/pay-hub/dashboard/company
      const pc = localStorage.getItem('erp_parent_company');
      if (pc) {
        const parsed = JSON.parse(pc);
        if (parsed.name) companyName = parsed.name;
      }
    } catch { /* ignore */ }

    const holidays: { date: string; name: string; type: string }[] = (() => {
      try {
        // [JWT] GET /api/pay-hub/dashboard/holidays
        const raw = localStorage.getItem('erp_holiday_calendars');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            // HolidayCalendar[] format — flatten nested holidays arrays
            if (parsed[0] && Array.isArray(parsed[0].holidays)) {
              const flat = parsed.flatMap((cal: { holidays?: { date: string; name: string; type: string }[] }) =>
                (cal.holidays ?? []).map(h => ({ date: h.date, name: h.name, type: h.type }))
              );
              if (flat.length > 0) return flat;
            }
            // Legacy flat format fallback
            return parsed;
          }
        }
      } catch { /* ignore */ }
      return FALLBACK_HOLIDAYS;
    })();

    let lastPayrollStatus = 'Not Yet Started';
    try {
      // [JWT] GET /api/pay-hub/dashboard/payroll-status
      const runs = localStorage.getItem('erp_payroll_runs');
      if (runs) {
        const parsed = JSON.parse(runs);
        if (Array.isArray(parsed) && parsed.length > 0) {
          lastPayrollStatus = parsed[parsed.length - 1].status ?? 'Completed';
        }
      }
    } catch { /* ignore */ }

    // Setup progress
    const steps = [
      { label: 'Pay Heads configured', done: payHeadCount > 0, module: 'ph-pay-heads' as const },
      { label: 'Create first Salary Structure', done: ssCount > 0, module: 'ph-salary-structures' as const },
      { label: 'Set up Pay Grades', done: gradeCount > 0, module: 'ph-pay-grades' as const },
      { label: 'Add first Employee', done: employeeCount > 0, module: 'ph-employees' as const },
      { label: 'Run first Payroll', done: false, module: 'ph-payroll-processing' as const },
    ];
    const completedSteps = steps.filter(s => s.done).length;

    return {
      payHeadCount, ssCount, gradeCount, employeeCount, leaveCount,
      deptCount, divCount, jobReqCount, companyName, holidays,
      lastPayrollStatus, steps, completedSteps,
    };
  }, []);

  const statutory = useMemo(() => getStatutoryDueDates(), []);

  const today = new Date();
  const hour = today.getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

  // Filter upcoming holidays (next 30 days)
  const upcomingHolidays = useMemo(() => {
    const todayStr = format(today, 'yyyy-MM-dd');
    const thirtyDaysLater = format(addMonths(today, 1), 'yyyy-MM-dd');
    return data.holidays
      .filter(h => h.date >= todayStr && h.date <= thirtyDaysLater)
      .slice(0, 5);
  }, [data.holidays]);

  return (
    <div className="space-y-6">
      {/* ── Header strip ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {greeting}, {data.companyName}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Pay Hub · People & Payroll Operations · {format(today, 'dd MMM yyyy, EEEE')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled className="text-xs opacity-50">
            <UserPlus className="h-3.5 w-3.5 mr-1" />Add Employee
          </Button>
          <Button size="sm" disabled className="text-xs bg-violet-600 hover:bg-violet-700 text-white opacity-50">
            <IndianRupee className="h-3.5 w-3.5 mr-1" />Run Payroll
          </Button>
        </div>
      </div>

      {/* ── KPI strip ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Employees', value: data.employeeCount, icon: Users, color: 'text-violet-500 bg-violet-500/10' },
          { label: 'Monthly Payroll Cost', value: '₹0', icon: IndianRupee, color: 'text-amber-500 bg-amber-500/10' },
          { label: 'Pending Approvals', value: data.leaveCount, icon: Clock, color: 'text-blue-500 bg-blue-500/10' },
          { label: 'Open Positions', value: data.jobReqCount, icon: Briefcase, color: 'text-emerald-500 bg-emerald-500/10' },
        ].map((kpi) => (
          <Card key={kpi.label} className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center shrink-0', kpi.color)}>
                  <kpi.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
                  <p className="text-xs text-muted-foreground">{kpi.label}</p>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground/60 mt-2">
                Will update when data is added
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Main grid ────────────────────────────────────────────────── */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* COL-LEFT (span 2) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Setup Progress */}
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Pay Hub Setup Progress</CardTitle>
              <p className="text-xs text-muted-foreground">
                Complete these steps to get ready for payroll
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <Progress
                value={(data.completedSteps / data.steps.length) * 100}
                className="h-2 bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                {data.completedSteps} of {data.steps.length} steps complete
              </p>
              <div className="space-y-2">
                {data.steps.map((step) => (
                  <div key={step.label} className="flex items-center gap-3 text-sm">
                    {step.done ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                    )}
                    <span className={cn(
                      'flex-1',
                      step.done ? 'text-foreground' : 'text-muted-foreground',
                    )}>
                      {step.label}
                    </span>
                    <Button variant="ghost" size="sm" className="text-[10px] h-6 text-violet-500 hover:text-violet-600">
                      Go <ArrowRight className="h-3 w-3 ml-0.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { label: 'Pay Heads', count: data.payHeadCount, live: true },
                  { label: 'Salary Structure', count: data.ssCount, live: true },
                  { label: 'Pay Grades', count: data.gradeCount, live: true },
                  { label: 'Employee ↗', count: data.employeeCount, live: false },
                  { label: 'Run Payroll ↗', count: null, live: false },
                  { label: 'Reports ↗', count: null, live: false },
                ].map((action) => (
                  <div
                    key={action.label}
                    className={cn(
                      'rounded-lg border p-3 text-center transition-colors',
                      action.live
                        ? 'border-violet-500/20 hover:bg-violet-500/5 cursor-pointer'
                        : 'border-border/50 opacity-50 cursor-not-allowed',
                    )}
                  >
                    <p className="text-lg font-bold text-foreground">{action.count ?? '—'}</p>
                    <p className="text-xs text-muted-foreground">{action.label}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* COL-RIGHT (span 1) */}
        <div className="space-y-6">
          {/* People Highlights */}
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Today at a Glance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { icon: Cake, label: 'Birthdays Today', value: '—' },
                { icon: PartyPopper, label: 'Work Anniversaries', value: '—' },
                { icon: UserPlus, label: 'New Joiners This Month', value: '—' },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2 text-sm">
                  <item.icon className="h-4 w-4 text-muted-foreground/60 shrink-0" />
                  <span className="text-muted-foreground flex-1">{item.label}</span>
                  <span className="text-foreground font-medium">{item.value}</span>
                </div>
              ))}
              <p className="text-[10px] text-muted-foreground/50 pt-1">
                Add employees to see people highlights
              </p>
            </CardContent>
          </Card>

          {/* Upcoming Holidays */}
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4 text-violet-500" />
                Upcoming Holidays
              </CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingHolidays.length === 0 ? (
                <p className="text-xs text-muted-foreground">No holidays in the next 30 days</p>
              ) : (
                <div className="space-y-2">
                  {upcomingHolidays.map((h, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <div>
                        <p className="text-foreground text-xs font-medium">{h.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {format(new Date(h.date), 'dd MMM, EEEE')}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-[9px] h-5">
                        {h.type}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Statutory Due Dates ──────────────────────────────────────── */}
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4 text-violet-500" />
            Statutory Calendar — Next 30 Days
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {statutory.map((item) => (
              <div key={item.label} className="rounded-lg border border-border/50 p-3 text-center">
                <p className="text-xs font-semibold text-foreground">{item.label}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{item.dateStr}</p>
                <Badge className={cn('mt-2 text-[9px]', item.color)}>
                  {item.days < 0
                    ? `${Math.abs(item.days)}d overdue`
                    : item.days === 0
                      ? 'Due today'
                      : `${item.days}d remaining`}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function PayHubDashboard() {
  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen bg-background flex flex-col">
        <ERPHeader
          breadcrumbs={[
            { label: 'Operix Core', href: '/erp/dashboard' },
            { label: 'Pay Hub', href: '/erp/pay-hub' },
            { label: 'Dashboard' },
          ]}
          showDatePicker={false} showCompany={false}
        />
        <div className="flex-1 overflow-auto p-6">
          <PayHubDashboardPanel />
        </div>
      </div>
    </SidebarProvider>
  );
}
