import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes, Navigate, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { DishaniProvider, DishaniFloatingButton, DishaniPanel } from "@/components/ask-dishani";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme";
import { GlobalDateRangeProvider } from '@/hooks/useGlobalDateRange';
import { LanguageProvider } from '@/hooks/useLanguage';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { ErrorBoundary } from '@/components/ErrorBoundary';

const DevNavPanel = import.meta.env.DEV
  ? React.lazy(() => import('@/components/dev/DevNavPanel').then(m => ({ default: m.DevNavPanel })))
  : null;

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
const SalesXPage = lazy(() => import('./features/salesx/SalesXPage'));
const ReceivXPage = lazy(() => import('./features/receivx/ReceivXPage'));
const SmokeTestRunner = lazy(() => import('./pages/erp/smoke-test/SmokeTestRunner'));
const ProformaInvoicePrint = lazy(() => import('./pages/erp/salesx/transactions/ProformaInvoicePrint'));
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
const SalesInvoicePrint = lazy(() => import('./pages/erp/accounting/vouchers/SalesInvoicePrint'));
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
const SalesXGoMobile = lazy(() => import('./pages/mobile/SalesXGoMobile'));
const ReceivXGoMobile = lazy(() => import('./pages/mobile/ReceivXGoMobile'));
const ClientCustomizedPage = lazy(() => import('./pages/client-customized/ClientCustomizedPage'));
const PartnerDashboard = lazy(() => import('./pages/partner/PartnerDashboard'));
const DistributorLogin = lazy(() => import('./pages/erp/distributor/DistributorLogin'));
const DistributorDashboard = lazy(() => import('./pages/erp/distributor/DistributorDashboard'));
const DistributorCatalog = lazy(() => import('./pages/erp/distributor/DistributorCatalog'));
const DistributorCart = lazy(() => import('./pages/erp/distributor/DistributorCart'));
const DistributorInvoices = lazy(() => import('./pages/erp/distributor/DistributorInvoices'));
const DistributorPayments = lazy(() => import('./pages/erp/distributor/DistributorPayments'));
const DistributorUpdates = lazy(() => import('./pages/erp/distributor/DistributorUpdates'));
const DistributorHubPage = lazy(() => import('./pages/erp/distributor-hub/DistributorHubPage'));
const CustomerHubPage = lazy(() => import('./pages/erp/customer-hub/CustomerHubPage'));
const DispatchHubPage = lazy(() => import('./pages/erp/dispatch/DispatchHubPage'));
const DistributorGoMobile = lazy(() => import('./pages/mobile/DistributorGoMobile'));
// Sprint 14a — OperixGo PWA shell
const MobileRouter = lazy(() => import('./pages/mobile/MobileRouter'));
// Sprint 11a — distributor portal (external user) routes only
const DistributorDownstreamView = lazy(() => import('./pages/erp/distributor/DistributorDownstreamView'));
const DistributorCRM = lazy(() => import('./pages/erp/distributor/DistributorCRM'));
const DistributorVisitCapture = lazy(() => import('./pages/erp/distributor/DistributorVisitCapture'));
const DistributorCreditRequest = lazy(() => import('./pages/erp/distributor/DistributorCreditRequest'));
const DistributorRateUs = lazy(() => import('./pages/erp/distributor/DistributorRateUs'));
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
const BusinessUnitMaster = lazy(() => import('./pages/erp/masters/BusinessUnitMaster'));



const P = ProtectedRoute;

