/**
 * @file src/test/shell-retrofit.test.ts
 * @sprint T-Phase-1.A.9 BUNDLED · Block C.7 · T-Phase-1.A.9.T1 · Q-LOCK-T1-F1 (strengthened)
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { storeHubShellConfig } from '@/apps/erp/configs/store-hub-shell-config';
import { supplyxShellConfig } from '@/apps/erp/configs/supplyx-shell-config';
import { docvaultShellConfig } from '@/apps/erp/configs/docvault-shell-config';

describe('Shell retrofit · Q-LOCK-7-A.9 + Q-LOCK-T1-F1 · 3 cards canonical Shell pattern', () => {
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

  // T1 STRENGTHENING · verify Shell IS imported and used in each page
  it('Q-LOCK-T1-F1 · StoreHubPage actually consumes Shell', () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), 'src/pages/erp/store-hub/StoreHubPage.tsx'),
      'utf-8',
    );
    expect(content).toContain("from '@/shell'");
    expect(content).toContain('<Shell');
    expect(content).toContain('storeHubShellConfig');
  });
  it('Q-LOCK-T1-F1 · SupplyXPage actually consumes Shell', () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), 'src/pages/erp/supplyx/SupplyXPage.tsx'),
      'utf-8',
    );
    expect(content).toContain("from '@/shell'");
    expect(content).toContain('<Shell');
    expect(content).toContain('supplyxShellConfig');
  });
  it('Q-LOCK-T1-F1 · DocVaultPage actually consumes Shell', () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), 'src/pages/erp/docvault/DocVaultPage.tsx'),
      'utf-8',
    );
    expect(content).toContain("from '@/shell'");
    expect(content).toContain('<Shell');
    expect(content).toContain('docvaultShellConfig');
  });
});
