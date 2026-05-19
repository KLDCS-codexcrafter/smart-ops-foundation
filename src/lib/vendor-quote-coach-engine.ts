/**
 * @file        src/lib/vendor-quote-coach-engine.ts
 * @purpose     AI Quote Coach v2 engine · historical-data + anonymized peer median coaching ·
 *              per A-d-Q5=B and A-d-Q12=B · privacy-safe k-anonymity (≥5 vendors per peer signal) ·
 *              CONSUME vendor-quotation-engine + vendor-scoring-engine · NO ML inference (Phase 2)
 * @who         Vendor self-service consumption from VendorBidSubmission
 * @when        2026-05-19 (Sprint A-d.2)
 * @sprint      T-Phase-1.A-d.2-VendorPortal-QuoteCoach-Voice
 * @iso         ISO 25010 Functional Suitability · Maintainability · Security (privacy)
 * @whom        Audit Owner
 * @decisions   D-272 self-contained · A-d-Q5=B historical-data coaching · A-d-Q12=B peer median +
 *              vendor history · k-anonymity ≥ 5 (privacy) · D-NEW-EG quote coach engine pattern ·
 *              Superpower #5 AI Quote Coach FIRST VISIBLE ACTIVATION
 * @disciplines FR-30 · FR-50 · FR-79 (no engine-side stamping needed · pure reader)
 * @reuses      vendor-quotation-engine.listQuotations · vendor-scoring-engine.computeVendorScore ·
 *              VendorQuotation + VendorQuotationLine types · CONSUME ONLY
 * @[JWT]       Phase 2: server-side ML inference + LLM coaching via /api/vendor/coach/insights
 *
 * Privacy model · per A-d-Q12=B:
 * - Vendor's own history: full visibility (own quotes · own win/loss)
 * - Peer median: k-anonymity ≥ 5 (need ≥ 5 distinct vendors quoting same item_id) ·
 *   below threshold → suppress peer signal · "Not enough peer data" insight
 */
import { listQuotations, type VendorQuotation } from './vendor-quotation-engine';
import { computeVendorScore } from './vendor-scoring-engine';

const PEER_ANONYMITY_THRESHOLD = 5;

export interface QuoteCoachInsight {
  insight_type: 'peer_rate' | 'win_rate' | 'discount_pattern' | 'tax_compliance';
  severity: 'info' | 'suggestion' | 'warning';
  title: string;
  body: string;
  related_item_id?: string;
  metric_value?: number;
  metric_label?: string;
}

export interface QuoteCoachContextLine {
  enquiry_line_id: string;
  item_id: string;
  rate: number;
  discount_percent: number;
  tax_percent: number;
  qty_quoted: number;
}

export interface QuoteCoachContext {
  vendor_id: string;
  entity_code: string;
  current_lines: QuoteCoachContextLine[];
}

export interface QuoteCoachReport {
  insights: QuoteCoachInsight[];
  vendor_history_summary: {
    total_quotes: number;
    won_quotes: number;
    win_rate_pct: number;
    avg_discount_pct: number;
  };
  peer_anonymization_threshold: number;
  generated_at: string;
}

interface PeerStat {
  item_id: string;
  vendor_count: number;
  median_rate: number;
}

