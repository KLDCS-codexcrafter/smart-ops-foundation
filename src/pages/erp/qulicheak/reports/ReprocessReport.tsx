/**
 * @file src/pages/erp/qulicheak/reports/ReprocessReport.tsx
 * @purpose Trident C20 · NCR↔Rework JobCard cross-card traceability (ISO 9001:2015 Clause 8.7).
 * @who QA Manager · Production Controller (NCR↔Rework cross-card traceability)
 * @when 2026-05-09
 * @sprint T-Phase-1.A.5.d-1-Trident-Reports-Reprocess-Bridge · Block F
 * @iso ISO 9001:2015 Clause 8.7 (control of nonconforming output) · Trident TDL ReprocessRep.txt
 * @whom Audit Owner
 * @decisions Q-LOCK-4 Path B · D-NEW-CF · D-NEW-BW
 * @disciplines FR-30 · FR-50 · FR-19
 * @reuses listNcrs · findReworkJobCardsForNcr (qulicheak-bridges · Q-LOCK-4 Path B)
 * @[JWT] reads erp_ncr_${entityCode} · erp_job_cards_${entityCode}
 */
import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useEntityChangeEffect } from '@/hooks/useEntityChangeEffect';
import { listNcrs } from '@/lib/ncr-engine';
import { findReworkJobCardsForNcr, type ReworkJobCardMatch } from '@/lib/qulicheak-bridges';

export function ReprocessReport(): JSX.Element {
  const { entityCode } = useEntityCode();
  const [version, setVersion] = useState(0);
  useEntityChangeEffect(() => setVersion((v) => v + 1), []);
  useEffect(() => {
    const onFocus = (): void => setVersion((v) => v + 1);
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  const ncrs = useMemo(() => {
    void version;
    return listNcrs(entityCode).filter((n) => n.outcome === 'rework');
  }, [entityCode, version]);

  // D-NEW-BW · per-NCR rework JC lookup once
  const matchesByNcr = useMemo<Map<string, ReworkJobCardMatch[]>>(() => {
    const map = new Map<string, ReworkJobCardMatch[]>();
    for (const n of ncrs) {
      const m = findReworkJobCardsForNcr(entityCode, n.id);
      if (m.length > 0) map.set(n.id, m);
    }
    return map;
  }, [ncrs, entityCode]);

  const linkedCount = matchesByNcr.size;

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reprocess Report</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {ncrs.length} NCR rework outcomes · {linkedCount} with linked JobCards · Entity {entityCode}
        </p>
      </div>
      <Card><CardContent className="p-0">
        {ncrs.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            No rework JobCards linked to NCRs yet · D-NEW-CF source_ncr_id requires Production-side back-fill which activates from this sprint forward.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-mono">NCR</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Rework JobCards</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ncrs.map((n) => {
                const matches = matchesByNcr.get(n.id) ?? [];
                return (
                  <TableRow key={n.id}>
                    <TableCell className="font-mono text-xs">{n.id}</TableCell>
                    <TableCell><Badge variant="outline">{n.severity}</Badge></TableCell>
                    <TableCell className="text-xs">{n.item_name ?? '—'}</TableCell>
                    <TableCell className="text-xs font-mono">{n.raised_at.slice(0, 10)}</TableCell>
                    <TableCell className="text-xs">
                      {matches.length === 0 ? (
                        <span className="text-muted-foreground">— (no source_ncr_id linkage)</span>
                      ) : (
                        <div className="space-y-1">
                          {matches.map((m) => (
                            <div key={m.id} className="font-mono">
                              {m.job_card_no} · {m.rework_qty} · {m.status}
                            </div>
                          ))}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent></Card>
    </div>
  );
}
