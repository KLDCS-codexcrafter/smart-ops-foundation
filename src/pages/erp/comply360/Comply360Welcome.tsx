/**
 * @file        src/pages/erp/comply360/Comply360Welcome.tsx
 * @purpose     Comply360 Home Dashboard · OOB-1 Health Score + OOB-5 Statutory Memory + Mega Search + Quick Actions + LIVE tiles
 * @sprint      Sprint 69 · T-Phase-5.A.1.1 · Block 3 · Q12 widgets
 * @decisions   D-S69-1 (100% native) · D-S69-3 (Health Score) · D-S69-4 (LIVE tile refresh · FK-CAP-7 preserved)
 * @iso         Usability · Maintainability
 */
import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, Receipt, Users, Building, Award, Leaf, Calendar, FileBarChart, Sparkles, Database, Compass, Flame, Wrench, TreePine, Recycle, Lock, ShieldAlert, BadgeCheck, HardHat, Briefcase, Copyright } from 'lucide-react';
import { loadObligations } from '@/lib/comply360-statutory-memory';
import { computeWeightedComplianceHealth, nextUpcoming } from '@/lib/comply360-health-score-engine';
import { buildCalendar } from '@/lib/comply360-calendar-engine';
import { listAvailableSnapshots } from '@/lib/comply360-time-machine-engine';
import { applyDemoSeed, isDemoSeeded, getDemoSeedStats } from '@/lib/comply360-demo-seed-engine';
import { HealthScoreWidget } from './widgets/HealthScoreWidget';
import { UpcomingFilingsWidget } from './widgets/UpcomingFilingsWidget';
import { QuickActionsWidget } from './widgets/QuickActionsWidget';
import { StatutoryMemoryWidget } from './widgets/StatutoryMemoryWidget';
import { MegaSearch } from './widgets/MegaSearch';
import type { Comply360Module } from './Comply360Sidebar.types';

interface Props {
  onNavigate: (m: Comply360Module) => void;
}

interface Tile {
  icon: typeof Shield;
  title: string;
  description: string;
  target: Comply360Module;
  live?: { pending: number; overdue: number };
}

