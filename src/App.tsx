import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { DishaniProvider, DishaniFloatingButton, DishaniPanel } from "@/components/ask-dishani";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme";

const ConditionalDishani = () => {
  const location = useLocation();
  const hideOn = ['/auth/login'];
  if (hideOn.some(path => location.pathname.startsWith(path))) return null;
  return (
    <>
      <DishaniFloatingButton />
      <DishaniPanel />
    </>
  );
};

import Login from "./pages/auth/Login";
import Welcome from "./pages/Welcome";
import TowerDashboard from "./pages/tower/Dashboard";

import ConsoleDashboard from "./pages/bridge/ConsoleDashboard";
import SyncMonitor from "./pages/bridge/SyncMonitor";
import ApprovalInbox from "./pages/bridge/ApprovalInbox";
import ExceptionWorkbench from "./pages/bridge/ExceptionWorkbench";
import ReconciliationWorkbench from "./pages/bridge/ReconciliationWorkbench";
import AgentFleet from "./pages/bridge/AgentFleet";
import CompanyRegistry from "./pages/bridge/CompanyRegistry";
import SyncProfiles from "./pages/bridge/SyncProfiles";
import FieldMapper from "./pages/bridge/FieldMapper";
import ImportHub from "./pages/bridge/ImportHub";
import ExportHub from "./pages/bridge/ExportHub";
import AuditExplorer from "./pages/bridge/AuditExplorer";
import BridgeSettings from "./pages/bridge/BridgeSettings";
import ErpDashboard from "./pages/erp/Dashboard";
import PartnerDashboard from "./pages/partner/Dashboard";
import CustomerDashboard from "./pages/customer/CustomerDashboard";
import Invoices from "./pages/customer/Invoices";
import Payments from "./pages/customer/Payments";
import Statement from "./pages/customer/Statement";
import Orders from "./pages/customer/Orders";
import Documents from "./pages/customer/Documents";
import CustomerSupport from "./pages/customer/CustomerSupport";
import CustomerProfile from "./pages/customer/Profile";
import Tenants from "./pages/tower/Tenants";
import Users from "./pages/tower/Users";
import Permissions from "./pages/tower/Permissions";
import Billing from "./pages/tower/Billing";
import Security from "./pages/tower/Security";
import Notifications from "./pages/tower/Notifications";
import AuditLogs from "./pages/tower/AuditLogs";
import TowerSettings from "./pages/tower/Settings";
import Support from "./pages/tower/Support";
import Integrations from "./pages/tower/Integrations";
import AIInsights from "./pages/tower/AIInsights";
import Themes from "./pages/tower/Themes";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
    <TooltipProvider>
      <DishaniProvider>
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/auth/login" replace />} />
            <Route path="/auth/login" element={<Login />} />
            <Route path="/welcome" element={<Welcome />} />
            <Route path="/prudent360" element={
              <div className="min-h-screen bg-background flex items-center justify-center">
                <p className="text-muted-foreground text-sm">Prudent 360 — coming soon</p>
              </div>
            } />
            <Route path="/profile" element={
              <div className="min-h-screen bg-background flex items-center justify-center">
                <p className="text-muted-foreground text-sm">Profile — coming soon</p>
              </div>
            } />
            <Route path="/settings" element={
              <div className="min-h-screen bg-background flex items-center justify-center">
                <p className="text-muted-foreground text-sm">Settings — coming soon</p>
              </div>
            } />
            <Route path="/tower" element={<TowerDashboard />} />
            <Route path="/tower/dashboard" element={<TowerDashboard />} />
            <Route path="/tower/tenants" element={<Tenants />} />
            <Route path="/tower/users" element={<Users />} />
            <Route path="/tower/permissions" element={<Permissions />} />
            <Route path="/tower/billing" element={<Billing />} />
            <Route path="/tower/security" element={<Security />} />
            <Route path="/tower/notifications" element={<Notifications />} />
            <Route path="/tower/audit-logs" element={<AuditLogs />} />
            <Route path="/tower/settings" element={<TowerSettings />} />
            <Route path="/tower/support" element={<Support />} />
            <Route path="/tower/integrations" element={<Integrations />} />
            <Route path="/tower/ai-insights" element={<AIInsights />} />
            <Route path="/tower/themes" element={<Themes />} />
            <Route path="/bridge" element={<ConsoleDashboard />} />
            <Route path="/bridge/dashboard" element={<ConsoleDashboard />} />
            <Route path="/bridge/sync-monitor" element={<SyncMonitor />} />
            <Route path="/bridge/approvals" element={<ApprovalInbox />} />
            <Route path="/bridge/exceptions" element={<ExceptionWorkbench />} />
            <Route path="/bridge/reconciliation" element={<ReconciliationWorkbench />} />
            <Route path="/bridge/agents" element={<AgentFleet />} />
            <Route path="/bridge/companies" element={<CompanyRegistry />} />
            <Route path="/bridge/sync-profiles" element={<SyncProfiles />} />
            <Route path="/bridge/field-mapper" element={<FieldMapper />} />
            <Route path="/bridge/import" element={<ImportHub />} />
            <Route path="/bridge/export" element={<ExportHub />} />
            <Route path="/bridge/audit" element={<AuditExplorer />} />
            <Route path="/bridge/settings" element={<BridgeSettings />} />
            <Route path="/erp" element={<ErpDashboard />} />
            <Route path="/erp/dashboard" element={<ErpDashboard />} />
            <Route path="/partner" element={<PartnerDashboard />} />
            <Route path="/partner/dashboard" element={<PartnerDashboard />} />
            <Route path="/customer" element={<CustomerDashboard />} />
            <Route path="/customer/dashboard" element={<CustomerDashboard />} />
            <Route path="/customer/invoices" element={<Invoices />} />
            <Route path="/customer/payments" element={<Payments />} />
            <Route path="/customer/statement" element={<Statement />} />
            <Route path="/customer/orders" element={<Orders />} />
            <Route path="/customer/documents" element={<Documents />} />
            <Route path="/customer/support" element={<CustomerSupport />} />
            <Route path="/customer/profile" element={<CustomerProfile />} />
            <Route path="/my" element={<CustomerDashboard />} />
            <Route path="/my/dashboard" element={<CustomerDashboard />} />
            <Route path="*" element={<Navigate to="/auth/login" replace />} />
          </Routes>
          <ConditionalDishani />
        </BrowserRouter>
      </DishaniProvider>
    </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
