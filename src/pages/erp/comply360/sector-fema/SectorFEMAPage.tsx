/**
 * @file        src/pages/erp/comply360/sector-fema/SectorFEMAPage.tsx
 * @purpose     FEMA Sector-Pack standalone page · FC-GPR + FC-TRS + Annual Return
 * @sprint      Sprint 87 · T-Phase-5.D.4.2 · DP-S87-13 · FLOOR 4 CLOSES
 */
import { useMemo, useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Globe2 } from 'lucide-react';
import {
  listFCGPRFilings, listFCTRSFilings, listAnnualReturns,
} from '@/lib/comply360-sector-fema-engine';
import { getActiveBAPAccount, type BAPAccountId } from '@/lib/comply360-audit-framework-engine';

type SubTab = 'fc-gpr' | 'fc-trs' | 'annual';

export default function SectorFEMAPage(): JSX.Element {
  const [tab, setTab] = useState<SubTab>('fc-gpr');
  const [bap] = useState<BAPAccountId>(getActiveBAPAccount());
  return (
    <div className="p-4">
      <div className="mb-4 flex items-center gap-2">
        <Globe2 className="h-6 w-6" />
        <h1 className="text-2xl font-semibold">FEMA Sector-Pack</h1>
        <span className="ml-2 text-sm text-muted-foreground">Foreign Exchange Management Act 1999 · BAP {bap}</span>
      </div>
      <Tabs value={tab} onValueChange={(v) => setTab(v as SubTab)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="fc-gpr">FC-GPR</TabsTrigger>
          <TabsTrigger value="fc-trs">FC-TRS</TabsTrigger>
          <TabsTrigger value="annual">Annual Liabilities</TabsTrigger>
        </TabsList>
        <TabsContent value="fc-gpr"><FCGPRPanel /></TabsContent>
        <TabsContent value="fc-trs"><FCTRSPanel /></TabsContent>
        <TabsContent value="annual"><AnnualPanel /></TabsContent>
      </Tabs>
    </div>
  );
}

function FCGPRPanel(): JSX.Element {
  const filings = useMemo(() => listFCGPRFilings(), []);
  return (
    <Card className="m-6 p-4">
      <h3 className="font-semibold mb-2">FC-GPR Filings ({filings.length})</h3>
      <Table>
        <TableHeader><TableRow><TableHead>Filing ID</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
        <TableBody>{filings.map((f) => (
          <TableRow key={f.id}><TableCell className="font-mono text-xs">{f.id}</TableCell><TableCell>{f.filing_status}</TableCell></TableRow>
        ))}</TableBody>
      </Table>
    </Card>
  );
}

function FCTRSPanel(): JSX.Element {
  const filings = useMemo(() => listFCTRSFilings(), []);
  return (
    <Card className="m-6 p-4">
      <h3 className="font-semibold mb-2">FC-TRS Filings ({filings.length})</h3>
      <p className="text-xs text-muted-foreground">Transfer of capital instruments between resident and non-resident.</p>
    </Card>
  );
}

function AnnualPanel(): JSX.Element {
  const returns = useMemo(() => listAnnualReturns(), []);
  return (
    <Card className="m-6 p-4">
      <h3 className="font-semibold mb-2">Annual Foreign Liabilities Returns ({returns.length})</h3>
      <p className="text-xs text-muted-foreground">FLA return · due 15 July annually per FEMA regs.</p>
    </Card>
  );
}
