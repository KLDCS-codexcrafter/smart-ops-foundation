import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

import Login from "./pages/auth/Login";
import TowerDashboard from "./pages/tower/Dashboard";
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
          <Route path="/tower" element={<TowerDashboard />} />
          <Route path="/tower/dashboard" element={<TowerDashboard />} />
          <Route path="/bridge" element={<BridgeDashboard />} />
          <Route path="/bridge/dashboard" element={<BridgeDashboard />} />
          <Route path="/erp" element={<ErpDashboard />} />
          <Route path="/erp/dashboard" element={<ErpDashboard />} />
          <Route path="/partner" element={<PartnerDashboard />} />
          <Route path="/partner/dashboard" element={<PartnerDashboard />} />
          <Route path="/customer" element={<CustomerDashboard />} />
          <Route path="/customer/dashboard" element={<CustomerDashboard />} />
          <Route path="*" element={<Navigate to="/auth/login" replace />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
