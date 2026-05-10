/**
 * @file        src/test/qualicheck-ncr-evidence-routing.test.ts
 * @sprint      T-Phase-1.SM.QualiCheck-NCR-Evidence · Block E
 */

import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';

describe('T-Phase-1.SM.QualiCheck-NCR-Evidence · Routing + Sidebar', () => {
  it('Q-LOCK-6a · QualiCheckModule union has ncr-evidence-register and ncr-evidence-entry (FLAT IDs)', () => {
    const content = execSync(`cat src/pages/erp/qualicheck/QualiCheckSidebar.types.ts`).toString();
    expect(content).toMatch(/'ncr-evidence-register'/);
    expect(content).toMatch(/'ncr-evidence-entry'/);
  });

  it('Q-LOCK-6a · qualicheck-sidebar-config.ts has both new items', () => {
    const content = execSync(`cat src/apps/erp/configs/qualicheck-sidebar-config.ts`).toString();
    expect(content).toMatch(/moduleId: 'ncr-evidence-register'/);
    expect(content).toMatch(/moduleId: 'ncr-evidence-entry'/);
  });
});
