/**
 * @file Sprint 65 FAR-1 · CARO 2020 engine · ID-lookup test pattern per Lesson 19
 * @sprint T-Phase-4.FAR-1.TFix
 */
import { describe, it, expect } from 'vitest';
import {
  assessCAROParagraph3i,
  checkAssetRegisterCompleteness,
  checkPhysicalVerificationStatus,
  checkTitleDeedsForImmovable,
  checkRevaluationDisclosure,
  checkBenamiInvestigations,
  generateCARODisclosureReport,
} from '@/lib/caro-2020-engine';

const E = 'AMITH';
const FY_START = '2025-04-01';
const FY_END = '2026-03-31';

describe('CARO 2020 paragraph 3(i) engine · ID-lookup smoke', () => {
  it('assessCAROParagraph3i returns CAROAssessmentResult with paragraph 3(i)', () => {
    const result = assessCAROParagraph3i(E, FY_START, FY_END);
    expect(result.entityCode).toBe(E);
    expect(result.paragraph).toBe('3(i)');
    expect(result.fyStart).toBe(FY_START);
    expect(result.fyEnd).toBe(FY_END);
    expect(Array.isArray(result.subRules)).toBe(true);
    expect(typeof result.overallPass).toBe('boolean');
  });

  it('all 5 sub-rule IDs surface in assessment result', () => {
    const result = assessCAROParagraph3i(E, FY_START, FY_END);
    const ids = result.subRules.map(r => r.id).sort();
    expect(ids).toContain('a-completeness');
    expect(ids).toContain('b-verification');
    expect(ids).toContain('c-title-deeds');
    expect(ids).toContain('d-revaluation');
    expect(ids).toContain('e-benami');
  });

  it('checkAssetRegisterCompleteness returns a-completeness result', () => {
    const r = checkAssetRegisterCompleteness(E);
    expect(r.id).toBe('a-completeness');
    expect(typeof r.pass).toBe('boolean');
    expect(typeof r.finding).toBe('string');
  });

  it('checkPhysicalVerificationStatus returns b-verification result', () => {
    const r = checkPhysicalVerificationStatus(E);
    expect(r.id).toBe('b-verification');
  });

  it('checkTitleDeedsForImmovable returns c-title-deeds result', () => {
    const r = checkTitleDeedsForImmovable(E);
    expect(r.id).toBe('c-title-deeds');
  });

  it('checkRevaluationDisclosure returns d-revaluation result', () => {
    const r = checkRevaluationDisclosure(E);
    expect(r.id).toBe('d-revaluation');
  });

  it('checkBenamiInvestigations returns e-benami PASS placeholder', () => {
    const r = checkBenamiInvestigations(E);
    expect(r.id).toBe('e-benami');
    expect(r.pass).toBe(true);
  });

  it('generateCARODisclosureReport returns CAROAssessmentResult shape', () => {
    const report = generateCARODisclosureReport(E, FY_START, FY_END);
    // Empirical signature: returns CAROAssessmentResult (object), not string.
    expect(report).toBeDefined();
    expect(report.paragraph).toBe('3(i)');
    expect(Array.isArray(report.subRules)).toBe(true);
    expect(report.subRules.length).toBe(5);
  });
});
