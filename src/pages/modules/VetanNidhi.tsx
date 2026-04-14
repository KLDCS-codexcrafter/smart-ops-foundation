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
    desc: 'Full CTC-to-net computation for Indian payroll. Handles Basic, HRA, DA, Special Allowance, conveyance, and any custom pay heads. LOP deduction, pro-rata for joiners and leavers, loan EMI auto-deduction, salary advance recovery — all in one calculation run.',
  },
  {
    icon: Landmark,
    title: 'Statutory Compliance',
    desc: 'PF (12% employee, 3.67% EPF + 8.33% EPS + 0.5% EDLI employer), ESI (0.75% employee, 3.25% employer), Professional Tax (state-wise slabs), TDS on salary with old/new regime, rebate 87A, surcharge, and 4% health & education cess. PF ECR file, Form 24Q, Form 16 Part A & B — all generated automatically.',
  },
  {
    icon: Link2,
    title: 'Tally Integration',
    desc: 'On payroll approval, push the salary journal entry directly to Tally via the Bridge sync engine. Salary Payable, PF Payable, ESI Payable, PT Payable, TDS Payable — all booked in the correct Tally ledgers automatically. No manual voucher entry. Supports Tally Prime and Tally ERP 9.',
  },
  {
    icon: Smartphone,
    title: 'Employee Self-Service',
    desc: 'Employees access payslips, Form 16, leave balance, loan statements, and IT declarations from a mobile-first portal. No separate app to install — works in any browser. Leave applications with manager approval workflow included. Available on Growth tier and above.',
  },
];

const COMPARE = [
  { feature: 'Payroll computation',          erp: 'Full engine — auto-runs on ERP data',     standalone: 'Full engine — CSV / manual import', tally: 'Full engine — Tally item master import' },
  { feature: 'Statutory compliance',         erp: 'PF · ESI · PT · TDS · Bonus · Gratuity', standalone: 'PF · ESI · PT · TDS · Bonus · Gratuity', tally: 'PF · ESI · PT · TDS · Bonus · Gratuity' },
  { feature: 'PF ECR file',                  erp: 'Auto-generated from payroll run',          standalone: 'Auto-generated from payroll run',    tally: 'Auto-generated from payroll run' },
  { feature: 'Form 24Q (TDS return)',         erp: 'Full 24Q with TRACES challan linking',    standalone: 'Full 24Q (Growth tier+)',            tally: 'Full 24Q (Growth tier+)' },
  { feature: 'Form 16',                       erp: 'Part A + Part B — bulk generation',        standalone: 'Part A + B — bulk (Professional+)',  tally: 'Part A + B — bulk (Professional+)' },
  { feature: 'Accounting entries',            erp: 'Auto-posted to Operix FineCore GL',         standalone: 'Excel export only',                  tally: 'Auto-pushed to Tally via Bridge' },
  { feature: 'Tally sync',                    erp: 'Not required — own GL',                    standalone: 'Not included',                       tally: 'Full sync via Bridge engine' },
  { feature: 'Employee master source',        erp: 'Native — Operix employee records',          standalone: 'CSV import or manual entry',          tally: 'Tally employee master via Bridge' },
  { feature: 'Leave management',              erp: 'Full — EL, CL, SL, ML, PL, OD, CO',        standalone: 'Basic (Starter) / Full (Growth+)',    tally: 'Basic (Starter) / Full (Growth+)' },
  { feature: 'Loan & advance',                erp: 'Full — auto-deducted from payroll',         standalone: 'Growth tier+',                       tally: 'Growth tier+' },
  { feature: 'Contract worker payroll',       erp: 'Full — CLRA compliance built in',           standalone: 'Professional tier+',                 tally: 'Professional tier+' },
  { feature: 'F&F settlement',                erp: 'Full — gratuity, leave encash, TDS',        standalone: 'Professional tier+',                 tally: 'Professional tier+' },
  { feature: 'ESS portal',                    erp: 'Full portal with mobile app',               standalone: 'Growth tier+ (browser-based)',        tally: 'Growth tier+ (browser-based)' },
  { feature: 'Multi-company',                 erp: 'Yes — entity context switching',            standalone: 'Growth tier+ (up to 3)',              tally: 'Growth tier+ (up to 3)' },
  { feature: 'Bureau / CA use',               erp: 'Not applicable',                            standalone: 'Enterprise tier',                    tally: 'Enterprise tier' },
  { feature: 'Requires Operix ERP?',          erp: 'Yes — full ERP subscription',              standalone: 'No — independent SaaS',               tally: 'No — Tally only' },
];

