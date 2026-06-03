/**
 * @file        src/apps/erp/configs/insightx-sidebar-config.ts
 * @purpose     InsightX self-owned card sidebar · navigable canon (S95 pattern)
 * @sprint      Sprint 130 · T-Phase-7.D.3.1 · 🌟 ARC D.3 OPENER · DP-D3-1
 * @decisions   InsightX is its OWN card — own shell + own sidebar (mirrors Comply360 /
 *              FP&A). NO commandCenterShellConfig borrow (the FP&A lesson applied).
 * @disciplines FR-74 ('i *' namespace) · all items type:'item' (navigable canon)
 */
import { Home } from 'lucide-react';
import type { SidebarItem } from '@/shell/types';

export const insightxSidebarItems: SidebarItem[] = [
  { id: 'ix-overview', type: 'item', label: 'Overview · 11-Lens Coverage', icon: Home, moduleId: 'ix-overview', requiredCards: ['insightx'], keyboard: 'i o' },
  // Future modules land in subsequent Arc D.3 sprints:
  // S131 Cockpit · S132 Drill-to-Root · S133 Operix-Score · S134 Insights Inbox · S135 Predictive.
];
