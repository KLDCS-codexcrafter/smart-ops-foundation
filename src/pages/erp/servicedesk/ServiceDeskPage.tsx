/**
 * @file        src/pages/erp/servicedesk/ServiceDeskPage.tsx
 * @purpose     ServiceDesk main page · Shell pattern · 12th card · activeModule switch · EXTENDED at C.1b
 * @sprint      T-Phase-1.C.1a · Block F.1 · v2 spec · EXTENDED at C.1b
 * @decisions   D-250 Shell pattern · FR-58 · D-NEW-CC 'd *' (FR-74) · D-NEW-CT 12th card seeded
 * @iso        Usability
 */
import { useState } from 'react';
import { Shell } from '@/shell';
import { servicedeskShellConfig } from '@/apps/erp/configs/servicedesk-shell-config';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import type { ServiceDeskModule } from './ServiceDeskSidebar.types';
import { ServiceDeskWelcome } from './ServiceDeskWelcome';
import { AMCApplicabilityDecision } from './amc-pipeline/AMCApplicabilityDecision';
import { AMCProposalList } from './amc-pipeline/AMCProposalList';
import { AMCProposalDetail } from './amc-pipeline/AMCProposalDetail';
import { AMCActiveList } from './amc-pipeline/AMCActiveList';
import { AMCExpiringList } from './amc-pipeline/AMCExpiringList';
import { AMCLapsedList } from './amc-pipeline/AMCLapsedList';
import { InstallationVerificationList } from './installation-verification/InstallationVerificationList';
import { InstallationVerificationDetail } from './installation-verification/InstallationVerificationDetail';
import { AMCRenewalForecast } from './reports/AMCRenewalForecast';
import { RiskEngineSettings } from './settings/RiskEngineSettings';
import { RenewalCascadeSettings } from './settings/RenewalCascadeSettings';
import { ServiceTicketInbox } from './service-tickets/ServiceTicketInbox';
import { ServiceTicketDetail } from './service-tickets/ServiceTicketDetail';
import { ServiceTicketRaise } from './service-tickets/ServiceTicketRaise';
import { RepairRouteList } from './repair-routing/RepairRouteList';
import { SparesIssuedFromField } from './repair-routing/SparesIssuedFromField';
import { StandbyLoanList } from './standby-loans/StandbyLoanList';
import { SLAMatrixSettings } from './settings/SLAMatrixSettings';
import { EscalationTreeSettings } from './settings/EscalationTreeSettings';
import { SLAPerformance } from './reports/SLAPerformance';
import { CSATHappyCode } from './reports/CSATHappyCode';
import { ServiceDayBook } from './reports/ServiceDayBook';
import { OEMClaimList } from './oem-claims/OEMClaimList';
import { OEMClaimDetail } from './oem-claims/OEMClaimDetail';

export default function ServiceDeskPage(): JSX.Element {
  const [activeModule, setActiveModule] = useState<ServiceDeskModule>('welcome');
  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(null);
  const [selectedIVId, setSelectedIVId] = useState<string | null>(null);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [selectedOEMClaimId, setSelectedOEMClaimId] = useState<string | null>(null);
  const [autoOpenOTP, setAutoOpenOTP] = useState(false);
  const { entitlements, profile } = useCardEntitlement();

  const renderModule = (): JSX.Element => {
    switch (activeModule) {
      case 'welcome':
        return <ServiceDeskWelcome onNavigate={setActiveModule} />;
      case 'amc-applicability-decision':
        return <AMCApplicabilityDecision />;
      case 'amc-proposal-list':
        return (
          <AMCProposalList
            onOpen={(id) => {
              setSelectedProposalId(id);
              setActiveModule('amc-proposal-detail');
            }}
          />
        );
      case 'amc-proposal-detail':
        return (
          <AMCProposalDetail
            proposalId={selectedProposalId ?? ''}
            onBack={() => setActiveModule('amc-proposal-list')}
          />
        );
      case 'amc-active-list':
        return <AMCActiveList />;
      case 'amc-expiring-list':
        return <AMCExpiringList />;
      case 'amc-lapsed-list':
        return <AMCLapsedList />;
      case 'installation-verification-list':
        return (
          <InstallationVerificationList
            onOpen={(id) => {
              setSelectedIVId(id);
              setActiveModule('installation-verification-detail');
            }}
          />
        );
      case 'installation-verification-detail':
        return (
          <InstallationVerificationDetail
            verificationId={selectedIVId ?? undefined}
            onBack={() => setActiveModule('installation-verification-list')}
          />
        );
      case 'amc-renewal-forecast':
        return <AMCRenewalForecast />;
      case 'risk-engine-settings':
        return <RiskEngineSettings />;
      case 'renewal-cascade-settings':
        return <RenewalCascadeSettings />;
      case 'ticket-inbox':
        return (
          <ServiceTicketInbox
            onOpen={(id) => {
              setSelectedTicketId(id);
              setAutoOpenOTP(false);
              setActiveModule('ticket-detail');
            }}
            onRaise={() => setActiveModule('ticket-raise')}
          />
        );
      case 'ticket-raise':
        return <ServiceTicketRaise onDone={() => setActiveModule('ticket-inbox')} />;
      case 'ticket-detail':
        return (
          <ServiceTicketDetail
            ticketId={selectedTicketId ?? ''}
            autoOpenOTP={autoOpenOTP}
            onBack={() => setActiveModule('ticket-inbox')}
          />
        );
      case 'ticket-completion':
        return (
          <ServiceTicketDetail
            ticketId={selectedTicketId ?? ''}
            autoOpenOTP={true}
            onBack={() => setActiveModule('ticket-inbox')}
          />
        );
      case 'standby-loans':
        return <StandbyLoanList />;
      case 'repair-routes':
        return <RepairRouteList />;
      case 'spares-issued':
        return <SparesIssuedFromField />;
      case 'sla-matrix':
        return <SLAMatrixSettings />;
      case 'escalation-tree':
        return <EscalationTreeSettings />;
      case 'sla-performance':
        return <SLAPerformance />;
      case 'csat-happy-code':
        return <CSATHappyCode />;
      case 'service-day-book':
        return <ServiceDayBook />;
      case 'oem-claim-list':
        return (
          <OEMClaimList
            onOpen={(id) => {
              setSelectedOEMClaimId(id);
              setActiveModule('oem-claim-detail');
            }}
          />
        );
      case 'oem-claim-detail':
        return (
          <OEMClaimDetail
            claimId={selectedOEMClaimId ?? ''}
            onBack={() => setActiveModule('oem-claim-list')}
          />
        );
      default:
        return <ServiceDeskWelcome onNavigate={setActiveModule} />;
    }
  };

  return (
    <Shell
      config={servicedeskShellConfig}
      userProfile={profile}
      tenantEntitlements={entitlements}
      breadcrumbs={[{ label: 'ERP', href: '/erp/dashboard' }, { label: 'ServiceDesk' }]}
      onSidebarItemClick={(item) => {
        if (item.moduleId) setActiveModule(item.moduleId as ServiceDeskModule);
      }}
    >
      {renderModule()}
    </Shell>
  );
}
