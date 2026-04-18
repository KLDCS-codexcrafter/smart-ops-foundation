/**
 * SalesXPage.tsx — Main SalesX Hub container
 * Mirrors PayHubPage.tsx. Orange-500 accent.
 */
import { useState } from 'react';
import { useEntityList } from '@/hooks/useEntityList';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { SalesXSidebar, type SalesXModule } from './SalesXSidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SalesXHubPanel } from '@/pages/erp/salesx/SalesXHub';
import { HierarchyMasterPanel } from '@/pages/erp/salesx/masters/HierarchyMaster';
import { SAMPersonMasterPanel } from '@/pages/erp/salesx/masters/SAMPersonMaster';
import { EnquirySourceMasterPanel } from '@/pages/erp/salesx/masters/EnquirySourceMaster';
import { CampaignMasterPanel } from '@/pages/erp/salesx/masters/CampaignMaster';
import { EnquiryCapturePanel } from '@/pages/erp/salesx/transactions/EnquiryCapture';
import { CRMPipelinePanel } from '@/pages/erp/salesx/transactions/CRMPipeline';
import { TelecallerPanel } from '@/pages/erp/salesx/transactions/Telecaller';
import { QuotationEntryPanel } from '@/pages/erp/salesx/transactions/QuotationEntry';
import { CommissionRegisterPanel } from '@/pages/erp/salesx/reports/CommissionRegister';
import { EnquiryRegisterReportPanel } from '@/pages/erp/salesx/reports/EnquiryRegisterReport';
import { PipelineSummaryPanel } from '@/pages/erp/salesx/reports/PipelineSummary';
import { QuotationRegisterReportPanel } from '@/pages/erp/salesx/reports/QuotationRegisterReport';
import { TargetMasterPanel } from '@/pages/erp/salesx/masters/TargetMaster';
import { TargetVsAchievementPanel } from '@/pages/erp/salesx/reports/TargetVsAchievement';
import { FollowUpRegisterReportPanel } from '@/pages/erp/salesx/reports/FollowUpRegisterReport';

const breadcrumbLabels: Record<SalesXModule, string> = {
  'sx-hub':                  'Hub Overview',
  'sx-m-hierarchy':          'Hierarchy Master',
  'sx-m-salesman':           'Salesman Master',
  'sx-m-agent':              'Agent Master',
  'sx-m-broker':             'Broker Master',
  'sx-m-receiver':           'Receiver Master',
  'sx-m-reference':          'Reference Master',
  'sx-m-enquiry-source':     'Enquiry Source Master',
  'sx-m-campaign':           'Campaign Master',
  'sx-t-enquiry':            'Enquiry',
  'sx-t-pipeline':           'CRM Pipeline',
  'sx-t-telecaller':         'Telecaller',
  'sx-t-quotation':          'Quotation',
  'sx-r-commission':         'Commission Register',
  'sx-r-enquiry-register':   'Enquiry Register Report',
  'sx-r-pipeline-summary':   'Pipeline Summary',
  'sx-r-quotation-register': 'Quotation Register Report',
};

function ComingSoonPanel({ module }: { module: SalesXModule }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
      <p className="text-lg font-semibold">Coming Soon</p>
      <p className="text-sm mt-1">{breadcrumbLabels[module]} — Sprint 2</p>
    </div>
  );
}

function renderModule(
  mod: SalesXModule,
  entityCode: string,
  setActiveModule: (m: SalesXModule) => void,
): React.ReactElement {
  switch (mod) {
    case 'sx-hub':
      return (
        <SalesXHubPanel
          entityCode={entityCode}
          onNavigate={(m) => setActiveModule(m as SalesXModule)}
        />
      );
    case 'sx-m-hierarchy':
      return <HierarchyMasterPanel entityCode={entityCode} />;
    case 'sx-m-salesman':
      return <SAMPersonMasterPanel personType="salesman" entityCode={entityCode} />;
    case 'sx-m-agent':
      return <SAMPersonMasterPanel personType="agent" entityCode={entityCode} />;
    case 'sx-m-broker':
      return <SAMPersonMasterPanel personType="broker" entityCode={entityCode} />;
    case 'sx-m-receiver':
      return <SAMPersonMasterPanel personType="receiver" entityCode={entityCode} />;
    case 'sx-m-reference':
      return <SAMPersonMasterPanel personType="reference" entityCode={entityCode} />;
    case 'sx-m-enquiry-source':
      return <EnquirySourceMasterPanel entityCode={entityCode} />;
    case 'sx-m-campaign':
      return <CampaignMasterPanel entityCode={entityCode} />;
    case 'sx-t-enquiry':
      return <EnquiryCapturePanel entityCode={entityCode} />;
    case 'sx-t-pipeline':
      return <CRMPipelinePanel entityCode={entityCode} />;
    case 'sx-t-telecaller':
      return <TelecallerPanel entityCode={entityCode} onNavigate={setActiveModule} />;
    case 'sx-t-quotation':
      return <QuotationEntryPanel entityCode={entityCode} />;
    case 'sx-r-commission':
      return <CommissionRegisterPanel entityCode={entityCode} />;
    case 'sx-r-enquiry-register':
      return <EnquiryRegisterReportPanel entityCode={entityCode} />;
    case 'sx-r-pipeline-summary':
      return <PipelineSummaryPanel entityCode={entityCode} />;
    case 'sx-r-quotation-register':
      return <QuotationRegisterReportPanel entityCode={entityCode} />;
    default:
      return <ComingSoonPanel module={mod} />;
  }
}

export default function SalesXPage() {
  const { entities, selectedEntityId, isMultiEntity } = useEntityList();
  const entityCode = selectedEntityId ?? 'SMRT';
  const [activeModule, setActiveModule] = useState<SalesXModule>('sx-hub');

  const crumbs = [
    { label: 'Operix Core', href: '/erp/dashboard' },
    { label: 'SalesX Hub', href: '/erp/salesx' },
    { label: breadcrumbLabels[activeModule] },
  ];

  return (
    <SidebarProvider defaultOpen>
      <SalesXSidebar
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
  );
}

export function SalesXPagePanel() { return <SalesXPage />; }
