/**
 * Procure360Page.tsx — Sprint T-Phase-1.2.6f-a · Shell Day 1 (D-250)
 */
import { useState } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { Procure360Sidebar } from './Procure360Sidebar';
import {
  Procure360Welcome, ProcurementEnquiryEntryPanel, EnquiryListPanel,
  RfqListPanel, QuotationComparisonPanel, AwardHistoryPanel,
  RfqRegisterReportPanel, PendingRfqReportPanel, ComparisonReportPanel,
  AwardHistoryReportPanel, VendorPerfReportPanel, BestPriceReportPanel,
  SpendByVendorReportPanel, RfqFollowupRegisterReportPanel,
  CrossDeptHandoffPanel, VendorScoringDashboardPanel,
  // Sprint T-Phase-1.2.6f-c-1 · Block G
  PoListPanel, PoFollowupRegisterPanel,
  GitInTransitPanel, GitReceivedPanel, AgedGitProcurePanel,
  // Sprint T-Phase-1.2.6f-c-2 · Block E
  BillPassingPiStatusPanel,
} from './panels';
import type { Procure360Module } from './Procure360Sidebar.types';

export default function Procure360Page(): JSX.Element {
  const [active, setActive] = useState<Procure360Module>('welcome');

  const render = (): JSX.Element => {
    switch (active) {
      case 'welcome':                       return <Procure360Welcome onNavigate={setActive} />;
      case 'enquiry-entry':                 return <ProcurementEnquiryEntryPanel />;
      case 'enquiry-list':                  return <EnquiryListPanel />;
      case 'rfq-list':                      return <RfqListPanel />;
      case 'quotation-comparison':          return <QuotationComparisonPanel />;
      case 'award-history':                 return <AwardHistoryPanel />;
      case 'rfq-register-report':           return <RfqRegisterReportPanel />;
      case 'pending-rfq-report':            return <PendingRfqReportPanel />;
      case 'comparison-report':             return <ComparisonReportPanel />;
      case 'award-history-report':          return <AwardHistoryReportPanel />;
      case 'vendor-perf-report':            return <VendorPerfReportPanel />;
      case 'best-price-report':             return <BestPriceReportPanel />;
      case 'spend-by-vendor-report':        return <SpendByVendorReportPanel />;
      case 'rfq-followup-register-report':  return <RfqFollowupRegisterReportPanel />;
      case 'cross-dept-procurement-handoff': return <CrossDeptHandoffPanel />;
      case 'vendor-scoring-dashboard':      return <VendorScoringDashboardPanel />;
      // Sprint T-Phase-1.2.6f-c-1 · Block G
      case 'po-list':                       return <PoListPanel />;
      case 'po-followup-register':          return <PoFollowupRegisterPanel />;
      case 'git-in-transit':                return <GitInTransitPanel />;
      case 'git-received':                  return <GitReceivedPanel />;
      case 'aged-git-procure':              return <AgedGitProcurePanel />;
      default:                              return <div className="p-6 text-sm text-muted-foreground">Module not found.</div>;
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex flex-col w-full bg-background">
        <ERPHeader />
        <div className="flex-1 flex w-full overflow-hidden">
          <Procure360Sidebar active={active} onNavigate={setActive} />
          <main className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">{render()}</ScrollArea>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
