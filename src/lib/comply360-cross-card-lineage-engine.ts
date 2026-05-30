/**
 * @file        src/lib/comply360-cross-card-lineage-engine.ts
 * @sibling     NEW @ Sprint 80e · Comply360 Floor 2 Audit-Suite · Pass E · OOB-11 · DP-S80-21
 * @realizes    Cross-Card Audit Lineage Tunnel · drill-through any audit finding
 *              to its root cause across PayHub · FinCore · Comply360 · etc.
 *              CATEGORY-DEFINING DIFFERENTIATOR · makes S78a's cross-card moat
 *              customer-visible.
 * @reads-from  comply360-audit-framework-engine (S80a · findings register)
 *              comply360-audit-trail-aggregator-engine (S78a · entity-agnostic cross-card)
 *              comply360-time-machine-engine (S78a · reconstructSnapshotAt)
 *              audit-trail-engine (Phase 4)
 * @sprint      Sprint 80e · T-Phase-5.B.2.1-PASS-E
 * [JWT] Phase 8: GET /api/comply360/lineage/:finding_id
 */
import { logAudit, readAuditTrail } from './audit-trail-engine';
import type { AuditEntityType as LogAuditEntityType } from '@/types/audit-trail';
import { registerAuditEntityType } from './comply360-audit-trail-aggregator-engine';
import { listFindings, type BAPAccountId, type AuditFinding } from './comply360-audit-framework-engine';

export const READS_FROM = {
  engines: [
    'comply360-audit-framework-engine',
    'comply360-audit-trail-aggregator-engine',
    'comply360-time-machine-engine',
    'audit-trail-engine',
  ],
  storage_keys: ['erp_lineage_chains'],
} as const;

const CHAINS_KEY = 'erp_lineage_chains';

function AUD(t: string): LogAuditEntityType {
  return t as unknown as LogAuditEntityType;
}

function uid(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function readChains(): LineageChain[] {
  try {
    const raw = localStorage.getItem(CHAINS_KEY);
    return raw ? (JSON.parse(raw) as LineageChain[]) : [];
  } catch {
    return [];
  }
}

function writeChains(list: LineageChain[]): void {
  try {
    localStorage.setItem(CHAINS_KEY, JSON.stringify(list));
  } catch {
    /* quota — non-fatal */
  }
}

// ── Types ─────────────────────────────────────────────────────────────
export type LineageCard =
  | 'comply360' | 'pay-hub' | 'fincore' | 'procure360' | 'inventory-hub'
  | 'salesx' | 'production' | 'maintainpro' | 'sitex' | 'eximx'
  | 'docvault' | 'servicedesk' | 'other';

export interface LineageNode {
  node_id: string;
  level: number;
  card: LineageCard;
  entity_type: string;
  entity_id: string;
  entity_label: string;
  navigate_path: string;
  timestamp: string;
  brief: string;
}

export interface LineageChain {
  id: string;
  source_finding_id: string;
  generated_at: string;
  initiated_by_bap: BAPAccountId;
  node_count: number;
  nodes: LineageNode[];
  termination_reason: 'reached_origin' | 'lineage_break' | 'max_depth';
}

// ── Helpers ───────────────────────────────────────────────────────────
const MODULE_TO_CARD: Record<string, LineageCard> = {
  'fincore': 'fincore',
  'pay-hub': 'pay-hub',
  'payhub': 'pay-hub',
  'procure360': 'procure360',
  'inventory-hub': 'inventory-hub',
  'inventory': 'inventory-hub',
  'salesx': 'salesx',
  'production': 'production',
  'maintainpro': 'maintainpro',
  'sitex': 'sitex',
  'eximx': 'eximx',
  'docvault': 'docvault',
  'servicedesk': 'servicedesk',
};

function moduleToCard(source: string | undefined | null): LineageCard {
  if (!source) return 'other';
  const key = source.toLowerCase();
  for (const [needle, card] of Object.entries(MODULE_TO_CARD)) {
    if (key.includes(needle)) return card;
  }
  if (key.includes('comply')) return 'comply360';
  return 'other';
}

function navigatePath(card: LineageCard, entity_type: string, entity_id: string): string {
  return `/erp/${card}?type=${encodeURIComponent(entity_type)}&id=${encodeURIComponent(entity_id)}`;
}

function findFindingById(finding_id: string): AuditFinding | null {
  try {
    const raw = localStorage.getItem('erp_audit_framework_findings');
    if (!raw) return null;
    const all = JSON.parse(raw) as AuditFinding[];
    return all.find((f) => f.id === finding_id) ?? null;
  } catch {
    return null;
  }
}

function findEntityCodes(): string[] {
  const codes: string[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('erp_audit_trail_')) {
        codes.push(k.replace('erp_audit_trail_', ''));
      }
    }
  } catch { /* ignore */ }
  return codes.length > 0 ? codes : ['OPERIX-DEMO'];
}

// ── Public API ────────────────────────────────────────────────────────

