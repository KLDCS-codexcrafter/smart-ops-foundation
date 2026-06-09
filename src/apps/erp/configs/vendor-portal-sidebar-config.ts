/**
 * @file        src/apps/erp/configs/vendor-portal-sidebar-config.ts
 * @purpose     Sidebar data config for Vendor Portal (NEW tenant-internal vendor programme hub) · D-282-REV
 * @sprint      T-Phase-1.A.1-VendorPortal-Foundation · 6th FR-81 application
 * @decisions   D-NEW-DN · D-NEW-CC · D-250 · FR-81 · D-282-REV · D-NEW-DQ (Saathi)
 * Keyboard namespace: 'v *' prefix · Theme accent: 'slate'
 */
import {
  Home, Building2, FileSignature, UserPlus, ListChecks,
  BarChart3, Activity, Award,
  MessageSquare, Megaphone, Bot,
  AlertTriangle, MapPin, FileText, Wallet,
} from 'lucide-react';
import type { SidebarItem } from '@/shell/types';

export const vendorPortalSidebarItems: SidebarItem[] = [
  {
    id: 'welcome',
    type: 'item',
    label: 'Welcome',
    icon: Home,
    moduleId: 'welcome',
    requiredCards: ['vendor-portal'],
    keyboard: 'v w',
  },
  {
    id: 'vendor-management-group',
    type: 'group',
    label: 'Vendor Management',
    icon: Building2,
    collapsibleByDefault: false,
    children: [
      { id: 'vendor-master', type: 'item', label: 'Vendor Master', icon: Building2, moduleId: 'vendor-master', requiredCards: ['vendor-portal'], keyboard: 'v m' },
      { id: 'vendor-agreements', type: 'item', label: 'Vendor Agreements', icon: FileSignature, moduleId: 'vendor-agreements', requiredCards: ['vendor-portal'], keyboard: 'v a' },
      { id: 'vendor-onboarding-inbox', type: 'item', label: 'Onboarding Inbox', icon: UserPlus, moduleId: 'vendor-onboarding-inbox', requiredCards: ['vendor-portal'], keyboard: 'v o' },
      { id: 'vendor-categories', type: 'item', label: 'Vendor Categories', icon: ListChecks, moduleId: 'vendor-categories', requiredCards: ['vendor-portal'], keyboard: 'v g' },
    ],
  },
  {
    id: 'vendor-performance-group',
    type: 'group',
    label: 'Vendor Performance',
    icon: BarChart3,
    collapsibleByDefault: true,
    children: [
      { id: 'vendor-scoring', type: 'item', label: 'Scoring Dashboard', icon: Award, moduleId: 'vendor-scoring', requiredCards: ['vendor-portal'], keyboard: 'v s' },
      { id: 'vendor-activity-monitor', type: 'item', label: 'Activity Monitor', icon: Activity, moduleId: 'vendor-activity-monitor', requiredCards: ['vendor-portal'], keyboard: 'v t' },
      { id: 'msme-compliance', type: 'item', label: 'MSME-43BH Compliance', icon: AlertTriangle, moduleId: 'msme-compliance', requiredCards: ['vendor-portal'], keyboard: 'v p' },
    ],
  },
  {
    id: 'vendor-communications-group',
    type: 'group',
    label: 'Vendor Communications',
    icon: MessageSquare,
    collapsibleByDefault: true,
    children: [
      { id: 'vendor-communication-log', type: 'item', label: 'Communication Log', icon: MessageSquare, moduleId: 'vendor-communication-log', requiredCards: ['vendor-portal'], keyboard: 'v l' },
      { id: 'vendor-broadcast', type: 'item', label: 'Broadcast Console', icon: Megaphone, moduleId: 'vendor-broadcast', requiredCards: ['vendor-portal'], keyboard: 'v b' },
      { id: 'saathi-admin', type: 'item', label: 'Saathi · Vendor AI', icon: Bot, moduleId: 'saathi-admin', requiredCards: ['vendor-portal'], keyboard: 'v i' },
    ],
  },
];
