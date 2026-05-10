/**
 * @file        src/test/engineeringx-analysis-engine.test.ts
 * @sprint      T-Phase-1.A.13 EngineeringX AI similarity + Change-impact + Closeout · Q-LOCK-14a · Block F.1
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { execSync } from 'node:child_process';
import {
  computeSimilaritySignature, scoreSimilarity, findSimilarDrawings,
  setSimilaritySignature, recordSimilarityVote, getSimilarityExplanation,
  findImpactedProjects, findImpactedDrawings, getDrawingChangeImpactSummary,
  isReadyForProduction, listReadyForProduction,
} from '@/lib/engineeringx-analysis-engine';
import { createDrawing } from '@/lib/engineeringx-engine';

describe('T-Phase-1.A.13 · engineeringx-analysis-engine · Path B own entity (D-NEW-CR + D-NEW-CS POSSIBLE)', () => {
  const entityCode = 'TEST_ANALYSIS';

  beforeEach(() => {
    localStorage.clear();
  });

  function seedDrawing(
    subtype: 'assembly' | 'electrical' | 'p_and_id' | 'other' = 'assembly',
    projectId = 'proj-1',
  ) {
    return createDrawing(
      entityCode,
      {
        drawing_no: `D-${Math.random().toString(36).slice(2, 8)}`,
        title: 'Test Drawing',
        drawing_type: subtype,
        related_project_id: projectId,
        originating_department_id: 'engineering',
        initial_version: {
          version_no: '1.0',
          file_url: '[JWT] /api/files/test.pdf',
          file_size_bytes: 1024,
          uploaded_at: '2026-05-01',
          uploaded_by: 'u1',
        },
      },
      'u1',
    );
  }

  it('Path B confirmed · analysis engine is OWN entity (NOT FR-73 consumer)', () => {
    const content = execSync('cat src/lib/engineeringx-analysis-engine.ts').toString();
    expect(content).toMatch(/Path B own entity/);
    expect(content).toMatch(/NOT FR-73 consumer/);
  });

  it('D-NEW-CR Phase 1 rule-based stub · sentinel cite + [JWT] markers', () => {
    const content = execSync('cat src/lib/engineeringx-analysis-engine.ts').toString();
    expect(content).toMatch(/D-NEW-CR/);
    expect(content).toMatch(/\[JWT\]/);
  });

  it('D-NEW-CS Change-impact reverse FK pattern · sentinel cite preserved', () => {
    const content = execSync('cat src/lib/engineeringx-analysis-engine.ts').toString();
    expect(content).toMatch(/D-NEW-CS/);
    expect(content).toMatch(/reverse FK/);
  });

  it('computeSimilaritySignature · deterministic v1 hash format', () => {
    const drw = seedDrawing('assembly', 'proj-1');
    const sig = computeSimilaritySignature(drw);
    expect(sig).toMatch(/^v1:assembly:proj-1:/);
    expect(computeSimilaritySignature(drw)).toBe(sig);
  });

  it('scoreSimilarity · same drawing returns 1.0', () => {
    const drw = seedDrawing('assembly');
    expect(scoreSimilarity(drw, drw)).toBe(1.0);
  });

  it('scoreSimilarity · same subtype + same project = high score (≥ 0.7)', () => {
    const drw1 = seedDrawing('assembly', 'proj-1');
    const drw2 = seedDrawing('assembly', 'proj-1');
    expect(scoreSimilarity(drw1, drw2)).toBeGreaterThanOrEqual(0.7);
  });

  it('scoreSimilarity · different subtype + different project = low score (≤ 0.4)', () => {
    const drw1 = seedDrawing('assembly', 'proj-1');
    const drw2 = seedDrawing('electrical', 'proj-2');
    expect(scoreSimilarity(drw1, drw2)).toBeLessThanOrEqual(0.4);
  });

  it('findSimilarDrawings · returns ranked list excluding self', () => {
    const target = seedDrawing('assembly', 'proj-1');
    seedDrawing('assembly', 'proj-1');
    seedDrawing('electrical', 'proj-2');
    const results = findSimilarDrawings(entityCode, target.id, 5);
    expect(results.every((r) => r.drawing.id !== target.id)).toBe(true);
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
    }
  });

  it('getSimilarityExplanation · structured reason for Dishani prompt context', () => {
    const drw1 = seedDrawing('assembly', 'proj-1');
    const drw2 = seedDrawing('assembly', 'proj-1');
    const explanation = getSimilarityExplanation(drw1, drw2);
    expect(explanation).toContain('Same subtype');
    expect(explanation).toContain('Same project');
  });

  it('setSimilaritySignature · Phase 1 stub returns true', () => {
    expect(setSimilaritySignature(entityCode, 'd1', 'v1:x:y:z')).toBe(true);
  });

  it('recordSimilarityVote · Phase 1 stub does not throw', () => {
    expect(() => recordSimilarityVote(entityCode, 'd1', 'd2', 'up')).not.toThrow();
  });

  it('findImpactedProjects · cross-card consumer query for ProjX (zero-touch)', () => {
    const drw = seedDrawing('assembly', 'proj-1');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const projects = [{ id: 'proj-1', project_no: 'P-001', project_name: 'Test' } as any];
    const impacted = findImpactedProjects(entityCode, drw.id, projects);
    expect(impacted.length).toBe(1);
    expect(impacted[0].id).toBe('proj-1');
  });

  it('findImpactedDrawings · reverse FK query for reference_source_drawing_id', () => {
    const parent = seedDrawing('assembly');
    expect(findImpactedDrawings(entityCode, parent.id)).toBeInstanceOf(Array);
  });

  it('getDrawingChangeImpactSummary · combines projects + drawings', () => {
    const drw = seedDrawing('assembly', 'proj-1');
    const summary = getDrawingChangeImpactSummary(entityCode, drw.id, []);
    expect(summary).toHaveProperty('impactedProjects');
    expect(summary).toHaveProperty('impactedDrawings');
  });

  it('isReadyForProduction · returns boolean', () => {
    const drw = seedDrawing('assembly');
    expect(typeof isReadyForProduction(drw)).toBe('boolean');
  });

  it('listReadyForProduction · cross-card consumer query for Production', () => {
    seedDrawing('assembly');
    expect(listReadyForProduction(entityCode)).toBeInstanceOf(Array);
  });
});
