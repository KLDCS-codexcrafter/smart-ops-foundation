/**
 * @file        src/apps/erp/configs/eximx-sidebar-config.ts
 * @purpose     EximX top-level sidebar · 3 sub-module entries + Saathi tile
 * @sprint      T-Phase-1.EX-1-EximX-Foundation
 * @decisions   Q15=b sub-module split · EX-1-Q1=a path-based · EX-1-Q6=b Saathi educational
 */
import { Home, Globe, Package, Layers, Bot } from 'lucide-react';
import type { SidebarItem } from '@/shell/types';

export const eximxSidebarItems: SidebarItem[] = [
  { id: 'welcome', type: 'item', label: 'Welcome', icon: Home, moduleId: 'welcome', requiredCards: ['eximx'], keyboard: 'e w' },
  { id: 'eximx-export', type: 'item', label: 'EximX · Export', icon: Globe, moduleId: 'eximx-export', requiredCards: ['eximx'], keyboard: 'e e' },
  { id: 'eximx-import', type: 'item', label: 'EximX · Import', icon: Package, moduleId: 'eximx-import', requiredCards: ['eximx'], keyboard: 'e i' },
  { id: 'eximx-unified', type: 'item', label: 'EximX · Unified', icon: Layers, moduleId: 'eximx-unified', requiredCards: ['eximx'], keyboard: 'e u' },
  { id: 'saathi-tdl-gaps-atlas', type: 'item', label: 'Saathi · TDL Gaps Atlas', icon: Bot, moduleId: 'saathi-tdl-gaps-atlas', requiredCards: ['eximx'], keyboard: 'e s' },
];
