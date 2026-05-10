/**
 * @file        src/test/engineeringx-routing.test.ts
 * @sprint      T-Phase-1.A.10 EngineeringX Foundation · Q-LOCK-14a · Block F.2
 *              T1 audit-fix at A.11 (cycle #26) · Q-LOCK-10a institutional rename
 *              T1 audit-fix at A.12 (cycle #27) · Q-LOCK-12a institutional rename · 4 NEW module IDs added · 11-element union
 */
import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';

describe('T-Phase-1.A.10 EngineeringX Foundation · routing + Shell · A.12 T1-fix updated', () => {
  it('Q-LOCK-6a + Q-LOCK-10a + Q-LOCK-12a · EngineeringXModule union has 11 modules (FLAT IDs · A.12 renamed 2 + added 2)', () => {
    const content = execSync(`cat src/pages/erp/engineeringx/EngineeringXSidebar.types.ts`).toString();
    expect(content).toMatch(/'welcome'/);
    expect(content).toMatch(/'similarity-placeholder'/);
    expect(content).toMatch(/'reports-placeholder'/);
    expect(content).toMatch(/'drawing-register'/);
    expect(content).toMatch(/'drawing-entry'/);
    expect(content).toMatch(/'drawing-approvals'/);
    expect(content).toMatch(/'drawing-version-history'/);
    expect(content).toMatch(/'bom-extractor'/);
    expect(content).toMatch(/'bom-register'/);
    expect(content).toMatch(/'reference-library'/);
    expect(content).toMatch(/'clone-drawing'/);
  });

  it('Q-LOCK-10a + Q-LOCK-12a · D-NEW-CC `e *` keyboard namespace registered (5th consumer · A.12 extended within namespace 4 NEW shortcuts)', () => {
    const content = execSync(`cat src/apps/erp/configs/engineeringx-sidebar-config.ts`).toString();
    expect(content).toMatch(/keyboard: 'e w'/);
    expect(content).toMatch(/keyboard: 'e r'/);
    expect(content).toMatch(/keyboard: 'e n'/);
    expect(content).toMatch(/keyboard: 'e a'/);
    expect(content).toMatch(/keyboard: 'e v'/);
    expect(content).toMatch(/keyboard: 'e b'/);
    expect(content).toMatch(/keyboard: 'e g'/);
    expect(content).toMatch(/keyboard: 'e l'/);
    expect(content).toMatch(/keyboard: 'e c'/);
  });

  it('Q-LOCK-4a · EngineeringXPage uses canonical Shell pattern (D-250 + FR-58)', () => {
    const content = execSync(`cat src/pages/erp/engineeringx/EngineeringXPage.tsx`).toString();
    expect(content).toMatch(/import \{ Shell \} from '@\/shell'/);
    expect(content).toMatch(/engineeringxShellConfig/);
    expect(content).toMatch(/useCardEntitlement/);
  });

  it('Q-LOCK-7a · App.tsx EngineeringX route UNCHANGED (existing /erp/engineeringx reused · A.11 + A.12 zero-diff preserved)', () => {
    const content = execSync(`cat src/App.tsx`).toString();
    expect(content).toMatch(/<Route path="\/erp\/engineeringx"/);
    expect(content).not.toMatch(/<Route path="\/erp\/engineeringx\/\*"/);
  });

  it('A.12 T1-fix · EngineeringXPage activeModule switch handles all 9 active modules (additive extension per Q-LOCK-7a · 11-module union with 2 placeholders for A.13)', () => {
    const content = execSync(`cat src/pages/erp/engineeringx/EngineeringXPage.tsx`).toString();
    expect(content).toMatch(/case 'welcome'/);
    expect(content).toMatch(/case 'drawing-register'/);
    expect(content).toMatch(/case 'drawing-entry'/);
    expect(content).toMatch(/case 'drawing-approvals'/);
    expect(content).toMatch(/case 'drawing-version-history'/);
    expect(content).toMatch(/case 'bom-extractor'/);
    expect(content).toMatch(/case 'bom-register'/);
    expect(content).toMatch(/case 'reference-library'/);
    expect(content).toMatch(/case 'clone-drawing'/);
  });
});
