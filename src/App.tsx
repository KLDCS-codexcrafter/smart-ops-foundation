import { lazy, Suspense } from 'react';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { DishaniProvider, DishaniFloatingButton, DishaniPanel } from "@/components/ask-dishani";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme";
import { GlobalDateRangeProvider } from '@/hooks/useGlobalDateRange';
import { LanguageProvider } from '@/hooks/useLanguage';
import { DevNavPanel } from '@/components/dev/DevNavPanel';

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

const Login = lazy(() => import('./pages/auth/Login'));
const Welcome = lazy(() => import('./pages/Welcome'));
const TowerDashboard = lazy(() => import('./pages/tower/Dashboard'));

const ConsoleDashboard = lazy(() => import('./pages/bridge/ConsoleDashboard'));
const SyncMonitor = lazy(() => import('./pages/bridge/SyncMonitor'));
const ApprovalInbox = lazy(() => import('./pages/bridge/ApprovalInbox'));
const ExceptionWorkbench = lazy(() => import('./pages/bridge/ExceptionWorkbench'));
const ReconciliationWorkbench = lazy(() => import('./pages/bridge/ReconciliationWorkbench'));
const AgentFleet = lazy(() => import('./pages/bridge/AgentFleet'));
const CompanyRegistry = lazy(() => import('./pages/bridge/CompanyRegistry'));
const SyncProfiles = lazy(() => import('./pages/bridge/SyncProfiles'));
const FieldMapper = lazy(() => import('./pages/bridge/FieldMapper'));
const ImportHub = lazy(() => import('./pages/bridge/ImportHub'));
const ExportHub = lazy(() => import('./pages/bridge/ExportHub'));
const AuditExplorer = lazy(() => import('./pages/bridge/AuditExplorer'));
const BridgeSettings = lazy(() => import('./pages/bridge/BridgeSettings'));
const ErpDashboard = lazy(() => import('./pages/erp/Dashboard'));
const CommandCenterPage = lazy(() => import('./features/command-center/pages/CommandCenterPage'));
const PayHubPage = lazy(() => import('./features/pay-hub/PayHubPage'));
const ParentCompany = lazy(() => import('./pages/erp/foundation/ParentCompany'));
const CompanyCreate = lazy(() => import('./pages/erp/foundation/CompanyCreate'));
const CompanyEdit = lazy(() => import('./pages/erp/foundation/CompanyEdit'));
const SubsidiaryCreate = lazy(() => import('./pages/erp/foundation/SubsidiaryCreate'));
const SubsidiaryEdit = lazy(() => import('./pages/erp/foundation/SubsidiaryEdit'));
const BranchOfficeCreate = lazy(() => import('./pages/erp/foundation/BranchOfficeCreate'));
const BranchOfficeEdit = lazy(() => import('./pages/erp/foundation/BranchOfficeEdit'));
const FoundationEntityHub = lazy(() => import('./pages/erp/foundation/FoundationEntityHub'));
const OrgStructureHub = lazy(() => import('./pages/erp/foundation/OrgStructureHub'));
const GeographyHub = lazy(() => import('./pages/erp/foundation/geography/GeographyHub'));
const CountryMaster = lazy(() => import('./pages/erp/foundation/geography/CountryMaster'));
const StateMaster = lazy(() => import('./pages/erp/foundation/geography/StateMaster'));
const DistrictMaster = lazy(() => import('./pages/erp/foundation/geography/DistrictMaster'));
const CityMaster = lazy(() => import('./pages/erp/foundation/geography/CityMaster'));
const PortMaster = lazy(() => import('./pages/erp/foundation/geography/PortMaster'));
const RegionMaster = lazy(() => import('./pages/erp/foundation/geography/RegionMaster'));
const AccountingHub = lazy(() => import('./pages/erp/accounting/AccountingHub'));
const TaxRateMaster = lazy(() => import('./pages/erp/accounting/TaxRateMaster'));
const TDSSectionMaster = lazy(() => import('./pages/erp/accounting/TDSSectionMaster'));
const TCSSectionMaster = lazy(() => import('./pages/erp/accounting/TCSSectionMaster'));
const HSNSACMaster = lazy(() => import('./pages/erp/accounting/HSNSACMaster'));
const ProfessionalTaxMaster = lazy(() => import('./pages/erp/accounting/ProfessionalTaxMaster'));
const EPFESILWFMaster = lazy(() => import('./pages/erp/accounting/EPFESILWFMaster'));
const StatutoryRegistrations = lazy(() => import('./pages/erp/accounting/StatutoryRegistrations'));
const GSTEntityConfig = lazy(() => import('./pages/erp/accounting/GSTEntityConfig'));
const Comply360Config = lazy(() => import('./pages/erp/accounting/Comply360Config'));
const FinFrame = lazy(() => import('./pages/erp/accounting/FinFrame'));
const LedgerMaster = lazy(() => import('./pages/erp/accounting/LedgerMaster'));
const IncomeTaxMaster = lazy(() => import('./pages/erp/accounting/IncomeTaxMaster'));
const VoucherTypesMaster = lazy(() => import('./pages/erp/accounting/VoucherTypesMaster'));
const CurrencyMaster = lazy(() => import('./pages/erp/accounting/CurrencyMaster'));
const TransactionTemplates = lazy(() => import('./pages/erp/accounting/TransactionTemplates'));
const FinCorePage = lazy(() => import('./pages/erp/finecore/FinCorePage'));
const SalesInvoice = lazy(() => import('./pages/erp/accounting/vouchers/SalesInvoice'));
const PurchaseInvoice = lazy(() => import('./pages/erp/accounting/vouchers/PurchaseInvoice'));
const ReceiptVoucher = lazy(() => import('./pages/erp/accounting/vouchers/Receipt'));
const PaymentVoucher = lazy(() => import('./pages/erp/accounting/vouchers/Payment'));
const JournalEntry = lazy(() => import('./pages/erp/accounting/vouchers/JournalEntry'));
const ContraEntry = lazy(() => import('./pages/erp/accounting/vouchers/ContraEntry'));
const CreditNote = lazy(() => import('./pages/erp/accounting/vouchers/CreditNote'));
const DebitNote = lazy(() => import('./pages/erp/accounting/vouchers/DebitNote'));
const DeliveryNote = lazy(() => import('./pages/erp/accounting/vouchers/DeliveryNote'));
const ReceiptNote = lazy(() => import('./pages/erp/accounting/vouchers/ReceiptNote'));
const StockJournal = lazy(() => import('./pages/erp/accounting/vouchers/StockJournal'));
const ModeOfPaymentMaster = lazy(() => import('./pages/erp/masters/supporting/ModeOfPaymentMaster'));
const TermsOfPaymentMaster = lazy(() => import('./pages/erp/masters/supporting/TermsOfPaymentMaster'));
const TermsOfDeliveryMaster = lazy(() => import('./pages/erp/masters/supporting/TermsOfDeliveryMaster'));
const LogisticMaster = lazy(() => import('./pages/erp/masters/LogisticMaster'));
const VendorMaster = lazy(() => import('./pages/erp/masters/VendorMaster'));
const CustomerMaster = lazy(() => import('./pages/erp/masters/CustomerMaster'));
const InventoryHub = lazy(() => import('./pages/erp/inventory/InventoryHub'));
const Parametric = lazy(() => import('./pages/erp/inventory/Parametric'));
const BatchGrid = lazy(() => import('./pages/erp/inventory/BatchGrid'));
const SerialGrid = lazy(() => import('./pages/erp/inventory/SerialGrid'));
const StockMatrix = lazy(() => import('./pages/erp/inventory/StockMatrix'));
const Classify = lazy(() => import('./pages/erp/inventory/Classify'));
const BrandMatrix = lazy(() => import('./pages/erp/inventory/BrandMatrix'));
const StorageMatrix = lazy(() => import('./pages/erp/inventory/StorageMatrix'));
const MeasureX = lazy(() => import('./pages/erp/inventory/MeasureX'));
const ItemCraft = lazy(() => import('./pages/erp/inventory/ItemCraft'));
const CodeMatrix = lazy(() => import('./pages/erp/inventory/CodeMatrix'));
const ItemTemplates = lazy(() => import('./pages/erp/inventory/ItemTemplates'));
const LabelTemplates = lazy(() => import('./pages/erp/inventory/LabelTemplates'));
const BarcodeGenerator = lazy(() => import('./pages/erp/inventory/BarcodeGenerator'));
const AssetTagManager = lazy(() => import('./pages/erp/inventory/AssetTagManager'));
const BinLocationLabels = lazy(() => import('./pages/erp/inventory/BinLocationLabels'));
const PrintQueue = lazy(() => import('./pages/erp/inventory/PrintQueue'));
const RFIDManager = lazy(() => import('./pages/erp/inventory/RFIDManager'));
const OpeningStockEntry = lazy(() => import('./pages/erp/inventory/OpeningStockEntry'));
const ItemRatesMRP = lazy(() => import('./pages/erp/inventory/ItemRatesMRP'));
const PriceListManager = lazy(() => import('./pages/erp/inventory/PriceListManager'));
const ReorderAlerts = lazy(() => import('./pages/erp/inventory/ReorderAlerts'));
const AddOnsPage = lazy(() => import('./pages/addons/AddOnsPage'));
const AddonsBarcode = lazy(() => import('./pages/addons/BarcodeAddon'));
const VerticalsPage = lazy(() => import('./pages/verticals/VerticalsPage'));
const ModulesPage = lazy(() => import('./pages/modules/ModulesPage'));
const VetanNidhi = lazy(() => import('./pages/modules/VetanNidhi'));
const OperixGoPage = lazy(() => import('./pages/mobile/OperixGoPage'));
const VetanNidhiMobile = lazy(() => import('./pages/mobile/VetanNidhiMobile'));
const ClientCustomizedPage = lazy(() => import('./pages/client-customized/ClientCustomizedPage'));
const PartnerDashboard = lazy(() => import('./pages/partner/Dashboard'));
const CustomerDashboard = lazy(() => import('./pages/customer/CustomerDashboard'));
const Invoices = lazy(() => import('./pages/customer/Invoices'));
const Payments = lazy(() => import('./pages/customer/Payments'));
const Statement = lazy(() => import('./pages/customer/Statement'));
const Orders = lazy(() => import('./pages/customer/Orders'));
const Documents = lazy(() => import('./pages/customer/Documents'));
const CustomerSupport = lazy(() => import('./pages/customer/CustomerSupport'));
const CustomerProfile = lazy(() => import('./pages/customer/Profile'));
const Profile = lazy(() => import('./pages/Profile'));
const Tenants = lazy(() => import('./pages/tower/Tenants'));
const Users = lazy(() => import('./pages/tower/Users'));
const Permissions = lazy(() => import('./pages/tower/Permissions'));
const Billing = lazy(() => import('./pages/tower/Billing'));
const Security = lazy(() => import('./pages/tower/Security'));
const Notifications = lazy(() => import('./pages/tower/Notifications'));
const AuditLogs = lazy(() => import('./pages/tower/AuditLogs'));
const TowerSettings = lazy(() => import('./pages/tower/Settings'));
const Support = lazy(() => import('./pages/tower/Support'));
const Integrations = lazy(() => import('./pages/tower/Integrations'));
const AIInsights = lazy(() => import('./pages/tower/AIInsights'));
const Themes = lazy(() => import('./pages/tower/Themes'));

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
          <Suspense fallback={<div className="flex items-center justify-center h-screen"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>}>
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
              <Route path="/modules/vetan-nidhi" element={<VetanNidhi />} />
              <Route path="/client-customized" element={<ClientCustomizedPage />} />
              <Route path="/add-ons" element={<AddOnsPage />} />
              <Route path="/add-ons/barcode" element={<AddonsBarcode />} />
              <Route path="/operix-go" element={<OperixGoPage />} />
              <Route path="/operix-go/vetan-nidhi" element={<VetanNidhiMobile />} />
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
              <Route path="/erp/foundation/org-structure" element={<OrgStructureHub />} />
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
              <Route path="/erp/accounting/transaction-templates" element={<TransactionTemplates />} />
              <Route path="/erp/finecore" element={<FinCorePage />} />
              <Route path="/erp/accounting/vouchers/sales-invoice" element={<SalesInvoice />} />
              <Route path="/erp/accounting/vouchers/purchase-invoice" element={<PurchaseInvoice />} />
              <Route path="/erp/accounting/vouchers/receipt" element={<ReceiptVoucher />} />
              <Route path="/erp/accounting/vouchers/payment" element={<PaymentVoucher />} />
              <Route path="/erp/accounting/vouchers/journal" element={<JournalEntry />} />
              <Route path="/erp/accounting/vouchers/contra" element={<ContraEntry />} />
              <Route path="/erp/accounting/vouchers/credit-note" element={<CreditNote />} />
              <Route path="/erp/accounting/vouchers/debit-note" element={<DebitNote />} />
              <Route path="/erp/accounting/vouchers/delivery-note" element={<DeliveryNote />} />
              <Route path="/erp/accounting/vouchers/receipt-note" element={<ReceiptNote />} />
              <Route path="/erp/accounting/vouchers/stock-journal" element={<StockJournal />} />
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
              <Route path="/erp/pay-hub" element={<PayHubPage />} />
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
          </Suspense>
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
