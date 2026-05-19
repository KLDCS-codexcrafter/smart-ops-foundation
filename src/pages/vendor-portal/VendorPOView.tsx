/**
 * @file        src/pages/vendor-portal/VendorPOView.tsx
 * @purpose     Vendor's read-only view of POs received from buyer.
 * @sprint      T-Phase-1.A-c.2-VendorPortal-RFQ-Bid-PO-Flows
 * @decisions   D-272 · CONSUME ONLY po-management-engine · D-NEW-DX 3rd validation (field names empirically matched)
 * @reuses      po-management-engine.listPurchaseOrders
 */
import { useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import VendorPortalLayout from './VendorPortalLayout';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  ShoppingCart, Search, Clock, CheckCircle, XCircle, AlertCircle,
  ChevronRight, Calendar, Truck,
} from 'lucide-react';
import { getVendorSession } from '@/lib/vendor-portal-auth-engine';
import { listPurchaseOrders } from '@/lib/po-management-engine';

type FilterTab = 'pending' | 'approved' | 'completed' | 'all';

function classifyTab(status: string): FilterTab {
  const s = status.toLowerCase();
  if (s === 'draft' || s === 'pending_approval') return 'pending';
  if (s === 'approved' || s === 'sent_to_vendor') return 'approved';
  if (s === 'partially_received' || s === 'fully_received' || s === 'closed') return 'completed';
  return 'all';
}

function statusDisplay(status: string): { label: string; className: string; icon: typeof Clock } {
  const s = status.toLowerCase();
  if (s === 'draft') return { label: 'Draft', className: 'bg-slate-500/10 text-slate-700 border-slate-500/30', icon: Clock };
  if (s.includes('pending')) return { label: 'Pending Approval', className: 'bg-amber-500/10 text-amber-700 border-amber-500/30', icon: Clock };
  if (s === 'approved') return { label: 'Approved', className: 'bg-blue-500/10 text-blue-700 border-blue-500/30', icon: CheckCircle };
  if (s === 'sent_to_vendor') return { label: 'Sent', className: 'bg-blue-500/10 text-blue-700 border-blue-500/30', icon: Truck };
  if (s.includes('received') || s === 'closed') {
    return { label: status.replace(/_/g, ' '), className: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30', icon: CheckCircle };
  }
  if (s === 'cancelled') return { label: 'Cancelled', className: 'bg-red-500/10 text-red-700 border-red-500/30', icon: XCircle };
  return { label: status, className: 'bg-slate-500/10 text-slate-700 border-slate-500/30', icon: AlertCircle };
}

function formatINR(n: number): string {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n);
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN');
}

