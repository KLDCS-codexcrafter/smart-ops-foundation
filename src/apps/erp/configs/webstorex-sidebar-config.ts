/**
 * @file        src/apps/erp/configs/webstorex-sidebar-config.ts
 * @purpose     WebStoreX canonical sidebar · 'w *' keyboard namespace.
 * @sprint      Sprint 149 · T-WebStoreX-A11.1
 * @decisions   D-250 Shell pattern lock · institutional sidebar parity
 *              (ZERO per-item requiredCards · matches frontdesk/taskflow/comply360).
 */
import { Home, ShoppingBag, Boxes, Tag, FolderTree, Settings } from 'lucide-react';
import type { SidebarItem } from '@/shell/types';

export const webstorexSidebarItems: SidebarItem[] = [
  { id: 'welcome',    type: 'item', label: 'Welcome',    icon: Home,        moduleId: 'welcome',    keyboard: 'w w' },
  { id: 'catalog',    type: 'item', label: 'Catalog',    icon: ShoppingBag, moduleId: 'catalog',    keyboard: 'w c' },
  { id: 'variants',   type: 'item', label: 'Variants',   icon: Boxes,       moduleId: 'variants',   keyboard: 'w v' },
  { id: 'brands',     type: 'item', label: 'Brands',     icon: Tag,         moduleId: 'brands',     keyboard: 'w b' },
  { id: 'categories', type: 'item', label: 'Categories', icon: FolderTree,  moduleId: 'categories', keyboard: 'w g' },
  { id: 'settings',   type: 'item', label: 'Settings',   icon: Settings,    moduleId: 'settings',   keyboard: 'w s' },
];
