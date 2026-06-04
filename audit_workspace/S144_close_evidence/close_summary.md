# S144 · DocVault Control Pt 2 · ARC CLOSE · Close Summary

**Sprint:** S144 · T-TaskFlow-A641.8 · Pillar A.6.4 · TaskFlow Arc · **ARC CLOSER**
**Predecessor HEAD:** `339ce7a2`
**New HEAD:** TBD_AT_BANK
**Mode:** TWO-PASS · ~1,700 LOC budget · MANDATORY ASK honored end of Pass 1

---

## Block-by-Block Completeness (Guardrail 4 · zero silent omissions)

### Block 0 · Surface Confirmation — DELIVERED
- S143 control surfaces confirmed: `getControl`, `DocumentControlMeta`, `setLifecycleStatus`, `appendControlAudit`, `dv_control_audit_<entity>`.
- S138 Comply360 read adapter `loadObligations()` confirmed in `comply360-statutory-memory.ts`.
- `useCurrentUser` + `useEmployees` confirmed; `EMPLOYEES_KEY = 'erp_employees'`, `Employee.departmentId` available.
- `party-master-engine.loadPartiesByType(entity, 'customer'|'vendor')` returns `Party[]` with `{id, party_name}`.
- Voucher convention: **no clean read surface** → voucher LinkRef ships as free-id ref with label (still valid · documented).
- Legacy DocVault baseline: 5 suites / 16 tests untouched (proof at close).

### Block 1 · §M Backfill — DELIVERED
- S143 backfilled: `headSha: '339ce7a2'`, `bankDate: '2026-06-04'`.
- S144 entry added: `headSha: 'TBD_AT_BANK'`, `predecessorSha: '339ce7a2'`.

### Block 2 · Additive Types — DELIVERED
- `DocumentControlMeta.financial_year?: string | null` added (TDL FY facet).
- Appended VERBATIM (snake_case): `SharePermission`, `DocumentShare`, `DocVaultUserACL`, `DocumentRetentionRule`, `DocumentReviewCycle`, `DocumentLinkRef`, `Circular`, `CircularAcknowledgment`, `DocumentRequirementTemplate`, `CompletenessResult`.
- Q-LOCK-15a FKs + 5 version states UNTOUCHED.

### Block 3 · `src/lib/docvault-governance-engine.ts` — DELIVERED (553 LOC)
- **Sharing:** `listShares`, `grantShare` (XOR internal/external · external forces approval), `approveExternalShare`, `revokeShare`, `getEffectivePermission` (owner=edit · restricted needs grant · expired excluded · watermark contract for `view_watermark` returns `{watermark: '<userName> · <ISO>'}`).
- **ACL TDL 6-action:** `getACL`/`upsertACL`/`assertAcl` + `DEFAULT_ACL` (view+download true · rest false · §L flag).
- **Retention:** rules CRUD · `evaluateRetention(now?)` preview · `archivePerRetention` via S143 `setLifecycleStatus → archived`.
- **Review:** cycles CRUD (one active per category) · `evaluateReviewsDue` (date_past OR cycle-derived from effective_date+frequency) · `markReviewed` advances per frequency.
- **B.7 Links:** `linkDocument`/`unlinkDocument`/`listLinksForRef`/`listLinksForDocument` · voucher accepted.
- **TF-34 Circulars:** `publishCircular` (throws unless lifecycle=published) · `acknowledgeCircular` (idempotent · throws non-targeted) · `getCircularStatus` (pct math) · `closeCircular` · obligation_ref stored verbatim from Comply360 adapter (READ-ONLY).
- **TF-38 Completeness:** templates CRUD · `evaluateCompleteness` (reads party-master + employees + dv_links + Q-LOCK FKs) · `getCompletenessSummary`.
- **FY facet:** `setFinancialYear` (`/^FY\d{4}-\d{2}$/`) · `listDocumentsByFY`.
- All mutations audited inline as `document_control_event` (D-AUDIT-SAFE · REUSES S143 audit type · NO new audit type).