export default function VendorPOView(): JSX.Element {
  const session = getVendorSession();
  const [tab, setTab] = useState<FilterTab>('approved');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPoId, setSelectedPoId] = useState<string | null>(null);

  const allPos = useMemo(() => {
    if (!session) return [];
    return listPurchaseOrders(session.entity_code).filter(
      (po) => po.vendor_id === session.vendor_id
    );
  }, [session]);

  const filtered = useMemo(() => {
    const byTab = tab === 'all' ? allPos : allPos.filter((po) => classifyTab(po.status) === tab);
    if (!searchQuery) return byTab;
    const q = searchQuery.toLowerCase();
    return byTab.filter((po) => po.po_no.toLowerCase().includes(q));
  }, [allPos, tab, searchQuery]);

  const selectedPo = useMemo(
    () => filtered.find((po) => po.id === selectedPoId) ?? null,
    [filtered, selectedPoId]
  );

  const counts = useMemo(() => ({
    pending: allPos.filter((po) => classifyTab(po.status) === 'pending').length,
    approved: allPos.filter((po) => classifyTab(po.status) === 'approved').length,
    completed: allPos.filter((po) => classifyTab(po.status) === 'completed').length,
    all: allPos.length,
  }), [allPos]);

  if (!session) return <Navigate to="/vendor-portal/login" replace />;

  return (
    <VendorPortalLayout>
      <div className="space-y-6 max-w-6xl">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShoppingCart className="h-6 w-6 text-primary" />
            Purchase Orders
          </h1>
          <p className="text-sm text-muted-foreground">
            POs received from buyer · status tracking · acknowledgment + delivery confirm coming Phase 2
          </p>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search PO number"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>

        <Tabs value={tab} onValueChange={(v) => { setTab(v as FilterTab); setSelectedPoId(null); }}>
          <TabsList>
            <TabsTrigger value="pending">Pending <span className="ml-1 opacity-70">({counts.pending})</span></TabsTrigger>
            <TabsTrigger value="approved">Active <span className="ml-1 opacity-70">({counts.approved})</span></TabsTrigger>
            <TabsTrigger value="completed">Completed <span className="ml-1 opacity-70">({counts.completed})</span></TabsTrigger>
            <TabsTrigger value="all">All <span className="ml-1 opacity-70">({counts.all})</span></TabsTrigger>
          </TabsList>

          <TabsContent value={tab} className="space-y-4 mt-4">
            <Card>
              <CardContent className="p-0">
                {filtered.length === 0 ? (
                  <div className="text-center py-12 text-sm text-muted-foreground">
                    {allPos.length === 0 ? 'No POs received yet' : 'No POs match this filter'}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-8"></TableHead>
                        <TableHead>PO No</TableHead>
                        <TableHead>PO Date</TableHead>
                        <TableHead>Delivery By</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Total (₹)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((po) => {
                        const status = statusDisplay(po.status);
                        const StatusIcon = status.icon;
                        const isSelected = selectedPoId === po.id;
                        return (
                          <TableRow
                            key={po.id}
                            className={`cursor-pointer ${isSelected ? 'bg-slate-500/10' : ''}`}
                            onClick={() => setSelectedPoId(isSelected ? null : po.id)}
                          >
                            <TableCell>
                              <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${isSelected ? 'rotate-90' : ''}`} />
                            </TableCell>
                            <TableCell className="font-mono font-medium text-sm">{po.po_no}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{formatDate(po.po_date)}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{formatDate(po.expected_delivery_date)}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={`text-[9px] gap-1 ${status.className}`}>
                                <StatusIcon className="h-3 w-3" /> {status.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-mono font-bold">₹{formatINR(po.total_after_tax)}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {selectedPo && (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">PO Detail · {selectedPo.po_no}</CardTitle>
                      <CardDescription>
                        Delivery: {formatDate(selectedPo.expected_delivery_date)} · {selectedPo.lines.length} line(s)
                      </CardDescription>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => setSelectedPoId(null)}>Close</Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-3 gap-3 text-sm">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">PO Date</p>
                      <p className="font-mono">{formatDate(selectedPo.po_date)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Delivery Date</p>
                      <p className="font-mono">{formatDate(selectedPo.expected_delivery_date)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Delivery Address</p>
                      <p className="text-xs">{selectedPo.delivery_address || '—'}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-2">Line Items</p>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item</TableHead>
                          <TableHead className="text-right">Qty</TableHead>
                          <TableHead className="text-right">Rate ₹</TableHead>
                          <TableHead className="text-right">Total ₹</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedPo.lines.map((line) => (
                          <TableRow key={line.id}>
                            <TableCell className="text-sm">{line.item_name}</TableCell>
                            <TableCell className="text-right font-mono">{line.qty}</TableCell>
                            <TableCell className="text-right font-mono">₹{formatINR(line.rate)}</TableCell>
                            <TableCell className="text-right font-mono font-bold">₹{formatINR(line.amount_after_tax)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="pt-3 border-t flex justify-between text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      Approved: <span className="font-mono">{formatDate(selectedPo.approved_at)}</span>
                    </div>
                    <div className="space-y-0.5 text-right font-mono">
                      <div className="text-xs text-muted-foreground">Basic: ₹{formatINR(selectedPo.total_basic_value)}</div>
                      <div className="text-xs text-muted-foreground">Tax: ₹{formatINR(selectedPo.total_tax_value)}</div>
                      <div className="text-base font-bold">Total: ₹{formatINR(selectedPo.total_after_tax)}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </VendorPortalLayout>
  );
}
