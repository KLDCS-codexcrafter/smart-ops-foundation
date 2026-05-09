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
  AlertOctagon, FileWarning, Wrench, FileBadge, Ruler, Clock,
  HardHat, Users,
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
      {
        id: 'ncr-capture',
        type: 'item',
        label: 'Raise NCR',
        icon: AlertOctagon,
        moduleId: 'ncr-capture',
        requiredCards: ['qulicheak'],
        keyboard: 'q n',
      },
      {
        id: 'capa-capture',
        type: 'item',
        label: 'Raise CAPA',
        icon: Wrench,
        moduleId: 'capa-capture',
        requiredCards: ['qulicheak'],
        keyboard: 'q c',
      },
      {
        id: 'mtc-capture',
        type: 'item',
        label: 'Capture MTC',
        icon: FileBadge,
        moduleId: 'mtc-capture',
        requiredCards: ['qulicheak'],
        keyboard: 'q m',
      },
      {
        id: 'fai-capture',
        type: 'item',
        label: 'Capture FAI',
        icon: Ruler,
        moduleId: 'fai-capture',
        requiredCards: ['qulicheak'],
        keyboard: 'q f',
      },
      {
        id: 'welder-qualification',
        type: 'item',
        label: 'Welder Qualification',
        icon: HardHat,
        moduleId: 'welder-qualification',
        requiredCards: ['qulicheak'],
        keyboard: 'q w',
      },
      {
        id: 'iqc-entry-page',
        type: 'item',
        label: 'IQC Entry',
        icon: ClipboardCheck,
        moduleId: 'iqc-entry-page',
        requiredCards: ['qulicheak'],
        keyboard: 'q i',
      },
      {
        id: 'iso9001-capture',
        type: 'item',
        label: 'ISO 9001 Audit',
        icon: FileCheck,
        moduleId: 'iso9001-capture',
        requiredCards: ['qulicheak'],
        keyboard: 'q s',
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
      {
        id: 'ncr-register',
        type: 'item',
        label: 'NCR Register',
        icon: FileWarning,
        moduleId: 'ncr-register',
        requiredCards: ['qulicheak'],
      },
      {
        id: 'capa-register',
        type: 'item',
        label: 'CAPA Register',
        icon: Wrench,
        moduleId: 'capa-register',
        requiredCards: ['qulicheak'],
      },
      {
        id: 'mtc-register',
        type: 'item',
        label: 'MTC Register',
        icon: FileBadge,
        moduleId: 'mtc-register',
        requiredCards: ['qulicheak'],
      },
      {
        id: 'fai-register',
        type: 'item',
        label: 'FAI Register',
        icon: Ruler,
        moduleId: 'fai-register',
        requiredCards: ['qulicheak'],
      },
      {
        id: 'effectiveness-verification-due',
        type: 'item',
        label: 'Effectiveness Due',
        icon: Clock,
        moduleId: 'effectiveness-verification-due',
        requiredCards: ['qulicheak'],
      },
      {
        id: 'welder-register',
        type: 'item',
        label: 'Welder Register',
        icon: Users,
        moduleId: 'welder-register',
        requiredCards: ['qulicheak'],
      },
      {
        id: 'wpq-expiry-dashboard',
        type: 'item',
        label: 'WPQ Expiry',
        icon: AlertTriangle,
        moduleId: 'wpq-expiry-dashboard',
        requiredCards: ['qulicheak'],
      },
      {
        id: 'iso9001-register',
        type: 'item',
        label: 'ISO 9001 Register',
        icon: FileText,
        moduleId: 'iso9001-register',
        requiredCards: ['qulicheak'],
      },
    ],
  },
];
