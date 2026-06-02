/**
 * @file        src/test/sprint-105/intercompany-group-structure.test.ts
 * @sprint      Sprint 105 · T-Phase-6.C.1.1 · Arc 2 OPENER · Pillar C.1
 * @purpose     Verify Intercompany Group Structure Engine + Page · §H 0-DIFF on
 *              mock-entities · DP-A2-1 side-store wrap · DP-A2-9 scope wall ·
 *              FR-44 no-dup · audit type group_structure_change.
 * @form-A      ≥28 discrete it() blocks (v1.30 §N).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

import {
  CONSOLIDATION_METHODS,
  GROUP_RELATIONSHIPS,
  GROUP_STRUCTURE_KEY,
  READS_FROM,
  CONTROL_THRESHOLD_PCT,
  SIGNIFICANT_INFLUENCE_FLOOR_PCT,
  deleteGroupStructure,
  getGroupStructure,
  getGroupTree,
  listGroupStructure,
  recommendConsolidationMethod,
  upsertGroupStructure,
  type GroupStructureNode,
} from '@/lib/intercompany-group-structure-engine';
import * as engine from '@/lib/intercompany-group-structure-engine';
import { MOCK_ENTITIES } from '@/data/mock-entities';
import type { AuditEntityType } from '@/types/audit-trail';
import { auditTrailKey } from '@/types/audit-trail';
import { getSiblingCount, SIBLINGS } from '@/lib/_institutional/sibling-register';
import { SPRINTS } from '@/lib/_institutional/sprint-history';

const ENG_PATH = path.resolve(__dirname, '../../lib/intercompany-group-structure-engine.ts');
const PAGE_PATH = path.resolve(
  __dirname,
  '../../features/intercompany/IntercompanyGroupStructurePage.tsx',
);
const CC_PATH = path.resolve(
  __dirname,
  '../../features/command-center/pages/CommandCenterPage.tsx',
);
const SIDEBAR_PATH = path.resolve(
  __dirname,
  '../../apps/erp/configs/command-center-sidebar-config.ts',
);
const MOCK_ENTITIES_PATH = path.resolve(__dirname, '../../data/mock-entities.ts');
const AUDIT_TYPES_PATH = path.resolve(__dirname, '../../types/audit-trail.ts');
const COMPLIANCE_MODULE_PATH = path.resolve(
  __dirname,
  '../../pages/erp/comply360/Comply360Sidebar.types.ts',
);

const ENGINE_SRC = fs.readFileSync(ENG_PATH, 'utf8');
const PAGE_SRC = fs.readFileSync(PAGE_PATH, 'utf8');
const CC_SRC = fs.readFileSync(CC_PATH, 'utf8');
const SIDEBAR_SRC = fs.readFileSync(SIDEBAR_PATH, 'utf8');
const MOCK_ENTITIES_SRC = fs.readFileSync(MOCK_ENTITIES_PATH, 'utf8');
const AUDIT_TYPES_SRC = fs.readFileSync(AUDIT_TYPES_PATH, 'utf8');
const COMPLIANCE_MODULE_SRC = fs.readFileSync(COMPLIANCE_MODULE_PATH, 'utf8');

const PARENT_ID = MOCK_ENTITIES[0].id;
const SUB_ID = MOCK_ENTITIES[1].id;
const BRANCH_ID = MOCK_ENTITIES[2].id;

function resetStores(): void {
  localStorage.clear();
}

function baseNode(overrides: Partial<GroupStructureNode> = {}): GroupStructureNode {
  return {
    entity_id: SUB_ID,
    parent_entity_id: PARENT_ID,
    relationship: 'subsidiary',
    ownership_pct: 80,
    consolidation_method: 'full',
    effective_from: '2026-04-01',
    ...overrides,
  };
}

describe('Sprint 105 · intercompany-group-structure-engine · API surface', () => {
  beforeEach(resetStores);

  it('exposes CONSOLIDATION_METHODS as the 3 Ind AS methods', () => {
    expect([...CONSOLIDATION_METHODS]).toEqual(['full', 'proportional', 'equity']);
  });

  it('exposes the 5 GROUP_RELATIONSHIPS', () => {
    expect([...GROUP_RELATIONSHIPS]).toEqual([
      'parent', 'subsidiary', 'branch', 'joint_venture', 'associate',
    ]);
  });

  it('READS_FROM declares mock-entities provenance (FR-44 disclosure)', () => {
    expect(READS_FROM.mockEntities).toMatch(/mock-entities/);
    expect(READS_FROM.mockEntities).toMatch(/loadEntities/);
    expect(READS_FROM.sideStore).toMatch(/erp_group_structure/);
  });

  it('side-store key is erp_group_structure (voucher-org-tag pattern)', () => {
    expect(GROUP_STRUCTURE_KEY).toBe('erp_group_structure');
  });

  it('Ind AS thresholds exported (control >50%, significant influence >=20%)', () => {
    expect(CONTROL_THRESHOLD_PCT).toBe(50);
    expect(SIGNIFICANT_INFLUENCE_FLOOR_PCT).toBe(20);
  });
});

describe('Sprint 105 · §H 0-DIFF on mock-entities (DP-A2-1 side-store wrap)', () => {
  it('engine imports loadEntities from mock-entities (READ ONLY)', () => {
    expect(ENGINE_SRC).toMatch(/import\s*{\s*loadEntities/);
  });

  it('engine never imports a mock-entities mutator (no save/write/update import)', () => {
    expect(ENGINE_SRC).not.toMatch(/from\s+['"]@\/data\/mock-entities['"][^;]*\b(save|write|update|set|persist)/i);
  });

  it('mock-entities.ts exposes no mutator export (§H frozen shape)', () => {
    // Only export const MOCK_ENTITIES / getPrimaryEntity / loadEntities.
    const mutatorMatches = MOCK_ENTITIES_SRC.match(/export\s+(?:function|const)\s+(save|update|persist|set)\w*/gi);
    expect(mutatorMatches).toBeNull();
  });

  it('engine source contains zero references to mock-entities mutation helpers', () => {
    expect(ENGINE_SRC).not.toMatch(/mock-entities['"][^)]*\.\s*(save|write|update|set)/i);
  });
});

