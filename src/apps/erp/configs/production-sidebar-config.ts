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
  Beaker,
  LineChart, Target,
  Repeat, Boxes,
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
    id: 'process-mfg-group', type: 'group', label: 'Process Mfg', icon: Beaker,
    children: [
      { id: 'tx-process-batch-entry', type: 'item', label: 'Process Batch Entry',
        icon: Beaker, moduleId: 'tx-process-batch-entry', requiredCards: ['production'], keyboard: 'g b' },
      { id: 'mst-recipe-master', type: 'item', label: 'Recipe Master',
        icon: FileText, moduleId: 'mst-recipe-master', requiredCards: ['production'], keyboard: 'g m' },
      { id: 'rpt-process-batch-register', type: 'item', label: 'Process Batch Register',
        icon: List, moduleId: 'rpt-process-batch-register', requiredCards: ['production'] },
      { id: 'rpt-process-genealogy-tracker', type: 'item', label: 'Genealogy Tracker (FDA)',
        icon: Workflow, moduleId: 'rpt-process-genealogy-tracker', requiredCards: ['production'] },
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
      { id: 'rpt-job-card-register', type: 'item', label: 'Job Card Register',
        icon: ClipboardList, moduleId: 'rpt-job-card-register', requiredCards: ['production'] },
      { id: 'rpt-production-confirmation-register', type: 'item', label: 'Production Confirmation Register',
        icon: CheckCircle, moduleId: 'rpt-production-confirmation-register', requiredCards: ['production'] },
      { id: 'rpt-material-issue-note-register', type: 'item', label: 'Material Issue Note Register',
        icon: PackageMinus, moduleId: 'rpt-material-issue-note-register', requiredCards: ['production'] },
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
  {
    id: 'ai-predictive-group', type: 'group', label: 'AI & Predictive', icon: LineChart,
    children: [
      { id: 'demand-forecast-entry', type: 'item', label: 'Demand Forecast Entry',
        icon: TrendingUp, moduleId: 'demand-forecast-entry', requiredCards: ['production'] },
      { id: 'demand-forecast-dashboard', type: 'item', label: 'Demand Forecast Dashboard',
        icon: BarChart3, moduleId: 'demand-forecast-dashboard', requiredCards: ['production'] },
      { id: 'forecast-vs-actual', type: 'item', label: 'Forecast vs Actual',
        icon: Target, moduleId: 'forecast-vs-actual', requiredCards: ['production'] },
    ],
  },
  {
    id: 'repetitive-mfg-group', type: 'group', label: 'Repetitive Mfg', icon: Repeat,
    children: [
      { id: 'prod-t-repetitive-line-run-entry', type: 'item', label: 'Repetitive Line Run',
        icon: Repeat, moduleId: 'prod-t-repetitive-line-run-entry', requiredCards: ['production'] },
      { id: 'prod-r-repetitive-line-oee', type: 'item', label: 'Repetitive Line OEE',
        icon: Activity, moduleId: 'prod-r-repetitive-line-oee', requiredCards: ['production'] },
    ],
  },
  {
    id: 'multi-mode-group', type: 'group', label: 'Multi-Mode', icon: Boxes,
    children: [
      { id: 'prod-r-mixed-mode-bu-dashboard', type: 'item', label: 'Mixed-Mode BU Dashboard',
        icon: Boxes, moduleId: 'prod-r-mixed-mode-bu-dashboard', requiredCards: ['production'] },
    ],
  },
  // 🆕 Sprint 63 PROD-5 · ESG + Carbon + Closeout
  {
    id: 'esg-carbon-group', type: 'group', label: 'ESG & Carbon', icon: Layers,
    children: [
      { id: 'carbon-aware-production-planner', type: 'item', label: 'Carbon-Aware Planner',
        icon: Layers, moduleId: 'carbon-aware-production-planner', requiredCards: ['production'] },
      { id: 'production-carbon-dashboard', type: 'item', label: 'Production Carbon Dashboard',
        icon: BarChart3, moduleId: 'production-carbon-dashboard', requiredCards: ['production'] },
      { id: 'phase3v2-closure-dashboard', type: 'item', label: 'Phase 3 v2 Closure',
        icon: Target, moduleId: 'phase3v2-closure-dashboard', requiredCards: ['production'] },
    ],
  },
  // 🆕 Sprint 66 FAR-2 · Block 5 · FK-CAP-6 · Assets cross-card group
  {
    id: 'assets-group', type: 'group', label: 'Assets', icon: Boxes,
    children: [
      { id: 'rpt-fa-linked-machines', type: 'item', label: 'FA-Linked Machines',
        icon: Boxes, moduleId: 'rpt-fa-linked-machines', requiredCards: ['production'] },
    ],
  },
];
