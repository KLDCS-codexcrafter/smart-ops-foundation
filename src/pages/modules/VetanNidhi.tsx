import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, ArrowLeft, CheckCircle2, Landmark, Smartphone, Link2, IndianRupee } from 'lucide-react';

const FEATURES = [
  {
    icon: IndianRupee,
    title: 'Payroll Engine',
    desc: 'Full CTC-to-net computation — Basic, HRA, DA, Special Allowance, custom pay heads. LOP deduction, pro-rata for joiners and leavers, loan EMI auto-deduction, salary advance recovery. Same engine as PeoplePay inside Operix ERP.',
  },
  {
    icon: Landmark,
    title: 'Statutory Compliance',
    desc: 'PF ECR, ESI return, Professional Tax (state-wise slabs), TDS on salary — old and new regime, rebate 87A, surcharge, 4% cess. Form 24Q, Form 16 Part A & B, all auto-generated. Zero manual challan tracking.',
  },
  {
    icon: Users,
    title: 'HR Automation',
    desc: 'Biometric and app-based attendance, leave management (EL, CL, SL, ML, OD, CO, Comp-Off), appraisal cycles with KRA scoring, onboarding workflows, and HR MIS reports — all without touching payroll if not needed.',
  },
  {
    icon: Link2,
    title: 'Tally Integration',
    desc: 'Salary journal auto-pushed to Tally on payroll approval via the Bridge sync engine. Salary Payable, PF, ESI, PT, TDS — all booked automatically. Supports Tally Prime and Tally ERP 9. No manual voucher entry ever.',
  },
  {
    icon: Smartphone,
    title: 'Employee Self-Service',
    desc: 'Mobile-first portal — payslips, Form 16, leave balance, attendance summary, loan statements, IT declarations, and appraisal status. Leave applications with manager approval. No app install — works in any browser.',
  },
];

const COMPARE = [
  { feature: 'Core focus',              erp: 'Full ERP — payroll + HR + accounts',        standalone: 'Payroll + HR — your choice',          tally: 'Payroll + HR — Tally for accounts' },
  { feature: 'Payroll computation',     erp: 'Full engine — auto-runs on ERP data',       standalone: 'Full engine — CSV / manual import',    tally: 'Full engine — Tally master import' },
  { feature: 'Statutory compliance',    erp: 'PF · ESI · PT · TDS · Bonus · Gratuity',   standalone: 'PF · ESI · PT · TDS · Bonus · Gratuity', tally: 'PF · ESI · PT · TDS · Bonus · Gratuity' },
  { feature: 'PF ECR file',             erp: 'Auto-generated',                            standalone: 'Auto-generated',                       tally: 'Auto-generated' },
  { feature: 'Form 24Q',                erp: 'Full 24Q with TRACES challan linking',      standalone: 'Full 24Q (HR+Payroll tier+)',           tally: 'Full 24Q (HR+Payroll tier+)' },
  { feature: 'Form 16',                 erp: 'Part A + B — bulk generation',              standalone: 'Part A + B (Professional+)',            tally: 'Part A + B (Professional+)' },
  { feature: 'Accounting entries',      erp: 'Auto-posted to Operix FineCore GL',         standalone: 'Excel export only',                    tally: 'Auto-pushed to Tally via Bridge' },
  { feature: 'Attendance tracking',     erp: 'Full — manual, biometric, geo-fence, web',  standalone: 'HR Starter+',                          tally: 'HR Starter+' },
  { feature: 'Leave management',        erp: 'Full — EL, CL, SL, ML, PL, OD, CO',        standalone: 'HR Starter+',                          tally: 'HR Starter+' },
  { feature: 'Appraisal cycles',        erp: 'Full — KRA, 9-box, succession',             standalone: 'HR+Payroll tier+',                     tally: 'HR+Payroll tier+' },
  { feature: 'Onboarding workflow',     erp: 'Full 4-phase onboarding journey',           standalone: 'HR+Payroll tier+',                     tally: 'HR+Payroll tier+' },
  { feature: 'Loan & advance',          erp: 'Full — auto-deducted from payroll',         standalone: 'HR+Payroll tier+',                     tally: 'HR+Payroll tier+' },
  { feature: 'Contract worker payroll', erp: 'Full — CLRA compliance',                   standalone: 'Professional+',                        tally: 'Professional+' },
  { feature: 'F&F settlement',          erp: 'Full — gratuity, leave encash, TDS',        standalone: 'Professional+',                        tally: 'Professional+' },
  { feature: 'Biometric integration',   erp: 'Full — USB, LAN, cloud devices',            standalone: 'Professional+',                        tally: 'Professional+' },
  { feature: 'ESS portal',              erp: 'Full portal — payslips, leaves, appraisals', standalone: 'HR Starter+',                         tally: 'HR Starter+' },
  { feature: 'Multi-company',           erp: 'Yes — entity context switching',            standalone: 'HR+Payroll tier+ (up to 3)',            tally: 'HR+Payroll tier+ (up to 3)' },
  { feature: 'Tally sync',              erp: 'Not required — own GL',                     standalone: 'Professional+ (optional)',             tally: 'Full sync via Bridge' },
  { feature: 'Bureau / CA use',         erp: 'Not applicable',                            standalone: 'Enterprise tier',                     tally: 'Enterprise tier' },
  { feature: 'Requires Operix ERP?',    erp: 'Yes — full ERP subscription',              standalone: 'No — independent SaaS',                tally: 'No — Tally only' },
];

