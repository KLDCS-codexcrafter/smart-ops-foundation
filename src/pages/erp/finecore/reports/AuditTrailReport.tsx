/**
 * AuditTrailReport.tsx — MCA Rule 3(1) compliance report
 * Sprint T-Phase-1.2.5h-b1
 * [JWT] GET /api/audit-trail
 */
// i18n: Sprint T-Phase-1.2.5h-c2-fix · minimum-viable migration
import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Shield, Download, Eye } from 'lucide-react';
import { useEntityCode } from '@/hooks/useEntityCode';
import { readAuditTrail, exportAuditTrailCsv } from '@/lib/audit-trail-engine';
import type { AuditTrailEntry, AuditAction } from '@/types/audit-trail';

const ACTIONS: AuditAction[] = ['create', 'update', 'cancel', 'post', 'unpost', 'approve', 'reject'];

export default function AuditTrailReport() {
  const { entityCode } = useEntityCode();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [action, setAction] = useState<AuditAction | ''>('');
  const [search, setSearch] = useState('');
  const [drilled, setDrilled] = useState<AuditTrailEntry | null>(null);

  const all = useMemo(() => {
    if (!entityCode) return [];
    return readAuditTrail(entityCode, {
      from: from || undefined,
      to: to ? `${to}T23:59:59Z` : undefined,
      action: action || undefined,
    });
  }, [entityCode, from, to, action]);

  const filtered = useMemo(() => {
    if (!search) return all;
    const q = search.toLowerCase();
    return all.filter(e =>
      e.record_label.toLowerCase().includes(q) ||
      e.record_id.toLowerCase().includes(q) ||
      e.user_name.toLowerCase().includes(q),
    );
  }, [all, search]);

  function handleExport() {
    const csv = exportAuditTrailCsv(filtered);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-trail-${entityCode}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            Audit Trail · MCA Rule 3(1) Compliance
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Append-only log of every transaction and change. Cannot be disabled.
          </p>
        </div>
        <Button onClick={handleExport} disabled={filtered.length === 0}>
          <Download className="h-4 w-4 mr-1" /> Export CSV
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="text-xs text-muted-foreground">From</label>
            <Input type="date" value={from} onChange={e => setFrom(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">To</label>
            <Input type="date" value={to} onChange={e => setTo(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Action</label>
            <select
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              value={action}
              onChange={e => setAction(e.target.value as AuditAction | '')}
            >
              <option value="">All actions</option>
              {ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Search record / user</label>
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="JV/25-26/0042" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Record</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead className="w-20">Diff</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">
                    No audit entries match the current filters
                  </TableCell>
                </TableRow>
              ) : filtered.map(e => (
                <TableRow key={e.id}>
                  <TableCell className="font-mono text-xs">
                    {new Date(e.timestamp).toLocaleString('en-IN')}
                  </TableCell>
                  <TableCell className="text-xs">{e.user_name}</TableCell>
                  <TableCell><Badge variant="outline">{e.action}</Badge></TableCell>
                  <TableCell className="text-xs">{e.entity_type}</TableCell>
                  <TableCell className="font-mono text-xs">{e.record_label}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{e.reason ?? '—'}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" onClick={() => setDrilled(e)}>
                      <Eye className="h-3 w-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Total entries: {filtered.length} of {all.length} · Storage: localStorage (Phase 1)
      </p>

      <Dialog open={!!drilled} onOpenChange={() => setDrilled(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Audit Diff · {drilled?.record_label}</DialogTitle>
          </DialogHeader>
          {drilled && (
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="font-semibold mb-1">Before</p>
                <pre className="bg-muted p-3 rounded max-h-96 overflow-auto">
                  {JSON.stringify(drilled.before_state ?? {}, null, 2)}
                </pre>
              </div>
              <div>
                <p className="font-semibold mb-1">After</p>
                <pre className="bg-muted p-3 rounded max-h-96 overflow-auto">
                  {JSON.stringify(drilled.after_state ?? {}, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
