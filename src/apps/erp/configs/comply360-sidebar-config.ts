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
  Percent, ShieldAlert, HardHat, UserCheck, Bike,
  Landmark, TrendingUp, Building2, Globe2, Brain, Presentation,
  Flame, Wrench, TreePine, Recycle, Lock,
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
  { id: 'whistleblower',  type: 'group', label: 'Whistleblower / Vigil Mechanism', icon: ShieldAlert,  keyboard: 'c w', children: [] },
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
  // 🆕 Sprint 86 · Floor 4 Sector-Pack · Labour/HR section
  { id: 'labour-codes',   type: 'group', label: 'Labour Codes 2026',              icon: HardHat,      keyboard: 'c L', children: [] },
  { id: 'posh',           type: 'group', label: 'POSH Act 2013',                  icon: UserCheck,    keyboard: 'c P', children: [] },
  { id: 'gig-workers',    type: 'group', label: 'Gig Workers Social Security',    icon: Bike,         keyboard: 'c G', children: [] },
  // 🆕 Sprint 87 · Floor 4 Sector-Pack · Regulatory section + AI Control Center + CFO Deck (OOB-3)
  { id: 'sector-nbfc',       type: 'group', label: 'NBFC Sector-Pack',                icon: Landmark,     keyboard: 'c N', children: [] },
  { id: 'sector-sebi',       type: 'group', label: 'SEBI LODR Sector-Pack',           icon: TrendingUp,   keyboard: 'c S', children: [] },
  { id: 'sector-rera',       type: 'group', label: 'RERA Sector-Pack',                icon: Building2,    keyboard: 'c R', children: [] },
  { id: 'sector-fema',       type: 'group', label: 'FEMA Sector-Pack',                icon: Globe2,       keyboard: 'c F', children: [] },
  { id: 'ai-control-center', type: 'group', label: 'AI Control Center (OOB-2/9)',     icon: Brain,        keyboard: 'c A', children: [] },
  { id: 'cfo-pitch-deck',    type: 'group', label: 'CFO Pitch Deck (OOB-3)',          icon: Presentation, keyboard: 'c D', children: [] },
  // 🆕 Sprint 89 · Floor 5 OPENS · Fire Safety + Industrial Safety
  // DESIGN-DECISION-FLAG: spec said keyboard 'c F' · 'c F' already taken by sector-fema · used 'c Y' instead
  { id: 'fire-safety',       type: 'group', label: 'Fire Safety',                     icon: Flame,        keyboard: 'c Y', children: [] },
  { id: 'industrial-safety', type: 'group', label: 'Industrial Safety',               icon: Wrench,       keyboard: 'c I', children: [] },
  // 🆕 Sprint 90 · Floor 5.2 · Environmental Compliance Pt 1
  { id: 'environmental',     type: 'group', label: 'Environmental Compliance',        icon: TreePine,     keyboard: 'c E', children: [] },
  // 🆕 Sprint 91 · Floor 5.3 · Waste Management (6 sub-regimes consolidated)
  { id: 'waste-management',  type: 'group', label: 'Waste Management',                icon: Recycle,      keyboard: 'c W', children: [] },
  // 🆕 Sprint 92 · Floor 5.4 · DPDP Act 2023 + Cyber Security (CERT-In Directions 2022)
  { id: 'dpdp',              type: 'group', label: 'DPDP Act 2023',                   icon: Lock,         keyboard: 'c B', children: [] },
  { id: 'cyber-security',    type: 'group', label: 'Cyber Security (CERT-In)',        icon: ShieldAlert,  keyboard: 'c X', children: [] },
];
