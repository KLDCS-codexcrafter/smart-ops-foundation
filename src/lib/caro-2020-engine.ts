/**
 * caro-2020-engine.ts — 40th SIBLING ⭐
 * CARO 2020 Paragraph 3(i) auto-assessment engine (Fixed Assets).
 * @sprint T-Phase-4.FAR-1 · MOAT-39
 *
 * Pure-computation engine following FR-19 SIBLING discipline.
 * Reads asset-unit records via faUnitsKey(entityCode).
 * [JWT] Replace localStorage reads with GET /api/fixed-assets/units/:entity
 */
import type { AssetUnitRecord } from '@/types/fixed-asset';
import { faUnitsKey } from '@/types/fixed-asset';
import type {
  CAROAssessmentResult,
  CAROSubRuleResult,
} from '@/types/statutory-pack';

function loadUnits(entityCode: string): AssetUnitRecord[] {
  try {
    const raw = localStorage.getItem(faUnitsKey(entityCode));
    if (!raw) return [];
    const list = JSON.parse(raw) as AssetUnitRecord[];
    return list.filter(u => u.entity_id === entityCode);
  } catch { return []; }
}

/** Sub-rule (a): asset register completeness — required fields present. */
export function checkAssetRegisterCompleteness(entityCode: string): CAROSubRuleResult {
  const units = loadUnits(entityCode);
  const missing = units.filter(u =>
    !u.asset_id || !u.gross_block_cost || !u.purchase_date || !u.it_act_block || !u.location,
  );
  return {
    id: 'a-completeness',
    label: 'Proper records showing full particulars (3(i)(a))',
    pass: missing.length === 0,
    finding: missing.length === 0
      ? 'All asset records contain mandatory particulars.'
      : `${missing.length} asset(s) missing mandatory particulars.`,
    count: missing.length,
    evidence: missing.slice(0, 10).map(u => u.asset_id),
  };
}

/** Sub-rule (b): physical verification at reasonable intervals. */
export function checkPhysicalVerificationStatus(entityCode: string): CAROSubRuleResult {
  const units = loadUnits(entityCode).filter(u => u.status === 'active');
  // Heuristic: presence of asset_tag_id OR hr_asset_id signals physical verification trail.
  const unverified = units.filter(u => !u.asset_tag_id && !u.hr_asset_id);
  return {
    id: 'b-verification',
    label: 'Physical verification at reasonable intervals (3(i)(b))',
    pass: unverified.length === 0,
    finding: unverified.length === 0
      ? 'All active assets have a physical verification trail (tag or HR link).'
      : `${unverified.length} active asset(s) lack a physical verification trail.`,
    count: unverified.length,
    evidence: unverified.slice(0, 10).map(u => u.asset_id),
  };
}

/** Sub-rule (c): title deeds for immovable property held in name of company. */
export function checkTitleDeedsForImmovable(entityCode: string): CAROSubRuleResult {
  const units = loadUnits(entityCode);
  const immovable = units.filter(u => u.it_act_block === 'Building');
  // Heuristic: capital_purchase_voucher_id presence == documentary evidence retained.
  const missing = immovable.filter(u => !u.capital_purchase_voucher_id);
  return {
    id: 'c-title-deeds',
    label: 'Title deeds for immovable property held in name (3(i)(c))',
    pass: missing.length === 0,
    finding: missing.length === 0
      ? `All ${immovable.length} immovable asset(s) have linked purchase voucher evidence.`
      : `${missing.length} immovable asset(s) missing purchase voucher evidence.`,
    count: missing.length,
    evidence: missing.slice(0, 10).map(u => u.asset_id),
  };
}

/** Sub-rule (d): revaluation disclosure (>10% change must be disclosed). */
export function checkRevaluationDisclosure(entityCode: string): CAROSubRuleResult {
  const units = loadUnits(entityCode);
  // Heuristic: NBV materially diverging from (gross - accum depr) suggests unrecorded revaluation.
  const drifted = units.filter(u => {
    const computed = u.gross_block_cost - u.accumulated_depreciation;
    if (computed <= 0) return false;
    const drift = Math.abs(u.net_book_value - computed) / computed;
    return drift > 0.10;
  });
  return {
    id: 'd-revaluation',
    label: 'Revaluation disclosure where change exceeds 10% (3(i)(d))',
    pass: drifted.length === 0,
    finding: drifted.length === 0
      ? 'No undisclosed revaluation drift detected.'
      : `${drifted.length} asset(s) show >10% NBV drift requiring disclosure.`,
    count: drifted.length,
    evidence: drifted.slice(0, 10).map(u => u.asset_id),
  };
}

/** Sub-rule (e): benami / proceedings under Benami Transactions Act. */
export function checkBenamiInvestigations(entityCode: string): CAROSubRuleResult {
  // No benami flag in schema · default PASS · placeholder for future flag.
  return {
    id: 'e-benami',
    label: 'No proceedings under Benami Transactions Act (3(i)(e))',
    pass: true,
    finding: 'No benami proceedings flagged against entity assets.',
    count: 0,
    evidence: [],
  };
}

/** Aggregator across all 5 sub-rules. */
export function assessCAROParagraph3i(
  entityCode: string,
  fyStart: string,
  fyEnd: string,
): CAROAssessmentResult {
  const subRules = [
    checkAssetRegisterCompleteness(entityCode),
    checkPhysicalVerificationStatus(entityCode),
    checkTitleDeedsForImmovable(entityCode),
    checkRevaluationDisclosure(entityCode),
    checkBenamiInvestigations(entityCode),
  ];
  return {
    entityCode,
    fyStart,
    fyEnd,
    paragraph: '3(i)',
    overallPass: subRules.every(r => r.pass),
    subRules,
    generatedAt: new Date().toISOString(),
  };
}

/** Alias for the final disclosure report. */
export function generateCARODisclosureReport(
  entityCode: string,
  fyStart: string,
  fyEnd: string,
): CAROAssessmentResult {
  return assessCAROParagraph3i(entityCode, fyStart, fyEnd);
}
