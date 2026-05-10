/**
 * @file        src/pages/erp/docvault/reports/VersionVelocityReport.tsx
 * @purpose     Versions added per period · trend · top contributors · supersession rate
 * @who         Document Controller · Engineering Manager
 * @when        2026-05-09
 * @sprint      T-Phase-1.A.9 BUNDLED · Q-LOCK-5a + Block A.7
 * @iso         ISO 9001:2015 §7.5 · ISO 25010 Maintainability
 * @whom        Audit Owner
 * @decisions   D-NEW-CJ canonical · D-NEW-BV Phase 1 mock
 * @disciplines FR-30
 * @reuses      docvault-engine.loadDocuments
 * @[JWT]       Phase 2 reporting endpoint
 */
import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useEntityCode } from '@/hooks/useEntityCode';
import { loadDocuments } from '@/lib/docvault-engine';

export function VersionVelocityReport(): JSX.Element {
  const { entityCode } = useEntityCode();
  const docs = loadDocuments(entityCode);

  const { byMonth, contributors, supersessionRate } = useMemo(() => {
    const months = new Map<string, number>();
    const ppl = new Map<string, number>();
    let total = 0;
    let superseded = 0;
    for (const d of docs) {
      for (const v of d.versions) {
        total += 1;
        if (v.version_status === 'superseded') superseded += 1;
        const m = v.uploaded_at.slice(0, 7);
        months.set(m, (months.get(m) ?? 0) + 1);
        ppl.set(v.uploaded_by, (ppl.get(v.uploaded_by) ?? 0) + 1);
      }
    }
    return {
      byMonth: Array.from(months.entries()).sort((a, b) => a[0].localeCompare(b[0])),
      contributors: Array.from(ppl.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10),
      supersessionRate: total === 0 ? 0 : Math.round((superseded / total) * 1000) / 10,
    };
  }, [docs]);

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Version Velocity</h1>
        <p className="text-sm text-muted-foreground">
          Supersession rate: <span className="font-mono">{supersessionRate}%</span>
        </p>
      </div>
      <Card><CardContent className="pt-6">
        <h3 className="font-semibold mb-3">Versions per Month</h3>
        <Table>
          <TableHeader><TableRow><TableHead>Month</TableHead><TableHead className="text-right">Count</TableHead></TableRow></TableHeader>
          <TableBody>
            {byMonth.length === 0 ? (
              <TableRow><TableCell colSpan={2} className="text-center text-sm text-muted-foreground py-6">No versions yet.</TableCell></TableRow>
            ) : byMonth.map(([m, c]) => (
              <TableRow key={m}><TableCell className="font-mono">{m}</TableCell><TableCell className="text-right font-mono">{c}</TableCell></TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>
      <Card><CardContent className="pt-6">
        <h3 className="font-semibold mb-3">Top Contributors</h3>
        <Table>
          <TableHeader><TableRow><TableHead>User</TableHead><TableHead className="text-right">Versions</TableHead></TableRow></TableHeader>
          <TableBody>
            {contributors.length === 0 ? (
              <TableRow><TableCell colSpan={2} className="text-center text-sm text-muted-foreground py-6">No contributors yet.</TableCell></TableRow>
            ) : contributors.map(([u, c]) => (
              <TableRow key={u}><TableCell className="font-mono">{u}</TableCell><TableCell className="text-right font-mono">{c}</TableCell></TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}

export default VersionVelocityReport;