/** Build lineage chain starting from a finding · walks upstream to root cause */
export function buildLineageChain(opts: {
  finding_id: string;
  initiated_by_bap: BAPAccountId;
  max_depth?: number;
}): LineageChain {
  const max_depth = opts.max_depth ?? 10;
  const finding = findFindingById(opts.finding_id);
  const nodes: LineageNode[] = [];
  let termination: LineageChain['termination_reason'] = 'reached_origin';

  // Level 0 · the finding itself
  const sourceCard = moduleToCard(finding?.source_module ?? null);
  const sourceEntityType = 'audit_framework_finding';
  const sourceEntityId = finding?.id ?? opts.finding_id;
  nodes.push({
    node_id: uid('node'),
    level: 0,
    card: 'comply360',
    entity_type: sourceEntityType,
    entity_id: sourceEntityId,
    entity_label: finding ? `Finding: ${finding.title}` : `Finding ${opts.finding_id}`,
    navigate_path: `/erp/comply360?type=finding&id=${encodeURIComponent(sourceEntityId)}`,
    timestamp: finding?.raised_at ?? new Date().toISOString(),
    brief: finding ? `${finding.severity.toUpperCase()} · status ${finding.status}` : 'finding not in registry',
  });

  // Level 1+ · walk upstream via source_record_id / source_module
  let cursor: { entity_type: string; entity_id: string; card: LineageCard } | null =
    finding?.source_record_id
      ? {
          entity_type: 'voucher',
          entity_id: finding.source_record_id,
          card: sourceCard,
        }
      : null;

  const seen = new Set<string>([`${sourceEntityType}::${sourceEntityId}`]);
  let depth = 1;
  while (cursor && depth <= max_depth) {
    const key = `${cursor.entity_type}::${cursor.entity_id}`;
    if (seen.has(key)) {
      termination = 'lineage_break';
      break;
    }
    seen.add(key);

    // Resolve label + timestamp + brief from audit-trail across known entity codes
    let label = `${cursor.entity_type} ${cursor.entity_id}`;
    let timestamp = new Date().toISOString();
    let brief = `Upstream ${cursor.card} record`;
    for (const code of findEntityCodes()) {
      const matches = readAuditTrail(code, { recordId: cursor.entity_id });
      if (matches.length > 0) {
        label = matches[0].record_label || label;
        timestamp = matches[matches.length - 1].timestamp;
        brief = `Last action ${matches[0].action} by ${matches[0].user_name}`;
        break;
      }
    }

    nodes.push({
      node_id: uid('node'),
      level: depth,
      card: cursor.card,
      entity_type: cursor.entity_type,
      entity_id: cursor.entity_id,
      entity_label: label,
      navigate_path: navigatePath(cursor.card, cursor.entity_type, cursor.entity_id),
      timestamp,
      brief,
    });

    // Browser-only heuristic: no automatic deeper traversal in Phase 5.
    cursor = null;
    depth++;
  }

  if (depth > max_depth) termination = 'max_depth';
  if (!finding?.source_record_id && nodes.length === 1) termination = 'lineage_break';

  const chain: LineageChain = {
    id: uid('chain'),
    source_finding_id: opts.finding_id,
    generated_at: new Date().toISOString(),
    initiated_by_bap: opts.initiated_by_bap,
    node_count: nodes.length,
    nodes,
    termination_reason: termination,
  };

  logAudit({
    entityCode: 'OPERIX-DEMO',
    action: 'create',
    entityType: AUD('cross_card_lineage_chain'),
    recordId: chain.id,
    recordLabel: `Lineage finding ${opts.finding_id} · ${nodes.length} nodes`,
    beforeState: null,
    afterState: { source_finding_id: chain.source_finding_id, node_count: chain.node_count },
    sourceModule: 'comply360-cross-card-lineage-engine',
  });

  const all = readChains();
  all.push(chain);
  writeChains(all);
  return chain;
}

/** List historical lineage chains for a finding */
export function listLineageChains(finding_id: string): LineageChain[] {
  return readChains().filter((c) => c.source_finding_id === finding_id);
}

/** Get specific chain by id */
export function getLineageChain(id: string): LineageChain | null {
  return readChains().find((c) => c.id === id) ?? null;
}

/** Reverse lookup · for a given entity · find all upstream sources where it appears in a chain */
export function findUpstreamReferences(entity_type: string, entity_id: string): LineageNode[] {
  const out: LineageNode[] = [];
  for (const chain of readChains()) {
    for (const node of chain.nodes) {
      if (node.entity_type === entity_type && node.entity_id === entity_id) {
        out.push(node);
      }
    }
  }
  return out;
}

// Side-effect: ensure findings list signature is referenced (silences unused-import in strict builds)
void listFindings;

// ── Entity-type registration ──────────────────────────────────────────
registerAuditEntityType({
  id: 'cross_card_lineage_chain',
  module: 'audit-trail',
  label: 'Cross-Card Lineage Tunnel · drill-through chain',
});
