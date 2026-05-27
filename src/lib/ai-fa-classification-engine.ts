/**
 * @file        src/lib/ai-fa-classification-engine.ts
 * @sibling     NEW @ Sprint 68 FAR-4 · 47th SIBLING
 * @realizes    MOAT-48 · AI-Driven FA Category Auto-Classification
 * @flips       FAR-CAP-20 (AI custodian-drift detector) to FULL
 * @backed-by   AssetUnitRecord.ai_classification_suggestion + ai_classification_confidence (Block 1)
 * @approach    Rule-based heuristic per Q-LOCK-3 C · keyword pattern matching · explainable to auditors
 * @upgrade     Phase 5 InsightX capstone may swap to TF.js model
 * [JWT] Phase 5: POST /api/ai/fa-classification/train (TF.js model training endpoint)
 */
import type { AssetUnitRecord, IoTSignal } from '@/types/fixed-asset';

// 12 canonical FA categories per Schedule II + Ind AS 16 ¶43
export type FACategory =
  | 'PLANT_MACHINERY'
  | 'OFFICE_EQUIPMENT'
  | 'COMPUTERS_PERIPHERALS'
  | 'FURNITURE_FIXTURES'
  | 'VEHICLES_TRANSPORT'
  | 'BUILDINGS_REAL_ESTATE'
  | 'LAND_FREEHOLD'
  | 'LEASEHOLD_IMPROVEMENTS'
  | 'TOOLS_DIES_FIXTURES'
  | 'INTANGIBLE_SOFTWARE'
  | 'INTANGIBLE_OTHER'
  | 'UNCLASSIFIED';

const CATEGORY_KEYWORDS: Record<FACategory, string[]> = {
  PLANT_MACHINERY: ['machine', 'machinery', 'press', 'cnc', 'lathe', 'mill', 'reactor', 'compressor', 'pump', 'generator'],
  OFFICE_EQUIPMENT: ['printer', 'copier', 'scanner', 'phone', 'desk lamp', 'projector', 'shredder', 'ups'],
  COMPUTERS_PERIPHERALS: ['laptop', 'desktop', 'monitor', 'server', 'computer', 'tablet', 'keyboard', 'mouse', 'router', 'switch'],
  FURNITURE_FIXTURES: ['chair', 'desk', 'cabinet', 'shelf', 'partition', 'table', 'sofa', 'cubicle'],
  VEHICLES_TRANSPORT: ['car', 'truck', 'van', 'motorcycle', 'forklift', 'tractor', 'bus', 'trailer', 'vehicle'],
  BUILDINGS_REAL_ESTATE: ['building', 'office', 'warehouse', 'shed', 'factory', 'godown'],
  LAND_FREEHOLD: ['land', 'plot', 'site', 'acreage', 'freehold'],
  LEASEHOLD_IMPROVEMENTS: ['leasehold improvement', 'tenant improvement', 'fit-out', 'fitout'],
  TOOLS_DIES_FIXTURES: ['die', 'jig', 'fixture', 'mould', 'mold', 'tooling', 'gauge'],
  INTANGIBLE_SOFTWARE: ['software license', 'subscription', 'saas', 'erp license', 'software'],
  INTANGIBLE_OTHER: ['patent', 'trademark', 'goodwill', 'copyright', 'brand'],
  UNCLASSIFIED: [],
};

export interface ClassificationResult {
  suggested_category: FACategory;
  confidence: number;
  matched_keywords: string[];
  alternatives: { category: FACategory; confidence: number }[];
}

const TAUGHT_KEY = (cat: FACategory): string => `ai_fa_classification_taught_keywords_${cat}`;

function loadTaught(category: FACategory): string[] {
  try {
    const raw = localStorage.getItem(TAUGHT_KEY(category));
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function allKeywordsFor(category: FACategory): string[] {
  return [...CATEGORY_KEYWORDS[category], ...loadTaught(category)];
}

export function classifyFA(
  description: string,
  invoice_line_items?: string[],
): ClassificationResult {
  const haystack = [description, ...(invoice_line_items ?? [])].join(' ').toLowerCase();
  if (!haystack.trim()) {
    return { suggested_category: 'UNCLASSIFIED', confidence: 0, matched_keywords: [], alternatives: [] };
  }

  const scores: { category: FACategory; matches: string[]; score: number }[] = [];
  (Object.keys(CATEGORY_KEYWORDS) as FACategory[]).forEach((cat) => {
    if (cat === 'UNCLASSIFIED') return;
    const kws = allKeywordsFor(cat);
    const matches = kws.filter((kw) => haystack.includes(kw.toLowerCase()));
    if (matches.length > 0) {
      // confidence = (match density) · capped at 0.95 for rule-based
      const density = Math.min(matches.length / 3, 1);
      const score = Math.min(0.5 + density * 0.45, 0.95);
      scores.push({ category: cat, matches, score });
    }
  });

  if (scores.length === 0) {
    return { suggested_category: 'UNCLASSIFIED', confidence: 0, matched_keywords: [], alternatives: [] };
  }

  scores.sort((a, b) => b.score - a.score);
  const top = scores[0];
  return {
    suggested_category: top.category,
    confidence: Number(top.score.toFixed(2)),
    matched_keywords: top.matches,
    alternatives: scores.slice(1, 4).map((s) => ({ category: s.category, confidence: Number(s.score.toFixed(2)) })),
  };
}

export function acceptSuggestion(
  record: AssetUnitRecord,
  accepted_category: FACategory,
  user_confidence: number = 1.0,
): AssetUnitRecord {
  const now = new Date().toISOString();
  return {
    ...record,
    ai_classification_suggestion: accepted_category,
    ai_classification_confidence: Math.max(0, Math.min(user_confidence, 1)),
    updated_at: now,
  };
}

export function teachModel(category: FACategory, new_keyword: string): void {
  const trimmed = new_keyword.trim().toLowerCase();
  if (!trimmed) return;
  try {
    const existing = loadTaught(category);
    if (existing.includes(trimmed)) return;
    existing.push(trimmed);
    localStorage.setItem(TAUGHT_KEY(category), JSON.stringify(existing));
  } catch {
    // localStorage unavailable · skip silently
  }
}

/**
 * Custodian-drift detector · analyses recent location signals · flags drift
 * if asset appears to move away from custodian's normal area.
 */
export function detectCustodianDrift(
  record: AssetUnitRecord,
  signals: IoTSignal[],
): { is_drift: boolean; drift_score: number; recommendation: string } {
  const locationSignals = signals.filter((s) => s.sensor_type === 'location');
  if (locationSignals.length < 2) {
    return { is_drift: false, drift_score: 0, recommendation: 'Insufficient location signals to assess drift.' };
  }

  // Crude heuristic: count distinct unit/location strings observed in window
  const uniqueLocations = new Set(locationSignals.map((s) => s.unit));
  const drift_score = Math.min(uniqueLocations.size / 5, 1);
  const is_drift = drift_score >= 0.4;
  const custodianRef = record.custodian_employee_id ?? record.custodian_name ?? 'unassigned';
  const recommendation = is_drift
    ? `Asset ${record.asset_id} has been observed in ${uniqueLocations.size} distinct locations · review custodian assignment (${custodianRef}).`
    : `No significant drift detected for ${record.asset_id}.`;
  return { is_drift, drift_score: Number(drift_score.toFixed(2)), recommendation };
}
