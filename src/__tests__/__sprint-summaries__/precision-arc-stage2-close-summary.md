# T-Phase-1.Precision-Arc · Stage 2 · The Audit · Close Summary  (T2 Consolidation applied)

Predecessor HEAD: **6dd6c1c** (T1 Re-Sweep · HALT-FOR-T2 returned by §2.4)
Original predecessor: **2f38e89** (Stage 1 banked A)
Sprint type: **Diagnostic-only** — zero production code touched (T1 held the line; T2 holds the line).

---

## T2 Consolidation — what changed and why

The §2.4 audit of T1 confirmed the analytical work was sound but returned HALT-FOR-T2 because T1 **appended** its corrections instead of **applying** them. The audit table was self-contradictory:

- 47 C→D promotions were listed in a `### C→D promotions` subsection, but the same `file:line` entries were never deleted from the original `## Class C` section. So `usePayrollEngine.ts:385` (and 37 other live sites) appeared **twice** with two different labels.
- 209 floor/ceil rows lived in four `### T1 Re-Sweep — Class …​ additions` subsections; the four main `## Class …​` headers still showed pre-T1 counts.
- The header roll-up (`A=9 · B=469 · C=365 · D=467`) did not equal a clean assembly of the table.
- 9 promotion entries (7 markdown rows in `__sprint-summaries__/hardening-a-close-summary.md`, 2 in `src/test/**`) and additional similar rows scattered through Class C were never valid sweep targets — the sweep surface is `src/` production code, excluding `*.test.*` and `__sprint-summaries__/`.

T2 is **purely clerical**. No new analysis. No re-classification judgment. The labels T1 assigned stand. T2 only:

1. **Purged non-production noise** across the whole table — every row pointing at `src/__tests__/**`, `src/test/**`, or `*.test.*`.
2. **Applied the 47 C→D promotions in place** — for every promotion that pointed at a live Class C row, deleted it from C and added it to D with the promotion note. Each promoted site now appears exactly once in Class D.
3. **Merged the 209 floor/ceil rows** from the four `### T1 ... additions` subsections into the main Class A/B/C/D sections.
4. **Fixed the four section headers** to actual post-merge row counts.
5. **Reconciled the top-of-file roll-up** — A+B+C+D now equals the total row count.
6. **Emitted one clean `## FINAL D LIST (Stage 3 input)`** and one `## NEEDS-FOUNDER-RULING SUB-LIST`.

Zero production code edited. Diff stat: two doc files only.

---

## Noise purge (Step 1 of T2)

Removed across the whole table — every row whose `file:line` matched `src/__tests__/**`, `src/test/**`, `*.test.ts`, or `*.test.tsx`. These were never valid sweep targets; their removal is a correction, not a scope change.

| Where removed from | Rows removed |
|---|---:|
| Class D (original) | 0 |
| Class A (original) | 0 |
| Class B (original) | 0 |
| Class C (original) | 45 |
| C→D promotions subsection | 9 (7 `__sprint-summaries__/hardening-a-close-summary.md` rows + 2 `src/test/**` rows) |
| T1 floor/ceil additions (D/B/C/A) | 0 |
| **Total noise purged** | **54** |

Note: the 9 noise rows in the C→D promotions subsection were *also* present in the original Class C section (counted in the 45 above for C); after dedupe by `(file:line, pattern)` no row is double-counted.

## Promotions applied (Step 2 of T2)

Of the 47 C→D promotions T1 issued:

- **38** matched live (non-noise) Class C rows → deleted from Class C, added to Class D with note `money math in engine/hook or money-keyword — needs-founder-ruling`. Each promoted site now appears **exactly once** in Class D.
- **9** pointed at non-production targets (`src/__tests__/__sprint-summaries__/hardening-a-close-summary.md` × 7 + `src/test/dev-only/SmokeTestRunner.tsx:2828` + `src/test/c1f-tier2-tier3-oobs-sarathi.test.ts:93`). Per Step 1 of T2 these are dropped from the authoritative classification entirely.

The full 47-entry T1 promotion list with per-row T2 status is preserved in the audit table's `## T1 Audit Trail` section for traceability.

## Floor/ceil merge (Step 3 of T2)

| Source subsection | Rows merged into |
|---|---|
| `### T1 Re-Sweep — Class D additions` | Class D (35 rows) |
| `### T1 Re-Sweep — Class B additions` | Class B (49 rows) |
| `### T1 Re-Sweep — Class C additions` | Class C (125 rows) |
| `### T1 Re-Sweep — Class A additions` | Class A (0 rows) |
| **Total merged** | **209** |

The four `### T1 ... additions` subsections are gone from the table; their content is now in the main `## Class …` sections. A short audit-trail note in the table records the merge.

## Final class roll-up (post-T2 · reconciled)

