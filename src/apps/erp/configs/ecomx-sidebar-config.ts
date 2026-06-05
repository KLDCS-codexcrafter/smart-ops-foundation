/**
 * @file        src/apps/erp/configs/ecomx-sidebar-config.ts
 * @purpose     EcomX canonical sidebar · 'e *' keyboard namespace.
 * @sprint      Sprint 153 · EcomX Channel Foundation (DP-EC-0…5)
 * @decisions   D-250 Shell pattern lock · institutional sidebar parity
 *              (ZERO per-item requiredCards · matches frontdesk/taskflow/comply360/webstorex).
 */
import {
  Home, LayoutDashboard, Store, Boxes, Inbox, Upload, Receipt,
} from 'lucide-react';
import type { SidebarItem } from '@/shell/types';

export const ecomxSidebarItems: SidebarItem[] = [
  { id: 'welcome',       type: 'item', label: 'Welcome',       icon: Home,            moduleId: 'welcome',       keyboard: 'e w' },
  { id: 'dashboard',     type: 'item', label: 'Dashboard',     icon: LayoutDashboard, moduleId: 'dashboard',     keyboard: 'e d' },
  { id: 'div-registry',  type: 'divider', label: 'Registry' },
  { id: 'marketplaces',  type: 'item', label: 'Marketplaces',  icon: Store,           moduleId: 'marketplaces',  keyboard: 'e m' },
  { id: 'listings',      type: 'item', label: 'Listings',      icon: Boxes,           moduleId: 'listings',      keyboard: 'e l' },
  { id: 'unmapped',      type: 'item', label: 'Unmapped SKUs', icon: Inbox,           moduleId: 'unmapped',      keyboard: 'e u' },
  { id: 'div-ingest',    type: 'divider', label: 'Ingestion' },
  { id: 'import-center', type: 'item', label: 'Import Center', icon: Upload,          moduleId: 'import-center', keyboard: 'e i' },
  { id: 'orders',        type: 'item', label: 'Orders',        icon: Receipt,         moduleId: 'orders',        keyboard: 'e o' },
];
