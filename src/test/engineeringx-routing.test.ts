/**
 * @file        src/test/engineeringx-routing.test.ts
 * @sprint      T-Phase-1.A.10 EngineeringX Foundation · Q-LOCK-14a · Block F.2
 *              T1 audit-fix at A.11 (cycle #26) · Q-LOCK-10a institutional rename of 2 module IDs · 2 NEW module IDs added
 */
import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';

describe('T-Phase-1.A.10 EngineeringX Foundation · routing + Shell · A.11 T1-fix updated', () => {
  it('Q-LOCK-6a + Q-LOCK-10a · EngineeringXModule union has 9 modules (FLAT IDs · A.11 renamed 2 + added 2)', () => {
    const content = execSync(`cat src/pages/erp/engineeringx/EngineeringXSidebar.types.ts`).toString();
    expect(content).toMatch(/'welcome'/);
    expect(content).toMatch(/'reference-projects-placeholder'/);
    expect(content).toMatch(/'bom-placeholder'/);
    expect(content).toMatch(/'similarity-placeholder'/);
    expect(content).toMatch(/'reports-placeholder'/);
    expect(content).toMatch(/'drawing-register'/);
    expect(content).toMatch(/'drawing-entry'/);
    expect(content).toMatch(/'drawing-approvals'/);
    expect(content).toMatch(/'drawing-version-history'/);
  });

  it('Q-LOCK-10a · D-NEW-CC `e *` keyboard namespace registered (5th consumer · A.11 extended within namespace)', () => {
    const content = execSync(`cat src/apps/erp/configs/engineeringx-sidebar-config.ts`).toString();
    expect(content).toMatch(/keyboard: 'e w'/);
    expect(content).toMatch(/keyboard: 'e r'/);
    expect(content).toMatch(/keyboard: 'e n'/);
    expect(content).toMatch(/keyboard: 'e p'/);
    expect(content).toMatch(/keyboard: 'e a'/);
    expect(content).toMatch(/keyboard: 'e v'/);
  });

  it('Q-LOCK-4a · EngineeringXPage uses canonical Shell pattern (D-250 + FR-58)', () => {
    const content = execSync(`cat src/pages/erp/engineeringx/EngineeringXPage.tsx`).toString();
    expect(content).toMatch(/import \{ Shell \} from '@\/shell'/);
    expect(content).toMatch(/engineeringxShellConfig/);
    expect(content).toMatch(/useCardEntitlement/);
  });

  it('Q-LOCK-7a · App.tsx EngineeringX route UNCHANGED (existing /erp/engineeringx reused · A.11 zero-diff preserved)', () => {
    const content = execSync(`cat src/App.tsx`).toString();
    expect(content).toMatch(/<Route path="\/erp\/engineeringx"/);
    expect(content).not.toMatch(/<Route path="\/erp\/engineeringx\/\*"/);
  });

  it('A.11 T1-fix · EngineeringXPage activeModule switch handles all 9 modules (additive extension per Q-LOCK-7a)', () => {
    const content = execSync(`cat src/pages/erp/engineeringx/EngineeringXPage.tsx`).toString();
    expect(content).toMatch(/case 'welcome'/);
    expect(content).toMatch(/case 'drawing-register'/);
    expect(content).toMatch(/case 'drawing-entry'/);
    expect(content).toMatch(/case 'drawing-approvals'/);
    expect(content).toMatch(/case 'drawing-version-history'/);
  });
});
