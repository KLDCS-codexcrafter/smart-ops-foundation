/**
 * @file        src/test/engineeringx-routing.test.ts
 * @sprint      T-Phase-1.A.10 EngineeringX Foundation · Q-LOCK-14a · Block F.2
 */
import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';

describe('T-Phase-1.A.10 EngineeringX Foundation · routing + Shell', () => {
  it('Q-LOCK-6a · EngineeringXModule union has all 7 base modules (FLAT IDs)', () => {
    const content = execSync(`cat src/pages/erp/engineeringx/EngineeringXSidebar.types.ts`).toString();
    expect(content).toMatch(/'welcome'/);
    expect(content).toMatch(/'drawing-register-placeholder'/);
    expect(content).toMatch(/'drawing-entry-placeholder'/);
    expect(content).toMatch(/'reference-projects-placeholder'/);
    expect(content).toMatch(/'bom-placeholder'/);
    expect(content).toMatch(/'similarity-placeholder'/);
    expect(content).toMatch(/'reports-placeholder'/);
  });

  it('Q-LOCK-10a · D-NEW-CC `e *` keyboard namespace registered (5th consumer)', () => {
    const content = execSync(`cat src/apps/erp/configs/engineeringx-sidebar-config.ts`).toString();
    expect(content).toMatch(/keyboard: 'e w'/);
    expect(content).toMatch(/keyboard: 'e r'/);
    expect(content).toMatch(/keyboard: 'e n'/);
    expect(content).toMatch(/keyboard: 'e p'/);
  });

  it('Q-LOCK-4a · EngineeringXPage uses canonical Shell pattern (D-250 + FR-58)', () => {
    const content = execSync(`cat src/pages/erp/engineeringx/EngineeringXPage.tsx`).toString();
    expect(content).toMatch(/import \{ Shell \} from '@\/shell'/);
    expect(content).toMatch(/engineeringxShellConfig/);
    expect(content).toMatch(/useCardEntitlement/);
  });

  it('Q-LOCK-7a · App.tsx EngineeringX route UNCHANGED (existing /erp/engineeringx reused)', () => {
    const content = execSync(`cat src/App.tsx`).toString();
    expect(content).toMatch(/<Route path="\/erp\/engineeringx"/);
    expect(content).not.toMatch(/<Route path="\/erp\/engineeringx\/\*"/);
  });
});
