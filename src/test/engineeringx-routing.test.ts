/**
 * @file        src/test/engineeringx-routing.test.ts
 * @sprint      T-Phase-1.A.13 · Q-LOCK-7a · 13-element union · 9 keyboard shortcuts → 11 (4 NEW at A.13 · 2 renames + 2 new IDs)
 */
import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';

describe('T-Phase-1.A.13 EngineeringX · routing + Shell', () => {
  it('EngineeringXModule union has 13 modules · A.13 renamed 2 + added 2', () => {
    const content = execSync(`cat src/pages/erp/engineeringx/EngineeringXSidebar.types.ts`).toString();
    expect(content).toMatch(/'welcome'/);
    expect(content).toMatch(/'drawing-register'/);
    expect(content).toMatch(/'drawing-entry'/);
    expect(content).toMatch(/'drawing-approvals'/);
    expect(content).toMatch(/'drawing-version-history'/);
    expect(content).toMatch(/'bom-extractor'/);
    expect(content).toMatch(/'bom-register'/);
    expect(content).toMatch(/'reference-library'/);
    expect(content).toMatch(/'clone-drawing'/);
    expect(content).toMatch(/'similarity-predictor'/);
    expect(content).toMatch(/'change-impact-analyzer'/);
    expect(content).toMatch(/'production-handoff'/);
    expect(content).toMatch(/'engineeringx-reports'/);
  });

  it("D-NEW-CC `e *` keyboard namespace · 11 shortcuts (4 NEW at A.13)", () => {
    const content = execSync(`cat src/apps/erp/configs/engineeringx-sidebar-config.ts`).toString();
    for (const k of ['e w', 'e r', 'e n', 'e a', 'e v', 'e b', 'e g', 'e l', 'e c', 'e s', 'e i', 'e h', 'e t']) {
      expect(content).toMatch(new RegExp(`keyboard: '${k}'`));
    }
  });

  it('Q-LOCK-4a · EngineeringXPage uses canonical Shell pattern', () => {
    const content = execSync(`cat src/pages/erp/engineeringx/EngineeringXPage.tsx`).toString();
    expect(content).toMatch(/import \{ Shell \} from '@\/shell'/);
    expect(content).toMatch(/engineeringxShellConfig/);
    expect(content).toMatch(/useCardEntitlement/);
  });

  it('Q-LOCK-7a · App.tsx EngineeringX route UNCHANGED', () => {
    const content = execSync(`cat src/App.tsx`).toString();
    expect(content).toMatch(/<Route path="\/erp\/engineeringx"/);
    expect(content).not.toMatch(/<Route path="\/erp\/engineeringx\/\*"/);
  });

  it('A.13 · activeModule switch handles all 13 modules', () => {
    const content = execSync(`cat src/pages/erp/engineeringx/EngineeringXPage.tsx`).toString();
    for (const m of [
      'welcome', 'drawing-register', 'drawing-entry', 'drawing-approvals', 'drawing-version-history',
      'bom-extractor', 'bom-register', 'reference-library', 'clone-drawing',
      'similarity-predictor', 'change-impact-analyzer', 'production-handoff', 'engineeringx-reports',
    ]) {
      expect(content).toMatch(new RegExp(`case '${m}'`));
    }
  });
});
