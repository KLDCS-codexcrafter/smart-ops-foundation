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
import type { TaskFlowModule } from './TaskFlowSidebar.types';

const VALID_MODULES: TaskFlowModule[] = [
  'landing', 'all-tasks', 'my-tasks', 'due-soon', 'completed',
  'approval-chains', 'sla-rules', 'escalations', 'blocked',
  'reminders', 'compliance-sources',
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