const SAAS_TIERS = [
  {
    name: 'Starter',
    price: '₹499 – ₹999 / month',
    employees: 'Up to 25 employees',
    color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    conditions: [
      'Single company, single location',
      'Basic payroll — CTC breakdown, PF, ESI, PT, TDS',
      'PDF payslips + monthly payroll register (Excel)',
      'PF ECR file generation',
      'ESI monthly return data export',
      'Form 16 Part B only',
      'Email support',
      'No multi-entity · No Tally sync · No ESS portal',
    ],
  },
  {
    name: 'Growth',
    price: '₹1,999 – ₹2,999 / month',
    employees: 'Up to 100 employees',
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    conditions: [
      'Everything in Starter',
      'Up to 3 companies — branches with separate PF/ESIC codes',
      'Full Form 24Q (quarterly TDS return)',
      'Loan EMI auto-deduction + salary advance recovery',
      'Leave management (all types) + leave encashment',
      'Overtime computation + bonus payroll',
      'Employee Self-Service portal — payslips, leave, IT declaration',
      'No Tally sync · No API access',
    ],
  },
  {
    name: 'Professional',
    price: '₹4,999 – ₹7,999 / month',
    employees: 'Up to 500 employees',
    color: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
    conditions: [
      'Everything in Growth',
      'Tally integration — salary journals auto-pushed via Bridge',
      'API access for custom integrations',
      'Contract worker payroll (CLRA 1970 compliance)',
      'Full F&F settlement — gratuity, leave encash, TDS',
      'IT declaration + Form 12BB + Form 16 Part A & B',
      'Biometric / attendance device integration',
      'White-label ESS portal (your logo, your domain)',
      'Priority support',
    ],
  },
  {
    name: 'Enterprise / Bureau',
    price: 'Custom pricing',
    employees: 'Unlimited employees · Unlimited companies',
    color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    conditions: [
      'Everything in Professional',
      'Multi-client dashboard (CA / payroll bureau)',
      'Bulk payroll processing across all clients in one run',
      'Custom pay head formulas per client',
      'Webhooks — fire on payroll approval, payslip generation, Form 16',
      'Full API with OAuth2 client credentials',
      'Dedicated onboarding + SLA-backed support',
      'Data residency options (region-locked storage)',
      'Audit trail export (PDF + JSON)',
    ],
  },
];

const STEPS = [
  {
    step: 1,
    title: 'Create Standalone Shell',
    desc: 'Set up /modules/vetan-nidhi route with its own layout — no ERP sidebar. Standalone header with Vetan Nidhi branding. Reuse the Pay Hub engine (usePayrollEngine, computeEmployeePayslip) — it is already production-stable with all statutory computations.',
  },
  {
    step: 2,
    title: 'Employee Import Layer',
    desc: 'Build a CSV importer for employee master data. Map columns: Emp Code, Name, DOJ, Department, PAN, UAN, ESI IP, Basic, HRA, Other Allowances, PF applicable, ESI applicable, PT State. Validate PAN format, UAN (12 digits), and IFSC. For Tally mode — pull via Bridge sync profiles (same as barcode item import).',
  },
  {
    step: 3,
    title: 'Payroll Run & Output',
    desc: 'Reuse PayrollProcessing panel and PayslipGeneration panel from PeoplePay but strip the ERP sidebar. Present as a clean wizard: Select Period → Preview → Approve → Download. Outputs: payslip PDFs (bulk zip), payroll register Excel, PF ECR text file, ESI return CSV, bank transfer advice.',
  },
  {
    step: 4,
    title: 'Tally Bridge Integration',
    desc: 'On payroll approval, call the Bridge sync engine to create a Journal voucher in Tally. Debit: Salary Payable (gross), PF Employer, ESI Employer. Credit: Bank / Salary Payable, PF Payable, ESI Payable, PT Payable, TDS Payable. Ledger names configurable per Tally company. Supports both Tally Prime and Tally ERP 9 via the existing Bridge ODBC/TDL layer.',
  },
  {
    step: 5,
    title: 'SaaS Gate Layer',
    desc: 'Add a usePlan() hook that reads the subscription tier from the tenant config (Tower → Tenant record). Gate features: employeeLimit, companyLimit, tallySync, apiAccess, essPortal, contractPayroll, fnfSettlement. Show upgrade prompts at tier boundaries. The Starter tier should work fully offline with just localStorage — no Tally, no API needed.',
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
              Complete payroll for India — standalone SaaS or integrated with Tally ERP.
              No full ERP required.
            </p>
          </div>
        </div>

        {/* What it does */}
        <div className="rounded-lg border-2 border-dashed p-6">
          <h2 className="text-lg font-semibold mb-2">What Vetan Nidhi does</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Thousands of Indian SMEs run Tally for accounting but manage payroll in Excel — or pay
            a CA every month to run it. Vetan Nidhi is a focused payroll SaaS for these businesses.
            It handles the full Indian payroll cycle: CTC structuring, monthly computation, PF ECR,
            ESI return, PT deduction, TDS under both regimes, Form 24Q, and Form 16 — all in one
            compliant engine. It works entirely standalone (CSV import) or connects to Tally via the
            Bridge sync engine to auto-book salary journals without a single manual voucher. It is the
            same computation engine that powers PeoplePay inside Operix ERP, packaged as an affordable
            standalone product.
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
            Four tiers gated by employee count, entity count, statutory outputs, integrations,
            workflow features, ESS access, and audience type.
          </p>
          <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
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
