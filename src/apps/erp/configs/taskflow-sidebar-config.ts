/**
 * @file        src/apps/erp/configs/taskflow-sidebar-config.ts
 * @purpose     TaskFlow sidebar config · MVP · type:'item' navigable
 * @sprint      Sprint 137 · T-TaskFlow-A641.1 · Phase 8 OPENER · Block 3
 * @decisions   DP-D3-1 self-owned-shell precedent (mirror comply360 pattern)
 *              FR-74 keyboard namespace 'k *' for TaskFlow
 */
import { Home, ListChecks, Clock, CheckSquare, Inbox } from 'lucide-react';
import type { SidebarItem } from '@/shell/types';

export const taskflowSidebarItems: SidebarItem[] = [
  { id: 'landing',     type: 'item', label: 'TaskFlow Home',  icon: Home,        keyboard: 'k h' },
  { id: 'all-tasks',   type: 'item', label: 'All Tasks',      icon: ListChecks,  keyboard: 'k a' },
  { id: 'my-tasks',    type: 'item', label: 'My Tasks',       icon: CheckSquare, keyboard: 'k m' },
  { id: 'due-soon',    type: 'item', label: 'Due Soon (24h)', icon: Clock,       keyboard: 'k d' },
  { id: 'completed',   type: 'item', label: 'Completed',      icon: Inbox,       keyboard: 'k c' },
];
