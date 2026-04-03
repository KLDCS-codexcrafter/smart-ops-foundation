import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
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
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/tower" element={<TowerDashboard />} />
          <Route path="/bridge" element={<BridgeDashboard />} />
          <Route path="/erp" element={<ErpDashboard />} />
          <Route path="/partner" element={<PartnerDashboard />} />
          <Route path="/customer" element={<CustomerDashboard />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
