/**
 * @file     CFRPart11AuditTrailViewer.tsx
 * @sprint   T-Phase-3.PROD-4.5 · Theme D · Q-LOCK-7 A
 * @purpose  21 CFR Part 11 audit trail viewer · tamper-evidence + FDA export.
 */
import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Link2, Unlink, ShieldCheck, Download } from 'lucide-react';
import { toast } from 'sonner';
import { useEntityCode } from '@/hooks/useEntityCode';
import {
  listAuditTrailEntries,
  verifyAuditTrailIntegrityAsync,
} from '@/lib/cfr-part-11-engine';
import type {
  CFRPart11AuditEntry,
  CFRPart11IntegrityCheck,
  CFRPart11ActionType,
  CFRPart11SeverityLevel,
} from '@/types/cfr-part-11';

const ACTION_TYPES: CFRPart11ActionType[] = [
  'batch_release', 'batch_quarantine', 'recipe_create', 'recipe_modify',
  'recipe_approve', 'genealogy_export', 'deviation_log', 'capa_log', 'other',
];
const SEVERITIES: CFRPart11SeverityLevel[] = ['info', 'warning', 'critical'];

export default function CFRPart11AuditTrailViewer(): JSX.Element {
  const { entityCode } = useEntityCode();
  const [entries, setEntries] = useState<CFRPart11AuditEntry[]>([]);
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [sevFilter, setSevFilter] = useState<string>('all');
  const [integrity, setIntegrity] = useState<CFRPart11IntegrityCheck | null>(null);
  const [selected, setSelected] = useState<CFRPart11AuditEntry | null>(null);

  useEffect(() => {
    setEntries(listAuditTrailEntries(entityCode));
  }, [entityCode]);

  const filtered = useMemo(() => {
    return entries
      .filter((e) => actionFilter === 'all' || e.action_type === actionFilter)
      .filter((e) => sevFilter === 'all' || e.severity === sevFilter)
      .slice()
      .sort((a, b) => b.recorded_at.localeCompare(a.recorded_at));
  }, [entries, actionFilter, sevFilter]);

  async function handleVerify(): Promise<void> {
    const result = await verifyAuditTrailIntegrityAsync(entityCode);
    setIntegrity(result);
    if (result.intact_chain) {
      toast.success(`Chain intact · ${result.total_entries_checked} entries verified`);
    } else {
      toast.error(`Chain BROKEN at index ${result.first_broken_entry_index}`);
    }
  }

  function handleExportCSV(): void {
    if (filtered.length === 0) {
      toast.info('No entries to export');
      return;
    }
    const header = ['id', 'recorded_at', 'action_type', 'target', 'severity', 'description', 'signed_by', 'reason', 'entry_hash'];
    const rows = filtered.map((e) => [
      e.id, e.recorded_at, e.action_type,
      `${e.target_entity_type}:${e.target_entity_id}`, e.severity,
      e.description.replace(/"/g, '""'),
      e.signed_by_user_name, e.signature_reason.replace(/"/g, '""'),
      e.entry_hash,
    ]);
    const csv = [header, ...rows].map((r) => r.map((v) => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cfr-part-11-audit-${entityCode}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported');
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">21 CFR Part 11 Audit Trail Viewer</h1>
        <p className="text-sm text-muted-foreground">Entity: <span className="font-mono">{entityCode}</span> · Total entries: <span className="font-mono">{entries.length}</span></p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" /> Chain Integrity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Button onClick={handleVerify}>Verify Chain Integrity</Button>
            {integrity && (
              integrity.intact_chain ? (
                <Badge variant="default" className="flex items-center gap-2">
                  <Link2 className="h-3 w-3" /> Intact · {integrity.total_entries_checked} entries
                </Badge>
              ) : (
                <Badge variant="destructive" className="flex items-center gap-2">
                  <Unlink className="h-3 w-3" /> Broken at index {integrity.first_broken_entry_index}
                </Badge>
              )
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Audit Entries</span>
            <Button variant="outline" size="sm" onClick={handleExportCSV}>
              <Download className="h-4 w-4 mr-2" /> Export CSV
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-56"><SelectValue placeholder="Action type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All actions</SelectItem>
                {ACTION_TYPES.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={sevFilter} onValueChange={setSevFilter}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Severity" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All severities</SelectItem>
                {SEVERITIES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground p-8 text-center">No audit entries.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-mono">When</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Signed By</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-mono text-xs">{e.recorded_at.slice(0, 19)}</TableCell>
                    <TableCell><Badge variant="secondary">{e.action_type}</Badge></TableCell>
                    <TableCell className="font-mono text-xs">{e.target_entity_type}:{e.target_entity_id}</TableCell>
                    <TableCell><Badge variant={e.severity === 'critical' ? 'destructive' : 'secondary'}>{e.severity}</Badge></TableCell>
                    <TableCell>{e.signed_by_user_name}</TableCell>
                    <TableCell className="text-xs">{e.signature_reason}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => setSelected(e)}>View</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {selected && (
        <Card>
          <CardHeader><CardTitle>Entry Detail · {selected.id}</CardTitle></CardHeader>
          <CardContent>
            <pre className="text-xs font-mono whitespace-pre-wrap">{JSON.stringify(selected, null, 2)}</pre>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => setSelected(null)}>Close</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
