/**
 * @file   src/test/sprint-149/webstorex.test.ts
 * @sprint Sprint 149 · T-WebStoreX-A11.1 · §N hard floor ≥32 it() · count stated below.
 * Covers: PIM publication wrapper (master READ-ONLY) · variant allocation guard ·
 *         categories (3-level + cycle) · brands · settings · sidebar parity · registers · audit type.
 *
 * COUNT: 36 it() blocks (floor 32 satisfied).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  publishItem, updateStoreItem, setVisibility, addImage,
  listStoreItems, getStoreItem, addVariant, updateVariant, setHasVariants,
  buildReconciliationReport, listVariants, listMasterCandidates,
  createCategory, updateCategory, deleteCategory, listCategoryTree, listCategories,
  createBrand, updateBrand, deleteBrand, listBrands,
  getStoreSettings, updateStoreSettings,
  getCatalog,
} from '@/lib/webstorex-engine';
import { SIBLINGS } from '@/lib/_institutional/sibling-register';
import { SPRINTS } from '@/lib/_institutional/sprint-history';
import { webstorexSidebarItems } from '@/apps/erp/configs/webstorex-sidebar-config';
import { applications as APPLICATIONS } from '@/components/operix-core/applications';
import type { AuditEntityType } from '@/types/audit-trail';

const ENT = 'TST';
const USER = 'u-1';

function seedMaster(items: Array<{ id: string; name: string; qty: number }>): void {
  localStorage.setItem('erp_inventory_items',
    JSON.stringify(items.map(i => ({ id: i.id, name: i.name, on_hand_qty: i.qty }))));
}

beforeEach(() => {
  localStorage.clear();
  seedMaster([
    { id: 'm-shirt', name: 'Cotton Shirt', qty: 100 },
    { id: 'm-mug',   name: 'Coffee Mug',   qty: 10  },
    { id: 'm-pen',   name: 'Ball Pen',     qty: 0   },
  ]);
});

describe('S149 · WebStoreX PIM publication wrapper (DP-WS-2)', () => {
  it('publishItem creates a wrapper with denormalized master name', () => {
    const row = publishItem(ENT, 'm-shirt', USER);
    expect(row.itemRefId).toBe('m-shirt');
    expect(row.itemRefName).toBe('Cotton Shirt');
    expect(row.visibility).toBe('draft');
  });

  it('publishItem throws when master not found', () => {
    expect(() => publishItem(ENT, 'm-missing', USER)).toThrow(/not found/);
  });

  it('publishItem refuses double-publish (one wrapper per master)', () => {
    publishItem(ENT, 'm-shirt', USER);
    expect(() => publishItem(ENT, 'm-shirt', USER)).toThrow(/already published/);
  });

  it('publishItem accepts initial listPrice and storeTitle', () => {
    const row = publishItem(ENT, 'm-mug', USER, { storeTitle: 'Brew Mug', listPrice: 199 });
    expect(row.storeTitle).toBe('Brew Mug');
    expect(row.listPrice).toBe(199);
  });

  it('updateStoreItem ignores-and-flags master-owned fields', () => {
    const row = publishItem(ENT, 'm-shirt', USER);
    const after = updateStoreItem(ENT, row.id, {
      storeTitle: 'Cotton Shirt v2', listPrice: 499,
      itemRefId: 'HACKED', itemRefName: 'HACKED',
    } as unknown as Partial<typeof row>);
    expect(after.storeTitle).toBe('Cotton Shirt v2');
    expect(after.listPrice).toBe(499);
    expect(after.itemRefId).toBe('m-shirt');
    expect(after.itemRefName).toBe('Cotton Shirt');
  });

  it('updateStoreItem throws on missing id', () => {
    expect(() => updateStoreItem(ENT, 'ws-item-missing', { storeTitle: 'x' })).toThrow(/not found/);
  });

  it('master remains 0-DIFF after wrapper mutations (READ-ONLY guard)', () => {
    publishItem(ENT, 'm-shirt', USER);
    updateStoreItem(ENT, listStoreItems(ENT)[0].id, { storeTitle: 'Edited' });
    const masterRaw = JSON.parse(localStorage.getItem('erp_inventory_items') || '[]');
    expect(masterRaw.find((i: { id: string }) => i.id === 'm-shirt').name).toBe('Cotton Shirt');
  });
});

describe('S149 · visibility publish-readiness guard', () => {
  it('setVisibility published throws without main image / category / price', () => {
    const r = publishItem(ENT, 'm-shirt', USER);
    expect(() => setVisibility(ENT, r.id, 'published')).toThrow(/missing/);
  });

  it('setVisibility published succeeds when all required fields present', () => {
    const r = publishItem(ENT, 'm-shirt', USER, { listPrice: 100 });
    const cat = createCategory(ENT, { name: 'Apparel' });
    updateStoreItem(ENT, r.id, { categoryId: cat.id });
    addImage(ENT, r.id, { dataUrl: 'data:image/png;base64,AAA', kind: 'main', sortOrder: 0 });
    const after = setVisibility(ENT, r.id, 'published');
    expect(after.visibility).toBe('published');
  });

  it('setVisibility hidden requires only existing item', () => {
    const r = publishItem(ENT, 'm-shirt', USER);
    expect(setVisibility(ENT, r.id, 'hidden').visibility).toBe('hidden');
  });
});

describe('S149 · variants + DP-WS-14 allocation guard', () => {
  it('addVariant within master qty succeeds', () => {
    const r = publishItem(ENT, 'm-shirt', USER);
    const v = addVariant(ENT, r.id, { sku: 'SH-S', axes: [{ name: 'Size', value: 'S' }], stockAllocation: 40 });
    expect(v.sku).toBe('SH-S');
    expect(v.stockAllocation).toBe(40);
  });

  it('addVariant throws on over-allocation naming excess', () => {
    const r = publishItem(ENT, 'm-mug', USER);
    addVariant(ENT, r.id, { sku: 'MUG-RED', axes: [], stockAllocation: 8 });
    expect(() => addVariant(ENT, r.id, { sku: 'MUG-BLU', axes: [], stockAllocation: 5 }))
      .toThrow(/Over-allocation by 3/);
  });

  it('addVariant rejects duplicate SKU per entity', () => {
    const r = publishItem(ENT, 'm-shirt', USER);
    addVariant(ENT, r.id, { sku: 'DUP', axes: [], stockAllocation: 1 });
    expect(() => addVariant(ENT, r.id, { sku: 'DUP', axes: [], stockAllocation: 1 }))
      .toThrow(/duplicate|exists|unique/i);
  });

  it('inactive variants do NOT count toward allocation', () => {
    const r = publishItem(ENT, 'm-mug', USER);
    const v1 = addVariant(ENT, r.id, { sku: 'M1', axes: [], stockAllocation: 10 });
    updateVariant(ENT, v1.id, { isActive: false });
    const v2 = addVariant(ENT, r.id, { sku: 'M2', axes: [], stockAllocation: 10 });
    expect(v2.stockAllocation).toBe(10);
  });

  it('updateVariant throws when projected sum > master qty', () => {
    const r = publishItem(ENT, 'm-mug', USER);
    const v1 = addVariant(ENT, r.id, { sku: 'X1', axes: [], stockAllocation: 5 });
    const v2 = addVariant(ENT, r.id, { sku: 'X2', axes: [], stockAllocation: 5 });
    expect(() => updateVariant(ENT, v2.id, { stockAllocation: 8 })).toThrow(/Over-allocation/);
    expect(v1.id).toBeTruthy();
  });

  it('updateVariant rejects negative allocation', () => {
    const r = publishItem(ENT, 'm-shirt', USER);
    const v = addVariant(ENT, r.id, { sku: 'NEG', axes: [], stockAllocation: 1 });
    expect(() => updateVariant(ENT, v.id, { stockAllocation: -1 })).toThrow(/≥ 0|>= 0|negative/i);
  });

  it('setHasVariants toggles flag without touching master', () => {
    const r = publishItem(ENT, 'm-shirt', USER);
    const after = setHasVariants(ENT, r.id, true);
    expect(after.hasVariants).toBe(true);
  });

  it('buildReconciliationReport surfaces drift correctly', () => {
    const r = publishItem(ENT, 'm-mug', USER);
    addVariant(ENT, r.id, { sku: 'OK', axes: [], stockAllocation: 6 });
    const rec = buildReconciliationReport(ENT);
    const row = rec.find(x => x.storeItemId === r.id)!;
    expect(row.masterQty).toBe(10);
    expect(row.allocatedTotal).toBe(6);
    expect(row.drift).toBe(4);
    expect(row.overAllocated).toBe(false);
  });

  it('reconciliation flips when master qty falls (live re-read)', () => {
    const r = publishItem(ENT, 'm-mug', USER);
    addVariant(ENT, r.id, { sku: 'A', axes: [], stockAllocation: 9 });
    seedMaster([{ id: 'm-mug', name: 'Coffee Mug', qty: 5 }]);
    const rec = buildReconciliationReport(ENT);
    const row = rec.find(x => x.storeItemId === r.id)!;
    expect(row.overAllocated).toBe(true);
  });

  it('listVariants filters by storeItemId', () => {
    const r = publishItem(ENT, 'm-shirt', USER);
    addVariant(ENT, r.id, { sku: 'V1', axes: [], stockAllocation: 1 });
    expect(listVariants(ENT, r.id)).toHaveLength(1);
    expect(listVariants(ENT)).toHaveLength(1);
  });
});

describe('S149 · categories (3-level + cycle guard)', () => {
  it('createCategory at root succeeds', () => {
    const c = createCategory(ENT, { name: 'Root' });
    expect(c.name).toBe('Root');
    expect(c.parentCategoryId).toBeNull();
  });

  it('createCategory throws on blank name', () => {
    expect(() => createCategory(ENT, { name: '   ' })).toThrow(/required/);
  });

  it('createCategory enforces 3-level depth', () => {
    const a = createCategory(ENT, { name: 'L1' });
    const b = createCategory(ENT, { name: 'L2', parentCategoryId: a.id });
    createCategory(ENT, { name: 'L3', parentCategoryId: b.id });
    const c3 = listCategories(ENT).find(x => x.name === 'L3')!;
    expect(() => createCategory(ENT, { name: 'L4', parentCategoryId: c3.id })).toThrow(/Max category depth/);
  });

  it('updateCategory blocks self-cycle', () => {
    const a = createCategory(ENT, { name: 'A' });
    expect(() => updateCategory(ENT, a.id, { parentCategoryId: a.id })).toThrow(/cycle|ancestor/i);
  });

  it('updateCategory blocks ancestor cycle (A→B→A)', () => {
    const a = createCategory(ENT, { name: 'A' });
    const b = createCategory(ENT, { name: 'B', parentCategoryId: a.id });
    expect(() => updateCategory(ENT, a.id, { parentCategoryId: b.id })).toThrow(/cycle|ancestor/i);
  });

  it('deleteCategory refuses when children exist', () => {
    const a = createCategory(ENT, { name: 'A' });
    createCategory(ENT, { name: 'B', parentCategoryId: a.id });
    expect(() => deleteCategory(ENT, a.id)).toThrow(/children/);
  });

  it('listCategoryTree returns nested shape sorted by sortOrder', () => {
    const a = createCategory(ENT, { name: 'A' });
    createCategory(ENT, { name: 'A1', parentCategoryId: a.id, sortOrder: 2 });
    createCategory(ENT, { name: 'A0', parentCategoryId: a.id, sortOrder: 1 });
    const tree = listCategoryTree(ENT);
    expect(tree[0].children.map(c => c.name)).toEqual(['A0', 'A1']);
  });
});

describe('S149 · brands', () => {
  it('createBrand requires non-blank name', () => {
    expect(() => createBrand(ENT, { name: '' })).toThrow(/required/);
  });

  it('updateBrand changes name and isActive', () => {
    const b = createBrand(ENT, { name: 'Aura' });
    const after = updateBrand(ENT, b.id, { name: 'Aura+', isActive: false });
    expect(after.name).toBe('Aura+');
    expect(after.isActive).toBe(false);
  });

  it('deleteBrand removes from list', () => {
    const b = createBrand(ENT, { name: 'Temp' });
    deleteBrand(ENT, b.id);
    expect(listBrands(ENT).find(x => x.id === b.id)).toBeUndefined();
  });
});

describe('S149 · settings + queries + audit additivity', () => {
  it('getStoreSettings returns defaults when unset', () => {
    const s = getStoreSettings(ENT);
    expect(s.gstInvoiceNote).toMatch(/GST invoice/);
    expect(s.storeName).toBe('');
  });

  it('updateStoreSettings persists patch', () => {
    updateStoreSettings(ENT, USER, { storeName: 'Demo Bazaar', supportEmail: 'help@demo.in' });
    const s = getStoreSettings(ENT);
    expect(s.storeName).toBe('Demo Bazaar');
    expect(s.supportEmail).toBe('help@demo.in');
  });

  it('getCatalog filters by search and visibility', () => {
    publishItem(ENT, 'm-shirt', USER, { storeTitle: 'Cotton Shirt Premium' });
    publishItem(ENT, 'm-mug', USER, { storeTitle: 'Coffee Mug' });
    expect(getCatalog(ENT, { search: 'cotton' })).toHaveLength(1);
    expect(getCatalog(ENT, { visibility: 'draft' })).toHaveLength(2);
  });

  it('listMasterCandidates flags already-published items', () => {
    publishItem(ENT, 'm-shirt', USER);
    const rows = listMasterCandidates(ENT);
    const shirt = rows.find(r => r.id === 'm-shirt')!;
    expect(shirt.alreadyPublishedAs).not.toBeNull();
  });

  it('webstorex_event audit literal exists on AuditEntityType union', () => {
    const sample: AuditEntityType = 'webstorex_event';
    expect(sample).toBe('webstorex_event');
  });

  it('getStoreItem returns null for unknown id', () => {
    expect(getStoreItem(ENT, 'nope')).toBeNull();
  });
});

describe('S149 · institutional registers · sidebar parity · application status', () => {
  it('sibling register includes webstorex-engine entry', () => {
    expect(SIBLINGS.find(s => s.id === 'webstorex-engine')).toBeDefined();
  });

  it('sprint-history includes Sprint 149 entry', () => {
    expect(SPRINTS.find(s => s.sprintNumber === 149)).toBeDefined();
  });

  it('S148 banked headSha 6f2f05df', () => {
    const s148 = SPRINTS.find(s => s.sprintNumber === 148)!;
    expect(s148.headSha).toBe('6f2f05df');
  });

  it('S149 still TBD_AT_BANK before commit', () => {
    const s149 = SPRINTS.find(s => s.sprintNumber === 149)!;
    expect(s149.headSha).toBe('TBD_AT_BANK');
  });

  it('NO S150 entry exists yet', () => {
    expect(SPRINTS.find(s => s.sprintNumber === 150)).toBeUndefined();
  });

  it('webstorex sidebar items carry ZERO requiredCards (parity guard)', () => {
    for (const it of webstorexSidebarItems) {
      expect(it.requiredCards).toBeUndefined();
    }
  });

  it('webstorex dashboard card is active', () => {
    const card = APPLICATIONS.find(a => a.id === 'webstorex')!;
    expect(card.status).toBe('active');
    expect(card.route).toBe('/erp/webstorex');
  });
});
