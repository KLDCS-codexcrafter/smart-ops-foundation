/**
 * @file        src/test/sprint-cln1/cln1-block-behavioral.test.ts
 * @sprint      T-CLN1-Wave1-Cleanups · house posture · ≥20 it()
 * @purpose     Behavioral checks for the 3 cleanup items:
 *              1) B25 part-no search reads existing item master
 *              2) Welcome.tsx MOCK_TICKETS + dead button removed
 *              3) ProductionConfig flag expansion wires REAL keys
 *              Plus §H guard checks (walls 0-DIFF) + history flip.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { filterByPartNo } from '@/pages/erp/inventory/PartNoSearch';
import { DEFAULT_PRODUCTION_CONFIG } from '@/pages/erp/accounting/ComplianceSettingsAutomation.constants';
import type { InventoryItem } from '@/types/inventory-item';
import { SPRINTS } from '@/lib/_institutional/sprint-history';

const root = resolve(__dirname, '..', '..', '..');
const readSrc = (rel: string) => readFileSync(resolve(root, rel), 'utf8');

const sampleItem = (over: Partial<InventoryItem>): InventoryItem => ({
  id: over.id ?? 'i1',
  code: over.code ?? 'PRT-001',
  auto_code: false,
  name: over.name ?? 'Sample',
  item_type: 'Raw Material',
  category_type: 'standard',
  stock_nature: 'Inventory',
  use_for: 'general',
  tax_category: 'standard',
  itc_eligible: true,
  rcm_applicable: false,
  tcs_applicable: false,
  tds_applicable: false,
  supply_type: 'goods',
  ...over,
} as InventoryItem);

const items: InventoryItem[] = [
  sampleItem({ id: 'i1', code: 'PRT-001', name: 'M8 Stainless Bolt', short_name: 'BLT-M8', hsn_sac_code: '7318' }),
  sampleItem({ id: 'i2', code: 'PRT-002', name: 'Aluminium Sheet 2mm', hsn_sac_code: '7606' }),
  sampleItem({ id: 'i3', code: 'CMP-019', name: 'Copper Wire 10A', short_name: 'CU-10' }),
];

describe('CLN1 · Item 1 · B25 part-no search', () => {
  it('returns empty array for empty query (no fabrication)', () => {
    expect(filterByPartNo(items, '')).toEqual([]);
    expect(filterByPartNo(items, '   ')).toEqual([]);
  });

  it('matches by exact part-no (item code)', () => {
    const r = filterByPartNo(items, 'PRT-001');
    expect(r).toHaveLength(1);
    expect(r[0].id).toBe('i1');
  });

  it('matches by partial part-no (case-insensitive)', () => {
    expect(filterByPartNo(items, 'prt').map(r => r.id)).toEqual(['i1', 'i2']);
  });

  it('matches by short_name', () => {
    expect(filterByPartNo(items, 'cu-10').map(r => r.id)).toEqual(['i3']);
  });

  it('matches by HSN', () => {
    expect(filterByPartNo(items, '7606').map(r => r.id)).toEqual(['i2']);
  });

  it('matches by item name', () => {
    expect(filterByPartNo(items, 'copper').map(r => r.id)).toEqual(['i3']);
  });

  it('honest empty on no match (no invented results)', () => {
    expect(filterByPartNo(items, 'zzz-no-such-part')).toEqual([]);
  });

  it('does NOT mutate the source items array', () => {
    const before = JSON.stringify(items);
    filterByPartNo(items, 'prt');
    expect(JSON.stringify(items)).toBe(before);
  });

  it('exposes PartNoSearchPanel without requiring new item-store mutations', () => {
    const src = readSrc('src/pages/erp/inventory/PartNoSearch.tsx');
    // Reads via useInventoryItems hook only — no createItem/updateItem/deleteItem calls
    expect(src).toMatch(/useInventoryItems\(\)/);
    expect(src).not.toMatch(/\bcreateItem\b|\bupdateItem\b|\bdeleteItem\b/);
  });

  it('is reachable as a sidebar module in Inventory hub', () => {
    const types = readSrc('src/pages/erp/inventory/MainStoreHubSidebar.types.ts');
    const sidebar = readSrc('src/pages/erp/inventory/MainStoreHubSidebar.tsx');
    const router = readSrc('src/pages/erp/inventory/MainStoreHubPage.tsx');
    expect(types).toContain("'r-part-no-search'");
    expect(sidebar).toContain("'r-part-no-search'");
    expect(router).toContain("case 'r-part-no-search'");
  });
});

describe('CLN1 · Item 2 · /welcome mock-ticket T-fix', () => {
  const welcome = readSrc('src/pages/Welcome.tsx');

  it('removes the dead "backend pending" toast button', () => {
    expect(welcome).not.toMatch(/backend pending/);
  });

  it('removes the MOCK_TICKETS constant declaration', () => {
    expect(welcome).not.toMatch(/const MOCK_TICKETS\s*[:=]/);
  });

  it('removes the SupportTicket interface', () => {
    expect(welcome).not.toMatch(/interface SupportTicket\b/);
  });

  it('has no orphaned MOCK_TICKETS references anywhere', () => {
    expect(welcome).not.toMatch(/MOCK_TICKETS/);
  });

  it('redirects the Support tab to /erp/servicedesk', () => {
    expect(welcome).toMatch(/\/erp\/servicedesk/);
  });

  it('keeps the workspace + server-ops sections intact (0-DIFF guard)', () => {
    expect(welcome).toMatch(/function WorkspaceTab/);
    expect(welcome).toMatch(/function ServerOpsTab/);
    expect(welcome).toMatch(/MOCK_TENANTS/); // server-ops mock data preserved
  });
});

describe('CLN1 · Item 3 · ProductionConfig flag expansion', () => {
  const panel = readSrc('src/pages/erp/accounting/ProductionConfigAutomation.tsx');

  it('wires previously-unwired flags from the real ProductionConfig type', () => {
    const keys = [
      'enableMachineCostAllocation',
      'enableShiftLinkage',
      'enableOperatorAssignment',
      'enableContractWorkerAssignment',
      'enableMachineAssignment',
      'enableMRA',
      'defaultBOMVersion',
      'defaultPlanningHorizonDays',
      'includePendingPurchaseOrders',
      'includeSalesPlan',
      'includeProductionPlan',
      'considerSafetyStock',
      'enforceProjectIdForETO',
      'enforceCustomerIdForContractMfg',
      'enforceBusinessUnitForMultiBU',
      'enableExportProductionTracking',
      'productionDepartmentVisibility',
      'hideCostsFromOperators',
      'requireApprovalForRelease',
      'approvalThreshold',
      'enableMobileCapture',
      'enableShiftBasedCapture',
      'enablePhotoCapture',
      'defaultPrintFormat',
      'printFooterText',
      'defaultProjectCentreId',
      'enableITC04Export',
    ];
    for (const k of keys) {
      expect(panel, `flag ${k} not wired in panel`).toMatch(new RegExp(`['"\`]${k}['"\`]`));
    }
  });

  it('does NOT invent flags that do not exist on the ProductionConfig type', () => {
    const allowedKeys = new Set(Object.keys(DEFAULT_PRODUCTION_CONFIG));
    const referenced = Array.from(panel.matchAll(/(?:sw|update)\(\s*'([a-zA-Z]+)'/g)).map(m => m[1]);
    const unknown = referenced.filter(k => !allowedKeys.has(k));
    expect(unknown, `unknown keys: ${unknown.join(', ')}`).toEqual([]);
  });

  it('removes the legacy "TODO 3a-pre-2 expand to all 52 flags" note', () => {
    expect(panel).not.toMatch(/TODO 3a-pre-2 expand to all 52 flags/);
  });

  it('preserves the existing 6-pattern Master Gate section (0-DIFF guard)', () => {
    expect(panel).toMatch(/Master Gate · 6 Patterns/);
    expect(panel).toMatch(/enableProduction/);
  });
});

describe('CLN1 · §H walls + history', () => {
  it('ApprovalsInboxPage.tsx is NOT touched by CLN1 (dropped scope item)', () => {
    const src = readSrc('src/pages/erp/approvals/ApprovalsInboxPage.tsx');
    // Confirms the eslint-disables remain intact — they are working code per founder ruling.
    expect(src).toMatch(/eslint-disable/);
  });

  it('inventory item store (useInventoryItems) is 0-DIFF (no new mutators)', () => {
    const src = readSrc('src/hooks/useInventoryItems.ts');
    expect(src).toMatch(/createItem/);
    expect(src).toMatch(/updateItem/);
    expect(src).toMatch(/deleteItem/);
  });

  it('ProductionConfig store core remains untouched (DEFAULT_PRODUCTION_CONFIG shape)', () => {
    expect(DEFAULT_PRODUCTION_CONFIG.enableProduction).toBe(true);
    expect(typeof DEFAULT_PRODUCTION_CONFIG.defaultBOMVersion).toBe('number');
  });

  it('history flip: VP-GAPS row now carries cca094bd headSha', () => {
    const vpg = SPRINTS.find(s => s.code === 'T-VPG-VendorPortal-Gaps');
    expect(vpg?.headSha).toBe('cca094bd');
  });

  it('history append: CLN1 row exists with predecessorSha cca094bd + empty newSiblings', () => {
    const cln1 = SPRINTS.find(s => s.code === 'T-CLN1-Wave1-Cleanups');
    expect(cln1).toBeDefined();
    expect(cln1?.predecessorSha).toBe('cca094bd');
    expect(cln1?.newSiblings).toEqual([]);
  });
});
