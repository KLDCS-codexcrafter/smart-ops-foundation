/**
 * @file src/test/shell-retrofit.test.ts
 * @sprint T-Phase-1.A.9 BUNDLED · Block C.7
 */
import { describe, it, expect } from 'vitest';
import { storeHubShellConfig } from '@/apps/erp/configs/store-hub-shell-config';
import { supplyxShellConfig } from '@/apps/erp/configs/supplyx-shell-config';
import { docvaultShellConfig } from '@/apps/erp/configs/docvault-shell-config';

describe('Shell retrofit · Q-LOCK-7-A.9 · 3 cards canonical Shell pattern', () => {
  it('store-hub-shell-config has title and breadcrumb root', () => {
    expect(storeHubShellConfig.title).toBeDefined();
    expect(storeHubShellConfig.title).toContain('Department Stores');
    expect(storeHubShellConfig.routing.landingRoute).toBe('/erp/store-hub');
  });
  it('supplyx-shell-config has title and breadcrumb root', () => {
    expect(supplyxShellConfig.title).toBeDefined();
    expect(supplyxShellConfig.title).toContain('SupplyX');
    expect(supplyxShellConfig.routing.landingRoute).toBe('/erp/supplyx');
  });
  it('docvault-shell-config has title and breadcrumb root', () => {
    expect(docvaultShellConfig.title).toBeDefined();
    expect(docvaultShellConfig.title).toContain('DocVault');
    expect(docvaultShellConfig.routing.landingRoute).toBe('/erp/docvault');
  });
});