describe('Sprint 105 · CRUD round-trip + idempotency (keyed by entity_id)', () => {
  beforeEach(resetStores);

  it('upsertGroupStructure persists a node read back by getGroupStructure', () => {
    const saved = upsertGroupStructure(baseNode());
    expect(saved.entity_id).toBe(SUB_ID);
    const read = getGroupStructure(SUB_ID);
    expect(read).not.toBeNull();
    expect(read?.ownership_pct).toBe(80);
  });

  it('listGroupStructure returns all saved nodes', () => {
    upsertGroupStructure(baseNode({ entity_id: SUB_ID }));
    upsertGroupStructure(baseNode({ entity_id: BRANCH_ID, parent_entity_id: PARENT_ID, relationship: 'branch', ownership_pct: 100 }));
    expect(listGroupStructure()).toHaveLength(2);
  });

  it('upsert is idempotent · second upsert on same entity_id REPLACES (no dup)', () => {
    upsertGroupStructure(baseNode({ ownership_pct: 70 }));
    upsertGroupStructure(baseNode({ ownership_pct: 75 }));
    const all = listGroupStructure().filter((n) => n.entity_id === SUB_ID);
    expect(all).toHaveLength(1);
    expect(all[0].ownership_pct).toBe(75);
  });

  it('deleteGroupStructure removes the row and returns true', () => {
    upsertGroupStructure(baseNode());
    expect(deleteGroupStructure(SUB_ID)).toBe(true);
    expect(getGroupStructure(SUB_ID)).toBeNull();
  });

  it('deleteGroupStructure on missing entity returns false', () => {
    expect(deleteGroupStructure('does-not-exist')).toBe(false);
  });
});

