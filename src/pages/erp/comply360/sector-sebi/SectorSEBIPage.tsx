/**
 * @file        src/pages/erp/comply360/sector-sebi/SectorSEBIPage.tsx
 * @purpose     SEBI LODR Sector-Pack standalone page · Reg 33 + Reg 49 + Reg 30
 * @sprint      Sprint 87 · T-Phase-5.D.4.2 · DP-S87-11 · FLOOR 4 CLOSES
 */
import { useMemo, useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TrendingUp } from 'lucide-react';
import {
  listQuarterlyFilings, listAuditCommitteeCompositions, listMaterialDisclosures,
  getAuditCommitteeMeetingsForFY,
} from '@/lib/comply360-sector-sebi-lodr-engine';
import { getActiveBAPAccount, type BAPAccountId } from '@/lib/comply360-audit-framework-engine';

type SubTab = 'reg33' | 'reg49' | 'reg30';

function currentFY(): string {
  const y = new Date().getFullYear();
  return `${y}-${String((y + 1) % 100).padStart(2, '0')}`;
}

export default function SectorSEBIPage(): JSX.Element {
  const [tab, setTab] = useState<SubTab>('reg33');
  const [bap] = useState<BAPAccountId>(getActiveBAPAccount());

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center gap-2">
        <TrendingUp className="h-6 w-6" />
        <h1 className="text-2xl font-semibold">SEBI LODR Sector-Pack</h1>
        <span className="ml-2 text-sm text-muted-foreground">Listing Obligations &amp; Disclosure Requirements · BAP {bap}</span>
      </div>
      <Tabs value={tab} onValueChange={(v) => setTab(v as SubTab)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="reg33">Reg 33 · Quarterly</TabsTrigger>
          <TabsTrigger value="reg49">Reg 49 · Audit Committee</TabsTrigger>
          <TabsTrigger value="reg30">Reg 30 · Disclosures</TabsTrigger>
        </TabsList>
        <TabsContent value="reg33"><Reg33Panel /></TabsContent>
        <TabsContent value="reg49"><Reg49Panel /></TabsContent>
        <TabsContent value="reg30"><Reg30Panel /></TabsContent>
      </Tabs>
    </div>
  );
}

function Reg33Panel(): JSX.Element {
  const fy = currentFY();
  const filings = useMemo(() => listQuarterlyFilings({ fy }), [fy]);
  return (
    <Card className="m-6 p-4">
      <h3 className="font-semibold mb-2">Quarterly Filings · FY {fy} ({filings.length})</h3>
      <Table>
        <TableHeader><TableRow><TableHead>Quarter</TableHead><TableHead>Status</TableHead><TableHead>Filed At</TableHead></TableRow></TableHeader>
        <TableBody>
          {filings.map((f) => (
            <TableRow key={f.id}>
              <TableCell className="font-mono">{f.quarter}</TableCell>
              <TableCell>{f.filing_status}</TableCell>
              <TableCell className="font-mono text-xs">{f.filed_at ?? '—'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

function Reg49Panel(): JSX.Element {
  const fy = currentFY();
  const comps = useMemo(() => listAuditCommitteeCompositions({ fy }), [fy]);
  const meetings = useMemo(() => getAuditCommitteeMeetingsForFY(fy), [fy]);
  return (
    <Card className="m-6 p-4">
      <h3 className="font-semibold mb-2">Audit Committee Compositions · FY {fy} ({comps.length})</h3>
      <p className="text-sm text-muted-foreground">Meetings (USE-SITE READS S85 meetings-engine): <span className="font-mono">{meetings}</span></p>
    </Card>
  );
}

function Reg30Panel(): JSX.Element {
  const fy = currentFY();
  const disclosures = useMemo(() => listMaterialDisclosures({ fy }), [fy]);
  return (
    <Card className="m-6 p-4">
      <h3 className="font-semibold mb-2">Material Disclosures · FY {fy} ({disclosures.length})</h3>
      <Table>
        <TableHeader><TableRow><TableHead>Category</TableHead><TableHead>Compliance</TableHead></TableRow></TableHeader>
        <TableBody>
          {disclosures.map((d) => (
            <TableRow key={d.id}>
              <TableCell>{d.category}</TableCell>
              <TableCell>{d.compliance}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
