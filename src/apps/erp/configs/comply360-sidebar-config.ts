/**
 * @file        src/apps/erp/configs/comply360-sidebar-config.ts
 * @purpose     Comply360 sidebar config · 44 mega-menus · type:'item' navigable (S95 hotfix)
 * @sprint      Sprint 95 HOTFIX · T-Phase-5.F.5.7-Final-HOTFIX · sidebar inactivity fix
 * @decisions   D-S69-1 (Comply360 100% native) · D-S69-2 (mega-menu sidebar) · FR-74 ('c *' namespace)
 *              S95-HOTFIX: type:'group'+children:[] → type:'item' (canonical navigable pattern)
 * @iso         Usability · Maintainability
 */
import {
  Home, Calendar, Building, Receipt, Users, Wallet, Archive, Scroll,
  Package, Search, Shield, Globe, Truck, Award, Leaf, Gavel,
  BarChart3, FileBarChart, Sparkles, Folder, Plug, Workflow, Settings,
  Percent, ShieldAlert, HardHat, UserCheck, Bike,
  Landmark, TrendingUp, Building2, Globe2, Brain, Presentation,
  Flame, Wrench, TreePine, Recycle, Lock, BadgeCheck, Briefcase, Copyright,
} from 'lucide-react';
import type { SidebarItem } from '@/shell/types';

