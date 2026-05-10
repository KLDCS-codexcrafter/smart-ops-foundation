/**
 * @file        src/lib/engineeringx-analysis-engine.ts
 * @purpose     EngineeringX AI similarity + change-impact + production handoff canonical engine · own entity (Path B · NOT FR-73 consumer · matches BOM Path B precedent)
 * @who         Engineering Lead · Production Planner · Project Manager
 * @when        2026-05-10
 * @sprint      T-Phase-1.A.13 EngineeringX AI similarity + Change-impact + Closeout · Q-LOCK-1b + Q-LOCK-2a + Q-LOCK-3a + Q-LOCK-4a + Q-LOCK-5a · Block A.1 · NEW canonical · CLOSEOUT sprint
 * @iso         ISO 9001:2015 §8.1 · ISO 25010 Maintainability + Compatibility
 * @whom        Audit Owner · Engineering Lead · Production Planner
 * @decisions   Path B own entity (NOT FR-73 consumer · DocVault Hub purity preserved · 5 FR-73 consumers UNCHANGED) ·
 *              D-NEW-CR AI similarity Phase 1 rule-based stub pattern (POSSIBLE 15th canonical · deterministic signature + scoring · [JWT] markers preserve Phase 2 ML contract) ·
 *              D-NEW-CS Change-impact reverse FK pattern (POSSIBLE 16th canonical · reverse FK finds impacted children) ·
 *              D-NEW-CP DocumentTag custom_tags engineering metadata pattern (preserved · ai_similarity_signature slot) ·
 *              D-NEW-BV Phase 1 mock · FR-11 SSOT
 * @disciplines FR-21 · FR-29 · FR-30 · FR-33 · FR-50
 * @reuses      types/docvault.ts (zero-touch · FR-73 Hub) · engineeringx-engine.ts (FR-73.2 spoke wrapper · zero-touch) ·
 *              types/engineering-drawing.ts (DRAWING_CUSTOM_TAG_KEYS) · types/projx/project.ts (zero-touch)
 * @[JWT]       Phase 1 mock similarity scoring · Phase 2 backend wires real ML embeddings via edge function ·
 *              [JWT] /api/engineeringx/similarity/score (Phase 2)
 */
import type { Document } from '@/types/docvault';
import type { Project } from '@/types/projx/project';
import {
  DRAWING_CUSTOM_TAG_KEYS, parseDrawingCustomTags,
} from '@/types/engineering-drawing';
import { listDrawings, getDrawing } from '@/lib/engineeringx-engine';

// ============================================================================
// AI SIMILARITY (D-NEW-CR Phase 1 rule-based stub pattern · POSSIBLE 15th canonical)
// ============================================================================

/**
 * Compute deterministic similarity signature for a drawing.
 * Phase 1: hash-style signature from drawing_subtype + project_id + sorted custom_tags keys.
 * Phase 2: ML embedding stored in same `ai_similarity_signature` custom_tag slot.
 * @[JWT] Phase 2 backend wires real ML embeddings · institutional D-NEW-BV pattern
 */
export function computeSimilaritySignature(drawing: Document): string {
  const meta = parseDrawingCustomTags(drawing.tags?.custom_tags);
  const subtype = meta.drawing_subtype ?? 'other';
  const projectId = drawing.project_id ?? 'no-project';
  const customKeys = Object.keys(meta).filter((k) => k !== 'drawing_no').sort().join(',');
  // [JWT] Phase 2: real ML embedding · this Phase 1 hash is deterministic stub
  return `v1:${subtype}:${projectId}:${customKeys}`;
}

/**
 * Score similarity between two drawings · Phase 1 rule-based scoring.
 * Returns score in [0, 1] · weighted: subtype 0.4 + project 0.3 + tag_overlap 0.3.
 */
export function scoreSimilarity(a: Document, b: Document): number {
  if (a.id === b.id) return 1.0;
  const metaA = parseDrawingCustomTags(a.tags?.custom_tags);
  const metaB = parseDrawingCustomTags(b.tags?.custom_tags);

  const subtypeMatch =
    metaA.drawing_subtype && metaA.drawing_subtype === metaB.drawing_subtype ? 1.0 : 0.0;
  const projectMatch = a.project_id && a.project_id === b.project_id ? 1.0 : 0.0;

  const keysA = new Set(Object.keys(metaA));
  const keysB = new Set(Object.keys(metaB));
  const intersection = new Set([...keysA].filter((k) => keysB.has(k)));
  const union = new Set([...keysA, ...keysB]);
  const tagJaccard = union.size > 0 ? intersection.size / union.size : 0;

  return subtypeMatch * 0.4 + projectMatch * 0.3 + tagJaccard * 0.3;
}

/**
 * Returns structured natural-language explanation of similarity · used for Dishani prompt context.
 */
