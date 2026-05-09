/**
 * @file        src/apps/erp/configs/store-hub-sidebar-config.ts
 * @purpose     Sidebar data config for Department Stores (store-hub) · canonical pattern · D-NEW-CC compliance
 * @who         Store Keeper · Department Head · Storekeeper Supervisor
 * @when        2026-05-09
 * @sprint      T-Phase-1.A.6.α-a-Department-Stores-Foundation · Q-LOCK-8a
 * @iso         ISO 25010 Maintainability · Usability
 * @whom        Audit Owner
 * @decisions   D-NEW-CC canonical (sidebar keyboard uniqueness) · D-380 (StoreHubSidebar source) ·
 *              Q-LOCK-8a (NEW canonical sidebar config)
 * @disciplines FR-30 · FR-67 broad-stem grep verified at α-a Block 0
 * @reuses      @/shell/types SidebarItem · lucide-react icons · existing StoreHubModule type from
 *              src/pages/erp/store-hub/StoreHubSidebar.tsx (preserved verbatim)
 * @[JWT]       N/A (config only)
 *
 * Module IDs PRESERVED from existing StoreHubSidebar.tsx StoreHubModule type.
 * Keyboard namespace: 's *' prefix · D-NEW-CC uniqueness preserved (no collision with qulicheak's 'q *').
 */
import {
  Home, Boxes, Layers, TrendingUp, Package, ClipboardCheck, ArrowDown,
  Warehouse, BarChart3,
} from 'lucide-react';
import type { SidebarItem } from '@/shell/types';

export const storeHubSidebarItems: SidebarItem[] = [
  {
    id: 'welcome',
    type: 'item',
    label: 'Welcome',
    icon: Home,
    moduleId: 'sh-welcome',
    requiredCards: ['store-hub'],
    keyboard: 's w',
  },
  {
    id: 'operations-group',
    type: 'group',
    label: 'Operations',
    icon: ClipboardCheck,
    children: [
      {
        id: 'sh-t-stock-issue-entry',
        type: 'item',
        label: 'Stock Issue Entry',
        icon: ArrowDown,
        moduleId: 'sh-t-stock-issue-entry',
        requiredCards: ['store-hub'],
        keyboard: 's i',
      },
      {
        id: 'sh-t-receipt-ack',
        type: 'item',
        label: 'Receipt Acknowledgment',
        icon: Package,
        moduleId: 'sh-t-receipt-ack',
        requiredCards: ['store-hub'],
        keyboard: 's a',
      },
    ],
  },
  {
    id: 'reports-group',
    type: 'group',
    label: 'Reports',
    icon: BarChart3,
    children: [
      {
        id: 'sh-t-stock-issue-register',
        type: 'item',
        label: 'Stock Issue Register',
        icon: Layers,
        moduleId: 'sh-t-stock-issue-register',
        requiredCards: ['store-hub'],
        keyboard: 's l',
      },
      {
        id: 'sh-r-stock-check',
        type: 'item',
        label: 'Stock Check',
        icon: Boxes,
        moduleId: 'sh-r-stock-check',
        requiredCards: ['store-hub'],
        keyboard: 's c',
      },
      {
        id: 'sh-r-reorder-suggestions',
        type: 'item',
        label: 'Reorder Suggestions',
        icon: Warehouse,
        moduleId: 'sh-r-reorder-suggestions',
        requiredCards: ['store-hub'],
        keyboard: 's o',
      },
      {
        id: 'sh-r-demand-forecast',
        type: 'item',
        label: 'Demand Forecast',
        icon: TrendingUp,
        moduleId: 'sh-r-demand-forecast',
        requiredCards: ['store-hub'],
        keyboard: 's d',
      },
      {
        id: 'sh-r-cycle-count-status',
        type: 'item',
        label: 'Cycle Count Status',
        icon: ClipboardCheck,
        moduleId: 'sh-r-cycle-count-status',
        requiredCards: ['store-hub'],
        keyboard: 's y',
      },
    ],
  },
];