describe('Sprint 105 · entity_id FK validation (rejects orphans)', () => {
  beforeEach(resetStores);

  it('throws when entity_id is not in loadEntities()', () => {
    expect(() => upsertGroupStructure(baseNode({ entity_id: 'orphan-xyz' }))).toThrow(/orphan/i);
  });

  it('throws when parent_entity_id is set but not in loadEntities()', () => {
    expect(() =>
      upsertGroupStructure(baseNode({ parent_entity_id: 'ghost-parent' })),
    ).toThrow(/orphan|not in loadEntities/i);
  });

  it('throws when parent_entity_id equals entity_id (cycle)', () => {
    expect(() => upsertGroupStructure(baseNode({ parent_entity_id: SUB_ID }))).toThrow(
      /parent_entity_id must differ/i,
    );
  });

  it('throws on ownership_pct outside 0..100', () => {
    expect(() => upsertGroupStructure(baseNode({ ownership_pct: -1 }))).toThrow(/0–100|ownership_pct/);
    expect(() => upsertGroupStructure(baseNode({ ownership_pct: 150 }))).toThrow(/0–100|ownership_pct/);
  });

  it('throws on invalid effective_from', () => {
    expect(() => upsertGroupStructure(baseNode({ effective_from: 'not-a-date' }))).toThrow(/effective_from/);
  });
});

describe('Sprint 105 · recommendConsolidationMethod across Ind AS bands', () => {
  it('subsidiary at any % → full (Ind AS 110)', () => {
    expect(recommendConsolidationMethod(51, 'subsidiary')).toBe('full');
  });

  it('parent → full', () => {
    expect(recommendConsolidationMethod(100, 'parent')).toBe('full');
  });

  it('branch → full (integral)', () => {
    expect(recommendConsolidationMethod(100, 'branch')).toBe('full');
  });

  it('joint_venture → proportional (Ind AS 111)', () => {
    expect(recommendConsolidationMethod(50, 'joint_venture')).toBe('proportional');
  });

  it('associate → equity (Ind AS 28)', () => {
    expect(recommendConsolidationMethod(25, 'associate')).toBe('equity');
  });

  it('ownership 20-50% with associate relationship → equity', () => {
    for (const pct of [20, 30, 40, 50]) {
      expect(recommendConsolidationMethod(pct, 'associate')).toBe('equity');
    }
  });

  it('ownership >50% with subsidiary relationship → full across band', () => {
    for (const pct of [51, 75, 100]) {
      expect(recommendConsolidationMethod(pct, 'subsidiary')).toBe('full');
    }
  });
});

describe('Sprint 105 · getGroupTree builds correct parent→children', () => {
  beforeEach(resetStores);

  it('returns one row per loadEntities() entity', () => {
    const tree = getGroupTree();
    expect(tree.map((r) => r.entity.id).sort()).toEqual(MOCK_ENTITIES.map((e) => e.id).sort());
  });

  it('untagged entities have node === null', () => {
    const tree = getGroupTree();
    expect(tree.every((r) => r.node === null)).toBe(true);
  });

  it('children list reflects parent_entity_id pointers', () => {
    upsertGroupStructure(baseNode({ entity_id: SUB_ID, parent_entity_id: PARENT_ID }));
    upsertGroupStructure(
      baseNode({ entity_id: BRANCH_ID, parent_entity_id: PARENT_ID, relationship: 'branch', ownership_pct: 100 }),
    );
    const tree = getGroupTree();
    const parentRow = tree.find((r) => r.entity.id === PARENT_ID)!;
    expect(parentRow.children.sort()).toEqual([SUB_ID, BRANCH_ID].sort());
  });
});

describe('Sprint 105 · DP-A2-9 scope wall (structure only · no consolidation)', () => {
  it('engine exposes NO consolidated statement / elimination function', () => {
    const exportNames = Object.keys(engine);
    const forbidden = exportNames.filter((k) =>
      /consolidate|consolidated|eliminat|goodwill|nci|minority|multiCurrency|fx|profitAndLoss|balanceSheet|cashflow/i.test(k),
    );
    expect(forbidden).toEqual([]);
  });

  it('engine source contains no FX / multi-currency token', () => {
    expect(ENGINE_SRC).not.toMatch(/\b(fxRate|currencyConversion|translate(Balance|Equity))\b/);
  });
});

