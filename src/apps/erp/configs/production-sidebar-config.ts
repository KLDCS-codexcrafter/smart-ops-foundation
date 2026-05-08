/**
 * @file        production-sidebar-config.ts
 * @purpose     Sidebar data config for Production Hub · 19 modules in 4 sections
 * @who         Production planners · Shop floor · QC · Job-work coordinators
 * @when        Phase 1.A.2.a · Production Structural sprint
 * @sprint      T-Phase-1.A.2.c-Job-Work-Tally-Parity (was T-Phase-1.A.2.b-Production-Reports · A.2.c added Job Work group)
 * @iso         Maintainability · Usability
 * @decisions   D-250 · D-NEW-I · D-NEW-J (ProductionSidebar.tsx + groups.ts DELETED · data here)
 * @reuses      @/shell/types SidebarItem · lucide-react icons
 * @[JWT]       N/A (config only)
 *
 * Module IDs PRESERVED from existing ProductionSidebar.types.ts ProductionModule type
 * to avoid breaking ProductionPage's renderModule() switch.
 */

import {
  Home, Calendar, ClipboardList, PackageMinus, CheckCircle,
  Truck, PackagePlus, IdCard,
  List, TrendingUp, BarChart3, Download, Activity, CalendarDays,
  Gauge, AlertTriangle, Clock, Users, Workflow,
  Wrench, Package, Scale, Hourglass, ArrowDownToLine, Layers, FileText,
} from 'lucide-react';
import type { SidebarItem } from '@/shell/types';

