/**
 * PipelineSummary.tsx — read-only CRM pipeline summary report
 * Sprint 3 SalesX.
 */
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { useEnquiries } from '@/hooks/useEnquiries';
import { useQuotations } from '@/hooks/useQuotations';
import type { EnquiryStatus } from '@/types/enquiry';
import { cn } from '@/lib/utils';

interface Props { entityCode: string }

const inrFmt = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
const formatINR = (n: number) => `₹${inrFmt.format(n)}`;

const STAGE_GROUPS: Array<{ id: EnquiryStatus; label: string; color: string }> = [
  { id: 'new',        label: 'New',         color: 'bg-muted text-muted-foreground border-border' },
  { id: 'assigned',   label: 'Assigned',    color: 'bg-yellow-500/15 text-yellow-700 border-yellow-500/30' },
  { id: 'in_process', label: 'In Process',  color: 'bg-blue-500/15 text-blue-700 border-blue-500/30' },
  { id: 'demo',       label: 'Demo',        color: 'bg-blue-500/15 text-blue-700 border-blue-500/30' },
  { id: 'quote',      label: 'Quotation',   color: 'bg-purple-500/15 text-purple-700 border-purple-500/30' },
  { id: 'agreed',     label: 'Agreed',      color: 'bg-green-500/15 text-green-700 border-green-500/30' },
  { id: 'sold',       label: 'Sold',        color: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30' },
  { id: 'lost',       label: 'Lost',        color: 'bg-destructive/15 text-destructive border-destructive/30' },
];

export function PipelineSummaryPanel({ entityCode }: Props) {
  const { enquiries } = useEnquiries(entityCode);
  const { quotations } = useQuotations(entityCode);

  const stageCounts = useMemo(() => {
    const acc: Record<string, number> = {};
    enquiries.forEach(e => { acc[e.status] = (acc[e.status] ?? 0) + 1; });
    return acc;
  }, [enquiries]);

  const total = enquiries.length;

  // Open pipeline value = sum of confirmed quotation totals where quotation_stage in
  // negotiation/draft (treat as "in pipeline")
  const pipelineValue = useMemo(() => {
    return quotations
      .filter(q => q.quotation_stage === 'negotiation' || q.quotation_stage === 'draft')
      .reduce((s, q) => s + (q.total_amount ?? 0), 0);
  }, [quotations]);

  const wonValue = useMemo(() => {
    return quotations
      .filter(q => q.quotation_stage === 'confirmed')
      .reduce((s, q) => s + (q.total_amount ?? 0), 0);
  }, [quotations]);

  const lostCount = stageCounts.lost ?? 0;
  const wonCount = stageCounts.sold ?? 0;
  const closedCount = lostCount + wonCount;
  const winRate = closedCount > 0 ? (wonCount / closedCount) * 100 : 0;

  // By executive
  const byExec = useMemo(() => {
    const map = new Map<string, { name: string; total: number; won: number; lost: number }>();
    enquiries.forEach(e => {
      const k = e.assigned_executive_id ?? 'unassigned';
      const name = e.assigned_executive_name ?? 'Unassigned';
      const r = map.get(k) ?? { name, total: 0, won: 0, lost: 0 };
      r.total += 1;
      if (e.status === 'sold') r.won += 1;
      if (e.status === 'lost') r.lost += 1;
      map.set(k, r);
    });
    return [...map.values()].sort((a, b) => b.total - a.total);
  }, [enquiries]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Pipeline Summary</h1>
        <p className="text-sm text-muted-foreground">Stage distribution, value &amp; win rate</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="pt-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Enquiries</p>
            <p className="text-2xl font-bold font-mono mt-1">{total}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Pipeline Value</p>
            <p className="text-2xl font-bold font-mono mt-1">{formatINR(pipelineValue)}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="pt-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Won Value</p>
            <p className="text-2xl font-bold font-mono mt-1">{formatINR(wonValue)}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-yellow-500">
          <CardContent className="pt-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Win Rate</p>
            <p className="text-2xl font-bold font-mono mt-1">{winRate.toFixed(1)}%</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {wonCount} won · {lostCount} lost
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Pipeline by Stage</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {STAGE_GROUPS.map(s => {
            const c = stageCounts[s.id] ?? 0;
            const pct = total > 0 ? (c / total) * 100 : 0;
            return (
              <div key={s.id} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <Badge variant="outline" className={cn('text-[10px]', s.color)}>{s.label}</Badge>
                  <span className="font-mono">{c} · {pct.toFixed(0)}%</span>
                </div>
                <Progress value={pct} className="h-1.5" />
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">By Executive</CardTitle></CardHeader>
        <CardContent>
          {byExec.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              No assigned executives yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Executive</TableHead>
                  <TableHead className="text-xs text-right">Total</TableHead>
                  <TableHead className="text-xs text-right">Won</TableHead>
                  <TableHead className="text-xs text-right">Lost</TableHead>
                  <TableHead className="text-xs text-right">Win %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {byExec.map(r => {
                  const closed = r.won + r.lost;
                  const wr = closed > 0 ? (r.won / closed) * 100 : 0;
                  return (
                    <TableRow key={r.name}>
                      <TableCell className="text-xs">{r.name}</TableCell>
                      <TableCell className="text-xs text-right font-mono">{r.total}</TableCell>
                      <TableCell className="text-xs text-right font-mono text-success">{r.won}</TableCell>
                      <TableCell className="text-xs text-right font-mono text-destructive">{r.lost}</TableCell>
                      <TableCell className="text-xs text-right font-mono">{wr.toFixed(1)}%</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function PipelineSummary(props: Props) {
  return <PipelineSummaryPanel {...props} />;
}
