/**
 * @realizes SP.3 · account hierarchy + provision requests
 * @sprint   SP.3 · T-SP3-Provisioning
 * @consumes product-variant-engine (assignVariantToTenant — delegation)
 *           partner-portal-engine (getPartnerCustomers — import nodes)
 *           card-entitlement-engine (seeds via product-variant-engine chain)
 * @canon    Provisioning = STATUS-TRACK ONLY (Tier-L).
 *           NO real instance spin-up · NO enforcement · NO billing · NO per-account auth.
 * @[JWT]    Wave-2: real instance spin-up + enforcement + billing + per-hierarchy auth.
 */
import {
  type AccountNode,
  type AccountNodeType,
  type ProvisionRequest,
  type ProvisionRequestType,
  type ProvisionRequestStatus,
  PROVISION_STATUS_ORDER,
  accountHierarchyKey,
  provisionRequestsKey,
  PROVISIONING_HONESTY,
} from '@/types/provisioning';
import { assignVariantToTenant } from '@/lib/product-variant-engine';
import { getPartnerCustomers } from '@/lib/partner-portal-engine';

/* ─────────────────────────────────────────────────────────────────────── */
/* §1 · Honesty re-export                                                  */
/* ─────────────────────────────────────────────────────────────────────── */
export { PROVISIONING_HONESTY };

/* ─────────────────────────────────────────────────────────────────────── */
/* §2 · Safe localStorage helpers                                          */
/* ─────────────────────────────────────────────────────────────────────── */
function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function writeJSON(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* no-op (quota) */
  }
}

function nowIso(): string {
  return new Date().toISOString();
}
function rid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/* ─────────────────────────────────────────────────────────────────────── */
/* §3 · AccountNode CRUD + hierarchy build                                 */
/* ─────────────────────────────────────────────────────────────────────── */
export function listAccountNodes(entity: string): AccountNode[] {
  return readJSON<AccountNode[]>(accountHierarchyKey(entity), []);
}

export function getAccountNode(entity: string, id: string): AccountNode | null {
  return listAccountNodes(entity).find((n) => n.id === id) ?? null;
}

export interface CreateAccountNodeInput {
  type: AccountNodeType;
  name: string;
  parent_id?: string | null;
  partner_id?: string | null;
  id?: string;
}

/**
 * Honest validation: super_admin = root only · channel_partner under super_admin ·
 * client under super_admin · client_of_partner MUST have partner_id pointing to
 * a channel_partner node. No cycles (parent must already exist + cannot be self).
 */
export function validateAccountNode(
  nodes: AccountNode[],
  input: { id?: string; type: AccountNodeType; parent_id: string | null; partner_id: string | null },
): { ok: true } | { ok: false; reason: string } {
  if (input.type === 'super_admin') {
    if (input.parent_id !== null) return { ok: false, reason: 'super_admin must be root (parent_id=null)' };
    if (nodes.some((n) => n.type === 'super_admin' && n.id !== input.id))
      return { ok: false, reason: 'super_admin root already exists' };
    return { ok: true };
  }
  if (input.parent_id === null) return { ok: false, reason: 'non-root node requires parent_id' };
  if (input.parent_id === input.id) return { ok: false, reason: 'node cannot be its own parent' };
  const parent = nodes.find((n) => n.id === input.parent_id);
  if (!parent) return { ok: false, reason: 'parent_id does not reference an existing node' };
  if (input.type === 'client_of_partner') {
    if (!input.partner_id) return { ok: false, reason: 'client_of_partner requires partner_id' };
    const partner = nodes.find((n) => n.id === input.partner_id);
    if (!partner || partner.type !== 'channel_partner')
      return { ok: false, reason: 'partner_id must reference a channel_partner node' };
  }
  return { ok: true };
}

export function createAccountNode(entity: string, input: CreateAccountNodeInput): AccountNode | null {
  const nodes = listAccountNodes(entity);
  const candidate = {
    id: input.id ?? rid('an'),
    type: input.type,
    parent_id: input.parent_id ?? null,
    partner_id: input.partner_id ?? null,
  };
  const v = validateAccountNode(nodes, candidate);
  if (!v.ok) return null;
  const node: AccountNode = {
    id: candidate.id,
    type: input.type,
    name: input.name,
    parent_id: candidate.parent_id,
    partner_id: candidate.partner_id,
    created_at: nowIso(),
  };
  nodes.push(node);
  writeJSON(accountHierarchyKey(entity), nodes);
  return node;
}

export function deleteAccountNode(entity: string, id: string): boolean {
  const nodes = listAccountNodes(entity);
  const next = nodes.filter((n) => n.id !== id && n.parent_id !== id && n.partner_id !== id);
  if (next.length === nodes.length) return false;
  writeJSON(accountHierarchyKey(entity), next);
  return true;
}

