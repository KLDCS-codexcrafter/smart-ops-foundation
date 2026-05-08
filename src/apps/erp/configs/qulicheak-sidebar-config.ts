/**
 * @file        qulicheak-sidebar-config.ts
 * @purpose     Sidebar data config for Qulicheak (QualiCheck) · 12 modules in 4 sections
 * @who         Quality Inspector · QA Manager · Vendor Manager
 * @when        Phase 1.A.5.a · Qulicheak Shell Migration sprint
 * @sprint      T-Phase-1.A.5.a-Qulicheak-Shell-Migration
 * @iso         Maintainability · Usability
 * @decisions   D-250 (Shell pattern · FR-58) · D-NEW-AY (Outcome C · split α-a into
 *              Shell migration + α-a-bis NCR Foundation) ·
 *              D-NEW-AZ (QualiCheckSidebar.tsx DELETED · sidebar data extracted to config)
 * @reuses      @/shell/types SidebarItem · lucide-react icons
 * @[JWT]       N/A (config only)
 *
 * Module IDs PRESERVED from existing QualiCheckSidebar.types.ts QualiCheckModule type
 * to avoid breaking QualiCheckPage's renderModule() switch.
 */
import {
  Home, ClipboardCheck, FileText, Beaker, ListChecks,
  ShieldCheck, Award, FileCheck, AlertTriangle, Layers, Factory, BarChart3,
} from 'lucide-react';
import type { SidebarItem } from '@/shell/types';

export const qulicheakSidebarItems: SidebarItem[] = [
  {
    id: 'welcome',
    type: 'item',
    label: 'Welcome',
    icon: Home,
    moduleId: 'welcome',
    requiredCards: ['qulicheak'],
    keyboard: 'q w',
  },
  {
    id: 'operations-group',
    type: 'group',
    label: 'Operations',
    icon: ClipboardCheck,
    children: [
      {
        id: 'pending-inspections',
        type: 'item',
        label: 'Pending Inspections',
        icon: ClipboardCheck,
        moduleId: 'pending-inspections',
        requiredCards: ['qulicheak'],
        keyboard: 'q p',
      },
      {
        id: 'production-qc-pending',
        type: 'item',
        label: 'Production QC',
        icon: Factory,
        moduleId: 'production-qc-pending',
        requiredCards: ['qulicheak'],
      },
      {
        id: 'pending-alerts',
        type: 'item',
        label: 'Pending Alerts',
        icon: AlertTriangle,
        moduleId: 'pending-alerts',
        requiredCards: ['qulicheak'],
      },
      {
        id: 'closure-log',
        type: 'item',
        label: 'Closure Log',
        icon: ShieldCheck,
        moduleId: 'closure-log',
        requiredCards: ['qulicheak'],
      },
    ],
  },
  {
    id: 'masters-group',
    type: 'group',
    label: 'Masters',
    icon: FileText,
    children: [
      {
        id: 'quality-plans',
        type: 'item',
        label: 'Quality Plans',
        icon: FileText,
        moduleId: 'quality-plans',
        requiredCards: ['qulicheak'],
      },
      {
        id: 'quality-specs',
        type: 'item',
        label: 'Quality Specs',
        icon: Beaker,
        moduleId: 'quality-specs',
        requiredCards: ['qulicheak'],
      },
      {
        id: 'bulk-plan-assignment',
        type: 'item',
        label: 'Bulk Plan Assignment',
        icon: Layers,
        moduleId: 'bulk-plan-assignment',
        requiredCards: ['qulicheak'],
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
        id: 'qc-dashboard',
        type: 'item',
        label: 'QC Dashboard',
        icon: BarChart3,
        moduleId: 'qc-dashboard',
        requiredCards: ['qulicheak'],
      },
      {
        id: 'inspection-register',
        type: 'item',
        label: 'Inspection Register',
        icon: ListChecks,
        moduleId: 'inspection-register',
        requiredCards: ['qulicheak'],
      },
      {
        id: 'vendor-scorecard',
        type: 'item',
        label: 'Vendor Scorecard',
        icon: Award,
        moduleId: 'vendor-scorecard',
        requiredCards: ['qulicheak'],
      },
      {
        id: 'coa-register',
        type: 'item',
        label: 'CoA Register',
        icon: FileCheck,
        moduleId: 'coa-register',
        requiredCards: ['qulicheak'],
      },
    ],
  },
];
