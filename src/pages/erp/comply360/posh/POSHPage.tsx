/**
 * @file        src/pages/erp/comply360/posh/POSHPage.tsx
 * @purpose     POSH (Sexual Harassment Act 2013) standalone first-class page · ICC + Complaints + Annual Report
 * @sprint      Sprint 86 · T-Phase-5.D.4.1 · DP-S86-4 · FLOOR 4 OPENS
 */
import { useMemo, useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import {
  listICCMembers, verifyICCComposition,
  listposhComplaints, generateAnnualReport, listAnnualReports,
} from '@/lib/comply360-posh-engine';
import { getActiveBAPAccount, type BAPAccountId } from '@/lib/comply360-audit-framework-engine';

type SubTab = 'icc' | 'complaints' | 'annual-report';

function currentFY(): string {
  const y = new Date().getFullYear();
  return `${y}-${String((y + 1) % 100).padStart(2, '0')}`;
}

export default function POSHPage(): JSX.Element {
  const [tab, setTab] = useState<SubTab>('icc');
  const [bap] = useState<BAPAccountId>(getActiveBAPAccount());

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center gap-2">
        <UserCheck className="h-6 w-6" />
        <h1 className="text-2xl font-semibold">POSH · Sexual Harassment at Workplace</h1>
        <span className="ml-2 text-sm text-muted-foreground">SH Act 2013 · Section 21 Annual Report</span>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as SubTab)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="icc">Internal Complaints Committee</TabsTrigger>
          <TabsTrigger value="complaints">Complaints</TabsTrigger>
          <TabsTrigger value="annual-report">Annual Report</TabsTrigger>
        </TabsList>

        <TabsContent value="icc"><ICCPanel /></TabsContent>
        <TabsContent value="complaints"><ComplaintsPanel /></TabsContent>
        <TabsContent value="annual-report"><AnnualReportPanel bap={bap} /></TabsContent>
      </Tabs>
    </div>
  );
}

function ICCPanel(): JSX.Element {
  const members = useMemo(() => listICCMembers({ active_only: true }), []);
  const composition = useMemo(() => verifyICCComposition(), []);
  return (
    <div className="p-6 space-y-4">
      <Card className="p-4">
        <h3 className="font-semibold mb-2">ICC Composition · Section 4(2)</h3>
        <div className="flex items-center gap-2 mb-2">
          <Badge variant={composition.is_valid ? 'default' : 'destructive'}>{composition.is_valid ? 'VALID' : 'INVALID'}</Badge>
          <span className="text-xs text-muted-foreground">{composition.member_count} members · {composition.women_count} women · {composition.external_count} external</span>
        </div>
        {composition.issues.length > 0 && (
          <ul className="text-xs text-destructive list-disc ml-5">{composition.issues.map((i) => <li key={i}>{i}</li>)}</ul>
        )}
      </Card>
      <Card className="p-4">
        <h3 className="font-semibold mb-2">Active ICC Members ({members.length})</h3>
        <Table>
          <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Role</TableHead><TableHead>Woman</TableHead><TableHead>Term Ends</TableHead></TableRow></TableHeader>
          <TableBody>
            {members.length === 0 && (<TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">No active ICC members</TableCell></TableRow>)}
            {members.map((m) => (
              <TableRow key={m.id}>
                <TableCell>{m.member_name}</TableCell>
                <TableCell><Badge variant="secondary">{m.role}</Badge></TableCell>
                <TableCell>{m.is_woman ? 'Yes' : 'No'}</TableCell>
                <TableCell className="font-mono text-xs">{m.term_end_date}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function ComplaintsPanel(): JSX.Element {
  const complaints = useMemo(() => listposhComplaints({ fy: currentFY() }), []);
  return (
    <div className="p-6 space-y-4">
      <Card className="p-4">
        <h3 className="font-semibold mb-2">POSH Complaints ({complaints.length}) · FY {currentFY()}</h3>
        <Table>
          <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Category</TableHead><TableHead>Severity</TableHead><TableHead>Status</TableHead><TableHead>Anon</TableHead></TableRow></TableHeader>
          <TableBody>
            {complaints.length === 0 && (<TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">No complaints filed</TableCell></TableRow>)}
            {complaints.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-mono text-xs">{c.complaint_date}</TableCell>
                <TableCell><Badge variant="secondary">{c.category}</Badge></TableCell>
                <TableCell><Badge>{c.severity}</Badge></TableCell>
                <TableCell><Badge>{c.status}</Badge></TableCell>
                <TableCell>{c.is_anonymous ? 'YES' : 'no'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function AnnualReportPanel({ bap }: { bap: BAPAccountId }): JSX.Element {
  const [tick, setTick] = useState(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const reports = useMemo(() => listAnnualReports(), [tick]);
  const generate = (): void => {
    generateAnnualReport({
      fy: currentFY(), preventive_actions_taken: ['Annual training conducted'],
      awareness_programs_conducted: 4, prepared_by_bap: bap,
    });
    toast.success('Annual report generated'); setTick((t) => t + 1);
  };
  return (
    <div className="p-6 space-y-4">
      <Card className="p-4">
        <h3 className="font-semibold mb-2">Section 21 Annual Report</h3>
        <Button onClick={generate}>Generate FY {currentFY()} Annual Report</Button>
      </Card>
      <Card className="p-4">
        <h3 className="font-semibold mb-2">Reports ({reports.length})</h3>
        <Table>
          <TableHeader><TableRow><TableHead>FY</TableHead><TableHead>Received</TableHead><TableHead>Resolved</TableHead><TableHead>Pending</TableHead></TableRow></TableHeader>
          <TableBody>
            {reports.length === 0 && (<TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">No reports</TableCell></TableRow>)}
            {reports.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-xs">{r.fy}</TableCell>
                <TableCell className="font-mono">{r.total_complaints_received}</TableCell>
                <TableCell className="font-mono">{r.total_complaints_resolved}</TableCell>
                <TableCell className="font-mono">{r.total_pending}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