export function getSimilarityExplanation(a: Document, b: Document): string {
  const metaA = parseDrawingCustomTags(a.tags?.custom_tags);
  const metaB = parseDrawingCustomTags(b.tags?.custom_tags);
  const reasons: string[] = [];
  if (metaA.drawing_subtype && metaA.drawing_subtype === metaB.drawing_subtype) {
    reasons.push(`Same subtype (${metaA.drawing_subtype})`);
  }
  if (a.project_id && a.project_id === b.project_id) reasons.push('Same project');
  const sharedKeys = Object.keys(metaA).filter((k) => k in metaB);
  if (sharedKeys.length > 0) reasons.push(`Shares ${sharedKeys.length} metadata keys`);
  return reasons.length > 0 ? reasons.join(' · ') : 'Weak similarity';
}

/**
 * Find similar drawings · ranked by similarity score.
 * Phase 1: rule-based scoring · Phase 2: edge function with ML embeddings.
 * @[JWT] /api/engineeringx/similarity/find?drawing_id=X (Phase 2)
 */
export function findSimilarDrawings(
  entityCode: string,
  drawingId: string,
  limit = 10,
): Array<{ drawing: Document; score: number; reason: string }> {
  const target = getDrawing(entityCode, drawingId);
  if (!target) return [];
  const all = listDrawings(entityCode).filter((d) => d.id !== drawingId);
  return all
    .map((d) => ({
      drawing: d,
      score: scoreSimilarity(target, d),
      reason: getSimilarityExplanation(target, d),
    }))
    .filter((r) => r.score > 0.1)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Phase 1 stub for storing similarity signature · returns true to indicate intent.
 * @[JWT] Phase 2 backend persists ai_similarity_signature custom_tag via DocVault canonical
 */
export function setSimilaritySignature(
  _entityCode: string,
  _drawingId: string,
  _signature: string,
): boolean {
  // [JWT] Phase 2: PATCH /api/docvault/documents/:id with ai_similarity_signature custom_tag
  void DRAWING_CUSTOM_TAG_KEYS.ai_similarity_signature;
  return true;
}

/**
 * Phase 1 stub for ML training data collection · records user vote on similarity result.
 * @[JWT] Phase 2 backend logs to analytics for ML model training
 */
export function recordSimilarityVote(
  _entityCode: string,
  _drawingId: string,
  _similarDrawingId: string,
  _vote: 'up' | 'down',
): void {
  // [JWT] Phase 2: POST /api/engineeringx/similarity/vote · stores in analytics for ML training
}

// ============================================================================
// CHANGE-IMPACT (D-NEW-CS reverse FK pattern · POSSIBLE 16th canonical)
// ============================================================================

/**
 * Find projects impacted by a drawing change · cross-card consumer query for ProjX.
 */
export function findImpactedProjects(
  entityCode: string,
  drawingId: string,
  allProjects: Project[],
): Project[] {
  const drawing = getDrawing(entityCode, drawingId);
  if (!drawing) return [];
  const projectId = drawing.project_id;
  if (!projectId) return [];
  return allProjects.filter((p) => p.id === projectId);
}

/**
 * Find drawings impacted by a parent drawing change · reverse FK query for reference_source_drawing_id.
 * D-NEW-CP institutional pattern reverse query: drawings cloned from this drawing.
 */
export function findImpactedDrawings(
  entityCode: string,
  parentDrawingId: string,
): Document[] {
  return listDrawings(entityCode).filter((d) => {
    const meta = parseDrawingCustomTags(d.tags?.custom_tags);
    return meta.reference_source_drawing_id === parentDrawingId;
  });
}

/**
 * Combined change-impact summary.
 */
export function getDrawingChangeImpactSummary(
  entityCode: string,
  drawingId: string,
  allProjects: Project[],
): { impactedProjects: Project[]; impactedDrawings: Document[] } {
  return {
    impactedProjects: findImpactedProjects(entityCode, drawingId, allProjects),
    impactedDrawings: findImpactedDrawings(entityCode, drawingId),
  };
}

// ============================================================================
// PRODUCTION HANDOFF (cross-card consumer query for Production card)
// ============================================================================

/**
 * Drawing is ready for production if approved + BOM extracted.
 */
export function isReadyForProduction(drawing: Document): boolean {
  const approvedVersion = drawing.versions?.find(
    (v) => v.version_no === drawing.current_version && v.version_status === 'approved',
  );
  if (!approvedVersion) return false;
  const meta = parseDrawingCustomTags(drawing.tags?.custom_tags);
  return meta.bom_extracted === 'true';
}

/**
 * Cross-card consumer query for Production card · returns all drawings ready for production.
 */
export function listReadyForProduction(entityCode: string): Document[] {
  return listDrawings(entityCode).filter(isReadyForProduction);
}