/** Ensure the super_admin root exists; returns the root node. */
export function ensureSuperAdminRoot(entity: string, name = 'Operix Super Admin'): AccountNode {
  const nodes = listAccountNodes(entity);
  const existing = nodes.find((n) => n.type === 'super_admin');
  if (existing) return existing;
  const root: AccountNode = {
    id: rid('an_root'),
    type: 'super_admin',
    name,
    parent_id: null,
    partner_id: null,
    created_at: nowIso(),
  };
  nodes.push(root);
  writeJSON(accountHierarchyKey(entity), nodes);
  return root;
}

export interface HierarchyTreeNode extends AccountNode {
  children: HierarchyTreeNode[];
}

export function buildHierarchyTree(entity: string): HierarchyTreeNode | null {
  const nodes = listAccountNodes(entity);
  const root = nodes.find((n) => n.type === 'super_admin');
  if (!root) return null;
  const byParent = new Map<string, AccountNode[]>();
  for (const n of nodes) {
    const p = n.parent_id ?? '__root_marker__';
    const arr = byParent.get(p) ?? [];
    arr.push(n);
    byParent.set(p, arr);
  }
  const walk = (n: AccountNode): HierarchyTreeNode => ({
    ...n,
    children: (byParent.get(n.id) ?? []).map(walk),
  });
  return walk(root);
}

/* ─────────────────────────────────────────────────────────────────────── */
/* §4 · CONSUME partner-portal → client_of_partner nodes                   */
/* ─────────────────────────────────────────────────────────────────────── */
/**
 * CONSUMES partner-portal-engine (getPartnerCustomers) — no duplicate partner store.
 * Imports each PartnerCustomer as a client_of_partner node under the given
 * channel-partner node. Idempotent: skips customers already imported (by id).
 */
export function importPartnerClientsAsNodes(
  entity: string,
  partnerNodeId: string,
  /** entity scope for partner-portal-engine seed; defaults to its KLDCS seed. */
  partnerEntityCode?: string,
): { imported: AccountNode[]; skipped: number } {
  const partnerNode = getAccountNode(entity, partnerNodeId);
  if (!partnerNode || partnerNode.type !== 'channel_partner') {
    return { imported: [], skipped: 0 };
  }
  const customers = partnerEntityCode
    ? getPartnerCustomers(partnerEntityCode)
    : getPartnerCustomers();
  const existing = listAccountNodes(entity);
  const existingIds = new Set(existing.map((n) => n.id));
  const imported: AccountNode[] = [];
  let skipped = 0;
  for (const c of customers) {
    const nodeId = `an_pc_${c.id}`;
    if (existingIds.has(nodeId)) {
      skipped++;
      continue;
    }
    const created = createAccountNode(entity, {
      id: nodeId,
      type: 'client_of_partner',
      name: c.tenant_name,
      parent_id: partnerNodeId,
      partner_id: partnerNodeId,
    });
    if (created) imported.push(created);
  }
  return { imported, skipped };
}

/* ─────────────────────────────────────────────────────────────────────── */
/* §5 · ProvisionRequest CRUD + guarded transitions                        */
/* ─────────────────────────────────────────────────────────────────────── */
export function listProvisionRequests(entity: string): ProvisionRequest[] {
  return readJSON<ProvisionRequest[]>(provisionRequestsKey(entity), []);
}

export function getProvisionRequest(entity: string, id: string): ProvisionRequest | null {
  return listProvisionRequests(entity).find((r) => r.id === id) ?? null;
}

export interface CreateProvisionRequestInput {
  type: ProvisionRequestType;
  requester_name: string;
  partner_id?: string | null;
  assigned_variant_id?: string | null;
  notes?: string;
}

export function createProvisionRequest(
  entity: string,
  input: CreateProvisionRequestInput,
): ProvisionRequest {
  const req: ProvisionRequest = {
    id: rid('pr'),
    type: input.type,
    requester_name: input.requester_name,
    requester_account_id: null,
    assigned_variant_id: input.assigned_variant_id ?? null,
    partner_id: input.partner_id ?? null,
    status: 'requested',
    created_at: nowIso(),
    provisioned_at: null,
    notes: input.notes ?? '',
  };
  const all = listProvisionRequests(entity);
  all.push(req);
  writeJSON(provisionRequestsKey(entity), all);
  return req;
}

/**
 * Guarded forward-only transitions. Allowed:
 *   requested→approved · approved→provisioned · provisioned→active ·
 *   active→suspended · suspended→active (recover).
 * Anything else (e.g. requested→provisioned skipping approved) is rejected.
 */
export function canTransition(
  from: ProvisionRequestStatus,
  to: ProvisionRequestStatus,
): boolean {
  if (from === to) return false;
  if (from === 'active' && to === 'suspended') return true;
  if (from === 'suspended' && to === 'active') return true;
  const fi = PROVISION_STATUS_ORDER.indexOf(from);
  const ti = PROVISION_STATUS_ORDER.indexOf(to);
  if (fi < 0 || ti < 0) return false;
  // forward by exactly one step (within requested→approved→provisioned→active)
  return ti === fi + 1 && to !== 'suspended';
}

function persistRequest(entity: string, req: ProvisionRequest): void {
  const all = listProvisionRequests(entity);
  const idx = all.findIndex((r) => r.id === req.id);
  if (idx >= 0) all[idx] = req;
  else all.push(req);
  writeJSON(provisionRequestsKey(entity), all);
}

