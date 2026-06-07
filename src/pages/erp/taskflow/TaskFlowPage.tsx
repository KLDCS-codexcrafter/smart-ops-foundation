/**
 * @file        src/pages/erp/taskflow/TaskFlowPage.tsx
 * @purpose     TaskFlow main page · OWN Shell · sidebar router (S138 expanded)
 * @sprint      Sprint 138 · T-TaskFlow-A641.2 · Pillar A.6.4 · Governance Slice · Block 4
 * @decisions   DP-D3-1 self-owned-shell · mirrors comply360/insightx pattern.
 *              S138 routes: approval-chains · sla-rules · escalations · blocked ·
 *              reminders · compliance-sources. All live; no ComingSoonPanel fallthrough
 *              except for unknown modules.
 */
import { useEffect, useState } from 'react';
import { Shell } from '@/shell';
import { taskflowShellConfig } from '@/apps/erp/configs/taskflow-shell-config';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import { ComingSoonPanel } from '@/components/fincore/ComingSoonPanel';
import TaskFlowLandingPage from './TaskFlowLandingPage';
import TaskFlowAllTasksPage from './TaskFlowAllTasksPage';
import SLAManagementPage from './SLAManagementPage';
import EscalationsPage from './EscalationsPage';
import ApprovalChainsPage from './ApprovalChainsPage';
import BlockedListPage from './BlockedListPage';
import RemindersPage from './RemindersPage';
import ComplianceSourcesPage from './ComplianceSourcesPage';
import TemplatesPage from './TemplatesPage';
import WorkflowsPage from './WorkflowsPage';
import DecisionsPage from './DecisionsPage';
import MeetingMinutesPage from './MeetingMinutesPage';
import OperixChatInboxPage from './OperixChatInboxPage';
import OperixChatChannelsPage from './OperixChatChannelsPage';
import AccountabilityDashboardPage from './AccountabilityDashboardPage';
import ClosePoliciesPage from './ClosePoliciesPage';
import WorkDiaryPage from './WorkDiaryPage';
import ExpenseCenterPage from './ExpenseCenterPage';
import MediaVaultPage from './MediaVaultPage';
import FollowUpsPage from './FollowUpsPage';
import ChatGovernancePage from './ChatGovernancePage';
import HandoverPage from './HandoverPage';
import ApprovalsInboxPage from './ApprovalsInboxPage';
import MyRemindersPage from './MyRemindersPage';
import type { TaskFlowModule } from './TaskFlowSidebar.types';

const VALID_MODULES: TaskFlowModule[] = [
  'landing', 'all-tasks', 'my-tasks', 'due-soon', 'completed',
  'approval-chains', 'sla-rules', 'escalations', 'blocked',
  'reminders', 'compliance-sources',
  'templates', 'workflows', 'decisions', 'minutes',
  'chat', 'channels', 'email-threads',
  'media-vault', 'follow-ups', 'chat-governance', 'handover',
  'accountability', 'close-policies', 'work-diary',
  'expense-center',
  'approvals-inbox',
  'my-reminders',
];

export default function TaskFlowPage(): JSX.Element {
  const [activeModule, setActiveModule] = useState<TaskFlowModule>(() => {
    const h = typeof window !== 'undefined' ? window.location.hash.replace(/^#/, '') : '';
    return (VALID_MODULES as string[]).includes(h) ? (h as TaskFlowModule) : 'landing';
  });
  const { entitlements, profile } = useCardEntitlement();

  // Sync hash → state (D-HASH-NAV)
  useEffect(() => {
    const onHash = (): void => {
      const h = window.location.hash.replace(/^#/, '');
      if ((VALID_MODULES as string[]).includes(h)) setActiveModule(h as TaskFlowModule);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const renderModule = (): JSX.Element => {
    switch (activeModule) {
      case 'landing':            return <TaskFlowLandingPage />;
      case 'all-tasks':          return <TaskFlowAllTasksPage filter="all" />;
      case 'my-tasks':           return <TaskFlowAllTasksPage filter="my" />;
      case 'due-soon':           return <TaskFlowAllTasksPage filter="due-soon" />;
      case 'completed':          return <TaskFlowAllTasksPage filter="completed" />;
      case 'approval-chains':    return <ApprovalChainsPage />;
      case 'sla-rules':          return <SLAManagementPage />;
      case 'escalations':        return <EscalationsPage />;
      case 'blocked':            return <BlockedListPage />;
      case 'reminders':          return <RemindersPage />;
      case 'compliance-sources': return <ComplianceSourcesPage />;
      case 'templates':          return <TemplatesPage />;
      case 'workflows':          return <WorkflowsPage />;
      case 'decisions':          return <DecisionsPage />;
      case 'minutes':            return <MeetingMinutesPage />;
      case 'chat':               return <OperixChatInboxPage />;
      case 'channels':           return <OperixChatChannelsPage />;
      case 'email-threads':      return <ComingSoonPanel module="operixchat-email-threads-p2bb" />;
      case 'media-vault':        return <MediaVaultPage />;
      case 'follow-ups':         return <FollowUpsPage />;
      case 'chat-governance':    return <ChatGovernancePage />;
      case 'handover':           return <HandoverPage />;
      case 'accountability':     return <AccountabilityDashboardPage />;
      case 'close-policies':     return <ClosePoliciesPage />;
      case 'work-diary':         return <WorkDiaryPage />;
      case 'expense-center':     return <ExpenseCenterPage />;
      case 'approvals-inbox':    return <ApprovalsInboxPage />;
      default:                   return <ComingSoonPanel module={`taskflow-${activeModule}`} />;
    }
  };

  return (
    <Shell
      config={taskflowShellConfig}
      userProfile={profile}
      tenantEntitlements={entitlements}
      breadcrumbs={[{ label: 'ERP', href: '/erp/dashboard' }, { label: 'TaskFlow' }]}
      onSidebarItemClick={(item) => {
        if (item.id) {
          setActiveModule(item.id as TaskFlowModule);
          if (typeof window !== 'undefined') {
            window.location.hash = item.id;
          }
        }
      }}
    >
      {renderModule()}
    </Shell>
  );
}
