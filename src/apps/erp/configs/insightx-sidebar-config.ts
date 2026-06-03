/**
 * @file        src/apps/erp/configs/insightx-sidebar-config.ts
 * @purpose     InsightX self-owned card sidebar · navigable canon (S95 pattern)
 * @sprint      Sprint 130 · S131 (+cockpit/viewer) · S132 (+lens-explorer/drill-to-root)
 * @decisions   InsightX is its OWN card — own shell + own sidebar (mirrors Comply360 /
 *              FP&A). NO commandCenterShellConfig borrow.
 * @disciplines FR-74 ('i *' namespace) · all items type:'item' (navigable canon)
 */
import { Home, LayoutDashboard, FileBarChart, Layers, GitBranch, Gauge, Inbox } from 'lucide-react';
import type { SidebarItem } from '@/shell/types';

export const insightxSidebarItems: SidebarItem[] = [
  { id: 'ix-overview',       type: 'item', label: 'Overview · 11-Lens Coverage', icon: Home,            moduleId: 'ix-overview',       requiredCards: ['insightx'], keyboard: 'i o' },
  { id: 'ix-cockpit',        type: 'item', label: 'Executive Cockpit',           icon: LayoutDashboard, moduleId: 'ix-cockpit',        requiredCards: ['insightx'], keyboard: 'i c' },
  { id: 'ix-viewer',         type: 'item', label: 'Report Viewer',               icon: FileBarChart,    moduleId: 'ix-viewer',         requiredCards: ['insightx'], keyboard: 'i r' },
  { id: 'ix-lens-explorer',  type: 'item', label: '11-Lens Explorer',            icon: Layers,          moduleId: 'ix-lens-explorer',  requiredCards: ['insightx'], keyboard: 'i l' },
  { id: 'ix-drill-to-root',  type: 'item', label: 'Drill-to-Root (Cross-Card)',  icon: GitBranch,       moduleId: 'ix-drill-to-root',  requiredCards: ['insightx'], keyboard: 'i d' },
  { id: 'ix-operix-score',   type: 'item', label: 'Operix Score',                icon: Gauge,           moduleId: 'ix-operix-score',   requiredCards: ['insightx'], keyboard: 'i s' },
  { id: 'ix-insights-inbox', type: 'item', label: 'Insights Inbox',              icon: Inbox,           moduleId: 'ix-insights-inbox', requiredCards: ['insightx'], keyboard: 'i i' },
  // Future: S135 Predictive.
];
