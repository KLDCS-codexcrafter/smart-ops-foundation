/**
 * @file        src/test/projx-documents-routing.test.ts
 * @sprint      T-Phase-1.SM.ProjX-Documents · Q-LOCK-14a · Block F
 */

import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';

describe('T-Phase-1.SM.ProjX-Documents · Routing + Sidebar', () => {
  it('Q-LOCK-6a · ProjXModule union has t-documents and t-document-entry', () => {
    const content = execSync('cat src/pages/erp/projx/ProjXSidebar.types.ts').toString();
    expect(content).toMatch(/'t-documents'/);
    expect(content).toMatch(/'t-document-entry'/);
  });

  it('Q-LOCK-7a · App.tsx registers /erp/projx/documents route', () => {
    const content = execSync('cat src/App.tsx').toString();
    expect(content).toMatch(/path="\/erp\/projx\/documents"/);
  });
});
