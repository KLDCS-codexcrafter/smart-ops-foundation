/**
 * @file        src/apps/erp/configs/eximx-unified-sidebar-config.ts
 * @purpose     EximX-Unified sub-module sidebar · 3 groups
 * @sprint      T-Phase-1.EX-1-EximX-Foundation
 * @decisions   EX-1-Q8 accept all 3 · 3-group Unified
 */
import { Home, Layers, BarChart3, Settings, Shield, AlertTriangle, Globe } from 'lucide-react';
import type { SidebarItem } from '@/shell/types';

export const eximxUnifiedSidebarItems: SidebarItem[] = [
  { id: 'unified-welcome', type: 'item', label: 'Unified Welcome', icon: Home, moduleId: 'unified-welcome', requiredCards: ['eximx'], keyboard: 'u w' },
  {
    id: 'unified-operations', type: 'group', label: 'Cross-Operations', icon: Layers, collapsibleByDefault: false,
    children: [
      { id: 'sanctions-watchlist', type: 'item', label: 'Compliance Suite (AEO · CAROTAR · CoO · STPI · PCA · TP · EDPMS · Sanctions · DGTR · EWS)', icon: Shield, moduleId: 'sanctions-watchlist', requiredCards: ['eximx'], keyboard: 'u s' },
      { id: 'fema-compounding', type: 'item', label: 'FEMA Sec 13 Compounding', icon: AlertTriangle, moduleId: 'fema-compounding', requiredCards: ['eximx'], keyboard: 'u f', comingSoon: true },
      { id: 'forex-rates', type: 'item', label: 'Unified Finance · Forex Ops', icon: Globe, moduleId: 'forex-rates', requiredCards: ['eximx'], keyboard: 'u r' },
    ],
  },
  {
    id: 'unified-management', type: 'group', label: 'Management', icon: BarChart3, collapsibleByDefault: true,
    children: [
      { id: 'unified-dashboard', type: 'item', label: 'Atlas FULL (Moat #13 PRIMARY · 21 Moats · BCD · FX · Board Pack · Phase 1 FINALE)', icon: BarChart3, moduleId: 'unified-dashboard', requiredCards: ['eximx'], keyboard: 'u d' },
    ],
  },
  {
    id: 'unified-system', type: 'group', label: 'System', icon: Settings, collapsibleByDefault: true,
    children: [
      { id: 'unified-config', type: 'item', label: 'Cross-Module Config', icon: Settings, moduleId: 'unified-config', requiredCards: ['eximx'], keyboard: 'u g', comingSoon: true },
    ],
  },
];
