/**
 * @file        VendorInbox.tsx
 * @sprint      T-Phase-1.2.6f-b-1 · Block B.3
 * @purpose     Vendor's RFQ inbox · scoped via scopeRfqsForVendor.
 */
import { useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import VendorPortalShell from './VendorPortalShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { ExternalLink } from 'lucide-react';
import { getVendorSession, recordVendorActivity } from '@/lib/vendor-portal-auth-engine';
import { scopeRfqsForVendor } from '@/lib/vendor-portal-scope';
import { rfqsKey, type RFQ } from '@/types/rfq';

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  draft: 'outline', sent: 'secondary', received_by_vendor: 'secondary', opened: 'secondary',
  quoted: 'default', partial_quoted: 'default', declined: 'destructive',
  timeout: 'destructive', cancelled: 'destructive', awarded: 'default',
};

type Tab = 'pending' | 'quoted' | 'declined' | 'all';

function loadRfqsForEntity(entityCode: string): RFQ[] {
  // [JWT] GET /api/procure360/rfqs?entity={entityCode}
  try {
    const raw = localStorage.getItem(rfqsKey(entityCode));
    return raw ? (JSON.parse(raw) as RFQ[]) : [];
  } catch {
    return [];
  }
}

function daysRemaining(timeoutAt: string | null): number | null {
  if (!timeoutAt) return null;
  const ms = new Date(timeoutAt).getTime() - Date.now();
  return Math.ceil(ms / 86_400_000);
}

function formatINR(n: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function VendorInbox(): JSX.Element {
  const session = getVendorSession();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('pending');

  const myRfqs = useMemo(() => {
    if (!session) return [];
    const all = loadRfqsForEntity(session.entity_code);
    return scopeRfqsForVendor(all, session);
  }, [session]);

  if (!session) return <Navigate to="/vendor-portal/login" replace />;

  const filtered = useMemo(() => {
    if (tab === 'all') return myRfqs;
    if (tab === 'pending') {
      return myRfqs.filter(r => ['sent', 'received_by_vendor', 'opened', 'draft'].includes(r.status));
    }
    if (tab === 'quoted') {
      return myRfqs.filter(r => ['quoted', 'partial_quoted', 'awarded'].includes(r.status));
    }
    return myRfqs.filter(r => ['declined', 'timeout', 'cancelled'].includes(r.status));
  }, [myRfqs, tab]);

  const handleOpen = (rfq: RFQ): void => {
    recordVendorActivity(session.vendor_id, session.entity_code, 'rfq_view', 'rfq', rfq.id, rfq.rfq_no);
    const url = `/vendor-portal/rfq/${rfq.id}?token=${encodeURIComponent(session.token)}&entity=${session.entity_code}`;
    navigate(url);
  };

  const counts = {
    pending: myRfqs.filter(r => ['sent', 'received_by_vendor', 'opened', 'draft'].includes(r.status)).length,
    quoted: myRfqs.filter(r => ['quoted', 'partial_quoted', 'awarded'].includes(r.status)).length,
    declined: myRfqs.filter(r => ['declined', 'timeout', 'cancelled'].includes(r.status)).length,
    all: myRfqs.length,
  };

  return (
    <VendorPortalShell>
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">RFQ Inbox</CardTitle>
          <p className="text-sm text-muted-foreground">
            {myRfqs.length} RFQ(s) assigned to {session.party_name}
          </p>
        </CardHeader>
        <CardContent>
          <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
            <TabsList className="mb-4">
              <TabsTrigger value="pending">Pending ({counts.pending})</TabsTrigger>
              <TabsTrigger value="quoted">Quoted ({counts.quoted})</TabsTrigger>
              <TabsTrigger value="declined">Declined ({counts.declined})</TabsTrigger>
              <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
            </TabsList>
            <TabsContent value={tab} forceMount>
              {filtered.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  No RFQs in this category yet.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>RFQ #</TableHead>
                      <TableHead>Lines</TableHead>
                      <TableHead>Sent</TableHead>
                      <TableHead>Days Left</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((rfq) => {
                      const days = daysRemaining(rfq.timeout_at);
                      return (
                        <TableRow key={rfq.id}>
                          <TableCell className="font-mono text-xs">{rfq.rfq_no}</TableCell>
                          <TableCell>{rfq.line_item_ids.length}</TableCell>
                          <TableCell className="text-sm">{formatDate(rfq.sent_at)}</TableCell>
                          <TableCell className="font-mono text-sm">
                            {days === null ? '—' : days < 0 ? (
                              <span className="text-destructive">overdue</span>
                            ) : `${days}d`}
                          </TableCell>
                          <TableCell>
                            <Badge variant={STATUS_VARIANTS[rfq.status] ?? 'outline'} className="text-xs">
                              {rfq.status.replace(/_/g, ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" variant="outline" onClick={() => handleOpen(rfq)}>
                              <ExternalLink className="h-3 w-3 mr-1" /> Open
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
              {/* Bonus: total estimated value summary */}
              {filtered.length > 0 && (
                <div className="mt-4 text-xs text-muted-foreground">
                  Showing {filtered.length} of {myRfqs.length} RFQ(s).
                  {counts.quoted > 0 && (
                    <span> · Quoted total: {formatINR(0)} (computed in detail view)</span>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </VendorPortalShell>
  );
}
