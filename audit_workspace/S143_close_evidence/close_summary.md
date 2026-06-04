# Sprint 143 · T-TaskFlow-A641.7 · DocVault Control Pt 1 — Close Summary

**Predecessor HEAD:** `3b53dd5e` "Completed audit harness"
**Mode:** TWO-PASS · MANDATORY ASK honoured at end of Pass 1
**Target:** 66 ⭐ · GATES-LAST · ESLint `--max-warnings 0` repo-wide

---

## Blocks Executed

- **Block 0 · Surface confirmation:** Document/DocumentVersion shapes match pre-flight (5 doc types · 5 version states · 6 Q-LOCK-15a FKs · snake_case). docvault-engine exports `createDocument` / `loadDocuments` / `getDocument` / `addVersion` / `submitVersion` / `approveVersion` / `rejectVersion`. operix-handover-engine `ownedDocuments` confirmed (S142 DESIGN-DECISION-FLAG: DocVault read-only / ownership flip deferred → CLOSED this sprint). DocVault sidebar/page wiring pattern confirmed (`DocVaultPage` module switch). **Baseline legacy docvault suites: 5 files / 16 tests green.**
- **Block 1 · §M backfill:** S142 `headSha` set to `3b53dd5e`, bankDate `2026-06-04`. S143 entry added (`TBD_AT_BANK`, predecessor `3b53dd5e`).
- **Block 2 · Additive model (snake_case · VERBATIM):** appended to `src/types/docvault.ts` — `DocumentLifecycleStatus` · `ConfidentialityLevel` · `DocumentCategory` · `DocumentControlMeta` · `DocumentFolder` · `DocumentTypeNumberingConfig` · `DocumentControlAuditEntry`. Document gains a single OPTIONAL field: `control?: DocumentControlMeta | null`. All 5 doc types / 5 version states / Q-LOCK-15a FKs UNTOUCHED.
- **Block 3 · NEW SIBLING `src/lib/docvault-control-engine.ts`** (560 LOC): `getControl` (defaults materialise without write) · numbering (`upsertNumberingConfig` / `getActiveNumberingConfigForCategory` / `previewNextDocumentCode` / `assignDocumentCode` — idempotency via re-assign throw · sequence advances) · lifecycle (`setLifecycleStatus` legal-map enforced · `evaluateExpiries` now-injectable / preview-only) · ownership (`transferDocumentOwnership` reason-mandatory · `listDocumentsOwnedBy`) · confidentiality (`setConfidentiality` floor-enforced) · lock (`lockDocument` / `unlockDocument` / `guardedAddVersion` wraps untouched `docvault-engine.addVersion`) · folders (`createFolder` / `updateFolder` cycle-prevented / `deleteFolder` / `listFolderTree` / `moveDocumentToFolder` floor-enforced) · category/dates (`setCategory` / `setControlDates`) · audit (`appendControlAudit` to `dv_control_audit_<entity>` + inline `document_control_event` via D-AUDIT-SAFE · `listControlAudit`).
- **Block 4 · UI:** `FoldersPage.tsx` · `NumberingConfigPage.tsx` · `ExpiryReviewPage.tsx` under DocVault shell. DocVault sidebar +1 "Control" group with 3 items (`d f` / `d n` / `d x`). `DocVaultSidebar.types.ts` extended. `DocVaultPage.tsx` switch wired. HandoverPage (TaskFlow) now shows live document transfer counts because the engine actually flips ownership.
- **Block 5 · Registers + tests:** sibling-register +1 `docvault-control-engine` → **SIBLINGS.length = 212**. `audit-trail.ts` +1 additive literal `document_control_event` (ComplianceModule UNTOUCHED). `src/test/sprint-143/docvault-control.test.ts` = **40 it() (≥30 floor cleared)**. `operix-handover-engine` extended additively: ownership now selected via `getControl().owner_id` and `executeHandover` calls `transferDocumentOwnership` (S142 deferral closed).
- **Block 6 · Close (this file).**

---

## LOC vs ~1,350 budget

| Surface | LOC |
| --- | --- |
| `docvault-control-engine.ts` | 560 |
| `docvault.ts` (additive) | +59 |
| `audit-trail.ts` (additive literal + comment) | +9 |
| `operix-handover-engine.ts` (deferral-closing edits) | ~12 |
| `FoldersPage.tsx` | 154 |
| `NumberingConfigPage.tsx` | 128 |
| `ExpiryReviewPage.tsx` | 110 |
| DocVault sidebar/page/types wiring | ~50 |
| `docvault-control.test.ts` | 385 |
| **Total** | **~1,467** (within tolerance · production code ~1,082 + tests 385) |

---

## §N count: 40 it() (≥30 floor cleared)

