/**
 * MobileRouter.tsx — Universal mobile shell.
 * Mounted at /mobile/* — handles login gate + home routing + install prompt.
 * Auto-detects role from session and routes accordingly.
 */

import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { OfflineIndicator } from '@/components/mobile/OfflineIndicator';
import { InstallPromptBanner } from '@/components/mobile/InstallPromptBanner';
import { UpdateAvailableBanner } from '@/components/mobile/UpdateAvailableBanner';
import {
  registerServiceWorker,
  triggerQueueReplay,
  subscribe,
} from '@/lib/service-worker-setup';
import {
  replayableEntries,
  markRetryFailure,
} from '@/lib/offline-queue-engine';
import { hideSplashScreen, onAppResume } from '@/lib/native-bridge';
import { logMobileAudit } from '@/lib/mobile-audit';
import { PushPermissionGate } from '@/components/mobile/PushPermissionGate';
import { registerForPush, onPushTapped } from '@/lib/push-notification-bridge';
import { setAppBadgeCount } from '@/lib/app-shortcut-bridge';
import { getQueueSize } from '@/lib/offline-queue-engine';
import MobileLogin from './MobileLogin';
import MobileHome from './MobileHome';
import MobileSalesmanHome from './salesman/MobileSalesmanHome';
import MobileSalesmanBeatPage from './salesman/MobileSalesmanBeatPage';
import MobileVisitCheckInPage from './salesman/MobileVisitCheckInPage';
import MobileQuickEnquiryPage from './salesman/MobileQuickEnquiryPage';
import MobileSalesmanPipelinePage from './salesman/MobileSalesmanPipelinePage';
import MobileSalesmanCustomersPage from './salesman/MobileSalesmanCustomersPage';
import MobileSalesmanVisitLogPage from './salesman/MobileSalesmanVisitLogPage';
import MobileSecondarySalesPage from './salesman/MobileSecondarySalesPage';
import MobileSalesmanTargetsPage from './salesman/MobileSalesmanTargetsPage';
import MobileSalesmanCommissionPage from './salesman/MobileSalesmanCommissionPage';
import MobileTimeEntriesPage from './salesman/MobileTimeEntriesPage';
import MobileTelecallerHome from './telecaller/MobileTelecallerHome';
import MobileCallQueuePage from './telecaller/MobileCallQueuePage';
import MobileActiveCallPage from './telecaller/MobileActiveCallPage';
import MobileTelecallerQuickEnquiryPage from './telecaller/MobileTelecallerQuickEnquiryPage';
import MobileTelecallerPipelinePage from './telecaller/MobileTelecallerPipelinePage';
import MobileQuoteQuickSendPage from './telecaller/MobileQuoteQuickSendPage';
import MobileTelecallerCustomersPage from './telecaller/MobileTelecallerCustomersPage';
import MobileLeadInboxPage from './telecaller/MobileLeadInboxPage';
import MobileTelecallerRemindersPage from './telecaller/MobileTelecallerRemindersPage';
import MobileWaTemplatesPage from './telecaller/MobileWaTemplatesPage';
import MobileTelecallerStatsPage from './telecaller/MobileTelecallerStatsPage';
import MobileTelecallerCallLogPage from './telecaller/MobileTelecallerCallLogPage';
import MobileSupervisorHome from './supervisor/MobileSupervisorHome';
import MobileTeamLiveViewPage from './supervisor/MobileTeamLiveViewPage';
import MobileApprovalsPage from './supervisor/MobileApprovalsPage';
import MobileCoverageMapPage from './supervisor/MobileCoverageMapPage';
import MobileQualityReviewsPage from './supervisor/MobileQualityReviewsPage';
import MobileLeadDistributionPage from './supervisor/MobileLeadDistributionPage';
import MobileVisitLogReviewPage from './supervisor/MobileVisitLogReviewPage';
import MobileComplianceAlertsPage from './supervisor/MobileComplianceAlertsPage';
import MobileSupervisorTeamStatsPage from './supervisor/MobileSupervisorTeamStatsPage';
import MobileManagerHome from './manager/MobileManagerHome';
import MobilePipelineHealthPage from './manager/MobilePipelineHealthPage';
import MobileSmartInsightsPage from './manager/MobileSmartInsightsPage';
import MobileManagerTargetsPage from './manager/MobileManagerTargetsPage';
import MobileRevenueTrendPage from './manager/MobileRevenueTrendPage';
import MobileCampaignPerformancePage from './manager/MobileCampaignPerformancePage';
import MobileCrossDeptHandoffPage from './manager/MobileCrossDeptHandoffPage';
import MobileManagerTeamStatsPage from './manager/MobileManagerTeamStatsPage';
import MobileProjectHealthPage from './manager/MobileProjectHealthPage';
// Distributor mobile pages
import MobileDistributorCatalogPage from './distributor/MobileDistributorCatalogPage';
import MobileDistributorCartPage from './distributor/MobileDistributorCartPage';
import MobileDistributorInvoicesPage from './distributor/MobileDistributorInvoicesPage';
import MobileDistributorPaymentsPage from './distributor/MobileDistributorPaymentsPage';
import MobileDistributorCreditRequestPage from './distributor/MobileDistributorCreditRequestPage';
import MobileDistributorVisitCapturePage from './distributor/MobileDistributorVisitCapturePage';
// Customer mobile pages
import MobileCustomerCatalogPage from './customer/MobileCustomerCatalogPage';
import MobileCustomerCartPage from './customer/MobileCustomerCartPage';
import MobileCustomerOrdersPage from './customer/MobileCustomerOrdersPage';
import MobileCustomerRewardsPage from './customer/MobileCustomerRewardsPage';
import MobileCustomerVoiceComplaintPage from './customer/MobileCustomerVoiceComplaintPage';
import MobileCustomerSampleKitsPage from './customer/MobileCustomerSampleKitsPage';
// Shared cross-role pages
import MobileAttendancePage from './shared/MobileAttendancePage';
import MobileExpenseClaimPage from './shared/MobileExpenseClaimPage';

