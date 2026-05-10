# T-Phase-1.H.2 · QualiCheck Reverse Naming Migration · Close Summary

CLOSES Sprint H.2 · banks 27th composite first-pass A · D-NEW-CN canonical registered · Decision C Reverse.

## Triple Gate
- TSC: 0 errors
- ESLint: 0/0
- Vitest: 549+/549+ (added 5 H.2 tests)
- Build: PASS

## Acceptance Criteria (10/10)
- AC1 242 wrong forms normalized · 0 remaining (excluding intentional backward-compat in App.tsx + tests)
- AC2 applications.ts canonical CHANGED · id 'qulicheak'→'qualicheck' · name 'Qulicheak'→'QualiCheck' · route '/erp/qulicheak'→'/erp/qualicheck' (Decision C Reverse · D-NEW-CN canonical)
- AC3 1 directory rename atomic (pages/erp/qulicheak → pages/erp/qualicheck)
- AC4 6 file renames atomic (qulicheak-bridges → qualicheck-bridges · qulicheak-shell-config · qulicheak-sidebar-config · 3 test files)
- AC5 Backward-compat redirect via QulicheakLegacyRedirect (D-NEW-CM Legacy Redirect Convention) · covers /erp/qulicheak · /erp/qulicheak/* · /operix-go/qulicheak
- AC6 D-NEW-BB 3rd consumer migration · entitlement card_id 'qulicheak'→'qualicheck' · idempotent (FR-72 candidate)
- AC7 D-NEW-CN-qualicheck-naming-canonical registered (13th canonical · canonical correction pattern)
- AC8 Zero-touch on protected files · A.5 era engines updated only at string literal level per Q-LOCK-11a
- AC9 Status counts preserved (21 active · 0 wip · 11 coming_soon · 8 cards on Shell pattern)
- AC10 NAMING CONVENTIONS comment EXTENDED with D-NEW-CN entry alongside D-NEW-CM

## D-decisions
- 1 NEW canonical: D-NEW-CN-qualicheck-naming-canonical
- 13 canonical D-decisions at v16
- D-NEW-BB at 3 consumers (qualicheak A.5 · dispatch swap A.9 · qualicheck H.2) · FR-72 promotion candidate

## Sprint H.2 status
CLOSED · 27th first-pass A composite BANKED · path opens to Sprint H.3 (Minor Hygiene Sweep · 28th composite · v17).