export function setRequestStatus(
  entity: string,
  requestId: string,
  next: ProvisionRequestStatus,
): ProvisionRequest | null {
  const req = getProvisionRequest(entity, requestId);
  if (!req) return null;
  if (!canTransition(req.status, next)) return null;
  req.status = next;
  persistRequest(entity, req);
  logAudit(entity, requestId, `status→${next}`);
  return req;
}

export function setRequestVariant(
  entity: string,
  requestId: string,
  variantId: string,
): ProvisionRequest | null {
  const req = getProvisionRequest(entity, requestId);
  if (!req) return null;
  req.assigned_variant_id = variantId;
  persistRequest(entity, req);
  return req;
}

/* ─────────────────────────────────────────────────────────────────────── */
/* §6 · approveAndProvision · CONSUMES product-variant-engine              */
/* ─────────────────────────────────────────────────────────────────────── */
export interface ApproveAndProvisionResult {
  request: ProvisionRequest;
  account_node: AccountNode | null;
  /** Number of CardEntitlement rows seeded by product-variant-engine. */
  entitlement_count: number;
}

/**
 * Tier-L approve + provision. CONSUMES `assignVariantToTenant` from
 * product-variant-engine which in turn seeds CardEntitlement[] via
 * `seedDemoEntitlements` (card-entitlement-engine).
 *
 * NO real instance spin-up (Wave-2). NO new tenant runtime is started here.
 */
export function approveAndProvision(
  entity: string,
  requestId: string,
  /** entity scope used as variant-engine entity (defaults to provisioning entity). */
  variantEntity?: string,
): ApproveAndProvisionResult | null {
  const req = getProvisionRequest(entity, requestId);
  if (!req) return null;
  if (req.status !== 'requested' && req.status !== 'approved') return null;
  if (!req.assigned_variant_id) return null;

  // Step 1 · status → approved (guarded)
  if (req.status === 'requested') {
    req.status = 'approved';
    persistRequest(entity, req);
    logAudit(entity, requestId, 'status→approved');
  }

  // Step 2 · create the matching AccountNode (skip for demo · demo is sandbox)
  let node: AccountNode | null = null;
  if (req.type !== 'demo') {
    const targetType: AccountNodeType =
      req.type === 'channel_partner'    ? 'channel_partner'
    : req.type === 'client_of_partner'  ? 'client_of_partner'
    : req.type === 'final_copy'         ? 'client'
    :                                     'client';
    const root = ensureSuperAdminRoot(entity);
    const parent_id = targetType === 'client_of_partner' ? req.partner_id : root.id;
    node = createAccountNode(entity, {
      type: targetType,
      name: req.requester_name,
      parent_id,
      partner_id: targetType === 'client_of_partner' ? req.partner_id : null,
    });
    if (node) {
      req.requester_account_id = node.id;
      persistRequest(entity, req);
    }
  }

  // Step 3 · DELEGATE to product-variant-engine (which seeds card-entitlement).
  const tenantId = node?.id ?? `demo_${req.id}`;
  const result = assignVariantToTenant(variantEntity ?? entity, tenantId, req.assigned_variant_id);
  const entitlement_count = result?.entitlements.length ?? 0;

  // Step 4 · flip status → provisioned (status-track only — NO real spin-up)
  req.status = 'provisioned';
  req.provisioned_at = nowIso();
  persistRequest(entity, req);
  logAudit(entity, requestId, `provisioned (variant=${req.assigned_variant_id} · status-track only · Wave-2 for real spin-up)`);

  return { request: req, account_node: node, entitlement_count };
}

/**
 * Convert a `demo` request to `final_copy` — keeps the same variant + flips type.
 * Status is preserved (operator drives the subsequent provision flow).
 */
export function convertDemoToFinal(
  entity: string,
  requestId: string,
): ProvisionRequest | null {
  const req = getProvisionRequest(entity, requestId);
  if (!req) return null;
  if (req.type !== 'demo') return null;
  req.type = 'final_copy';
  persistRequest(entity, req);
  logAudit(entity, requestId, 'converted demo → final_copy');
  return req;
}

/* ─────────────────────────────────────────────────────────────────────── */
/* §7 · Lightweight audit trail (status-track only · Wave-2 = real audit)  */
/* ─────────────────────────────────────────────────────────────────────── */
export interface ProvisioningAuditRow {
  id: string;
  request_id: string;
  message: string;
  at: string;
}
const auditKey = (entity: string) => `tower_provisioning_audit_${entity}`;

export function logAudit(entity: string, requestId: string, message: string): void {
  const rows = readJSON<ProvisioningAuditRow[]>(auditKey(entity), []);
  rows.push({ id: rid('au'), request_id: requestId, message, at: nowIso() });
  writeJSON(auditKey(entity), rows.slice(-500));
}

export function listAudit(entity: string): ProvisioningAuditRow[] {
  return readJSON<ProvisioningAuditRow[]>(auditKey(entity), []);
}