const App = () => (
  <ThemeProvider>
  <LanguageProvider>
  <GlobalDateRangeProvider>
    <TooltipProvider>
      <DishaniProvider>
        <Sonner />
        <ErrorBoundary>
        <BrowserRouter>
          <Suspense fallback={<div className="flex items-center justify-center h-screen"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>}>
            <Routes>
              <Route path="/" element={<Navigate to="/auth/login" replace />} />
              <Route path="/auth/login" element={<Login />} />
              {/* Sprint 14a — OperixGo PWA (public; has its own login) */}
              <Route path="/mobile/*" element={<MobileRouter />} />
              <Route path="/welcome" element={<P><Welcome /></P>} />
              <Route path="/verticals-modules" element={
                <P><div className="min-h-screen bg-background flex items-center justify-center">
                  <p className="text-muted-foreground text-sm">Verticals & Modules — coming soon</p>
                </div></P>
              } />
              <Route path="/verticals" element={<P><VerticalsPage /></P>} />
              <Route path="/modules" element={<P><ModulesPage /></P>} />
              <Route path="/modules/vetan-nidhi" element={<P><VetanNidhi /></P>} />
              <Route path="/client-customized" element={<P><ClientCustomizedPage /></P>} />
              <Route path="/add-ons" element={<P><AddOnsPage /></P>} />
              <Route path="/add-ons/barcode" element={<P><AddonsBarcode /></P>} />
              <Route path="/operix-go" element={<P><OperixGoPage /></P>} />
              <Route path="/operix-go/vetan-nidhi" element={<P><VetanNidhiMobile /></P>} />
              <Route path="/operix-go/salesx" element={<P><SalesXGoMobile /></P>} />
              <Route path="/operix-go/receivx" element={<P><ReceivXGoMobile /></P>} />
              <Route path="/prudent360" element={
                <P><div className="min-h-screen bg-background flex items-center justify-center">
                  <p className="text-muted-foreground text-sm">Prudent 360 — coming soon</p>
                </div></P>
              } />
              <Route path="/profile" element={<P><Profile /></P>} />
              <Route path="/settings" element={
                <P><div className="min-h-screen bg-background flex items-center justify-center">
                  <p className="text-muted-foreground text-sm">Settings — coming soon</p>
                </div></P>
              } />
              <Route path="/tower" element={<P><TowerDashboard /></P>} />
              <Route path="/tower/dashboard" element={<P><TowerDashboard /></P>} />
              <Route path="/tower/customers" element={<P><Tenants /></P>} />
              <Route path="/tower/users" element={<P><Users /></P>} />
              <Route path="/tower/permissions" element={<P><Permissions /></P>} />
              <Route path="/tower/proforma-invoice" element={<P><Billing /></P>} />
              <Route path="/tower/security" element={<P><Security /></P>} />
              <Route path="/tower/notifications" element={<P><Notifications /></P>} />
              <Route path="/tower/audit-logs" element={<P><AuditLogs /></P>} />
              <Route path="/tower/settings" element={<P><TowerSettings /></P>} />
              <Route path="/tower/support" element={<P><Support /></P>} />
              <Route path="/tower/integrations" element={<P><Integrations /></P>} />
              <Route path="/tower/ai-insights" element={<P><AIInsights /></P>} />
              <Route path="/tower/themes" element={<P><Themes /></P>} />
              <Route path="/bridge" element={<P><ConsoleDashboard /></P>} />
              <Route path="/bridge/dashboard" element={<P><ConsoleDashboard /></P>} />
              <Route path="/bridge/sync-monitor" element={<P><SyncMonitor /></P>} />
              <Route path="/bridge/approvals" element={<P><ApprovalInbox /></P>} />
              <Route path="/bridge/exceptions" element={<P><ExceptionWorkbench /></P>} />
              <Route path="/bridge/reconciliation" element={<P><ReconciliationWorkbench /></P>} />
              <Route path="/bridge/agents" element={<P><AgentFleet /></P>} />
              <Route path="/bridge/companies" element={<P><CompanyRegistry /></P>} />
              <Route path="/bridge/sync-profiles" element={<P><SyncProfiles /></P>} />
              <Route path="/bridge/field-mapper" element={<P><FieldMapper /></P>} />
              <Route path="/bridge/import" element={<P><ImportHub /></P>} />
              <Route path="/bridge/export" element={<P><ExportHub /></P>} />
              <Route path="/bridge/audit" element={<P><AuditExplorer /></P>} />
              <Route path="/bridge/settings" element={<P><BridgeSettings /></P>} />
              <Route path="/erp/foundation/company" element={<P><ParentCompany /></P>} />
              <Route path="/erp/foundation/entities" element={<P><FoundationEntityHub /></P>} />
              <Route path="/erp/foundation/companies"
                element={<Navigate to="/erp/foundation/entities?tab=companies" replace />} />
              <Route path="/erp/foundation/subsidiaries"
                element={<Navigate to="/erp/foundation/entities?tab=subsidiaries" replace />} />
              <Route path="/erp/foundation/branch-offices"
                element={<Navigate to="/erp/foundation/entities?tab=branch-offices" replace />} />
              <Route path="/erp/foundation/companies/create" element={<P><CompanyCreate /></P>} />
              <Route path="/erp/foundation/companies/:id/edit" element={<P><CompanyEdit /></P>} />
              <Route path="/erp/foundation/subsidiaries/create" element={<P><SubsidiaryCreate /></P>} />
              <Route path="/erp/foundation/subsidiaries/:id/edit" element={<P><SubsidiaryEdit /></P>} />
              <Route path="/erp/foundation/branch-offices/create" element={<P><BranchOfficeCreate /></P>} />
              <Route path="/erp/foundation/branch-offices/:id/edit" element={<P><BranchOfficeEdit /></P>} />
              <Route path="/erp/foundation/org-structure" element={<P><OrgStructureHub /></P>} />
              <Route path="/erp/foundation/geography" element={<P><GeographyHub /></P>} />
              <Route path="/erp/foundation/geography/countries" element={<P><CountryMaster /></P>} />
              <Route path="/erp/foundation/geography/states" element={<P><StateMaster /></P>} />
              <Route path="/erp/foundation/geography/districts" element={<P><DistrictMaster /></P>} />
              <Route path="/erp/foundation/geography/cities" element={<P><CityMaster /></P>} />
              <Route path="/erp/foundation/geography/ports" element={<P><PortMaster /></P>} />
              <Route path="/erp/foundation/geography/regions" element={<P><RegionMaster /></P>} />
              <Route path="/erp/accounting" element={<P><AccountingHub /></P>} />
              <Route path="/erp/accounting/tax-rates" element={<P><TaxRateMaster /></P>} />
              <Route path="/erp/accounting/tds-sections" element={<P><TDSSectionMaster /></P>} />
              <Route path="/erp/accounting/tcs-sections" element={<P><TCSSectionMaster /></P>} />
              <Route path="/erp/accounting/hsn-sac" element={<P><HSNSACMaster /></P>} />
              <Route path="/erp/accounting/professional-tax" element={<P><ProfessionalTaxMaster /></P>} />
              <Route path="/erp/accounting/epf-esi-lwf" element={<P><EPFESILWFMaster /></P>} />
              <Route path="/erp/accounting/statutory-registrations" element={<P><StatutoryRegistrations /></P>} />
              <Route path="/erp/accounting/gst-config" element={<P><GSTEntityConfig /></P>} />
              <Route path="/erp/accounting/comply360-config" element={<P><Comply360Config /></P>} />
              <Route path="/erp/accounting/finframe" element={<P><FinFrame /></P>} />
              <Route path="/erp/accounting/ledger-master" element={<P><LedgerMaster /></P>} />
              <Route path="/erp/accounting/income-tax" element={<P><IncomeTaxMaster /></P>} />
              <Route path="/erp/accounting/currency-master" element={<P><CurrencyMaster /></P>} />
              <Route path="/erp/accounting/voucher-types" element={<P><VoucherTypesMaster /></P>} />
              <Route path="/erp/accounting/transaction-templates" element={<P><TransactionTemplates /></P>} />
              <Route path="/erp/finecore" element={<P><FinCorePage /></P>} />
              <Route path="/erp/finecore/invoice-print" element={<P><SalesInvoicePrint /></P>} />
              <Route path="/erp/accounting/vouchers/sales-invoice" element={<P><SalesInvoice /></P>} />
              <Route path="/erp/accounting/vouchers/purchase-invoice" element={<P><PurchaseInvoice /></P>} />
              <Route path="/erp/accounting/vouchers/receipt" element={<P><ReceiptVoucher /></P>} />
              <Route path="/erp/accounting/vouchers/payment" element={<P><PaymentVoucher /></P>} />
              <Route path="/erp/accounting/vouchers/journal" element={<P><JournalEntry /></P>} />
              <Route path="/erp/accounting/vouchers/contra" element={<P><ContraEntry /></P>} />
              <Route path="/erp/accounting/vouchers/credit-note" element={<P><CreditNote /></P>} />
              <Route path="/erp/accounting/vouchers/debit-note" element={<P><DebitNote /></P>} />
              <Route path="/erp/accounting/vouchers/delivery-note" element={<P><DeliveryNote /></P>} />
              <Route path="/erp/accounting/vouchers/receipt-note" element={<P><ReceiptNote /></P>} />
              <Route path="/erp/accounting/vouchers/stock-journal" element={<P><StockJournal /></P>} />
              <Route path="/erp/masters/mode-of-payment" element={<P><ModeOfPaymentMaster /></P>} />
              <Route path="/erp/masters/terms-of-payment" element={<P><TermsOfPaymentMaster /></P>} />
              <Route path="/erp/masters/terms-of-delivery" element={<P><TermsOfDeliveryMaster /></P>} />
              <Route path="/erp/masters/logistic" element={<P><LogisticMaster /></P>} />
              <Route path="/erp/masters/vendor" element={<P><VendorMaster /></P>} />
              <Route path="/erp/masters/customer" element={<P><CustomerMaster /></P>} />
              <Route path="/erp/masters/business-unit" element={<P><BusinessUnitMaster /></P>} />
              <Route path="/erp/inventory-hub" element={<P><InventoryHub /></P>} />
              <Route path="/erp/inventory-hub/parametric" element={<P><Parametric /></P>} />
              <Route path="/erp/inventory-hub/batch-grid" element={<P><BatchGrid /></P>} />
              <Route path="/erp/inventory-hub/serial-grid" element={<P><SerialGrid /></P>} />
              <Route path="/erp/inventory-hub/stock-matrix" element={<P><StockMatrix /></P>} />
              <Route path="/erp/inventory-hub/classify" element={<P><Classify /></P>} />
              <Route path="/erp/inventory-hub/brand-matrix" element={<P><BrandMatrix /></P>} />
              <Route path="/erp/inventory-hub/storage-matrix" element={<P><StorageMatrix /></P>} />
              <Route path="/erp/inventory-hub/measure-x" element={<P><MeasureX /></P>} />
              <Route path="/erp/inventory-hub/item-craft" element={<P><ItemCraft /></P>} />
              <Route path="/erp/inventory-hub/code-matrix" element={<P><CodeMatrix /></P>} />
              <Route path="/erp/inventory-hub/item-templates" element={<P><ItemTemplates /></P>} />
              <Route path="/erp/inventory-hub/label-templates" element={<P><LabelTemplates /></P>} />
              <Route path="/erp/inventory-hub/barcode-generator" element={<P><BarcodeGenerator /></P>} />
              <Route path="/erp/inventory-hub/asset-tags" element={<P><AssetTagManager /></P>} />
              <Route path="/erp/inventory-hub/bin-labels" element={<P><BinLocationLabels /></P>} />
              <Route path="/erp/inventory-hub/print-queue" element={<P><PrintQueue /></P>} />
              <Route path="/erp/inventory-hub/rfid-manager" element={<P><RFIDManager /></P>} />
              <Route path="/erp/inventory-hub/opening-stock" element={<P><OpeningStockEntry /></P>} />
              <Route path="/erp/inventory-hub/item-rates" element={<P><ItemRatesMRP /></P>} />
              <Route path="/erp/inventory-hub/price-lists" element={<P><PriceListManager /></P>} />
              <Route path="/erp/inventory-hub/reorder-alerts" element={<P><ReorderAlerts /></P>} />
              <Route path="/erp/command-center" element={<P><CommandCenterPage /></P>} />
              <Route path="/erp/pay-hub" element={<P><PayHubPage /></P>} />
              <Route path="/erp/salesx" element={<P><SalesXPage /></P>} />
              <Route path="/erp/salesx/proforma-print/:quotationId" element={<P><ProformaInvoicePrint /></P>} />
              <Route path="/erp/receivx" element={<P><ReceivXPage /></P>} />
              <Route path="/erp/smoke-test" element={<P><SmokeTestRunner /></P>} />
              <Route path="/erp" element={<P><ErpDashboard /></P>} />
              <Route path="/erp/dashboard" element={<P><ErpDashboard /></P>} />
              <Route path="/partner" element={<PartnerDashboard />} />
              <Route path="/partner/dashboard" element={<PartnerDashboard />} />
              <Route path="/erp/distributor/login" element={<DistributorLogin />} />
              <Route path="/erp/distributor-hub" element={<P><DistributorHubPage /></P>} />
              <Route path="/erp/customer-hub" element={<P><CustomerHubPage /></P>} />
              <Route path="/erp/customer-hub/*" element={<P><CustomerHubPage /></P>} />
              <Route path="/erp/dispatch" element={<P><DispatchHubPage /></P>} />
              <Route path="/erp/dispatch/*" element={<P><DispatchHubPage /></P>} />
              <Route path="/erp/distributor/dashboard" element={<DistributorDashboard />} />
              <Route path="/erp/distributor/catalog" element={<DistributorCatalog />} />
              <Route path="/erp/distributor/cart" element={<DistributorCart />} />
              <Route path="/erp/distributor/invoices" element={<DistributorInvoices />} />
              <Route path="/erp/distributor/payments" element={<DistributorPayments />} />
              <Route path="/erp/distributor/updates" element={<DistributorUpdates />} />
              {/* Sprint 11a — distributor PORTAL routes (external user, untouched) */}
              <Route path="/erp/distributor/downstream" element={<DistributorDownstreamView />} />
              <Route path="/erp/distributor/crm" element={<DistributorCRM />} />
              <Route path="/erp/distributor/visits/new" element={<DistributorVisitCapture />} />
              <Route path="/erp/distributor/credit-request" element={<DistributorCreditRequest />} />
              <Route path="/erp/distributor/rate-us" element={<DistributorRateUs />} />
              <Route path="/operix-go/distributor" element={<P><DistributorGoMobile /></P>} />
              <Route path="/customer" element={<P><CustomerDashboard /></P>} />
              <Route path="/customer/dashboard" element={<P><CustomerDashboard /></P>} />
              <Route path="/my" element={<P><CustomerDashboard /></P>} />
              <Route path="/my/dashboard" element={<P><CustomerDashboard /></P>} />
              <Route path="/customer/invoices" element={<P><Invoices /></P>} />
              <Route path="/customer/payments" element={<P><Payments /></P>} />
              <Route path="/customer/statement" element={<P><Statement /></P>} />
              <Route path="/customer/orders" element={<P><Orders /></P>} />
              <Route path="/customer/documents" element={<P><Documents /></P>} />
              <Route path="/customer/support" element={<P><CustomerSupport /></P>} />
              <Route path="/customer/profile" element={<P><CustomerProfile /></P>} />
              <Route path="/my" element={<P><CustomerDashboard /></P>} />
              <Route path="/my/dashboard" element={<P><CustomerDashboard /></P>} />
              <Route path="*" element={<Navigate to="/auth/login" replace />} />
            </Routes>
          </Suspense>
          <ConditionalDishani />
          {import.meta.env.DEV && DevNavPanel && <React.Suspense fallback={null}><DevNavPanel /></React.Suspense>}
        </BrowserRouter>
        </ErrorBoundary>
      </DishaniProvider>
    </TooltipProvider>
  </GlobalDateRangeProvider>
  </LanguageProvider>
  </ThemeProvider>
);

export default App;
