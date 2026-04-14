import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ShieldCheck, ArrowLeft, CheckCircle2, Users, CalendarDays, ClipboardList, BellRing } from 'lucide-react';

const FEATURES = [
  {
    icon: BellRing,
    title: 'Approval Inbox',
    desc: 'All pending approvals in one inbox — leave requests, expense claims, loan applications, salary advances, and regularisation requests. Approve or reject with one tap. Remarks optional. Push notification on every new request.',
  },
  {
    icon: Users,
    title: 'Team View',
    desc: 'See who is present, absent, on leave, or on OD today across your reportees. Headcount at a glance. Late arrivals flagged. Click any employee to see their full attendance or leave history for the month.',
  },
  {
    icon: CalendarDays,
    title: 'Leave Calendar',
    desc: 'Team leave calendar showing who is on leave on any given day. Helps managers approve or decline without creating coverage gaps. Holiday list overlaid. Forward planning view — 30, 60, 90 days.',
  },
  {
    icon: ClipboardList,
    title: 'Payroll Sign-off',
    desc: 'HR managers can review and approve the monthly payroll run from the phone. See total gross, total deductions, net pay, and employee-wise summary. One-tap approval with digital signature. Full detail available on desktop.',
  },
];

const COMPARE = [
  { feature: 'Leave approval',        web: 'Full leave module with delegation',     app: 'Inbox — approve, reject, remark' },
  { feature: 'Expense approval',      web: 'Full expense module with receipts',     app: 'Approve / reject with amount view' },
  { feature: 'Loan approval',         web: 'Full loan management screen',           app: 'Approve / reject disbursement' },
  { feature: 'Advance approval',      web: 'Full salary advance module',            app: 'Approve / reject request' },
  { feature: 'Regularisation',        web: 'Full attendance correction workflow',   app: 'Approve / reject with reason' },
  { feature: 'Team attendance today', web: 'Daily attendance grid — all employees', app: 'Reportees only — present/absent/leave' },
  { feature: 'Team leave calendar',   web: 'Full leave calendar with filters',      app: 'Reportees calendar — 90 day view' },
  { feature: 'Headcount view',        web: 'Full workforce analytics',              app: 'Today — present, absent, OD, WFH' },
  { feature: 'Payroll sign-off',       web: 'Full 8-step payroll wizard',           app: 'Review summary + one-tap approve' },
  { feature: 'Performance reviews',   web: 'Full appraisal module with KRA',        app: 'View submitted reviews (read-only)' },
  { feature: 'Push notifications',    web: 'Not applicable',                        app: 'Notify on every pending approval' },
  { feature: 'Role restriction',      web: 'Access control matrix in Admin',        app: 'Shows only what manager role permits' },
];

const SAAS_TIERS = [
  {
    name: 'Included',
    price: 'No extra charge',
    scope: 'Vetan Nidhi HR+Payroll tier · Operix ERP Professional+',
    color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    conditions: [
      'Included in Vetan Nidhi HR+Payroll, Professional, and Enterprise tiers',
      'Included in Operix ERP PeoplePay Professional and above',
      'Manager access auto-configured from Access Control role matrix',
      'Approval notifications included at no extra cost',
    ],
  },
  {
    name: 'Standalone Add-on',
    price: '₹149 – ₹199 / manager / month',
    scope: 'For Vetan Nidhi Starter or Payroll Starter subscribers',
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    conditions: [
      'Full approval inbox — leave, expense, loan, advance',
      'Team attendance and leave calendar',
      'Billed per active manager (role level: manager or above)',
      'Does not include payroll sign-off — HR+Payroll tier required',
    ],
  },
  {
    name: 'Enterprise White-Label',
    price: 'Custom pricing',
    scope: 'Enterprise / Bureau tier only',
    color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    conditions: [
      'Your company name and logo throughout the app',
      'Custom domain — managers access via yourcompany.sahayak.app/manage',
      'SSO integration (Google Workspace, Microsoft 365)',
      'Delegation rules — manager can reassign approvals from the app',
    ],
  },
];

