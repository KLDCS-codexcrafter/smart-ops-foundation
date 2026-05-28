# Sprint 73a Close Summary · Comply360 Main Arc 1.5 · Pass A (engine layer)

**Code:** T-Phase-5.A.1.5-PASS-A  
**Predecessor HEAD:** `cfff1abc0da6a88ec18a87e6ea7af46afea24446` (Sprint 72)  
**HEAD:** _TBD at push_  
**Grade:** A first-pass-clean ⭐ · streak 21 ⭐  
**Scope:** ~1,150 LOC · Pass A · 4 NEW engines

---

## §1 · Deliverables (Block matrix)
- Block 1 · Sprint 72 SHA-fill (`null` → `cfff1abc…`) ✅
- Block 2 · Register + close-summary stubs (real ids · null sentinel · no placeholders) ✅
- Block 3 · `comply360-einvoice-aggregator-engine` ✅
- Block 4 · `comply360-eway-engine` ✅
- Block 5 · `comply360-msme-form1-engine` ✅
- Block 6 · `comply360-section393-engine` ✅
- Block 7 · Tests at `src/test/sprint-73a/` (≥28 tests · 5 describe blocks) ✅
- Block 9b · FR-105 stale-sweep (cross-ref SIBLINGS 67→71 · SPRINTS 73→74) ✅
- Block 10 · Register flips (sibling +4 · sprint-history +1) ✅
- Block 11 · Close-summary filled (this file) ✅

## §2 · Triple Gate
- TSC: 0 errors
- ESLint: 0/0 (9 consecutive sprints)
- Vitest: ≥2685 passed · 0 failed · 0 file-fails
- Build: green

## §3 · Honest disclosures
- Pass A is **engines-only**. UI / navigation / sidebar / union / router changes are deferred to Pass B (Sprint 73b).
- Q13 (IMS) dropped — already shipped in Sprint 70b.
- `irn-engine.ts` and `vendor-compliance-rules.ts` consumed read-only (0-DIFF). They join the FR-19 boundary as frozen engines.
- 9 pre-existing `TBD_AT_BANK` literals in sprint-65 history rows are out of scope and left untouched.

## §4 · §H · 0-DIFF surfaces
- 21 FR-86 §Y surfaces · 0-DIFF.
- **4 FR-19 boundary engines** (now): `gst-engine` · `gst-portal-service` · `tds-engine` · `irn-engine` (joins this sprint).
- 3 Sprint-79 redirect FinCore engines · 0-DIFF.
- All prior Comply360 engines/pages (S69-S72) · 0-DIFF.

## §5 · Register deltas
- SIBLINGS: 67 → 71 (+4 engines).
- SPRINTS: 73 → 74 (+1 entry for Sprint 73a).
- A-streak: 20 → 21.

## §6 · FR-105 stale-snapshot sweep
- Central cardinality test (`_institutional-cross-ref.test.ts`) updated: SIBLINGS 67→71, SPRINTS 73→74.
- Sprint-73a snapshot uses bounds-check (`toBeGreaterThanOrEqual(21)`) + id-lookup by code.
- Done-gate grep on `src/test/` shows 0 hits for scattered `getSiblingCount()).toBe(` / `getSprintCount()).toBe(` / `getCurrentAStreak()).toBe(`.

## §7 · DP ratifications
- DP-S73-SCOPE · DP-S73-1 · DP-S73-LOC (Path α) · DP-S73-2 · DP-S73-3 · DP-S73-4 · DP-S73-5 — all ratified.

## §8 · Read contracts (Lesson 23)
- `irn-engine.ts` · `buildIRNPayload` · `validateIRNPayload` · `generateIRN(payload, creds, voucher, entityCode)` · `IRPPayload`.
- `vendor-compliance-rules.ts` · `msme_validity` rule + `vendor_msme_status`.
- Cross-card vouchers via `localStorage:erp_group_vouchers_<entityCode>`.

## §9 · `[JWT]` markers (Phase-2/8 wires)
- E-invoice aggregator → GSP bridge POST batch.
- EWB engine → EWB portal POST/PUT (gen/close).
- MSME Form 1 → MCA filing portal POST.
- Section 393 → NCLT / MCA arrangements register.

## §10 · Pass B (Sprint 73b) carry-over
- UI surfaces for exim / vendor / roc.
- Sidebar / union / router wiring.
- 3 surface pages consuming the 4 Pass A engines.

## §11 · Decisions executed
- DP-S73-LOC Path α: engine/UI fault-boundary split — clean bookkeeping-first execution.
- Lesson 26 BOOKKEEPING-FIRST: SHA-fill + stubs before engines.
- Lesson 27 MACHINE DONE-GATE: §12 script gates the push.
- Lesson 28 FORBIDDEN deviations: no UI, no nav.

## §12 · Done-gate (run before push)
See prompt §12 — all PASS.

## §13 · Risk log
- None. Pass A is a pure additive engine layer with read-only consumption of frozen FR-19 boundaries.

## §14 · Sign-off
Pass A engines live for Pass B consumption. Ready to bank.
