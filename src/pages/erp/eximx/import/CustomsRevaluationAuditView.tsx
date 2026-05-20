/**
 * @file        src/pages/erp/eximx/import/CustomsRevaluationAuditView.tsx
 * @purpose     Read-only audit table · all customs revaluation events across MLGITs · Moat #15 surface
 * @sprint      T-Phase-1.EX-4-MultiLeg-GIT-3Bucket-4Method
 */
import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, ShieldCheck, AlertCircle } from 'lucide-react';
import { useEntityCode } from '@/hooks/useEntityCode';
import { loadMultiLegGITs } from '@/lib/multi-leg-git-engine';
import { SINHA_MULTI_LEG_GITS } from '@/data/sinha-multi-leg-git-seed-data';

export function CustomsRevaluationAuditView(): JSX.Element {
  const { entityCode } = useEntityCode();
  const [search, setSearch] = useState('');
  const mlgits = useMemo(
    () => (entityCode ? loadMultiLegGITs(entityCode) : SINHA_MULTI_LEG_GITS),
    [entityCode],
  );

  const allRevalEvents = mlgits.flatMap((m) =>
    m.reconciliation_events
      .filter((e) => e.event_type === 'customs_revaluation' || e.bucket === 'custom_revalued')
      .map((e) => ({ ...e, mlgit_no: m.mlgit_no, mlgit_id: m.id })),
  );
  const filtered = allRevalEvents.filter((e) =>
    e.mlgit_no.toLowerCase().includes(search.toLowerCase()) ||
    e.gazette_ref.toLowerCase().includes(search.toLowerCase()) ||
    e.user_id.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><ShieldCheck className="w-6 h-6" /> Customs Revaluation Audit</h1>
        <p className="text-sm text-muted-foreground">Moat #15 · all customs officer revaluation events · gazette refs · variance audit trail</p>
      </div>

      <Card className="border-l-4 border-l-primary">
        <CardContent className="p-3 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-primary mt-0.5" />
          <span>This view is read-only · revaluation events are captured at BoE filing (EX-6) but seeded for demo here. Each event is timestamped + signed by user + gazette-referenced.</span>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center justify-between">
            <span>Revaluation Events ({filtered.length})</span>
            <div className="relative max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search MLGIT · gazette · user..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>MLGIT</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Bucket</TableHead>
                <TableHead>Before (₹)</TableHead>
                <TableHead>After (₹)</TableHead>
                <TableHead>Variance %</TableHead>
                <TableHead>Gazette Ref</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-mono text-xs">{new Date(e.timestamp).toLocaleString()}</TableCell>
                  <TableCell className="font-mono text-xs">{e.mlgit_no}</TableCell>
                  <TableCell className="text-xs">{e.user_id}</TableCell>
                  <TableCell><Badge>{e.bucket}</Badge></TableCell>
                  <TableCell className="font-mono text-xs">₹{e.amount_before_inr.toFixed(0)}</TableCell>
                  <TableCell className="font-mono text-xs">₹{e.amount_after_inr.toFixed(0)}</TableCell>
                  <TableCell><Badge variant={e.variance_pct > 0 ? 'destructive' : e.variance_pct < 0 ? 'default' : 'outline'}>{e.variance_pct.toFixed(3)}%</Badge></TableCell>
                  <TableCell className="text-xs italic">{e.gazette_ref || '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