const STEPS = [
  {
    step: 1,
    title: 'Manager Auth + Role Detection',
    desc: 'Same auth service as Employee App but with manager scope. On login, read the Access Control role for this employee (erp_access_roles). If roleLevel is manager, hr_manager, hr_admin, or superadmin — grant manager app access. Employee-level users see only the Employee App.',
  },
  {
    step: 2,
    title: 'Approval Inbox',
    desc: 'Aggregate all pending items for this manager: leave requests (approverId === managerId), expense claims, loan applications, advances, and regularisation requests. Real-time or polling (every 30 seconds). Badge count on tab. Approve/reject calls the same logic as the ERP desktop.',
  },
  {
    step: 3,
    title: 'Team View + Leave Calendar',
    desc: 'Filter erp_employees by reportingManagerId === currentManagerId. Join with erp_attendance_records for today. Show present/absent/leave chips per employee. Leave calendar reads erp_leave_requests filtered to team — render as month grid.',
  },
  {
    step: 4,
    title: 'Payroll Sign-off',
    desc: 'Show the latest payroll run summary if status === calculated and the manager is an HR Admin or above. Display totalEmployees, totalGross, totalNet. Call approveRun from usePayrollEngine on confirmation. Full detail remains on desktop.',
  },
  {
    step: 5,
    title: 'Push Notifications',
    desc: 'Web Push API (VAPID keys from server). Subscribe on manager login. Server triggers push on: new leave request submitted to this manager, new expense claim, payroll ready for approval. Notification payload: employee name, type, and deep link into the app.',
  },
];

export default function ManagerApp() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto p-6 space-y-8">
        <Button variant="ghost" size="sm" onClick={() => navigate('/operix-go')}>
          <ArrowLeft className="h-4 w-4 mr-1" />Back to Operix Go
        </Button>
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0">
            <ShieldCheck className="h-6 w-6 text-violet-600" />
          </div>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold">Sahayak — Manager</h1>
              <span className="text-lg text-muted-foreground font-normal">— सहायक प्रबंधक</span>
              <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">Phase 2</Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Mobile approvals and team view for managers — approve leave, expenses, and loans
              from anywhere. Real-time push notifications on every pending request.
            </p>
          </div>
        </div>
        <div className="rounded-lg border-2 border-dashed p-6">
          <h2 className="text-lg font-semibold mb-2">What Sahayak Manager does</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            A leave request submitted at 9 PM should not wait until morning because the manager
            was not at their desk. Sahayak Manager puts the entire approval workflow on the phone.
            Leave, expense claims, loan applications, salary advances, and attendance regularisation
            — all in one approval inbox with push notifications. See who on your team is present
            today, who is on leave next week, and sign off payroll without opening the full ERP.
            Access is automatically scoped to the manager's reportees based on the Access Control
            role matrix already configured in Operix Pay Hub.
          </p>
        </div>
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
          {FEATURES.map(f => (
            <Card key={f.title}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <f.icon className="h-5 w-5 text-violet-600" />{f.title}
                </CardTitle>
              </CardHeader>
              <CardContent><p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p></CardContent>
            </Card>
          ))}
        </div>
        <div>
          <h2 className="text-lg font-semibold mb-3">Web ERP vs Manager App</h2>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead className="w-48">Feature</TableHead>
                <TableHead>Web ERP (PeoplePay)</TableHead>
                <TableHead>Sahayak Manager App</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {COMPARE.map(r => (
                  <TableRow key={r.feature}>
                    <TableCell className="font-medium text-sm">{r.feature}</TableCell>
                    <TableCell className="text-sm">{r.web}</TableCell>
                    <TableCell className="text-sm">{r.app}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
        <div>
          <h2 className="text-lg font-semibold mb-1">Pricing</h2>
          <p className="text-sm text-muted-foreground mb-4">Included in higher tiers. Per-manager add-on for lower tiers.</p>
          <div className="grid sm:grid-cols-3 gap-4">
            {SAAS_TIERS.map(tier => (
              <div key={tier.name} className="rounded-xl border bg-card/60 p-5 space-y-3">
                <Badge className={tier.color}>{tier.name}</Badge>
                <div>
                  <p className="text-base font-bold">{tier.price}</p>
                  <p className="text-xs text-muted-foreground">{tier.scope}</p>
                </div>
                <ul className="space-y-1.5">
                  {tier.conditions.map(c => (
                    <li key={c} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <CheckCircle2 className="h-3 w-3 text-green-500 mt-0.5 shrink-0" />{c}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Developer Build Guide</h2>
          {STEPS.map(s => (
            <div key={s.step} className="flex gap-4 items-start">
              <div className="h-8 w-8 rounded-full bg-violet-500/10 flex items-center justify-center shrink-0 text-sm font-bold text-violet-600">{s.step}</div>
              <div>
                <p className="text-sm font-medium">{s.title}</p>
                <p className="text-xs text-muted-foreground">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30 p-4">
          <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-green-800 dark:text-green-300">Why Phase 2?</p>
            <p className="text-xs text-green-600 dark:text-green-400 mt-1">
              Leave approval, expense approval, access control role matrix, and the payroll
              sign-off step are all production-stable in Operix ERP PeoplePay. Sahayak Manager
              is a thin mobile wrapper around these existing workflows. Phase 2 begins after
              ERP stabilisation — the backend API endpoints (currently [JWT]-commented) must
              be wired to the real server before the mobile apps go live.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
