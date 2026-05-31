/**
 * @file        src/pages/erp/comply360/internal-audit/AuditTrailExplorerPage.tsx
 * @purpose     Internal Audit Audit-Trail Explorer · 4-tab surface
 *              (Recent + Entity Filter + Chain Verification + Cross-Card Lineage).
 *              PROMOTED from S79a 13-LOC stub at AuditTrailPage.tsx (RENAMED · DP-S81-6).
 *              DP-S79-2 stub 4 of 11 closed.
 *              CONSUMES audit-trail-engine + aggregator + S80e cross-card-lineage.
 * @sprint      Sprint 81b · T-Phase-5.B.2.2-PASS-B · DP-S81-6
 * @stub-fill   DP-S79-2 stub 4 of 11 closed (was: 13-LOC redirect-target stub at AuditTrailPage.tsx · S79a)
 * @consumes    audit-trail-engine (readAuditTrail · MCA_RULE_3_1_COMPLIANCE)
 *              audit-trail-hash-chain (verifyChainIntegrity)
 *              comply360-audit-trail-aggregator-engine (aggregateAuditTrail · AUDIT_ENTITY_TYPES_REGISTRY)
 *              comply360-cross-card-lineage-engine (buildLineageChain · OOB-11)
 * @previous-author-history  Sprint 79a · T-Phase-5.A.1.11-PASS-A · DP-S79-2 redirect-target stub at AuditTrailPage.tsx
 */
import { useMemo, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  readAuditTrail,
  MCA_RULE_3_1_COMPLIANCE,
  type AuditTrailEntry,
} from '@/lib/audit-trail-engine';
import { verifyChainIntegrity, type ChainVerification } from '@/lib/audit-trail-hash-chain';
import {
  aggregateAuditTrail,
  AUDIT_ENTITY_TYPES_REGISTRY,
} from '@/lib/comply360-audit-trail-aggregator-engine';
import {
  buildLineageChain,
  type LineageChain,
} from '@/lib/comply360-cross-card-lineage-engine';
import { getActiveBAPAccount, type BAPAccountId } from '@/lib/comply360-audit-framework-engine';
import { useEntityCode } from '@/hooks/useEntityCode';

const RECENT_LIMIT = 100;

