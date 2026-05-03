/**
 * panels.tsx — SupplyX internal procurement dashboard
 * Sprint T-Phase-1.2.6f-b-2-fix-2 · Block O · D-282
 *
 * READ-ONLY mirror of Procure360 internal view.
 * Drill-through actions navigate to /erp/procure-hub.
 * @[JWT] GET /api/procure360/rfqs · /api/procure360/vendor-quotations
 */
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Send, FileText, Award, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEntityCode } from '@/hooks/useEntityCode';
import { listRfqs } from '@/lib/rfq-engine';
import { listQuotations } from '@/lib/vendor-quotation-engine';
import type { SupplyXModule } from './SupplyXSidebar.types';

const inr = (n: number): string => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch { return iso; }
}

interface NavProps { onNavigate?: (m: SupplyXModule) => void }

export function SupplyXWelcome({ onNavigate }: NavProps): JSX.Element {
  const { entityCode } = useEntityCode();
  const rfqs = listRfqs(entityCode);
  const quotations = listQuotations(entityCode);

  const kpis = useMemo(() => ({
    openRfqs: rfqs.filter(r => ['sent', 'opened', 'received_by_vendor'].includes(r.status)).length,
    pendingQuotations: quotations.filter(q => !q.is_awarded).length,
    pendingAwards: quotations.filter(q => !q.is_awarded && q.status === 'submitted').length,
  }), [rfqs, quotations]);

  const tile = (label: string, value: number, target: SupplyXModule, Icon: typeof Send): JSX.Element => (
    <Card className="cursor-pointer hover:bg-accent/30 transition" onClick={() => onNavigate?.(target)}>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-3xl font-bold font-mono">{value}</p>
          </div>
          <Icon className="h-6 w-6 text-muted-foreground" />
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">SupplyX · Internal Procurement</h1>
        <p className="text-sm text-muted-foreground">
          Read-only operational view. Use Procure360 to act on items.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {tile('Open RFQs', kpis.openRfqs, 'open-rfqs', Send)}
        {tile('Pending Quotations', kpis.pendingQuotations, 'pending-quotations', FileText)}
        {tile('Pending Awards', kpis.pendingAwards, 'pending-awards', Award)}
      </div>
    </div>
  );
}

function DrillButton({ label = 'Open in Procure360' }: { label?: string }): JSX.Element {
  const navigate = useNavigate();
  return (
    <Button size="sm" variant="ghost" onClick={() => navigate('/erp/procure-hub')}>
      <ExternalLink className="h-3 w-3 mr-1" />
      {label}
    </Button>
  );
}

function EmptyRow({ cols, label }: { cols: number; label: string }): JSX.Element {
  return (
    <TableRow>
      <TableCell colSpan={cols} className="text-center text-sm text-muted-foreground py-8">
        {label}
      </TableCell>
    </TableRow>
  );
}

export function OpenRfqsPanel(): JSX.Element {
  const { entityCode } = useEntityCode();
  const rows = listRfqs(entityCode).filter(r =>
    ['sent', 'opened', 'received_by_vendor'].includes(r.status)
  );
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Open RFQs</h1>
        <DrillButton />
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Active RFQs awaiting vendor response</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>RFQ No</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Sent</TableHead>
                <TableHead>Timeout</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <EmptyRow cols={6} label="No open RFQs." />
              ) : rows.map(r => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono">{r.rfq_no}</TableCell>
                  <TableCell>{r.vendor_name}</TableCell>
                  <TableCell><Badge variant="outline">{r.primary_channel}</Badge></TableCell>
                  <TableCell><Badge variant="secondary">{r.status}</Badge></TableCell>
                  <TableCell>{fmtDate(r.sent_at)}</TableCell>
                  <TableCell>{fmtDate(r.timeout_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export function PendingQuotationsPanel(): JSX.Element {
  const { entityCode } = useEntityCode();
  const rows = listQuotations(entityCode).filter(q => !q.is_awarded);
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Pending Quotations</h1>
        <DrillButton label="Compare in Procure360" />
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Quotations not yet awarded</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quotation No</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Lines</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <EmptyRow cols={6} label="No pending quotations." />
              ) : rows.map(q => (
                <TableRow key={q.id}>
                  <TableCell className="font-mono">{q.quotation_no}</TableCell>
                  <TableCell>{q.vendor_name}</TableCell>
                  <TableCell>{fmtDate(q.submitted_at)}</TableCell>
                  <TableCell>{q.lines.length}</TableCell>
                  <TableCell className="font-mono text-right">{inr(q.total_after_tax)}</TableCell>
                  <TableCell><Badge variant="secondary">{q.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export function PendingAwardsPanel(): JSX.Element {
  const { entityCode } = useEntityCode();
  const rows = listQuotations(entityCode).filter(q => !q.is_awarded && q.status === 'submitted');
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Pending Awards</h1>
        <DrillButton label="Award in Procure360" />
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Submitted quotations awaiting award decision</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quotation No</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Enquiry</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Submitted</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <EmptyRow cols={5} label="No quotations awaiting award." />
              ) : rows.map(q => (
                <TableRow key={q.id}>
                  <TableCell className="font-mono">{q.quotation_no}</TableCell>
                  <TableCell>{q.vendor_name}</TableCell>
                  <TableCell className="font-mono text-xs">{q.parent_enquiry_id}</TableCell>
                  <TableCell className="font-mono text-right">{inr(q.total_after_tax)}</TableCell>
                  <TableCell>{fmtDate(q.submitted_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
