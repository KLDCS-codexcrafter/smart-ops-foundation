import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

import Login from "./pages/auth/Login";
import Welcome from "./pages/Welcome";
import TowerDashboard from "./pages/tower/Dashboard";
import { TowerLayout } from "./components/layout/TowerLayout";
import BridgeDashboard from "./pages/bridge/Dashboard";
import ErpDashboard from "./pages/erp/Dashboard";
import PartnerDashboard from "./pages/partner/Dashboard";
import CustomerDashboard from "./pages/customer/Dashboard";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
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
          {[
            "tenants", "users", "permissions", "billing", "security",
            "notifications", "integrations", "audit-logs", "settings",
            "support", "ai-insights", "partners", "themes",
          ].map((slug) => (
            <Route
              key={slug}
              path={`/tower/${slug}`}
              element={
                <TowerLayout title={slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}>
                  <div className="flex items-center justify-center h-64">
                    <p className="text-muted-foreground text-sm">
                      {slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())} — coming soon
                    </p>
                  </div>
                </TowerLayout>
              }
            />
          ))}
          <Route path="/bridge" element={<BridgeDashboard />} />
          <Route path="/bridge/dashboard" element={<BridgeDashboard />} />
          <Route path="/erp" element={<ErpDashboard />} />
          <Route path="/erp/dashboard" element={<ErpDashboard />} />
          <Route path="/partner" element={<PartnerDashboard />} />
          <Route path="/partner/dashboard" element={<PartnerDashboard />} />
          <Route path="/customer" element={<CustomerDashboard />} />
          <Route path="/customer/dashboard" element={<CustomerDashboard />} />
          <Route path="/my" element={<CustomerDashboard />} />
          <Route path="/my/dashboard" element={<CustomerDashboard />} />
          <Route path="*" element={<Navigate to="/auth/login" replace />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
