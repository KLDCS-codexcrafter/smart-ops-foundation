/**
 * @file        src/pages/erp/frontdesk/visitors/VisitorsPage.tsx
 * @sprint      Sprint 145 · T-FrontDesk-A6F.1 · Block 4
 * @purpose     Visitors register · status filter · check-out action.
 */
import { useMemo, useState } from 'react';
import { useEntityCode } from '@/hooks/useEntityCode';
import { listVisitors, checkOutVisitor } from '@/lib/frontdesk-engine';
import type { Visitor, VisitorStatus } from '@/types/frontdesk';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const STATUSES: { value: VisitorStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'on_site', label: 'On-site' },
  { value: 'planned', label: 'Planned' },
  { value: 'checked_out', label: 'Checked-out' },
  { value: 'cancelled', label: 'Cancelled' },
];

function statusVariant(s: VisitorStatus): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (s === 'on_site') return 'default';
  if (s === 'planned') return 'secondary';
  if (s === 'cancelled') return 'destructive';
  return 'outline';
}

export function VisitorsPage(): JSX.Element {
  const { entityCode } = useEntityCode();
  const [filter, setFilter] = useState<VisitorStatus | 'all'>('on_site');
  const [q, setQ] = useState('');
  const [tick, setTick] = useState(0);

  const rows = useMemo<Visitor[]>(() => {
    const all = listVisitors(entityCode);
    const filtered = filter === 'all' ? all : all.filter((v) => v.status === filter);
    const needle = q.trim().toLowerCase();
    return needle
      ? filtered.filter((v) =>
          v.name.toLowerCase().includes(needle) ||
          (v.company ?? '').toLowerCase().includes(needle) ||
          v.badgeNo.toLowerCase().includes(needle))
      : filtered;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityCode, filter, q, tick]);

  function handleCheckOut(v: Visitor): void {
    try {
      const allItemIds = v.itemsCarried.map((i) => i.id);
      checkOutVisitor(entityCode, v.id, allItemIds);
      toast.success(`Checked out ${v.name} (${v.badgeNo})`);
      setTick((n) => n + 1);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <div className="p-6 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Visitors</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <Tabs value={filter} onValueChange={(v) => setFilter(v as VisitorStatus | 'all')}>
              <TabsList>
                {STATUSES.map((s) => <TabsTrigger key={s.value} value={s.value}>{s.label}</TabsTrigger>)}
              </TabsList>
            </Tabs>
            <Input
              placeholder="Search name / company / badge"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="max-w-sm"
            />
          </div>

          {rows.length === 0 ? (
            <div className="text-sm text-muted-foreground p-8 text-center">No visitors found.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Badge</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Host</TableHead>
                  <TableHead>Purpose</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Check-in</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-mono">{v.badgeNo || '—'}</TableCell>
                    <TableCell>{v.name}</TableCell>
                    <TableCell>{v.company ?? '—'}</TableCell>
                    <TableCell>{v.hostName}</TableCell>
                    <TableCell className="text-xs">{v.purpose}</TableCell>
                    <TableCell><Badge variant={statusVariant(v.status)}>{v.status}</Badge></TableCell>
                    <TableCell className="font-mono text-xs">{v.checkInAt ? new Date(v.checkInAt).toLocaleString('en-IN') : '—'}</TableCell>
                    <TableCell className="font-mono">{v.itemsCarried.length}</TableCell>
                    <TableCell className="text-right">
                      {v.status === 'on_site' && (
                        <Button size="sm" variant="outline" onClick={() => handleCheckOut(v)}>Check-out</Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