export function Comply360Welcome({ onNavigate }: Props): JSX.Element {
  // DP-S78-7 · Sprint 78b · enriched obligation set: persisted statutory-memory + calendar engine seeds.
  const currentEntity = 'DEMO-CORP-01';
  const currentFY = '2025-26';
  const baseObligations = useMemo(() => loadObligations(), []);
  const calendarEvents = useMemo(() => buildCalendar(currentEntity, currentFY), [currentEntity, currentFY]);
  const obligations = useMemo(() => {
    const map = new Map<string, (typeof baseObligations)[number]>();
    for (const o of baseObligations) map.set(o.id, o);
    for (const e of calendarEvents) if (!map.has(e.id)) map.set(e.id, e);
    return Array.from(map.values());
  }, [baseObligations, calendarEvents]);
  // DP-S78-7 · Time-Machine snapshot summary count (passed to StatutoryMemoryWidget via existing filings prop).
  const timeMachineSnapshotCount = useMemo(
    () => listAvailableSnapshots(currentEntity, 'gstr-1').length,
    [currentEntity],
  );
  void timeMachineSnapshotCount;
  const health = useMemo(() => computeWeightedComplianceHealth(obligations), [obligations]);
  const upcoming = useMemo(() => nextUpcoming(obligations, 5), [obligations]);

  // D-S69-4 · 3 hardcoded tiles upgraded to LIVE values (FK-CAP-7 preserved: ROC stays static for FA tile parity)
  const moduleStats = useMemo(() => {
    const acc: Record<string, { pending: number; overdue: number }> = {};
    for (const o of obligations) {
      const s = acc[o.module] ?? { pending: 0, overdue: 0 };
      if (o.status === 'pending') s.pending += 1;
      if (o.status === 'overdue') s.overdue += 1;
      acc[o.module] = s;
    }
    return acc;
  }, [obligations]);

  const tiles: Tile[] = [
    { icon: Calendar,    title: 'Compliance Calendar',  description: '15 modules · due dates · filings tracker. Lands Sprint 78 (Q11).',    target: 'calendar' },
    // LIVE #1
    { icon: Receipt,     title: 'Tax & GST',            description: '27 modules · GSTR-1/3B/9 · TDS · TCS · E-invoice.',                   target: 'tax-gst',  live: moduleStats['tax-gst'] },
    // LIVE #2
    { icon: Users,       title: 'Payroll & HR',         description: '27 modules · EPF · ESI · PT · LWF · Form 16.',                        target: 'payroll',  live: moduleStats['payroll'] },
    { icon: Building,    title: 'ROC / Secretarial',    description: '14 modules · MGT-7 · AOC-4 · DIR-12. Phase 8 P2BB (Q29).',            target: 'roc' },
    // LIVE #3
    { icon: Award,       title: 'Licenses & Regulatory',description: '13 modules · factory · trade · drug · pollution.',                    target: 'licenses', live: moduleStats['licenses'] },
    { icon: Leaf,        title: 'ESG / Safety',         description: '12 modules · BRSR · CSR · safety audits. Sprint 79-80.',              target: 'esg' },
    { icon: FileBarChart,title: 'Reports & Analytics',  description: '12 modules · D.3 InsightX integration. Phase 8.',                     target: 'reports' },
    // 🆕 S95 · DP-S95-16A · Floor 5 Welcome tile navigation fix · 10 NEW tiles:
    { icon: Flame,       title: 'Fire Safety',               description: 'Q33 · NBC compliance · drills · extinguishers · NOC tracker.',  target: 'fire-safety' },
    { icon: Wrench,      title: 'Industrial Safety',         description: 'Q33 · Factories Act safety officer · accidents · audits.',       target: 'industrial-safety' },
    { icon: TreePine,    title: 'Environmental Compliance',  description: 'Q34 · CPCB consents · BRSR · emissions · EIA workflow.',         target: 'environmental' },
    { icon: Recycle,     title: 'Waste Management',          description: 'Q35 · 6 sub-regimes · Hazardous + Plastic + e-Waste + Solid.',   target: 'waste-management' },
    { icon: Lock,        title: 'DPDP Act 2023',             description: 'Q36 · Privacy Policy · Data Principal rights · 72hr Breach.',    target: 'dpdp' },
    { icon: ShieldAlert, title: 'Cyber Security (CERT-In)',  description: 'Q36 · 6hr incident reporting · Vulnerability · Access Control.', target: 'cyber-security' },
    { icon: BadgeCheck,  title: 'Quality & Standards',       description: 'Q37 · Schedule H · FSSAI · BIS · ISO 9001/14001/27001/45001.',   target: 'quality-standards' },
    { icon: HardHat,     title: 'Labour Tier-2',             description: 'Q37 · Bonus · Maternity · CLRA · Factories Form 21 · OSH.',      target: 'labour-tier2' },
    { icon: Briefcase,   title: 'MCA Tier-2 + PMLA',         description: 'Q38 · CSR-2 · Sec 135 · Sec 204 MR-3 · PMLA STR/CTR/FIU-IND.',   target: 'mca-tier2' },
    { icon: Copyright,   title: 'Legal Contracts + IPR',     description: 'Q38 · Vendor/NDA · TM/Patent · Tier-2 GST/IT/Exim extensions.',  target: 'legal-ipr' },
  ];

  // Sprint 88 · DP-S88 · demo seed + first-impression extension
  const [seedStats, setSeedStats] = useState(() => getDemoSeedStats());
  const seeded = isDemoSeeded();
  const handleApplySeed = (): void => {
    applyDemoSeed();
    setSeedStats(getDemoSeedStats());
  };

  return (
    <div className="min-h-screen p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-start gap-4">
        <div className="h-12 w-12 rounded-xl bg-success/10 flex items-center justify-center shrink-0">
          <Shield className="h-6 w-6 text-success" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Comply360 · India + Global Statutory Compliance</h1>
          <p className="text-sm text-muted-foreground mt-1">
            23 mega-menus · 305 modules per Bharat Comply 360 SSOT. Sprint 69 lights Home Dashboard, Health Score, Statutory Memory and Mega Search.
          </p>
        </div>
      </div>

      <MegaSearch filings={obligations} onOpen={onNavigate} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <HealthScoreWidget breakdown={health} />
        <QuickActionsWidget onOpen={onNavigate} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <UpcomingFilingsWidget filings={upcoming} onOpen={onNavigate} />
        <StatutoryMemoryWidget filings={obligations} />
      </div>

      {/* Sprint 88 · DP-S88 · What's new + tour + demo seed + quick stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4">
          <div className="flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-primary mt-0.5" />
            <div className="flex-1">
              <h2 className="font-semibold text-sm">What&apos;s new · Sprint 88 Polish Slot</h2>
              <ul className="text-xs text-muted-foreground mt-1 space-y-0.5 list-disc list-inside">
                <li>28 mega-menus · 12 First-Class Standalone Pages · cross-menu breadcrumb</li>
                <li>NBFC · SEBI LODR · RERA · FEMA Sector-Packs live (Floor 4)</li>
                <li>AI Control Center · CFO Pitch Deck PDF · ROI &amp; Tutor (OOB-2/3/9)</li>
              </ul>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-start gap-3">
            <Database className="h-5 w-5 text-success mt-0.5" />
            <div className="flex-1">
              <h2 className="font-semibold text-sm">Demo data seed</h2>
              <p className="text-xs text-muted-foreground mt-1">
                One-click idempotent seed across Floor 4 engines (NBFC loans · RERA projects · AI ROI sample).
              </p>
              <div className="mt-2 flex items-center gap-3 text-[11px] font-mono text-muted-foreground">
                <span>NBFC <span className="text-foreground">{seedStats.nbfcLoans}</span></span>
                <span>RERA <span className="text-foreground">{seedStats.reraProjects}</span></span>
                <span>ROI <span className="text-foreground">{seedStats.aiROIs}</span></span>
              </div>
              <Button size="sm" variant="outline" className="mt-3" onClick={handleApplySeed}>
                {seeded ? 'Demo seed applied' : 'Apply demo seed'}
              </Button>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <div className="flex items-start gap-3">
          <Compass className="h-5 w-5 text-primary mt-0.5" />
          <div className="flex-1">
            <h2 className="font-semibold text-sm">28 mega-menu tour</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Use the sidebar (or keyboard <span className="font-mono">c &lt;letter&gt;</span> shortcuts) to walk through Tax &amp; GST, TDS, ROC, Internal Audit, External Audit, Sector-Packs and AI Control Center.
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <h2 className="font-semibold text-sm mb-1">Sprint 69 scope (live)</h2>
        <p className="text-xs text-muted-foreground">
          Q1 Card scaffolding · Q2 23 mega-menu sidebar · Q12 Home Dashboard · OOB-1 Health Score · OOB-5 Statutory Memory · Mega Search · Quick Actions · FA tile refresh (Block 4).
        </p>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tiles.map((t) => {
          const Icon = t.icon;
          return (
            <Card
              key={t.title}
              className="p-5 cursor-pointer hover:border-primary transition-colors"
              onClick={() => onNavigate(t.target)}
            >
              <div className="flex items-start gap-3">
                <Icon className="h-5 w-5 text-success mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold text-sm">{t.title}</h3>
                    {t.live && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-success/10 text-success">LIVE</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{t.description}</p>
                  {t.live && (
                    <div className="flex items-center gap-3 mt-2 text-[11px] font-mono">
                      <span className="text-muted-foreground">
                        Pending <span className="text-foreground">{t.live.pending}</span>
                      </span>
                      <span className="text-muted-foreground">
                        Overdue <span className={t.live.overdue > 0 ? 'text-warning' : 'text-foreground'}>{t.live.overdue}</span>
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
