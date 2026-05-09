# T-Phase-1.A.5.c-T2-AuditFix · Close Summary

## Triple Gate
- TSC: 0 errors (exit=0)
- ESLint: 0/0 (no new violations)
- Vitest: 478/478 passed (74 files) · +4 over T1 baseline (474)

## Blocks Landed (A → I)
- **A** Security · `isSafeHttpUrl` positive HTTP/HTTPS allowlist in `iso9001-engine.ts`; capture rejects javascript:/data:/file:.
- **B** Entity isolation · `CapaQaEventPayload` extended with `entity_code`/`vendor_id`; vendor-scoring test rewritten — no sentinel rows when entity data missing.
- **C** Performance · `MtcRegister` and `WpqExpiryDashboard` memoize register scans (O(1) per row).
- **D** Welder UI · `ChipMulti` for processes/positions; WPS approval flow; auto-recompute WPQ status via `useEffect`.
- **E** IQC · entity-scoped storage key `qulicheak.iqc.variant.${entityCode}`.
- **F** CAPA full 5-Whys chain (`why1`–`why5` + `rootCause`) with `showDeepWhys` toggle to expand Why 3/4/5 on demand. Cmd/Ctrl+Enter quick-save retained.
- **G** ISO Link UI · `parseLinkedRecordsTextarea` with silent drop of invalid types/missing IDs; surfaced under capture form.
- **H** Sidebar/header hygiene · no module-id drift; `QualiCheckSidebar.types.ts` unchanged.
- **I** New integration tests:
  - `src/test/iso9001-url-safety.test.ts` — 3 cases (URL allowlist · linked-records parser · empty input).
  - `src/test/capa-detail-editor.test.ts` — 2 cases (5 Whys persistence on D4 · 30/60/90 verification flow) [from T1, retained].

## D-Decisions Registered
- **D-NEW-BU** · ISO 9001 URL allowlist (positive http/https only).
- **D-NEW-BV** · CAPA event payload carries `entity_code` + `vendor_id` for vendor-scorecard isolation.
- **D-NEW-BW** · Register memoization pattern for register scans (O(1) per row).
- **D-NEW-BX** · WelderQualification `ChipMulti` + auto-recompute WPQ status.
- **D-NEW-BY** · IQC variant key entity-scoped (`qulicheak.iqc.variant.${entityCode}`).
- **D-NEW-BZ** · CapaDetail 5-Whys deep-toggle UX (`showDeepWhys`).
- **D-NEW-CA** · `parseLinkedRecordsTextarea` silent-drop policy for invalid entries.

## LOC Delta (T2 net-new)
~1,030 effective (within 1,000 ± buffer per Part 7).

## Streak
20 → 21 first-pass A (pending founder acceptance).
