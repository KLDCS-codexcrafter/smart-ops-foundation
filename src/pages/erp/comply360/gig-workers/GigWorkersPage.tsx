/**
 * @file        src/pages/erp/comply360/gig-workers/GigWorkersPage.tsx
 * @purpose     Gig Workers Social Security (Code on Social Security 2020 Section 113A) standalone page
 * @sprint      Sprint 86 · T-Phase-5.D.4.1 · DP-S86-4 · FLOOR 4 OPENS
 */
import { useMemo, useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Bike } from 'lucide-react';
import {
  listAggregators, listGigWorkers, listWelfareContributions,
  computeWelfareContribution, getPlatformCategories,
} from '@/lib/comply360-gig-workers-engine';
import { getActiveBAPAccount, type BAPAccountId } from '@/lib/comply360-audit-framework-engine';

type SubTab = 'aggregator-registration' | 'worker-enrolment' | 'welfare-contributions';

export default function GigWorkersPage(): JSX.Element {
  const [tab, setTab] = useState<SubTab>('aggregator-registration');
  const [bap] = useState<BAPAccountId>(getActiveBAPAccount());

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center gap-2">
        <Bike className="h-6 w-6" />
        <h1 className="text-2xl font-semibold">Gig Workers Social Security</h1>
        <span className="ml-2 text-sm text-muted-foreground">Code on Social Security 2020 · Section 113A · BAP {bap}</span>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as SubTab)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="aggregator-registration">Aggregator Registration</TabsTrigger>
          <TabsTrigger value="worker-enrolment">Worker Enrolment</TabsTrigger>
          <TabsTrigger value="welfare-contributions">Welfare Contributions</TabsTrigger>
        </TabsList>

        <TabsContent value="aggregator-registration"><AggregatorPanel /></TabsContent>
        <TabsContent value="worker-enrolment"><WorkerEnrolmentPanel /></TabsContent>
        <TabsContent value="welfare-contributions"><WelfareContributionsPanel /></TabsContent>
      </Tabs>
    </div>
  );
}

function AggregatorPanel(): JSX.Element {
  const aggs = useMemo(() => listAggregators(), []);
  const cats = useMemo(() => getPlatformCategories(), []);
  return (
    <div className="p-6 space-y-4">
      <Card className="p-4">
        <h3 className="font-semibold mb-2">Platform Categories ({cats.length})</h3>
        <div className="flex flex-wrap gap-2">{cats.map((c) => <Badge key={c.category} variant="secondary">{c.label}</Badge>)}</div>
      </Card>
      <Card className="p-4">
        <h3 className="font-semibold mb-2">Aggregator Registrations ({aggs.length})</h3>
        <Table>
          <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Category</TableHead><TableHead>State</TableHead><TableHead>Workers</TableHead></TableRow></TableHeader>
          <TableBody>
            {aggs.length === 0 && (<TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">No aggregators registered</TableCell></TableRow>)}
            {aggs.map((a) => (
              <TableRow key={a.id}>
                <TableCell>{a.aggregator_name}</TableCell>
                <TableCell><Badge variant="secondary">{a.platform_category}</Badge></TableCell>
                <TableCell>{a.state}</TableCell>
                <TableCell className="font-mono">{a.total_gig_workers}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function WorkerEnrolmentPanel(): JSX.Element {
  const workers = useMemo(() => listGigWorkers({ is_active: true }), []);
  return (
    <div className="p-6 space-y-4">
      <Card className="p-4">
        <h3 className="font-semibold mb-2">Active Gig Workers ({workers.length})</h3>
        <Table>
          <TableHeader><TableRow><TableHead>Worker</TableHead><TableHead>Category</TableHead><TableHead>Enrolled</TableHead></TableRow></TableHeader>
          <TableBody>
            {workers.length === 0 && (<TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-6">No workers enrolled</TableCell></TableRow>)}
            {workers.map((w) => (
              <TableRow key={w.id}>
                <TableCell>{w.worker_name}</TableCell>
                <TableCell><Badge variant="secondary">{w.category}</Badge></TableCell>
                <TableCell className="font-mono text-xs">{w.enrolment_date}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function WelfareContributionsPanel(): JSX.Element {
  const contribs = useMemo(() => listWelfareContributions(), []);
  const sample1pct = useMemo(() => computeWelfareContribution(10_000_000, 1), []);
  const sample2pct = useMemo(() => computeWelfareContribution(10_000_000, 2), []);
  return (
    <div className="p-6 space-y-4">
      <Card className="p-4">
        <h3 className="font-semibold mb-2">Welfare Contribution Calculator (Section 114)</h3>
        <div className="text-sm">Turnover ₹1,00,00,000 → 1% = <span className="font-mono">₹{sample1pct}</span> · 2% = <span className="font-mono">₹{sample2pct}</span></div>
      </Card>
      <Card className="p-4">
        <h3 className="font-semibold mb-2">Welfare Contributions ({contribs.length})</h3>
        <Table>
          <TableHeader><TableRow><TableHead>FY</TableHead><TableHead>Quarter</TableHead><TableHead>Turnover</TableHead><TableHead>%</TableHead><TableHead>Amount</TableHead><TableHead>Paid</TableHead></TableRow></TableHeader>
          <TableBody>
            {contribs.length === 0 && (<TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">No contributions recorded</TableCell></TableRow>)}
            {contribs.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-mono text-xs">{c.fy}</TableCell>
                <TableCell>{c.quarter}</TableCell>
                <TableCell className="font-mono">₹{c.turnover_inr.toLocaleString('en-IN')}</TableCell>
                <TableCell className="font-mono">{c.contribution_pct}%</TableCell>
                <TableCell className="font-mono">₹{c.contribution_amount_inr.toLocaleString('en-IN')}</TableCell>
                <TableCell>{c.paid_at ? <Badge>paid</Badge> : <Badge variant="secondary">pending</Badge>}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