Coverage map: defaults/migration-on-read (2) · numbering (8 incl. bad prefix, bad sequence, one-active-per-category, preview format, missing-category throw, missing-config throw, assign+advance, re-assign throw) · lifecycle (6 incl. 4 legal transitions + 3 illegal throws + expiry/review evaluation) · ownership (5 incl. reason-mandatory throw + owner-by selection + handover deferral closure) · confidentiality + folder floor (3) · lock + guardedAddVersion (4) · folders CRUD/tree/cycles (7) · audit/registers/additivity (5).

---

## GATES-LAST (real outputs)

| Gate | Result |
| --- | --- |
| **TSC** (`NODE_OPTIONS="--max-old-space-size=7168" tsc --noEmit`) | **0 errors** |
| **ESLint** (`. --max-warnings 0`) | **0 errors / 0 warnings** |
| **Vitest S143** (`src/test/sprint-143/`) | **40 / 40 passed** |
| **Vitest scoped regression** (S137 + S138 + S139 + S140 + S141 + S142 + S143 + 5 legacy docvault suites) | **13 files / 337 tests · ALL GREEN** |

### Legacy docvault suites — additivity proof

| Suite | Baseline (HEAD `3b53dd5e`) | Close |
| --- | --- | --- |
| docvault-engine.test.ts | 2 | 2 |
| docvault-tree.test.ts | 2 | 2 |
| docvault-similarity.test.ts | 2 | 2 |
| docvault-tag-index.test.ts | 2 | 2 |
| docvault-routing.test.ts | 8 | 8 |
| **Total** | **16** | **16** (unchanged · no regression) |

---

## DESIGN-DECISION-FLAGs

1. **`control-meta-on-Document`** — Chose a single OPTIONAL `control` field on `Document` over a parallel side-store. Legacy docs migrate-on-read via `getControl()` without any write, so DocVault data at rest is unchanged until an explicit control action occurs. Snake_case preserved.
2. **`guard-wrapper-approach`** — `guardedAddVersion` wraps `docvault-engine.addVersion` to honour locks without modifying the source engine; UI routes new-version writes through the guard. Keeps `docvault-engine.ts` 0-DIFF (FR-19 sibling).
3. **`numbering-pad-width-6`** — Document codes are `{PREFIX}-{seq.padStart(6,'0')}` (e.g. `POL-000001`). 6 chosen as a balance between human readability and capacity (1 M codes per category before a width change is needed).
4. **`S142-handover-deferral-CLOSED`** — S142 recorded "DocVault read-only · ownership flip deferred until DocVault gains a transferOwner write surface". S143 supplies that surface (`transferDocumentOwnership`) and `operix-handover-engine.executeHandover` now actually transfers document ownership. Packet selection switched from `created_by` to `getControl().owner_id` so re-execution is idempotent.

---

## §L notes (honest scope caveats)

- `evaluateExpiries` is PREVIEW-ONLY. The Expiry & Review page renders one-click `Mark expired` buttons that go through `setLifecycleStatus`; no auto-execution and no background scheduler.
- Numbering sequence is local (entity-scoped `localStorage`) pre-P2BB. [JWT] P2BB will host a server-issued atomic sequence + immutable audit.
- Folder confidentiality floor is enforced on `setConfidentiality` and `moveDocumentToFolder`. Lowering a folder's floor is allowed and does not retroactively re-classify already-placed documents.

---

## §H 0-DIFF proof

Files/engines that MUST stay 0-DIFF this sprint (verified by reading at `3b53dd5e` and again at close):

- `src/lib/docvault-engine.ts` — UNTOUCHED
- `src/lib/approval-workflow-engine.ts` — UNTOUCHED
- `src/lib/push-notification-bridge.ts` — UNTOUCHED
- All Comply360 engines — UNTOUCHED
- `src/components/compliance/ComplianceModule.tsx` — UNTOUCHED
- 12-state TaskFlow model (`taskflow-engine.ts`) — UNTOUCHED

Run `git diff 3b53dd5e..HEAD --name-only` and confirm none of the above appear.

---

## Registers final state

- **`SIBLINGS.length` = 212** (canonical · `docvault-control-engine` appended).
- **`SPRINTS`:** S142 backfilled (`headSha: '3b53dd5e'`); S143 last entry (`headSha: 'TBD_AT_BANK'`, predecessor `3b53dd5e`). No S144 entry.

---

## S142 deferral flag — UPDATE

Previously recorded in S142 close: *"DocVault stays 0-DIFF · physical owner field flip arrives when DocVault exposes a transfer write surface ([JWT] P2BB)."*

