/**
 * @file        src/apps/erp/configs/taskflow-sidebar-config.ts
 * @purpose     TaskFlow sidebar config · MVP + Governance Slice · type:'item' navigable
 * @sprint      Sprint 138 · T-TaskFlow-A641.2 · Pillar A.6.4 · TaskFlow Arc · Governance Slice
 * @decisions   DP-D3-1 self-owned-shell precedent (mirror comply360 pattern)
 *              FR-74 keyboard namespace 'k *' for TaskFlow
 *              S138 adds: approval-chains · sla-rules · escalations ·
 *              blocked · reminders · compliance-sources
 */
import {
  Home, ListChecks, Clock, CheckSquare, Inbox,
  GitBranch, Timer, AlertTriangle, ShieldOff, Bell, Link2,
} from 'lucide-react';
import type { SidebarItem } from '@/shell/types';

export const taskflowSidebarItems: SidebarItem[] = [
  { id: 'landing',            type: 'item', label: 'TaskFlow Home',     icon: Home,           keyboard: 'k h' },
  { id: 'all-tasks',          type: 'item', label: 'All Tasks',         icon: ListChecks,     keyboard: 'k a' },
  { id: 'my-tasks',           type: 'item', label: 'My Tasks',          icon: CheckSquare,    keyboard: 'k m' },
  { id: 'due-soon',           type: 'item', label: 'Due Soon (24h)',    icon: Clock,          keyboard: 'k d' },
  { id: 'completed',          type: 'item', label: 'Completed',         icon: Inbox,          keyboard: 'k c' },
  // ── Governance Slice (S138) ────────────────────────────────────────
  { id: 'approval-chains',    type: 'item', label: 'Approval Chains',   icon: GitBranch,      keyboard: 'k p' },
  { id: 'sla-rules',          type: 'item', label: 'SLA Rules',         icon: Timer,          keyboard: 'k s' },
  { id: 'escalations',        type: 'item', label: 'Escalations',       icon: AlertTriangle,  keyboard: 'k e' },
  { id: 'blocked',            type: 'item', label: 'Blocked',           icon: ShieldOff,      keyboard: 'k b' },
  { id: 'reminders',          type: 'item', label: 'Reminders',         icon: Bell,           keyboard: 'k r' },
  { id: 'compliance-sources', type: 'item', label: 'Compliance Bridge', icon: Link2,          keyboard: 'k g' },
];
