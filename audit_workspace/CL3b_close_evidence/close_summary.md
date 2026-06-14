# CL-3b Close Evidence · T-CL3b-MidClusters-HookSweep

**Predecessor:** 4e2596d · **Grade:** A · **LOC:** 181

## Clusters converted (40 files)
- customer-hub (12) ✅
- projx (11) ✅
- sitex (9) ✅
- distributor-hub (8) ✅

## Conversion
- Removed module-scope `const ENTITY/entityCode/entity = DEFAULT_ENTITY_SHORTCODE`.
- Injected `const { entityCode } = useEntityCode()` at component TOP LEVEL (sitex aliased as `{ entityCode: entity }`).
- Threaded `entityCode: string` through module-scope helpers that reference the entity; updated call sites.
- Converted module-scope data referencing entityCode → factory functions (SampleKits `buildDemoTemplates`, VoiceComplaintCapture `complaintsKey`/`disputesKey`).
- De-duplicated `entityCode` from `useCardEntitlement()` destructures (CustomerHubWelcome, SchemeSimulator).
- Added `entityCode` to useMemo/useEffect dep arrays.

## Guards (4 NEW, one per cluster)
- `src/__tests__/cl-3b/customer-hub-entity-hook-guard.test.ts`
- `src/__tests__/cl-3b/projx-entity-hook-guard.test.ts`
- `src/__tests__/cl-3b/sitex-entity-hook-guard.test.ts`
- `src/__tests__/cl-3b/distributor-hub-entity-hook-guard.test.ts`

## Triple Gate
- TSC: 0 errors
- ESLint (repo-wide --max-warnings 0): 0
- Vitest cl-3b suite: 4/4 PASS

## SIBLINGs
ZERO new.

## NON-GOAL (deferred to CL-3c/d)
vendor-portal · payout · distributor · masters · salesx · fincore · components
