/**
 * @file        src/apps/erp/configs/supplyx-sidebar-config.ts
 * @purpose     Sidebar data config for SupplyX (internal procurement read-only mirror) · canonical pattern · D-NEW-CC compliance
 * @who         Internal Procurement · Buyer · Procurement Manager
 * @when        2026-05-09
 * @sprint      T-Phase-1.A.7.α-a-SupplyX-Scaffold-Close · Q-LOCK-3a
 * @iso         ISO 25010 Maintainability · Usability
 * @whom        Audit Owner
 * @decisions   D-282 (original SupplyX as Procure360 internal mirror · pre-Shell hand-rolled sidebar) ·
 *              T-Phase-1.A.7.α-a Shell migration · Q-LOCK-3a (NEW canonical sidebar config) ·
 *              D-NEW-CC canonical (sidebar keyboard uniqueness) ·
 *              Architectural fact: SupplyX = internal procurement read-only mirror ·
 *              Vendor Portal = SEPARATE card (vendor-portal-* engines exist independently · Phase 2 sprint TBD)
 * @disciplines FR-30 · FR-67 broad-stem grep verified at α-a Block 0
 * @reuses      @/shell/types SidebarItem · lucide-react icons · existing SupplyXModule type from
 *              src/pages/erp/supplyx/SupplyXSidebar.types.ts (preserved verbatim)
 * @[JWT]       N/A (config only)
 *
 * Module IDs PRESERVED from existing SupplyXSidebar.types.ts SupplyXModule type:
 *   welcome · open-rfqs · pending-quotations · pending-awards
 *
 * Keyboard namespace: 'x *' prefix · D-NEW-CC uniqueness preserved
 *   (no collision with qualicheck's 'q *' or store-hub's 's *' namespaces · verified at α-a Block 0)
 */
import { Home, Send, FileText, Award } from 'lucide-react';
import type { SidebarItem } from '@/shell/types';

export const supplyXSidebarItems: SidebarItem[] = [
  {
    id: 'welcome',
    type: 'item',
    label: 'Welcome',
    icon: Home,
    moduleId: 'welcome',
    requiredCards: ['supplyx'],
    keyboard: 'x w',
  },
  {
    id: 'internal-procurement-group',
    type: 'group',
    label: 'Internal Procurement',
    icon: Send,
    children: [
      {
        id: 'open-rfqs',
        type: 'item',
        label: 'Open RFQs',
        icon: Send,
        moduleId: 'open-rfqs',
        requiredCards: ['supplyx'],
        keyboard: 'x r',
      },
      {
        id: 'pending-quotations',
        type: 'item',
        label: 'Pending Quotations',
        icon: FileText,
        moduleId: 'pending-quotations',
        requiredCards: ['supplyx'],
        keyboard: 'x q',
      },
      {
        id: 'pending-awards',
        type: 'item',
        label: 'Pending Awards',
        icon: Award,
        moduleId: 'pending-awards',
        requiredCards: ['supplyx'],
        keyboard: 'x a',
      },
    ],
  },
];
