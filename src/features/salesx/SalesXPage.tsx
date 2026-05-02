/**
 * SalesXPage.tsx — Main SalesX Hub container
 * Mirrors PayHubPage.tsx. Orange-500 accent.
 */
import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useEntityList } from '@/hooks/useEntityList';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { SalesXSidebar } from './SalesXSidebar';
import type { SalesXModule } from './SalesXSidebar.types';
import {
  SALESX_GROUP_DEFAULT_MODULE, SALESX_GROUP_ORDER,
  SALESX_GROUP_LABELS, getModuleGroup,
} from './SalesXSidebar.groups';
import type { SalesXGroup } from './SalesXSidebar.groups';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
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
import { WebinarMasterPanel } from '@/pages/erp/salesx/transactions/WebinarMaster';
import { ExhibitionMasterPanel } from '@/pages/erp/salesx/transactions/ExhibitionMaster';
import { LeadAggregationHubPanel } from '@/pages/erp/salesx/transactions/LeadAggregationHub';
import { CallQualityHubPanel } from '@/pages/erp/salesx/transactions/CallQualityHub';
import { LeadDistributionHubPanel } from '@/pages/erp/salesx/transactions/LeadDistributionHub';
import { SmartInsightsPanelComponent } from '@/pages/erp/salesx/transactions/SmartInsightsPanel';
import { CampaignTemplatesPanelComponent } from '@/pages/erp/salesx/transactions/CampaignTemplatesPanel';
import { PITrackerPanelComponent } from '@/pages/erp/salesx/transactions/PITrackerPanel';
import { OrderDeskPanelComponent } from '@/pages/erp/salesx/transactions/OrderDeskPanel';
import { SalesReturnMemoPanel } from '@/pages/erp/salesx/transactions/SalesReturnMemo';
import { SalesReturnMemoRegisterPanel } from '@/pages/erp/salesx/reports/SalesReturnMemoRegister';
import { TerritoryMasterPanel } from '@/pages/erp/salesx/masters/TerritoryMaster';
import { BeatRouteMasterPanel } from '@/pages/erp/salesx/masters/BeatRouteMaster';
import { VisitTrackingPanel } from '@/pages/erp/salesx/transactions/VisitTracking';
import { SecondarySalesPanel } from '@/pages/erp/salesx/transactions/SecondarySales';
import { BeatProductivityReportPanel } from '@/pages/erp/salesx/reports/BeatProductivityReport';
import { CoverageReportPanel } from '@/pages/erp/salesx/reports/CoverageReport';
import { SecondarySalesReportPanel } from '@/pages/erp/salesx/reports/SecondarySalesReport';
import { CallLogHistoryReportPanel } from '@/pages/erp/salesx/reports/CallLogHistoryReport';
import { QuotationRegisterV2Panel } from '@/pages/erp/salesx/reports/QuotationRegisterV2';
import { SRMRegisterPanel } from '@/pages/erp/salesx/reports/SRMRegister';
import { InvoiceMemoRegisterPanel } from '@/pages/erp/salesx/reports/InvoiceMemoRegister';
import { SecondarySalesRegisterPanel } from '@/pages/erp/salesx/reports/SecondarySalesRegister';
import { SOMRegisterPanel } from '@/pages/erp/salesx/reports/SOMRegister';
import { DOMRegisterPanel } from '@/pages/erp/salesx/reports/DOMRegister';
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
  'sx-t-lead-agg':           'Lead Inbox',
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
  'sx-t-exhibition':           'Exhibition Manager',
  'sx-r-exhibition-report':    'Exhibition Report',
  'sx-t-webinar':              'Webinar Manager',
  'sx-r-webinar-report':       'Webinar Report',
  'sx-t-call-quality':         'Call Quality',
  'sx-t-lead-distribution':    'Lead Distribution',
  'sx-t-smart-insights':       'Smart Insights',
  'sx-t-campaign-templates':   'Campaign Templates',
  'sx-t-pi-tracker':           'PI Tracker',
  'sx-t-order-desk':           'Order Desk',
  'sx-r-call-log-history':     'Call Log History',
  'sx-r-quotation-v2':         'Quotation Register V2',
  'sx-r-srm-register':         'SRM Register',
  'sx-r-im-register':          'Invoice Memo Register',
  'sx-r-secondary-register':   'Secondary Sales Register',
  'sx-r-som-register':         'SOM Register',
  'sx-r-dom-register':         'DOM Register',
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
    case 'sx-t-lead-agg':
      return <LeadAggregationHubPanel entityCode={entityCode} />;
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
    case 'sx-t-exhibition':
    case 'sx-r-exhibition-report':
      return <ExhibitionMasterPanel entityCode={entityCode} />;
    case 'sx-t-webinar':
    case 'sx-r-webinar-report':
      return <WebinarMasterPanel entityCode={entityCode} />;
    case 'sx-t-call-quality':
      return <CallQualityHubPanel entityCode={entityCode} />;
    case 'sx-t-lead-distribution':
      return <LeadDistributionHubPanel entityCode={entityCode} />;
    case 'sx-t-smart-insights':
      return <SmartInsightsPanelComponent entityCode={entityCode} />;
    case 'sx-t-campaign-templates':
      return <CampaignTemplatesPanelComponent entityCode={entityCode} />;
    case 'sx-t-pi-tracker':
      return <PITrackerPanelComponent entityCode={entityCode} />;
    case 'sx-t-order-desk':
      return <OrderDeskPanelComponent entityCode={entityCode} />;
    case 'sx-r-call-log-history':
      return <CallLogHistoryReportPanel entityCode={entityCode} />;
    default:
      return <ComingSoonPanel module={mod} />;
  }
}

