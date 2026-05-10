/**
 * @file        src/apps/erp/configs/engineeringx-sidebar-config.ts
 * @sprint      T-Phase-1.A.13 · Q-LOCK-13a · Block D.2 · D-NEW-CC `'e *'` namespace extension within consumer (5 consumers UNCHANGED · 4 NEW shortcuts at A.13)
 * @decisions   D-NEW-CC keyboard uniqueness · FR-73 5th consumer · 4 NEW shortcuts (`e i` · `e h`) + 2 renames (`e s` · `e t`)
 */
import {
  Home, FileText, FilePlus, BookMarked, Sparkles, BarChart3,
  CheckSquare, History, Cog, List, Copy, GitBranch, Send,
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
    id: 'bom-group',
    type: 'group',
    label: 'BOM',
    icon: List,
    children: [
      {
        id: 'bom-extractor',
        type: 'item',
        label: 'BOM Extractor',
        icon: Cog,
        moduleId: 'bom-extractor',
        requiredCards: ['engineeringx'],
        keyboard: 'e b',
      },
      {
        id: 'bom-register',
        type: 'item',
        label: 'BOM Register',
        icon: List,
        moduleId: 'bom-register',
        requiredCards: ['engineeringx'],
        keyboard: 'e g',
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
        id: 'reference-library',
        type: 'item',
        label: 'Reference Library',
        icon: BookMarked,
        moduleId: 'reference-library',
        requiredCards: ['engineeringx'],
        keyboard: 'e l',
      },
      {
        id: 'clone-drawing',
        type: 'item',
        label: 'Clone Drawing',
        icon: Copy,
        moduleId: 'clone-drawing',
        requiredCards: ['engineeringx'],
        keyboard: 'e c',
      },
    ],
  },
  {
    id: 'similarity-predictor',
    type: 'item',
    label: 'AI Similarity',
    icon: Sparkles,
    moduleId: 'similarity-predictor',
    requiredCards: ['engineeringx'],
    keyboard: 'e s',
  },
  {
    id: 'change-impact-analyzer',
    type: 'item',
    label: 'Change Impact',
    icon: GitBranch,
    moduleId: 'change-impact-analyzer',
    requiredCards: ['engineeringx'],
    keyboard: 'e i',
  },
  {
    id: 'production-handoff',
    type: 'item',
    label: 'Production Handoff',
    icon: Send,
    moduleId: 'production-handoff',
    requiredCards: ['engineeringx'],
    keyboard: 'e h',
  },
  {
    id: 'engineeringx-reports',
    type: 'item',
    label: 'Reports',
    icon: BarChart3,
    moduleId: 'engineeringx-reports',
    requiredCards: ['engineeringx'],
    keyboard: 'e t',
  },
];
