/**
 * @file        src/pages/erp/comply360/sector-rera/SectorRERAPage.tsx
 * @purpose     RERA Sector-Pack standalone page · Project registration + QPR
 * @sprint      Sprint 87 · T-Phase-5.D.4.2 · DP-S87-12 · FLOOR 4 CLOSES
 */
import { useMemo, useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Building2 } from 'lucide-react';
import { listRERAProjects, listProgressReports } from '@/lib/comply360-sector-rera-engine';
import { getActiveBAPAccount, type BAPAccountId } from '@/lib/comply360-audit-framework-engine';

type SubTab = 'projects' | 'qpr';

export default function SectorRERAPage(): JSX.Element {
  const [tab, setTab] = useState<SubTab>('projects');
  const [bap] = useState<BAPAccountId>(getActiveBAPAccount());

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center gap-2">
        <Building2 className="h-6 w-6" />
        <h1 className="text-2xl font-semibold">RERA Sector-Pack</h1>
        <span className="ml-2 text-sm text-muted-foreground">Real Estate (Regulation &amp; Development) Act 2016 · BAP {bap}</span>
      </div>
      <Tabs value={tab} onValueChange={(v) => setTab(v as SubTab)}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="projects">Project Registration</TabsTrigger>
          <TabsTrigger value="qpr">Quarterly Progress</TabsTrigger>
        </TabsList>
        <TabsContent value="projects"><ProjectsPanel /></TabsContent>
        <TabsContent value="qpr"><QPRPanel /></TabsContent>
      </Tabs>
    </div>
  );
}

function ProjectsPanel(): JSX.Element {
  const projects = useMemo(() => listRERAProjects(), []);
  return (
    <Card className="m-6 p-4">
      <h3 className="font-semibold mb-2">RERA Projects ({projects.length})</h3>
      <Table>
        <TableHeader><TableRow><TableHead>Project</TableHead><TableHead>Status</TableHead><TableHead>State Authority</TableHead></TableRow></TableHeader>
        <TableBody>
          {projects.map((p) => (
            <TableRow key={p.id}>
              <TableCell>{p.project_name}</TableCell>
              <TableCell><Badge variant="secondary">{p.project_status}</Badge></TableCell>
              <TableCell className="font-mono text-xs">{p.state_rera_authority}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

function QPRPanel(): JSX.Element {
  const reports = useMemo(() => listProgressReports(), []);
  return (
    <Card className="m-6 p-4">
      <h3 className="font-semibold mb-2">Quarterly Progress Reports ({reports.length})</h3>
      <p className="text-xs text-muted-foreground">QPR filing per RERA Section 11(1)(c) / state rules.</p>
    </Card>
  );
}
