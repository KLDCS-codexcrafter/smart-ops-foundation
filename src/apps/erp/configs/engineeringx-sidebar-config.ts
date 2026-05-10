/**
 * @file        src/apps/erp/configs/engineeringx-sidebar-config.ts
 * @purpose     EngineeringX canonical sidebar · 'e *' keyboard namespace · D-NEW-CC compliance · 5 consumers
 * @who         Engineering · Document Controller · Production · Procurement · QualiCheck
 * @when        2026-05-10
 * @sprint      T-Phase-1.A.11 EngineeringX Drawing Register + Version Control · Q-LOCK-6a + Q-LOCK-10a · Block G.2
 * @iso         ISO 25010 Usability · Maintainability
 * @whom        Audit Owner
 * @decisions   D-NEW-CC keyboard uniqueness · 'e *' namespace extension within consumer · FR-73 5th consumer
 * @disciplines FR-30 · FR-67
 * @reuses      @/shell/types SidebarItem · lucide-react icons
 * @[JWT]       N/A (config only)
 */
import {
  Home, FileText, FilePlus, BookMarked, ListTree, Sparkles, BarChart3,
  CheckSquare, History,
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
        id: 'drawing-register',
        type: 'item',
        label: 'Drawing Register',
        icon: FileText,
        moduleId: 'drawing-register',
        requiredCards: ['engineeringx'],
        keyboard: 'e r',
      },
      {
        id: 'drawing-entry',
        type: 'item',
        label: 'New Drawing',
        icon: FilePlus,
        moduleId: 'drawing-entry',
        requiredCards: ['engineeringx'],
        keyboard: 'e n',
      },
      {
        id: 'drawing-approvals',
        type: 'item',
        label: 'Approvals Pending',
        icon: CheckSquare,
        moduleId: 'drawing-approvals',
        requiredCards: ['engineeringx'],
        keyboard: 'e a',
      },
      {
        id: 'drawing-version-history',
        type: 'item',
        label: 'Version History',
        icon: History,
        moduleId: 'drawing-version-history',
        requiredCards: ['engineeringx'],
        keyboard: 'e v',
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
