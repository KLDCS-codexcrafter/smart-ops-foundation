/**
 * @file        src/pages/erp/comply360/csr/CSRDashboardPage.tsx
 * @purpose     CSR Section 135 dashboard · Committee · CSR-1 agencies · CSR-2 spend · Schedule VII · 31st Standalone Page
 * @sprint      Sprint 103 · T-Phase-6.A.1.2 · Arc 1 UX surfacing · DP-PH6-6A (CSR rescoped SURFACE→BUILD)
 * @reads-from  comply360-csr-engine (FR-44 · USE-SITE READ · engine 0-DIFF)
 *              · CSRCommittee · ImplementingAgency · CSR1Filing · CSR2Filing
 *              · re-exported Schedule VII helpers (getCSRThematicAreas · checkSection135Applicability)
 * [JWT] Phase 8: GET /api/comply360/csr/* (engine wraps; surface unchanged)
 */
import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { HeartHandshake, Users2, Building2, Coins } from 'lucide-react';
import {
  listCSRCommittees,
  listImplementingAgencies,
  listCSR1Filings,
  listCSR2Filings,
  getCSRThematicAreas,
  checkSection135Applicability,
} from '@/lib/comply360-csr-engine';

const FY = '2025-26';

function inr(n: number): string { return '₹' + n.toLocaleString('en-IN'); }

export default function CSRDashboardPage(): JSX.Element {
  const [tab, setTab] = useState<'overview' | 'committee' | 'agencies' | 'filings'>('overview');

  const committees = useMemo(() => listCSRCommittees({ fy: FY }), []);
  const agencies = useMemo(() => listImplementingAgencies(), []);
  const csr1 = useMemo(() => listCSR1Filings({ fy: FY }), []);
  const csr2 = useMemo(() => listCSR2Filings({ fy: FY }), []);
  const themes = useMemo(() => getCSRThematicAreas(), []);

  // §135 applicability probe — modelled entity (per Companies Act 2013).
  const applicability = useMemo(
    () => checkSection135Applicability({
      networth_inr: 600_00_00_000,
      turnover_inr: 1100_00_00_000,
      net_profit_inr: 6_00_00_000,
    }),
    [],
  );

  const csr2Latest = csr2[csr2.length - 1];

  return (
    <div className="p-6 space-y-4">
      <header className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <HeartHandshake className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">CSR · Section 135</h1>
          <p className="text-sm text-muted-foreground">
            Standalone Page #31 · reads <span className="font-mono">comply360-csr-engine</span> · Committee · CSR-1 · CSR-2 · Schedule VII
          </p>
        </div>
        <Badge variant={applicability.is_applicable ? 'default' : 'secondary'}>
          {applicability.is_applicable ? '§135 Applicable' : '§135 Not Applicable'}
        </Badge>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">Committees · FY {FY}</div>
          <div className="text-2xl font-bold font-mono">{committees.length}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">Implementing Agencies</div>
          <div className="text-2xl font-bold font-mono">{agencies.length}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">CSR-1 Filings · FY {FY}</div>
          <div className="text-2xl font-bold font-mono">{csr1.length}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">CSR-2 Shortfall</div>
          <div className={`text-2xl font-bold font-mono ${csr2Latest && csr2Latest.shortfall_inr > 0 ? 'text-warning' : ''}`}>
            {csr2Latest ? inr(csr2Latest.shortfall_inr) : '—'}
          </div>
        </Card>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="committee">Committee</TabsTrigger>
          <TabsTrigger value="agencies">Agencies</TabsTrigger>
          <TabsTrigger value="filings">Filings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-3">
          <Card className="p-4">
            <h2 className="font-semibold text-sm flex items-center gap-2">
              <Coins className="h-4 w-4 text-primary" /> §135 applicability
            </h2>
            <ul className="text-xs text-muted-foreground mt-2 space-y-1 list-disc list-inside">
              {applicability.triggered_thresholds.length > 0
                ? applicability.triggered_thresholds.map((r) => <li key={r} className="font-mono">{r}</li>)
                : <li>Below all §135 thresholds for the modelled entity.</li>}
              {applicability.is_applicable && (
                <li>Required spend: 2% of average net profit (last 3 FY) per §135(5).</li>
              )}
            </ul>
          </Card>

          <Card className="p-4">
            <h2 className="font-semibold text-sm">Schedule VII thematic areas ({themes.length})</h2>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {themes.slice(0, 12).map((t) => (
                <Badge key={t.thematic_area} variant="outline" className="text-[10px] font-mono">{t.section_135_schedule_vii_ref} · {t.label}</Badge>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="committee">
          <Card className="p-4">
            {committees.length === 0 ? (
              <p className="text-xs text-muted-foreground flex items-center gap-2">
                <Users2 className="h-4 w-4" /> No CSR Committee recorded for FY {FY}. Section 135(1) mandates ≥3 directors.
              </p>
            ) : (
              <ul className="text-xs space-y-1">
                {committees.map((c) => (
                  <li key={c.id} className="border-b border-border py-1 flex items-center justify-between">
                    <span className="font-mono">FY {c.fy} · {c.director_ids.length} directors · chair {c.chairperson_director_id}</span>
                    <Badge variant="secondary">{c.formed_at.slice(0, 10)}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="agencies">
          <Card className="p-4">
            {agencies.length === 0 ? (
              <p className="text-xs text-muted-foreground flex items-center gap-2">
                <Building2 className="h-4 w-4" /> No CSR-1 registered implementing agencies yet.
              </p>
            ) : (
              <table className="w-full text-xs">
                <thead className="text-muted-foreground">
                  <tr><th className="text-left p-2">Agency</th><th className="text-left p-2">Type</th><th className="text-left p-2">CSR-1 No.</th><th className="text-left p-2">PAN</th></tr>
                </thead>
                <tbody>
                  {agencies.map((a) => (
                    <tr key={a.id} className="border-t border-border">
                      <td className="p-2">{a.agency_name}</td>
                      <td className="p-2">{a.agency_type}</td>
                      <td className="p-2 font-mono">{a.csr1_registration_no}</td>
                      <td className="p-2 font-mono">{a.pan}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="filings">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Card className="p-4">
              <h2 className="font-semibold text-sm">CSR-1 ({csr1.length})</h2>
              {csr1.length === 0 ? (
                <p className="text-xs text-muted-foreground mt-2">No CSR-1 filings for FY {FY}.</p>
              ) : (
                <ul className="text-xs mt-2 space-y-1">
                  {csr1.map((f) => (
                    <li key={f.id} className="flex justify-between border-b border-border py-1">
                      <span className="font-mono">{f.agency_id}</span>
                      <Badge variant={f.filing_status === 'filed' ? 'default' : 'secondary'}>{f.filing_status}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
            <Card className="p-4">
              <h2 className="font-semibold text-sm">CSR-2 ({csr2.length})</h2>
              {csr2.length === 0 ? (
                <p className="text-xs text-muted-foreground mt-2">No CSR-2 filings for FY {FY}.</p>
              ) : (
                <ul className="text-xs mt-2 space-y-1 font-mono">
                  {csr2.map((f) => (
                    <li key={f.id} className="border-b border-border py-1">
                      FY {f.fy} · required {inr(f.required_spend_inr)} · actual {inr(f.actual_spend_inr)} · shortfall {inr(f.shortfall_inr)}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
