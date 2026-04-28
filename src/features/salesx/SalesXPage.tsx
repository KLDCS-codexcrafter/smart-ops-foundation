/**
 * SalesXPage.tsx — Main SalesX Hub container
 * Mirrors PayHubPage.tsx. Orange-500 accent.
 */
import { useState, useEffect } from 'react';
import { useEntityList } from '@/hooks/useEntityList';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { SalesXSidebar } from './SalesXSidebar';
import type { SalesXModule } from './SalesXSidebar.types';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import { logAudit } from '@/lib/card-audit-engine';
import { recordActivity } from '@/lib/cross-card-activity-engine';
import { rememberModule } from '@/lib/breadcrumb-memory';
import { GuidedTourOverlay } from '@/components/layout/GuidedTourOverlay';
import { SalesXHubPanel } from '@/pages/erp/salesx/SalesXHub';
import { HierarchyMasterPanel } from '@/pages/erp/salesx/masters/HierarchyMaster';
import { SAMPersonMasterPanel } from '@/pages/erp/salesx/masters/SAMPersonMaster';
import { EnquirySourceMasterPanel } from '@/pages/erp/salesx/masters/EnquirySourceMaster';
import { CampaignMasterPanel } from '@/pages/erp/salesx/masters/CampaignMaster';
import { EnquiryCapturePanel } from '@/pages/erp/salesx/transactions/EnquiryCapture';
import { CRMPipelinePanel } from '@/pages/erp/salesx/transactions/CRMPipeline';
import { TelecallerPanel } from '@/pages/erp/salesx/transactions/Telecaller';
import { QuotationEntryPanel } from '@/pages/erp/salesx/transactions/QuotationEntry';
import { SupplyRequestMemoPanel } from '@/pages/erp/salesx/transactions/SupplyRequestMemo';
import { InvoiceMemoPanel } from '@/pages/erp/salesx/transactions/InvoiceMemo';
import { SampleOutwardMemoPanel } from '@/pages/erp/salesx/transactions/SampleOutwardMemo';
import { DemoOutwardMemoPanel } from '@/pages/erp/salesx/transactions/DemoOutwardMemo';
import { CommissionRegisterPanel } from '@/pages/erp/salesx/reports/CommissionRegister';
import { EnquiryRegisterReportPanel } from '@/pages/erp/salesx/reports/EnquiryRegisterReport';
import { PipelineSummaryPanel } from '@/pages/erp/salesx/reports/PipelineSummary';
import { QuotationRegisterReportPanel } from '@/pages/erp/salesx/reports/QuotationRegisterReport';
import { TargetMasterPanel } from '@/pages/erp/salesx/masters/TargetMaster';
import { TargetVsAchievementPanel } from '@/pages/erp/salesx/reports/TargetVsAchievement';
import { FollowUpRegisterReportPanel } from '@/pages/erp/salesx/reports/FollowUpRegisterReport';
import { SalesXAnalyticsPanel } from '@/pages/erp/salesx/SalesXAnalytics';
import { SalesOrderTrackerReportPanel } from '@/pages/erp/salesx/reports/SalesOrderTrackerReport';
import { CrossDeptHandoffTrackerPanel } from '@/pages/erp/salesx/reports/CrossDeptHandoffTracker';
import { CampaignPerformanceReportPanel } from '@/pages/erp/salesx/reports/CampaignPerformanceReport';
import { SalesReturnMemoPanel } from '@/pages/erp/salesx/transactions/SalesReturnMemo';
import { SalesReturnMemoRegisterPanel } from '@/pages/erp/salesx/reports/SalesReturnMemoRegister';
import { TerritoryMasterPanel } from '@/pages/erp/salesx/masters/TerritoryMaster';
import { BeatRouteMasterPanel } from '@/pages/erp/salesx/masters/BeatRouteMaster';
import { VisitTrackingPanel } from '@/pages/erp/salesx/transactions/VisitTracking';
import { SecondarySalesPanel } from '@/pages/erp/salesx/transactions/SecondarySales';
import { BeatProductivityReportPanel } from '@/pages/erp/salesx/reports/BeatProductivityReport';
import { CoverageReportPanel } from '@/pages/erp/salesx/reports/CoverageReport';
import { SecondarySalesReportPanel } from '@/pages/erp/salesx/reports/SecondarySalesReport';
import { DEFAULT_ENTITY_SHORTCODE } from '@/lib/default-entity';

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
  'sx-m-territory':          'Territory Master',
  'sx-m-beat':               'Beat Routes',
  'sx-t-enquiry':            'Enquiry',
  'sx-t-pipeline':           'CRM Pipeline',
  'sx-t-telecaller':         'Telecaller',
  'sx-t-quotation':          'Quotation',
  'sx-t-supply-memo':        'Supply Request Memo',
  'sx-t-invoice-memo':       'Invoice Memo',
  'sx-t-sample-outward':     'Sample Outward Memo',
  'sx-t-demo-outward':       'Demo Outward Memo',
  'sx-t-return-memo':        'Sales Return Memo',
  'sx-t-visit':              'Visit Tracking',
  'sx-t-secondary':          'Secondary Sales',
  'sx-r-commission':         'Commission Register',
  'sx-r-enquiry-register':   'Enquiry Register Report',
  'sx-r-pipeline-summary':   'Pipeline Summary',
  'sx-r-quotation-register': 'Quotation Register Report',
  'sx-r-return-memo-register': 'Return Memo Register',
  'sx-r-beat-productivity':  'Beat Productivity Report',
  'sx-r-coverage':           'Coverage Report',
  'sx-r-secondary-sales':    'Secondary Sales Report',
  'sx-m-target':             'Target Master',
  'sx-r-followup':           'Follow-Up Register',
  'sx-r-target':             'Target vs Achievement',
  'sx-analytics':            'SalesX Analytics',
  'sx-r-so-tracker':         'Sales Order Tracker',
  'sx-r-handoff-tracker':    'Cross-Dept Handoff Tracker',
  'sx-r-campaign-performance': 'Campaign Performance',
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
      return <TelecallerPanel entityCode={entityCode} onNavigate={(m) => setActiveModule(m as SalesXModule)} />;
    case 'sx-t-quotation':
      return <QuotationEntryPanel entityCode={entityCode} />;
    case 'sx-t-supply-memo':
      return <SupplyRequestMemoPanel entityCode={entityCode} />;
    case 'sx-t-invoice-memo':
      return <InvoiceMemoPanel entityCode={entityCode} />;
    case 'sx-t-sample-outward':
      return <SampleOutwardMemoPanel entityCode={entityCode} />;
    case 'sx-t-demo-outward':
      return <DemoOutwardMemoPanel entityCode={entityCode} />;
    case 'sx-t-return-memo':
      return <SalesReturnMemoPanel entityCode={entityCode} />;
    case 'sx-r-return-memo-register':
      return <SalesReturnMemoRegisterPanel entityCode={entityCode} />;
    case 'sx-m-territory':
      return <TerritoryMasterPanel entityCode={entityCode} />;
    case 'sx-m-beat':
      return <BeatRouteMasterPanel entityCode={entityCode} />;
    case 'sx-t-visit':
      return <VisitTrackingPanel entityCode={entityCode} />;
    case 'sx-t-secondary':
      return <SecondarySalesPanel entityCode={entityCode} />;
    case 'sx-r-beat-productivity':
      return <BeatProductivityReportPanel entityCode={entityCode} />;
    case 'sx-r-coverage':
      return <CoverageReportPanel entityCode={entityCode} />;
    case 'sx-r-secondary-sales':
      return <SecondarySalesReportPanel entityCode={entityCode} />;
    case 'sx-r-commission':
      return <CommissionRegisterPanel entityCode={entityCode} />;
    case 'sx-r-enquiry-register':
      return <EnquiryRegisterReportPanel entityCode={entityCode} />;
    case 'sx-r-pipeline-summary':
      return <PipelineSummaryPanel entityCode={entityCode} />;
    case 'sx-r-quotation-register':
      return <QuotationRegisterReportPanel entityCode={entityCode} />;
    case 'sx-m-target':
      return <TargetMasterPanel entityCode={entityCode} />;
    case 'sx-r-followup':
      return <FollowUpRegisterReportPanel entityCode={entityCode}
        onNavigate={m => setActiveModule(m as SalesXModule)} />;
    case 'sx-r-target':
      return <TargetVsAchievementPanel entityCode={entityCode} />;
    case 'sx-analytics':
      return <SalesXAnalyticsPanel entityCode={entityCode}
        onNavigate={m => setActiveModule(m as SalesXModule)} />;
    case 'sx-r-so-tracker':
      return <SalesOrderTrackerReportPanel entityCode={entityCode}
        onNavigate={m => setActiveModule(m as SalesXModule)} />;
    case 'sx-r-handoff-tracker':
      return <CrossDeptHandoffTrackerPanel entityCode={entityCode} />;
    case 'sx-r-campaign-performance':
      return <CampaignPerformanceReportPanel entityCode={entityCode} />;
    default:
      return <ComingSoonPanel module={mod} />;
  }
}

