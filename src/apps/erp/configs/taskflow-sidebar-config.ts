/**
 * @file        src/apps/erp/configs/taskflow-sidebar-config.ts
 * @purpose     TaskFlow sidebar config · MVP + Governance + Structure + OperixChat slices
 * @sprint      Sprint 140 · T-TaskFlow-A641.4 · OperixChat MVP adds Inbox · Channels + S142 coming-soon
 */
import {
  Home, ListChecks, Clock, CheckSquare, Inbox,
  GitBranch, Timer, AlertTriangle, ShieldOff, Bell, Link2,
  FileStack, Workflow, Gavel, BookOpen,
  MessageSquare, Hash, Mail, Mic,
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
  // ── OperixChat MVP (S140) ──────────────────────────────────────────
  { id: 'chat',               type: 'item', label: 'Chat Inbox',        icon: MessageSquare,  keyboard: 'k i' },
  { id: 'channels',           type: 'item', label: 'Channels',          icon: Hash,           keyboard: 'k l' },
  // ── S142 coming-soon ───────────────────────────────────────────────
  { id: 'email-threads',      type: 'item', label: 'Email Threads · S142', icon: Mail,        keyboard: 'k j' },
  { id: 'voice-library',      type: 'item', label: 'Voice Library · S142', icon: Mic,         keyboard: 'k v' },
];

