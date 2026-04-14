import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Smartphone, ArrowLeft, CheckCircle2, FileText, CalendarDays,
  Clock, IndianRupee, Users, BellRing, ClipboardList, Package, Layers,
} from 'lucide-react';

const EMPLOYEE_FEATURES = [
  { icon: IndianRupee, title: 'Payslip & Pay',    desc: 'View and download payslips for every month. CTC breakup, earnings, deductions, PF and TDS detail. Form 16 download on release. Loan EMI schedule and outstanding balance. Full salary history.' },
  { icon: CalendarDays, title: 'Leave',             desc: 'Apply for leave from the phone — type, dates, reason, submit. Real-time leave balance (EL, CL, SL, ML). Track status from submitted to approved. Cancel pending requests. Team leave calendar to avoid overlaps.' },
  { icon: Clock, title: 'Attendance',         desc: 'Monthly summary — present, absent, half-days, OT, late marks. Check-in and check-out timestamps. Apply for regularisation same day. Day-wise detail with shift and remark.' },
  { icon: FileText, title: 'Documents & IT',    desc: 'Download offer letter, appointment, revision, experience letter, Form 16. Submit IT declaration (80C, 80D, HRA, housing loan). Upload Form 12BB proofs. View projected TDS for the year.' },
];

const MANAGER_FEATURES = [
  { icon: BellRing, title: 'Approval Inbox',   desc: 'All pending approvals in one inbox — leave, expense, loan, advance, regularisation. Approve or reject with one tap. Push notification on every new request. Remarks optional.' },
  { icon: Users, title: 'Team View',        desc: 'See who is present, absent, on leave, or on OD today across all reportees. Late arrivals flagged. Click any employee for full attendance or leave history. Headcount at a glance.' },
  { icon: CalendarDays, title: 'Leave Calendar',  desc: 'Team leave calendar — who is on leave any given day. Helps approve without creating coverage gaps. Holiday list overlaid. 30, 60, 90-day forward view.' },
  { icon: ClipboardList, title: 'Payroll Sign-off', desc: 'HR managers review and approve monthly payroll from the phone. Total gross, deductions, net pay, employee-wise summary. One-tap approval. Full detail remains on desktop.' },
];

const COMPARE = [
  { feature: 'Primary user',         web: 'HR Admin / all roles',                  emp: 'Employee (own data only)',              mgr: 'Manager (team data only)' },
  { feature: 'Payslip access',        web: 'All employees — full detail',          emp: 'Own payslip — PDF view + download',     mgr: 'Team summary (not individual payslips)' },
  { feature: 'Leave apply',           web: 'Full leave module',                    emp: 'Apply, track, cancel from phone',       mgr: 'Not applicable' },
  { feature: 'Leave approve',         web: 'Full approval with delegation',        emp: 'Not applicable',                        mgr: 'Approve / reject — one tap' },
  { feature: 'Leave balance',         web: 'Full balance sheet with accrual',      emp: 'Current balance per type',              mgr: 'Team leave balance summary' },
  { feature: 'Attendance view',       web: 'All employees — full grid',            emp: 'Own monthly summary + day detail',      mgr: 'Team today — present / absent / leave' },
  { feature: 'Regularisation',        web: 'Full correction workflow',             emp: 'Apply from phone',                      mgr: 'Approve / reject' },
  { feature: 'Expense claim',         web: 'Full expense module',                  emp: 'Submit + upload receipt + track',       mgr: 'Approve / reject with amount view' },
  { feature: 'Loan / advance',        web: 'Full finance module',                  emp: 'View statement + outstanding',          mgr: 'Approve / reject disbursement' },
  { feature: 'IT declaration',        web: 'Full Form 12BB + file upload',         emp: 'Declare + upload proof',                mgr: 'Not applicable' },
  { feature: 'Form 16 download',      web: 'Part A + B full document',             emp: 'PDF download when published',           mgr: 'Not applicable' },
  { feature: 'Payroll sign-off',       web: 'Full 8-step wizard',                  emp: 'Not applicable',                        mgr: 'Review summary + one-tap approve' },
  { feature: 'Push notifications',    web: 'Not applicable',                       emp: 'Payslip published, leave approved',     mgr: 'New approval request received' },
  { feature: 'Login type',            web: 'Admin / HR session',                   emp: 'ESS login — empCode + password',        mgr: 'Manager login — same as ESS' },
];