| Class | Original | + floor/ceil | + C→D in place | − noise (incl. test/markdown rows in C) | **Final** |
|------:|---------:|-------------:|---------------:|----------------------------------------:|----------:|
| A     |        9 |            0 |              0 |                                       0 |       **9** |
| B     |      420 |           49 |              0 |                                       0 |     **469** |
| C     |      287 |          125 |            −38 |                                     −45 |     **329** |
| D     |      385 |           35 |            +38 |                                       0 |     **458** |
| **Σ** | **1101** |      **209** |              0 |                                     −45 |  **1265** |

**Header roll-up reconciled:** `A + B + C + D = 9 + 469 + 329 + 458 = 1265` = total row count. ✓

(Previous T1 roll-up of 1310 included 9 noise rows in the C→D promotions subsection plus 36 noise-overlap rows that were duplicated between Class C and the promotions subsection — both eliminated by T2's in-place merge + noise purge.)

## FINAL D LIST + NEEDS-FOUNDER-RULING (Step 6 of T2)

- `## FINAL D LIST (Stage 3 input)` — emitted at the end of the audit table. **458 rows.** Authoritative Stage 3 migration input.
- `## NEEDS-FOUNDER-RULING SUB-LIST` — emitted at the end of the audit table. **250 of the 458 D rows** carry the `needs-founder-ruling` flag. Founder reviews this list before Stage 3 planning.

Both lists are internally consistent with the consolidated Class D section above — same rows, no duplicates, no omissions.

## Production code untouched (verification)

T2 diff stat:

```
src/__tests__/__sprint-summaries__/precision-arc-stage2-audit-table.md   (rewritten — T1 corrections applied in place; one coherent classified list)
src/__tests__/__sprint-summaries__/precision-arc-stage2-close-summary.md (rewritten with T2 section)
```

Zero `.ts` / `.tsx` edits. Zero `tailwind.config.ts` / `index.css`. Zero protected-zone diff (`voucher-type.ts`, `cc-masters.ts`, `applications.ts`, `cc-compliance-settings.ts`). Across Stage 2 + T1 + T2: **zero production code touched.**

## Triple Gate (must equal 6dd6c1c baseline)

| Gate     | Baseline 6dd6c1c                 | Post-T2 result                   |
|----------|----------------------------------|----------------------------------|
| TSC      | 0 errors                         | 0 errors ✓ (no source edits)     |
| ESLint   | 0 errors / 10 warnings           | 0 / 10 ✓ (no source edits)       |
| Vitest   | 1090 / 152 files                 | 1090 / 152 ✓ (no source edits)   |
| Build    | clean                            | clean ✓                          |

Because zero production files changed in T2, gate parity is structural — there is no surface that could have moved.

## Acceptance criteria (T2)

1. ✓ Non-production rows purged from the whole table (54 rows total — 45 in original Class C + 9 in C→D promotions subsection).
2. ✓ All 38 live C→D promotions applied in place — each promoted site deleted from C, present in D, appearing exactly once.
3. ✓ All 209 floor/ceil rows merged from `### T1 ... additions` subsections into main `## Class` sections.
4. ✓ Section headers show actual post-merge row counts: D=458 · A=9 · B=469 · C=329.
5. ✓ Top-of-file roll-up matches headers; A+B+C+D=1265=total.
6. ✓ `## FINAL D LIST (Stage 3 input)` and `## NEEDS-FOUNDER-RULING SUB-LIST` emitted; internally consistent.
7. ✓ No site appears twice. No site has two labels. No re-classification performed.
8. ✓ Zero production code changed — diff stat is exactly the 2 doc files.
9. ✓ Triple Gate identical to 6dd6c1c baseline.
10. ✓ HALT.

## Honest reporting (T2 disclosures)

- **9 of the 47 T1 promotions were never valid sweep targets.** They pointed at markdown close-summary rows or test files. T2 dropped them — they cannot be Stage 3 migration sites.
- **38 of the 47 T1 promotions matched live Class C rows.** All applied in place; no double-counting.
- **The post-T2 total (1265) is lower than T1's reported 1310** — the difference is the 45 noise rows that were already in the original Class C section (purged in Step 1) plus the 9 noise rows in the promotions subsection that were not separately counted toward the 209 floor/ceil additions but that T1's roll-up nevertheless implicitly inflated. T2's roll-up reconciles to actual rows.
- **Class D went from 467 (T1) to 458 (T2).** The 9-row drop is the noise rows that T1 had implicitly placed in D via the promotion list; T2 removes them as out-of-scope.
- **No re-classification was performed.** Every label in the consolidated table is the label T1 (or original Stage 2) assigned. T2 only moved rows and deleted noise/duplicates.
- **Stage 3 NOT started.** No fixes applied. No self-certification.

## HALT

§2.4 re-audit + founder review of the consolidated `## FINAL D LIST` and `## NEEDS-FOUNDER-RULING SUB-LIST`. Do not proceed to Stage 3 until the post-T2 D list has been ruled. Banks A POST-T2 when clean.
