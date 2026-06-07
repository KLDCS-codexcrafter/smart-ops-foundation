/**
 * RetentionConsolePage — P8.6 · B.5-L3 Retention Console
 *
 * Sprint T-P86-Retention-Floor-Plant.
 *
 * Three sections:
 *   ① Policy table — 5 statutory-informed editable retention buckets
 *   ② Evaluation report — Run Evaluation → per record-type × FY × status
 *   ③ Honesty banner — verbatim, evaluation+flagging only this sprint
 *
 * NO purge, NO archive mutation, NO enforcement — server-side enforcement
 * arrives with Phase-8 Wave-2.
 *
 * [JWT] Phase-8 Wave-2: server-side enforcement + Rule 46(8) India-resident
 *       daily backup anchor live there.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  ScrollText, ShieldAlert, Save, Play, FileWarning, Info,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import {
  listRetentionPolicies,
  updateRetentionPolicy,
  evaluateRetention,
  getRetentionSummary,
  type RetentionPolicyRow,
  type RetentionEvaluationRow,
  type RetentionPolicyId,
} from '@/lib/record-retention-policy-engine';

function yearsToInput(y: RetentionPolicyRow['retentionYears']): string {
  return typeof y === 'number' ? String(y) : 'lifetime+7';
}

function statusBadge(s: RetentionEvaluationRow['status']): JSX.Element {
  if (s === 'past_retention_review') {
    return <Badge variant="destructive">Past retention · review</Badge>;
  }
  if (s === 'no_data') {
    return <Badge variant="outline">No data</Badge>;
  }
  return <Badge variant="secondary">Within retention</Badge>;
}

export default function RetentionConsolePage(): JSX.Element {
  const { entityCode } = useEntityCode();
  const user = useCurrentUser();
  const [policies, setPolicies] = useState<RetentionPolicyRow[]>([]);
  const [report, setReport] = useState<RetentionEvaluationRow[] | null>(null);
  const [busy, setBusy] = useState(false);
  // local edit buffer (id → patch)
  const [drafts, setDrafts] = useState<Record<RetentionPolicyId, { years: string; action: RetentionPolicyRow['action'] }>>(
    {} as Record<RetentionPolicyId, { years: string; action: RetentionPolicyRow['action'] }>,
  );

  useEffect(() => {
    const list = listRetentionPolicies();
    setPolicies(list);
    const seed: Record<string, { years: string; action: RetentionPolicyRow['action'] }> = {};
    for (const p of list) {
      seed[p.id] = { years: yearsToInput(p.retentionYears), action: p.action };
    }
    setDrafts(seed as Record<RetentionPolicyId, { years: string; action: RetentionPolicyRow['action'] }>);
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps -- `report` is read intentionally so the summary refreshes after Run Evaluation
  const summary = useMemo(() => {
    if (!entityCode) return null;
    return getRetentionSummary(entityCode);
  }, [entityCode, report]);

  function saveRow(p: RetentionPolicyRow): void {
    const draft = drafts[p.id];
    if (!draft) return;
    const yearsValue: RetentionPolicyRow['retentionYears'] =
      draft.years.trim() === 'lifetime+7'
        ? 'employment_lifetime_plus_7'
        : Math.max(0, parseInt(draft.years, 10) || 0);
    updateRetentionPolicy(
      p.id,
      { retentionYears: yearsValue, action: draft.action },
      user?.name || 'Operator',
    );
    setPolicies(listRetentionPolicies());
  }

  function runEvaluation(): void {
    if (!entityCode) return;
    setBusy(true);
    try {
      const rows = evaluateRetention(entityCode);
      setReport(rows);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <ScrollText className="h-6 w-6 text-primary" />
            Retention Console
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Statutory-informed retention policies for the 35 fiscal-year-stamped record types.
          </p>
        </div>
        <Badge variant="outline" className="gap-1">
          <ShieldAlert className="h-3 w-3" />
          Defaults are statutory-informed, not legal advice — confirm with your CA
        </Badge>
      </div>

      {/* Honesty banner (verbatim) */}
      <Card className="glass-card border-warning/30">
        <CardContent className="p-4 flex items-start gap-3">
          <Info className="h-5 w-5 text-warning shrink-0 mt-0.5" />
          <p className="text-sm">
            Evaluation and flagging only. Automated archival and enforcement
            arrive with the Phase-8 Wave-2 backend.
          </p>
        </CardContent>
      </Card>

      {/* ① Policy table */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base">Retention Policies</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Policy</TableHead>
                <TableHead className="w-32">Retention (years)</TableHead>
                <TableHead className="w-40">Action</TableHead>
                <TableHead>Statute / Rationale</TableHead>
                <TableHead className="w-40">Last edited</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {policies.map((p) => {
                const draft = drafts[p.id] ?? { years: yearsToInput(p.retentionYears), action: p.action };
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.label}</TableCell>
                    <TableCell>
                      <Input
                        value={draft.years}
                        className="font-mono h-8"
                        onChange={(e) =>
                          setDrafts((d) => ({ ...d, [p.id]: { ...draft, years: e.target.value } }))
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={draft.action}
                        onValueChange={(v) =>
                          setDrafts((d) => ({ ...d, [p.id]: { ...draft, action: v as RetentionPolicyRow['action'] } }))
                        }
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="review">Review</SelectItem>
                          <SelectItem value="archive_flag">Archive (flag)</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {p.statuteDescription}
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">
                      {p.lastEditedBy
                        ? `${p.lastEditedBy} · ${p.lastEditedAt ? new Date(p.lastEditedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}`
                        : '—'}
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => saveRow(p)}>
                        <Save className="h-3.5 w-3.5 mr-1" />
                        Save
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ② Evaluation report */}
      <Card className="glass-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Retention Evaluation Report</CardTitle>
          <Button onClick={runEvaluation} disabled={busy || !entityCode} size="sm">
            <Play className="h-3.5 w-3.5 mr-1" />
            {busy ? 'Running…' : 'Run Evaluation'}
          </Button>
        </CardHeader>
        <CardContent>
          {summary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <div className="rounded-lg border p-3">
                <div className="text-xs text-muted-foreground">Record types</div>
                <div className="text-xl font-mono">{summary.totalRecordTypes}</div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-xs text-muted-foreground">Past retention</div>
                <div className="text-xl font-mono text-destructive">{summary.pastRetention}</div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-xs text-muted-foreground">Within retention</div>
                <div className="text-xl font-mono text-success">{summary.withinRetention}</div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-xs text-muted-foreground">No data</div>
                <div className="text-xl font-mono text-muted-foreground">{summary.noData}</div>
              </div>
            </div>
          )}

          {!report ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
              <FileWarning className="h-4 w-4" />
              Run an evaluation to see record-type × fiscal-year status.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Record type</TableHead>
                  <TableHead className="w-32">Fiscal year</TableHead>
                  <TableHead className="w-24 text-right">Count</TableHead>
                  <TableHead className="w-44">Policy</TableHead>
                  <TableHead className="w-32">Cutoff FY</TableHead>
                  <TableHead className="w-48">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.map((r, i) => (
                  <TableRow key={`${r.recordType}-${r.fiscalYear}-${i}`}>
                    <TableCell className="font-mono text-xs">{r.recordType}</TableCell>
                    <TableCell className="font-mono text-xs">{r.fiscalYear}</TableCell>
                    <TableCell className="text-right font-mono">{r.recordCount}</TableCell>
                    <TableCell className="text-xs">{r.policyId}</TableCell>
                    <TableCell className="font-mono text-xs">{r.cutoffFY}</TableCell>
                    <TableCell>{statusBadge(r.status)}</TableCell>
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
