/**
 * ReceivXPage.tsx — Main ReceivX Hub container
 * Amber-500 accent. Mirrors SalesXPage pattern.
 */
import { useState, useEffect } from 'react';
import { useEntityList } from '@/hooks/useEntityList';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { ReceivXSidebar, type ReceivXModule } from './ReceivXSidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import { logAudit } from '@/lib/card-audit-engine';
import { recordActivity } from '@/lib/cross-card-activity-engine';
import { rememberModule } from '@/lib/breadcrumb-memory';
import { GuidedTourOverlay } from '@/components/layout/GuidedTourOverlay';
import { ReceivXHubPanel } from '@/pages/erp/receivx/ReceivXHub';
import { ReminderTemplateMasterPanel } from '@/pages/erp/receivx/masters/ReminderTemplateMaster';
import { CollectionExecMasterPanel } from '@/pages/erp/receivx/masters/CollectionExecMaster';
import { IncentiveSchemeMasterPanel } from '@/pages/erp/receivx/masters/IncentiveSchemeMaster';
import { ReceivXConfigPanel } from '@/pages/erp/receivx/masters/ReceivXConfig';
import { OutstandingTaskBoardPanel } from '@/pages/erp/receivx/transactions/OutstandingTaskBoard';
import { PTPTrackerPanel } from '@/pages/erp/receivx/transactions/PTPTracker';
import { ReminderConsolePanel } from '@/pages/erp/receivx/transactions/ReminderConsole';
import { PaymentLinksPanel } from '@/pages/erp/receivx/transactions/PaymentLinks';
import { DunningConsolePanel } from '@/pages/erp/receivx/transactions/DunningConsole';
import { AgingByPersonPanel } from '@/pages/erp/receivx/reports/AgingByPerson';
import { CollectionEfficiencyPanel } from '@/pages/erp/receivx/reports/CollectionEfficiency';
import { CommunicationLogReportPanel } from '@/pages/erp/receivx/reports/CommunicationLogReport';
import { CreditRiskReportPanel } from '@/pages/erp/receivx/reports/CreditRiskReport';

const breadcrumbLabels: Record<ReceivXModule, string> = {
  'rx-hub':                  'Hub Overview',
  'rx-m-reminder-template':  'Reminder Templates',
  'rx-m-collection-exec':    'Collection Executives',
  'rx-m-incentive-scheme':   'Incentive Schemes',
  'rx-m-config':             'ReceivX Configuration',
  'rx-t-task-board':         'Outstanding Tasks',
  'rx-t-ptp-tracker':        'Promise-to-Pay Tracker',
  'rx-t-reminder-console':   'Reminder Console',
  'rx-t-payment-links':      'Payment Links',
  'rx-t-dunning':            'Dunning Console',
  'rx-r-aging-salesman':     'Aging — Salesman',
  'rx-r-aging-agent':        'Aging — Agent',
  'rx-r-aging-broker':       'Aging — Broker',
  'rx-r-aging-telecaller':   'Aging — Telecaller',
  'rx-r-collection-eff':     'Collection Efficiency',
  'rx-r-comm-log':           'Communication Log',
  'rx-r-credit-risk':        'Credit Risk Report',
};

function renderModule(
  mod: ReceivXModule,
  entityCode: string,
  setActiveModule: (m: ReceivXModule) => void,
): React.ReactElement {
  const nav = (m: string) => setActiveModule(m as ReceivXModule);
  switch (mod) {
    case 'rx-hub':                  return <ReceivXHubPanel entityCode={entityCode} onNavigate={nav} />;
    case 'rx-m-reminder-template':  return <ReminderTemplateMasterPanel entityCode={entityCode} />;
    case 'rx-m-collection-exec':    return <CollectionExecMasterPanel entityCode={entityCode} />;
    case 'rx-m-incentive-scheme':   return <IncentiveSchemeMasterPanel entityCode={entityCode} />;
    case 'rx-m-config':             return <ReceivXConfigPanel entityCode={entityCode} />;
    case 'rx-t-task-board':         return <OutstandingTaskBoardPanel entityCode={entityCode} onNavigate={nav} />;
    case 'rx-t-ptp-tracker':        return <PTPTrackerPanel entityCode={entityCode} onNavigate={nav} />;
    case 'rx-t-reminder-console':   return <ReminderConsolePanel entityCode={entityCode} onNavigate={nav} />;
    case 'rx-t-payment-links':      return <PaymentLinksPanel entityCode={entityCode} />;
    case 'rx-t-dunning':            return <DunningConsolePanel entityCode={entityCode} />;
    case 'rx-r-aging-salesman':     return <AgingByPersonPanel entityCode={entityCode} personType="salesman" onNavigate={nav} />;
    case 'rx-r-aging-agent':        return <AgingByPersonPanel entityCode={entityCode} personType="agent" onNavigate={nav} />;
    case 'rx-r-aging-broker':       return <AgingByPersonPanel entityCode={entityCode} personType="broker" onNavigate={nav} />;
    case 'rx-r-aging-telecaller':   return <AgingByPersonPanel entityCode={entityCode} personType="telecaller" onNavigate={nav} />;
    case 'rx-r-collection-eff':     return <CollectionEfficiencyPanel entityCode={entityCode} />;
    case 'rx-r-comm-log':           return <CommunicationLogReportPanel entityCode={entityCode} />;
    case 'rx-r-credit-risk':        return <CreditRiskReportPanel entityCode={entityCode} />;
  }
}

export default function ReceivXPage() {
  const { entities, selectedEntityId, isMultiEntity } = useEntityList();
  const entityCode = selectedEntityId ?? 'SMRT';
  const [activeModule, setActiveModule] = useState<ReceivXModule>('rx-hub');
  const { entityCode: entCode, userId } = useCardEntitlement();

  useEffect(() => {
    logAudit({
      entityCode: entCode, userId, userName: userId,
      cardId: 'receivx',
      action: 'card_open',
    });
  }, [entCode, userId]);

  useEffect(() => {
    rememberModule('receivx', activeModule);
    logAudit({
      entityCode: entCode, userId, userName: userId,
      cardId: 'receivx',
      moduleId: activeModule,
      action: 'module_open',
    });
    recordActivity(entCode, userId, {
      card_id: 'receivx',
      kind: 'module',
      ref_id: activeModule,
      title: `ReceivX · ${activeModule}`,
      subtitle: null,
      deep_link: `/erp/receivx#${activeModule}`,
    });
  }, [activeModule, entCode, userId]);

  const crumbs = [
    { label: 'Operix Core', href: '/erp/dashboard' },
    { label: 'ReceivX Hub', href: '/erp/receivx' },
    { label: breadcrumbLabels[activeModule] },
  ];

  return (
    <>
      <GuidedTourOverlay cardId='receivx' />
      <SidebarProvider defaultOpen>
        <ReceivXSidebar
          activeModule={activeModule}
          onModuleChange={setActiveModule}
          entityCode={entityCode}
        />
        <SidebarInset>
          <ERPHeader
            breadcrumbs={crumbs}
            companies={entities}
            showDatePicker={false}
            showCompany={isMultiEntity}
          />
          <ScrollArea className="flex-1">
            <div className="p-6 max-w-7xl mx-auto">
              {renderModule(activeModule, entityCode, setActiveModule)}
            </div>
          </ScrollArea>
        </SidebarInset>
      </SidebarProvider>
    </>
  );
}

export function ReceivXPagePanel() { return <ReceivXPage />; }
