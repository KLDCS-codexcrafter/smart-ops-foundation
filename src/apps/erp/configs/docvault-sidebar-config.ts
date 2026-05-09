/**
 * @file        src/apps/erp/configs/docvault-sidebar-config.ts
 * @purpose     DocVault canonical sidebar · 'd *' keyboard namespace · D-NEW-CC compliance
 * @who         Document Controller · Engineering · Quality · all departments
 * @when        2026-05-09
 * @sprint      T-Phase-1.A.8.α-a-DocVault-Foundation · Q-LOCK-4a · Block B.1
 * @iso         ISO 25010 Usability · Maintainability
 * @whom        Audit Owner
 * @decisions   D-NEW-CC canonical (sidebar keyboard uniqueness · 4th consumer with 'd *') ·
 *              Q-LOCK-4a · 4 visible + 2 deferred to A.9 (drawing-register-tree · tag-index)
 * @disciplines FR-30 · FR-67
 * @reuses      @/shell/types SidebarItem · lucide-react icons
 * @[JWT]       N/A (config only)
 *
 * Keyboard namespace: 'd *' · no collision with 'q *' (qulicheak) / 's *' (store-hub) / 'x *' (supplyx)
 */
import { Home, FileText, FilePlus, CheckSquare } from 'lucide-react';
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
    ],
  },
];
