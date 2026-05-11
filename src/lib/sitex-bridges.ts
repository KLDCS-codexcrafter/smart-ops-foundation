/**
 * @file        src/lib/sitex-bridges.ts
 * @purpose     SiteX cross-card event bridge registry · FR-19 sibling · A.15a wires 4 bridges (Snag-to-NCR + ServiceDesk + MaintainPro + AssetCap)
 * @sprint      T-Phase-1.A.15a SiteX Closeout · Block G.4 + H.1 · WIRES A.14 PLANNED stubs
 * @decisions   FR-19 sibling · D-NEW-CE · FR-52 #5 · Q-LOCK-15a 3 closeout bridges · OOB #10 Snag-to-NCR
 * @[JWT]       Phase 2 backend wires real event bus
 */

import type {
  SiteMobilizedEvent, CommissioningHandoffEvent, MaintainProHandoffEvent,
  AssetCapitalizationEvent, SnagRaisedEvent,
} from '@/types/sitex';

export function emitSiteMobilized(event: SiteMobilizedEvent): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('sitex:site.mobilized', { detail: event }));
  }
}

// ============================================================================
// A.15a WIRED · 3 closeout bridges (Q-LOCK-15a · emit-only at A.15a · subscribers later)
// ============================================================================

export function emitCommissioningHandoff(event: CommissioningHandoffEvent): void {
  // [JWT] Phase 2: POST /api/servicedesk/amc-tickets · ServiceDesk subscriber lands at C.1-C.2
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('sitex:commissioning.handoff', { detail: event }));
  }
}

export function emitMaintainProHandoff(event: MaintainProHandoffEvent): void {
  // [JWT] Phase 2: POST /api/maintainpro/equipment
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('sitex:maintainpro.handoff', { detail: event }));
  }
}

export function emitAssetCapitalization(event: AssetCapitalizationEvent): void {
  // [JWT] Phase 2: POST /api/fincore/vouchers/asset-capitalization (DR Fixed Asset / CR CWIP)
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('sitex:asset.capitalization', { detail: event }));
  }
}

// ============================================================================
// A.15a WIRED · Snag-to-NCR Smart Bridge (OOB #10 · FR-19 · zero-touch on Qulicheak NCR engine)
// ============================================================================

export function emitSnagRaisedSevere(event: SnagRaisedEvent): void {
  // [JWT] Phase 2: direct ncr-engine.createNCR() call wired here
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('sitex:snag.raised.severe', { detail: event }));
  }
}
