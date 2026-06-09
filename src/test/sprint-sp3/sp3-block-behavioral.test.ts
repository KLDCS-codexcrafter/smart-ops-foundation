/**
 * @file   src/test/sprint-sp3/sp3-block-behavioral.test.ts
 * @sprint SP.3 · T-SP3-Provisioning
 * @canon  Behavioral guardrails — 4-level hierarchy · 5 request types · guarded
 *         transitions · CONSUME product-variant-engine + partner-portal-engine +
 *         card-entitlement · Tier-L honest banner · non-forward-looking history.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  listAccountNodes,
  createAccountNode,
  ensureSuperAdminRoot,
  buildHierarchyTree,
  validateAccountNode,
  importPartnerClientsAsNodes,
  listProvisionRequests,
  createProvisionRequest,
  setRequestStatus,
  approveAndProvision,
  convertDemoToFinal,
  canTransition,
  listAudit,
} from '@/lib/provisioning-engine';
import {
  PROVISION_REQUEST_TYPES,
  PROVISION_STATUS_ORDER,
  ACCOUNT_NODE_TYPES,
  PROVISIONING_HONESTY,
  accountHierarchyKey,
  provisionRequestsKey,
} from '@/types/provisioning';
import {
  createVariant,
  publishVariant,
  listVariants,
} from '@/lib/product-variant-engine';
import {
  productVariantsKey,
  variantAssignmentKey,
  EMPTY_LIMIT_SET,
} from '@/types/product-variant';
import { cardEntitlementsKey, partnerCustomersKey, partnerProfileKey } from '@/types/card-entitlement';
import { getPartnerCustomers } from '@/lib/partner-portal-engine';
import { SPRINTS } from '@/lib/_institutional/sprint-history';

const ENTITY = 'test-entity-sp3';
const ROOT = path.resolve(__dirname, '../../..');

function readSrc(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function clearAll() {
  localStorage.removeItem(accountHierarchyKey(ENTITY));
  localStorage.removeItem(provisionRequestsKey(ENTITY));
  localStorage.removeItem(productVariantsKey(ENTITY));
  localStorage.removeItem(variantAssignmentKey(ENTITY));
  localStorage.removeItem(`tower_provisioning_audit_${ENTITY}`);
}

function makePublishedVariant(name = 'TestEdition') {
  const v = createVariant(ENTITY, {
    name, base_plan_tier: 'growth', product_kind: 'erp',
    enabled_cards: ['fincore', 'salesx'],
    enabled_modules: [], enabled_addons: [],
    limits: EMPTY_LIMIT_SET,
  });
  expect(v).toBeDefined();
  const p = publishVariant(ENTITY, v!.id);
  expect(p?.status).toBe('published');
  return p!;
}

describe('SP.3 · AccountNode 4-type hierarchy', () => {
  beforeEach(() => clearAll());

  it('exposes all 4 node types', () => {
    expect(ACCOUNT_NODE_TYPES).toEqual([
      'super_admin', 'channel_partner', 'client', 'client_of_partner',
    ]);
  });

  it('ensureSuperAdminRoot creates the root once and is idempotent', () => {
    const a = ensureSuperAdminRoot(ENTITY);
    const b = ensureSuperAdminRoot(ENTITY);
    expect(a.id).toBe(b.id);
    expect(listAccountNodes(ENTITY).filter((n) => n.type === 'super_admin')).toHaveLength(1);
  });

  it('validateAccountNode rejects non-root without parent', () => {
    const r = validateAccountNode([], { type: 'client', parent_id: null, partner_id: null });
    expect(r.ok).toBe(false);
  });

  it('validateAccountNode rejects second super_admin', () => {
    const root = ensureSuperAdminRoot(ENTITY);
    const r = validateAccountNode(listAccountNodes(ENTITY), {
      type: 'super_admin', parent_id: null, partner_id: null,
    });
    expect(r.ok).toBe(false);
    expect(root.type).toBe('super_admin');
  });

  it('client_of_partner requires partner_id pointing to a channel_partner', () => {
    const root = ensureSuperAdminRoot(ENTITY);
    const partner = createAccountNode(ENTITY, { type: 'channel_partner', name: 'P1', parent_id: root.id });
    expect(partner).toBeDefined();

    const noPartner = createAccountNode(ENTITY, {
      type: 'client_of_partner', name: 'CoP', parent_id: partner!.id,
    });
    expect(noPartner).toBeNull();

    const ok = createAccountNode(ENTITY, {
      type: 'client_of_partner', name: 'CoP', parent_id: partner!.id, partner_id: partner!.id,
    });
    expect(ok?.partner_id).toBe(partner!.id);
  });

  it('client_of_partner partner_id must reference channel_partner (not client)', () => {
    const root = ensureSuperAdminRoot(ENTITY);
    const client = createAccountNode(ENTITY, { type: 'client', name: 'C1', parent_id: root.id });
    const bad = createAccountNode(ENTITY, {
      type: 'client_of_partner', name: 'CoP', parent_id: root.id, partner_id: client!.id,
    });
    expect(bad).toBeNull();
  });

  it('buildHierarchyTree assembles super-admin → {direct client · channel-partner → CoP}', () => {
    const root = ensureSuperAdminRoot(ENTITY);
    createAccountNode(ENTITY, { type: 'client', name: 'Direct A', parent_id: root.id });
    const p = createAccountNode(ENTITY, { type: 'channel_partner', name: 'Partner X', parent_id: root.id });
    createAccountNode(ENTITY, {
      type: 'client_of_partner', name: 'CoP X1', parent_id: p!.id, partner_id: p!.id,
    });
    const tree = buildHierarchyTree(ENTITY);
    expect(tree?.type).toBe('super_admin');
    expect(tree?.children.map((c) => c.type).sort()).toEqual(['channel_partner', 'client']);
    const partnerSub = tree?.children.find((c) => c.type === 'channel_partner');
    expect(partnerSub?.children[0].type).toBe('client_of_partner');
  });
});

describe('SP.3 · importPartnerClientsAsNodes CONSUMES partner-portal', () => {
  beforeEach(() => clearAll());

  it('reads PartnerCustomers from partner-portal-engine (delegation · no duplicate store)', () => {
    const root = ensureSuperAdminRoot(ENTITY);
    const partner = createAccountNode(ENTITY, { type: 'channel_partner', name: 'KLDCS', parent_id: root.id });
    const customers = getPartnerCustomers(); // seeds KLDCS data on first read
    expect(customers.length).toBeGreaterThan(0);
    const result = importPartnerClientsAsNodes(ENTITY, partner!.id);
    expect(result.imported.length).toBe(customers.length);
    for (const n of result.imported) {
      expect(n.type).toBe('client_of_partner');
      expect(n.partner_id).toBe(partner!.id);
    }
  });

  it('is idempotent — second import skips already-present nodes', () => {
    const root = ensureSuperAdminRoot(ENTITY);
    const partner = createAccountNode(ENTITY, { type: 'channel_partner', name: 'KLDCS', parent_id: root.id });
    const first = importPartnerClientsAsNodes(ENTITY, partner!.id);
    const second = importPartnerClientsAsNodes(ENTITY, partner!.id);
    expect(second.imported.length).toBe(0);
    expect(second.skipped).toBe(first.imported.length);
  });

  it('rejects import against a non-partner node', () => {
    const root = ensureSuperAdminRoot(ENTITY);
    const client = createAccountNode(ENTITY, { type: 'client', name: 'X', parent_id: root.id });
    const r = importPartnerClientsAsNodes(ENTITY, client!.id);
    expect(r.imported).toEqual([]);
  });

  it('engine source greppably consumes getPartnerCustomers (no duplicate partner store)', () => {
    const src = readSrc('src/lib/provisioning-engine.ts');
    expect(src).toMatch(/getPartnerCustomers/);
    expect(src).not.toMatch(/partnerCustomersKey\(/);
    // sanity — partner key constant still lives in partner-portal types only
    expect(typeof partnerCustomersKey).toBe('function');
    expect(typeof partnerProfileKey).toBe('function');
  });
});

describe('SP.3 · ProvisionRequest 5 types + guarded transitions', () => {
  beforeEach(() => clearAll());

  it('exposes all 5 request types', () => {
    expect(PROVISION_REQUEST_TYPES).toEqual([
      'demo', 'final_copy', 'channel_partner', 'client', 'client_of_partner',
    ]);
  });

  it('createProvisionRequest seeds at status=requested', () => {
    const r = createProvisionRequest(ENTITY, { type: 'demo', requester_name: 'Acme' });
    expect(r.status).toBe('requested');
    expect(listProvisionRequests(ENTITY)).toHaveLength(1);
  });

  it('canTransition enforces forward-only stepping (no skipping)', () => {
    expect(canTransition('requested', 'approved')).toBe(true);
    expect(canTransition('approved', 'provisioned')).toBe(true);
    expect(canTransition('provisioned', 'active')).toBe(true);
    expect(canTransition('active', 'suspended')).toBe(true);
    expect(canTransition('suspended', 'active')).toBe(true);
    // skip moves forbidden
    expect(canTransition('requested', 'provisioned')).toBe(false);
    expect(canTransition('requested', 'active')).toBe(false);
    expect(canTransition('approved', 'active')).toBe(false);
    // backward forbidden
    expect(canTransition('provisioned', 'requested')).toBe(false);
  });

  it('setRequestStatus rejects skip transitions', () => {
    const r = createProvisionRequest(ENTITY, { type: 'client', requester_name: 'X' });
    expect(setRequestStatus(ENTITY, r.id, 'active')).toBeNull();
    expect(setRequestStatus(ENTITY, r.id, 'approved')).not.toBeNull();
  });

  it('status order constant matches canon', () => {
    expect(PROVISION_STATUS_ORDER).toEqual([
      'requested', 'approved', 'provisioned', 'active', 'suspended',
    ]);
  });
});

describe('SP.3 · approveAndProvision CONSUMES product-variant-engine', () => {
  beforeEach(() => clearAll());

  it('delegates to assignVariantToTenant + seeds card-entitlement (no in-engine fabrication)', () => {
    const v = makePublishedVariant('Provision-Edition');
    const req = createProvisionRequest(ENTITY, {
      type: 'client', requester_name: 'Acme India', assigned_variant_id: v.id,
    });
    const result = approveAndProvision(ENTITY, req.id);
    expect(result).not.toBeNull();
    expect(result!.request.status).toBe('provisioned');
    expect(result!.request.provisioned_at).not.toBeNull();
    expect(result!.account_node?.type).toBe('client');
    expect(result!.entitlement_count).toBeGreaterThan(0);
    // tenant entitlements persisted under card-entitlement's key (delegation proof)
    const tenantId = result!.account_node!.id;
    const raw = localStorage.getItem(cardEntitlementsKey(tenantId));
    expect(raw).not.toBeNull();
    const ents = JSON.parse(raw!);
    expect(Array.isArray(ents)).toBe(true);
    expect(ents.length).toBeGreaterThan(0);
  });

  it('refuses to provision without an assigned variant', () => {
    const req = createProvisionRequest(ENTITY, { type: 'client', requester_name: 'NoVar' });
    expect(approveAndProvision(ENTITY, req.id)).toBeNull();
  });

  it('engine greppably delegates to assignVariantToTenant (no real instance spin-up)', () => {
    const src = readSrc('src/lib/provisioning-engine.ts');
    expect(src).toMatch(/assignVariantToTenant/);
    // honesty: no fabricated runtime spin-up
    expect(src).not.toMatch(/spinUpInstance|startTenantRuntime|provisionRealInstance/);
    expect(src).not.toMatch(/enforceLimit/);
    expect(src).not.toMatch(/chargeBilling|invoice\.create/);
  });

  it('emits audit rows on approve + provision', () => {
    const v = makePublishedVariant();
    const req = createProvisionRequest(ENTITY, {
      type: 'client', requester_name: 'AuditCo', assigned_variant_id: v.id,
    });
    approveAndProvision(ENTITY, req.id);
    const audit = listAudit(ENTITY);
    expect(audit.length).toBeGreaterThan(0);
    expect(audit.some((a) => /approved/.test(a.message))).toBe(true);
    expect(audit.some((a) => /provisioned/.test(a.message))).toBe(true);
  });
});

describe('SP.3 · convertDemoToFinal', () => {
  beforeEach(() => clearAll());

  it('flips demo → final_copy preserving variant', () => {
    const v = makePublishedVariant();
    const req = createProvisionRequest(ENTITY, {
      type: 'demo', requester_name: 'TrialAcme', assigned_variant_id: v.id,
    });
    const updated = convertDemoToFinal(ENTITY, req.id);
    expect(updated?.type).toBe('final_copy');
    expect(updated?.assigned_variant_id).toBe(v.id);
  });

  it('refuses to convert non-demo requests', () => {
    const req = createProvisionRequest(ENTITY, { type: 'client', requester_name: 'X' });
    expect(convertDemoToFinal(ENTITY, req.id)).toBeNull();
  });
});

describe('SP.3 · Honest banner + walls (Tier-L)', () => {
  it('PROVISIONING_HONESTY mentions Wave-2 + spin-up + billing', () => {
    expect(PROVISIONING_HONESTY).toMatch(/Wave-2/);
    expect(PROVISIONING_HONESTY).toMatch(/spin-up/i);
    expect(PROVISIONING_HONESTY).toMatch(/billing/i);
  });

  it('Manager page renders the Wave-2 banner', () => {
    const src = readSrc('src/pages/tower/ProvisioningManager.tsx');
    expect(src).toContain('PROVISIONING_HONESTY');
  });

  it('product-variant-engine 0-DIFF — provisioning-engine never mutates its exports', () => {
    const src = readSrc('src/lib/provisioning-engine.ts');
    expect(src).not.toMatch(/assignVariantToTenant\s*=/);
    expect(src).not.toMatch(/createVariant\s*=/);
  });

  it('partner-portal-engine 0-DIFF — provisioning-engine consumes read-only', () => {
    const src = readSrc('src/lib/provisioning-engine.ts');
    expect(src).not.toMatch(/getPartnerCustomers\s*=/);
    expect(src).not.toMatch(/registerDeal\s*=/);
  });

  it('card-entitlement seedDemoEntitlements is NOT re-implemented here', () => {
    const src = readSrc('src/lib/provisioning-engine.ts');
    expect(src).not.toMatch(/seedDemoEntitlements\s*=/);
    expect(src).not.toMatch(/function seedDemoEntitlements/);
  });

  it('Tower Tenants page 0-DIFF — no tenant store mutations from provisioning-engine', () => {
    const src = readSrc('src/lib/provisioning-engine.ts');
    expect(src).not.toMatch(/INITIAL_TENANTS/);
  });
});

describe('SP.3 · Sprint history rows (non-forward-looking)', () => {
  it('SP.2 row is flipped to predecessor SHA 9a17efe6 (banked)', () => {
    const sp2 = SPRINTS.find((s) => s.code === 'T-SP2-Prudent360-ERP');
    expect(sp2?.headSha).toBe('9a17efe6');
  });

  it('SP.3 row exists with predecessorSha 9a17efe6 + provisioning-engine sibling', () => {
    const sp3 = SPRINTS.find((s) => s.code === 'T-SP3-Provisioning');
    expect(sp3).toBeDefined();
    expect(sp3?.predecessorSha).toBe('9a17efe6');
    expect(sp3?.newSiblings).toContain('provisioning-engine');
  });

  it('history maintains a stable banked floor (non-forward-looking)', () => {
    expect(SPRINTS.length).toBeGreaterThanOrEqual(5);
    expect(SPRINTS.some((s) => s.code === 'T-SP1-Variant-Builder')).toBe(true);
    expect(SPRINTS.some((s) => s.code === 'T-SP2-Prudent360-ERP')).toBe(true);
  });
});
