/**
 * @file        src/apps/erp/configs/ecomx-sidebar-config.ts
 * @purpose     EcomX canonical sidebar · 'e *' keyboard namespace.
 * @sprint      Sprint 153/154 · EcomX (Channel Foundation + Money Suite)
 * @decisions   D-250 Shell pattern lock · institutional sidebar parity
 *              (ZERO per-item requiredCards · matches frontdesk/taskflow/comply360/webstorex).
 */
import {
  Home, LayoutDashboard, Gauge, Store, Boxes, Inbox, Upload, Receipt,
  Banknote, Scale, AlertTriangle, Undo2, Split,
} from 'lucide-react';
import type { SidebarItem } from '@/shell/types';

export const ecomxSidebarItems: SidebarItem[] = [
  { id: 'welcome',       type: 'item', label: 'Welcome',         icon: Home,            moduleId: 'welcome',       keyboard: 'e w' },
  { id: 'dashboard',     type: 'item', label: 'Dashboard',       icon: LayoutDashboard, moduleId: 'dashboard',     keyboard: 'e d' },
  { id: 'cockpit',       type: 'item', label: 'Cockpit',         icon: Gauge,           moduleId: 'cockpit',       keyboard: 'e k' },
  { id: 'div-registry',  type: 'divider', label: 'Registry' },
  { id: 'marketplaces',  type: 'item', label: 'Marketplaces',    icon: Store,           moduleId: 'marketplaces',  keyboard: 'e m' },
  { id: 'listings',      type: 'item', label: 'Listings',        icon: Boxes,           moduleId: 'listings',      keyboard: 'e l' },
  { id: 'unmapped',      type: 'item', label: 'Unmapped SKUs',   icon: Inbox,           moduleId: 'unmapped',      keyboard: 'e u' },
  { id: 'div-ingest',    type: 'divider', label: 'Ingestion' },
  { id: 'import-center', type: 'item', label: 'Import Center',   icon: Upload,          moduleId: 'import-center', keyboard: 'e i' },
  { id: 'orders',        type: 'item', label: 'Orders',          icon: Receipt,         moduleId: 'orders',        keyboard: 'e o' },
  { id: 'div-money',     type: 'divider', label: 'Money Suite' },
  { id: 'settlements',   type: 'item', label: 'Settlements',     icon: Banknote,        moduleId: 'settlements',   keyboard: 'e s' },
  { id: 'reconciliation',type: 'item', label: 'Reconciliation',  icon: Scale,           moduleId: 'reconciliation',keyboard: 'e r' },
  { id: 'claims',        type: 'item', label: 'Claims',          icon: AlertTriangle,   moduleId: 'claims',        keyboard: 'e c' },
  { id: 'returns',       type: 'item', label: 'Returns',         icon: Undo2,           moduleId: 'returns',       keyboard: 'e t' },
  { id: 'allocation',    type: 'item', label: 'Allocation',      icon: Split,           moduleId: 'allocation',    keyboard: 'e a' },
];
