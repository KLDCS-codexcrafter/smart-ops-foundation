# T1 FIX · RPT-2e-i · Rules-of-Hooks (useDrillDown hoist)

**Predecessor HEAD:** e59e492 ("Wrapped 6 GST reg pages")
**Severity:** T1 (gate-blocking) — ESLint --max-warnings 0 was failing with 5 react-hooks/rules-of-hooks errors.

## Defect
GSTR1 / GSTR2Register / GSTR3B / GSTR9 / RecoPanel called `useDrillDown()` inside a JSX IIFE
(`{(() => { const drill = useDrillDown(); ... })()}`), violating Rules of Hooks.
RCMComplianceReport was already correct (top-level at line 72).

## Fix (5 files · no logic change)
Hoisted `const drill = useDrillDown();` from inside the JSX IIFE to the component top level
(immediately after the function signature), and removed the inner declaration. The IIFE
references the closed-over top-level `drill`. No other change — chartRows/chartConfig/
TableChartToggle/integrity badge/columns/existing tables identical.

Files modified:
- src/pages/erp/fincore/reports/gst/GSTR1.tsx
- src/pages/erp/fincore/reports/gst/GSTR2Register.tsx
- src/pages/erp/fincore/reports/gst/GSTR3B.tsx
- src/pages/erp/fincore/reports/gst/GSTR9.tsx
- src/pages/erp/fincore/reports/gst/RecoPanel.tsx

## Gate (pasted)

```
$ npx tsc -p tsconfig.app.json --noEmit
(0 errors)

$ npx eslint . --max-warnings 0
(0 problems)

$ npx eslint src/pages/erp/fincore/reports/gst --max-warnings 0 2>&1 | grep -c "rules-of-hooks"
0

$ npx vitest run src/pages/erp/fincore/reports/gst
 Test Files  6 passed (6)
      Tests  6 passed (6)
```

## Institutional
- No sprint-history change (RPT-2e-i stays TBD_AT_BANK; banks at this fix's HEAD).
- ZERO new SIBLINGs.
