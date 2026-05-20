/**
 * @file        src/apps/erp/configs/eximx-export-sidebar-config.ts
 * @purpose     EximX-Export sub-module sidebar · 7 groups
 * @sprint      T-Phase-1.EX-1-EximX-Foundation
 * @decisions   EX-1-Q8 accept all 3 · 7-group Export
 */
import {
  Home, FileText, Truck, Banknote, Building2, ClipboardList, BarChart3, Settings, Award,
} from 'lucide-react';
import type { SidebarItem } from '@/shell/types';

export const eximxExportSidebarItems: SidebarItem[] = [
  { id: 'export-welcome', type: 'item', label: 'Export Welcome', icon: Home, moduleId: 'export-welcome', requiredCards: ['eximx'], keyboard: 'x w' },
  {
    id: 'export-operations', type: 'group', label: 'Operations', icon: FileText, collapsibleByDefault: false,
    children: [
      { id: 'lut-master', type: 'item', label: 'LUT Master', icon: Award, moduleId: 'lut-master', requiredCards: ['eximx'], keyboard: 'x l' },
      { id: 'export-orders', type: 'item', label: 'Export Orders', icon: FileText, moduleId: 'export-orders', requiredCards: ['eximx'], keyboard: 'x o' },
      { id: 'shipping-bills', type: 'item', label: 'Shipping Bills', icon: FileText, moduleId: 'shipping-bills', requiredCards: ['eximx'], keyboard: 'x b' },
    ],
  },
  {
    id: 'export-logistics', type: 'group', label: 'Logistics', icon: Truck, collapsibleByDefault: true,
    children: [
      { id: 'foreign-customers', type: 'item', label: 'Foreign Customers', icon: Building2, moduleId: 'foreign-customers', requiredCards: ['eximx'], keyboard: 'x c' },
      { id: 'export-shipments', type: 'item', label: 'Shipments', icon: Truck, moduleId: 'export-shipments', requiredCards: ['eximx'], keyboard: 'x s' },
    ],
  },
  {
    id: 'export-finance', type: 'group', label: 'Finance', icon: Banknote, collapsibleByDefault: true,
    children: [
      { id: 'e-brc', type: 'item', label: 'e-BRC + EDPMS', icon: Banknote, moduleId: 'e-brc', requiredCards: ['eximx'], keyboard: 'x f', comingSoon: true },
      { id: 'firc', type: 'item', label: 'FIRC', icon: Banknote, moduleId: 'firc', requiredCards: ['eximx'], keyboard: 'x r', comingSoon: true },
      { id: 'fema-tracker', type: 'item', label: 'FEMA 270-day Tracker', icon: Banknote, moduleId: 'fema-tracker', requiredCards: ['eximx'], keyboard: 'x m', comingSoon: true },
    ],
  },
  {
    id: 'export-india', type: 'group', label: 'India Compliance', icon: Building2, collapsibleByDefault: true,
    children: [
      { id: 'rodtep', type: 'item', label: 'RoDTEP', icon: Award, moduleId: 'rodtep', requiredCards: ['eximx'], keyboard: 'x t', comingSoon: true },
      { id: 'drawback', type: 'item', label: 'Drawback', icon: Award, moduleId: 'drawback', requiredCards: ['eximx'], keyboard: 'x d', comingSoon: true },
      { id: 'export-council', type: 'item', label: 'Export Council Registry', icon: Building2, moduleId: 'export-council', requiredCards: ['eximx'], keyboard: 'x v', comingSoon: true },
    ],
  },
  {
    id: 'export-management', type: 'group', label: 'Management', icon: ClipboardList, collapsibleByDefault: true,
    children: [
      { id: 'export-dashboard', type: 'item', label: 'Export Dashboard', icon: BarChart3, moduleId: 'export-dashboard', requiredCards: ['eximx'], keyboard: 'x a', comingSoon: true },
    ],
  },
  {
    id: 'export-intelligence', type: 'group', label: 'Intelligence', icon: BarChart3, collapsibleByDefault: true,
    children: [
      { id: 'buyer-reliability', type: 'item', label: 'Buyer Reliability Index', icon: BarChart3, moduleId: 'buyer-reliability', requiredCards: ['eximx'], keyboard: 'x n' },
    ],
  },
  {
    id: 'export-system', type: 'group', label: 'System', icon: Settings, collapsibleByDefault: true,
    children: [
      { id: 'export-config', type: 'item', label: 'Export Config', icon: Settings, moduleId: 'export-config', requiredCards: ['eximx'], keyboard: 'x g', comingSoon: true },
    ],
  },
];
