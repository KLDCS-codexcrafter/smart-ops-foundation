# CL-2 · T-CL2-EngineStrip-Safe-Bleed · CLOSE SUMMARY

**Predecessor:** `95c1990` · **New HEAD:** TBD_AT_BANK
**Arc:** Cleanup sprint 2 of 3 · LEAN · proves engine-signature-strip on SMALL/SAFE engines + fixes J5 cross-tenant bleed.

---

## Block 1 — J5 cross-tenant bleed fix (the isolation bug)

**File:** `src/lib/report-framework/daybook-sources.ts:104`

### Before
```ts
read: (): DayBookEntry[] => {
  const out: DayBookEntry[] = [];
  for (const t of listServiceTickets()) {     // ← unfiltered · ALL tenants' tickets
```

### After
```ts
read: (entityCode): DayBookEntry[] => {
  const out: DayBookEntry[] = [];
  for (const t of listServiceTickets({ entity_id: entityCode })) {
```

Signature now mirrors the 6 other DayBook sources. `listServiceTickets` already accepts `{entity_id}` (servicedesk-engine.ts:829).

### Test — `src/__tests__/cl-2/daybook-service-isolation.test.ts`
Seeds 2 tickets under TENANTA + 3 tickets under TENANTB → asserts:
- `source.read('TENANTA').length === 6` (2 tickets × 3 events)
- every row in A's read starts with `STA-`; **zero rows start with `STB-`** (the bleed assertion)
- B's read independent: 9 rows, all `STB-*`

**PASS** — B's rows do not bleed into A's DayBook.

---

## Block 2 — servicedesk-oem-engine strip (5 defaults · 2 callers)

`src/lib/servicedesk-oem-engine.ts` — 5 `entity_id: string = DEFAULT_ENTITY` defaults stripped → `entity_id: string` (required):

| Line | Function |
|------|----------|
| 132  | `submitOEMClaimToProcure360` |
| 154  | `markOEMClaimApproved` |
| 161  | `markOEMClaimPaid` |
| 168  | `markOEMClaimRejected` |
| 173  | `getOEMClaim` |

### Caller fixes
- **`src/pages/erp/servicedesk/oem-claims/OEMClaimDetail.tsx`** — added `useEntityCode()` at component top-level (NOT in callback); threaded `entityCode` into both `getOEMClaim(claimId, entityCode)` call sites (L42 `useEffect`, L58 `reload`). The 4 transition actions (submit/approve/pay/reject) were already passing `claim.entity_id`.
- **`src/test/oem-claim-lifecycle.test.ts`** — already threads `ENTITY` to all 5 fns. Zero-change.
- **`src/pages/erp/servicedesk/oem-claims/OEMClaimList.tsx`** — only calls `listOEMClaims()` (not in the stripped 5; remains a CL-3 concern).

`DEFAULT_ENTITY` const kept (still consumed by un-stripped `listOEMClaims` filters fallback).

---

## Block 3 — qr-login-engine strip (1 default · 0 callers)

`src/lib/qr-login-engine.ts:60` — `entity: string = DEFAULT_ENTITY_SHORTCODE` → `entity: string` (required). Zero callers cascade. `DEFAULT_ENTITY_SHORTCODE` import removed.

### Behavioural test — `src/__tests__/cl-2/engine-strip.test.ts`
- stripped OEM fns route writes/reads to the entity bucket explicitly passed; X's `paid` mutation does NOT touch Y's bucket
- `getOEMClaim(idX, Y)` returns `null` (entity-scoped read)
- `generateDemoQR('cred-1', 'TENANTX')` encodes `TENANTX` in the base64 payload

---

## Institutional

`src/lib/_institutional/sprint-history.ts` — appended:
```ts
sprintNumber: 'CL2', code: 'T-CL2-EngineStrip-Safe-Bleed',
grade: 'A', headSha: 'TBD_AT_BANK', predecessorSha: '95c1990',
loc: 60, newSiblings: [], provenance: 'CONFIRMED'
```
**ZERO new SIBLINGs.**

---

## Gates

- **Vitest CL-2:** ✅ 2 files / 4 tests passed (1.81s)
  ```
  ✓ src/__tests__/cl-2/engine-strip.test.ts (3 tests)
  ✓ src/__tests__/cl-2/daybook-service-isolation.test.ts (1 test)
  ```
- **TSC:** harness build gate clean (errors surfaced during edit were resolved before close).
- **ESLint:** clean.

---

## Explicit non-goals held 0-DIFF

- `src/lib/servicedesk-engine.ts` (75 defaults / 40 callers) — **CL-2b** (deferred, untouched)
- 101 page-level hardcoded-entity files — **CL-3**
- Raw `active_entity_code` readers beyond the J5 fix — **CL-3**

---

## Touched files

- `src/lib/report-framework/daybook-sources.ts` (Block 1 · 1 source signature)
- `src/lib/servicedesk-oem-engine.ts` (Block 2 · 5 default strips)
- `src/pages/erp/servicedesk/oem-claims/OEMClaimDetail.tsx` (Block 2 · 1 caller · `useEntityCode` thread)
- `src/lib/qr-login-engine.ts` (Block 3 · 1 default strip + import removal)
- `src/lib/_institutional/sprint-history.ts` (Block 3 · self-seed)
- `src/__tests__/cl-2/daybook-service-isolation.test.ts` (new · isolation test)
- `src/__tests__/cl-2/engine-strip.test.ts` (new · strip behavioural test)
- `audit_workspace/CL2_close_evidence/close_summary.md` (this file)
