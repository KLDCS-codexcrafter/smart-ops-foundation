/**
 * @file        src/pages/erp/docvault/reports/ApprovalLatencyReport.tsx
 * @purpose     Approval latency report · submitted→approved time per dept/type · stuck-outlier detection
 * @who         Document Controller · Quality Manager
 * @when        2026-05-09
 * @sprint      T-Phase-1.A.9 BUNDLED · Q-LOCK-5a + Block A.6
 * @iso         ISO 9001:2015 §7.5 · ISO 25010 Performance Efficiency
 * @whom        Audit Owner
 * @decisions   D-NEW-CJ canonical · D-NEW-BV Phase 1 mock
 * @disciplines FR-30 · FR-25 dept-scoped
 * @reuses      docvault-engine.loadDocuments
 * @[JWT]       Phase 2 reporting endpoint
 */
import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useEntityCode } from '@/hooks/useEntityCode';
import { loadDocuments } from '@/lib/docvault-engine';

export function ApprovalLatencyReport(): JSX.Element {
  const { entityCode } = useEntityCode();
  const docs = loadDocuments(entityCode);

  const rows = useMemo(() => {
    const buckets: { dept: string; type: string; latencyDays: number; stuck: boolean; title: string }[] = [];
    const now = Date.now();
    for (const d of docs) {
      for (const v of d.versions) {
        if (v.submitted_at && v.approved_at) {
          const days = (new Date(v.approved_at).getTime() - new Date(v.submitted_at).getTime()) / 86_400_000;
          buckets.push({ dept: d.originating_department_id, type: d.document_type, latencyDays: Math.round(days * 10) / 10, stuck: false, title: d.title });
        } else if (v.submitted_at && !v.approved_at && v.version_status === 'submitted') {
          const days = (now - new Date(v.submitted_at).getTime()) / 86_400_000;
          buckets.push({ dept: d.originating_department_id, type: d.document_type, latencyDays: Math.round(days * 10) / 10, stuck: days > 14, title: d.title });
        }
      }
    }
    return buckets.sort((a, b) => b.latencyDays - a.latencyDays);
  }, [docs]);

  const avg = rows.length === 0 ? 0 : Math.round((rows.reduce((s, r) => s + r.latencyDays, 0) / rows.length) * 10) / 10;

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Approval Latency</h1>
        <p className="text-sm text-muted-foreground">
          Avg latency: <span className="font-mono">{avg} days</span> · stuck threshold &gt; 14 days.
        </p>
      </div>
      <Card><CardContent className="pt-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Document</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Latency (days)</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">No approval activity yet.</TableCell></TableRow>
            ) : rows.map((r, i) => (
              <TableRow key={`${r.title}-${i}`}>
                <TableCell>{r.title}</TableCell>
                <TableCell className="font-mono text-xs">{r.dept}</TableCell>
                <TableCell><Badge variant="outline">{r.type}</Badge></TableCell>
                <TableCell className="text-right font-mono">{r.latencyDays}</TableCell>
                <TableCell>{r.stuck ? <Badge variant="destructive">stuck</Badge> : <Badge variant="secondary">ok</Badge>}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}

export default ApprovalLatencyReport;
