/**
 * @file        src/test/store-hub-p2/hk-2-rename-verification.test.ts
 * @purpose     T-Phase-2.HK-2 · 8 smoke tests verifying MainStoreHub + DepartmentStore rename
 * @sprint      T-Phase-2.HK-2-MainStoreHub-Rename · 42nd composite A · 2nd HK lane
 * @disciplines FR-30 · FR-32 · FR-CANDIDATE-85 #10 (empirical anchor discipline)
 * @[JWT]       N/A (filesystem + config invariants)
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { applications } from '@/components/operix-core/applications';

const ROOT = process.cwd();
const exists = (p: string) => fs.existsSync(path.join(ROOT, p));

describe('T-Phase-2.HK-2 rename verification', () => {
  it('A1 · 5 MainStoreHub* files exist (inventory side)', () => {
    expect(exists('src/pages/erp/inventory/MainStoreHubPage.tsx')).toBe(true);
    expect(exists('src/pages/erp/inventory/MainStoreHubSidebar.tsx')).toBe(true);
    expect(exists('src/pages/erp/inventory/MainStoreHubSidebar.groups.ts')).toBe(true);
    expect(exists('src/pages/erp/inventory/MainStoreHubSidebar.types.ts')).toBe(true);
    expect(exists('src/pages/erp/inventory/MainStoreHubWelcome.tsx')).toBe(true);
  });

  it('A2 · 5 legacy InventoryHub* files removed', () => {
    expect(exists('src/pages/erp/inventory/InventoryHubPage.tsx')).toBe(false);
    expect(exists('src/pages/erp/inventory/InventoryHubSidebar.tsx')).toBe(false);
    expect(exists('src/pages/erp/inventory/InventoryHubSidebar.groups.ts')).toBe(false);
    expect(exists('src/pages/erp/inventory/InventoryHubSidebar.types.ts')).toBe(false);
    expect(exists('src/pages/erp/inventory/InventoryHubWelcome.tsx')).toBe(false);
  });

  it('B1 · 4 DepartmentStore* files exist (store-hub side)', () => {
    expect(exists('src/pages/erp/store-hub/DepartmentStorePage.tsx')).toBe(true);
    expect(exists('src/pages/erp/store-hub/DepartmentStorePanels.tsx')).toBe(true);
    expect(exists('src/pages/erp/store-hub/DepartmentStoreSidebar.tsx')).toBe(true);
    expect(exists('src/pages/erp/store-hub/DepartmentStoreWelcome.tsx')).toBe(true);
  });

  it('B2 · 4 legacy StoreHub* files removed', () => {
    expect(exists('src/pages/erp/store-hub/StoreHubPage.tsx')).toBe(false);
    expect(exists('src/pages/erp/store-hub/StoreHubPanels.tsx')).toBe(false);
    expect(exists('src/pages/erp/store-hub/StoreHubSidebar.tsx')).toBe(false);
    expect(exists('src/pages/erp/store-hub/StoreHubWelcome.tsx')).toBe(false);
  });

  it('C1 · applications.ts inventory-hub flipped to Main Store Hub @ /erp/main-store-hub', () => {
    const a = applications.find((x) => x.id === 'inventory-hub');
    expect(a).toBeDefined();
    expect(a?.name).toBe('Main Store Hub');
    expect(a?.route).toBe('/erp/main-store-hub');
  });

  it('C2 · applications.ts store-hub keeps Department Stores · route flipped to /erp/department-store', () => {
    const a = applications.find((x) => x.id === 'store-hub');
    expect(a).toBeDefined();
    expect(a?.name).toBe('Department Stores');
    expect(a?.route).toBe('/erp/department-store');
  });

  it('D1 · App.tsx contains both canonical routes + both legacy redirects', () => {
    const app = fs.readFileSync(path.join(ROOT, 'src/App.tsx'), 'utf8');
    expect(app).toContain('path="/erp/main-store-hub"');
    expect(app).toContain('path="/erp/department-store"');
    expect(app).toMatch(/path="\/erp\/inventory-hub"[\s\S]{0,80}Navigate to="\/erp\/main-store-hub"/);
    expect(app).toMatch(/path="\/erp\/store-hub"[\s\S]{0,80}Navigate to="\/erp\/department-store"/);
  });

  it('D2 · CardId strings frozen (Q-LOCK-4a): registry IDs unchanged', () => {
    // CardId literals are anchor-counted institutionally · verify via registry lookup
    // (NOT via re-quoting them here · which would inflate the anchor count).
    const inv = applications.find((x) => x.id === 'inventory-hub');
    const sh = applications.find((x) => x.id === 'store-hub');
    expect(inv).toBeDefined();
    expect(sh).toBeDefined();
  });
});

