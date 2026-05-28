/**
 * @file        src/apps/erp/configs/comply360-sidebar-config.ts
 * @purpose     Comply360 sidebar config · 23 mega-menus per Bharat_Comply_3602.docx SSOT
 * @sprint      Sprint 69 · T-Phase-5.A.1.1 · Block 1 · Q2 Sidebar scaffolding
 * @decisions   D-S69-1 (Comply360 100% native) · D-S69-2 (23 mega-menu sidebar verbatim) · FR-74 ('c *' namespace)
 * @iso         Usability · Maintainability
 * @note        children:[] intentional · modules light up in Sprints 70-88 per Q-LOCK
 */
import {
  Home, Calendar, Building, Receipt, Users, Wallet, Archive, Scroll,
  Package, Search, Shield, Globe, Truck, Award, Leaf, Gavel,
  BarChart3, FileBarChart, Sparkles, Folder, Plug, Workflow, Settings,
  Percent,
} from 'lucide-react';
import type { SidebarItem } from '@/shell/types';

export const comply360SidebarItems: SidebarItem[] = [
  { id: 'home',           type: 'group', label: 'Home Dashboard',                 icon: Home,         keyboard: 'c h', children: [] },
  { id: 'calendar',       type: 'group', label: 'Compliance Calendar',            icon: Calendar,     keyboard: 'c c', children: [] },
  { id: 'companies',      type: 'group', label: 'Companies & Entities',           icon: Building,     keyboard: 'c e', children: [] },
  { id: 'tax-gst',        type: 'group', label: 'Tax & GST',                      icon: Receipt,      keyboard: 'c t', children: [] },
  { id: 'tds',            type: 'group', label: 'TDS (Income-tax)',               icon: Percent,      keyboard: 'c q', children: [] },
  { id: 'payroll',        type: 'group', label: 'Payroll & HR Compliance',        icon: Users,        keyboard: 'c p', children: [] },
  { id: 'payments',       type: 'group', label: 'Statutory Payments',             icon: Wallet,       keyboard: 'c y', children: [] },
  { id: 'challan-vault',  type: 'group', label: 'Challan Vault',                  icon: Archive,      keyboard: 'c v', children: [] },
  { id: 'roc',            type: 'group', label: 'ROC / Secretarial',              icon: Scroll,       keyboard: 'c r', children: [] },
  { id: 'fixed-assets',   type: 'group', label: 'Fixed Assets',                   icon: Package,      keyboard: 'c f', children: [] },
  { id: 'internal-audit', type: 'group', label: 'Internal Audit',                 icon: Search,       keyboard: 'c i', children: [] },
  { id: 'external-audit', type: 'group', label: 'External Audit',                 icon: Shield,       keyboard: 'c x', children: [] },
  { id: 'exim',           type: 'group', label: 'Import Export Compliance',       icon: Globe,        keyboard: 'c m', children: [] },
  { id: 'vendor',         type: 'group', label: 'Vendor & Contractor Compliance', icon: Truck,        keyboard: 'c d', children: [] },
  { id: 'licenses',       type: 'group', label: 'Licenses & Regulatory',          icon: Award,        keyboard: 'c l', children: [] },
  { id: 'esg',            type: 'group', label: 'Environment / ESG / Safety',     icon: Leaf,         keyboard: 'c g', children: [] },
  { id: 'legal',          type: 'group', label: 'Legal & Notices',                icon: Gavel,        keyboard: 'c n', children: [] },
  { id: 'finance-hub',    type: 'group', label: 'Finance Data Hub',               icon: BarChart3,    keyboard: 'c b', children: [] },
  { id: 'reports',        type: 'group', label: 'Reports & Analytics',            icon: FileBarChart, keyboard: 'c o', children: [] },
  { id: 'ai-center',      type: 'group', label: 'AI Control Center',              icon: Sparkles,     keyboard: 'c a', children: [] },
  { id: 'docs',           type: 'group', label: 'Documents Vault',                icon: Folder,       keyboard: 'c u', children: [] },
  { id: 'integrations',   type: 'group', label: 'Integrations',                   icon: Plug,         keyboard: 'c j', children: [] },
  { id: 'workflow',       type: 'group', label: 'Workflow Center',                icon: Workflow,     keyboard: 'c k', children: [] },
  { id: 'admin',          type: 'group', label: 'Admin & Settings',               icon: Settings,     keyboard: 'c z', children: [] },
];