const PWA_STEPS = [
  { step: 1, title: "Standalone Auth Shell",
    desc: "Separate /operix-go/login route with ESS scope JWT. Employee and manager logins are independent of the main ERP admin session. On login, detect role from erp_access_roles — employee role sees Employee App, manager role sees Manager App. Both share the same login page." },
  { step: 2, title: "ESS Feature Gate",
    desc: "Fetch ESSConfig for the tenant on login. Show or hide payslip, leave, attendance, IT declaration, expense, document tabs based on HR toggles. The same ESSConfig already built in AdminAndMonitoring drives the mobile app — no new config needed." },
  { step: 3, title: "Mobile-Responsive Screens",
    desc: "Reuse usePayrollEngine, useLeaveManagement, and attendance hooks from PeoplePay but render as mobile-first card layouts (not the desktop table grids). Payslip as a vertical card. Leave as type chips + calendar picker. Attendance as a monthly heatmap. All [JWT]-stubbed for now — wires to real API when backend is ready." },
  { step: 4, title: "PWA Manifest + Service Worker",
    desc: "Add public/manifest.json: name Sahayak, short_name Sahayak, theme_color violet, display standalone, icons at 192×192 and 512×512. Register service worker in index.html for offline payslip caching. On Android Chrome and iOS Safari 16.4+, browser shows Add to Home Screen prompt automatically." },
  { step: 5, title: "Push Notifications",
    desc: "Web Push API with VAPID keys (generated server-side). Subscribe on login. Server triggers push on: payslip published, leave approved/rejected, new approval request received. Notification deep-links into the relevant screen. Requires backend API — stubbed with [JWT] comment until then." },
];

const SAAS_TIERS = [
  {
    name: 'Included',
    price: 'No extra charge',
    scope: 'Vetan Nidhi HR+Payroll · Professional · Enterprise  |  Operix ERP Professional+',
    color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    conditions: [
      'Both Employee and Manager apps included',
      'HR controls feature access via ESS Config toggles in AdminAndMonitoring',
      'Manager access auto-scoped from Access Control role matrix',
      'White-label ESS portal on Vetan Nidhi Professional+',
      'No per-employee or per-manager licence fee at this tier',
    ],
  },
  {
    name: 'Add-on',
    price: 'Employee ₹49–99 / emp / month  ·  Manager ₹149–199 / mgr / month',
    scope: 'Vetan Nidhi Starter or Payroll Starter subscribers',
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    conditions: [
      'Add either app independently — Employee only or Manager only',
      'Employee: payslip, leave, attendance, IT declaration',
      'Manager: approval inbox, team view, leave calendar',
      'Payroll sign-off requires HR+Payroll tier',
      'Billed per active employee / active manager per month',
    ],
  },
  {
    name: 'Enterprise White-Label',
    price: 'Custom — contact sales',
    scope: 'Enterprise / Bureau tier only',
    color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    conditions: [
      'Your logo and brand throughout both apps',
      'Custom domain — yourcompany.sahayak.app',
      'SSO — Google Workspace, Microsoft 365',
      'Capacitor-wrapped APK for internal Play Store distribution',
      'Dedicated onboarding and support',
    ],
  },
];

const CAPACITOR_STEPS = [
  { step: 1, title: "Install Capacitor — zero code changes",
    desc: "Capacitor wraps the existing React PWA in a native shell. No changes to React code, no second codebase. Run: npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios. Then: npx cap init. The entire Sahayak PWA becomes the Capacitor web layer unchanged." },
  { step: 2, title: "Configure Native Platforms",
    desc: "npx cap add android — generates /android folder with a native Android project. npx cap add ios — generates /ios folder (requires macOS + Xcode). Add Capacitor plugins for enhanced native features: @capacitor/push-notifications (replaces Web Push), @capacitor/biometric-auth (fingerprint / Face ID), @capacitor/camera (expense receipt capture)." },
  { step: 3, title: "Build + Sign APK / IPA",
    desc: "npm run build — builds the React app. npx cap sync — copies web assets to native projects. Open Android Studio (Android) or Xcode (iOS), set app ID (com.4dsmartops.sahayak), sign with keystore / Apple certificate, build APK or IPA. Total developer time: 2–3 days for one platform." },
  { step: 4, title: "Distribute",
    desc: "Google Play Store: upload APK/AAB, fill Play Console listing, ₹2,500 one-time developer fee. Apple App Store: upload IPA via Xcode, ₹8,000/year Apple Developer Program. Internal distribution (enterprise): host APK on your own server, employees install directly. Capacitor apps update automatically when the web app updates — no re-submission needed for most updates." },
];

