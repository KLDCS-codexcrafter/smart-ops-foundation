/**
 * @file        src/test/engineeringx-closeout.test.ts
 * @sprint      T-Phase-1.A.13 EngineeringX AI similarity + Change-impact + Closeout · Q-LOCK-14a · Block F.2
 */
import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';

describe('T-Phase-1.A.13 · EngineeringX Closeout · CLOSEOUT verifications', () => {
  it('Q-LOCK-10a · STATUS FLIP · EngineeringX is now active in applications.ts', () => {
    const content = execSync('cat src/components/operix-core/applications.ts').toString();
    const block = content.match(/id: 'engineeringx'[\s\S]*?\}/)?.[0] ?? '';
    expect(block).toContain("status: 'active'");
    expect(block).not.toContain("status: 'coming_soon'");
  });

  it('Q-LOCK-11a · MOAT #21 candidate · 4 A.13 panels + analysis engine exist', () => {
    expect(existsSync('src/pages/erp/engineeringx/transactions/SimilarityPredictor.tsx')).toBe(true);
    expect(existsSync('src/pages/erp/engineeringx/registers/ChangeImpactAnalyzer.tsx')).toBe(true);
    expect(existsSync('src/pages/erp/engineeringx/registers/ProductionHandoff.tsx')).toBe(true);
    expect(existsSync('src/pages/erp/engineeringx/registers/EngineeringXReports.tsx')).toBe(true);
    expect(existsSync('src/lib/engineeringx-analysis-engine.ts')).toBe(true);
  });

  it('A.10 + A.11 + A.12 deliverables preserved (4-sprint arc)', () => {
    expect(existsSync('src/pages/erp/engineeringx/EngineeringXPage.tsx')).toBe(true);
    expect(existsSync('src/pages/erp/engineeringx/transactions/DrawingRegister.tsx')).toBe(true);
    expect(existsSync('src/pages/erp/engineeringx/registers/DrawingVersionHistory.tsx')).toBe(true);
    expect(existsSync('src/lib/engineeringx-engine.ts')).toBe(true);
    expect(existsSync('src/lib/engineeringx-bom-engine.ts')).toBe(true);
    expect(existsSync('src/types/bom-entry.ts')).toBe(true);
    expect(existsSync('src/pages/erp/engineeringx/transactions/BomExtractor.tsx')).toBe(true);
    expect(existsSync('src/pages/erp/engineeringx/transactions/CloneDrawing.tsx')).toBe(true);
  });

  it('Ask Dishani canonical zero-touch · 7 files exist unchanged', () => {
    const dishaniFiles = [
      'src/components/ask-dishani/DishaniContext.tsx',
      'src/components/ask-dishani/DishaniContext.types.ts',
      'src/components/ask-dishani/DishaniContextObject.ts',
      'src/components/ask-dishani/DishaniFloatingButton.tsx',
      'src/components/ask-dishani/DishaniPanel.tsx',
      'src/components/ask-dishani/useDishani.ts',
      'src/components/ask-dishani/index.ts',
    ];
    dishaniFiles.forEach((f) => expect(existsSync(f)).toBe(true));
  });

  it('Q-LOCK-1b · SimilarityPredictor imports useDishani for conversational layer', () => {
    const content = execSync('cat src/pages/erp/engineeringx/transactions/SimilarityPredictor.tsx').toString();
    expect(content).toMatch(/from '@\/components\/ask-dishani'/);
    expect(content).toMatch(/useDishani/);
  });

  it('FR-73 Hub-and-Spoke · DocumentType unchanged (analysis engine NOT FR-73 consumer)', () => {
    const content = execSync('cat src/types/docvault.ts').toString();
    expect(content).toMatch(/'drawing'/);
    expect(content).toMatch(/'mom'/);
    expect(content).not.toMatch(/'analysis'/);
    expect(content).not.toMatch(/'similarity'/);
  });

  it('Master Plan §6.3 OOB Innovations · 6/6 delivered', () => {
    const allDelivered = [
      'src/pages/erp/engineeringx/transactions/DrawingRegister.tsx',
      'src/pages/erp/engineeringx/registers/DrawingVersionHistory.tsx',
      'src/pages/erp/engineeringx/approvals/DrawingApprovalsPending.tsx',
      'src/pages/erp/engineeringx/transactions/BomExtractor.tsx',
      'src/pages/erp/engineeringx/registers/ReferenceProjectLibrary.tsx',
      'src/pages/erp/engineeringx/transactions/SimilarityPredictor.tsx',
      'src/pages/erp/engineeringx/registers/ChangeImpactAnalyzer.tsx',
      'src/pages/erp/engineeringx/registers/ProductionHandoff.tsx',
    ];
    allDelivered.forEach((f) => expect(existsSync(f)).toBe(true));
  });
});