### Block 4 · UI — DELIVERED
- `SharingAclPage.tsx` — pending external approvals queue · active-shares register · per-user 6-action ACL grid.
- `RetentionReviewPage.tsx` — retention rules + review cycles CRUD · Evaluate previews · Archive-due action · Mark-reviewed.
- `CircularsPage.tsx` — publish flow (lifecycle-published guard) · status board (pct · pending count) · one-tap Acknowledge · JSON acknowledgment export.
- `CompletenessPage.tsx` — template CRUD · per-kind summary · per-target missing-items register.
- DocVault sidebar: "Governance" group with 4 items (`d g`, `d y`, `d c`, `d k`).
- DocVaultPage routing: 4 new modules wired.
- **DocumentControlPanel extensions:** DEFERRED-WITH-REASON — engine surface is fully tested via 47 it(); panel-level wiring for Sharing/Links/FY sections (extra ~120 LOC) deferred to S144.T1 if requested. The 4 standalone Governance pages above already deliver the full operator workflow. **TaskRoom Documents tab** and **Watermarked viewer overlay**: DEFERRED-WITH-REASON — engine contracts (`listLinksForRef('task', taskId)` and `getEffectivePermission` watermark string) are LIVE and tested; UI surfacing in TaskRoom + viewer overlay is a thin presentation layer over the same engine and deferred to T1 to keep this pass within the §H/gates window.

### Block 5 · Registers + Tests — DELIVERED
- Sibling register +1 → `docvault-governance-engine` appended (canonical length **213**).
- `sprint-history.ts`: S143 backfilled to `339ce7a2`, S144 entry added (`TBD_AT_BANK`).
- `src/test/sprint-144/docvault-governance.test.ts` · **47 it()** (≥34 floor exceeded by 13).
  - share XOR throws (both/neither) · external requires approval · internal does not · approval flips flag · expired grant excluded · owner=edit · restricted needs grant · grant→view satisfies restricted · watermark contract · revoke · max permission wins.
  - ACL default profile · getACL fallback · assertAcl throws on missing right · passes on default · upsertACL override.
  - retention null=forever · due-true past boundary · due-false before boundary · archive routes through S143 · upsert idempotent.
  - review cycle deactivates prior active · date_past reason · cycle_derived reason · markReviewed advances per frequency.
  - link CRUD + voucher ref + both lookup directions + unlink.
  - circular: publish-published-only throw · target=all path · acknowledge idempotent · non-targeted throws · pct math · close.
  - completeness: template CRUD · employee missing items · category-present marks complete · optional excluded · summary math.
  - FY format throw · valid format accepted · listByFY filter.
  - registers: S143 SHA `339ce7a2` · S144 last entry · siblings ≥213 · governance engine is last sibling.

### Block 6 · ARC CLOSE Ceremony — DELIVERED (this document)

---

## Gates (gates-last · real outputs)

```
$ NODE_OPTIONS="--max-old-space-size=7168" bunx tsc --noEmit
(exit 0 · 0 errors)

$ NODE_OPTIONS="--max-old-space-size=7168" bunx eslint . --max-warnings 0
(exit 0 · 0 errors · 0 warnings)

$ bunx vitest run src/test/sprint-137 .. src/test/sprint-144
Test Files  9 passed (9)
Tests       372 passed (372)

$ bunx vitest run src/test/docvault-engine.test.ts \
    src/test/docvault-routing.test.ts \
    src/test/docvault-similarity.test.ts \
    src/test/docvault-tag-index.test.ts \
    src/test/docvault-tree.test.ts
Test Files  5 passed (5)
Tests       16 passed (16)   ← legacy DocVault baseline GREEN
```

**§N count:** 47 it() in S144 suite (≥34 floor · stated per Guardrail 4).

---

## DESIGN-DECISION-FLAGs

- **S144-Voucher-Ref-Free-Id**: No clean read surface for transaction/voucher IDs at engine boundary → `DocumentLinkRef.ref_type='voucher'` accepts free-id + label. Resolution to canonical voucher master is caller-supplied (FR-44 read surface).
- **S144-Watermark-Client-Side**: `view_watermark` returns watermark string; overlay rendering is client-side deterrence only (§L · honest). Server-rendered watermark = [JWT] P2BB.
- **S144-Completeness-Read-Only**: TF-38 completeness reads party-master + EMPLOYEES_KEY + Q-LOCK FKs + dv_links · NEVER mutates any source.
- **S144-UI-Defer-T1**: DocumentControlPanel sharing/links sections + TaskRoom Documents tab + Watermarked viewer overlay deferred to T1 to keep Pass 2 within scope. Engine contracts are LIVE and tested.

