/**
 * @file        src/pages/erp/comply360/Comply360Page.tsx
 * @purpose     Comply360 main page · Shell pattern · 23 mega-menu router · Block 1 scaffolding
 * @sprint      Sprint 69 · T-Phase-5.A.1.1 · Block 1 · Q1 Card scaffolding
 * @decisions   D-250 Shell pattern · D-S69-1 100% native · D-S69-2 23 mega-menus · FR-74 'c *'
 * @iso         Usability + Maintainability
 */
import { useState } from 'react';
import { Shell } from '@/shell';
import { comply360ShellConfig } from '@/apps/erp/configs/comply360-shell-config';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import { ComingSoonPanel } from '@/components/fincore/ComingSoonPanel';
import HomePage from './home/HomePage';
import CalendarPage from './calendar/CalendarPage';
import StatutoryPaymentsPage from './payments/StatutoryPaymentsPage';
import TaxGstPage from './tax-gst/TaxGstPage';
import TdsPage from './tds/TdsPage';
import EInvoiceEWayPage from './exim/EInvoiceEWayPage';
import MSMEForm1Page from './vendor/MSMEForm1Page';
import Section393Page from './roc/Section393Page';
import ExternalAuditPage from './external-audit/ExternalAuditPage';
import LegalNoticesPage from './legal/LegalNoticesPage';
import CompaniesEntitiesPage from './companies/CompaniesEntitiesPage';
import EsgPage from './esg/EsgPage';
import ChallanVaultPage from './challan-vault/ChallanVaultPage';
import LicensesPage from './licenses/LicensesPage';
import LedgerPackPage from './fixed-assets/LedgerPackPage';
import StatutoryReturnsPage from './payroll/StatutoryReturnsPage';
import AuditFrameworkDashboardPage from './audit-framework/AuditFrameworkDashboardPage';
import Rule11gReportPage from './rule-11g/Rule11gReportPage';
import InternalAuditDashboardPage from './internal-audit/DashboardPage';
import WhistleblowerPage from './whistleblower/WhistleblowerPage';
import LabourCodesPage from './labour-codes/LabourCodesPage';
import POSHPage from './posh/POSHPage';
import GigWorkersPage from './gig-workers/GigWorkersPage';
import SectorNBFCPage from './sector-nbfc/SectorNBFCPage';
import SectorSEBIPage from './sector-sebi/SectorSEBIPage';
import SectorRERAPage from './sector-rera/SectorRERAPage';
import SectorFEMAPage from './sector-fema/SectorFEMAPage';
import AIControlCenterPage from './ai-control-center/AIControlCenterPage';
import CFOPitchDeckPage from './cfo-pitch-deck/CFOPitchDeckPage';
import FireSafetyDashboardPage from './fire-safety/FireSafetyDashboardPage';
import IndustrialSafetyDashboardPage from './industrial-safety/IndustrialSafetyDashboardPage';
import EnvironmentalDashboardPage from './environmental/EnvironmentalDashboardPage';
import WasteManagementDashboardPage from './waste-management/WasteManagementDashboardPage';
import { Comply360Breadcrumb } from './_shared/Comply360Breadcrumb';
import type { Comply360Module } from './Comply360Sidebar.types';

export default function Comply360Page(): JSX.Element {
  const [activeModule, setActiveModule] = useState<Comply360Module>('welcome');
  const { entitlements, profile } = useCardEntitlement();

  const renderModule = (): JSX.Element => {
    switch (activeModule) {
      case 'welcome':
      case 'home':
        return <HomePage onNavigate={setActiveModule} />;
      case 'calendar':
        return <CalendarPage />;
      case 'payments':
        return <StatutoryPaymentsPage />;
      case 'tax-gst':
        return <TaxGstPage />;
      case 'tds':
        return <TdsPage />;
      case 'exim':
        return <EInvoiceEWayPage />;
      case 'vendor':
        return <MSMEForm1Page />;
      case 'roc':
        return <Section393Page />;
      case 'whistleblower':
        return <WhistleblowerPage />;
      case 'labour-codes':
        return <LabourCodesPage />;
      case 'posh':
        return <POSHPage />;
      case 'gig-workers':
        return <GigWorkersPage />;
      case 'sector-nbfc':
        return <SectorNBFCPage />;
      case 'sector-sebi':
        return <SectorSEBIPage />;
      case 'sector-rera':
        return <SectorRERAPage />;
      case 'sector-fema':
        return <SectorFEMAPage />;
      case 'ai-control-center':
        return <AIControlCenterPage />;
      case 'cfo-pitch-deck':
        return <CFOPitchDeckPage />;
      case 'fire-safety':
        return <FireSafetyDashboardPage />;
      case 'industrial-safety':
        return <IndustrialSafetyDashboardPage />;
      case 'environmental':
        return <EnvironmentalDashboardPage />;
      case 'waste-management':
        return <WasteManagementDashboardPage />;
      case 'external-audit':
        return <ExternalAuditPage />;
      case 'legal':
        return <LegalNoticesPage />;
      case 'companies':
        return <CompaniesEntitiesPage />;
      case 'esg':
        return <EsgPage />;
      case 'challan-vault':
        return <ChallanVaultPage />;
      case 'licenses':
        return <LicensesPage />;
      case 'fixed-assets':
        return <LedgerPackPage />;
      case 'payroll':
        return <StatutoryReturnsPage />;
      case 'audit-framework':
        return <AuditFrameworkDashboardPage />;
      case 'rule-11g':
        return <Rule11gReportPage />;
      case 'internal-audit':
        return <InternalAuditDashboardPage />;
      // remaining mega-menus · modules light up in later sprints per Q-LOCK
      default:
        return <ComingSoonPanel module={`c360-${activeModule}`} />;
    }
  };

  return (
    <Shell
      config={comply360ShellConfig}
      userProfile={profile}
      tenantEntitlements={entitlements}
      breadcrumbs={[{ label: 'ERP', href: '/erp/dashboard' }, { label: 'Comply360' }]}
      onSidebarItemClick={(item) => {
        if (item.id) setActiveModule(item.id as Comply360Module);
      }}
    >
      <Comply360Breadcrumb activeModule={activeModule} onNavigate={setActiveModule} />
      {renderModule()}
    </Shell>
  );
}
