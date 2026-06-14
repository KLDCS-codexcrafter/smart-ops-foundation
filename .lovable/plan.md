
# Plan · Top-1% Read-Only Audit of 4DSmartOps (3 reports)

Per the three attached prompts, this is a **diagnosis-only** engagement. No source code, tests, configs, sprint-history, mem, or sibling-registers will be modified. Backend is intentionally not built (Phase 1 = localStorage with `[JWT]` markers) — this fact will be stated up-front in every report so findings are calibrated to that reality, not penalised for it.

## Hard scope rules (locked)

- **Zero diff on `src/`, `tests/`, configs, `package.json`, sprint-history, sibling-register, mem, `audit_workspace/Z*` evidence.** Only new files under `docs/audits/` are written.
- **No re-running of test suites, builds, Playwright, or Lovable Cloud activation.** All findings come from static reading + greps + dependency inspection.
- **Honesty contract:** every claim cites a file path + line range (or a grep command + match count). Anything I cannot verify is tagged `UNVERIFIED — evidence not found on HEAD`. Backend-dependent findings tagged `N/A — Phase 1 localStorage, [JWT] marker present at <path>`.
- **No invented scores.** Where the prompts demand a numeric score (e.g. "/10"), the score is derived from a published rubric included in the same doc (counted evidence rows → band), never pulled from thin air.

## Deliverables (three docs, in this order)

```
docs/audits/360_full_audit_2026-06-14-IST.md          ← Doc 1 (general 360°)
docs/audits/erp_logic_audit_2026-06-14-IST.md         ← Doc 2 (ERP business logic)
docs/audits/pwa_capacitor_audit_2026-06-14-IST.md     ← Doc 3 (PWA + Capacitor + offline)
```

Each doc follows the **exact section structure of its source prompt** — Doc 1 follows the 12 audit dimensions + 8-part output format; Doc 2 follows the 20 logic areas + sections A–J + Top-50 lists + Maturity Score; Doc 3 follows Sections 1–14.

## Tool-budget discipline

Heavy phases are delegated to **read-only background subagents** (one per doc) so the main context stays small. Each subagent gets a tight system prompt + the exact prompt text from its source DOCX + scoped file lists. The main thread only assembles the final markdown files from subagent outputs.

| Phase | Tool | Budget |
|---|---|---|
| Repo cartography (one pass, cached) | `code--exec` grep/wc/ls | ~6 calls |
| Doc 1 evidence sweep | `acp_subagent--spawn_agent` (1) | 1 spawn |
| Doc 2 evidence sweep (ERP logic) | `acp_subagent--spawn_agent` (1) | 1 spawn |
| Doc 3 evidence sweep (PWA/Capacitor) | `acp_subagent--spawn_agent` (1) | 1 spawn |
| Dependency CVE pulse | `code--dependency_scan` | 1 call |
| Security posture | `security--get_scan_results` | 1 call |
| Assembly + file writes | `code--write` × 3 | 3 calls |
| Verification (`git status` clean, only 3 new files) | `code--exec` | 1 call |

Hard ceiling: **~20 tool calls total** across the entire audit. If a subagent comes back partial, I report what is verified + list what could not be verified — I do **not** burn extra calls re-running.

## Per-doc method (identical shape, different lens)

### 1. Cartography pack (built once, reused by all 3 subagents)

A single bash batch produces a `audit_workspace/_cartography_2026-06-14/` JSON manifest (NOT committed to src/) containing:

- top-level dir tree (depth 3)
- file count by extension
- LOC totals (`cloc`-style via `wc -l`)
- `package.json` deps + devDeps
- presence/absence of: `capacitor.config.ts`, `public/sw.js`, `public/manifest.webmanifest`, `vite.config.ts`, edge-functions dir, Supabase config
- counts of `[JWT]` markers, `localStorage.` calls, `console.log` in src, `any` type usage, `// eslint-disable` directives
- list of `src/__tests__/` files + total test count
- routing surface (`src/App.tsx` + `src/pages/**` page count)