function renderRoleRoute(pathname: string): React.ReactElement {
  if (pathname === '/mobile/salesman' || pathname === '/mobile/salesman/') return <MobileSalesmanHome />;
  if (pathname === '/mobile/salesman/beat') return <MobileSalesmanBeatPage />;
  if (pathname.startsWith('/mobile/salesman/check-in')) return <MobileVisitCheckInPage />;
  if (pathname === '/mobile/salesman/quick-enquiry') return <MobileQuickEnquiryPage />;
  if (pathname === '/mobile/salesman/pipeline') return <MobileSalesmanPipelinePage />;
  if (pathname === '/mobile/salesman/customers') return <MobileSalesmanCustomersPage />;
  if (pathname === '/mobile/salesman/visit-log') return <MobileSalesmanVisitLogPage />;
  if (pathname === '/mobile/salesman/secondary-sales') return <MobileSecondarySalesPage />;
  if (pathname === '/mobile/salesman/targets') return <MobileSalesmanTargetsPage />;
  if (pathname === '/mobile/salesman/commission') return <MobileSalesmanCommissionPage />;
  if (pathname === '/mobile/salesman/time-entries') return <MobileTimeEntriesPage />;
  // Telecaller routes
  if (pathname === '/mobile/telecaller' || pathname === '/mobile/telecaller/') return <MobileTelecallerHome />;
  if (pathname === '/mobile/telecaller/queue') return <MobileCallQueuePage />;
  if (pathname.startsWith('/mobile/telecaller/active-call')) return <MobileActiveCallPage />;
  if (pathname === '/mobile/telecaller/quick-enquiry') return <MobileTelecallerQuickEnquiryPage />;
  if (pathname === '/mobile/telecaller/pipeline') return <MobileTelecallerPipelinePage />;
  if (pathname === '/mobile/telecaller/quote-send') return <MobileQuoteQuickSendPage />;
  if (pathname === '/mobile/telecaller/customers') return <MobileTelecallerCustomersPage />;
  if (pathname === '/mobile/telecaller/leads') return <MobileLeadInboxPage />;
  if (pathname === '/mobile/telecaller/reminders') return <MobileTelecallerRemindersPage />;
  if (pathname === '/mobile/telecaller/wa-templates') return <MobileWaTemplatesPage />;
  if (pathname === '/mobile/telecaller/stats') return <MobileTelecallerStatsPage />;
  if (pathname === '/mobile/telecaller/call-log') return <MobileTelecallerCallLogPage />;
  if (pathname === '/mobile/telecaller/call-log') return <MobileTelecallerCallLogPage />;
  // Supervisor routes
  if (pathname === '/mobile/supervisor' || pathname === '/mobile/supervisor/') return <MobileSupervisorHome />;
  if (pathname === '/mobile/supervisor/team-live') return <MobileTeamLiveViewPage />;
  if (pathname === '/mobile/supervisor/approvals') return <MobileApprovalsPage />;
  if (pathname === '/mobile/supervisor/coverage-map') return <MobileCoverageMapPage />;
  if (pathname === '/mobile/supervisor/quality-reviews') return <MobileQualityReviewsPage />;
  if (pathname === '/mobile/supervisor/lead-distribution') return <MobileLeadDistributionPage />;
  if (pathname === '/mobile/supervisor/visit-log-review') return <MobileVisitLogReviewPage />;
  if (pathname === '/mobile/supervisor/compliance-alerts') return <MobileComplianceAlertsPage />;
  if (pathname === '/mobile/supervisor/team-stats') return <MobileSupervisorTeamStatsPage />;
  // Sales Manager routes
  if (pathname === '/mobile/manager' || pathname === '/mobile/manager/') return <MobileManagerHome />;
  if (pathname === '/mobile/manager/pipeline-health') return <MobilePipelineHealthPage />;
  if (pathname === '/mobile/manager/smart-insights') return <MobileSmartInsightsPage />;
  if (pathname === '/mobile/manager/targets') return <MobileManagerTargetsPage />;
  if (pathname === '/mobile/manager/revenue-trend') return <MobileRevenueTrendPage />;
  if (pathname === '/mobile/manager/campaign-performance') return <MobileCampaignPerformancePage />;
  if (pathname === '/mobile/manager/cross-dept-handoff') return <MobileCrossDeptHandoffPage />;
  if (pathname === '/mobile/manager/team-stats') return <MobileManagerTeamStatsPage />;
  if (pathname === '/mobile/manager/compliance-alerts') return <MobileComplianceAlertsPage />;
  if (pathname === '/mobile/manager/project-health') return <MobileProjectHealthPage />;
  // Distributor routes
  if (pathname === '/mobile/distributor/catalog') return <MobileDistributorCatalogPage />;
  if (pathname === '/mobile/distributor/cart') return <MobileDistributorCartPage />;
  if (pathname === '/mobile/distributor/invoices') return <MobileDistributorInvoicesPage />;
  if (pathname === '/mobile/distributor/payments') return <MobileDistributorPaymentsPage />;
  if (pathname === '/mobile/distributor/credit-request') return <MobileDistributorCreditRequestPage />;
  if (pathname === '/mobile/distributor/visit-capture') return <MobileDistributorVisitCapturePage />;
  // Customer routes
  if (pathname === '/mobile/customer/catalog') return <MobileCustomerCatalogPage />;
  if (pathname === '/mobile/customer/cart') return <MobileCustomerCartPage />;
  if (pathname === '/mobile/customer/orders') return <MobileCustomerOrdersPage />;
  if (pathname === '/mobile/customer/rewards') return <MobileCustomerRewardsPage />;
  if (pathname === '/mobile/customer/voice-complaint') return <MobileCustomerVoiceComplaintPage />;
  if (pathname === '/mobile/customer/sample-kits') return <MobileCustomerSampleKitsPage />;
  // Shared routes (any field role can access)
  if (pathname === '/mobile/shared/attendance') return <MobileAttendancePage />;
  if (pathname === '/mobile/shared/expenses') return <MobileExpenseClaimPage />;
  return <MobileHome />;
}

