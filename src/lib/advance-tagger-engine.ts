/**
 * @file     advance-tagger-engine.ts
 * @purpose  Detects unmatched advances per vendor/customer · suggests links ·
 *           helper queries for UnmatchedAdvanceBanner + Bill Settlement screen.
 * @who      Operix Engineering
 * @when     Apr-2026
 * @sprint   T-T8.3-AdvanceIntel · Group B Sprint B.3
 * @phase    Phase 1 · localStorage · Phase 2 swap to backend with same join contract.
 *
 * IMPORTANT: This is a pure query/suggestion engine · does NOT mutate state.
 * Reads existing advancesKey storage (auto-populated by finecore-engine on
 * voucher post · line 452-475) and existing voucher storage for open
 * invoice queries. Returns matchable pairs · UI decides what to do with them.
 *
 * Per Q-CC (a) leverage existing FinCore · D-146 no parallel infrastructure.
 */
import type { AdvanceEntry } from '@/types/compliance';
import { advancesKey } from '@/types/compliance';
import type { Voucher } from '@/types/voucher';
import { vouchersKey } from '@/lib/finecore-engine';

// ── Internal storage helpers ─────────────────────────────────────

function loadAdvances(entityCode: string): AdvanceEntry[] {
  try {
    // [JWT] GET /api/compliance/advances/:entity
    const raw = localStorage.getItem(advancesKey(entityCode));
    return raw ? (JSON.parse(raw) as AdvanceEntry[]) : [];
  } catch { return []; }
}

function loadVouchers(entityCode: string): Voucher[] {
  try {
    // [JWT] GET /api/accounting/vouchers/:entity
    const raw = localStorage.getItem(vouchersKey(entityCode));
    return raw ? (JSON.parse(raw) as Voucher[]) : [];
  } catch { return []; }
}

// ── Public API: Unmatched advance detection ──────────────────────

/**
 * Returns advances with status open or partial (and balance > 0) for a
 * specific vendor. Used by UnmatchedAdvanceBanner.
 */
export function getUnmatchedAdvancesForVendor(
  entityCode: string,
  vendorId: string,
): AdvanceEntry[] {
  if (!entityCode || !vendorId) return [];
  return loadAdvances(entityCode).filter(
    a => a.party_type === 'vendor'
      && a.party_id === vendorId
      && (a.status === 'open' || a.status === 'partial')
      && a.balance_amount > 0,
  );
}

/**
 * Returns ALL unmatched vendor advances grouped by vendor party_id.
 * Used by Bill Settlement screen left pane.
 */
export function getUnmatchedAdvancesAllVendors(
  entityCode: string,
): Map<string, AdvanceEntry[]> {
  const all = loadAdvances(entityCode).filter(
    a => a.party_type === 'vendor'
      && (a.status === 'open' || a.status === 'partial')
      && a.balance_amount > 0,
  );
  const grouped = new Map<string, AdvanceEntry[]>();
  for (const adv of all) {
    if (!grouped.has(adv.party_id)) grouped.set(adv.party_id, []);
    grouped.get(adv.party_id)!.push(adv);
  }
  return grouped;
}

/**
 * Returns posted Purchase Invoices for a specific vendor. For B.3 a
 * posted Purchase Invoice is treated as an "open" candidate — future
 * enhancement will aggregate paid amounts across Payment vouchers.
 */
export function getOpenInvoicesForVendor(
  entityCode: string,
  vendorId: string,
): Voucher[] {
  if (!entityCode || !vendorId) return [];
  return loadVouchers(entityCode).filter(
    v => v.base_voucher_type === 'Purchase'
      && v.party_id === vendorId,
  );
}

// ── Public API: Match suggestion ─────────────────────────────────

export interface SuggestedMatch {
  advance: AdvanceEntry;
  invoice: Voucher;
  matchScore: number; // 0-100
  reason: string;     // human-readable
}

/**
 * Suggests advance↔invoice pairs based on amount proximity, PO ref,
 * and date order. Used by Bill Settlement screen "auto-match" button.
 */
export function suggestAdvanceMatches(
  entityCode: string,
  vendorId?: string,
): SuggestedMatch[] {
  const advances = vendorId
    ? getUnmatchedAdvancesForVendor(entityCode, vendorId)
    : Array.from(getUnmatchedAdvancesAllVendors(entityCode).values()).flat();

  const matches: SuggestedMatch[] = [];
  for (const adv of advances) {
    const invoices = getOpenInvoicesForVendor(entityCode, adv.party_id);
    for (const inv of invoices) {
      // Skip if advance already settled against this invoice
      if (adv.adjustments.some(a => a.invoice_id === inv.id)) continue;

      let score = 0;
      const reasons: string[] = [];
      if (Math.abs(adv.balance_amount - inv.net_amount) < 0.01) {
        score += 60;
        reasons.push('exact amount match');
      } else if (
        adv.balance_amount >= inv.net_amount * 0.9
        && adv.balance_amount <= inv.net_amount * 1.1
      ) {
        score += 30;
        reasons.push('amount within 10%');
      }
      if (adv.po_ref && inv.po_ref && adv.po_ref === inv.po_ref) {
        score += 30;
        reasons.push('same PO ref');
      }
      if (new Date(adv.date) <= new Date(inv.date)) {
        score += 10;
        reasons.push('advance posted before invoice');
      }
      if (score > 0) {
        matches.push({
          advance: adv,
          invoice: inv,
          matchScore: Math.min(100, score),
          reason: reasons.join(', '),
        });
      }
    }
  }
  return matches.sort((a, b) => b.matchScore - a.matchScore);
}