export const productionSidebarItems: SidebarItem[] = [
  {
    id: 'welcome', type: 'item', label: 'Welcome', icon: Home,
    moduleId: 'welcome', requiredCards: ['production'], keyboard: 'g w',
  },
  {
    id: 'transactions-group', type: 'group', label: 'Transactions', icon: ClipboardList,
    children: [
      { id: 'tx-production-plan-entry', type: 'item', label: 'Production Plan',
        icon: Calendar, moduleId: 'tx-production-plan-entry', requiredCards: ['production'], keyboard: 'g p' },
      { id: 'tx-production-order-entry', type: 'item', label: 'Production Order',
        icon: ClipboardList, moduleId: 'tx-production-order-entry', requiredCards: ['production'], keyboard: 'g o' },
      { id: 'tx-material-issue', type: 'item', label: 'Material Issue Note',
        icon: PackageMinus, moduleId: 'tx-material-issue', requiredCards: ['production'], keyboard: 'g i' },
      { id: 'tx-production-confirmation', type: 'item', label: 'Production Confirmation',
        icon: CheckCircle, moduleId: 'tx-production-confirmation', requiredCards: ['production'], keyboard: 'g c' },
      { id: 'tx-job-work-out', type: 'item', label: 'Job Work Out',
        icon: Truck, moduleId: 'tx-job-work-out', requiredCards: ['production'], keyboard: 'g j' },
      { id: 'tx-job-work-receipt', type: 'item', label: 'Job Work Receipt',
        icon: PackagePlus, moduleId: 'tx-job-work-receipt', requiredCards: ['production'], keyboard: 'g r' },
      { id: 'tx-job-card-entry', type: 'item', label: 'Job Card Entry',
        icon: IdCard, moduleId: 'tx-job-card-entry', requiredCards: ['production'], keyboard: 'g k' },
    ],
  },
  {
    id: 'reports-group', type: 'group', label: 'Reports', icon: List,
    children: [
      { id: 'rpt-production-order-register', type: 'item', label: 'Production Order Register',
        icon: List, moduleId: 'rpt-production-order-register', requiredCards: ['production'] },
      { id: 'rpt-production-plan-register', type: 'item', label: 'Production Plan Register',
        icon: List, moduleId: 'rpt-production-plan-register', requiredCards: ['production'] },
      { id: 'rpt-variance-dashboard', type: 'item', label: 'Variance Dashboard (7-way)',
        icon: TrendingUp, moduleId: 'rpt-variance-dashboard', requiredCards: ['production'] },
      { id: 'rpt-plan-actual-rolling', type: 'item', label: 'Plan vs Actual Rolling',
        icon: BarChart3, moduleId: 'rpt-plan-actual-rolling', requiredCards: ['production'] },
      { id: 'rpt-itc04-export', type: 'item', label: 'ITC-04 Export',
        icon: Download, moduleId: 'rpt-itc04-export', requiredCards: ['production'] },
      { id: 'rpt-wip', type: 'item', label: 'WIP Report',
        icon: Activity, moduleId: 'rpt-wip', requiredCards: ['production'] },
      { id: 'rpt-daily-work-register', type: 'item', label: 'Daily Work Register',
        icon: CalendarDays, moduleId: 'rpt-daily-work-register', requiredCards: ['production'] },
      { id: 'rpt-shiftwise-production', type: 'item', label: 'Shift-wise Production',
        icon: Clock, moduleId: 'rpt-shiftwise-production', requiredCards: ['production'] },
      { id: 'rpt-manpower-production', type: 'item', label: 'Manpower Performance',
        icon: Users, moduleId: 'rpt-manpower-production', requiredCards: ['production'] },
      { id: 'rpt-production-trace', type: 'item', label: 'Production Trace Register',
        icon: Workflow, moduleId: 'rpt-production-trace', requiredCards: ['production'] },
    ],
  },
  {
    id: 'job-work-group', type: 'group', label: 'Job Work', icon: Wrench,
    children: [
      { id: 'rpt-jw-out-register', type: 'item', label: 'JW Out Register',
        icon: Truck, moduleId: 'rpt-jw-out-register', requiredCards: ['production'] },
      { id: 'rpt-jw-stock-with-worker', type: 'item', label: 'Stock with Job Worker',
        icon: Package, moduleId: 'rpt-jw-stock-with-worker', requiredCards: ['production'] },
      { id: 'rpt-jw-variance', type: 'item', label: 'JW Variance Analysis',
        icon: Scale, moduleId: 'rpt-jw-variance', requiredCards: ['production'] },
      { id: 'rpt-jw-ageing', type: 'item', label: 'JW Ageing Analysis',
        icon: Hourglass, moduleId: 'rpt-jw-ageing', requiredCards: ['production'] },
      { id: 'rpt-jw-in-register', type: 'item', label: 'JW IN Register',
        icon: ArrowDownToLine, moduleId: 'rpt-jw-in-register', requiredCards: ['production'] },
      { id: 'rpt-jw-components-summary', type: 'item', label: 'Components Order Summary',
        icon: Layers, moduleId: 'rpt-jw-components-summary', requiredCards: ['production'] },
      { id: 'rpt-jw-material-movement', type: 'item', label: 'Material Movement Register',
        icon: FileText, moduleId: 'rpt-jw-material-movement', requiredCards: ['production'] },
    ],
  },
  {
    id: 'dashboards-group', type: 'group', label: 'Dashboards', icon: BarChart3,
    children: [
      { id: 'rpt-capacity-planning', type: 'item', label: 'Capacity Planning',
        icon: Gauge, moduleId: 'rpt-capacity-planning', requiredCards: ['production'] },
      { id: 'rpt-oee-dashboard', type: 'item', label: 'OEE Dashboard',
        icon: Activity, moduleId: 'rpt-oee-dashboard', requiredCards: ['production'] },
      { id: 'rpt-wastage-dashboard', type: 'item', label: 'Wastage Dashboard',
        icon: AlertTriangle, moduleId: 'rpt-wastage-dashboard', requiredCards: ['production'] },
      { id: 'rpt-scheduling-board', type: 'item', label: 'Scheduling Board',
        icon: CalendarDays, moduleId: 'rpt-scheduling-board', requiredCards: ['production'] },
    ],
  },
];