export const comply360SidebarItems: SidebarItem[] = [
  { id: 'home',           type: 'item', label: 'Home Dashboard',                 icon: Home,         keyboard: 'c h' },
  { id: 'calendar',       type: 'item', label: 'Compliance Calendar',            icon: Calendar,     keyboard: 'c c' },
  { id: 'companies',      type: 'item', label: 'Companies & Entities',           icon: Building,     keyboard: 'c e' },
  { id: 'tax-gst',        type: 'item', label: 'Tax & GST',                      icon: Receipt,      keyboard: 'c t' },
  { id: 'tds',            type: 'item', label: 'TDS (Income-tax)',               icon: Percent,      keyboard: 'c q' },
  { id: 'payroll',        type: 'item', label: 'Payroll & HR Compliance',        icon: Users,        keyboard: 'c p' },
  { id: 'payments',       type: 'item', label: 'Statutory Payments',             icon: Wallet,       keyboard: 'c y' },
  { id: 'challan-vault',  type: 'item', label: 'Challan Vault',                  icon: Archive,      keyboard: 'c v' },
  { id: 'roc',            type: 'item', label: 'ROC / Secretarial',              icon: Scroll,       keyboard: 'c r' },
  { id: 'whistleblower',  type: 'item', label: 'Whistleblower / Vigil Mechanism', icon: ShieldAlert,  keyboard: 'c w' },
  { id: 'fixed-assets',   type: 'item', label: 'Fixed Assets',                   icon: Package,      keyboard: 'c f' },
  { id: 'internal-audit', type: 'item', label: 'Internal Audit',                 icon: Search,       keyboard: 'c i' },
  { id: 'external-audit', type: 'item', label: 'External Audit',                 icon: Shield,       keyboard: 'c x' },
  { id: 'exim',           type: 'item', label: 'Import Export Compliance',       icon: Globe,        keyboard: 'c m' },
  { id: 'vendor',         type: 'item', label: 'Vendor & Contractor Compliance', icon: Truck,        keyboard: 'c d' },
  { id: 'licenses',       type: 'item', label: 'Licenses & Regulatory',          icon: Award,        keyboard: 'c l' },
  { id: 'esg',            type: 'item', label: 'Environment / ESG / Safety',     icon: Leaf,         keyboard: 'c g' },
  { id: 'legal',          type: 'item', label: 'Legal & Notices',                icon: Gavel,        keyboard: 'c n' },
  { id: 'finance-hub',    type: 'item', label: 'Finance Data Hub',               icon: BarChart3,    keyboard: 'c b' },
  { id: 'reports',        type: 'item', label: 'Reports & Analytics',            icon: FileBarChart, keyboard: 'c o' },
  { id: 'ai-center',      type: 'item', label: 'AI Control Center',              icon: Sparkles,     keyboard: 'c a' },
  { id: 'docs',           type: 'item', label: 'Documents Vault',                icon: Folder,       keyboard: 'c u' },
  { id: 'integrations',   type: 'item', label: 'Integrations',                   icon: Plug,         keyboard: 'c j' },
  { id: 'workflow',       type: 'item', label: 'Workflow Center',                icon: Workflow,     keyboard: 'c k' },
  { id: 'admin',          type: 'item', label: 'Admin & Settings',               icon: Settings,     keyboard: 'c z' },
  // 🆕 Sprint 86 · Floor 4 Sector-Pack · Labour/HR section
  { id: 'labour-codes',   type: 'item', label: 'Labour Codes 2026',              icon: HardHat,      keyboard: 'c L' },
  { id: 'posh',           type: 'item', label: 'POSH Act 2013',                  icon: UserCheck,    keyboard: 'c P' },
  { id: 'gig-workers',    type: 'item', label: 'Gig Workers Social Security',    icon: Bike,         keyboard: 'c G' },
  // 🆕 Sprint 87 · Floor 4 Sector-Pack · Regulatory section + AI Control Center + CFO Deck (OOB-3)
  { id: 'sector-nbfc',       type: 'item', label: 'NBFC Sector-Pack',                icon: Landmark,     keyboard: 'c N' },
  { id: 'sector-sebi',       type: 'item', label: 'SEBI LODR Sector-Pack',           icon: TrendingUp,   keyboard: 'c S' },
  { id: 'sector-rera',       type: 'item', label: 'RERA Sector-Pack',                icon: Building2,    keyboard: 'c R' },
  { id: 'sector-fema',       type: 'item', label: 'FEMA Sector-Pack',                icon: Globe2,       keyboard: 'c F' },
  { id: 'ai-control-center', type: 'item', label: 'AI Control Center (OOB-2/9)',     icon: Brain,        keyboard: 'c A' },
  { id: 'cfo-pitch-deck',    type: 'item', label: 'CFO Pitch Deck (OOB-3)',          icon: Presentation, keyboard: 'c D' },
  // 🆕 Sprint 89 · Floor 5 OPENS · Fire Safety + Industrial Safety
  { id: 'fire-safety',       type: 'item', label: 'Fire Safety',                     icon: Flame,        keyboard: 'c Y' },
  { id: 'industrial-safety', type: 'item', label: 'Industrial Safety',               icon: Wrench,       keyboard: 'c I' },
  // 🆕 Sprint 90 · Floor 5.2 · Environmental Compliance Pt 1
  { id: 'environmental',     type: 'item', label: 'Environmental Compliance',        icon: TreePine,     keyboard: 'c E' },
  // 🆕 Sprint 91 · Floor 5.3 · Waste Management (6 sub-regimes consolidated)
  { id: 'waste-management',  type: 'item', label: 'Waste Management',                icon: Recycle,      keyboard: 'c W' },
  // 🆕 Sprint 92 · Floor 5.4 · DPDP Act 2023 + Cyber Security (CERT-In Directions 2022)
  { id: 'dpdp',              type: 'item', label: 'DPDP Act 2023',                   icon: Lock,         keyboard: 'c B' },
  { id: 'cyber-security',    type: 'item', label: 'Cyber Security (CERT-In)',        icon: ShieldAlert,  keyboard: 'c X' },
  // 🆕 Sprint 93 · Floor 5.5 · Quality + Labour Tier-2 (Q37)
  { id: 'quality-standards', type: 'item', label: 'Quality & Standards',             icon: BadgeCheck,   keyboard: 'c Q' },
  { id: 'labour-tier2',      type: 'item', label: 'Labour Tier-2',                   icon: HardHat,      keyboard: 'c T' },
  // 🆕 Sprint 94 · Floor 5.6 CAPSTONE · CLOSES FLOOR 5 · MCA T2 + Legal/IPR (Q38)
  { id: 'mca-tier2',         type: 'item', label: 'MCA Tier-2 + PMLA',               icon: Briefcase,    keyboard: 'c M' },
  { id: 'legal-ipr',         type: 'item', label: 'Legal Contracts + IPR',           icon: Copyright,    keyboard: 'c K' },
];
