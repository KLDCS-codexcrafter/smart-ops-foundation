/**
 * VendorReturn.tsx — Card #6 Inward Logistic FOUNDATION
 * Sprint T-Phase-1.2.6f-d-2-card6-6-pre-1 · Block D
 * MODULE ID: dh-i-vendor-return
 *
 * Lists all vendor returns. Engine arrives in Sprint 6-pre-2.
 * For now: register-only view backed by `vendorReturnsKey` localStorage.
 *
 * [JWT] GET /api/logistic/vendor-returns
 */

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Undo2, Search } from 'lucide-react';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import {
  vendorReturnsKey, VENDOR_RETURN_STATUS_LABELS, VENDOR_RETURN_STATUS_COLORS,
  VENDOR_RETURN_REASON_LABELS,
  type VendorReturn, type VendorReturnStatus,
} from '@/types/vendor-return';

type TabKey = 'all' | VendorReturnStatus;
const TABS: TabKey[] = ['all', 'draft', 'approved', 'dispatched', 'acknowledged', 'closed', 'cancelled'];

function fmtINR(n: number) {
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function ls<T>(k: string): T[] {
  try { const r = localStorage.getItem(k); return r ? JSON.parse(r) as T[] : []; }
  catch { return []; }
}

export function VendorReturnPanel() {
  const { entityCode } = useCardEntitlement();
  const [rows, setRows] = useState<VendorReturn[]>([]);
  const [tab, setTab] = useState<TabKey>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    setRows(ls<VendorReturn>(vendorReturnsKey(entityCode)));
  }, [entityCode]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return rows.filter(r => {
      if (tab !== 'all' && r.status !== tab) return false;
      if (!needle) return true;
      return (
        r.return_no.toLowerCase().includes(needle)
        || r.vendor_name.toLowerCase().includes(needle)
        || (r.source_grn_no ?? '').toLowerCase().includes(needle)
      );
    });
  }, [rows, tab, search]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: rows.length };
    for (const s of TABS) if (s !== 'all') c[s] = rows.filter(r => r.status === s).length;
    return c;
  }, [rows]);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
          <Undo2 className="h-5 w-5 text-destructive" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Vendor Return (RTV)</h1>
          <p className="text-xs text-muted-foreground">Returns to vendor · QA-driven · debit note pending</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search return no, vendor, GRN..."
                className="pl-9"
              />
            </div>
            <Badge variant="outline" className="font-mono">{filtered.length} of {rows.length}</Badge>
          </div>

          <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
            <TabsList className="w-full justify-start flex-wrap h-auto">
              {TABS.map(t => (
                <TabsTrigger key={t} value={t} className="gap-1.5">
                  <span className="capitalize">{t === 'all' ? 'All' : VENDOR_RETURN_STATUS_LABELS[t]}</span>
                  <Badge variant="secondary" className="h-4 px-1 text-[10px] font-mono">{counts[t] ?? 0}</Badge>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Return No</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Source GRN</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <Undo2 className="h-8 w-8 text-muted-foreground/40" />
                        <p className="text-sm">No vendor returns</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filtered.map(r => (
                  <TableRow key={r.id} className="hover:bg-muted/50">
                    <TableCell className="font-mono text-sm">{r.return_no}</TableCell>
                    <TableCell className="font-mono text-xs">{r.return_date}</TableCell>
                    <TableCell className="text-sm">{r.vendor_name}</TableCell>
                    <TableCell className="font-mono text-xs">{r.source_grn_no ?? '—'}</TableCell>
                    <TableCell className="text-xs">{VENDOR_RETURN_REASON_LABELS[r.primary_reason]}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{r.total_qty}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{fmtINR(r.total_value)}</TableCell>
                    <TableCell>
                      <Badge className={VENDOR_RETURN_STATUS_COLORS[r.status]}>
                        {VENDOR_RETURN_STATUS_LABELS[r.status]}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default VendorReturnPanel;