const SAAS_TIERS = [
  {
    name: 'HR Starter',
    price: '₹599 – ₹999 / month',
    employees: 'Up to 50 employees',
    color: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
    conditions: [
      'HR automation only — zero payroll computation',
      'For businesses whose payroll runs in Tally, Saral, or Excel',
      'Biometric / app-based attendance (manual + device import)',
      'Leave management — EL, CL, SL, ML, OD, CO with approval flow',
      'Employee master — profile, documents, org chart',
      'Employee Self-Service portal — attendance, leave, documents',
      'Basic HR MIS reports — headcount, attrition, leave summary',
      'No payroll · No statutory returns · No Form 16',
    ],
  },
  {
    name: 'Payroll Starter',
    price: '₹499 – ₹799 / month',
    employees: 'Up to 25 employees',
    color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    conditions: [
      'Payroll computation only — zero HR automation',
      'CTC breakdown, PF, ESI, PT, TDS — all statutory deductions',
      'PDF payslips + monthly payroll register (Excel)',
      'PF ECR file + ESI monthly return data export',
      'Form 16 Part B only',
      'Single company, single location',
      'Email support only',
      'No attendance · No leave · No ESS portal · No Tally sync',
    ],
  },
  {
    name: 'HR + Payroll',
    price: '₹2,499 – ₹3,999 / month',
    employees: 'Up to 100 employees',
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    conditions: [
      'Full payroll + full HR in one subscription',
      'Up to 3 companies with separate PF/ESIC codes',
      'Full Form 24Q (quarterly TDS return)',
      'Loan EMI auto-deduction + salary advance recovery',
      'Leave encashment + overtime + bonus payroll',
      'Appraisal cycles with KRA scoring',
      'Onboarding workflow (4-phase)',
      'ESS portal — payslips, leave, IT declaration, appraisal',
      'No Tally sync · No biometric device integration',
    ],
  },
  {
    name: 'Professional',
    price: '₹5,999 – ₹8,999 / month',
    employees: 'Up to 500 employees',
    color: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
    conditions: [
      'Everything in HR + Payroll',
      'Tally integration — salary journals auto-pushed via Bridge',
      'Biometric / attendance device integration (USB, LAN, cloud)',
      'Contract worker payroll (CLRA 1970 compliance)',
      'Full F&F settlement — gratuity, leave encash, TDS',
      'IT declaration + Form 12BB + Form 16 Part A & B',
      'API access for custom integrations',
      'White-label ESS portal (your logo, your domain)',
      'Priority support with 24-hour response SLA',
    ],
  },
  {
    name: 'Enterprise / Bureau',
    price: 'Custom pricing',
    employees: 'Unlimited employees · Unlimited companies',
    color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    conditions: [
      'Everything in Professional',
      'Multi-client dashboard — CA firms and payroll bureaus',
      'Bulk payroll processing across all clients in one run',
      'Custom pay head formulas and appraisal templates per client',
      'Webhooks on payroll approval, payslip generation, Form 16',
      'Full API with OAuth2 client credentials',
      'Dedicated onboarding + SLA-backed support',
      'Data residency options (region-locked storage)',
      'Audit trail export (PDF + JSON) for regulatory compliance',
    ],
  },
];

const STEPS = [
  {
    step: 1,
    title: 'Create Standalone Shell',
    desc: 'Set up /modules/vetan-nidhi route with its own layout — no ERP sidebar. Standalone header. The shell detects the subscribed tier (usePlan hook) and shows or hides payroll vs HR sections accordingly. An HR Starter subscriber sees only HR screens; a Payroll Starter sees only payroll.',
  },
  {
    step: 2,
    title: 'Employee & Attendance Import',
    desc: 'CSV importer for employee master. Map: Emp Code, Name, DOJ, Department, PAN, UAN, ESI IP, Basic, PF applicable, PT State. For HR module — biometric device sync via Bridge (same infrastructure as barcode scanner import). Device-agnostic: USB HID, ZKTeco LAN, ESSL cloud API.',
  },
  {
    step: 3,
    title: 'HR Module — Attendance · Leave · Appraisals',
    desc: 'Reuse AttendanceEntry, LeaveRequests, and PerformanceAndTalent panels from PeoplePay. Strip ERP sidebar — present as standalone HR dashboard. Gate appraisal cycles and onboarding behind HR+Payroll tier. HR Starter sees only attendance and leave.',
  },
  {
    step: 4,
    title: 'Payroll Run & Output',
    desc: 'Reuse PayrollProcessing and PayslipGeneration panels. Present as: Select Period → Preview → Approve → Download. Outputs: payslip PDFs (bulk zip), payroll register Excel, PF ECR, ESI return CSV, bank transfer advice. Gate Form 24Q behind HR+Payroll tier, Form 16 Part A behind Professional.',
  },
  {
    step: 5,
    title: 'Tally Bridge Integration',
    desc: 'On payroll approval, push salary journal to Tally via Bridge. Debit: Salary Payable, PF Employer, ESI Employer. Credit: Bank, PF Payable, ESI Payable, PT Payable, TDS Payable. Ledger names configurable per Tally company. Tally Prime and ERP 9 supported. Gated at Professional tier.',
  },
  {
    step: 6,
    title: 'SaaS Gate Layer',
    desc: 'usePlan() hook reads tier from Tower → Tenant config. Gate flags: hasHR, hasPayroll, employeeLimit, companyLimit, tallySync, biometricSync, apiAccess, essPortal, contractPayroll, fnfSettlement, appraisals. Show upgrade prompts at every tier boundary. HR Starter works fully offline — no payroll, no Tally needed.',
  },
];

