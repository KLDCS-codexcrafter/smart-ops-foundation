/**
 * @file        src/pages/erp/docvault/registers/ExpiryReviewPage.tsx
 * @purpose     S143 · DocVault Control Pt 1 · expiry + review-date due lists, one-click lifecycle
 * @sprint      Sprint 143 · T-TaskFlow-A641.7 · Block 4
 */
import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { CalendarClock, Archive, ShieldCheck } from 'lucide-react';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import {
  evaluateExpiries, setLifecycleStatus,
  type ExpiryEvaluation,
} from '@/lib/docvault-control-engine';
import { getDocument } from '@/lib/docvault-engine';
import { TableChartToggle } from '@/components/operix-core/report-framework';
import { signReport, getKpi, defaultChartConfig } from '@/lib/report-framework';

export default function ExpiryReviewPage(): JSX.Element {
  const { entityCode } = useEntityCode();
  const user = useCurrentUser();
  const byUserId = user?.id ?? 'demo-user';
  const [evalResult, setEvalResult] = useState<ExpiryEvaluation>({ toExpire: [], reviewDue: [] });

  const refresh = useCallback(() => {
    setEvalResult(evaluateExpiries(entityCode));
  }, [entityCode]);

  useEffect(() => { refresh(); }, [refresh]);

  const onExpire = (docId: string): void => {
    try {
      setLifecycleStatus(entityCode, docId, 'expired', byUserId);
      toast.success('Marked expired');
      refresh();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed'); }
  };

  const titleFor = (docId: string): string => getDocument(entityCode, docId)?.title ?? docId;

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold">Expiry &amp; Review</h1>
        <p className="text-sm text-muted-foreground">
          Documents past their expiry or review date. Preview-only; no auto-execution.
        </p>
      </div>

      <Card className="glass-card rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarClock className="h-4 w-4" />Expired or past expiry
          </CardTitle>
        </CardHeader>
        <CardContent>
          {evalResult.toExpire.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No documents past expiry.</p>
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Title</TableHead><TableHead>Document ID</TableHead>
                <TableHead>Expiry date</TableHead><TableHead className="text-right">Action</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {evalResult.toExpire.map((r) => (
                  <TableRow key={r.documentId}>
                    <TableCell className="text-sm">{titleFor(r.documentId)}</TableCell>
                    <TableCell className="font-mono text-xs">{r.documentId}</TableCell>
                    <TableCell className="font-mono text-xs">{r.expiryDate}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => onExpire(r.documentId)}>
                        <Archive className="h-3.5 w-3.5 mr-1" />Mark expired
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="glass-card rounded-2xl">
        <CardHeader><CardTitle className="text-base">Review date due</CardTitle></CardHeader>
        <CardContent>
          {evalResult.reviewDue.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No documents due for review.</p>
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Title</TableHead><TableHead>Document ID</TableHead><TableHead>Review date</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {evalResult.reviewDue.map((r) => (
                  <TableRow key={r.documentId}>
                    <TableCell className="text-sm">{titleFor(r.documentId)}</TableCell>
                    <TableCell className="font-mono text-xs">{r.documentId}</TableCell>
                    <TableCell className="font-mono text-xs">{r.reviewDate}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {(() => {
        const buckets: Record<string, { expired: number; review: number }> = {
          '0-30': { expired: 0, review: 0 },
          '31-90': { expired: 0, review: 0 },
          '90+': { expired: 0, review: 0 },
        };
        const today = Date.now();
        const bucketFor = (iso: string): string => {
          const days = Math.floor((today - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
          if (days <= 30) return '0-30';
          if (days <= 90) return '31-90';
          return '90+';
        };
        for (const r of evalResult.toExpire) buckets[bucketFor(r.expiryDate)].expired += 1;
        for (const r of evalResult.reviewDue) buckets[bucketFor(r.reviewDate)].review += 1;
        const chartRows = Object.entries(buckets).map(([expiry_bucket, v]) => ({
          expiry_bucket, expired: v.expired, review: v.review,
        }));
        const cfg = getKpi('dv-expiry')?.defaultChart ?? defaultChartConfig({
          chartType: 'stacked-column', xKey: 'expiry_bucket',
          series: [{ key: 'expired', label: 'Expired' }, { key: 'review', label: 'Review Due' }],
          title: 'Expiry/review by bucket',
        });
        const hash = signReport(chartRows);
        const short = hash.replace('fnv1a:', '').slice(0, 10);
        return (
          <Card className="glass-card rounded-2xl p-3 space-y-2" data-testid="dv-expiry-toggle-host">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-[10px] font-mono" data-testid="dv-expiry-integrity-badge" title={hash}>
                <ShieldCheck className="h-3 w-3 mr-1" />{short}
              </Badge>
            </div>
            <TableChartToggle
              rows={chartRows}
              columns={[
                { key: 'expiry_bucket', label: 'Bucket' },
                { key: 'expired', label: 'Expired', align: 'right' },
                { key: 'review', label: 'Review Due', align: 'right' },
              ]}
              chartConfig={cfg}
              defaultView="table"
              emptyLabel="No documents past expiry or review"
            />
          </Card>
        );
      })()}
    </div>
  );
}
