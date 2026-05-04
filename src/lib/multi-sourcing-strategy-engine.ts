/**
 * @file        multi-sourcing-strategy-engine.ts
 * @sprint      T-Phase-1.2.6f-d-2 · Block C · per D-299 (Q3=A 3 strategies · Q4=A pure function)
 * @purpose     Recommend sourcing strategy for indents
 *              (single_source · multi_quote · reverse_auction).
 *              Pure function · NOT inside vendor-quotation-engine (D-299 sibling discipline).
 *              No storage reads · no side effects · fully testable.
 * @decisions   D-299 · D-249 (VendorMaster ZERO TOUCH · 14-cycle preservation · we accept a
 *              minimal VendorPoolEntry shape that callers populate from any source).
 * @reuses      types/material-indent · types/capital-indent · types/service-request
 * @consumers   Block D · IndentRegister Strategy column.
 * @notes       Project has no exported `Vendor` type (VendorMaster uses an internal
 *              VendorMasterDefinition · D-249 zero-touch). We declare a minimal
 *              VendorPoolEntry interface here · structural typing means any vendor
 *              record with these fields satisfies the input.
 */

import type { MaterialIndent } from '@/types/material-indent';
import type { CapitalIndent } from '@/types/capital-indent';
import type { ServiceRequest } from '@/types/service-request';

// ============================================================
// PUBLIC TYPES (Q3=A · 3 strategies)
// ============================================================

export type SourcingStrategy = 'single_source' | 'multi_quote' | 'reverse_auction';

export interface StrategyRecommendation {
  strategy: SourcingStrategy;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string[];
  vendor_count_recommended: number;
  est_savings_pct: number | null;
  warnings: string[];
}

export type IndentInput = MaterialIndent | CapitalIndent | ServiceRequest;

/**
 * Minimal vendor shape the engine relies on. Structural typing — any record
 * with these fields is accepted (keeps VendorMaster zero-touch · D-249).
 */
export interface VendorPoolEntry {
  id: string;
  name?: string;
  status?: string;          // expected 'active' for eligibility
  is_preferred?: boolean;
  categories?: string[];    // category tags for matching against indent.category
}

// ============================================================
// PUBLIC FUNCTION · per Q4=A pure function input shape
// ============================================================

/**
 * Recommend sourcing strategy for an indent.
 *
 * Decision tree (Q3=A):
 *   - reverse_auction: indent value ≥ ₹5,00,000
 *   - single_source : indent value < ₹50,000 AND a preferred eligible vendor exists
 *   - multi_quote   : default · standard P2P (₹50K – ₹5L)
 *
 * Pure function · no storage reads · no side effects · stable for a given input.
 */
export function recommendStrategy(
  indent: IndentInput,
  vendorPool: VendorPoolEntry[],
  _entityCode: string,
): StrategyRecommendation {
  const indentValue = computeIndentValue(indent);
  const itemCount = computeItemCount(indent);
  const category = computeCategory(indent);
  const eligibleVendors = filterEligibleVendors(vendorPool, category);

  const reasoning: string[] = [];
  const warnings: string[] = [];

  let strategy: SourcingStrategy;
  let confidence: 'high' | 'medium' | 'low' = 'high';
  let vendorCountRec = 0;
  let estSavingsPct: number | null = null;

  // Rule 1 · Reverse auction for high-value
  if (indentValue >= 500_000) {
    strategy = 'reverse_auction';
    vendorCountRec = Math.min(eligibleVendors.length, 8);
    estSavingsPct = 8.5;
    reasoning.push(
      `Indent value ₹${indentValue.toLocaleString('en-IN')} exceeds ₹5L threshold · reverse auction recommended for max savings.`,
    );
    reasoning.push(
      `${vendorCountRec} eligible vendors available · auction tension drives competitive pricing.`,
    );
    if (eligibleVendors.length < 5) {
      warnings.push(
        `Only ${eligibleVendors.length} vendors in pool · auction effectiveness reduced (5+ recommended).`,
      );
      confidence = 'medium';
    }
  }
  // Rule 2 · Single source for low-value pre-approved
  else if (indentValue < 50_000 && eligibleVendors.some((v) => v.is_preferred)) {
    strategy = 'single_source';
    vendorCountRec = 1;
    estSavingsPct = null;
    reasoning.push(
      `Indent value ₹${indentValue.toLocaleString('en-IN')} below ₹50K threshold · administrative overhead of multi-quote not justified.`,
    );
    reasoning.push('Preferred vendor available · skip RFQ for fast turnaround.');
    if (itemCount > 5) {
      warnings.push(
        `${itemCount} line items · consider bulk-rate negotiation even with single source.`,
      );
    }
  }
  // Rule 3 · Multi-quote (default)
  else {
    strategy = 'multi_quote';
    vendorCountRec = Math.min(eligibleVendors.length, 5);
    estSavingsPct = 4.5;
    reasoning.push(
      `Indent value ₹${indentValue.toLocaleString('en-IN')} in standard range (₹50K – ₹5L) · 3-quote rule applies.`,
    );
    reasoning.push(`${vendorCountRec} vendors recommended for healthy comparison.`);
    if (eligibleVendors.length < 3) {
      warnings.push(
        `Only ${eligibleVendors.length} vendors eligible · expand vendor pool for proper 3-quote discipline.`,
      );
      confidence = 'low';
    }
  }

  if (eligibleVendors.length === 0) {
    warnings.push(
      `No eligible vendors found for category "${category}" · vendor onboarding required.`,
    );
    confidence = 'low';
  }

  return {
    strategy,
    confidence,
    reasoning,
    vendor_count_recommended: vendorCountRec,
    est_savings_pct: estSavingsPct,
    warnings,
  };
}

// ============================================================
// PRIVATE HELPERS · pure
// ============================================================

function computeIndentValue(indent: IndentInput): number {
  // MaterialIndent / CapitalIndent / ServiceRequest all expose total_estimated_value
  if ('total_estimated_value' in indent && typeof indent.total_estimated_value === 'number') {
    return indent.total_estimated_value;
  }
  // Fallback · sum line.estimated_value
  if ('lines' in indent && Array.isArray(indent.lines)) {
    return indent.lines.reduce((s, l) => {
      const v = (l as { estimated_value?: number }).estimated_value;
      return s + (typeof v === 'number' ? v : 0);
    }, 0);
  }
  return 0;
}

function computeItemCount(indent: IndentInput): number {
  if ('lines' in indent && Array.isArray(indent.lines)) return indent.lines.length;
  return 1;
}

function computeCategory(indent: IndentInput): string {
  // MaterialIndent has `category` (IndentCategory enum)
  // CapitalIndent has `capital_sub_type` (CapitalSubType)
  // ServiceRequest has `category` (ServiceCategory)
  if ('category' in indent && typeof indent.category === 'string') return indent.category;
  if ('capital_sub_type' in indent && typeof indent.capital_sub_type === 'string') {
    return indent.capital_sub_type;
  }
  return 'general';
}

function filterEligibleVendors(pool: VendorPoolEntry[], category: string): VendorPoolEntry[] {
  return pool.filter((v) => {
    const isActive = !v.status || v.status === 'active';
    if (!isActive) return false;
    if (!v.categories || v.categories.length === 0) return true;     // un-tagged vendor matches everything
    return v.categories.some((c) => c === category || c === 'general');
  });
}
