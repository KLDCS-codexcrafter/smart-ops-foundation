/**
 * @file        src/pages/erp/comply360/tds/TdsNoticePage.tsx
 * @purpose     Comply360 · TDS notice / demand tracking surface
 * @sprint      Sprint 74b · T-Phase-5.A.1.6-PASS-B · Block 7 · DP-S74-1
 * @disciplines FR-7 · FR-13 · FR-19 · FR-58 · FR-91 · FR-104 RECG
 */
import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, BadgeCheck, RefreshCcw, PlusCircle } from 'lucide-react';
import { toast } from 'sonner';
import {
  loadNotices,
  recordNotice,
  trackResolution,
  computeNoticeResponse,
  summarizeNotices,
  type TDSNotice,
} from '@/lib/comply360-tds-notice-engine';
import { useEntityCode } from '@/hooks/useEntityCode';

function inr(n: number): string {
  return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

function seedDemo(entityCode: string): void {
  const existing = loadNotices(entityCode);
  if (existing.length > 0) return;
  const today = new Date().toISOString().slice(0, 10);
  const due = new Date(Date.now() + 14 * 86_400_000).toISOString().slice(0, 10);
  recordNotice({
    id: `demo-${entityCode}-1`, entity_code: entityCode, fy: 'FY25-26',
    notice_type: 'short_deduction', notice_no: 'TDS/2026/0001', notice_date: today,
    section: '194Q', quarter: 'Q4', party_id: 'P-001', party_name: 'Acme Traders',
    tds_amount: 12000, interest_amount: 1500, late_fee_amount: 200,
    demand_amount: 13700, due_date: due, status: 'open', paid_amount: 0,
  });
}

export default function TdsNoticePage(): JSX.Element {
  const { entityCode, entityId } = useEntityCode();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (entityCode) seedDemo(entityCode);
  }, [entityCode]);

  const notices = useMemo<TDSNotice[]>(() => {
    if (!entityCode) return [];
    return loadNotices(entityCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityCode, tick]);

  const summary = useMemo(() => entityCode ? summarizeNotices(entityCode) : { total: 0, open: 0, outstanding_demand: 0, overdue: 0 }, [entityCode, tick]);

  if (!entityId || entityId === 'all') {
    return (
      <div className="p-6">
        <Card className="p-12 text-center">
          <BadgeCheck className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-lg font-semibold mb-2">Select a company to continue</h2>
          <p className="text-muted-foreground">Choose an entity from the header dropdown to view TDS notices.</p>
        </Card>
      </div>
    );
  }

  const markPaid = (n: TDSNotice): void => {
    trackResolution(entityCode, n.id, 'paid', { paid_amount: n.demand_amount, resolution_ref: `CHALLAN-${Date.now()}` });
    setTick((t) => t + 1);
    toast.success(`Notice ${n.notice_no} marked paid`);
  };

  const addStub = (): void => {
    const today = new Date().toISOString().slice(0, 10);
    const due = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);
    recordNotice({
      id: `n-${Date.now()}`, entity_code: entityCode, fy: 'FY25-26',
      notice_type: 'late_fee_234e', notice_no: `TDS/2026/${String(notices.length + 1).padStart(4, '0')}`,
      notice_date: today, tds_amount: 0, interest_amount: 0, late_fee_amount: 5000,
      demand_amount: 5000, due_date: due, status: 'open', paid_amount: 0,
    });
    setTick((t) => t + 1);
    toast.success('Notice recorded');
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold">TDS Notices &amp; Demand Tracker</h1>
          <p className="text-muted-foreground text-sm">Short-deduction · 234E late fees · 201(1A) interest · default notices</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={addStub}>
            <PlusCircle className="h-4 w-4 mr-1" /> Record Notice
          </Button>
          <Button variant="outline" size="sm" onClick={() => setTick((t) => t + 1)}>
            <RefreshCcw className="h-4 w-4 mr-1" /> Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground uppercase">Total Notices</div>
          <div className="text-xl font-mono font-semibold mt-1">{summary.total}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground uppercase">Open</div>
          <div className="text-xl font-mono font-semibold mt-1">{summary.open}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground uppercase">Outstanding</div>
          <div className="text-xl font-mono font-semibold mt-1 text-amber-500">{inr(summary.outstanding_demand)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground uppercase">Overdue</div>
          <div className="mt-2">
            {summary.overdue > 0
              ? <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />{summary.overdue}</Badge>
              : <Badge className="bg-emerald-600 hover:bg-emerald-700">None</Badge>}
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <h2 className="text-sm font-semibold uppercase text-muted-foreground mb-3">Notices</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Notice #</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Due</TableHead>
              <TableHead className="text-right">Demand</TableHead>
              <TableHead className="text-right">Outstanding</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Recommended</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {notices.length === 0 && (
              <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">No notices recorded</TableCell></TableRow>
            )}
            {notices.map((n) => {
              const resp = computeNoticeResponse(n);
              return (
                <TableRow key={n.id}>
                  <TableCell className="font-mono text-xs">{n.notice_no}</TableCell>
                  <TableCell><Badge variant="outline">{n.notice_type}</Badge></TableCell>
                  <TableCell className="font-mono text-xs">{n.notice_date}</TableCell>
                  <TableCell className="font-mono text-xs">{n.due_date}</TableCell>
                  <TableCell className="text-right font-mono">{inr(n.demand_amount)}</TableCell>
                  <TableCell className="text-right font-mono text-amber-500">{inr(resp.outstanding)}</TableCell>
                  <TableCell><Badge variant={n.status === 'paid' || n.status === 'closed' ? 'secondary' : 'default'}>{n.status}</Badge></TableCell>
                  <TableCell className="text-xs">{resp.recommended_action}</TableCell>
                  <TableCell className="text-right">
                    {n.status !== 'paid' && n.status !== 'closed' && (
                      <Button size="sm" variant="ghost" onClick={() => markPaid(n)}>Mark Paid</Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
