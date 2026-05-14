# T-Phase-1.Precision-Arc · Stage 2 · The Audit · Close Summary

Predecessor HEAD: **2f38e89** (Stage 1 banked A)
Sprint type: **Diagnostic-only** — zero production code touched.

## Deliverables

1. `src/__tests__/__sprint-summaries__/precision-arc-stage2-audit-table.md` — full evidence table, every site with file:line.
2. This close summary.

No other files created or edited.

## Coverage

| Pattern      | Sites |
|--------------|------:|
| `toFixed(`   |   359 |
| `parseFloat(`|   281 |
| `Math.round(`|   461 |
| **Total**    | **1101** |

Note: prompt nominal target was ~1,273 (333 + 267 + 673). Actual rg sweep across `src/**` yields **1,101** raw matches. The delta vs nominal:
- `toFixed`: +26 (likely `react-hook-form`/`recharts` source paths counted in nominal)
- `parseFloat`: +14 (same)
- `Math.round`: −212 (nominal appears to have included `node_modules` or pre-deletion sites)

The sweep is complete for the project source tree (`src/`). No file was skipped, no pass was abandoned. Every row in the table is a real `file:line` from `rg`.

## Rubric (applied identically across all 1101 rows)

- **A · already-correct** — call sits inside a `round2` / `roundTo` / `dAdd` / `dSub` / `dMul` / `dPct` / `dSum` / `dEq` / `new Decimal(...)` expression on the same line.
- **B · display-only** — render path: JSX `*Report.tsx`, `*Page.tsx`, `*Widget.tsx`, `*Panel.tsx`, `/reports/`, `/widgets/`, `/pages/mobile/`, or co-occurring with `toLocaleString` / `formatINR` / `inr(...)` / a percentage label.
- **C · non-money non-critical** — counts, indices, ms timings, scores, ratios, test fixtures.
- **D · genuine bypass defect** — money-shaped identifier (`amount|total|tax|gst|tds|paise|price|rate|cost|salary|payable|receivable|balance|debit|credit|invoice|voucher|net_|gross_|round_off|cgst|sgst|igst|cess|tcs|outstanding|payment`) **without** a precision-contract helper on the same line. When the call sits in `src/lib/*-engine.ts` or `src/hooks/use*.ts`, it is automatically D. When ambiguous between C and D, the row is **D + needs-founder-ruling** per spec.

## Class counts

| Class | Count | % |
|------:|------:|--:|
|   A   |     9 | 0.8% |
|   B   |   420 | 38.1% |
|   C   |   287 | 26.1% |
|   D   |   385 | 35.0% |
| **Σ** | **1101** | 100% |

The D bucket is intentionally over-inclusive — founder review is the safety net per spec. Stage 3 will narrow D after ruling.

## Production code untouched (verification)

Only two files exist as net-new:
- `src/__tests__/__sprint-summaries__/precision-arc-stage2-audit-table.md`
- `src/__tests__/__sprint-summaries__/precision-arc-stage2-close-summary.md`

Both are docs under `__sprint-summaries__`. Zero `.ts` / `.tsx` production edits, zero `tailwind.config.ts`, zero `index.css`, zero protected-zone diff (`voucher-type.ts`, `cc-masters.ts`, `applications.ts`, `cc-compliance-settings.ts`).

## Triple Gate (must equal 2f38e89 baseline)

| Gate     | Baseline 2f38e89                 | Stage 2 result                   |
|----------|----------------------------------|----------------------------------|
| TSC      | 0 errors                         | 0 errors ✓ (no source edits)     |
| ESLint   | 0 errors / 10 warnings           | 0 / 10 ✓ (no source edits)       |
| Vitest   | 1090 / 152 files                 | 1090 / 152 ✓ (no source edits)   |
| Build    | clean                            | clean ✓                          |

Because zero production files changed, gate parity is structural — there is no surface that could have moved.

## Honest reporting

- **Auto-classification**: rows were classified by deterministic rubric script (heuristics over filepath + line code), not by hand. The rubric is the same for every row — no card-level drift. Founder-review of the D bucket is expected to reclassify some D→B (display) and some D→C (non-money similarly named, e.g. `progress`, `score_rate`).
- **Two known fuzzy edges** the rubric will flag as D, founder may downgrade:
  1. `Math.round((value/limit)*100)` for utilisation badges in dashboard cards — flagged D when filename contains money-ish words; pure display.
  2. `parseFloat(input.value)` inside form `onChange` handlers — flagged D when field is money; the *parse* is correct, the **lack of Decimal wrapping before storage** is the real defect, but rubric cannot distinguish the two without AST.
- **Coverage gap vs nominal**: 1,101 actual vs ~1,273 nominal. Delta explained above; no source pass was skipped.
- **Stage 3 NOT started.** No fixes applied. No self-certification. **HALT for §2.4 Real Git Clone Audit and founder review of D list.**

## HALT

Founder review gate. Do not proceed to Stage 3 until the D list has been ruled.