describe('Sprint 105 · audit type group_structure_change', () => {
  beforeEach(resetStores);

  it('audit-trail.ts AuditEntityType union includes group_structure_change', () => {
    expect(AUDIT_TYPES_SRC).toMatch(/'group_structure_change'/);
  });

  it("logs a 'create' audit entry on first upsert", () => {
    upsertGroupStructure(baseNode());
    const raw = localStorage.getItem(auditTrailKey(SUB_ID));
    const entries = raw ? JSON.parse(raw) : [];
    const types: AuditEntityType[] = entries.map((e: { entity_type: AuditEntityType }) => e.entity_type);
    expect(types).toContain('group_structure_change' as AuditEntityType);
    expect(entries.some((e: { action: string }) => e.action === 'create')).toBe(true);
  });

  it("logs an 'update' audit entry on second upsert (same entity_id)", () => {
    upsertGroupStructure(baseNode({ ownership_pct: 60 }));
    upsertGroupStructure(baseNode({ ownership_pct: 65 }));
    const entries = JSON.parse(localStorage.getItem(auditTrailKey(SUB_ID)) ?? '[]');
    expect(entries.some((e: { action: string }) => e.action === 'update')).toBe(true);
  });

  it('Comply360 ComplianceModule union is UNTOUCHED (no group_structure_change)', () => {
    expect(COMPLIANCE_MODULE_SRC).not.toMatch(/group_structure_change|intercompany/i);
  });
});

describe("Sprint 105 · page wiring (Standalone Page #34 · NOT a sibling)", () => {
  it('IntercompanyGroupStructurePage file exists', () => {
    expect(fs.existsSync(PAGE_PATH)).toBe(true);
  });

  it('page imports the engine (reads · no dead UI)', () => {
    expect(PAGE_SRC).toMatch(/from ['"]@\/lib\/intercompany-group-structure-engine['"]/);
    expect(PAGE_SRC).toMatch(/getGroupTree|upsertGroupStructure|recommendConsolidationMethod/);
  });

  it('CommandCenterPage registers fincore-intercompany-group-structure case', () => {
    expect(CC_SRC).toMatch(/case 'fincore-intercompany-group-structure'\s*:\s*return\s*<IntercompanyGroupStructurePage/);
  });

  it('sidebar exposes the page as type:item with requiredCards:[command-center]', () => {
    expect(SIDEBAR_SRC).toMatch(/fincore-intercompany-group-structure/);
    expect(SIDEBAR_SRC).toMatch(/type:\s*'item'[\s\S]{0,160}fincore-intercompany-group-structure|fincore-intercompany-group-structure[\s\S]{0,160}type:\s*'item'/);
    expect(SIDEBAR_SRC).toMatch(/requiredCards:\s*\['command-center'\][\s\S]{0,200}fincore-intercompany-group-structure|fincore-intercompany-group-structure[\s\S]{0,200}requiredCards:\s*\['command-center'\]/);
  });
});

describe('Sprint 105 · sibling-register + sprint-history', () => {
  it('sibling-count >= 173 (172 → 173 · floored S110 T1 lesson)', () => {
    expect(getSiblingCount()).toBeGreaterThanOrEqual(173);
  });

  it('intercompany-group-structure-engine id appears exactly once in register', () => {
    const matches = SIBLINGS.filter((s) => s.id === 'intercompany-group-structure-engine');
    expect(matches).toHaveLength(1);
    expect(matches[0].provenance).toBe('CONFIRMED');
    expect(matches[0].path).toBe('src/lib/intercompany-group-structure-engine.ts');
  });

  it('comply360-tier2 register entry remains exactly 1', () => {
    const matches = SIBLINGS.filter((s) => s.id === 'comply360-tier2-extensions-engine');
    expect(matches).toHaveLength(1);
  });

  it('sprint-history S105 entry exists with correct shape', () => {
    const s105 = SPRINTS.find((s) => s.sprintNumber === 105);
    expect(s105).toBeDefined();
    expect(s105?.code).toBe('T-Phase-6.C.1.1');
    expect(s105?.predecessorSha).toBe('e59f1ecf246f4891d5efdd248b1b19aee8c921ef');
    expect(s105?.newSiblings).toEqual(['intercompany-group-structure-engine']);
  });

  it('S104 SHA backfilled (was TBD_AT_BANK)', () => {
    const s104 = SPRINTS.find((s) => s.sprintNumber === 104);
    expect(s104?.headSha).toBe('e59f1ecf246f4891d5efdd248b1b19aee8c921ef');
  });
});