export default function SalesXPage() {
  const { entities, selectedEntityId, isMultiEntity } = useEntityList();
  const entityCode = selectedEntityId ?? DEFAULT_ENTITY_SHORTCODE;
  const [searchParams, setSearchParams] = useSearchParams();
  const moduleFromUrl = (searchParams.get('m') as SalesXModule | null) ?? 'sx-hub';
  const groupFromUrl = (searchParams.get('g') as SalesXGroup | null) ?? getModuleGroup(moduleFromUrl);

  const [activeModule, setActiveModuleState] = useState<SalesXModule>(moduleFromUrl);
  const [activeGroup, setActiveGroupState] = useState<SalesXGroup>(groupFromUrl);

  const setActiveModule = useCallback((m: SalesXModule) => {
    const g = getModuleGroup(m);
    setActiveModuleState(m);
    setActiveGroupState(g);
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('m', m);
      next.set('g', g);
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const setActiveGroup = useCallback((g: SalesXGroup) => {
    const defaultModule = SALESX_GROUP_DEFAULT_MODULE[g];
    setActiveGroupState(g);
    setActiveModuleState(defaultModule);
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('m', defaultModule);
      next.set('g', g);
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  useEffect(() => {
    const m = (searchParams.get('m') as SalesXModule | null) ?? 'sx-hub';
    const g = (searchParams.get('g') as SalesXGroup | null) ?? getModuleGroup(m);
    if (m !== activeModule) setActiveModuleState(m);
    if (g !== activeGroup) setActiveGroupState(g);
  }, [searchParams, activeModule, activeGroup]);
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
          activeGroup={activeGroup}
        />
        <SidebarInset>
          <ERPHeader
            breadcrumbs={crumbs}
            companies={entities}
            showDatePicker={false}
            showCompany={isMultiEntity}
          />
          <div className="border-b bg-muted/30">
            <div className="flex items-center gap-1 px-4 py-1 max-w-7xl">
              {SALESX_GROUP_ORDER.map(g => (
                <button
                  key={g}
                  onClick={() => setActiveGroup(g)}
                  className={cn(
                    'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
                    activeGroup === g
                      ? 'border-orange-500 text-orange-700'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-orange-300',
                  )}
                >
                  {SALESX_GROUP_LABELS[g]}
                </button>
              ))}
            </div>
          </div>
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
