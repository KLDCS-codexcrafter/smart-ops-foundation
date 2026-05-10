/**
 * @file        src/apps/erp/configs/engineeringx-sidebar-config.ts
 * @purpose     EngineeringX canonical sidebar · 'e *' keyboard namespace · D-NEW-CC compliance · 5th consumer
 * @who         Engineering · Document Controller · Production · Procurement · QualiCheck
 * @when        2026-05-10
 * @sprint      T-Phase-1.A.10 EngineeringX Foundation · Q-LOCK-6a + Q-LOCK-10a · Block D.3
 * @iso         ISO 25010 Usability · Maintainability
 * @whom        Audit Owner
 * @decisions   D-NEW-CC keyboard uniqueness · 5th consumer ('e *' namespace · was 4 at v20)
 * @disciplines FR-30 · FR-67
 * @reuses      @/shell/types SidebarItem · lucide-react icons
 * @[JWT]       N/A (config only)
 */
import {
  Home, FileText, FilePlus, BookMarked, ListTree, Sparkles, BarChart3,
} from 'lucide-react';
import type { SidebarItem } from '@/shell/types';

export const engineeringxSidebarItems: SidebarItem[] = [
  {
    id: 'welcome',
    type: 'item',
    label: 'Welcome',
    icon: Home,
    moduleId: 'welcome',
    requiredCards: ['engineeringx'],
    keyboard: 'e w',
  },
  {
    id: 'drawings-group',
    type: 'group',
    label: 'Drawings',
    icon: FileText,
    children: [
      {
        id: 'drawing-register-placeholder',
        type: 'item',
        label: 'Drawing Register',
        icon: FileText,
        moduleId: 'drawing-register-placeholder',
        requiredCards: ['engineeringx'],
        keyboard: 'e r',
      },
      {
        id: 'drawing-entry-placeholder',
        type: 'item',
        label: 'New Drawing',
        icon: FilePlus,
        moduleId: 'drawing-entry-placeholder',
        requiredCards: ['engineeringx'],
        keyboard: 'e n',
      },
    ],
  },
  {
    id: 'design-reuse-group',
    type: 'group',
    label: 'Design Re-use',
    icon: BookMarked,
    children: [
      {
        id: 'reference-projects-placeholder',
        type: 'item',
        label: 'Reference Projects',
        icon: BookMarked,
        moduleId: 'reference-projects-placeholder',
        requiredCards: ['engineeringx'],
        keyboard: 'e p',
      },
      {
        id: 'bom-placeholder',
        type: 'item',
        label: 'BOM-from-Drawing',
        icon: ListTree,
        moduleId: 'bom-placeholder',
        requiredCards: ['engineeringx'],
        keyboard: 'e b',
      },
    ],
  },
  {
    id: 'similarity-placeholder',
    type: 'item',
    label: 'AI Similarity',
    icon: Sparkles,
    moduleId: 'similarity-placeholder',
    requiredCards: ['engineeringx'],
    keyboard: 'e s',
  },
  {
    id: 'reports-placeholder',
    type: 'item',
    label: 'Reports',
    icon: BarChart3,
    moduleId: 'reports-placeholder',
    requiredCards: ['engineeringx'],
    keyboard: 'e t',
  },
];
