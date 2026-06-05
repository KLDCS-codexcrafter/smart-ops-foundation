/**
 * @file        src/apps/erp/configs/webstorex-sidebar-config.ts
 * @purpose     WebStoreX canonical sidebar · 'w *' keyboard namespace.
 * @sprint      Sprint 149 PIM · Sprint 150 Commerce Engines (DP-WS-4/9/10/11/16/17/19.3)
 * @decisions   D-250 Shell pattern lock · institutional sidebar parity
 *              (ZERO per-item requiredCards · matches frontdesk/taskflow/comply360).
 */
import {
  Home, ShoppingBag, Boxes, Tag, FolderTree, Settings,
  IndianRupee, Percent, Gift, CreditCard, Megaphone, Star, ImageIcon, Layers,
  Store, ShoppingCart, FileText, Zap, Bookmark, Receipt,
} from 'lucide-react';
import type { SidebarItem } from '@/shell/types';

export const webstorexSidebarItems: SidebarItem[] = [
  { id: 'welcome',    type: 'item', label: 'Welcome',    icon: Home,        moduleId: 'welcome',    keyboard: 'w w' },
  // ── Catalog (S149) ────────────────────────────────────────────────
  { id: 'catalog',    type: 'item', label: 'Catalog',    icon: ShoppingBag, moduleId: 'catalog',    keyboard: 'w c' },
  { id: 'variants',   type: 'item', label: 'Variants',   icon: Boxes,       moduleId: 'variants',   keyboard: 'w v' },
  { id: 'brands',     type: 'item', label: 'Brands',     icon: Tag,         moduleId: 'brands',     keyboard: 'w b' },
  { id: 'categories', type: 'item', label: 'Categories', icon: FolderTree,  moduleId: 'categories', keyboard: 'w g' },
  // ── Commerce (S150) ───────────────────────────────────────────────
  { id: 'div-commerce', type: 'divider', label: 'Commerce' },
  { id: 'price-lists',  type: 'item', label: 'Price Lists',          icon: IndianRupee, moduleId: 'price-lists',  keyboard: 'w p' },
  { id: 'schemes',      type: 'item', label: 'Schemes',              icon: Percent,     moduleId: 'schemes',      keyboard: 'w h' },
  { id: 'loyalty',      type: 'item', label: 'Loyalty',              icon: Star,        moduleId: 'loyalty',      keyboard: 'w l' },
  { id: 'vouchers',     type: 'item', label: 'Vouchers & Credit',    icon: Gift,        moduleId: 'vouchers',     keyboard: 'w u' },
  { id: 'campaigns',    type: 'item', label: 'Campaigns',            icon: Megaphone,   moduleId: 'campaigns',    keyboard: 'w a' },
  { id: 'testimonials', type: 'item', label: 'Testimonials',         icon: CreditCard,  moduleId: 'testimonials', keyboard: 'w t' },
  // ── Storefront (S151) ─────────────────────────────────────────────
  { id: 'div-storefront', type: 'divider', label: 'Storefront' },
  { id: 'storefront-home',       type: 'item', label: 'Browse store',   icon: Store,        moduleId: 'storefront-home',       keyboard: 'w o' },
  { id: 'storefront-cart',       type: 'item', label: 'Cart',           icon: ShoppingCart, moduleId: 'storefront-cart',       keyboard: 'w r' },
  { id: 'storefront-checkout',   type: 'item', label: 'Checkout',       icon: CreditCard,   moduleId: 'storefront-checkout',   keyboard: 'w k' },
  { id: 'storefront-quickorder', type: 'item', label: 'Quick order',    icon: Zap,          moduleId: 'storefront-quickorder', keyboard: 'w q' },
  { id: 'storefront-saved',      type: 'item', label: 'Saved carts',    icon: Bookmark,     moduleId: 'storefront-saved',      keyboard: 'w d' },
  { id: 'storefront-orders',     type: 'item', label: 'My orders',      icon: Receipt,      moduleId: 'storefront-orders',     keyboard: 'w m' },
  { id: 'storefront-quote',      type: 'item', label: 'Request quote',  icon: FileText,     moduleId: 'storefront-quote',      keyboard: 'w e' },
  // ── Coming soon ────────────────────────────────────────────────────
  { id: 'div-soon', type: 'divider', label: 'Coming Soon' },
  { id: 'visualizer-coming-soon', type: 'item', label: 'Visualizer — S152', icon: ImageIcon, moduleId: 'visualizer-coming-soon', comingSoon: true },
  { id: 'storefront-coming-soon', type: 'item', label: 'Layered views — TBD', icon: Layers, moduleId: 'storefront-coming-soon', comingSoon: true },
  // ── Settings ───────────────────────────────────────────────────────
  { id: 'settings',   type: 'item', label: 'Settings',   icon: Settings,    moduleId: 'settings',   keyboard: 'w s' },
];