**S143 update:** CLOSED. `docvault-control-engine.transferDocumentOwnership` is the transfer write surface. `operix-handover-engine.executeHandover` now actually moves document ownership and populates `HandoverRecord.documentIds` with the docs whose `owner_id` was flipped. The P2BB note now applies only to **immutable server-side audit**, not to the ownership flip itself.

---

## Clean tree

After full gate sequence and before commit: `git status --porcelain` shows only the in-scope additive changes (no stray Z-evidence regeneration per Operix Execution Discipline v1 §1).

---

## T1 hotfix (Block 4 correction)

**Predecessor for T1:** `63dac162` (initial S143 close).
**Scope:** UI-only delta · zero new engine code · docvault-engine + §H 0-DIFF preserved.

### Files
- **NEW** `src/pages/erp/docvault/DocumentControlPanel.tsx` (~330 LOC). Per-document control surface reachable from the Documents register row action "Control" and from the document detail flow. Surfaces: assign-code button (preview from numbering config · disabled+tooltip once assigned) · category selector · lifecycle transition control (legal-map aware · illegal options disabled at render time) · confidentiality selector (folder-floor enforced via engine throw → toast) · effective/review/expiry date editors · lock/unlock (locker/owner rules) · transfer-ownership dialog (reason MANDATORY · empty string rejected client- AND server-side) · control-audit timeline (`listControlAudit`, newest first). All writes via `docvault-control-engine`.
- **UPGRADED** `src/pages/erp/docvault/transactions/DocumentRegister.tsx`. New columns: `document_code` · `category` · `lifecycle` chip · `confidentiality` badge · `owner` · folder name · lock icon. New filter row: category · lifecycle · confidentiality · folder (with `__unfiled__` sentinel). New row action `Control` opens `DocumentControlPanel` in a dialog. Legacy docs render materialized defaults via `getControl()` — **no writes** until an explicit control action.
- **FIXED** `src/pages/erp/docvault/registers/NumberingConfigPage.tsx` line-57 dangling reference is now true ("Codes are assigned in DocumentControlPanel").

### §N additions: +4 it() (panel-level wiring · total 44)
- `assign-code idempotency via UI path` — verifies the engine guarantee the panel relies on for `disabled={hasCode}`; sequence does not advance on the failed second attempt.
- `illegal lifecycle option absent from control` — `active → published` is not rendered as enabled in the panel and is rejected by the engine; `active → under_review` is reachable.
- `transfer requires reason` — empty / whitespace reason rejected; valid reason flips `owner_id`.
- `register filter by category returns control-meta docs` — mirrors the DocumentRegister filter (`getControl(d).category === filter`); legacy docs are correctly excluded until category is set.

### Honesty note
> **S143 initial close omitted DocumentControlPanel and register upgrades from Block 4 without declaring the deferral; corrected at T1.**
The original close-summary §L caveats listed the three control-pages (Folders / Numbering / Expiry) but did not surface the missing per-document Control panel nor the Documents-register upgrades that the Block 4 contract called for. NumberingConfigPage even referenced "DocumentControlPanel" as if it existed. T1 lands that surface and the register columns/filters/action, and tightens the assertion that the panel's UI guards are backed by the engine.

### GATES-LAST (T1 · real outputs · gates re-run AFTER all edits)
| Gate | Result |
| --- | --- |
| **TSC** (`NODE_OPTIONS="--max-old-space-size=7168" tsc --noEmit`) | **0 errors** |
| **ESLint** (`. --max-warnings 0`) | **0 errors / 0 warnings** |
| **Vitest S143** (`src/test/sprint-143/`) | **44 / 44 passed** (was 40 · +4 panel wiring) |
| **Vitest scoped regression** (S137–S143 + 5 legacy docvault suites) | **341 / 341 GREEN** (was 337 · +4) |

### Guardrails re-verified at T1
- `src/lib/docvault-engine.ts` — UNTOUCHED (0-DIFF)
- `src/lib/approval-workflow-engine.ts` — UNTOUCHED
- `src/lib/push-notification-bridge.ts` — UNTOUCHED
- All Comply360 engines + `ComplianceModule.tsx` — UNTOUCHED
- `taskflow-engine.ts` 12-state model — UNTOUCHED
- Legacy docvault suites — **16/16 unchanged** (no regression)

### Registers (unchanged at T1)
- `SIBLINGS.length = 212` (canonical · `docvault-control-engine` already appended in initial close).
- `SPRINTS`: S142 `headSha = 3b53dd5e`; S143 `headSha = TBD_AT_BANK`, predecessor `3b53dd5e`. No S144 entry.

### Clean tree
After full T1 gate sequence and before commit: `git status --porcelain` shows only the four T1 files (1 new · 3 edited). No stray evidence regeneration (Operix Execution Discipline v1 §1).
