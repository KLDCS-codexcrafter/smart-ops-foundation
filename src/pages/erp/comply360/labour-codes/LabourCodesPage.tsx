/**
 * @file        src/pages/erp/comply360/labour-codes/LabourCodesPage.tsx
 * @purpose     Labour Codes 2026 standalone first-class page · 4 consolidated codes
 * @sprint      Sprint 86 · T-Phase-5.D.4.1 · DP-S86-4 · FLOOR 4 OPENS
 */
import { useMemo, useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { HardHat } from 'lucide-react';
import {
  listComplianceEntries, computeComplianceScore, getCodeProvisions, getLabourCodeTypes,
  listLabourCodeFilings,
  type LabourCodeType,
} from '@/lib/comply360-labour-codes-engine';
import { getActiveBAPAccount, type BAPAccountId } from '@/lib/comply360-audit-framework-engine';

type SubTab = 'wages' | 'social-security' | 'industrial-relations' | 'osh-wc';
const SUBTAB_TO_CODE: Record<SubTab, LabourCodeType> = {
  'wages': 'Code_on_Wages',
  'social-security': 'Code_on_Social_Security',
  'industrial-relations': 'Industrial_Relations_Code',
  'osh-wc': 'OSH_WC_Code',
};

function currentFY(): string {
  const y = new Date().getFullYear();
  return `${y}-${String((y + 1) % 100).padStart(2, '0')}`;
}

export default function LabourCodesPage(): JSX.Element {
  const [tab, setTab] = useState<SubTab>('wages');
  const [bap] = useState<BAPAccountId>(getActiveBAPAccount());

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center gap-2">
        <HardHat className="h-6 w-6" />
        <h1 className="text-2xl font-semibold">Labour Codes 2026</h1>
        <span className="ml-2 text-sm text-muted-foreground">4 consolidated codes · effective 2026</span>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as SubTab)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="wages">Code on Wages</TabsTrigger>
          <TabsTrigger value="social-security">Social Security</TabsTrigger>
          <TabsTrigger value="industrial-relations">Industrial Relations</TabsTrigger>
          <TabsTrigger value="osh-wc">OSH&amp;WC</TabsTrigger>
        </TabsList>

        <TabsContent value="wages"><CodeTabPanel codeType={SUBTAB_TO_CODE.wages} bap={bap} /></TabsContent>
        <TabsContent value="social-security"><CodeTabPanel codeType={SUBTAB_TO_CODE['social-security']} bap={bap} /></TabsContent>
        <TabsContent value="industrial-relations"><CodeTabPanel codeType={SUBTAB_TO_CODE['industrial-relations']} bap={bap} /></TabsContent>
        <TabsContent value="osh-wc"><CodeTabPanel codeType={SUBTAB_TO_CODE['osh-wc']} bap={bap} /></TabsContent>
      </Tabs>
    </div>
  );
}

function CodeTabPanel({ codeType, bap }: { codeType: LabourCodeType; bap: BAPAccountId }): JSX.Element {
  const fy = currentFY();
  const score = useMemo(() => computeComplianceScore(codeType, fy), [codeType, fy]);
  const entries = useMemo(() => listComplianceEntries({ code_type: codeType, fy }), [codeType, fy]);
  const filings = useMemo(() => listLabourCodeFilings({ code_type: codeType, fy }), [codeType, fy]);
  const provisions = useMemo(() => getCodeProvisions(codeType), [codeType]);
  const label = useMemo(() => getLabourCodeTypes().find((t) => t.code_type === codeType)?.label ?? codeType, [codeType]);

  return (
    <div className="p-6 space-y-4">
      <div className="grid grid-cols-4 gap-3">
        <Card className="p-3"><div className="text-xs text-muted-foreground">Compliance Score</div><div className="text-2xl font-mono">{score.score}</div></Card>
        <Card className="p-3"><div className="text-xs text-muted-foreground">Compliant</div><div className="text-2xl font-mono">{score.compliant_count}</div></Card>
        <Card className="p-3"><div className="text-xs text-muted-foreground">Pending</div><div className="text-2xl font-mono">{score.pending_count}</div></Card>
        <Card className="p-3"><div className="text-xs text-muted-foreground">Non-compliant</div><div className="text-2xl font-mono">{score.non_compliant_count}</div></Card>
      </div>
      <Card className="p-4">
        <h3 className="font-semibold mb-2">{label} · Provisions ({provisions.length})</h3>
        <Table>
          <TableHeader><TableRow><TableHead>Section</TableHead><TableHead>Title</TableHead><TableHead>Applicable To</TableHead></TableRow></TableHeader>
          <TableBody>
            {provisions.map((p) => (
              <TableRow key={p.section}>
                <TableCell className="font-mono text-xs">{p.section}</TableCell>
                <TableCell>{p.title}</TableCell>
                <TableCell>{p.applicable_to.map((a) => <Badge key={a} variant="secondary" className="mr-1">{a}</Badge>)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      <Card className="p-4">
        <h3 className="font-semibold mb-2">Compliance Entries ({entries.length}) · Filings ({filings.length}) · BAP {bap}</h3>
        <p className="text-xs text-muted-foreground">Use the engine API to record entries · MCA Rule 11(g)(b) audit-trail captures every state change.</p>
      </Card>
    </div>
  );
}
