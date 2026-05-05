/**
 * @file        CycleCountStatus.tsx
 * @sprint      T-Phase-1.2.6f-d-2-card7-7-pre-2 · Block C · D-387 (Q4=a)
 * @purpose     Thin read-only Store Hub panel surfacing SD-9 Inventory Hub Cycle Count data.
 *              ZERO duplication of SD-9 panels · ZERO modifications to SD-9 (institutional).
 * @decisions   D-387 · SD-9 (rich Inventory Hub ZERO TOUCH preserved) · D-298 Store Hub thin card
 */

import { useNavigate } from 'react-router-dom';
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ClipboardList, ExternalLink, AlertTriangle, CheckCircle2, FileText } from 'lucide-react';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useCycleCounts } from '@/hooks/useCycleCounts';
import type { CycleCount, CycleCountStatus } from '@/types/cycle-count';

const STATUS_VARIANT: Record<CycleCountStatus, 'default' | 'destructive' | 'outline' | 'secondary'> = {
  draft: 'outline', submitted: 'secondary', approved: 'secondary',
  rejected: 'destructive', posted: 'default', cancelled: 'destructive',
};

export function CycleCountStatusPanel(): JSX.Element {
  const navigate = useNavigate();
  const { entityCode } = useEntityCode();
  const { counts } = useCycleCounts(entityCode);

  const summary = useMemo(() => {
    const list = counts ?? [];
    const pending = list.filter(c => c.status === 'draft' || c.status === 'submitted' || c.status === 'approved');
    const posted = list.filter(c => c.status === 'posted');
    const totalVarianceValue = posted.reduce((sum, c) => sum + Math.abs(c.total_variance_value || 0), 0);
    const lastPosted = [...posted].sort((a, b) => (b.posted_at ?? '').localeCompare(a.posted_at ?? ''))[0];
    return { all: list, pending, posted, totalVarianceValue, lastPosted };
  }, [counts]);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-indigo-600" />Cycle Count Status
          </h1>
          <p className="text-sm text-muted-foreground">
            Read-only summary · physical stocktaking lives in Inventory Hub
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate('/erp/inventory-hub')}>
          <ExternalLink className="h-4 w-4 mr-1" />Manage in Inventory Hub
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1"><ClipboardList className="h-4 w-4 text-amber-600" /><span className="text-xs text-muted-foreground">Pending Counts</span></div>
            <div className="text-2xl font-bold">{summary.pending.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1"><AlertTriangle className="h-4 w-4 text-rose-600" /><span className="text-xs text-muted-foreground">Total Variance Value</span></div>
            <div className="text-2xl font-bold">₹ {summary.totalVarianceValue.toLocaleString('en-IN')}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1"><CheckCircle2 className="h-4 w-4 text-green-600" /><span className="text-xs text-muted-foreground">Last Count</span></div>
            <div className="text-sm font-medium">
              {summary.lastPosted?.posted_at ? new Date(summary.lastPosted.posted_at).toLocaleDateString('en-IN') : '—'}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Pending ({summary.pending.length})</CardTitle></CardHeader>
        <CardContent>
          {summary.pending.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <FileText className="w-12 h-12 mx-auto text-muted-foreground" />
              <h3 className="text-base font-semibold">No pending counts</h3>
              <p className="text-sm text-muted-foreground">All cycle counts are posted or cancelled.</p>
              <Button variant="outline" onClick={() => navigate('/erp/inventory-hub')}>
                <ExternalLink className="h-4 w-4 mr-1" />Open Inventory Hub
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Count No</TableHead><TableHead>Date</TableHead>
                <TableHead>Godown</TableHead><TableHead className="text-right">Lines</TableHead>
                <TableHead className="text-right">Variance</TableHead><TableHead>Status</TableHead>
              </TableRow></TableHeader>
              <TableBody>{summary.pending.map((c: CycleCount) => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono text-xs">{c.count_no}</TableCell>
                  <TableCell>{new Date(c.count_date).toLocaleDateString('en-IN')}</TableCell>
                  <TableCell>{c.godown_name ?? '—'}</TableCell>
                  <TableCell className="text-right">{c.total_lines}</TableCell>
                  <TableCell className="text-right">{c.variance_lines > 0 ? <Badge variant="destructive">{c.variance_lines}</Badge> : '0'}</TableCell>
                  <TableCell><Badge variant={STATUS_VARIANT[c.status]}>{c.status}</Badge></TableCell>
                </TableRow>
              ))}</TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