This single artifact answers ~70% of the audit questions without re-reading files. **Not committed — lives in `audit_workspace/` which is already git-ignored from product code.**

### 2. Subagent dispatch (3 parallel)

Each subagent receives:
- the verbatim prompt from its source DOCX (already parsed)
- the cartography manifest
- a fixed list of "first-look" files (e.g. Doc 3 gets `capacitor.config.ts`, `public/sw.js`, `vite.config.ts`, `src/main.tsx`, manifest)
- the **honesty rules** above
- output schema matching the prompt's required format

Subagents return structured markdown ready to drop into the final files.

### 3. Assembly

Main thread:
1. Writes the three `.md` files under `docs/audits/`.
2. Each doc opens with a **Facts Locked** header: HEAD SHA, file count, LOC, dep count, backend status (`Phase 1 · localStorage with [JWT] markers · no Lovable Cloud / Supabase activation on HEAD`).
3. Each doc closes with a **Method Appendix** listing every grep command run, every file path cited, and an explicit **"Did NOT do"** block (no test re-run, no build, no browser exec, no code edits).
4. `git status` proves only the 3 new files exist.

## Structure of each report (mirrors the source prompts exactly)

### Doc 1 · 360° Audit (12 dimensions → 8-part output)
1. Executive Summary (health /10, prod-readiness /10, key risks)
2. Critical Findings (Issue / Impact / Area / Risk / Recommendation)
3. High / Medium / Low Findings
4. System Strengths
5. Risk Heatmap (Arch · Security · Performance · Data · UX · Compliance)
6. Future Risk Predictions
7. Production Readiness Verdict (❌ / ⚠️ / ✅) — **expected verdict: ⚠️ Conditionally Ready** given Phase-1 backend
8. Strategic Recommendations

### Doc 2 · ERP Logic Audit (20 logic areas → 12-field finding schema)
- A–J area-by-area findings (Master · Voucher · Inventory · Accounting · Manufacturing · Workflow · Security · API · Automation · Reporting)
- Advanced section (concurrency, multi-branch, DR, AI-readiness)
- Final deliverables: Top-50 Critical Risks · Top-50 Automation Opportunities · Top-50 Enterprise Improvements · ERP Maturity Score 0–100 (with rubric)

### Doc 3 · PWA + Capacitor Audit (Sections 1–14)
- Section 1: ten dimension scores /10 + maturity classification
- Sections 2–12: Frontend · Capacitor · Backend (will be marked **N/A — backend not built, see [JWT] markers**) · DB (N/A) · Security · Performance · DevOps · QA · Offline/Sync · Code Quality · Enterprise Readiness
- Sections 13–14: Final issue list + Go/No-Go verdict + 30/90-day roadmaps

## Explicit out-of-scope

- No code edits, file deletions, renames in `src/`, `tests/`, `audit_workspace/Z*`, configs, `package.json`, mem, sprint-history, sibling-register.
- No test execution. No build. No `bun add`/`bun remove`. No Lovable Cloud activation. No Supabase. No image generation. No browser actions in the preview.
- No publishing. No sprint self-seed. No `bankDate` row.
- No comparison to competitor matrices (that's the separate `.lovable/plan.md` Document-1 work — untouched).
- No Documents 2/3/4 from the `.lovable/plan.md` competitor comparison stream — completely separate stream.

## Acceptance criteria

- `git status` shows exactly **3 new files** under `docs/audits/` and **0 modified files** anywhere else.
- Each doc opens with HEAD SHA, file/LOC counts, backend status; closes with method appendix + "Did NOT do" block.
- Every Critical/High finding cites at least one `src/...:line` reference OR is tagged `UNVERIFIED`.
- Tool-call total ≤ 20.
- No edits to `src/`, tests, configs, `package.json`, mem, sprint-history, sibling-register, `audit_workspace/Z*`.

**Stop after the three files land.** No follow-up sprints, no remediation PRs — those would be a separate engagement the user has to commission explicitly.
