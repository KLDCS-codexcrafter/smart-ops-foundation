/**
 * @file        src/pages/erp/taskflow/TaskFlowPage.tsx
 * @purpose     TaskFlow main page · OWN Shell · sidebar router
 * @sprint      Sprint 137 · T-TaskFlow-A641.1 · Phase 8 OPENER · Block 3
 * @decisions   DP-D3-1 self-owned-shell · mirrors comply360/insightx pattern
 */
import { useState } from 'react';
import { Shell } from '@/shell';
import { taskflowShellConfig } from '@/apps/erp/configs/taskflow-shell-config';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import { ComingSoonPanel } from '@/components/fincore/ComingSoonPanel';
import TaskFlowLandingPage from './TaskFlowLandingPage';
import TaskFlowAllTasksPage from './TaskFlowAllTasksPage';
import type { TaskFlowModule } from './TaskFlowSidebar.types';

export default function TaskFlowPage(): JSX.Element {
  const [activeModule, setActiveModule] = useState<TaskFlowModule>('landing');
  const { entitlements, profile } = useCardEntitlement();

  const renderModule = (): JSX.Element => {
    switch (activeModule) {
      case 'landing':
        return <TaskFlowLandingPage />;
      case 'all-tasks':
        return <TaskFlowAllTasksPage filter="all" />;
      case 'my-tasks':
        return <TaskFlowAllTasksPage filter="my" />;
      case 'due-soon':
        return <TaskFlowAllTasksPage filter="due-soon" />;
      case 'completed':
        return <TaskFlowAllTasksPage filter="completed" />;
      default:
        return <ComingSoonPanel module={`taskflow-${activeModule}`} />;
    }
  };

  return (
    <Shell
      config={taskflowShellConfig}
      userProfile={profile}
      tenantEntitlements={entitlements}
      breadcrumbs={[{ label: 'ERP', href: '/erp/dashboard' }, { label: 'TaskFlow' }]}
      onSidebarItemClick={(item) => {
        if (item.id) setActiveModule(item.id as TaskFlowModule);
      }}
    >
      {renderModule()}
    </Shell>
  );
}