function median(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function computePeerStats(
  allQuotations: VendorQuotation[],
  currentVendorId: string,
  itemIds: string[],
): Map<string, PeerStat> {
  const map = new Map<string, PeerStat>();
  for (const itemId of itemIds) {
    const peerLines: { vendor_id: string; rate: number }[] = [];
    for (const q of allQuotations) {
      if (q.vendor_id === currentVendorId) continue;
      for (const ln of q.lines) {
        if (ln.item_id === itemId) {
          peerLines.push({ vendor_id: q.vendor_id, rate: ln.rate });
        }
      }
    }
    const distinctVendors = new Set(peerLines.map((p) => p.vendor_id)).size;
    if (distinctVendors >= PEER_ANONYMITY_THRESHOLD) {
      const rates = peerLines.map((p) => p.rate);
      map.set(itemId, {
        item_id: itemId,
        vendor_count: distinctVendors,
        median_rate: median(rates),
      });
    }
  }
  return map;
}

function vendorHistorySummary(
  allQuotations: VendorQuotation[],
  vendorId: string,
): { total_quotes: number; won_quotes: number; win_rate_pct: number; avg_discount_pct: number } {
  const mine = allQuotations.filter((q) => q.vendor_id === vendorId);
  if (mine.length === 0) {
    return { total_quotes: 0, won_quotes: 0, win_rate_pct: 0, avg_discount_pct: 0 };
  }
  const won = mine.filter((q) => q.is_awarded).length;
  const allDiscounts: number[] = [];
  for (const q of mine) {
    for (const ln of q.lines) {
      allDiscounts.push(ln.discount_percent);
    }
  }
  const avgDiscount = allDiscounts.length > 0
    ? allDiscounts.reduce((s, d) => s + d, 0) / allDiscounts.length
    : 0;
  return {
    total_quotes: mine.length,
    won_quotes: won,
    win_rate_pct: (won / mine.length) * 100,
    avg_discount_pct: avgDiscount,
  };
}

/**
 * Generate coaching insights for current bid in progress.
 * Pure reader · NO side effects · NO localStorage writes.
 */
export function generateQuoteCoachReport(context: QuoteCoachContext): QuoteCoachReport {
  const allQuotations = listQuotations(context.entity_code);
  const summary = vendorHistorySummary(allQuotations, context.vendor_id);

  const itemIds = Array.from(new Set(context.current_lines.map((ln) => ln.item_id)));
  const peerStats = computePeerStats(allQuotations, context.vendor_id, itemIds);

  const insights: QuoteCoachInsight[] = [];

  for (const line of context.current_lines) {
    const stat = peerStats.get(line.item_id);
    if (!stat) continue;
    if (line.rate === 0) continue;

    const diffPct = ((line.rate - stat.median_rate) / stat.median_rate) * 100;
    if (diffPct > 15) {
      insights.push({
        insight_type: 'peer_rate',
        severity: 'warning',
        title: 'Rate above peer median',
        body: `Your rate ₹${Math.round(line.rate)} is ${Math.round(diffPct)}% above the peer median ₹${Math.round(stat.median_rate)} (${stat.vendor_count} peer vendors quoting this item). Consider lowering for competitiveness.`,
        related_item_id: line.item_id,
        metric_value: diffPct,
        metric_label: '% above peer median',
      });
    } else if (diffPct < -15) {
      insights.push({
        insight_type: 'peer_rate',
        severity: 'suggestion',
        title: 'Rate well below peer median',
        body: `Your rate ₹${Math.round(line.rate)} is ${Math.round(Math.abs(diffPct))}% below the peer median ₹${Math.round(stat.median_rate)} (${stat.vendor_count} peer vendors). Confirm margins are sustainable.`,
        related_item_id: line.item_id,
        metric_value: diffPct,
        metric_label: '% below peer median',
      });
    } else {
      insights.push({
        insight_type: 'peer_rate',
        severity: 'info',
        title: 'Rate competitive with peers',
        body: `Your rate ₹${Math.round(line.rate)} is within 15% of the peer median ₹${Math.round(stat.median_rate)} (${stat.vendor_count} peer vendors). Competitive positioning.`,
        related_item_id: line.item_id,
        metric_value: diffPct,
        metric_label: '% vs peer median',
      });
    }
  }

  if (summary.total_quotes >= 3) {
    if (summary.win_rate_pct >= 50) {
      insights.push({
        insight_type: 'win_rate',
        severity: 'info',
        title: 'Strong win rate',
        body: `You've won ${summary.won_quotes} of ${summary.total_quotes} past quotes (${Math.round(summary.win_rate_pct)}% win rate). Your competitive positioning is working.`,
        metric_value: summary.win_rate_pct,
        metric_label: 'Win rate',
      });
    } else if (summary.win_rate_pct < 20) {
      insights.push({
        insight_type: 'win_rate',
        severity: 'suggestion',
        title: 'Low win rate',
        body: `You've won ${summary.won_quotes} of ${summary.total_quotes} past quotes (${Math.round(summary.win_rate_pct)}% win rate). Review rates · payment terms · delivery commitments for improvement areas.`,
        metric_value: summary.win_rate_pct,
        metric_label: 'Win rate',
      });
    }
  }

  const currentDiscounts = context.current_lines.map((ln) => ln.discount_percent).filter((d) => d > 0);
  if (currentDiscounts.length > 0 && summary.total_quotes > 0) {
    const currentAvg = currentDiscounts.reduce((s, d) => s + d, 0) / currentDiscounts.length;
    if (currentAvg > summary.avg_discount_pct + 5) {
      insights.push({
        insight_type: 'discount_pattern',
        severity: 'info',
        title: 'Discount higher than your norm',
        body: `Current discount average ${Math.round(currentAvg)}% is above your historical ${Math.round(summary.avg_discount_pct)}%. Aggressive bid · expect tighter margins.`,
        metric_value: currentAvg - summary.avg_discount_pct,
        metric_label: '% above historical',
      });
    }
  }

  try {
    const score = computeVendorScore(context.vendor_id, context.entity_code);
    if (score.total_score >= 80) {
      insights.push({
        insight_type: 'tax_compliance',
        severity: 'info',
        title: 'High Operix score boosts visibility',
        body: `Your overall vendor score (${Math.round(score.total_score)}/100) places you in top tier · procurement may prioritize your bids.`,
        metric_value: score.total_score,
        metric_label: 'Operix score',
      });
    }
  } catch { /* score unavailable · skip insight */ }

  return {
    insights,
    vendor_history_summary: summary,
    peer_anonymization_threshold: PEER_ANONYMITY_THRESHOLD,
    generated_at: new Date().toISOString(),
  };
}
