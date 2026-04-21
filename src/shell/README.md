# @/shell — ONE Shell

Single layout package used by every Operix product (ERP, Tower, Bridge, Partner, Customer, Logistic Portal, Welcome, Mobile).

## Why

Eliminate per-card sidebar/header components. Every product is just a `ShellConfig` + page routes.

## Use it

```tsx
import { Shell } from '@/shell';
import { commandCenterShellConfig } from '@/apps/erp/configs/command-center-shell-config';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';

export default function MyPage() {
  const { profile, entitlements } = useCardEntitlement();
  return (
    <Shell
      config={commandCenterShellConfig}
      userProfile={profile}
      tenantEntitlements={entitlements}
      breadcrumbs={[{ label: 'Command Centre' }]}
      contextFlags={{ accounting_mode: 'standalone' }}
      onSidebarItemClick={(item) => { /* moduleId switching, etc */ }}
    >
      {/* page content */}
    </Shell>
  );
}
```

## Add a new product config

1. Create `src/apps/<product>/configs/<product>-sidebar-config.ts` exporting `SidebarItem[]`.
2. Create `src/apps/<product>/configs/<product>-shell-config.ts` exporting a `ShellConfig`.
3. Pass it to `<Shell config={...} />`.

## Files

- `Shell.tsx` — composer (ThemeProvider + SidebarProvider + Sidebar + Header + Content).
- `ShellThemeProvider.tsx` — sets `--shell-accent` CSS variables.
- `sidebar/ShellSidebar.tsx` — renders `SidebarItem[]` with collapsible groups + active highlight.
- `header/ShellHeader.tsx` — Sprint A-3.1 wraps legacy `ERPHeader`. Sprint A-3.2+ becomes native chip renderer.
- `theme/accents.ts` — 7 product accent palettes.
- `utils/filterSidebarByMatrix.ts` — drops items the user lacks card access for.
- `utils/filterChipsByMatrix.ts` — drops chips by role + condition (accounting_mode etc.).
- `types.ts` — `ShellConfig`, `SidebarItem`, `HeaderChip`, `ThemeAccent`, etc.
- `index.ts` — public API.

## Migration roadmap

| Sprint | Card |
|--------|------|
| A-3.1  | Command Center (reference) |
| A-3.2  | FineCore |
| A-3.3  | SalesX |
| A-3.4  | Distributor Hub |
| A-3.5  | Customer Hub |
| A-3.6  | ReceivX |
| A-3.7  | PeoplePay |
| A-3.8  | Payout |
| A-3.9  | InsightX |

Until a card migrates, it keeps using `ERPHeader` directly (already marked `@deprecated`).
