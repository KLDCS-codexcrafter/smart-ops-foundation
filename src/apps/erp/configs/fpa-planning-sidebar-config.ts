/**
 * @file        src/apps/erp/configs/fpa-planning-sidebar-config.ts
 * @purpose     FP&A / Planning self-owned card sidebar · navigable canon (S95 pattern)
 * @sprint      Sprint 124 · T-Phase-7.D.1.5 · Block 2 · A1 (FP&A self-owned card)
 * @decisions   A1 founder-ratified — FP&A becomes its OWN card (own shell+sidebar)
 *              instead of borrowing commandCenterShellConfig. Mirrors Comply360.
 * @disciplines FR-74 ('f *' namespace) · all items type:'item' (navigable canon)
 */
import {
  Home, Target, Wallet, LineChart, Sparkles, Users, Trophy, Network, Calculator,
} from 'lucide-react';
import type { SidebarItem } from '@/shell/types';

export const fpaPlanningSidebarItems: SidebarItem[] = [
  { id: 'fpa-home',                type: 'item', label: 'FP&A Home',                 icon: Home,       moduleId: 'fpa-home',                requiredCards: ['fpa-planning'], keyboard: 'f h' },
  { id: 'fpa-aop',                 type: 'item', label: 'AOP & Strategic Plan',      icon: Target,     moduleId: 'fpa-aop',                 requiredCards: ['fpa-planning'], keyboard: 'f a' },
  { id: 'fpa-budgeting',           type: 'item', label: 'Budgeting',                 icon: Wallet,     moduleId: 'fpa-budgeting',           requiredCards: ['fpa-planning'], keyboard: 'f b' },
  { id: 'fpa-forecasting',         type: 'item', label: 'Forecasting',               icon: LineChart,  moduleId: 'fpa-forecasting',         requiredCards: ['fpa-planning'], keyboard: 'f f' },
  { id: 'fpa-scenario',            type: 'item', label: 'Scenario Modeling',         icon: Sparkles,   moduleId: 'fpa-scenario',            requiredCards: ['fpa-planning'], keyboard: 'f s' },
  { id: 'fpa-workforce',           type: 'item', label: 'Workforce Planning',        icon: Users,      moduleId: 'fpa-workforce',           requiredCards: ['fpa-planning'], keyboard: 'f w' },
  { id: 'fpa-okr',                 type: 'item', label: 'OKR / KPI Framework',       icon: Trophy,     moduleId: 'fpa-okr',                 requiredCards: ['fpa-planning'], keyboard: 'f k' },
  { id: 'fpa-org-design',          type: 'item', label: 'Org Design & Succession',   icon: Network,    moduleId: 'fpa-org-design',          requiredCards: ['fpa-planning'], keyboard: 'f o' },
  // 🆕 Sprint 124 · Operational Costing Pt 1 · Standalone Page #50
  { id: 'fpa-operational-costing', type: 'item', label: 'Operational Costing',       icon: Calculator, moduleId: 'fpa-operational-costing', requiredCards: ['fpa-planning'], keyboard: 'f c' },
];
