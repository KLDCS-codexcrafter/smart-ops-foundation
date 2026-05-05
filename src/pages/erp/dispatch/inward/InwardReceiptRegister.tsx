/**
 * InwardReceiptRegister.tsx — Card #6 Inward Logistic FOUNDATION
 * Sprint T-Phase-1.2.6f-d-2-card6-6-pre-1 · Block D
 * MODULE ID: dh-i-inward-receipt-register
 */

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Inbox, Search, PackageOpen } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import {
  INWARD_STATUS_LABELS, INWARD_STATUS_COLORS,
  type InwardReceipt, type InwardReceiptStatus,
} from '@/types/inward-receipt';
import { listInwardReceipts } from '@/lib/inward-receipt-engine';
import type { DispatchHubModule } from '../DispatchHubSidebar';

interface Props { onModuleChange?: (m: DispatchHubModule) => void }

type TabKey = 'all' | InwardReceiptStatus;
const TABS: TabKey[] = ['all', 'draft', 'arrived', 'quarantine', 'released', 'rejected', 'cancelled'];

export function InwardReceiptRegisterPanel(_props: Props) {
  void _props;
  const { entityCode } = useCardEntitlement();
  const [rows, setRows] = useState<InwardReceipt[]>([]);
  const [tab, setTab] = useState<TabKey>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    setRows(listInwardReceipts(entityCode));
  }, [entityCode]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return rows.filter(r => {
      if (tab !== 'all' && r.status !== tab) return false;
      if (!needle) return true;
      return (
        r.receipt_no.toLowerCase().includes(needle)
        || r.vendor_name.toLowerCase().includes(needle)
        || (r.po_no ?? '').toLowerCase().includes(needle)
        || (r.vehicle_no ?? '').toLowerCase().includes(needle)
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
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Inbox className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Inward Receipt Register</h1>
          <p className="text-xs text-muted-foreground">All vendor inward receipts · grouped by status</p>
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
                placeholder="Search receipt no, vendor, PO, vehicle..."
                className="pl-9"
              />
            </div>
            <Badge variant="outline" className="font-mono">{filtered.length} of {rows.length}</Badge>
          </div>

          <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
            <TabsList className="w-full justify-start flex-wrap h-auto">
              {TABS.map(t => (
                <TabsTrigger key={t} value={t} className="gap-1.5">
                  <span className="capitalize">{t === 'all' ? 'All' : INWARD_STATUS_LABELS[t]}</span>
                  <Badge variant="secondary" className="h-4 px-1 text-[10px] font-mono">{counts[t] ?? 0}</Badge>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Receipt No</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>PO No</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead className="text-right">Lines</TableHead>
                  <TableHead className="text-right">Quarantine</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <PackageOpen className="h-8 w-8 text-muted-foreground/40" />
                        <p className="text-sm">No inward receipts</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filtered.map(r => (
                  <TableRow key={r.id} className="hover:bg-muted/50">
                    <TableCell className="font-mono text-sm">{r.receipt_no}</TableCell>
                    <TableCell className="font-mono text-xs">{r.arrival_date}</TableCell>
                    <TableCell className="text-sm">{r.vendor_name}</TableCell>
                    <TableCell className="font-mono text-xs">{r.po_no ?? '—'}</TableCell>
                    <TableCell className="font-mono text-xs">{r.vehicle_no ?? '—'}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{r.total_lines}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{r.quarantine_lines}</TableCell>
                    <TableCell>
                      <Badge className={INWARD_STATUS_COLORS[r.status]}>
                        {INWARD_STATUS_LABELS[r.status]}
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

export default InwardReceiptRegisterPanel;
