/**
 * VendorReturn.tsx — Card #6 Inward Logistic
 * Sprint T-Phase-1.2.6f-d-2-card6-6-pre-2 · Block F · D-365
 * MODULE ID: dh-i-vendor-return
 *
 * Wired to vendor-return-engine. Register list + Post DN action.
 *
 * [JWT] GET /api/logistic/vendor-returns
 * [JWT] POST /api/logistic/vendor-returns/:id/post-dn
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Undo2, Search, Send, Sparkles, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import {
  VENDOR_RETURN_STATUS_LABELS, VENDOR_RETURN_STATUS_COLORS,
  VENDOR_RETURN_REASON_LABELS,
  type VendorReturn, type VendorReturnStatus,
} from '@/types/vendor-return';
import { listVendorReturns, postDebitNote } from '@/lib/vendor-return-engine';

type TabKey = 'all' | VendorReturnStatus;
const TABS: TabKey[] = ['all', 'draft', 'approved', 'dispatched', 'acknowledged', 'closed', 'cancelled'];

function fmtINR(n: number) {
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function isAutoQA(r: VendorReturn): boolean {
  return r.lines.some(l => l.source_inspection_id);
}

export function VendorReturnPanel() {
  const { entityCode, userId } = useCardEntitlement();
  const [rows, setRows] = useState<VendorReturn[]>([]);
  const [tab, setTab] = useState<TabKey>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [postingId, setPostingId] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setLoading(true);
    setRows(listVendorReturns(entityCode));
    setLoading(false);
  }, [entityCode]);

  useEffect(() => { refresh(); }, [refresh]);

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

  const handlePostDN = useCallback(async (r: VendorReturn) => {
    setPostingId(r.id);
    try {
      const res = await postDebitNote(r.id, entityCode, userId);
      if (res.ok) {
        toast.success(`Debit Note posted · ${res.voucher_no ?? ''}`);
        refresh();
      } else {
        toast.error(res.reason ?? 'Failed to post Debit Note');
      }
    } finally {
      setPostingId(null);
    }
  }, [entityCode, userId, refresh]);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
          <Undo2 className="h-5 w-5 text-destructive" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Vendor Return (RTV)</h1>
          <p className="text-xs text-muted-foreground">Returns to vendor · QA-driven · Debit Note via FineCore</p>
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
                  <TableHead>Source</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Source GRN</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>DN</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={11} className="p-3">
                      <Skeleton className="h-20 w-full" />
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="h-32 text-center text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <Undo2 className="h-8 w-8 text-muted-foreground/40" />
                        <p className="text-sm">No vendor returns yet</p>
                        <p className="text-[11px]">Auto-DN drafts will appear here when QA closure rejects qty (D-349).</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filtered.map(r => {
                  const auto = isAutoQA(r);
                  const canPostDN = !r.debit_note_id && (r.status === 'draft' || r.status === 'approved');
                  return (
                    <TableRow key={r.id} className="hover:bg-muted/50">
                      <TableCell className="font-mono text-sm">{r.return_no}</TableCell>
                      <TableCell className="font-mono text-xs">{r.return_date}</TableCell>
                      <TableCell>
                        {auto ? (
                          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-[10px] gap-1">
                            <Sparkles className="h-3 w-3" /> Auto · QA
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px]">Manual</Badge>
                        )}
                      </TableCell>
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
                      <TableCell>
                        {r.debit_note_no ? (
                          <Badge variant="outline" className="bg-success/10 text-success border-success/30 font-mono text-[10px] gap-1">
                            <FileText className="h-3 w-3" />{r.debit_note_no}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {canPostDN ? (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={postingId === r.id}
                            onClick={() => handlePostDN(r)}
                            className="h-7 gap-1"
                          >
                            <Send className="h-3 w-3" />
                            {postingId === r.id ? 'Posting...' : 'Post DN'}
                          </Button>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default VendorReturnPanel;
