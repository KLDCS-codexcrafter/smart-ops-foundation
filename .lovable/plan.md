

## Match Control Tower Page to Reference Project

The main content area already matches. The differences are in the **sidebar** and **header**. The reference project has a Control Tower-specific sidebar with 14 nav items and a dark background, while the current project has a cross-panel sidebar (Operations/Ecosystem groups).

### Key Differences

| Area | Current | Reference |
|------|---------|-----------|
| Sidebar background | Theme default (dark card) | Explicit dark navy `hsl(230,25%,18%)` |
| Sidebar nav items | 5 items across 2 groups (Control Tower, Bridge, ERP, Partner, Customer) | 14 Control Tower-specific items (Dashboard, Tenants, Users, Permissions, Billing, Security, Notifications, Integrations, Audit Logs, Settings, Support, AI Insights, Partners, Themes) |
| Sidebar logo subtitle | "Enterprise Ops" | "Control Tower" |
| v2 badges | None | 4 items have orange "v2" badges (Integrations, AI Insights, Partners, Themes) |
| Sidebar collapse | Uses shadcn SidebarProvider | Custom `useState` with fixed aside |
| Header | Breadcrumbs + SidebarTrigger + UserProfileDropdown | Minimal — just bell icon + avatar circle |
| Page title | "Control Tower" only | "Dashboard" with subtitle "Platform overview — Super Admin" |

### Approach

Since the sidebar is shared by all panels (Bridge, ERP, Partner, Customer), replacing it globally would break other pages. Instead, we make the **Control Tower use its own layout** that matches the reference exactly.

### Changes

**1. Create `src/components/layout/TowerLayout.tsx`** (new file)
- Custom layout component matching the reference's `AppLayout` exactly
- Fixed dark sidebar (`hsl(230,25%,18%)`) with `useState` collapse toggle
- 14 nav items with v2 badges on 4 items
- Routes prefixed with `/tower/` (e.g., `/tower/tenants`, `/tower/users`)
- Header with bell icon (notification dot) and "SA" avatar circle
- Collapse/expand button at bottom
- Tooltip on collapsed items

**2. Update `src/pages/tower/Dashboard.tsx`**
- Switch from `AppLayout` to `TowerLayout`
- Change page title from "Control Tower" to "Dashboard" with subtitle "Platform overview — Super Admin"
- Remove breadcrumbs prop (TowerLayout handles its own header)

**3. Add placeholder routes in `src/App.tsx`**
- Add routes for `/tower/tenants`, `/tower/users`, `/tower/permissions`, `/tower/billing`, `/tower/security`, `/tower/notifications`, `/tower/integrations`, `/tower/audit-logs`, `/tower/settings`, `/tower/support`, `/tower/ai-insights`, `/tower/partners`, `/tower/themes`
- Each renders TowerLayout with a "coming soon" placeholder

### Technical Details

- The `TowerLayout` will NOT use the shadcn `SidebarProvider`/`Sidebar` components — it uses a plain `<aside>` with `useState` for collapse, matching the reference exactly
- Active state detection: `location.pathname === item.url`
- Collapsed state shows icon-only with tooltips (using existing shadcn Tooltip)
- The existing `AppLayout` + `AppSidebar` remain untouched for other panels

