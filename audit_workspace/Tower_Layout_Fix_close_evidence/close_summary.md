# T-TowerLayout-Forced-Dark-Fix · Close Summary

**Predecessor HEAD:** `931ba7f`
**Scope:** Presentation-only fix to `src/components/layout/TowerLayout.tsx`. Logic 0-DIFF.

## Root cause
`TowerLayout.tsx` line 52 hardcoded `className="dark"` on its wrapper div plus inline
`style={{ background: "#0D1B2A" }}` and a `text-white/*` + `border-white/*` palette,
so Control Tower re-applied dark to its own subtree regardless of the global toggle.

## Fix
- Removed `dark` from the wrapper className.
- Removed both inline `style={{ background: "#0D1B2A" }}` (wrapper + sidebar).
- Removed both `bg-[#0D1B2A]` (main area + header).
- Converted all `text-white/*`, `border-white/*`, `bg-white/*` to semantic tokens, mirroring `BridgeLayout.tsx`.

## hex → token table
| Before | After |
| --- | --- |
| `className="dark ..."` + `style={ background: "#0D1B2A" }` | `bg-background` |
| sidebar `style={ background: "#0D1B2A" }` | `bg-card` |
| `bg-[#0D1B2A]` (main + header) | `bg-background` |
| `border-white/[0.08]`, `border-white/[0.06]` | `border-border` |
| `text-white` | `text-foreground` |
| `text-white/70 \| 60 \| 55 \| 50 \| 40 \| 30` | `text-muted-foreground` (+ `/50` for separators) |
| `bg-white/10` (active) | `bg-accent` |
| `hover:bg-white/[0.06]` | `hover:bg-accent` |
| `bg-white/[0.05]` (Super Admin chip) | `bg-muted` |
| `bg-cyan-500/10` · `text-cyan-500` | `bg-primary/10` · `text-primary` |
| `bg-emerald-500` (status dot) | `bg-success` |
| destructive badge `text-white` | `text-destructive-foreground` |

## Verification
- Control Tower now follows the global ThemeToggle in BOTH directions.
- Guard test `src/__tests__/tower-layout-fix/tower-layout-theme.test.ts` asserts no `dark` class literal, no `#0D1B2A`, zero `bg-[#`/`text-white`/`border-white` chrome.
- Nav structure, routing, collapse behaviour untouched.

## Triple Gate
- TSC: 0
- Vitest: zero new failures
- Build: PASS

**New HEAD:** TBD_AT_BANK
