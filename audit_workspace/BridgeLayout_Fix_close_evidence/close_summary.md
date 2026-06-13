# T-BridgeLayout-Theme-Tokens · Close Summary

**Predecessor HEAD:** `5296b08`
**Sprint code:** `T-BridgeLayout-Theme-Tokens`
**Scope:** Consistency fix — BridgeLayout sidebar now mirrors the tokenized TowerLayout so both consoles follow the global theme toggle identically.

## Hex/inline → Token mapping

| Before (BridgeLayout.tsx)                                        | After (semantic token)                          |
| ---------------------------------------------------------------- | ----------------------------------------------- |
| `style={{ background: "hsl(222 47% 11%)" }}`                     | `bg-card` (matches TowerLayout rail)            |
| `style={{ borderColor: "rgba(255,255,255,0.06)" }}`              | `border-border` (className)                     |
| `text-white` (logo wordmark)                                     | `text-foreground`                               |
| `text-white/50` (logo subtitle)                                  | `text-muted-foreground`                         |
| nav active `bg-white/10 text-white`                              | `bg-accent text-foreground`                     |
| nav idle `text-white/60`                                         | `text-muted-foreground`                         |
| nav hover `hover:bg-white/[0.06] hover:text-white/90`            | `hover:bg-accent hover:text-foreground`         |
| collapse divider `border-white/[0.06]`                           | `border-border`                                 |
| collapse btn `text-white/50 hover:bg-white/[0.06] hover:text-white/80` | `text-muted-foreground hover:bg-accent hover:text-foreground` |

## Mirror-with-Tower confirmation

Token choices grepped from TowerLayout.tsx and reused verbatim on the equivalent elements: rail = `bg-card border-r border-border`, nav active = `bg-accent text-foreground font-medium`, hover = `hover:bg-accent hover:text-foreground`, collapse divider = `border-t border-border`. Bridge and Tower sidebars now render visually identical in BOTH light and dark.

## Untouched (by-design)

- **Login** — gradient-hero panel, intentionally vibrant; NOT modified.
- BridgeLayout nav routing, collapse state, header, breadcrumb, notification badge — all logic 0-DIFF.

## Gates

- TSC: 0 errors
- Vitest: guard suite `bridge-layout-theme.test.ts` passes (7 assertions)
- Logic 0-DIFF: only className/style strings changed

## Files

- edited `src/components/layout/BridgeLayout.tsx`
- edited `src/lib/_institutional/sprint-history.ts` (self-seed `T-BridgeLayout-Theme-Tokens`, predecessor `5296b08`)
- created `src/__tests__/bridge-layout-fix/bridge-layout-theme.test.ts`
- created `audit_workspace/BridgeLayout_Fix_close_evidence/close_summary.md`

**New HEAD:** TBD_AT_BANK