export default function AuditTrailExplorerPage(): JSX.Element {
  const [bap] = useState<BAPAccountId>(getActiveBAPAccount());
  const { entityCode } = useEntityCode();

  return (
    <div className="p-6 space-y-4">
      <header>
        <h1 className="text-2xl font-bold">Audit Trail Explorer</h1>
        <p className="text-sm text-muted-foreground">
          MCA Rule 11(g)-compliant audit trail · Cannot Disable:{' '}
          <span className="font-mono">
            {MCA_RULE_3_1_COMPLIANCE.cannot_be_disabled ? 'Yes' : 'No'}
          </span>{' '}
          · Retention:{' '}
          <span className="font-mono">{MCA_RULE_3_1_COMPLIANCE.retention_years} years</span>{' '}
          (Section 128(5)) · Entity{' '}
          <span className="font-mono">{entityCode}</span> · BAP{' '}
          <span className="font-mono">{bap}</span>
        </p>
      </header>

      <Tabs defaultValue="recent" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="recent">Recent (last {RECENT_LIMIT})</TabsTrigger>
          <TabsTrigger value="entity-filter">Entity Filter</TabsTrigger>
          <TabsTrigger value="chain-verification">Chain Verification</TabsTrigger>
          <TabsTrigger value="cross-card-lineage">Cross-Card Lineage</TabsTrigger>
        </TabsList>

        <TabsContent value="recent">
          <RecentEntriesView entityCode={entityCode} />
        </TabsContent>

        <TabsContent value="entity-filter">
          <EntityFilterView entityCode={entityCode} />
        </TabsContent>

        <TabsContent value="chain-verification">
          <ChainVerificationView entityCode={entityCode} />
        </TabsContent>

        <TabsContent value="cross-card-lineage">
          <CrossCardLineageView bap={bap} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── Recent (last 100) ──
function RecentEntriesView({ entityCode }: { entityCode: string }): JSX.Element {
  const entries = useMemo(
    () => readAuditTrail(entityCode).slice(0, RECENT_LIMIT),
    [entityCode],
  );
  return (
    <Card className="p-4">
      <h3 className="font-semibold mb-2">Recent · {entries.length} entries</h3>
      <EntriesTable entries={entries} />
    </Card>
  );
}

// ── Entity Filter ──
function EntityFilterView({ entityCode }: { entityCode: string }): JSX.Element {
  const [entityType, setEntityType] = useState<string>('');
  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');
  const view = useMemo(
    () => aggregateAuditTrail(entityCode, {
      entityType: entityType || undefined,
      from: from || undefined,
      to: to || undefined,
    }),
    [entityCode, entityType, from, to],
  );
  return (
    <Card className="p-4 space-y-3">
      <h3 className="font-semibold">Entity Filter</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <select
          aria-label="Entity type"
          className="rounded-md border bg-background px-3 py-2 text-sm"
          value={entityType}
          onChange={(e) => setEntityType(e.target.value)}
        >
          <option value="">All entity types</option>
          {AUDIT_ENTITY_TYPES_REGISTRY.map((t) => (
            <option key={t.id} value={t.id}>{t.label}</option>
          ))}
        </select>
        <Input
          type="date"
          aria-label="From date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
        />
        <Input
          type="date"
          aria-label="To date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Matched <span className="font-mono">{view.entries.length}</span> entries ·
        chain status <Badge>{view.chain_status}</Badge>
      </p>
      <EntriesTable entries={view.entries} />
    </Card>
  );
}

// ── Chain Verification ──
function ChainVerificationView({ entityCode }: { entityCode: string }): JSX.Element {
  const [verdict, setVerdict] = useState<ChainVerification | null>(null);
  const [running, setRunning] = useState<boolean>(false);
  const run = async (): Promise<void> => {
    setRunning(true);
    try {
      const v = await verifyChainIntegrity(entityCode);
      setVerdict(v);
    } finally {
      setRunning(false);
    }
  };
  return (
    <Card className="p-4 space-y-3">
      <h3 className="font-semibold">Hash-Chain Integrity Verification</h3>
      <p className="text-sm text-muted-foreground">
        Re-computes SHA-256 chain over all audit entries for entity{' '}
        <span className="font-mono">{entityCode}</span>.
      </p>
      <Button onClick={run} disabled={running}>
        {running ? 'Verifying…' : 'Run Chain Integrity Verification'}
      </Button>
      {verdict && (
        <div className="rounded-md border p-3 text-sm space-y-1">
          <div>
            Verdict:{' '}
            <Badge className={verdict.ok ? 'bg-success text-success-foreground' : 'bg-destructive text-destructive-foreground'}>
              {verdict.ok ? 'VERIFIED' : 'BROKEN'}
            </Badge>
          </div>
          <div>Total entries: <span className="font-mono">{verdict.total}</span></div>
          {!verdict.ok && (
            <>
              <div>Broken at index: <span className="font-mono">{verdict.broken_at}</span></div>
              <div>Reason: <span className="font-mono">{verdict.reason}</span></div>
            </>
          )}
        </div>
      )}
    </Card>
  );
}

// ── Cross-Card Lineage ──
function CrossCardLineageView({ bap }: { bap: BAPAccountId }): JSX.Element {
  const [findingId, setFindingId] = useState<string>('');
  const [chain, setChain] = useState<LineageChain | null>(null);
  const build = (): void => {
    if (!findingId.trim()) return;
    setChain(buildLineageChain({ finding_id: findingId.trim(), initiated_by_bap: bap }));
  };
  return (
    <Card className="p-4 space-y-3">
      <h3 className="font-semibold">Cross-Card Lineage (S80e · OOB-11)</h3>
      <p className="text-sm text-muted-foreground">
        Build lineage chain from finding back to root-cause across cards.
      </p>
      <div className="flex gap-2">
        <Input
          placeholder="finding_id"
          value={findingId}
          onChange={(e) => setFindingId(e.target.value)}
        />
        <Button onClick={build}>Build Lineage</Button>
      </div>
      {chain && (
        <div className="rounded-md border p-3 text-sm space-y-2">
          <div className="text-xs text-muted-foreground">
            Chain <span className="font-mono">{chain.id}</span> · nodes{' '}
            <span className="font-mono">{chain.node_count}</span> · termination{' '}
            <Badge>{chain.termination_reason}</Badge>
          </div>
          <ol className="space-y-2">
            {chain.nodes.map((n) => (
              <li key={n.node_id} className="rounded-md border p-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-muted-foreground">
                    L{n.level} · {n.card}
                  </span>
                  <a
                    href={n.navigate_path}
                    className="text-xs text-primary underline"
                  >
                    Open →
                  </a>
                </div>
                <div className="text-sm">{n.entity_label}</div>
                <div className="text-xs text-muted-foreground">{n.brief}</div>
              </li>
            ))}
          </ol>
        </div>
      )}
    </Card>
  );
}

// ── Entries Table ──
function EntriesTable({ entries }: { entries: AuditTrailEntry[] }): JSX.Element {
  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">No audit entries.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-muted-foreground border-b">
            <th className="py-1 pr-2">Timestamp</th>
            <th className="py-1 pr-2">Entity type</th>
            <th className="py-1 pr-2">Action</th>
            <th className="py-1 pr-2">Actor</th>
            <th className="py-1 pr-2">Record</th>
          </tr>
        </thead>
        <tbody>
          {entries.slice(0, RECENT_LIMIT).map((e) => (
            <tr key={e.id} className="border-b last:border-0">
              <td className="py-1 pr-2 font-mono">{e.timestamp}</td>
              <td className="py-1 pr-2">{e.entity_type}</td>
              <td className="py-1 pr-2">{e.action}</td>
              <td className="py-1 pr-2">{e.user_name}</td>
              <td className="py-1 pr-2 font-mono">{e.record_id}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
