/**
 * @file        src/apps/erp/configs/docvault-sidebar-config.ts
 * @purpose     DocVault canonical sidebar · 'd *' keyboard namespace · D-NEW-CC compliance
 * @who         Document Controller · Engineering · Quality · all departments
 * @when        2026-05-09
 * @sprint      T-Phase-1.A.8.α-a-DocVault-Foundation · Q-LOCK-4a · Block B.1 ·
 *              T-Phase-1.A.9 BUNDLED · Q-LOCK-6a · Block B (extension · 6 NEW modules)
 * @iso         ISO 25010 Usability · Maintainability
 * @whom        Audit Owner
 * @decisions   D-NEW-CC canonical · D-NEW-CL canonical (A.9 NEW · drawing-register-tree first consumer) ·
 *              Q-LOCK-6a (sidebar extension at A.9 · 6 NEW modules: drawing-tree, tag-index, similarity, 3 reports)
 * @disciplines FR-30 · FR-67
 * @reuses      @/shell/types SidebarItem · lucide-react icons
 * @[JWT]       N/A (config only)
 */
import {
  Home, FileText, FilePlus, CheckSquare, TreePine, Bookmark, ListFilter,
  BarChart3, Clock, TrendingUp,
} from 'lucide-react';
import type { SidebarItem } from '@/shell/types';

export const docVaultSidebarItems: SidebarItem[] = [
  {
    id: 'welcome',
    type: 'item',
    label: 'Welcome',
    icon: Home,
    moduleId: 'welcome',
    requiredCards: ['docvault'],
    keyboard: 'd w',
  },
  {
    id: 'documents-group',
    type: 'group',
    label: 'Documents',
    icon: FileText,
    children: [
      {
        id: 'documents-register',
        type: 'item',
        label: 'Documents Register',
        icon: FileText,
        moduleId: 'documents-register',
        requiredCards: ['docvault'],
        keyboard: 'd r',
      },
      {
        id: 'document-entry',
        type: 'item',
        label: 'New Document',
        icon: FilePlus,
        moduleId: 'document-entry',
        requiredCards: ['docvault'],
        keyboard: 'd e',
      },
      {
        id: 'approvals-pending',
        type: 'item',
        label: 'Approvals Pending',
        icon: CheckSquare,
        moduleId: 'approvals-pending',
        requiredCards: ['docvault'],
        keyboard: 'd a',
      },
      {
        id: 'drawing-register-tree',
        type: 'item',
        label: 'Drawing Register · Tree',
        icon: TreePine,
        moduleId: 'drawing-register-tree',
        requiredCards: ['docvault'],
        keyboard: 'd t',
      },
      {
        id: 'tag-index',
        type: 'item',
        label: 'Tag Index',
        icon: Bookmark,
        moduleId: 'tag-index',
        requiredCards: ['docvault'],
        keyboard: 'd i',
      },
    ],
  },
  {
    id: 'reports-group',
    type: 'group',
    label: 'Reports',
    icon: BarChart3,
    children: [
      {
        id: 'similarity-viewer',
        type: 'item',
        label: 'Similarity Viewer',
        icon: ListFilter,
        moduleId: 'similarity-viewer',
        requiredCards: ['docvault'],
        keyboard: 'd s',
      },
      {
        id: 'documents-by-dept',
        type: 'item',
        label: 'Documents by Dept',
        icon: BarChart3,
        moduleId: 'documents-by-dept',
        requiredCards: ['docvault'],
        keyboard: 'd b',
      },
      {
        id: 'approval-latency',
        type: 'item',
        label: 'Approval Latency',
        icon: Clock,
        moduleId: 'approval-latency',
        requiredCards: ['docvault'],
        keyboard: 'd l',
      },
      {
        id: 'version-velocity',
        type: 'item',
        label: 'Version Velocity',
        icon: TrendingUp,
        moduleId: 'version-velocity',
        requiredCards: ['docvault'],
        keyboard: 'd v',
      },
    ],
  },
];
