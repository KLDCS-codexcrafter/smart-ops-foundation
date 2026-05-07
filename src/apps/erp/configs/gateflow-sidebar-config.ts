/**
 * @file        gateflow-sidebar-config.ts
 * @purpose     Sidebar data config for GateFlow · 12 modules grouped into 4 sections
 * @who         Security guards · Gatekeepers · Dispatch supervisors
 * @when        Phase 1.A.1.pre · GateFlow Shell Migration sprint
 * @sprint      T-Phase-1.A.1.pre-GateFlow-Shell-Migration
 * @iso         Maintainability · Usability
 * @decisions   D-250 (Shell pattern · FR-58) · D-301 (4-panel base · 4-pre-1) ·
 *              D-314 (alerts · 4-pre-3) · D-NEW-B (sidebar data extracted from
 *              GateFlowSidebar.tsx · GateFlowSidebar.tsx now DELETED)
 * @reuses      @/shell/types SidebarItem · lucide-react icons
 * @[JWT]       N/A (config only)
 *
 * Module IDs PRESERVED from existing GateFlowSidebar.types.ts GateFlowModule type
 * to avoid breaking GateFlowPage's renderModule() switch.
 */

import {
  Home, ArrowDownToLine, ArrowUpFromLine, FileText,
  Truck, Users, Scale,
  AlertTriangle, UserX, Clock,
} from 'lucide-react';
import type { SidebarItem } from '@/shell/types';

export const gateflowSidebarItems: SidebarItem[] = [
  {
    id: 'welcome',
    type: 'item',
    label: 'Welcome',
    icon: Home,
    moduleId: 'welcome',
    requiredCards: ['gateflow'],
    keyboard: 'g w',
  },

  {
    id: 'gate-ops-group',
    type: 'group',
    label: 'Gate Operations',
    icon: ArrowDownToLine,
    children: [
      {
        id: 'gate-inward-queue',
        type: 'item',
        label: 'Gate Inward Queue',
        icon: ArrowDownToLine,
        moduleId: 'gate-inward-queue',
        requiredCards: ['gateflow'],
        keyboard: 'g i',
      },
      {
        id: 'gate-outward-queue',
        type: 'item',
        label: 'Gate Outward Queue',
        icon: ArrowUpFromLine,
        moduleId: 'gate-outward-queue',
        requiredCards: ['gateflow'],
        keyboard: 'g o',
      },
      {
        id: 'gate-pass-register',
        type: 'item',
        label: 'Gate Pass Register',
        icon: FileText,
        moduleId: 'gate-pass-register',
        requiredCards: ['gateflow'],
        keyboard: 'g r',
      },
    ],
  },

  {
    id: 'vehicle-group',
    type: 'group',
    label: 'Vehicle & Driver',
    icon: Truck,
    children: [
      {
        id: 'vehicle-inward',
        type: 'item',
        label: 'Vehicle Inward',
        icon: ArrowDownToLine,
        moduleId: 'vehicle-inward',
        requiredCards: ['gateflow'],
      },
      {
        id: 'vehicle-outward',
        type: 'item',
        label: 'Vehicle Outward',
        icon: ArrowUpFromLine,
        moduleId: 'vehicle-outward',
        requiredCards: ['gateflow'],
      },
      {
        id: 'vehicle-master',
        type: 'item',
        label: 'Vehicle Master',
        icon: Truck,
        moduleId: 'vehicle-master',
        requiredCards: ['gateflow'],
      },
      {
        id: 'driver-master',
        type: 'item',
        label: 'Driver Master',
        icon: Users,
        moduleId: 'driver-master',
        requiredCards: ['gateflow'],
      },
      {
        id: 'weighbridge-register',
        type: 'item',
        label: 'Weighbridge Register',
        icon: Scale,
        moduleId: 'weighbridge-register',
        requiredCards: ['gateflow'],
      },
    ],
  },

  {
    id: 'alerts-group',
    type: 'group',
    label: 'Alerts',
    icon: AlertTriangle,
    children: [
      {
        id: 'alert-vehicle-expiry',
        type: 'item',
        label: 'Vehicle Expiry Alerts',
        icon: AlertTriangle,
        moduleId: 'alert-vehicle-expiry',
        requiredCards: ['gateflow'],
      },
      {
        id: 'alert-driver-expiry',
        type: 'item',
        label: 'Driver Expiry Alerts',
        icon: UserX,
        moduleId: 'alert-driver-expiry',
        requiredCards: ['gateflow'],
      },
      {
        id: 'alert-gate-dwell',
        type: 'item',
        label: 'Gate Dwell Alerts',
        icon: Clock,
        moduleId: 'alert-gate-dwell',
        requiredCards: ['gateflow'],
      },
    ],
  },
];