export default function SalesXPage() {
  const { entities, selectedEntityId, isMultiEntity } = useEntityList();
  const entityCode = selectedEntityId ?? DEFAULT_ENTITY_SHORTCODE;
  const [activeModule, setActiveModule] = useState<SalesXModule>('sx-hub');
  const { entityCode: entCode, userId } = useCardEntitlement();

  useEffect(() => {
    logAudit({
      entityCode: entCode, userId, userName: userId,
      cardId: 'salesx',
      action: 'card_open',
    });
  }, [entCode, userId]);

  useEffect(() => {
    rememberModule('salesx', activeModule);
    logAudit({
      entityCode: entCode, userId, userName: userId,
      cardId: 'salesx',
      moduleId: activeModule,
      action: 'module_open',
    });
    recordActivity(entCode, userId, {
      card_id: 'salesx',
      kind: 'module',
      ref_id: activeModule,
      title: `SalesX · ${activeModule}`,
      subtitle: null,
      deep_link: `/erp/salesx#${activeModule}`,
    });
  }, [activeModule, entCode, userId]);

  const crumbs = [
    { label: 'Operix Core', href: '/erp/dashboard' },
    { label: 'SalesX Hub', href: '/erp/salesx' },
    { label: breadcrumbLabels[activeModule] },
  ];

  return (
    <>
      <GuidedTourOverlay cardId='salesx' />
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
    </>
  );
}

export function SalesXPagePanel() { return <SalesXPage />; }
