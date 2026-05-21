/**
 * @file        src/apps/erp/configs/eximx-sidebar-config.ts
 * @purpose     EximX top-level sidebar · 3 sub-module entries
 * @sprint      T-Phase-2.HK-1-EximX-AtlasPreview-Retire
 * @decisions   D-NEW-FM: Saathi tile retired · users use "EximX · Unified" for full Atlas Suite
 */
import { Home, Globe, Package, Layers } from 'lucide-react';
import type { SidebarItem } from '@/shell/types';

export const eximxSidebarItems: SidebarItem[] = [
  { id: 'welcome', type: 'item', label: 'Welcome', icon: Home, moduleId: 'welcome', requiredCards: ['eximx'], keyboard: 'e w' },
  { id: 'eximx-export', type: 'item', label: 'EximX · Export', icon: Globe, moduleId: 'eximx-export', requiredCards: ['eximx'], keyboard: 'e e' },
  { id: 'eximx-import', type: 'item', label: 'EximX · Import', icon: Package, moduleId: 'eximx-import', requiredCards: ['eximx'], keyboard: 'e i' },
  { id: 'eximx-unified', type: 'item', label: 'EximX · Unified', icon: Layers, moduleId: 'eximx-unified', requiredCards: ['eximx'], keyboard: 'e u' },
];