export default function VetanNidhiMobile() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto p-6 space-y-10">

        {/* Back nav */}
        <Button variant="ghost" size="sm" onClick={() => navigate('/operix-go')}>
          <ArrowLeft className="h-4 w-4 mr-1" />Back to Operix Go
        </Button>

        {/* Header */}
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Smartphone className="h-6 w-6 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold">Vetan Nidhi Mobile</h1>
              <span className="text-xl text-muted-foreground font-normal">— सहायक</span>
              <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">Phase 2</Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Two apps — one for employees, one for managers. PWA: no install required.
              Capacitor wrapper available for Play Store / App Store distribution.
            </p>
          </div>
        </div>

        {/* What it does */}
        <div className="rounded-lg border-2 border-dashed p-6">
          <h2 className="text-lg font-semibold mb-2">What Vetan Nidhi Mobile does</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            A leave request submitted at 9 PM should not wait until morning.
            A payslip published at 5 PM should reach every employee's phone by 5:01 PM.
            Vetan Nidhi Mobile delivers two focused apps built from the same engine.
            The Employee app (Sahayak Employee — सहायक कर्मचारी) gives every worker
            their payslips, leave balance, attendance, and IT declarations on their phone.
            The Manager app (Sahayak Manager — सहायक प्रबंधक) puts the entire approval
            workflow in one push-notification-driven inbox. Both are Progressive Web Apps —
            installed from a browser link, no Play Store required. When enterprise clients
            need app store distribution, the same code wraps into a native APK or IPA
            using Capacitor in under a week.
          </p>
        </div>

        {/* ══ EMPLOYEE APP ════════════════════════════════ */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Smartphone className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Sahayak Employee — सहायक कर्मचारी</h2>
              <p className="text-xs text-muted-foreground">ESS on every phone — payslips, leave, attendance, IT declaration</p>
            </div>
          </div>
          <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
            {EMPLOYEE_FEATURES.map(f => (
              <Card key={f.title}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <f.icon className="h-5 w-5 text-primary" />{f.title}
                  </CardTitle>
                </CardHeader>
                <CardContent><p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p></CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* ══ MANAGER APP ════════════════════════════════ */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
              <Users className="h-4 w-4 text-violet-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Sahayak Manager — सहायक प्रबंधक</h2>
              <p className="text-xs text-muted-foreground">Approval inbox + team view — leave, expenses, loans, payroll sign-off</p>
            </div>
          </div>
          <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
            {MANAGER_FEATURES.map(f => (
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
        </div>

        {/* Comparison table */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Three views of the same data</h2>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead className="w-40">Feature</TableHead>
                <TableHead>Web ERP</TableHead>
                <TableHead>Employee App</TableHead>
                <TableHead>Manager App</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {COMPARE.map(r => (
                  <TableRow key={r.feature}>
                    <TableCell className="font-medium text-sm">{r.feature}</TableCell>
                    <TableCell className="text-sm">{r.web}</TableCell>
                    <TableCell className="text-sm">{r.emp}</TableCell>
                    <TableCell className="text-sm">{r.mgr}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* SaaS Tiers */}
        <div>
          <h2 className="text-lg font-semibold mb-1">Pricing</h2>
          <p className="text-sm text-muted-foreground mb-4">Applies to both Employee and Manager apps together.</p>
          <div className="grid sm:grid-cols-3 gap-4">
            {SAAS_TIERS.map(tier => (
              <div key={tier.name} className="rounded-xl border bg-card/60 p-5 space-y-3">
                <Badge className={tier.color}>{tier.name}</Badge>
                <div>
                  <p className="text-sm font-bold leading-snug">{tier.price}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{tier.scope}</p>
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

        {/* ══ BUILD GUIDE — PHASE 1: PWA ══════════════════ */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 text-sm px-3 py-1">Phase 1</Badge>
            <h2 className="text-lg font-semibold">Build Guide — Progressive Web App</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Built by Lovable — same React codebase, no separate mobile developer.
            Runs in any phone browser. Installable on Android and iOS.
          </p>
          <div className="space-y-3">
            {PWA_STEPS.map(s => (
              <div key={s.step} className="flex gap-4 items-start">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-sm font-bold text-primary">{s.step}</div>
                <div>
                  <p className="text-sm font-medium">{s.title}</p>
                  <p className="text-xs text-muted-foreground">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ══ BUILD GUIDE — PHASE 2: CAPACITOR ═══════════ */}
        <div className="rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/20 p-6 space-y-4">
          <div className="flex items-center gap-3">
            <Badge className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 text-sm px-3 py-1">Phase 2</Badge>
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              <h2 className="text-lg font-semibold">App Store Distribution via Capacitor</h2>
            </div>
          </div>
          <div className="rounded-lg bg-indigo-100/60 dark:bg-indigo-900/20 p-4">
            <p className="text-sm font-medium text-indigo-800 dark:text-indigo-300 mb-1">What is Capacitor?</p>
            <p className="text-xs text-indigo-700 dark:text-indigo-400 leading-relaxed">
              Capacitor (by Ionic) wraps the existing React PWA in a thin native shell.
              Zero changes to the React code. The same Sahayak codebase that runs in the browser
              becomes a native Android APK or iOS IPA. Capacitor plugins replace Web APIs with
              native equivalents: push notifications become FCM / APNs, Web Push becomes native push,
              WebAuthn becomes biometric hardware APIs.
              When the web app updates, the Capacitor app updates automatically — no re-submission.
            </p>
          </div>
          <div className="space-y-3">
            {CAPACITOR_STEPS.map(s => (
              <div key={s.step} className="flex gap-4 items-start">
                <div className="h-8 w-8 rounded-full bg-indigo-500/10 flex items-center justify-center shrink-0 text-sm font-bold text-indigo-600 dark:text-indigo-400">{s.step}</div>
                <div>
                  <p className="text-sm font-medium text-foreground">{s.title}</p>
                  <p className="text-xs text-muted-foreground">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="grid sm:grid-cols-3 gap-3 pt-2">
            {[
              { label: "Developer time", value: "2–3 days per platform" },
              { label: "Android (Play Store)", value: "₹2,500 one-time fee" },
              { label: "iOS (App Store)", value: "₹8,000 / year" },
            ].map(s => (
              <div key={s.label} className="rounded-lg bg-indigo-100/60 dark:bg-indigo-900/20 p-3 text-center">
                <p className="text-xs text-indigo-600 dark:text-indigo-400">{s.label}</p>
                <p className="text-sm font-semibold text-foreground mt-0.5">{s.value}</p>
              </div>
            ))}
          </div>
          <div className="flex items-start gap-3 pt-1">
            <Layers className="h-4 w-4 text-indigo-500 mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">
              Capacitor is triggered only when enterprise clients require Play Store or App Store
              listing. The PWA covers 95%+ of use cases without any app store involvement.
            </p>
          </div>
        </div>

        {/* Phase rationale */}
        <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30 p-4">
          <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-green-800 dark:text-green-300">Why Phase 2?</p>
            <p className="text-xs text-green-600 dark:text-green-400 mt-1">
              The ESS Config, leave approval workflow, payslip generation, attendance module,
              and Access Control role matrix in PeoplePay are production-stable.
              The UI shell is built by Lovable now using [JWT] stubs — same pattern as the ERP.
              The app goes live to real employees once the backend API replaces localStorage.
              Phase 1 ERP is complete. Phase 2 PWA shell is built in this sprint.
              Phase 2 backend wiring happens when the API server is ready.
              Phase 2 Capacitor wrapping happens on first enterprise client request.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
