/**
 * IncomeTaxMaster.tsx — Read-only Income Tax Reference
 * FY 2024-25 (AY 2025-26) — Finance Act 2024
 * Maintained by 4DSmartOps. No CRUD.
 */
import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Shield } from 'lucide-react';
import {
  IT_SLABS_OLD_REGIME, IT_SLABS_NEW_REGIME, SURCHARGE_RATES,
  IT_CESS_RATE, STANDARD_DEDUCTION, REBATE_87A,
  DEDUCTION_LIMITS, GRATUITY_CONFIG, NPS_CONFIG,
  IT_EFFECTIVE_FY, IT_SOURCE,
} from '@/data/payroll-statutory-seed-data';

const fmt = (n: number) => n.toLocaleString('en-IN');

export function IncomeTaxMasterPanel() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-bold text-foreground">Income Tax Reference</h1>
          <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20 text-[10px]">
            Maintained by 4DSmartOps
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Tax slabs, deduction limits and payroll TDS reference — Section 192, Income Tax Act 1961
        </p>
        <p className="text-xs text-muted-foreground/70 mt-0.5">
          Last updated: Jul 2024 · {IT_SOURCE}
        </p>
      </div>

      {/* FY Banner */}
      <Card className="p-4 border-indigo-200 bg-indigo-50/50 dark:bg-indigo-950/20 dark:border-indigo-800">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-indigo-500" />
          <p className="text-sm font-semibold text-foreground">
            FY {IT_EFFECTIVE_FY} · New Tax Regime is default from this FY
          </p>
        </div>
      </Card>

      {/* Section 1 — Tax Regime Comparison */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-3">Tax Regime Comparison</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Old Regime */}
          <Card>
            <CardContent className="p-5">
              <h3 className="text-sm font-semibold mb-1">Old Regime</h3>
              <p className="text-xs text-muted-foreground mb-3">Standard Deduction: ₹{fmt(STANDARD_DEDUCTION.oldRegime)}</p>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Income Slab</TableHead>
                      <TableHead className="text-right">Rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {IT_SLABS_OLD_REGIME.map(s => (
                      <TableRow key={s.label}>
                        <TableCell className="text-sm">{s.label}</TableCell>
                        <TableCell className="text-right font-mono font-semibold">{s.ratePercent}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* New Regime */}
          <Card className="border-indigo-500/30">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-sm font-semibold">New Regime</h3>
                <Badge className="bg-indigo-500/10 text-indigo-600 border-indigo-500/20 text-[9px]">DEFAULT</Badge>
              </div>
              <p className="text-xs text-muted-foreground mb-3">Standard Deduction: ₹{fmt(STANDARD_DEDUCTION.newRegime)}</p>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Income Slab</TableHead>
                      <TableHead className="text-right">Rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {IT_SLABS_NEW_REGIME.map(s => (
                      <TableRow key={s.label}>
                        <TableCell className="text-sm">{s.label}</TableCell>
                        <TableCell className="text-right font-mono font-semibold">{s.ratePercent}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Section 2 — Surcharge */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-3">Surcharge Rates</h2>
        <div className="border rounded-lg overflow-hidden max-w-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Income Range</TableHead>
                <TableHead className="text-right">Surcharge %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {SURCHARGE_RATES.map(s => (
                <TableRow key={s.label}>
                  <TableCell className="text-sm">{s.label}</TableCell>
                  <TableCell className="text-right font-mono font-semibold">{s.ratePercent}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Section 3 — Cess */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-3">Health & Education Cess</h2>
        <Card className="p-4 max-w-lg">
          <p className="text-2xl font-bold font-mono text-foreground">{IT_CESS_RATE}%</p>
          <p className="text-xs text-muted-foreground mt-1">Applied on total tax + surcharge</p>
        </Card>
      </div>

      {/* Section 4 — Rebate 87A */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-3">Rebate u/s 87A</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-lg">
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Old Regime</p>
            <p className="text-sm mt-1">Income up to ₹{fmt(REBATE_87A.oldRegime.maxIncome)}</p>
            <p className="text-lg font-bold font-mono mt-1">₹{fmt(REBATE_87A.oldRegime.rebateAmount)}</p>
          </Card>
          <Card className="p-4 border-indigo-500/30">
            <p className="text-xs text-muted-foreground">New Regime</p>
            <p className="text-sm mt-1">Income up to ₹{fmt(REBATE_87A.newRegime.maxIncome)}</p>
            <p className="text-lg font-bold font-mono mt-1">₹{fmt(REBATE_87A.newRegime.rebateAmount)}</p>
          </Card>
        </div>
      </div>

      {/* Section 5 — Key Deduction Limits */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-3">Key Deduction Limits (for payroll IT calculation)</h2>
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Section</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Limit</TableHead>
                <TableHead>Regime Applicable</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-mono font-medium">80C</TableCell>
                <TableCell>Life insurance, PPF, ELSS, etc.</TableCell>
                <TableCell className="font-mono">₹{fmt(DEDUCTION_LIMITS.section80C)}</TableCell>
                <TableCell>Both regimes for existing investments</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-mono font-medium">80D</TableCell>
                <TableCell>Medical insurance premium</TableCell>
                <TableCell className="font-mono">₹{fmt(DEDUCTION_LIMITS.section80D.self)} (₹{fmt(DEDUCTION_LIMITS.section80D.seniorCitizen)} senior citizen)</TableCell>
                <TableCell>Old regime only</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-mono font-medium">80CCD(1B)</TableCell>
                <TableCell>NPS contribution</TableCell>
                <TableCell className="font-mono">₹{fmt(DEDUCTION_LIMITS.section80CCD1B)}</TableCell>
                <TableCell>Old regime only</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-mono font-medium">80CCD(2)</TableCell>
                <TableCell>Employer NPS contribution</TableCell>
                <TableCell className="font-mono">10% of basic</TableCell>
                <TableCell>Both regimes</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-mono font-medium">HRA</TableCell>
                <TableCell>House Rent Allowance</TableCell>
                <TableCell className="font-mono">Metro {DEDUCTION_LIMITS.hraMetroPercent}% / Non-metro {DEDUCTION_LIMITS.hraNonMetroPercent}%</TableCell>
                <TableCell>Old regime only</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Section 6 — Gratuity */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-3">Gratuity</h2>
        <Card className="p-4 max-w-xl">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Formula</span>
              <span className="font-mono">{GRATUITY_CONFIG.formula}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Max Exemption</span>
              <span className="font-mono font-semibold">₹{fmt(GRATUITY_CONFIG.maxExemption)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Minimum Service</span>
              <span className="font-mono">{GRATUITY_CONFIG.minimumServiceYears} years</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Section 7 — NPS */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-3">NPS (National Pension System)</h2>
        <Card className="p-4 max-w-xl">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Government Employer Contribution</span>
              <span className="font-mono font-semibold">{NPS_CONFIG.governmentEmployerPercent}%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Private Employer Max</span>
              <span className="font-mono font-semibold">{NPS_CONFIG.privateMaxPercent}%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Employee 80CCD(1B) Deduction</span>
              <span className="font-mono">₹{fmt(NPS_CONFIG.employeeMax80CCD1B)}</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default function IncomeTaxMaster() {
  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen bg-background">
        <ERPHeader
          breadcrumbs={[
            { label: 'Operix Core', href: '/erp/dashboard' },
            { label: 'FineCore', href: '/erp/accounting' },
            { label: 'Income Tax Reference' },
          ]}
          showDatePicker={false} showCompany={false}
        />
        <main className="p-6 space-y-6">
          <IncomeTaxMasterPanel />
        </main>
      </div>
    </SidebarProvider>
  );
}
