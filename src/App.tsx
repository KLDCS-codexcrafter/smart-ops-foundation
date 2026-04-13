import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { DishaniProvider, DishaniFloatingButton, DishaniPanel } from "@/components/ask-dishani";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme";
import { GlobalDateRangeProvider } from '@/hooks/useGlobalDateRange';
import { LanguageProvider } from '@/hooks/useLanguage';

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
import CommandCenterPage from "./features/command-center/pages/CommandCenterPage";
import ParentCompany from './pages/erp/foundation/ParentCompany';
import CompanyList from './pages/erp/foundation/CompanyList';
import CompanyCreate from './pages/erp/foundation/CompanyCreate';
import CompanyEdit from './pages/erp/foundation/CompanyEdit';
import SubsidiaryList from './pages/erp/foundation/SubsidiaryList';
import SubsidiaryCreate from './pages/erp/foundation/SubsidiaryCreate';
import SubsidiaryEdit from './pages/erp/foundation/SubsidiaryEdit';
import BranchOfficeList from './pages/erp/foundation/BranchOfficeList';
import BranchOfficeCreate from './pages/erp/foundation/BranchOfficeCreate';
import BranchOfficeEdit from './pages/erp/foundation/BranchOfficeEdit';
import FoundationEntityHub from './pages/erp/foundation/FoundationEntityHub';
import GeographyHub from './pages/erp/foundation/geography/GeographyHub';
import CountryMaster from './pages/erp/foundation/geography/CountryMaster';
import StateMaster from './pages/erp/foundation/geography/StateMaster';
import DistrictMaster from './pages/erp/foundation/geography/DistrictMaster';
import CityMaster from './pages/erp/foundation/geography/CityMaster';
import PortMaster from './pages/erp/foundation/geography/PortMaster';
import RegionMaster from './pages/erp/foundation/geography/RegionMaster';
import AccountingHub from './pages/erp/accounting/AccountingHub';
import TaxRateMaster from './pages/erp/accounting/TaxRateMaster';
import TDSSectionMaster from './pages/erp/accounting/TDSSectionMaster';
import TCSSectionMaster from './pages/erp/accounting/TCSSectionMaster';
import HSNSACMaster from './pages/erp/accounting/HSNSACMaster';
import ProfessionalTaxMaster from './pages/erp/accounting/ProfessionalTaxMaster';
import EPFESILWFMaster from './pages/erp/accounting/EPFESILWFMaster';
import StatutoryRegistrations from './pages/erp/accounting/StatutoryRegistrations';
import GSTEntityConfig from './pages/erp/accounting/GSTEntityConfig';
import Comply360Config from './pages/erp/accounting/Comply360Config';
import FinFrame from './pages/erp/accounting/FinFrame';
import LedgerMaster from './pages/erp/accounting/LedgerMaster';
import IncomeTaxMaster from './pages/erp/accounting/IncomeTaxMaster';
import VoucherTypesMaster from './pages/erp/accounting/VoucherTypesMaster';
import CurrencyMaster from './pages/erp/accounting/CurrencyMaster';
import ModeOfPaymentMaster from './pages/erp/masters/supporting/ModeOfPaymentMaster';
import TermsOfPaymentMaster from './pages/erp/masters/supporting/TermsOfPaymentMaster';
import TermsOfDeliveryMaster from './pages/erp/masters/supporting/TermsOfDeliveryMaster';
import LogisticMaster from './pages/erp/masters/LogisticMaster';
import VendorMaster from './pages/erp/masters/VendorMaster';
import CustomerMaster from './pages/erp/masters/CustomerMaster';
import InventoryHub from './pages/erp/inventory/InventoryHub';
import Parametric from './pages/erp/inventory/Parametric';
import BatchGrid from './pages/erp/inventory/BatchGrid';
import SerialGrid from './pages/erp/inventory/SerialGrid';
import StockMatrix from './pages/erp/inventory/StockMatrix';
import Classify from './pages/erp/inventory/Classify';
import BrandMatrix from './pages/erp/inventory/BrandMatrix';
import StorageMatrix from './pages/erp/inventory/StorageMatrix';
import MeasureX from './pages/erp/inventory/MeasureX';
import ItemCraft from './pages/erp/inventory/ItemCraft';
import CodeMatrix from './pages/erp/inventory/CodeMatrix';
import ItemTemplates from './pages/erp/inventory/ItemTemplates';
import LabelTemplates from './pages/erp/inventory/LabelTemplates';
import BarcodeGenerator from './pages/erp/inventory/BarcodeGenerator';
import AssetTagManager from './pages/erp/inventory/AssetTagManager';
import BinLocationLabels from './pages/erp/inventory/BinLocationLabels';
import PrintQueue from './pages/erp/inventory/PrintQueue';
import RFIDManager from './pages/erp/inventory/RFIDManager';
import OpeningStockEntry from './pages/erp/inventory/OpeningStockEntry';
import ItemRatesMRP from './pages/erp/inventory/ItemRatesMRP';
import PriceListManager from './pages/erp/inventory/PriceListManager';
import ReorderAlerts from './pages/erp/inventory/ReorderAlerts';
import AddOnsPage from './pages/addons/AddOnsPage';
import AddonsBarcode from './pages/addons/BarcodeAddon';
import VerticalsPage from './pages/verticals/VerticalsPage';
import ModulesPage from './pages/modules/ModulesPage';
import ClientCustomizedPage from './pages/client-customized/ClientCustomizedPage';
import PartnerDashboard from "./pages/partner/Dashboard";
import CustomerDashboard from "./pages/customer/CustomerDashboard";
import Invoices from "./pages/customer/Invoices";
import Payments from "./pages/customer/Payments";
import Statement from "./pages/customer/Statement";
import Orders from "./pages/customer/Orders";
import Documents from "./pages/customer/Documents";
import CustomerSupport from "./pages/customer/CustomerSupport";
import CustomerProfile from "./pages/customer/Profile";
import Profile from "./pages/Profile";
import { DevNavPanel } from '@/components/dev/DevNavPanel';
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
  <ThemeProvider>
  <LanguageProvider>
  <GlobalDateRangeProvider>
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <DishaniProvider>
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/auth/login" replace />} />
            <Route path="/auth/login" element={<Login />} />
            <Route path="/welcome" element={<Welcome />} />
            <Route path="/verticals-modules" element={
              <div className="min-h-screen bg-background flex items-center justify-center">
                <p className="text-muted-foreground text-sm">Verticals & Modules — coming soon</p>
              </div>
            } />
            <Route path="/verticals" element={<VerticalsPage />} />
            <Route path="/modules" element={<ModulesPage />} />
            <Route path="/client-customized" element={<ClientCustomizedPage />} />
            <Route path="/add-ons" element={<AddOnsPage />} />
            <Route path="/add-ons/barcode" element={<AddonsBarcode />} />
            <Route path="/prudent360" element={
              <div className="min-h-screen bg-background flex items-center justify-center">
                <p className="text-muted-foreground text-sm">Prudent 360 — coming soon</p>
              </div>
            } />
            <Route path="/profile" element={<Profile />} />
            <Route path="/settings" element={
              <div className="min-h-screen bg-background flex items-center justify-center">
                <p className="text-muted-foreground text-sm">Settings — coming soon</p>
              </div>
            } />
            <Route path="/tower" element={<TowerDashboard />} />
            <Route path="/tower/dashboard" element={<TowerDashboard />} />
            <Route path="/tower/customers" element={<Tenants />} />
            <Route path="/tower/users" element={<Users />} />
            <Route path="/tower/permissions" element={<Permissions />} />
            <Route path="/tower/proforma-invoice" element={<Billing />} />
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
            <Route path="/erp/foundation/company" element={<ParentCompany />} />
            <Route path="/erp/foundation/entities" element={<FoundationEntityHub />} />
            <Route path="/erp/foundation/companies"
              element={<Navigate to="/erp/foundation/entities?tab=companies" replace />} />
            <Route path="/erp/foundation/subsidiaries"
              element={<Navigate to="/erp/foundation/entities?tab=subsidiaries" replace />} />
            <Route path="/erp/foundation/branch-offices"
              element={<Navigate to="/erp/foundation/entities?tab=branch-offices" replace />} />
            <Route path="/erp/foundation/companies/create" element={<CompanyCreate />} />
            <Route path="/erp/foundation/companies/:id/edit" element={<CompanyEdit />} />
            <Route path="/erp/foundation/subsidiaries/create" element={<SubsidiaryCreate />} />
            <Route path="/erp/foundation/subsidiaries/:id/edit" element={<SubsidiaryEdit />} />
            <Route path="/erp/foundation/branch-offices/create" element={<BranchOfficeCreate />} />
            <Route path="/erp/foundation/branch-offices/:id/edit" element={<BranchOfficeEdit />} />
            <Route path="/erp/foundation/geography" element={<GeographyHub />} />
            <Route path="/erp/foundation/geography/countries" element={<CountryMaster />} />
            <Route path="/erp/foundation/geography/states" element={<StateMaster />} />
            <Route path="/erp/foundation/geography/districts" element={<DistrictMaster />} />
            <Route path="/erp/foundation/geography/cities" element={<CityMaster />} />
            <Route path="/erp/foundation/geography/ports" element={<PortMaster />} />
            <Route path="/erp/foundation/geography/regions" element={<RegionMaster />} />
            <Route path="/erp/accounting" element={<AccountingHub />} />
            <Route path="/erp/accounting/tax-rates" element={<TaxRateMaster />} />
            <Route path="/erp/accounting/tds-sections" element={<TDSSectionMaster />} />
            <Route path="/erp/accounting/tcs-sections" element={<TCSSectionMaster />} />
            <Route path="/erp/accounting/hsn-sac" element={<HSNSACMaster />} />
            <Route path="/erp/accounting/professional-tax" element={<ProfessionalTaxMaster />} />
            <Route path="/erp/accounting/epf-esi-lwf" element={<EPFESILWFMaster />} />
            <Route path="/erp/accounting/statutory-registrations" element={<StatutoryRegistrations />} />
            <Route path="/erp/accounting/gst-config" element={<GSTEntityConfig />} />
            <Route path="/erp/accounting/comply360-config" element={<Comply360Config />} />
            <Route path="/erp/accounting/finframe" element={<FinFrame />} />
            <Route path="/erp/accounting/ledger-master" element={<LedgerMaster />} />
            <Route path="/erp/accounting/income-tax" element={<IncomeTaxMaster />} />
            <Route path="/erp/accounting/currency-master" element={<CurrencyMaster />} />
            <Route path="/erp/accounting/voucher-types" element={<VoucherTypesMaster />} />
            <Route path="/erp/masters/mode-of-payment" element={<ModeOfPaymentMaster />} />
            <Route path="/erp/masters/terms-of-payment" element={<TermsOfPaymentMaster />} />
            <Route path="/erp/masters/terms-of-delivery" element={<TermsOfDeliveryMaster />} />
            <Route path="/erp/masters/logistic" element={<LogisticMaster />} />
            <Route path="/erp/masters/vendor" element={<VendorMaster />} />
            <Route path="/erp/masters/customer" element={<CustomerMaster />} />
            <Route path="/erp/inventory-hub" element={<InventoryHub />} />
            <Route path="/erp/inventory-hub/parametric" element={<Parametric />} />
            <Route path="/erp/inventory-hub/batch-grid" element={<BatchGrid />} />
            <Route path="/erp/inventory-hub/serial-grid" element={<SerialGrid />} />
            <Route path="/erp/inventory-hub/stock-matrix" element={<StockMatrix />} />
            <Route path="/erp/inventory-hub/classify" element={<Classify />} />
            <Route path="/erp/inventory-hub/brand-matrix" element={<BrandMatrix />} />
            <Route path="/erp/inventory-hub/storage-matrix" element={<StorageMatrix />} />
            <Route path="/erp/inventory-hub/measure-x" element={<MeasureX />} />
            <Route path="/erp/inventory-hub/item-craft" element={<ItemCraft />} />
            <Route path="/erp/inventory-hub/code-matrix" element={<CodeMatrix />} />
            <Route path="/erp/inventory-hub/item-templates" element={<ItemTemplates />} />
            <Route path="/erp/inventory-hub/label-templates" element={<LabelTemplates />} />
            <Route path="/erp/inventory-hub/barcode-generator" element={<BarcodeGenerator />} />
            <Route path="/erp/inventory-hub/asset-tags" element={<AssetTagManager />} />
            <Route path="/erp/inventory-hub/bin-labels" element={<BinLocationLabels />} />
            <Route path="/erp/inventory-hub/print-queue" element={<PrintQueue />} />
            <Route path="/erp/inventory-hub/rfid-manager" element={<RFIDManager />} />
            <Route path="/erp/inventory-hub/opening-stock" element={<OpeningStockEntry />} />
            <Route path="/erp/inventory-hub/item-rates" element={<ItemRatesMRP />} />
            <Route path="/erp/inventory-hub/price-lists" element={<PriceListManager />} />
            <Route path="/erp/inventory-hub/reorder-alerts" element={<ReorderAlerts />} />
            <Route path="/erp/command-center" element={<CommandCenterPage />} />
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
          <DevNavPanel />
        </BrowserRouter>
      </DishaniProvider>
    </TooltipProvider>
  </QueryClientProvider>
  </GlobalDateRangeProvider>
  </LanguageProvider>
  </ThemeProvider>
);

export default App;
