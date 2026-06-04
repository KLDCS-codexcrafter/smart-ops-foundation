/**
 * @file        src/apps/erp/configs/taskflow-sidebar-config.ts
 * @purpose     TaskFlow sidebar config · MVP + Governance + Structure slices · type:'item' navigable
 * @sprint      Sprint 139 · T-TaskFlow-A641.3 · Structure Slice · adds templates/workflows/decisions/minutes
 */
import {
  Home, ListChecks, Clock, CheckSquare, Inbox,
  GitBranch, Timer, AlertTriangle, ShieldOff, Bell, Link2,
  FileStack, Workflow, Gavel, BookOpen,
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
  // ── Structure Slice (S139) ─────────────────────────────────────────
  { id: 'templates',          type: 'item', label: 'Templates',         icon: FileStack,      keyboard: 'k t' },
  { id: 'workflows',          type: 'item', label: 'Workflows',         icon: Workflow,       keyboard: 'k w' },
  { id: 'decisions',          type: 'item', label: 'Decisions',         icon: Gavel,          keyboard: 'k x' },
  { id: 'minutes',            type: 'item', label: 'Meeting Minutes',   icon: BookOpen,       keyboard: 'k n' },
];