export interface MobileSession {
  role:
    | 'salesman'
    | 'telecaller'
    | 'supervisor'
    | 'sales_manager'
    | 'distributor'
    | 'customer'
    | 'unknown';
  user_id: string | null;
  display_name: string;
  entity_code: string;
  plan_tier: 'trial' | 'starter' | 'growth' | 'enterprise';
}

function readSession(): MobileSession | null {
  try {
    // [JWT] GET /api/mobile/auth/session
    const raw = sessionStorage.getItem('opx_mobile_session');
    return raw ? (JSON.parse(raw) as MobileSession) : null;
  } catch {
    return null;
  }
}

/** Replay queued writes — placeholder; real execution per consumer in 14b/14c. */
function replayQueueNow(): void {
  const entries = replayableEntries();
  for (const entry of entries) {
    // For 14a we just no-op; future sprints attach handlers per kind.
    if (entry.retry_count >= 5) {
      markRetryFailure(entry.id, 'max-retries');
    }
  }
}

export default function MobileRouter() {
  const navigate = useNavigate();
  const location = useLocation();
  const [session, setSession] = useState<MobileSession | null>(readSession());

  // Register SW on mount
  useEffect(() => {
    void registerServiceWorker();
  }, []);

  // Sprint 14b — Hide native splash + replay queue on app resume
  useEffect(() => {
    void hideSplashScreen();
    const unsub = onAppResume(() => {
      triggerQueueReplay();
      replayQueueNow();
    });
    return unsub;
  }, []);

  // Sprint 14b — log mobile session_start once per session
  // Sprint 14c — also register for push + handle deep-link taps
  useEffect(() => {
    if (session && session.role !== 'unknown' && session.user_id) {
      logMobileAudit({
        entityCode: session.entity_code,
        userId: session.user_id,
        userName: session.display_name,
        role: session.role,
        action: 'card_open',
        refType: 'mobile_session',
        refLabel: `Mobile session started (${session.role})`,
      });

      void registerForPush();
      const unsub = onPushTapped((payload) => {
        if (payload.deep_link) navigate(payload.deep_link);
        else if (payload.order_id) {
          navigate(`/erp/distributor/orders/${payload.order_id}`);
        }
      });
      return unsub;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user_id]);

  // Sprint 14c — keep app icon badge in sync with offline queue size
  useEffect(() => {
    const interval = setInterval(() => {
      void setAppBadgeCount(getQueueSize());
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Listen for online events to trigger queue replay
  useEffect(() => {
    const unsub = subscribe((state) => {
      if (state.online) {
        triggerQueueReplay();
        replayQueueNow();
      }
    });
    return unsub;
  }, []);

  // Login gate
  useEffect(() => {
    const s = readSession();
    setSession(s);
    if (!s && location.pathname !== '/mobile/login') {
      navigate('/mobile/login', { replace: true });
    } else if (s && location.pathname === '/mobile/login') {
      const dest =
        s.role === 'salesman'      ? '/mobile/salesman' :
        s.role === 'telecaller'    ? '/mobile/telecaller' :
        s.role === 'supervisor'    ? '/mobile/supervisor' :
        s.role === 'sales_manager' ? '/mobile/manager' :
        '/mobile/home';
      navigate(dest, { replace: true });
    } else if (location.pathname === '/mobile' || location.pathname === '/mobile/') {
      const dest = s
        ? (s.role === 'salesman'      ? '/mobile/salesman' :
           s.role === 'telecaller'    ? '/mobile/telecaller' :
           s.role === 'supervisor'    ? '/mobile/supervisor' :
           s.role === 'sales_manager' ? '/mobile/manager' :
           '/mobile/home')
        : '/mobile/login';
      navigate(dest, { replace: true });
    }
  }, [location.pathname, navigate]);

  const isLogin = location.pathname === '/mobile/login' || location.pathname === '/mobile/';

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {!isLogin && session && (
        <header className="sticky top-0 z-40 bg-slate-900 text-white px-3 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm">OperixGo</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 uppercase tracking-wider">
              {session.plan_tier}
            </span>
          </div>
          <OfflineIndicator />
        </header>
      )}

      <main className="flex-1">
        {isLogin ? <MobileLogin /> : renderRoleRoute(location.pathname)}
      </main>

      <InstallPromptBanner />
      <UpdateAvailableBanner />
      <PushPermissionGate />
    </div>
  );
}
