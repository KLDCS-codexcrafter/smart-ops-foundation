/**
 * @file     ProductionPlanRegister.tsx
 * @sprint   T-Phase-1.3-3a-pre-2.5-fix-1 · Block 2 (Block F deferred)
 * @purpose  Production Plan list view · filters by status/plan_type · fulfillment heatmap.
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { ExternalLink, ClipboardList } from 'lucide-react';
import { useProductionPlans } from '@/hooks/useProductionPlans';
import type { ProductionPlanStatus, ProductionPlanType } from '@/types/production-plan';

export function ProductionPlanRegisterPanel(): JSX.Element {
  const navigate = useNavigate();
  const { plans } = useProductionPlans();

  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProductionPlanStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<ProductionPlanType | 'all'>('all');

  const filtered = useMemo(() => {
    return plans.filter(p => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (typeFilter !== 'all' && p.plan_type !== typeFilter) return false;
      if (searchText) {
        const q = searchText.toLowerCase();
        if (!p.doc_no.toLowerCase().includes(q) && !(p.notes ?? '').toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [plans, statusFilter, typeFilter, searchText]);

  const fulfillmentBadge = (pct: number): JSX.Element => {
    if (pct >= 80) return <Badge className="bg-success/15 text-success border-success/30">{pct.toFixed(0)}%</Badge>;
    if (pct >= 50) return <Badge className="bg-warning/15 text-warning border-warning/30">{pct.toFixed(0)}%</Badge>;
    return <Badge className="bg-destructive/15 text-destructive border-destructive/30">{pct.toFixed(0)}%</Badge>;
  };

  return (
    <div className="p-6 space-y-4">
      <button
        type="button"
        onClick={() => navigate('/erp/command-center?module=finecore-production-config')}
        className="w-full text-left rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground hover:bg-muted/60 transition-colors flex items-center justify-between gap-2 cursor-pointer"
      >
        <span>
          ⓘ Plan settings live in{' '}
          <span className="font-medium">Command Center → Compliance Settings → Production Configuration</span>.
        </span>
        <ExternalLink className="h-3 w-3" />
      </button>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Production Plan Register
            </CardTitle>
            <Badge variant="outline">{filtered.length} of {plans.length}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <Input
              placeholder="Search by doc no / notes..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as ProductionPlanStatus | 'all')}>
              <SelectTrigger><SelectValue placeholder="All statuses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="in_execution">In Execution</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as ProductionPlanType | 'all')}>
              <SelectTrigger><SelectValue placeholder="All types" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="standalone">Standalone</SelectItem>
                <SelectItem value="sales_plan">Sales Plan</SelectItem>
                <SelectItem value="sales_order">Sales Order</SelectItem>
                <SelectItem value="project_milestone">Project Milestone</SelectItem>
                <SelectItem value="job_work_out">Job Work Out</SelectItem>
                <SelectItem value="reorder_replenishment">Reorder</SelectItem>
                <SelectItem value="campaign_batch">Campaign Batch</SelectItem>
                <SelectItem value="master_production_schedule">MPS</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Doc No</TableHead>
                <TableHead>Plan Type</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Lines</TableHead>
                <TableHead>Linked POs</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Fulfillment</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-6">
                    No plans match the filters.
                  </TableCell>
                </TableRow>
              )}
              {filtered.map(p => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-sm">{p.doc_no}</TableCell>
                  <TableCell><Badge variant="outline">{p.plan_type.replace(/_/g, ' ')}</Badge></TableCell>
                  <TableCell className="text-xs font-mono">
                    {p.plan_period_start} → {p.plan_period_end}
                  </TableCell>
                  <TableCell>{p.lines.length}</TableCell>
                  <TableCell>{p.linked_production_order_ids.length}</TableCell>
                  <TableCell><Badge variant="outline">{p.status}</Badge></TableCell>
                  <TableCell>{fulfillmentBadge(p.fulfillment_pct)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export default ProductionPlanRegisterPanel;
