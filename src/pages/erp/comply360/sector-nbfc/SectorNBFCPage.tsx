/**
 * @file        src/pages/erp/comply360/sector-nbfc/SectorNBFCPage.tsx
 * @purpose     NBFC Sector-Pack standalone page · NPA + ALM + LCR per RBI Master Directions
 * @sprint      Sprint 87 · T-Phase-5.D.4.2 · DP-S87-10 · FLOOR 4 CLOSES
 */
import { useMemo, useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Landmark } from 'lucide-react';
import {
  listLoanAccounts, listALMReports, listLCRCalculations, classifyNPA,
} from '@/lib/comply360-sector-nbfc-engine';
import { getActiveBAPAccount, type BAPAccountId } from '@/lib/comply360-audit-framework-engine';

type SubTab = 'npa' | 'alm' | 'lcr';

export default function SectorNBFCPage(): JSX.Element {
  const [tab, setTab] = useState<SubTab>('npa');
  const [bap] = useState<BAPAccountId>(getActiveBAPAccount());

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center gap-2">
        <Landmark className="h-6 w-6" />
        <h1 className="text-2xl font-semibold">NBFC Sector-Pack</h1>
        <span className="ml-2 text-sm text-muted-foreground">RBI Master Directions · BAP {bap}</span>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as SubTab)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="npa">NPA Classification</TabsTrigger>
          <TabsTrigger value="alm">ALM Buckets</TabsTrigger>
          <TabsTrigger value="lcr">LCR</TabsTrigger>
        </TabsList>

        <TabsContent value="npa"><NPAPanel /></TabsContent>
        <TabsContent value="alm"><ALMPanel /></TabsContent>
        <TabsContent value="lcr"><LCRPanel /></TabsContent>
      </Tabs>
    </div>
  );
}

function NPAPanel(): JSX.Element {
  const loans = useMemo(() => listLoanAccounts(), []);
  const sample = useMemo(() => [0, 45, 120, 365, 800, 1400].map((d) => ({ dpd: d, ...classifyNPA(d) })), []);
  return (
    <div className="p-6 space-y-4">
      <Card className="p-4">
        <h3 className="font-semibold mb-2">NPA Classification Matrix (DPD → Class)</h3>
        <Table>
          <TableHeader><TableRow><TableHead>Days Past Due</TableHead><TableHead>NPA Class</TableHead><TableHead>Provision %</TableHead></TableRow></TableHeader>
          <TableBody>
            {sample.map((s) => (
              <TableRow key={s.dpd}>
                <TableCell className="font-mono">{s.dpd}</TableCell>
                <TableCell><Badge variant="secondary">{s.npa_class}</Badge></TableCell>
                <TableCell className="font-mono">{s.provision_required_pct}%</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      <Card className="p-4">
        <h3 className="font-semibold mb-2">Loan Accounts ({loans.length})</h3>
        <p className="text-xs text-muted-foreground">Use engine API to record loan accounts · MCA Rule 11(g)(b) audit-trail.</p>
      </Card>
    </div>
  );
}

function ALMPanel(): JSX.Element {
  const reports = useMemo(() => listALMReports(), []);
  return (
    <Card className="m-6 p-4">
      <h3 className="font-semibold mb-2">ALM Reports ({reports.length})</h3>
      <p className="text-xs text-muted-foreground">9-bucket Asset-Liability Management per RBI directions.</p>
    </Card>
  );
}

function LCRPanel(): JSX.Element {
  const lcrs = useMemo(() => listLCRCalculations(), []);
  return (
    <Card className="m-6 p-4">
      <h3 className="font-semibold mb-2">LCR Calculations ({lcrs.length})</h3>
      <p className="text-xs text-muted-foreground">Liquidity Coverage Ratio · HQLA / Net Cash Outflow.</p>
    </Card>
  );
}
