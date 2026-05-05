/**
 * StockHoldReport.tsx — Card #6 Inward Logistic
 * Sprint T-Phase-1.2.6f-d-2-card6-6-pre-2 · Block C · D-362
 * MODULE ID: dh-i-stock-hold-report
 *
 * Read-only report joining InwardReceipt quarantine lines + Card #5 QA pending status.
 * Concern 4 closure (Stock Hold + Reports).
 *
 * [JWT] GET /api/logistic/reports/stock-hold
 */

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { PackageX, Search, ShieldAlert } from 'lucide-react';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import {
  getStockHoldReport, getStockHoldByVendor,
  type StockHoldRow, type StockHoldVendorSummary, type StockHoldQAStatus,
} from '@/lib/oob/stock-hold-report-engine';

const QA_LABEL: Record<StockHoldQAStatus, string> = {
  no_inspection: 'No Inspection',
  pending: 'QA Pending',
  in_progress: 'QA In Progress',
  completed: 'QA Done',
};

const QA_COLOR: Record<StockHoldQAStatus, string> = {
  no_inspection: 'bg-muted text-muted-foreground',
  pending: 'bg-warning/10 text-warning border-warning/30',
  in_progress: 'bg-primary/10 text-primary border-primary/30',
  completed: 'bg-success/10 text-success border-success/30',
};

export function StockHoldReportPanel() {
  const { entityCode } = useCardEntitlement();
  const [rows, setRows] = useState<StockHoldRow[]>([]);
  const [vendors, setVendors] = useState<StockHoldVendorSummary[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setRows(getStockHoldReport(entityCode));
    setVendors(getStockHoldByVendor(entityCode));
    setLoading(false);
  }, [entityCode]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(r =>
      r.receipt_no.toLowerCase().includes(q)
      || r.vendor_name.toLowerCase().includes(q)
      || r.item_code.toLowerCase().includes(q)
      || r.item_name.toLowerCase().includes(q),
    );
  }, [rows, search]);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
          <PackageX className="h-5 w-5 text-warning" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Stock Hold Report</h1>
          <p className="text-xs text-muted-foreground">Quarantined inward receipts awaiting QA closure</p>
        </div>
      </div>

      {loading ? (
        <Card><CardContent className="p-4 space-y-2">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-32 w-full" />
        </CardContent></Card>
      ) : (
        <>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-warning" />
                By Vendor
                <Badge variant="outline" className="ml-auto font-mono">{vendors.length} vendors</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {vendors.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">No quarantine holds.</p>
              ) : (
                <div className="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Vendor</TableHead>
                        <TableHead className="text-right">Lines on Hold</TableHead>
                        <TableHead className="text-right">Oldest Age</TableHead>
                        <TableHead className="text-right">QA Pending</TableHead>
                        <TableHead className="text-right">No Inspection</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {vendors.map(v => (
                        <TableRow key={v.vendor_id} className="hover:bg-muted/50">
                          <TableCell className="text-sm">{v.vendor_name}</TableCell>
                          <TableCell className="text-right font-mono">{v.total_lines}</TableCell>
                          <TableCell className="text-right font-mono">
                            <Badge
                              variant="outline"
                              className={
                                v.oldest_age_days > 7
                                  ? 'bg-destructive/10 text-destructive border-destructive/30'
                                  : 'bg-muted text-muted-foreground'
                              }
                            >
                              {v.oldest_age_days}d
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono">{v.pending_inspection}</TableCell>
                          <TableCell className="text-right font-mono">{v.no_inspection}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                Lines Detail
                <div className="ml-auto flex items-center gap-3">
                  <div className="relative">
                    <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search receipt, vendor, item..."
                      className="pl-9 h-8 w-72 text-xs"
                    />
                  </div>
                  <Badge variant="outline" className="font-mono">{filtered.length} of {rows.length}</Badge>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Receipt No</TableHead>
                      <TableHead>Arrival</TableHead>
                      <TableHead>Age</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead>Batch</TableHead>
                      <TableHead>QA Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                          <div className="flex flex-col items-center gap-2">
                            <PackageX className="h-8 w-8 text-muted-foreground/40" />
                            <p className="text-sm">No quarantine lines</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : filtered.map(r => (
                      <TableRow key={r.line_id} className="hover:bg-muted/50">
                        <TableCell className="font-mono text-xs">{r.receipt_no}</TableCell>
                        <TableCell className="font-mono text-xs">{r.arrival_date}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              r.age_days > 7
                                ? 'bg-destructive/10 text-destructive border-destructive/30 font-mono'
                                : 'bg-muted text-muted-foreground font-mono'
                            }
                          >
                            {r.age_days}d
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">{r.vendor_name}</TableCell>
                        <TableCell className="text-xs">
                          <div className="flex flex-col">
                            <span className="font-mono">{r.item_code}</span>
                            <span className="text-muted-foreground">{r.item_name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {r.received_qty} {r.uom}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{r.batch_no ?? '—'}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={QA_COLOR[r.qa_status]}>
                            {QA_LABEL[r.qa_status]}
                          </Badge>
                          {r.qa_no && (
                            <div className="text-[10px] font-mono text-muted-foreground mt-0.5">{r.qa_no}</div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

export default StockHoldReportPanel;
