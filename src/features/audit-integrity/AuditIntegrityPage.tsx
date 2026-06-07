/**
 * AuditIntegrityPage — P8.5 · B.5-L2 Verify UI
 *
 * Sprint T-P85-Global-Hash-Chain.
 *
 * Operator-facing surface for the per-(entity, auditEntityType) tamper-
 * evidence chain forged at logAudit by audit-trail-chain-engine.ts.
 *
 *   - Entity-level summary strip (chains · total links · last verify time)
 *   - "Verify Now" button → ensureChainsSeeded + verifyAllChains
 *   - Per-type table: type · length · INTACT/BREAK at seq N · entry id
 *   - Plain-language tamper panel (what a break means, what to do)
 *   - Seam footer: chain-head server anchoring arrives with Phase-2 backend
 *
 * The S137 spine (audit-trail-hash-chain.ts) is unrelated to this surface;
 * its consumers verify via verifyChainIntegrity on their own narrow chain.
 *
 * [JWT] Server-side chain-head anchoring arrives with the Phase-2 backend.
 */
import { useState } from 'react';
import {
  ShieldCheck, ShieldAlert, RefreshCw, Link2, FileSearch, ServerCog,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useEntityCode } from '@/hooks/useEntityCode';
import {
  ensureChainsSeeded,
  verifyAllChains,
  type AllChainsVerification,
  type TypedChainVerification,
} from '@/lib/audit-trail-chain-engine';

function formatIST(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return (
    d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' ' +
    d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })
  );
}

export default function AuditIntegrityPage(): JSX.Element {
  const { entityCode } = useEntityCode();
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<AllChainsVerification | null>(null);
  const [lastVerifyAt, setLastVerifyAt] = useState<string | null>(null);
  const [migrationNote, setMigrationNote] = useState<string | null>(null);

  async function runVerify(): Promise<void> {
    if (!entityCode) return;
    setBusy(true);
    setMigrationNote(null);
    try {
      const mig = await ensureChainsSeeded(entityCode);
      if (mig.newLinks > 0) {
        setMigrationNote(
          `Retro-genesis migration · ${mig.scanned} audit entries scanned · ${mig.newLinks} pre-existing entries chained.`,
        );
      }
      const r = await verifyAllChains(entityCode);
      setReport(r);
      setLastVerifyAt(new Date().toISOString());
    } finally {
      setBusy(false);
    }
  }

  if (!entityCode) {
    return (
      <div className="p-6">
        <Card className="glass-card">
          <CardContent className="p-6 text-sm text-muted-foreground">
            Select a company to verify its audit-trail integrity.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2 text-foreground">
            <ShieldCheck className="h-6 w-6 text-primary" />
            Audit Integrity
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Tamper-evidence over every audit-trail entry · one chain per audit-entry type ·{' '}
            <span className="font-mono">{entityCode}</span>
          </p>
        </div>
        <Button onClick={runVerify} disabled={busy} aria-label="Verify all audit chains for this entity">
          <RefreshCw className={`h-4 w-4 mr-2 ${busy ? 'animate-spin' : ''}`} />
          {busy ? 'Verifying…' : 'Verify Now'}
        </Button>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="glass-card">
          <CardContent className="p-3 sm:p-4">
            <p className="text-xs text-muted-foreground">Chains</p>
            <p className="text-lg sm:text-xl font-mono text-foreground">{report?.totalChains ?? '—'}</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-3 sm:p-4">
            <p className="text-xs text-muted-foreground">Total links</p>
            <p className="text-lg sm:text-xl font-mono text-foreground">{report?.totalLinks ?? '—'}</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-3 sm:p-4">
            <p className="text-xs text-muted-foreground">Intact</p>
            <p className="text-lg sm:text-xl font-mono text-success">{report?.intactChains ?? '—'}</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-3 sm:p-4">
            <p className="text-xs text-muted-foreground">Broken</p>
            <p className={`text-lg sm:text-xl font-mono ${report && report.brokenChains > 0 ? 'text-destructive' : 'text-foreground'}`}>
              {report?.brokenChains ?? '—'}
            </p>
          </CardContent>
        </Card>
      </div>

      {lastVerifyAt && (
        <p className="text-xs text-muted-foreground">
          Last verified · <span className="font-mono">{formatIST(lastVerifyAt)}</span>
        </p>
      )}
      {migrationNote && (
        <Card className="glass-card border-primary/40">
          <CardContent className="p-3 sm:p-4 text-xs sm:text-sm text-foreground flex items-start gap-2">
            <Link2 className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
            <span>{migrationNote}</span>
          </CardContent>
        </Card>
      )}

      {/* Per-type table */}
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileSearch className="h-4 w-4 text-muted-foreground" />
            Chains by audit-entry type
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-2">
          {!report ? (
            <div className="p-6 text-sm text-muted-foreground text-center">
              Press <span className="font-medium text-foreground">Verify Now</span> to recompute every chain link
              and surface any tamper position.
            </div>
          ) : report.results.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground text-center">
              No chained audit-entry types yet for this entity. Chains are forged as transactions accumulate.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[180px]">Audit entry type</TableHead>
                    <TableHead className="text-right">Links</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="min-w-[220px]">Break detail</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.results.map((r: TypedChainVerification) => (
                    <TableRow key={String(r.entityType)}>
                      <TableCell className="font-mono text-xs">{String(r.entityType)}</TableCell>
                      <TableCell className="text-right font-mono">{r.length}</TableCell>
                      <TableCell>
                        {r.valid ? (
                          <Badge variant="secondary" className="bg-success/15 text-success border-success/30">
                            <ShieldCheck className="h-3 w-3 mr-1" /> INTACT
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-destructive/15 text-destructive border-destructive/30">
                            <ShieldAlert className="h-3 w-3 mr-1" /> BREAK
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        {r.valid ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          <span className="font-mono text-destructive">
                            seq {r.firstBreakSeq} · {r.firstBreakEntryId} · {r.reason}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Plain-language tamper panel */}
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">What a break means</CardTitle>
        </CardHeader>
        <CardContent className="p-4 text-xs sm:text-sm text-muted-foreground space-y-2">
          <p>
            Every audit-trail entry is sealed into a per-type chain — each link references the previous link's hash.
            If any entry's identity fields (id, type, action, record, user, timestamp) are altered after the fact, or if a
            link is removed or reordered, the recomputed hash will not match the stored hash and this screen will name
            the exact position of the break.
          </p>
          <p>
            <span className="font-medium text-foreground">If you see a BREAK:</span> the underlying audit row may have
            been edited outside the application (for example, a manual storage edit). Export the affected entries via the
            Compliance module, freeze further activity on the affected entity, and raise the incident with your auditor.
          </p>
        </CardContent>
      </Card>

      {/* Seam footer */}
      <Card className="glass-card border-dashed">
        <CardContent className="p-3 sm:p-4 text-xs text-muted-foreground flex items-start gap-2">
          <ServerCog className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <span>
            Chain-head server anchoring arrives with the Phase-2 backend — once enabled, each entity's latest chain
            head will be co-anchored on the server so any local-storage tamper is detected centrally. <span className="font-mono">[JWT]</span>
          </span>
        </CardContent>
      </Card>
    </div>
  );
}
