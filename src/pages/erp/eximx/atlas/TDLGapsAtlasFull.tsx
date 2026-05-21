/**
 * @file        src/pages/erp/eximx/atlas/TDLGapsAtlasFull.tsx
 * @purpose     Moat #13 TDL Gaps Atlas FULL PRIMARY · Phase 1 EximX institutional capstone
 * @sprint      T-Phase-1.EX-11-Atlas-FULL-BCD-FXWhatIf-BoardPack
 * @decisions   EX-11-Q1=a · 11-sprint walk + 21 Moat grid + 11 D-NEW matrix + v7 12 Gap timeline + 4DSmartOps cross-ref
 * @disciplines FR-30 · FR-50 · FR-58
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Award, CheckCircle2, AlertTriangle, ArrowRight, Layers, Target, BookOpen } from 'lucide-react';

type SprintRow = { id: string; name: string; head: string; loc: number; grade: string; key_anchors: string };
type MoatRow = { num: number; name: string; status: 'LIVE' | 'FULL' | 'PRIMARY' | 'FOUNDATION'; sprint: string };
type GapRow = { num: number; name: string; closed_in: string; status: 'closed' | 'pending' };
type DNewRow = { code: string; theme: string; disposition: 'RESOLVED' | 'CLOSED' | 'CLOSE_EX11' | 'CARRY_PHASE2'; sprint: string; rationale: string };

const SPRINTS: SprintRow[] = [
  { id: 'EX-1', name: 'EximX Foundation', head: 'a0c7a3c1', loc: 1572, grade: 'A POST-T1 (24th)', key_anchors: '#13 Preview · #19 seed' },
  { id: 'EX-2', name: 'CTH × Country × Date Master', head: '0cd17a9e', loc: 854, grade: 'A (25th)', key_anchors: '#8 PRIMARY · #11 · #14 · #15 foundation' },
  { id: 'EX-3', name: 'Import PO + Dual Rate', head: '0acdb123', loc: 1011, grade: 'A (26th)', key_anchors: '#9 LIVE · #16 PRIMARY' },
  { id: 'EX-4', name: 'Multi-Leg GIT', head: '884ba51f', loc: 1500, grade: 'A (27th)', key_anchors: '#1 FOUNDATION · #3 · #5 · #12' },
  { id: 'EX-5', name: 'CI + CIF Waterfall', head: 'c2800872', loc: 1650, grade: 'A (28th)', key_anchors: '#15 FULL · #1 FULL CONSUMER · #9 ANCHORED' },
  { id: 'EX-6', name: 'BoE + Customs + Auto-Posted Vouchers', head: 'c996c323', loc: 1100, grade: 'A (29th)', key_anchors: '#2 RMS FULL · #4 AEO ANCHORED · D-NEW-FG registered' },
  { id: 'EX-7a', name: 'Export PO + Doc Pack', head: '903ea621', loc: 1100, grade: 'A (30th)', key_anchors: '#18 Buyer Reliability · #17 Module-Switcher · #10 CoO seed' },
  { id: 'EX-7b', name: 'Shipping Bill + EGM + LEO', head: 'cb31dc79', loc: 1200, grade: 'A (31st)', key_anchors: '#10 CoO ADVANCED · v7 Gap #10' },
  { id: 'EX-7c', name: 'Export Realisation + Forex Triangulation', head: '4386740d', loc: 1100, grade: 'A (32nd)', key_anchors: '#19 FEMA PRIMARY · #18 FULL · #6 ECGC · v7 Gap #2 + #11' },
  { id: 'EX-8', name: 'TT + Hedge + Reval', head: '90114739', loc: 1100, grade: 'A (33rd)', key_anchors: 'D-NEW-FG RESOLVED · Forex FULL ENGINE · Superpowers 95%' },
  { id: 'EX-9', name: 'Compliance Suite (10 modules)', head: '4df6de5f', loc: 1181, grade: 'A (34th)', key_anchors: '#4 AEO FULL · #11 CAROTAR FULL · #10 CoO Embassy FULL · v7 Gaps 100% · Superpowers 100%' },
  { id: 'EX-10', name: 'DGFT + Scrip + Vendor + HSN + D-NEW-FF', head: 'a4ff7465', loc: 994, grade: 'A (35th)', key_anchors: '#20 DGFT PRIMARY · #21 Vendor PRIMARY · D-NEW-FF RESOLVED keystone #2 · ESLint 100 CENTENNIAL' },
  { id: 'EX-11', name: 'Atlas FULL + BCD + FX + Board Pack (THIS SPRINT)', head: 'pending', loc: 1100, grade: '36th target', key_anchors: '#13 Atlas FULL PRIMARY · PDF live · 13th EximX Saathi · Phase 1 FINALE' },
];

const MOATS: MoatRow[] = [
  { num: 1, name: 'Multi-leg GIT Architecture', status: 'FULL', sprint: 'EX-4 + EX-5' },
  { num: 2, name: 'RMS (Risk Management System)', status: 'FULL', sprint: 'EX-6' },
  { num: 3, name: '3-Bucket Cost Allocation', status: 'LIVE', sprint: 'EX-4' },
  { num: 4, name: 'AEO Tier Mapping', status: 'FULL', sprint: 'EX-6 + EX-9' },
  { num: 5, name: '4-Method GIT Cost Methods', status: 'LIVE', sprint: 'EX-4' },
  { num: 6, name: 'ECGC Policy Tracker', status: 'LIVE', sprint: 'EX-7c' },
  { num: 7, name: 'CCSP-CFS-ICD State Machine', status: 'LIVE', sprint: 'EX-4' },
  { num: 8, name: 'CTH × Country × Date', status: 'PRIMARY', sprint: 'EX-2' },
  { num: 9, name: '11-Incoterm Engine', status: 'LIVE', sprint: 'EX-3 anchored EX-5' },
  { num: 10, name: 'CoO Embassy Legalization', status: 'FULL', sprint: 'EX-7b + EX-9' },
  { num: 11, name: 'CAROTAR Compliance', status: 'FULL', sprint: 'EX-9' },
  { num: 12, name: 'Reconciliation Event Engine', status: 'LIVE', sprint: 'EX-4' },
  { num: 13, name: 'TDL Gaps Atlas FULL', status: 'PRIMARY', sprint: 'EX-11 (THIS SPRINT)' },
  { num: 14, name: 'Dynamic Duty Labels', status: 'LIVE', sprint: 'EX-2' },
  { num: 15, name: 'Customs Revaluation', status: 'FULL', sprint: 'EX-5' },
  { num: 16, name: 'Dual Exchange Rate', status: 'PRIMARY', sprint: 'EX-3' },
  { num: 17, name: 'Module-Switcher (Export/Import/Unified)', status: 'LIVE', sprint: 'EX-7a' },
  { num: 18, name: 'Buyer Reliability', status: 'FULL', sprint: 'EX-7a + EX-7c' },
  { num: 19, name: 'FEMA 270-day Tracker', status: 'PRIMARY', sprint: 'EX-7c' },
  { num: 20, name: 'DGFT Schemes (RoDTEP·Drawback·SEIS·MEIS·EPCG)', status: 'PRIMARY', sprint: 'EX-10' },
  { num: 21, name: 'Vendor Reliability Scorecard', status: 'PRIMARY', sprint: 'EX-10' },
];

const V7_GAPS: GapRow[] = [
  { num: 1, name: 'Multi-leg GIT', closed_in: 'EX-4', status: 'closed' },
  { num: 2, name: 'Forex Triangulation', closed_in: 'EX-7c + EX-8', status: 'closed' },
  { num: 3, name: 'CIF Waterfall', closed_in: 'EX-5', status: 'closed' },
  { num: 4, name: 'Customs Duty Calculator', closed_in: 'EX-6', status: 'closed' },
  { num: 5, name: 'PCA Audit', closed_in: 'EX-9', status: 'closed' },
  { num: 6, name: 'Transfer Pricing', closed_in: 'EX-9', status: 'closed' },
  { num: 7, name: 'EDPMS UI', closed_in: 'EX-9', status: 'closed' },
  { num: 8, name: 'Sanctions Screening', closed_in: 'EX-9', status: 'closed' },
  { num: 9, name: 'EWS Aggregator', closed_in: 'EX-9', status: 'closed' },
  { num: 10, name: 'Export Dispatch Mirror', closed_in: 'EX-7b', status: 'closed' },
  { num: 11, name: 'STPI Softex', closed_in: 'EX-9', status: 'closed' },
  { num: 12, name: 'DGTR Investigation', closed_in: 'EX-9 (foundation) + EX-10 (Vendor exposure)', status: 'closed' },
];

const D_NEWS: DNewRow[] = [
  { code: 'D-NEW-FG', theme: 'Auto-posted voucher runtime', disposition: 'RESOLVED', sprint: 'EX-8 (architectural keystone #1)', rationale: 'Resolved via voucher-runtime-engine SIBLING · 5 FinCore engines 0-DIFF' },
  { code: 'D-NEW-FF', theme: 'Per-Item Valuation Override', disposition: 'RESOLVED', sprint: 'EX-10 (architectural keystone #2)', rationale: 'Resolved via per-item-valuation-engine SIBLING · BoELine + CILine + ImportPOLine + duty-waterfall-engine 0-DIFF' },
  { code: 'D-NEW-FH', theme: 'Compliance Suite routing housekeeping', disposition: 'CLOSED', sprint: 'EX-10', rationale: 'carotar-coo flipped + ImportLayout case added · was EX-9 T3 cosmetic' },
  { code: 'D-NEW-EX', theme: 'Multi-Currency BCD scenario modeling', disposition: 'CLOSE_EX11', sprint: 'EX-11 (this sprint)', rationale: 'Addressed by BCD Calculator + FX What-If standalone tools' },
  { code: 'D-NEW-EY', theme: 'Sprint Inventory Documentation drift', disposition: 'CLOSE_EX11', sprint: 'EX-11 (this sprint)', rationale: 'Addressed by Atlas FULL audit pass · 11-sprint walk + 200+ 0-diff catalog' },
  { code: 'D-NEW-FC', theme: 'Scrip transfer secondary market', disposition: 'CLOSE_EX11', sprint: 'EX-11 (this sprint)', rationale: 'Annotated as institutional gap · transferable state visible in scrip wallet · secondary market is Phase 2' },
  { code: 'D-NEW-EW', theme: 'Granular Landed Cost reconciliation', disposition: 'CARRY_PHASE2', sprint: 'Phase 2', rationale: 'Deeper accounting work · landed cost reconciliation engine extension needed' },
  { code: 'D-NEW-EZ', theme: 'CTH History granular timeline', disposition: 'CARRY_PHASE2', sprint: 'Phase 2', rationale: 'Timeline UI extension on cth-history-engine · UI-heavy · Phase 2' },
  { code: 'D-NEW-FA', theme: 'Cross-entity Realisation aggregation', disposition: 'CARRY_PHASE2', sprint: 'Phase 2', rationale: 'Multi-entity FEMA roll-up · accounting consolidation Phase 2' },
  { code: 'D-NEW-FB', theme: 'Forex Hedge accrual entries', disposition: 'CARRY_PHASE2', sprint: 'Phase 2', rationale: 'MTM hedge accrual journal entries · accounting accrual cycle Phase 2' },
  { code: 'D-NEW-FD', theme: 'DGTR auto-impact on BoE', disposition: 'CARRY_PHASE2', sprint: 'Phase 2', rationale: 'Auto-flag affected BoEs when new DGTR case lands · DGTR engine extension Phase 2' },
  { code: 'D-NEW-FE', theme: 'TP filing automation', disposition: 'CARRY_PHASE2', sprint: 'Phase 2', rationale: 'Form 3CEB automation · taxation cycle Phase 2' },
];

const dispositionColor: Record<DNewRow['disposition'], string> = {
  RESOLVED: 'bg-green-600', CLOSED: 'bg-green-500',
  CLOSE_EX11: 'bg-blue-600', CARRY_PHASE2: 'bg-amber-500',
};

const moatColor: Record<MoatRow['status'], string> = {
  FULL: 'bg-green-600', PRIMARY: 'bg-blue-600',
  LIVE: 'bg-emerald-500', FOUNDATION: 'bg-amber-500',
};

export function TDLGapsAtlasFull(): JSX.Element {
  const moatsFull = MOATS.filter((m) => m.status === 'FULL').length;
  const moatsPrimary = MOATS.filter((m) => m.status === 'PRIMARY').length;
  const gapsClosed = V7_GAPS.filter((g) => g.status === 'closed').length;
  const dnewResolved = D_NEWS.filter((d) => d.disposition === 'RESOLVED' || d.disposition === 'CLOSED' || d.disposition === 'CLOSE_EX11').length;
  const dnewCarry = D_NEWS.filter((d) => d.disposition === 'CARRY_PHASE2').length;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold"><Award className="w-5 h-5 inline mr-2" />TDL Gaps Atlas FULL · Moat #13 PRIMARY · Phase 1 EximX Institutional Capstone</h1>
        <p className="text-sm text-muted-foreground">EX-11 · 13 of 13 EximX sprints · 21 Moats · 12 v7 Gaps · 12 D-NEW decisions · 4DSmartOps blueprint alignment · institutional launch artifact</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold">{SPRINTS.length - 1}</div><div className="text-xs text-muted-foreground">Sprints Banked</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold text-green-600">{moatsFull}+{moatsPrimary}</div><div className="text-xs text-muted-foreground">FULL + PRIMARY Moats</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold text-blue-600">{gapsClosed}/12</div><div className="text-xs text-muted-foreground">v7 Gaps Closed (100%)</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold text-green-600">{dnewResolved}/12</div><div className="text-xs text-muted-foreground">D-NEW Closed/Resolved</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold text-amber-600">{dnewCarry}</div><div className="text-xs text-muted-foreground">D-NEW → Phase 2</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle><Layers className="w-4 h-4 inline mr-2" />11-Sprint Walk · EximX Arc Phase 1</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Sprint</TableHead><TableHead>Theme</TableHead><TableHead>HEAD</TableHead><TableHead>LOC</TableHead><TableHead>Grade</TableHead><TableHead>Key Anchors</TableHead></TableRow></TableHeader>
            <TableBody>
              {SPRINTS.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-bold">{s.id}</TableCell>
                  <TableCell className="text-xs">{s.name}</TableCell>
                  <TableCell className="font-mono text-xs">{s.head}</TableCell>
                  <TableCell>{s.loc}</TableCell>
                  <TableCell className="text-xs">{s.grade}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{s.key_anchors}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle><Target className="w-4 h-4 inline mr-2" />21 Moat Status Grid</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>#</TableHead><TableHead>Moat Name</TableHead><TableHead>Status</TableHead><TableHead>Sprint Anchored</TableHead></TableRow></TableHeader>
            <TableBody>
              {MOATS.map((m) => (
                <TableRow key={m.num}>
                  <TableCell className="font-bold">{m.num}</TableCell>
                  <TableCell>{m.name}</TableCell>
                  <TableCell><Badge variant="default" className={moatColor[m.status]}>{m.status}</Badge></TableCell>
                  <TableCell className="text-xs">{m.sprint}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle><CheckCircle2 className="w-4 h-4 inline mr-2" />v7 Compliance Gap Closure Timeline · 12 of 12 (100% MILESTONE)</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>#</TableHead><TableHead>Gap</TableHead><TableHead>Closed In</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {V7_GAPS.map((g) => (
                <TableRow key={g.num}>
                  <TableCell className="font-bold">{g.num}</TableCell>
                  <TableCell>{g.name}</TableCell>
                  <TableCell className="text-xs">{g.closed_in}</TableCell>
                  <TableCell><Badge variant="default" className="bg-green-600"><CheckCircle2 className="w-3 h-3 inline mr-1" />closed</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle><AlertTriangle className="w-4 h-4 inline mr-2" />12 D-NEW Decision Disposition Matrix</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Theme</TableHead><TableHead>Disposition</TableHead><TableHead>Sprint</TableHead><TableHead>Rationale</TableHead></TableRow></TableHeader>
            <TableBody>
              {D_NEWS.map((d) => (
                <TableRow key={d.code}>
                  <TableCell className="font-mono text-xs font-bold">{d.code}</TableCell>
                  <TableCell className="text-xs">{d.theme}</TableCell>
                  <TableCell><Badge variant="default" className={dispositionColor[d.disposition]}>{d.disposition.replace('_', ' ')}</Badge></TableCell>
                  <TableCell className="text-xs">{d.sprint}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{d.rationale}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle><BookOpen className="w-4 h-4 inline mr-2" />4DSmartOps Blueprint Cross-Ref · Discovery + Design + Develop + Deploy</CardTitle></CardHeader>
        <CardContent className="text-sm space-y-2">
          <div className="flex items-center gap-2"><Badge variant="default" className="bg-green-600">Discovery</Badge><span>21 Moats discovered + classified · 12 v7 gaps catalogued · 12 D-NEW surfaced</span></div>
          <div className="flex items-center gap-2"><Badge variant="default" className="bg-green-600">Design</Badge><span>SIBLING discipline (5 applications) · MIRROR pattern · Composition pattern (6 applications) · EximX.types.ts 0-DIFF</span></div>
          <div className="flex items-center gap-2"><Badge variant="default" className="bg-green-600">Develop</Badge><span>13 sprints · ~14,362 LOC · 200+ NEW code files · 35 consecutive A first-pass-clean</span></div>
          <div className="flex items-center gap-2"><Badge variant="default" className="bg-green-600">Deploy</Badge><span>Triple Gate every sprint · TSC 100 CENTENNIAL · ESLint 100 CENTENNIAL · Vitest 72 IDENTICAL · Board Pack PDF live</span></div>
        </CardContent>
      </Card>

      <Card className="border-2 border-primary">
        <CardHeader><CardTitle><ArrowRight className="w-4 h-4 inline mr-2" />Phase 2 Next Steps · Carried D-NEWs + EX-12 (LC + Packing Credit)</CardTitle></CardHeader>
        <CardContent className="text-sm space-y-1">
          <p>6 D-NEW decisions carry to Phase 2 with explicit rationale (see matrix above). EX-12 sprint deferred to Phase 2: LC (Letter of Credit) workflow + Packing Credit + Pre/Post-shipment finance integration.</p>
        </CardContent>
      </Card>
    </div>
  );
}
