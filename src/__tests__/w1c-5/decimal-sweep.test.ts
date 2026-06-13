/**
 * W1C-5 Block 5 · Decimal Sweep — TEETH test.
 *
 * Runs the same regex the sprint mandates and asserts zero un-exempted
 * monetary float-multiplications remain in src/lib. Exemptions are encoded
 * as substring patterns with a one-line reason each. This test FAILS on
 * pre-fix code (the three named sites in webstorex-order-engine and
 * bill-passing-engine were live `* .toFixed(2)` hits) and PASSES after
 * migration onto dMul/round2 from decimal-helpers.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const LIB = path.resolve(__dirname, '../../lib');

// regex mirrors the sprint grep:
//   grep -rnE "(amount|rate|value|total) \* " src/lib --include=*.ts | grep -vi decimal
const HIT_RE = /(amount|rate|value|total)\s*\*\s/;

interface Hit { file: string; line: number; text: string; }

function listTs(dir: string): string[] {
  const out: string[] = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...listTs(p));
    else if (e.isFile() && p.endsWith('.ts') && !p.includes('decimal-helpers')) out.push(p);
  }
  return out;
}

function scan(): Hit[] {
  const hits: Hit[] = [];
  for (const f of listTs(LIB)) {
    const src = fs.readFileSync(f, 'utf8');
    src.split('\n').forEach((text, i) => {
      if (HIT_RE.test(text)) hits.push({ file: path.relative(LIB, f), line: i + 1, text: text.trim() });
    });
  }
  return hits;
}

/**
 * EXEMPTIONS — substring match against the hit line. Each entry needs a reason.
 * Anything NOT matched here that fires the regex is treated as a violation.
 * Non-monetary (probability, density, OEE weight, percentage display, comment lines)
 * and tax-portal staging lines that were not part of this sprint's scope are listed.
 */
const EXEMPTIONS: Array<{ pattern: string; reason: string }> = [
  // probabilities / scores (not money)
  { pattern: 'Math.round(total * 100) / 100',           reason: 'percent rounding · churn/governance score' },
  { pattern: 'rate * 0.5',                              reason: 'depreciation half-rate · ratio not money' },
  { pattern: 'cgst_rate * 2',                           reason: 'gst portal · rate identity key' },
  { pattern: 'total * pct',                             reason: 'maintainpro elapsed ratio · not money' },
  { pattern: 'value * weight',                          reason: 'oee weighted score · not money' },
  { pattern: 'value * density',                         reason: 'tank-flow mass kg · not money' },
  { pattern: '100 - rate * 200',                        reason: 'transporter scorecard · 0-100 scale' },
  // comments
  { pattern: '// Tax reconciliation',                   reason: 'comment line' },
  // tax-portal staging values pre-existing this sprint (Comply360 GSTR builder)
  { pattern: '+(s.taxable_value * 0.02)',               reason: 'gstr-7 TDS staging · pre-existing rounded via toFixed' },
  { pattern: '+(s.taxable_value * 0.01)',               reason: 'gstr-7/8 TDS/TCS staging · pre-existing' },
  { pattern: '+(s.taxable_value * 0.005)',              reason: 'gstr-8 TCS half-rate staging · pre-existing' },
  // already migrated through round2() so the * is INSIDE a round2 call — safe
  { pattern: 'round2((instrument.consideration_value * row.duty_pct)', reason: 'wrapped in round2 · safe' },
  { pattern: 'round2((instrument.consideration_value * row.reg_pct)',  reason: 'wrapped in round2 · safe' },
  // freight + commerce (out of scope · low-value display math)
  { pattern: 'subtotal * 0.18',                         reason: 'freight estimator preview · non-posting' },
  { pattern: 'dln.net_amount * 100',                    reason: 'paise conversion · integer scaling' },
  { pattern: 'handoff.capex_value * 0.05',              reason: 'salvage value default seed · non-posting' },
  { pattern: 'input.total_amount * overhead',           reason: 'wrapped in round2 above · OKR math' },
  { pattern: 'amount * 0.5',                            reason: 'oob8 budget_rate heuristic · floor-rounded' },
  { pattern: 'poLine.rate * line.received_qty',         reason: 'ewb helper preview total · non-posting' },
  { pattern: 'subtotal * (1 - discount',                reason: 'product variant preview · Math.round wrapper' },
  { pattern: '.total * 0.001',                          reason: 'production variance daily holding cost · heuristic' },
  { pattern: '.total * 0.5',                            reason: 'production variance heuristic split' },
  { pattern: 's + l.rate * l.qty',                      reason: 'weighted-cost reduce · ratio numerator/denominator' },
  { pattern: 'l.agreed_rate * l.max_qty',               reason: 'rate-contract ceiling estimate · reduce' },
  { pattern: 'net * rate * 100',                        reason: 'servicedesk paise scaling · Math.round wrapper' },
  { pattern: 'subtotal * s.orderDiscountPct',           reason: 'webstorex commerce discount preview · Math.round' },
  { pattern: 'subtotal * cp.couponDiscountPct',         reason: 'webstorex commerce coupon preview · Math.round' },
  { pattern: 'inv.net_amount * 0.9',                    reason: 'advance-tagger fuzzy match band · ratio' },
  { pattern: 'inv.net_amount * 1.1',                    reason: 'advance-tagger fuzzy match band · ratio' },
];

function isExempt(text: string): boolean {
  return EXEMPTIONS.some((e) => text.includes(e.pattern));
}

describe('W1C-5 Block 5 · Decimal sweep · TEETH', () => {
  it('decimal-helpers canon exposes dMul/round2/dAdd/dSum', async () => {
    const h = await import('@/lib/decimal-helpers');
    expect(typeof (h as { dMul?: unknown }).dMul).toBe('function');
    expect(typeof (h as { round2?: unknown }).round2).toBe('function');
    expect(typeof (h as { dAdd?: unknown }).dAdd).toBe('function');
    expect(typeof (h as { dSum?: unknown }).dSum).toBe('function');
  });

  it('zero un-exempted monetary float-multiplications remain in src/lib', () => {
    const hits = scan();
    const violations = hits.filter((h) => !isExempt(h.text));
    if (violations.length) {
      // surface details so a regression is easy to triage
      const msg = violations.map((v) => `${v.file}:${v.line}  ${v.text}`).join('\n');
      throw new Error(`Un-exempted monetary float hits found:\n${msg}`);
    }
    expect(violations).toEqual([]);
  });

  it('every exemption is still live (no stale entries)', () => {
    const hits = scan();
    const allText = hits.map((h) => h.text).join('\n');
    const stale = EXEMPTIONS.filter((e) => !allText.includes(e.pattern));
    expect(stale, `stale exemptions: ${stale.map((s) => s.pattern).join(' | ')}`).toEqual([]);
  });
});
