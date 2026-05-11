/**
 * @file        src/lib/sitex-bridges.ts
 * @purpose     SiteX cross-card event bridge registry · FR-19 sibling discipline · A.14 emit-only · subscribers wire at A.15
 * @who         Operations Lead · System Integration · Audit
 * @when        2026-05-11
 * @sprint      T-Phase-1.A.14 SiteX Foundation · Q-LOCK-4a + Q-LOCK-8a · Block B.1 · NEW canonical
 * @iso         ISO 25010 Maintainability + Reliability
 * @whom        Audit Owner
 * @decisions   D-NEW-CU POSSIBLE · FR-19 sibling · D-NEW-CE pattern · FR-52 #5 Inter-Branch
 * @disciplines FR-1 · FR-19 · FR-22 · FR-30 · FR-50 · FR-51 · FR-52 · FR-53 · FR-58
 * @reuses      SiteMobilizedEvent from @/types/sitex (sibling) · existing BranchOffice + entity-setup-service infra (zero-touch)
 * @[JWT]       Phase 2 backend wires real event bus
 */

import type { SiteMobilizedEvent } from '@/types/sitex';

// ============================================================================
// SiteX → BranchOffice bridge (A.14 emit-only · subscriber wires at A.15)
// ============================================================================

export function emitSiteMobilized(event: SiteMobilizedEvent): void {
  // [JWT] Phase 2: POST /api/sitex/bridges/site-mobilized
  // A.14 SCOPE: emit-only · subscriber wiring lands at A.15
  // A.15 will add:
  //   1. createBranchOfficeForSite(event) via existing entity-setup-service.ts pattern
  //   2. BD inter-entity ledger entries (transitive)
  //   3. 5 dept godowns auto-seed at new branch (transitive)
  //   4. Site updated with branch_id FK (back-reference)
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('sitex:site.mobilized', { detail: event }));
  }
}

// ============================================================================
// A.15 PLANNED subscriptions (documented · not wired at A.14)
// ============================================================================

// A.15 PLANNED · Snag-to-NCR Smart Bridge (OOB #10)
// A.15 PLANNED · Drawing Currency Alert (OOB #9) · subscribes to EngineeringX drawing.version.superseded
// A.15 PLANNED · ServiceDesk Handoff at Commissioning (Tier 1 #13 · external mode)
// A.15 PLANNED · MaintainPro Handoff at Site Close (CAPEX mode)
// A.15 PLANNED · Asset Capitalization Trigger (CAPEX mode · OOB #18)
// A.15 PLANNED · HO→Site Fund Transfer Reconciliation (FR-52 #5 · OOB #7)
// A.15 PLANNED · Compliance Alert Aggregation
// A.15 PLANNED · Cross-Dept Handoff Tracker MOAT #18 Extension
