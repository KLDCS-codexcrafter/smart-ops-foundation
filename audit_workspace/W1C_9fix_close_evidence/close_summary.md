# T-W1C9fix · Theme HTML Class — Close Summary

**Predecessor HEAD:** `4af52d2`
**New HEAD:** TBD_AT_BANK

## Root cause
`index.html` line 2 was `<html lang="en" class="dark">`. The dark class was baked into the HTML, so every page loaded dark and `ThemeProvider.toggleTheme()` could not produce a light view — CSS tokens, `ThemeProvider`, `ThemeToggle`, and pages were already correct.

## One-line fix
```diff
- <html lang="en" class="dark">
+ <html lang="en">
```
`ThemeProvider.getInitialTheme()` already reads `localStorage['4ds-theme']` → falls back to `window.matchMedia('(prefers-color-scheme: dark)')` and applies/removes `dark` on `document.documentElement` in its mount effect. Dark-preferring users keep dark; the toggle now reaches light.

Anti-FOUC inline script: SKIPPED (correctness over flash-polish — avoids drift from provider).

## Guard
`src/__tests__/w1c-9fix/theme-html-no-forced-dark.test.ts`
- asserts `<html>` tag in `index.html` contains no `class="dark"`
- asserts `ThemeProvider` still contains both `classList.add("dark")` and `classList.remove("dark")`

## Verification
- Toggle switches BOTH ways (dark ↔ light).
- TSC 0 · ESLint 0/0 · Vitest zero new failures · build PASS.

## Touch list
- `index.html` (one line)
- `src/__tests__/w1c-9fix/theme-html-no-forced-dark.test.ts` (new)
- `src/lib/_institutional/sprint-history.ts` (self-seed)
- `audit_workspace/W1C_9fix_close_evidence/close_summary.md` (this file)

**0-DIFF:** ThemeProvider · ThemeToggle · index.css tokens · all pages.