export default function VetanNidhi() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto p-6 space-y-8">

        {/* Back nav */}
        <Button variant="ghost" size="sm" onClick={() => navigate('/modules')}>
          <ArrowLeft className="h-4 w-4 mr-1" />Back to Modules
        </Button>

        {/* Header */}
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0">
            <Users className="h-6 w-6 text-violet-600" />
          </div>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold">Vetan Nidhi</h1>
              <span className="text-xl text-muted-foreground font-normal">— वेतन निधि</span>
              <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">Phase 2</Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Complete HR and Payroll for India — take payroll only, HR only, or both. Standalone SaaS or integrated with Tally. No full ERP required.
            </p>
          </div>
        </div>

        {/* What it does */}
        <div className="rounded-lg border-2 border-dashed p-6">
          <h2 className="text-lg font-semibold mb-2">What Vetan Nidhi does</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Thousands of Indian SMEs manage payroll in Excel and HR in WhatsApp groups. Vetan Nidhi solves both in one product — and uniquely lets you take only what you need. A company already running payroll in Tally can subscribe to the HR Starter tier for attendance, leave, and ESS without touching payroll at all. A growing startup that only needs compliant payroll can take Payroll Starter without any HR automation. The HR + Payroll tier combines both — one subscription, one dashboard, one employee record. The Professional tier adds Tally journal sync, biometric devices, F&F settlement, and contract worker payroll. The Enterprise tier serves CAs and payroll bureaus managing hundreds of clients. Every tier runs on the same engine that powers PeoplePay inside Operix ERP.
          </p>
        </div>

        {/* Feature cards */}
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
          {FEATURES.map(f => (
            <Card key={f.title}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <f.icon className="h-5 w-5 text-violet-600" />{f.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Comparison table */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Three delivery modes — what's included in each</h2>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-48">Feature</TableHead>
                  <TableHead>Operix ERP (PeoplePay)</TableHead>
                  <TableHead>Vetan Nidhi Standalone</TableHead>
                  <TableHead>Vetan Nidhi + Tally</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {COMPARE.map(r => (
                  <TableRow key={r.feature}>
                    <TableCell className="font-medium text-sm">{r.feature}</TableCell>
                    <TableCell className="text-sm">{r.erp}</TableCell>
                    <TableCell className="text-sm">{r.standalone}</TableCell>
                    <TableCell className="text-sm">{r.tally}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* SaaS Tiers */}
        <div>
          <h2 className="text-lg font-semibold mb-1">SaaS Tiers</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Five tiers — two entry paths (HR Only or Payroll Only), a combined tier, a full-feature professional tier, and an enterprise bureau tier. Gated by: module access (HR vs Payroll), employee count, entity count, statutory outputs, integrations, appraisals, biometric devices, ESS depth, and audience type.
          </p>
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {SAAS_TIERS.map(tier => (
              <div key={tier.name} className="rounded-xl border bg-card/60 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <Badge className={tier.color}>{tier.name}</Badge>
                </div>
                <div>
                  <p className="text-base font-bold">{tier.price}</p>
                  <p className="text-xs text-muted-foreground">{tier.employees}</p>
                </div>
                <ul className="space-y-1.5">
                  {tier.conditions.map(c => (
                    <li key={c} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <CheckCircle2 className="h-3 w-3 text-green-500 mt-0.5 shrink-0" />
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Developer build guide */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Developer Build Guide</h2>
          <div className="space-y-3">
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
        </div>

        {/* Phase rationale */}
        <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30 p-4">
          <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-green-800 dark:text-green-300">Why Phase 2?</p>
            <p className="text-xs text-green-600 dark:text-green-400 mt-1">
              The full PeoplePay payroll engine inside Operix ERP — including loan EMI deduction,
              advance recovery, gratuity config, attendance paidStatus, master propagation,
              and entity-scoped payroll runs — must be production-stable first.
              Vetan Nidhi reuses this engine wholesale.
              Phase 1 (ERP PeoplePay) is complete and audited.
              Phase 2 (Vetan Nidhi standalone + Tally integration) begins after ERP stabilisation.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
