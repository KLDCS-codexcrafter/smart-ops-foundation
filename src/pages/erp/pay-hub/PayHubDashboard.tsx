/**
 * PayHubDashboard.tsx — Sprint 18 Dashboard Analytics Upgrade
 * Real data from all 50 modules. Pure CSS bars — no chart library.
 */
import { useMemo, useState } from 'react';
import { format, differenceInMonths, differenceInDays,
  parseISO, addMonths } from 'date-fns';
import {
  Users, IndianRupee, TrendingDown, Clock, Briefcase,
  UserPlus, UserMinus, Calendar, Shield, CheckCircle2, Circle,
  Cake, PartyPopper, Star,
  GraduationCap, Activity, Target, Award,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { cn } from '@/lib/utils';
import { toIndianFormat } from '@/lib/keyboard';
import type { Employee } from '@/types/employee';
import { EMPLOYEES_KEY } from '@/types/employee';
import type { PayrollRun } from '@/types/payroll-run';
import { payrollRunsKey } from '@/types/payroll-run';
import { useERPCompany } from '@/components/layout/ERPCompanySelector';
import type { ExitRequest } from '@/types/exit-management';
import { EXIT_REQUESTS_KEY } from '@/types/exit-management';
import type { PayGrade } from '@/types/pay-hub';
import { PAY_GRADES_KEY } from '@/types/pay-hub';
import type { PerformanceReview } from '@/types/performance';
import { PERF_REVIEWS_KEY } from '@/types/performance';
import type { OnboardingJourney } from '@/types/onboarding';
import { ONBOARDING_KEY } from '@/types/onboarding';
import { LEAVE_REQUESTS_KEY } from '@/types/leave-management';
import { JOB_REQUISITIONS_KEY, JOB_APPLICATIONS_KEY } from '@/types/recruitment';
import { CERTIFICATIONS_KEY } from '@/types/learning';
import { STATUTORY_CHALLANS_KEY } from '@/types/statutory-returns';
import { HOLIDAY_CALENDARS_KEY } from '@/types/payroll-masters';
import { DEFAULT_ENTITY_SHORTCODE } from '@/lib/default-entity';

// ── Safe data reads ─────────────────────────────────────────────────────

function safeReadJson<T>(key: string, fallback: T): T {
  try {
    // [JWT] GET /api/pay-hub/dashboard/read/:key
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T;
  } catch { /* ignore */ }
  return fallback;
}

function safeReadCount(key: string): number {
  // [JWT] GET /api/pay-hub/dashboard/count/:key
  return safeReadJson<unknown[]>(key, []).length;
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

  const epfDue = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 15);
  const esiDue = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 21);
  const ptDue = new Date(today.getFullYear(), today.getMonth(), 28);
  const tdsDue = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 7);

  const quarterlyDates = [
    new Date(currentYear, 4, 31),
    new Date(currentYear, 6, 31),
    new Date(currentYear, 9, 31),
    new Date(currentYear + 1, 0, 31),
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

interface PayHubDashboardPanelProps { selectedEntityId?: string; }

export function PayHubDashboardPanel({ selectedEntityId = 'parent-root' }: PayHubDashboardPanelProps) {
  const [navigateTo] = useState(() => (module: string) => {
    window.dispatchEvent(new CustomEvent('ph-navigate', { detail: module }));
  });
  const [selectedCompany] = useERPCompany();
  const entityCode = selectedCompany && selectedCompany !== 'all' ? selectedCompany : DEFAULT_ENTITY_SHORTCODE;

  // ── MASTER DATA READS ────────────────────────────────────────
  const employees = useMemo(() => {
    const all = safeReadJson<Employee[]>(EMPLOYEES_KEY, []);
    return all.filter(e =>
      (e.entityId ?? 'parent-root') === selectedEntityId
    );
  }, [selectedEntityId]);
  const payrollRuns = useMemo(() => {
    // [JWT] GET /api/pay-hub/payroll/runs?entityCode={entityCode}
    const all = safeReadJson<PayrollRun[]>(payrollRunsKey(entityCode), []);
    return all.filter(r =>
      ((r as any).entityId ?? 'parent-root') === selectedEntityId
    );
  }, [selectedEntityId, entityCode]);

  // ── 1. HEADCOUNT ANALYTICS ───────────────────────────────────
  const headcount = useMemo(() => {
    const active    = employees.filter(e => e.status === 'active');
    const onNotice  = employees.filter(e => e.status === 'on_notice');
    const total     = employees.length;

    const permanent   = active.filter(e => e.employmentType === 'permanent').length;
    const contract    = active.filter(e => e.employmentType === 'contract').length;

    const deptMap = new Map<string, number>();
    active.forEach(e => {
      const d = e.departmentName || 'Unassigned';
      deptMap.set(d, (deptMap.get(d) ?? 0) + 1);
    });
    const byDept = Array.from(deptMap.entries())
      .map(([dept, count]) => ({ dept, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    const male   = active.filter(e => e.gender === 'male').length;
    const female = active.filter(e => e.gender === 'female').length;

    const todayStr = new Date().toISOString().slice(0, 7);
    const newJoiners = active.filter(e => e.doj && e.doj.startsWith(todayStr));

    const confirmDue = active.filter(e => {
      if (!e.confirmationDate || e.employmentType !== 'probation') return false;
      const diff = differenceInDays(parseISO(e.confirmationDate), new Date());
      return diff >= 0 && diff <= 30;
    });

    const todayMMDD = format(new Date(), 'MM-dd');
    const birthdaysToday = active.filter(e =>
      e.dob && e.dob.slice(5) === todayMMDD
    );
    const anniversariesToday = active.filter(e =>
      e.doj && e.doj.slice(5) === todayMMDD
    );

    const tenures = active
      .filter(e => e.doj)
      .map(e => differenceInMonths(new Date(), parseISO(e.doj)));
    const avgTenure = tenures.length
      ? Math.round(tenures.reduce((s, t) => s + t, 0) / tenures.length)
      : 0;

    return {
      activeCount: active.length, onNotice: onNotice.length,
      total,
      permanent, contract,
      byDept, male, female,
      newJoiners: newJoiners.length, confirmDue: confirmDue.length,
      birthdaysToday: birthdaysToday.map(e => e.displayName),
      anniversariesToday: anniversariesToday.map(e => e.displayName),
      avgTenureMonths: avgTenure,
    };
  }, [employees]);

  // ── 2. PAYROLL COST ANALYTICS ────────────────────────────────
  const payrollCost = useMemo(() => {
    if (!payrollRuns.length) return null;

    const now = new Date();
    const fyYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    const fyStart = `${fyYear}-04`;

    const fyRuns = payrollRuns.filter(r => r.payPeriod >= fyStart);
    const sortedRuns = [...payrollRuns].sort((a, b) =>
      b.payPeriod.localeCompare(a.payPeriod));
    const latestRun = sortedRuns[0] ?? null;
    const prevRun   = sortedRuns[1] ?? null;

    const sumPayslips = (runs: PayrollRun[]) => {
      let gross = 0, net = 0, erCost = 0, tds = 0;
      runs.forEach(r => r.payslips.forEach(p => {
        gross  += p.grossEarnings;
        net    += p.netPay;
        erCost += p.totalEmployerCost;
        tds    += p.tds;
      }));
      return { gross, net, erCost, tds };
    };

    const latest = latestRun ? sumPayslips([latestRun]) : null;
    const prev   = prevRun   ? sumPayslips([prevRun])   : null;
    const ytd    = sumPayslips(fyRuns);

    const momChange = latest && prev && prev.gross > 0
      ? Math.round(((latest.gross - prev.gross) / prev.gross) * 1000) / 10
      : 0;

    const deptCost = new Map<string, number>();
    if (latestRun) {
      latestRun.payslips.forEach(p => {
        const emp = employees.find(e => e.id === p.employeeId);
        const dept = emp?.departmentName || 'Unassigned';
        deptCost.set(dept, (deptCost.get(dept) ?? 0) + p.totalEmployerCost);
      });
    }
    const byDept = Array.from(deptCost.entries())
      .map(([dept, cost]) => ({ dept, cost }))
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 5);

    return {
      latestGross:  latest?.gross  ?? 0,
      latestNet:    latest?.net    ?? 0,
      latestErCost: latest?.erCost ?? 0,
      ytdGross:     ytd.gross,
      ytdNet:       ytd.net,
      ytdTDS:       ytd.tds,
      momChange,
      lastPayPeriod: latestRun?.payPeriod ?? '',
      processedCount: latestRun?.payslips.length ?? 0,
      byDept,
      fyRunCount: fyRuns.length,
    };
  }, [payrollRuns, employees]);

  // ── 3. ATTRITION ────────────────────────────────────────────
  const attrition = useMemo(() => {
    const exits = safeReadJson<ExitRequest[]>(EXIT_REQUESTS_KEY, []);
    const now = new Date();
    const fyYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    const fyStart = `${fyYear}-04-01`;

    const fyExits = exits.filter(e =>
      e.status === 'completed' && e.lastWorkingDate >= fyStart
    );

    const voluntary   = fyExits.filter(e => e.exitType === 'resignation').length;
    const involuntary = fyExits.filter(e => e.exitType === 'termination' || e.exitType === 'absconding').length;
    const total       = fyExits.length;

    const avgHeadcount = employees.length || 1;
    const attritionRate = Math.round((total / avgHeadcount) * 1000) / 10;

    const onNotice = exits.filter(e =>
      e.status === 'notice_period' || e.status === 'clearance_pending'
    ).map(e => ({
      name: e.employeeName,
      lwd: e.lastWorkingDate,
      daysLeft: differenceInDays(parseISO(e.lastWorkingDate), now),
    })).sort((a, b) => a.daysLeft - b.daysLeft).slice(0, 5);

    return { total, voluntary, involuntary, attritionRate, onNotice };
  }, [employees]);

  // ── 4. LEAVE ANALYTICS ──────────────────────────────────────
  const leaveData = useMemo(() => {
    const leaves = safeReadJson<{status:string}[]>(
      LEAVE_REQUESTS_KEY, []);
    const pending   = leaves.filter(l => l.status === 'pending').length;
    const approved  = leaves.filter(l => l.status === 'approved').length;
    const total     = leaves.length;
    return { pending, approved, total };
  }, []);

  // ── 5. HIRING PIPELINE ───────────────────────────────────────
  const hiring = useMemo(() => {
    const reqs = safeReadJson<{status:string;openings?:number}[]>(JOB_REQUISITIONS_KEY, []);
    const apps = safeReadJson<{stage:string}[]>(JOB_APPLICATIONS_KEY, []);
    const openReqs     = reqs.filter(r => r.status === 'open').length;
    const totalOpenings = reqs.filter(r => r.status === 'open')
      .reduce((s, r) => s + (r.openings ?? 1), 0);
    const applied   = apps.filter(a => a.stage === 'applied').length;
    const screening = apps.filter(a => a.stage === 'screening').length;
    const interview = apps.filter(a => a.stage === 'interview').length;
    const offerSent = apps.filter(a => a.stage === 'offer_sent').length;
    const joined    = apps.filter(a => a.stage === 'joined').length;
    const pipeline  = apps.length;
    return { openReqs, totalOpenings, applied, screening, interview, offerSent, joined, pipeline };
  }, []);

  // ── 6. TALENT & LEARNING ─────────────────────────────────────
  const talent = useMemo(() => {
    const reviews  = safeReadJson<PerformanceReview[]>(PERF_REVIEWS_KEY, []);
    const grades   = safeReadJson<PayGrade[]>(PAY_GRADES_KEY, []);
    const certs    = safeReadJson<{expiryDate?:string;isExpired?:boolean;renewalReminderDays?:number}[]>(
      CERTIFICATIONS_KEY, []);
    const journeys = safeReadJson<OnboardingJourney[]>(ONBOARDING_KEY, []);

    const completedReviews = reviews.filter(r => r.status === 'completed');
    const avgPerfScore = completedReviews.length
      ? Math.round(completedReviews.reduce((s, r) => s + r.performanceScore, 0) / completedReviews.length * 10) / 10
      : 0;

    const promotionsDue = (() => {
      const result: { name: string; grade: string; yearsIn: number }[] = [];
      employees.filter(e => e.status === 'active' && e.doj && e.gradeId).forEach(emp => {
        const grade = grades.find(g => g.id === emp.gradeId);
        if (!grade || grade.promotionCriteriaYears <= 0) return;
        const yearsInRole = differenceInMonths(new Date(), parseISO(emp.doj)) / 12;
        if (yearsInRole < grade.promotionCriteriaYears) return;
        const empReviews = completedReviews
          .filter(r => r.employeeId === emp.id)
          .sort((a, b) => b.created_at.localeCompare(a.created_at));
        const lastRating = empReviews[0]?.hrRatingFinal ?? empReviews[0]?.managerRatingOverall ?? 0;
        if (lastRating >= grade.promotionCriteriaRating) {
          result.push({
            name: emp.displayName,
            grade: grade.name,
            yearsIn: Math.floor(yearsInRole),
          });
        }
      });
      return result.slice(0, 5);
    })();

    const expiringCerts = certs.filter(c => {
      if (!c.expiryDate || c.isExpired) return false;
      return differenceInDays(parseISO(c.expiryDate), new Date()) <= (c.renewalReminderDays ?? 30);
    }).length;

    const activeOnboarding = journeys.filter(j => j.status === 'active').length;

    return { completedReviews: completedReviews.length, avgPerfScore, promotionsDue, expiringCerts, activeOnboarding };
  }, [employees]);

  // ── 7. STATUTORY COMPLIANCE ───────────────────────────────────
  const statutory = useMemo(() => getStatutoryDueDates(), []);
  const challans = useMemo(() => {
    const all = safeReadJson<{status?:string}[]>(STATUTORY_CHALLANS_KEY, []);
    return {
      total: all.length,
      paid: all.filter(c => c.status === 'paid').length,
      pending: all.filter(c => c.status === 'generated' || c.status === 'draft').length,
    };
  }, []);

  // ── 8. COMPANY + SETUP ────────────────────────────────────────
  const setup = useMemo(() => {
    // [JWT] GET /api/foundation/entity/:id
    const companyName = (() => {
      if (selectedEntityId === 'parent-root') {
        const pc = safeReadJson<{name?:string;legalName?:string}>('erp_parent_company', {});
        return pc.legalName ?? pc.name ?? 'Your Company';
      }
      // [JWT] GET /api/foundation/companies
      const companies = safeReadJson<any[]>('erp_companies', []);
      const found = companies.find(c => c.id === selectedEntityId);
      if (found?.legalEntityName) return found.legalEntityName;
      // [JWT] GET /api/foundation/subsidiaries
      const subs = safeReadJson<any[]>('erp_subsidiaries', []);
      const sub = subs.find(s => s.id === selectedEntityId);
      if (sub?.legalEntityName) return sub.legalEntityName;
      // [JWT] GET /api/foundation/branch-offices
      const branches = safeReadJson<any[]>('erp_branch_offices', []);
      const branch = branches.find(b => b.id === selectedEntityId);
      if (branch?.name) return branch.name;
      return 'Your Company';
    })();

    const payHeadCount = safeReadCount('erp_pay_heads');
    const ssCount      = safeReadCount('erp_salary_structures');
    const gradeCount   = safeReadCount('erp_pay_grades');
    const hasPayroll   = safeReadCount(payrollRunsKey(entityCode)) > 0;

    const steps = [
      { label: 'Pay Heads configured',       done: payHeadCount > 0, module: 'ph-pay-heads' },
      { label: 'Salary Structure created',   done: ssCount > 0,      module: 'ph-salary-structures' },
      { label: 'Pay Grades defined',         done: gradeCount > 0,   module: 'ph-pay-grades' },
      { label: 'First employee added',       done: employees.length > 0, module: 'ph-employees' },
      { label: 'First payroll processed',    done: hasPayroll,       module: 'ph-payroll-processing' },
    ] as const;
    const completedSteps = steps.filter(s => s.done).length;

    return { companyName, steps, completedSteps };
  }, [employees, selectedEntityId, entityCode]);

  // ── 9. UPCOMING HOLIDAYS ──────────────────────────────────────
  const upcomingHolidays = useMemo(() => {
    const cals = safeReadJson<{holidays?:{date:string;name:string;type:string}[]}[]>(
      HOLIDAY_CALENDARS_KEY, []);
    const all = cals.flatMap(c => c.holidays ?? []);
    const src = all.length ? all : FALLBACK_HOLIDAYS;
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const cutoff   = format(addMonths(new Date(), 1), 'yyyy-MM-dd');
    return src.filter(h => h.date >= todayStr && h.date <= cutoff).slice(0, 5);
  }, []);

  const today   = new Date();
  const hour    = today.getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

  return (
    <div data-keyboard-form className="space-y-6">

      {/* ── HEADER ──────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{greeting}, {setup.companyName}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Pay Hub · {format(today, 'EEEE, dd MMMM yyyy')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="text-xs"
            onClick={() => navigateTo('ph-employees')}>
            <UserPlus className="h-3.5 w-3.5 mr-1" />Add Employee
          </Button>
          <Button size="sm" className="text-xs bg-violet-600 hover:bg-violet-700 text-white"
            onClick={() => navigateTo('ph-payroll-processing')}>
            <IndianRupee className="h-3.5 w-3.5 mr-1" />Run Payroll
          </Button>
        </div>
      </div>

      {/* ── SETUP PROGRESS (hide when all 5 done) ───────────── */}
      {setup.completedSteps < 5 && (
        <Card className="border-violet-500/20 bg-violet-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="h-4 w-4 text-violet-500" />
              Setup Progress — {setup.completedSteps}/5 steps complete
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Progress value={(setup.completedSteps / 5) * 100} className="h-1.5" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
              {setup.steps.map(step => (
                <button key={step.label}
                  onClick={() => navigateTo(step.module)}
                  className={cn('flex items-center gap-2 rounded-lg border p-2 text-left text-xs transition-colors',
                    step.done ? 'border-green-500/30 bg-green-500/5 text-green-700' : 'border-border hover:bg-muted/50'
                  )}>
                  {step.done
                    ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                    : <Circle className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />}
                  <span className="truncate">{step.label}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── KPI STRIP (8 cards) ──────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
        {[
          { label: 'Active Employees', value: headcount.activeCount,   icon: Users,        color: 'text-violet-500 bg-violet-500/10', module: 'ph-employees' },
          { label: 'This Month Gross', value: payrollCost ? `₹${toIndianFormat(payrollCost.latestGross)}` : '₹0', icon: IndianRupee, color: 'text-amber-500 bg-amber-500/10', module: 'ph-payroll-processing' },
          { label: 'New Joiners',      value: headcount.newJoiners,    icon: UserPlus,     color: 'text-emerald-500 bg-emerald-500/10', module: 'ph-onboarding' },
          { label: 'On Notice',        value: headcount.onNotice,      icon: UserMinus,    color: 'text-red-500 bg-red-500/10', module: 'ph-exit' },
          { label: 'Leave Pending',    value: leaveData.pending,       icon: Clock,        color: 'text-blue-500 bg-blue-500/10', module: 'ph-leave-requests' },
          { label: 'Open Positions',   value: hiring.openReqs,         icon: Briefcase,    color: 'text-cyan-500 bg-cyan-500/10', module: 'ph-recruitment' },
          { label: 'Avg Perf Score',   value: talent.avgPerfScore ? `${talent.avgPerfScore}/5` : '0/5', icon: Star,      color: 'text-yellow-500 bg-yellow-500/10', module: 'ph-performance' },
          { label: 'Attrition (FY)',   value: `${attrition.attritionRate}%`, icon: TrendingDown, color: 'text-slate-500 bg-slate-500/10', module: 'ph-exit' },
        ].map(kpi => (
          <button key={kpi.label} onClick={() => navigateTo(kpi.module)}
            className="text-left rounded-xl border border-border/50 p-3 hover:border-violet-500/30 hover:bg-violet-500/5 transition-colors">
            <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center mb-2', kpi.color)}>
              <kpi.icon className="h-4 w-4" />
            </div>
            <p className="text-lg font-bold">{kpi.value}</p>
            <p className="text-[10px] text-muted-foreground leading-tight">{kpi.label}</p>
          </button>
        ))}
      </div>

      {/* ── MAIN GRID: 3 columns ─────────────────────────────── */}
      <div className="grid lg:grid-cols-3 gap-6">

        {/* COL 1: Headcount by Department */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between">
              <span className="flex items-center gap-2"><Users className="h-4 w-4 text-violet-500" />Headcount by Department</span>
              <button onClick={() => navigateTo('ph-employees')} className="text-[10px] text-violet-500 hover:underline">View all</button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {headcount.byDept.length === 0 ? (
              <p className="text-xs text-muted-foreground">No employee data yet</p>
            ) : headcount.byDept.map(d => (
              <div key={d.dept} className="space-y-0.5">
                <div className="flex justify-between text-xs">
                  <span className="text-foreground truncate">{d.dept}</span>
                  <span className="text-muted-foreground shrink-0">{d.count}</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-violet-500 rounded-full" style={{ width: `${Math.round((d.count / headcount.activeCount) * 100)}%` }} />
                </div>
              </div>
            ))}
            {headcount.byDept.length > 0 && (
              <div className="pt-2 grid grid-cols-2 gap-2 text-[10px] text-muted-foreground border-t border-border/50 mt-2">
                <span>♂ Male: {headcount.male}</span>
                <span>♀ Female: {headcount.female}</span>
                <span>Permanent: {headcount.permanent}</span>
                <span>Contract: {headcount.contract}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* COL 2: Payroll Cost Trend */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between">
              <span className="flex items-center gap-2"><IndianRupee className="h-4 w-4 text-amber-500" />Payroll Cost</span>
              {payrollCost && (
                <Badge variant="outline" className={cn('text-[10px]', payrollCost.momChange >= 0 ? 'text-emerald-600' : 'text-red-600')}>
                  {payrollCost.momChange >= 0 ? '▲' : '▼'} {Math.abs(payrollCost.momChange)}% MoM
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!payrollCost ? (
              <p className="text-xs text-muted-foreground">No payroll runs yet</p>
            ) : (
              <div className="space-y-3">
                <div>
                  <p className="text-[10px] text-muted-foreground">This month gross ({payrollCost.lastPayPeriod})</p>
                  <p className="text-xl font-bold">₹{toIndianFormat(payrollCost.latestGross)}</p>
                  <p className="text-[10px] text-muted-foreground">{payrollCost.processedCount} employees · Employer cost ₹{toIndianFormat(payrollCost.latestErCost)}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg bg-muted/50 p-2">
                    <p className="text-[10px] text-muted-foreground">YTD Gross</p>
                    <p className="font-semibold">₹{toIndianFormat(payrollCost.ytdGross)}</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-2">
                    <p className="text-[10px] text-muted-foreground">YTD TDS</p>
                    <p className="font-semibold">₹{toIndianFormat(payrollCost.ytdTDS)}</p>
                  </div>
                </div>
                {payrollCost.byDept.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-semibold text-muted-foreground">DEPT-WISE COST</p>
                    {payrollCost.byDept.map(d => (
                      <div key={d.dept} className="flex items-center justify-between gap-2">
                        <span className="text-[10px] text-muted-foreground truncate flex-1">{d.dept}</span>
                        <div className="h-1 w-16 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-amber-500 rounded-full" style={{ width: `${Math.round((d.cost / (payrollCost.latestErCost || 1)) * 100)}%` }} />
                        </div>
                        <span className="text-[10px] text-foreground shrink-0">₹{toIndianFormat(d.cost)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* COL 3: Right panel — People highlights + Hiring */}
        <div className="space-y-4">
          {/* People Today */}
          <Card className="border-border/50">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Today at a Glance</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2 text-xs">
                <Cake className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
                <span className="text-muted-foreground flex-1">Birthdays</span>
                <span className="font-medium">
                  {headcount.birthdaysToday.length ? headcount.birthdaysToday.slice(0,2).join(', ') : '—'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <PartyPopper className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
                <span className="text-muted-foreground flex-1">Work Anniversaries</span>
                <span className="font-medium">
                  {headcount.anniversariesToday.length ? headcount.anniversariesToday.slice(0,2).join(', ') : '—'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <UserPlus className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
                <span className="text-muted-foreground flex-1">Joiners This Month</span>
                <span className="font-medium">{headcount.newJoiners || '—'}</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Award className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
                <span className="text-muted-foreground flex-1">Confirmations Due</span>
                <span className={cn('font-medium', headcount.confirmDue > 0 ? 'text-amber-600' : '')}>
                  {headcount.confirmDue || '—'}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Hiring Funnel */}
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center justify-between">
                <span>Hiring Funnel</span>
                <button onClick={() => navigateTo('ph-recruitment')} className="text-[10px] text-violet-500 hover:underline">Manage</button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {hiring.pipeline === 0 ? (
                <p className="text-xs text-muted-foreground">{hiring.openReqs} open positions — no applications yet</p>
              ) : (
                <div className="space-y-1.5">
                  {[
                    { label: 'Applied',    count: hiring.applied,   color: 'bg-slate-400' },
                    { label: 'Screening',  count: hiring.screening, color: 'bg-amber-500' },
                    { label: 'Interview',  count: hiring.interview, color: 'bg-blue-500' },
                    { label: 'Offer Sent', count: hiring.offerSent, color: 'bg-violet-500' },
                    { label: 'Joined',     count: hiring.joined,    color: 'bg-green-500' },
                  ].map(s => (
                    <div key={s.label} className="flex items-center gap-2">
                      <span className="w-16 text-[10px] text-muted-foreground shrink-0">{s.label}</span>
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className={cn('h-full rounded-full', s.color)} style={{ width: hiring.pipeline > 0 ? `${Math.round((s.count/hiring.pipeline)*100)}%` : '0%' }} />
                      </div>
                      <span className="text-[10px] font-medium w-4 text-right">{s.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── SECOND ROW: Attrition + Talent + Compliance ──────── */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">

        {/* Attrition */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="h-4 w-4 text-red-500" />Attrition (FY {new Date().getMonth()>=3?new Date().getFullYear():new Date().getFullYear()-1}–{String(new Date().getMonth()>=3?new Date().getFullYear()+1:new Date().getFullYear()).slice(2)})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {attrition.total === 0 ? (
              <p className="text-xs text-muted-foreground">No exits this financial year</p>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div><p className="text-lg font-bold text-foreground">{attrition.total}</p><p className="text-[10px] text-muted-foreground">Total Exits</p></div>
                  <div><p className="text-lg font-bold text-amber-600">{attrition.voluntary}</p><p className="text-[10px] text-muted-foreground">Voluntary</p></div>
                  <div><p className="text-lg font-bold text-red-600">{attrition.attritionRate}%</p><p className="text-[10px] text-muted-foreground">Rate</p></div>
                </div>
                {attrition.onNotice.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-[10px] font-semibold text-muted-foreground">ON NOTICE</p>
                    {attrition.onNotice.map(e => (
                      <div key={e.name} className="flex justify-between text-xs">
                        <span className="text-foreground truncate">{e.name}</span>
                        <span className={cn('text-muted-foreground shrink-0', e.daysLeft <= 7 ? 'text-red-500' : '')}>{e.daysLeft}d left</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Talent & Learning */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-blue-500" />Talent & Learning
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg bg-muted/50 p-2">
                <p className="text-[10px] text-muted-foreground">Reviews Completed</p>
                <p className="font-bold">{talent.completedReviews}</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-2">
                <p className="text-[10px] text-muted-foreground">Avg Perf Score</p>
                <p className="font-bold">{talent.avgPerfScore || '—'}/5</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-2">
                <p className="text-[10px] text-muted-foreground">Active Onboarding</p>
                <p className="font-bold">{talent.activeOnboarding}</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-2">
                <p className={cn('text-[10px]', talent.expiringCerts > 0 ? 'text-amber-600' : 'text-muted-foreground')}>Certs Expiring</p>
                <p className={cn('font-bold', talent.expiringCerts > 0 ? 'text-amber-600' : '')}>{talent.expiringCerts}</p>
              </div>
            </div>
            {talent.promotionsDue.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-violet-600 mb-1">⬆ PROMOTIONS DUE</p>
                {talent.promotionsDue.map(p => (
                  <div key={p.name} className="flex justify-between text-[10px] py-0.5">
                    <span className="text-foreground truncate">{p.name}</span>
                    <span className="text-muted-foreground shrink-0">{p.grade} · {p.yearsIn}yr</span>
                  </div>
                ))}
                <button onClick={() => navigateTo('ph-compensation')} className="text-[10px] text-violet-500 hover:underline mt-1">
                  Create compensation action →
                </button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right: Holidays + Compliance */}
        <div className="space-y-4">
          <Card className="border-border/50">
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Calendar className="h-4 w-4 text-violet-500" />Upcoming Holidays</CardTitle></CardHeader>
            <CardContent>
              {upcomingHolidays.length === 0 ? (
                <p className="text-xs text-muted-foreground">No holidays in next 30 days</p>
              ) : (
                <div className="space-y-2">
                  {upcomingHolidays.map(h => (
                    <div key={h.date} className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium">{h.name}</p>
                        <p className="text-[10px] text-muted-foreground">{format(parseISO(h.date), 'dd MMM, EEE')}</p>
                      </div>
                      <Badge variant="outline" className="text-[9px] h-5">{h.type}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── STATUTORY CALENDAR ───────────────────────────────── */}
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center justify-between">
            <span className="flex items-center gap-2"><Shield className="h-4 w-4 text-violet-500" />Statutory Calendar — Next 30 Days</span>
            {challans.pending > 0 && (
              <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-500/30">{challans.pending} challans pending</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {statutory.map(item => (
              <div key={item.label} className="rounded-lg border border-border/50 p-3 text-center cursor-pointer hover:border-violet-500/30" onClick={() => navigateTo('ph-statutory-calendar')}>
                <p className="text-xs font-semibold">{item.label}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{item.dateStr}</p>
                <Badge className={cn('mt-1.5 text-[9px]', item.color)}>
                  {item.days < 0 ? `${Math.abs(item.days)}d overdue` : item.days === 0 ? 'Due today' : `${item.days}d left`}
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
          breadcrumbs={[{label:'Operix Core',href:'/erp/dashboard'},{label:'Pay Hub'},{label:'Dashboard'}]}
          showDatePicker={false} showCompany={false}
        />
        <div className="flex-1 overflow-auto p-6"><PayHubDashboardPanel /></div>
      </div>
    </SidebarProvider>
  );
}
