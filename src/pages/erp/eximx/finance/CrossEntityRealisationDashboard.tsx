/**
 * @file        src/pages/erp/eximx/finance/CrossEntityRealisationDashboard.tsx
 * @purpose     D-NEW-FA · Cross-entity Realisation aggregation dashboard
 * @sprint      T-Phase-2.B-2-EximX-MediumDNEWs · Block A · Q-LOCK-6(a)
 */
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Globe, AlertTriangle } from 'lucide-react';
import { useEntityList } from '@/hooks/useEntityList';
import {
  aggregateRealisationsAcrossEntities,
  type CrossEntityRealisationReport,
} from '@/lib/realisation-aggregation-engine';
import type { FEMAState } from '@/types/export-realisation';

const FEMA_VARIANT: Record<FEMAState, 'default' | 'secondary' | 'destructive'> = {
  safe: 'secondary',
  attention: 'secondary',
  warning: 'default',
  critical: 'destructive',
  overdue: 'destructive',
};

export default function CrossEntityRealisationDashboard(): JSX.Element {
  const { entities } = useEntityList();
  const report: CrossEntityRealisationReport = useMemo(
    () => aggregateRealisationsAcrossEntities(entities),
    [entities],
  );

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center gap-2">
        <Globe className="w-5 h-5 text-primary" />
        <h1 className="text-2xl font-semibold">Cross-Entity Realisation · D-NEW-FA</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Entities aggregated</CardTitle></CardHeader>
          <CardContent className="pt-0">
            <p className="text-2xl font-semibold">{report.entities_aggregated}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Realisations total</CardTitle></CardHeader>
          <CardContent className="pt-0">
            <p className="text-2xl font-semibold">{report.total_realisations_across_entities}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Pending across entities</CardTitle></CardHeader>
          <CardContent className="pt-0">
            <p className="text-2xl font-semibold">₹ {report.total_pending_inr_across_entities.toLocaleString('en-IN')}</p>
          </CardContent>
        </Card>
        <Card className={report.critical_fema_count_across_entities > 0 ? 'border-l-4 border-l-destructive' : ''}>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-1"><AlertTriangle className="w-3 h-3" />FEMA critical</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-2xl font-semibold">{report.critical_fema_count_across_entities}</p>
            <Badge variant={FEMA_VARIANT[report.worst_fema_state_across_entities]} className="mt-1">
              Worst: {report.worst_fema_state_across_entities}
            </Badge>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Per-entity breakdown</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Entity</TableHead>
                <TableHead className="text-right">Realisations</TableHead>
                <TableHead className="text-right">Pending</TableHead>
                <TableHead className="text-right">Realised</TableHead>
                <TableHead className="text-right">Pending ₹</TableHead>
                <TableHead>Worst FEMA</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.per_entity.map((s) => (
                <TableRow key={s.entity_id}>
                  <TableCell className="font-mono text-xs">{s.entity_short_code}</TableCell>
                  <TableCell className="text-right">{s.total_realisations}</TableCell>
                  <TableCell className="text-right">{s.pending_count}</TableCell>
                  <TableCell className="text-right">{s.fully_realised_count}</TableCell>
                  <TableCell className="text-right">₹ {s.total_pending_inr.toLocaleString('en-IN')}</TableCell>
                  <TableCell>
                    <Badge variant={FEMA_VARIANT[s.worst_fema_state]}>{s.worst_fema_state}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
