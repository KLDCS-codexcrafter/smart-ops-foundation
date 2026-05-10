/**
 * @file        src/test/procure360-vendor-agreements-routing.test.ts
 * @sprint      T-Phase-1.SM.Procure360-Vendor-Agreements · Block E
 */

import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';

describe('T-Phase-1.SM.Procure360-Vendor-Agreements · Routing + Sidebar', () => {
  it('Q-LOCK-6a · Procure360Module union has vendor-agreements-register and vendor-agreement-entry', () => {
    const content = execSync(`cat src/pages/erp/procure-hub/Procure360Sidebar.types.ts`).toString();
    expect(content).toMatch(/'vendor-agreements-register'/);
    expect(content).toMatch(/'vendor-agreement-entry'/);
  });

  it('Q-LOCK-6a · procure360-sidebar-config.ts has "Vendor Documents" group', () => {
    const content = execSync(`cat src/apps/erp/configs/procure360-sidebar-config.ts`).toString();
    expect(content).toMatch(/'vendor-documents-group'/);
    expect(content).toMatch(/label: 'Vendor Documents'/);
  });
});
