/**
 * @file        src/apps/erp/configs/eximx-import-sidebar-config.ts
 * @purpose     EximX-Import sub-module sidebar · 6 groups
 * @sprint      T-Phase-1.EX-1-EximX-Foundation
 * @decisions   EX-1-Q8 accept all 3 · 6-group Import
 */
import {
  Home, FileText, Truck, Banknote, Building2, ClipboardList, Settings, Award, Package,
} from 'lucide-react';
import type { SidebarItem } from '@/shell/types';

export const eximxImportSidebarItems: SidebarItem[] = [
  { id: 'import-welcome', type: 'item', label: 'Import Welcome', icon: Home, moduleId: 'import-welcome', requiredCards: ['eximx'], keyboard: 'm w' },
  {
    id: 'import-operations', type: 'group', label: 'Operations', icon: FileText, collapsibleByDefault: false,
    children: [
      { id: 'iec-master', type: 'item', label: 'IEC Master', icon: Award, moduleId: 'iec-master', requiredCards: ['eximx'], keyboard: 'm i' },
      { id: 'import-orders', type: 'item', label: 'Import Orders', icon: FileText, moduleId: 'import-orders', requiredCards: ['eximx'], keyboard: 'm o' },
      { id: 'bill-of-entry', type: 'item', label: 'Bill of Entry', icon: FileText, moduleId: 'bill-of-entry', requiredCards: ['eximx'], keyboard: 'm b', comingSoon: true },
    ],
  },
  {
    id: 'import-logistics', type: 'group', label: 'Logistics', icon: Truck, collapsibleByDefault: true,
    children: [
      { id: 'foreign-vendors', type: 'item', label: 'Foreign Vendors', icon: Building2, moduleId: 'foreign-vendors', requiredCards: ['eximx'], keyboard: 'm v' },
      { id: 'import-shipments', type: 'item', label: 'Shipments + GIT', icon: Package, moduleId: 'import-shipments', requiredCards: ['eximx'], keyboard: 'm s' },
    ],
  },
  {
    id: 'import-finance', type: 'group', label: 'Finance', icon: Banknote, collapsibleByDefault: true,
    children: [
      { id: 'landed-cost', type: 'item', label: 'Replayable Landed Cost', icon: Banknote, moduleId: 'landed-cost', requiredCards: ['eximx'], keyboard: 'm l' },
      { id: 'customs-revaluation', type: 'item', label: 'Customs Revaluation Audit', icon: Banknote, moduleId: 'customs-revaluation', requiredCards: ['eximx'], keyboard: 'm c' },
    ],
  },
  {
    id: 'import-india', type: 'group', label: 'India Compliance', icon: Building2, collapsibleByDefault: true,
    children: [
      { id: 'cth-master', type: 'item', label: 'CTH × Country × Date', icon: Award, moduleId: 'cth-master', requiredCards: ['eximx'], keyboard: 'm t' },
      { id: 'fta-preference', type: 'item', label: 'FTA Preferences', icon: Award, moduleId: 'fta-preference', requiredCards: ['eximx'], keyboard: 'm f' },
      { id: 'port-extension', type: 'item', label: 'Port EXIM Extension', icon: Award, moduleId: 'port-extension', requiredCards: ['eximx'], keyboard: 'm p' },
      { id: 'rms-declaration', type: 'item', label: 'RMS Declaration', icon: Award, moduleId: 'rms-declaration', requiredCards: ['eximx'], keyboard: 'm r', comingSoon: true },
      { id: 'aeo-tier-mapping', type: 'item', label: 'AEO Tier Mapping', icon: Award, moduleId: 'aeo-tier-mapping', requiredCards: ['eximx'], keyboard: 'm a', comingSoon: true },
      { id: 'carotar-coo', type: 'item', label: 'CAROTAR + COO', icon: Award, moduleId: 'carotar-coo', requiredCards: ['eximx'], keyboard: 'm y', comingSoon: true },
    ],
  },
  {
    id: 'import-management', type: 'group', label: 'Management', icon: ClipboardList, collapsibleByDefault: true,
    children: [
      { id: 'import-dashboard', type: 'item', label: 'Import Dashboard', icon: ClipboardList, moduleId: 'import-dashboard', requiredCards: ['eximx'], keyboard: 'm d', comingSoon: true },
    ],
  },
  {
    id: 'import-system', type: 'group', label: 'System', icon: Settings, collapsibleByDefault: true,
    children: [
      { id: 'import-config', type: 'item', label: 'Import Config', icon: Settings, moduleId: 'import-config', requiredCards: ['eximx'], keyboard: 'm g', comingSoon: true },
    ],
  },
];