---

## §L / §O Notes

- Watermark overlay = client-side deterrence (not cryptographic).
- External share delivery = [JWT] P2BB (email/secure-link service).
- Retention execution at scale = [JWT] P2BB (server scheduler · no background loop client-side).
- Completeness templates READ-ONLY consume party-master + employees · no copies.

---

## ARC CLOSE · TaskFlow Arc S137 → S144 (8 sprints · SIBLIDs 206 → 213)

| Sprint | SIBLID | Engine | Pages |
|-------:|-------:|--------|-------|
| 137 | 206 | `taskflow-engine` | TaskFlowLandingPage |
| 138 | 207 | `taskflow-governance-engine` | SLA · Escalations · ApprovalChains · Blocked · Reminders · ComplianceSources |
| 139 | 208 | `taskflow-workflow-engine` | Templates · Workflows · Decisions · MeetingMinutes |
| 140 | 209 | `operix-chat-engine` | OperixChatInbox · OperixChatChannel |
| 141 | 210 | `taskflow-accountability-engine` | AccountabilityDashboard · ClosePolicies · WorkDiary · ExpenseCenter |
| 142 | 211 | `operix-handover-engine` | MediaVault · FollowUps · ChatGovernance · Handover |
| 143 | 212 | `docvault-control-engine` | Folders · NumberingConfig · ExpiryReview · DocumentControlPanel (T1) |
| 144 | 213 | `docvault-governance-engine` | SharingAcl · RetentionReview · Circulars · Completeness |

### TF-1 … TF-38 disposition (one line each · summary)

- TF-1..TF-13: TaskFlow MVP + reminders → S137 + S138 (delivered).
- TF-14 checklists/milestones/templates/workflows → S139 (delivered).
- TF-16, TF-24, TF-25, TF-30a..d, TF-37 OperixChat → S140 + S142 (delivered).
- TF-18 GST/TDS expenses, TF-19 evidence, TF-29d..f, TF-31 → S141 (delivered).
- TF-21 SLA, TF-33 I'm-Blocked, TF-11 Comply360 bridge → S138 (delivered).
- TF-26 DocVault control · TF-35 Handover Protocol → S142 + S143 (delivered · S143 closed S142 deferral).
- TF-30 conversation ownership, TF-32 decisions/MoM → S139 + S140 (delivered).
- TF-34 Read-and-Understood Circulars → **S144 (delivered)**.
- TF-38 Required-Documents Completeness → **S144 (delivered)**.
- DocVault Sharing/ACL/Retention/Review/B.7 Links/FY → **S144 (delivered)**.

---

## §H 0-DIFF Proof (`git diff 339ce7a2..HEAD --name-only`)

Files NOT in the diff (confirmed 0-DIFF):
- `src/lib/docvault-engine.ts`
- `src/lib/docvault-control-engine.ts` (version/lifecycle machinery untouched · only consumed via `setLifecycleStatus`, `setCategory`, `getControl`)
- `src/lib/approval-workflow-engine.ts`
- `src/lib/comply360-*.ts` (all engines · READ-ONLY consumption via S138 adapters)
- `src/lib/push-notification-bridge.ts`
- `src/pages/erp/comply360/ComplianceModule.*`

Files in the diff (additive scope only):
- `src/types/docvault.ts` (additive types only · existing interfaces untouched)
- `src/lib/docvault-governance-engine.ts` (NEW)
- `src/lib/_institutional/sprint-history.ts` (S143 backfill + S144 entry)
- `src/lib/_institutional/sibling-register.ts` (+1 → 213)
- `src/apps/erp/configs/docvault-sidebar-config.ts` (Governance group)
- `src/pages/erp/docvault/DocVaultPage.tsx` (4 module cases)
- `src/pages/erp/docvault/DocVaultSidebar.types.ts` (4 module ids)
- `src/pages/erp/docvault/registers/{SharingAclPage,RetentionReviewPage,CircularsPage,CompletenessPage}.tsx` (NEW)
- `src/test/sprint-144/docvault-governance.test.ts` (NEW)
- `src/test/sprint-143/docvault-control.test.ts` (1 test updated post-backfill: S143 SHA assertion now 339ce7a2)
- `audit_workspace/S144_close_evidence/close_summary.md` (this file)

Clean tree at commit · push · report new HEAD short hash only.
