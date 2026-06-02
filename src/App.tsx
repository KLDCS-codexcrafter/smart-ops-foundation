import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes, Navigate, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { DishaniProvider } from "@/components/ask-dishani";
// Block 2C-i-prev-2 · Q-LOCK-1 · DishaniFloatingButton + DishaniPanel lazy-loaded
// to trim main bundle. Provider stays eager so context wraps the whole tree.
const DishaniFloatingButton = React.lazy(() =>
  import("@/components/ask-dishani").then(m => ({ default: m.DishaniFloatingButton }))
);
const DishaniPanel = React.lazy(() =>
  import("@/components/ask-dishani").then(m => ({ default: m.DishaniPanel }))
);
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme";
import { GlobalDateRangeProvider } from '@/hooks/useGlobalDateRange';
import { LanguageProvider } from '@/hooks/useLanguage';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ERPCompanyProvider } from '@/components/layout/ERPCompanyProvider';
import { FactoryProvider } from '@/contexts/FactoryContext';

const DevNavPanel = import.meta.env.DEV
  ? React.lazy(() => import('@/components/dev/DevNavPanel').then(m => ({ default: m.DevNavPanel })))
  : null;

const ConditionalDishani = () => {
  const location = useLocation();
  const hideOn = ['/auth/login'];
  if (hideOn.some(path => location.pathname.startsWith(path))) return null;
  return (
    <Suspense fallback={null}>
      <DishaniFloatingButton />
      <DishaniPanel />
    </Suspense>
  );
};

// T-Phase-1.H.1 · Q-LOCK-7a · backward-compat redirect /erp/finecore/* → /erp/fincore/*
// preserves user bookmarks · D-NEW-CM-fincore-naming-canonical
const FineCoreLegacyRedirect = () => {
  const location = useLocation();
  const target =
    location.pathname.replace(/^\/erp\/finecore/, '/erp/fincore') +
    (location.search || '') +
    (location.hash || '');
  return <Navigate to={target} replace />;
};

// T-Phase-1.H.2 · Q-LOCK-7a · backward-compat redirect /erp/qulicheak/* → /erp/qualicheck/*
// preserves user bookmarks · D-NEW-CM Legacy Redirect Convention · D-NEW-CN canonical correction
const QulicheakLegacyRedirect = () => {
  const location = useLocation();
  const target =
    location.pathname
      .replace(/^\/erp\/qulicheak/, '/erp/qualicheck')
      .replace(/^\/operix-go\/qulicheak/, '/operix-go/qualicheck') +
    (location.search || '') +
    (location.hash || '');
  return <Navigate to={target} replace />;
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
// 🆕 Sprint 68 FAR-4 · Block 14 · FAR-2 deferred Block 9 route supplement · Q-LOCK-12 A
const FAPhysicalVerificationPage = lazy(() => import('./pages/erp/accounting/capital-assets/FAPhysicalVerification'));
const FACalibrationStatusReportPage = lazy(() => import('./pages/erp/accounting/capital-assets/FACalibrationStatusReport'));
const FAAMCRenewalPipelinePage = lazy(() => import('./pages/erp/accounting/capital-assets/FAAMCRenewalPipeline'));
const FAVehicleRegisterPage = lazy(() => import('./pages/erp/accounting/capital-assets/FAVehicleRegister'));
// [Sprint 68 FAR-4 Wire-Up T-fix · Tier 3 · F-13 absorption · Mobile FA Scan + EPCG Status]
const MobileFAScanPage = lazy(() => import('./pages/mobile/MobileFAScanPage'));
const EPCGStatusReport = lazy(() => import('./pages/erp/fincore/statutory-fa-pack/EPCGStatusReport'));
const CommandCenterPage = lazy(() => import('./features/command-center/pages/CommandCenterPage'));
const PayHubPage = lazy(() => import('./features/pay-hub/PayHubPage'));
const SalesXPage = lazy(() => import('./features/salesx/SalesXPage'));
const ReceivXPage = lazy(() => import('./features/receivx/ReceivXPage'));
// Sprint T-Phase-1.2.5h-b2 · Smoke test moved to src/test/dev-only · gated below
const SmokeTestRunner = lazy(() => import('./test/dev-only/SmokeTestRunner'));
// Sprint T-Phase-1.2.5h-b2 · Recent Errors panel
const RecentErrorsPage = lazy(() => import('./features/command-center/pages/RecentErrorsPage'));
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
const PeriodLockSettings = lazy(() => import('./pages/erp/accounting/PeriodLockSettings'));
// PHASE 2 REMOVE — Mock auth dev panel is dropped when real auth lands
const MockAuthDevPanel = lazy(() => import('./pages/erp/accounting/MockAuthDevPanel'));
const TaxRateMaster = lazy(() => import('./pages/erp/accounting/TaxRateMaster'));
const TDSSectionMaster = lazy(() => import('./pages/erp/accounting/TDSSectionMaster'));
const TCSSectionMaster = lazy(() => import('./pages/erp/accounting/TCSSectionMaster'));
const HSNSACMaster = lazy(() => import('./pages/erp/accounting/HSNSACMaster'));
const ProfessionalTaxMaster = lazy(() => import('./pages/erp/accounting/ProfessionalTaxMaster'));
const EPFESILWFMaster = lazy(() => import('./pages/erp/accounting/EPFESILWFMaster'));
const StatutoryRegistrations = lazy(() => import('./pages/erp/accounting/StatutoryRegistrations'));
const GSTEntityConfig = lazy(() => import('./pages/erp/accounting/GSTEntityConfig'));
const ComplianceSettingsAutomation = lazy(() => import('./pages/erp/accounting/ComplianceSettingsAutomation'));
const RCMComplianceReport = lazy(() => import('./pages/erp/fincore/reports/gst/RCMComplianceReport'));
const FinFrame = lazy(() => import('./pages/erp/accounting/FinFrame'));
const LedgerMaster = lazy(() => import('./pages/erp/accounting/LedgerMaster'));
const IncomeTaxMaster = lazy(() => import('./pages/erp/accounting/IncomeTaxMaster'));
const VoucherTypesMaster = lazy(() => import('./pages/erp/accounting/VoucherTypesMaster'));
const CurrencyMaster = lazy(() => import('./pages/erp/accounting/CurrencyMaster'));
const TransactionTemplates = lazy(() => import('./pages/erp/accounting/TransactionTemplates'));
const FinCorePage = lazy(() => import('./pages/erp/fincore/FinCorePage'));
const CARO20Disclosure = lazy(() => import('./pages/erp/fincore/statutory-fa-pack/CARO20Disclosure'));
const MSMECapitalBreaches = lazy(() => import('./pages/erp/fincore/statutory-fa-pack/MSMECapitalBreaches'));
const IndAS116ROUSchedule = lazy(() => import('./pages/erp/fincore/statutory-fa-pack/IndAS116ROUSchedule'));
const FALedgerPackReport = lazy(() => import('./pages/erp/fincore/statutory-fa-pack/FALedgerPackReport'));
const AssetCentreMasterPage = lazy(() => import('./pages/erp/fincore/masters/AssetCentreMaster'));
const VoucherClassMasterPage = lazy(() => import('./pages/erp/fincore/masters/VoucherClassMaster'));
const ApprovalsPendingPage = lazy(() => import('./pages/erp/fincore/registers/ApprovalsPendingPage'));
const CancellationAuditRegister = lazy(() => import('./pages/erp/fincore/registers/CancellationAuditRegister'));
const PinnedTemplatesView = lazy(() => import('./pages/erp/fincore/PinnedTemplatesView'));
const ProjXPage = lazy(() => import('./pages/erp/projx/ProjXPage'));
const ProjectCentreMasterPage = lazy(() => import('./pages/erp/projx/masters/ProjectCentreMaster'));
// Sprint T-Phase-1.3-DashboardAudit-Fix · Block D · Tier 1 #5 + #12 NEW · stub pages
const EngineeringXPage = lazy(() => import('./pages/erp/engineeringx/EngineeringXPage'));
const SiteXPage = lazy(() => import('./pages/erp/sitex/SiteXPage'));
// Sprint T-Phase-1.A.16a · MaintainPro Foundation (Masters) · 11th card on Shell
const MaintainProPage = lazy(() => import('./pages/erp/maintainpro/MaintainProPage'));
// Sprint T-Phase-1.C.1a · ServiceDesk Masters Foundation · 12th card on Shell
const ServiceDeskPage = lazy(() => import('./pages/erp/servicedesk/ServiceDeskPage'));
// Sprint 69 · T-Phase-5.A.1.1 · Comply360 Main Arc 1.1 · Block 1 Q1 Card scaffolding
const Comply360Page = lazy(() => import('./pages/erp/comply360/Comply360Page'));
// Sprint 116 · T-Phase-7.D.0.1 · 🎬 Phase 7 opener · FP&A / Planning card landing
const FpaPlanningPage = lazy(() => import('./pages/erp/fpa-planning/FpaPlanningPage'));
const MobileSiteEngineerPage = lazy(() => import('./pages/mobile/MobileSiteEngineerPage'));
const MobileMaintenanceTechnicianPage = lazy(() => import('./pages/mobile/MobileMaintenanceTechnicianPage'));
const MobileShopFloorOperatorPage = lazy(() => import('./pages/mobile/MobileShopFloorOperatorPage'));
// A.15b · 4 mobile SiteX captures
const MobileSiteDPRCapture = lazy(() => import('./components/mobile/MobileSiteDPRCapture'));
const MobileSiteSnagCapture = lazy(() => import('./components/mobile/MobileSiteSnagCapture'));
const MobileSiteSafetyIncidentCapture = lazy(() => import('./components/mobile/MobileSiteSafetyIncidentCapture'));
const MobileSiteMaterialIssueCapture = lazy(() => import('./components/mobile/MobileSiteMaterialIssueCapture'));
// A.17 · 4 MaintainPro mobile captures (OOB-M9 5-step pattern)
const MobileBreakdownCapture = lazy(() => import('./components/mobile/MobileBreakdownCapture'));
const MobilePMTickoffCapture = lazy(() => import('./components/mobile/MobilePMTickoffCapture'));
const MobileSparesIssueCapture = lazy(() => import('./components/mobile/MobileSparesIssueCapture'));
const MobileAssetPhotoCapture = lazy(() => import('./components/mobile/MobileAssetPhotoCapture'));
const SalesInvoicePrint = lazy(() => import('./pages/erp/accounting/vouchers/SalesInvoicePrint'));
const ReceiptPrint = lazy(() => import('./pages/erp/accounting/vouchers/ReceiptPrint').then(m => ({ default: m.ReceiptPrintPanel })));
const PaymentPrint = lazy(() => import('./pages/erp/accounting/vouchers/PaymentPrint').then(m => ({ default: m.PaymentPrintPanel })));
const ContraEntryPrint = lazy(() => import('./pages/erp/accounting/vouchers/ContraEntryPrint').then(m => ({ default: m.ContraEntryPrintPanel })));
const JournalEntryPrint = lazy(() => import('./pages/erp/accounting/vouchers/JournalEntryPrint').then(m => ({ default: m.JournalEntryPrintPanel })));
const PurchaseInvoicePrint = lazy(() => import('./pages/erp/accounting/vouchers/PurchaseInvoicePrint').then(m => ({ default: m.PurchaseInvoicePrintPanel })));
const CreditNotePrint = lazy(() => import('./pages/erp/accounting/vouchers/CreditNotePrint').then(m => ({ default: m.CreditNotePrintPanel })));
const DebitNotePrint = lazy(() => import('./pages/erp/accounting/vouchers/DebitNotePrint').then(m => ({ default: m.DebitNotePrintPanel })));
const DeliveryNotePrint = lazy(() => import('./pages/erp/accounting/vouchers/DeliveryNotePrint'));
const ReceiptNotePrint = lazy(() => import('./pages/erp/accounting/vouchers/ReceiptNotePrint'));
const StockAdjustmentPrint = lazy(() => import('./pages/erp/accounting/vouchers/StockAdjustmentPrint'));
const StockJournalPrint = lazy(() => import('./pages/erp/accounting/vouchers/StockJournalPrint'));
const StockTransferPrint = lazy(() => import('./pages/erp/accounting/vouchers/StockTransferPrint'));
const ManufacturingJournalPrint = lazy(() => import('./pages/erp/accounting/vouchers/ManufacturingJournalPrint'));
const PrintConfigPage = lazy(() => import('./pages/erp/fincore/settings/PrintConfigPage'));
const RegisterConfigPage = lazy(() => import('./pages/erp/fincore/settings/RegisterConfigPage'));
// [T-T8.2-Foundation] PayOut hub
const PayOutPage = lazy(() => import('./features/payout/PayOutPage'));
const PayOutDashboard = lazy(() => import('./pages/erp/payout/PayOutDashboard'));
const VendorPaymentEntry = lazy(() => import('./pages/erp/payout/VendorPaymentEntry'));
const PaymentRegisterRoute = lazy(() => import('./pages/erp/payout/PaymentRegisterRoute'));
// [T-T8.3-AdvanceIntel] Bill Settlement screen · post-hoc advance allocation
const BillSettlement = lazy(() => import('./pages/erp/payout/BillSettlement'));
// [T-T8.4-Requisition-Universal] Universal Payment Requisition · 21 types · 2-level approval
const PaymentRequisitionEntry = lazy(() => import('./pages/erp/payout/PaymentRequisitionEntry'));
const RequisitionInbox = lazy(() => import('./pages/erp/payout/RequisitionInbox'));
const RequisitionHistory = lazy(() => import('./pages/erp/payout/RequisitionHistory'));
// [T-T8.5-MSME-Compliance] MSME 43B(h) Alerts dashboard
const MSMEAlerts = lazy(() => import('./pages/erp/payout/MSMEAlerts'));
// [T-T8.6-VendorAnalytics] 5-tier Vendor Analytics dashboard
const VendorAnalytics = lazy(() => import('./pages/erp/payout/VendorAnalytics'));
// [T-T8.7-SmartAP] Smart AP suite — Bulk Pay · Auto-Pay · Cash-Flow · Forecast · Bank Files
const SmartAPHub = lazy(() => import('./pages/erp/payout/SmartAPHub'));
const BulkPayBuilder = lazy(() => import('./pages/erp/payout/BulkPayBuilder'));
const AutoPayRulesEditor = lazy(() => import('./pages/erp/payout/AutoPayRulesEditor'));
const CashFlowDashboard = lazy(() => import('./pages/erp/payout/CashFlowDashboard'));
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
const MainStoreHub = lazy(() => import('./pages/erp/inventory/MainStoreHubPage'));
const Procure360Page = lazy(() => import('./pages/erp/procure-hub/Procure360Page'));
// Sprint T-Phase-1.2.6f-d-2 · Block B · D-298 · Store Hub landing
const DepartmentStorePage = lazy(() => import('./pages/erp/store-hub/DepartmentStorePage'));
const BillPassingPage = lazy(() => import('./pages/erp/bill-passing/BillPassingPage'));
// Sprint T-Phase-1.2.6f-d-2-card4-4-pre-1 · Block E · D-304 · GateFlow Foundation
const GateFlowPage = lazy(() => import('./pages/erp/gateflow/GateFlowPage'));
// Sprint T-Phase-1.2.6f-d-2-card5-5-pre-1 · Block G · D-326 · QualiCheck Foundation
const QualiCheckPage = lazy(() => import('./pages/erp/qualicheck/QualiCheckPage'));

const DocVaultPage = lazy(() => import('./pages/erp/docvault/DocVaultPage'));
const RFQPublicForm = lazy(() => import('./pages/vendor-portal/RFQPublicForm'));
// Sprint T-Phase-1.2.6f-b-1 · vendor portal public surface (token replaces auth · NO <P> wrapper)
const VendorLogin = lazy(() => import('./pages/vendor-portal/VendorLogin'));
const VendorDashboard = lazy(() => import('./pages/vendor-portal/VendorDashboard'));
const VendorInbox = lazy(() => import('./pages/vendor-portal/VendorInbox'));
const VendorPortalProfile = lazy(() => import('./pages/vendor-portal/VendorPortalProfile'));
const VendorCommLog = lazy(() => import('./pages/vendor-portal/VendorCommLog'));
const VendorOnboardingFirstQuote = lazy(() => import('./pages/vendor-portal/VendorOnboardingFirstQuote'));
const VendorEnquiryResponse = lazy(() => import('./pages/vendor-portal/VendorEnquiryResponse'));
const VendorBidSubmission = lazy(() => import('./pages/vendor-portal/VendorBidSubmission'));
const VendorPOView = lazy(() => import('./pages/vendor-portal/VendorPOView'));
const VendorKYCManagement = lazy(() => import('./pages/vendor-portal/VendorKYCManagement'));
const VendorInvoiceUpload = lazy(() => import('./pages/vendor-portal/VendorInvoiceUpload'));
const VendorMessages = lazy(() => import('./pages/vendor-portal/VendorMessages'));
const VendorPerformanceView = lazy(() => import('./pages/vendor-portal/VendorPerformanceView'));
const HappyCodeChannel2Form = lazy(() => import('./pages/public/HappyCodeChannel2Form'));
const RequestX = lazy(() => import('./pages/erp/requestx/RequestXPage'));
const VendorPortal = lazy(() => import('./pages/erp/vendor-portal/VendorPortalPage'));
// Sprint T-Phase-1.EX-1 · EximX Foundation · card promotion + sub-module shell
const EximXPage = lazy(() => import('./pages/erp/eximx/EximXPage'));
const EximXExportLayout = lazy(() => import('./pages/erp/eximx/EximXExportLayout'));
const EximXImportLayout = lazy(() => import('./pages/erp/eximx/EximXImportLayout'));
const EximXUnifiedLayout = lazy(() => import('./pages/erp/eximx/EximXUnifiedLayout'));
// Sprint T-Phase-2.B-2 · EximX Medium D-NEWs · D-NEW-FA + D-NEW-FE direct routes
const CrossEntityRealisationDashboard = lazy(() => import('./pages/erp/eximx/finance/CrossEntityRealisationDashboard'));
const Form3CEBDashboard = lazy(() => import('./pages/erp/eximx/compliance/Form3CEBDashboard'));
// Sprint T-Phase-2.A-EX-12 · D-NEW-FJ + D-NEW-FK
const LCList = lazy(() => import('./pages/erp/eximx/finance/LCList'));
const LCDetail = lazy(() => import('./pages/erp/eximx/finance/LCDetail'));
const PackingCreditList = lazy(() => import('./pages/erp/eximx/finance/PackingCreditList'));
const PackingCreditDetail = lazy(() => import('./pages/erp/eximx/finance/PackingCreditDetail'));
const ProductionPage = lazy(() => import('./pages/erp/production/ProductionPage'));
const Parametric = lazy(() => import('./pages/erp/inventory/Parametric'));
const BatchGrid = lazy(() => import('./pages/erp/inventory/BatchGrid'));
const SerialGrid = lazy(() => import('./pages/erp/inventory/SerialGrid'));
const StockMatrix = lazy(() => import('./pages/erp/inventory/StockMatrix'));
const Classify = lazy(() => import('./pages/erp/inventory/Classify'));
const BrandMatrix = lazy(() => import('./pages/erp/inventory/BrandMatrix'));
const StorageMatrix = lazy(() => import('./pages/erp/inventory/StorageMatrix'));
const MeasureX = lazy(() => import('./pages/erp/inventory/MeasureX'));
const ItemCraft = lazy(() => import('./pages/erp/inventory/ItemCraft'));
const BOMMaster = lazy(() => import('./pages/erp/inventory/BOMMaster'));
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
const MobileGateGuardPage = lazy(() => import('./pages/mobile/MobileGateGuardPage'));
// Sprint T-Phase-1.2.6f-d-2-card5-5-pre-3 · Block E · D-346 · Mobile QualiCheck
const MobileQualiCheckPage = lazy(() => import('./pages/mobile/MobileQualiCheckPage'));
// Sprint T-Phase-1.2.6f-d-2-card6-6-pre-3 · Block C · D-371 · Mobile Inward Receipt
const MobileInwardReceiptPage = lazy(() => import('./pages/mobile/MobileInwardReceiptPage'));
// Sprint T-Phase-1.2.6f-d-2-card7-7-pre-3 · Block E · D-398 · Store Hub Mobile
const MobileStoreIssuePage = lazy(() => import('./pages/mobile/MobileStoreIssuePage'));
const MobileReceiptAckPage = lazy(() => import('./pages/mobile/MobileReceiptAckPage'));
// Sprint T-Phase-1.2.6f-d-2-card8-8-pre-1 · Block E · D-407 · RequestX Mobile
const MobileMaterialIndentPage = lazy(() => import('./pages/mobile/MobileMaterialIndentPage'));
const MobileApprovalInboxPage = lazy(() => import('./pages/mobile/MobileApprovalInboxPage'));
// Sprint T-Phase-1.3-3a-pre-3 · Block H · D-563 · Card 3a Mobile Suite (Q17=a)
const MobileMaterialIssuePage = lazy(() => import('./pages/mobile/MobileMaterialIssuePage'));
const MobileProductionConfirmationPage = lazy(() => import('./pages/mobile/MobileProductionConfirmationPage'));
const MobileJobWorkOutPage = lazy(() => import('./pages/mobile/MobileJobWorkOutPage'));
const MobileJobWorkReceiptPage = lazy(() => import('./pages/mobile/MobileJobWorkReceiptPage'));
// Sprint T-Phase-1.3-3-PlantOps-pre-2 · Block J · Mobile Job Card capture
const MobileJobCardPage = lazy(() => import('./pages/mobile/MobileJobCardPage'));
const VetanNidhiMobile = lazy(() => import('./pages/mobile/VetanNidhiMobile'));
const SalesXGoMobile = lazy(() => import('./pages/mobile/SalesXGoMobile'));
const ReceivXGoMobile = lazy(() => import('./pages/mobile/ReceivXGoMobile'));
const ClientCustomizedPage = lazy(() => import('./pages/client-customized/ClientCustomizedPage'));
const ClientBlueprintsPage = lazy(() => import('./pages/welcome/scenarios/ClientBlueprintsPage'));
const EngineeringConsolePage = lazy(() => import('./pages/welcome/dev-tools/EngineeringConsolePage'));
const SeedLabPage = lazy(() => import('./pages/welcome/dev-tools/SeedLabPage'));
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
const DispatchOpsPage = lazy(() => import('./pages/erp/dispatch/DispatchOpsPage'));
const DistributorGoMobile = lazy(() => import('./pages/mobile/DistributorGoMobile'));
// Sprint 14a — OperixGo PWA shell
const MobileRouter = lazy(() => import('./pages/mobile/MobileRouter'));
// Sprint 11a — distributor portal (external user) routes only
const DistributorDownstreamView = lazy(() => import('./pages/erp/distributor/DistributorDownstreamView'));
const DistributorCRM = lazy(() => import('./pages/erp/distributor/DistributorCRM'));
const DistributorVisitCapture = lazy(() => import('./pages/erp/distributor/DistributorVisitCapture'));
const DistributorCreditRequest = lazy(() => import('./pages/erp/distributor/DistributorCreditRequest'));
const DistributorRateUs = lazy(() => import('./pages/erp/distributor/DistributorRateUs'));
// Sprint 15c-2 — Logistic Partner Portal (separate auth boundary)
const LogisticLogin = lazy(() => import('./pages/erp/logistic/LogisticLogin'));
const LogisticDashboard = lazy(() => import('./pages/erp/logistic/LogisticDashboard'));
const LogisticInvoiceSubmit = lazy(() => import('./pages/erp/logistic/LogisticInvoiceSubmit'));
const LogisticLRQueue = lazy(() => import('./pages/erp/logistic/LogisticLRQueue'));
const LogisticPayments = lazy(() => import('./pages/erp/logistic/LogisticPayments'));
const LogisticDisputes = lazy(() => import('./pages/erp/logistic/LogisticDisputes'));
const LogisticProfile = lazy(() => import('./pages/erp/logistic/LogisticProfile'));
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
          <ERPCompanyProvider>
          <FactoryProvider>
          <Suspense fallback={<div className="flex items-center justify-center h-screen"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>}>
            <Routes>
              <Route path="/" element={<Navigate to="/auth/login" replace />} />
              <Route path="/auth/login" element={<Login />} />
              {/* Sprint 14a — OperixGo PWA (public; has its own login) */}
              <Route path="/mobile/*" element={<MobileRouter />} />
              {/* Sprint 3-b-1 · vendor portal public routes · token replaces auth · NO <P> wrapper */}
              <Route path="/vendor-portal" element={<VendorDashboard />} />
              <Route path="/vendor-portal/login" element={<VendorLogin />} />
              <Route path="/vendor-portal/inbox" element={<VendorInbox />} />
              <Route path="/vendor-portal/enquiries" element={<VendorEnquiryResponse />} />
              <Route path="/vendor-portal/bids" element={<VendorEnquiryResponse />} />
              <Route path="/vendor-portal/bids/:rfqId" element={<VendorBidSubmission />} />
              <Route path="/vendor-portal/purchase-orders" element={<VendorPOView />} />
              <Route path="/vendor-portal/invoices" element={<VendorInvoiceUpload />} />
              <Route path="/vendor-portal/kyc" element={<VendorKYCManagement />} />
              <Route path="/vendor-portal/performance" element={<VendorPerformanceView />} />
              <Route path="/vendor-portal/messages" element={<VendorMessages />} />
              <Route path="/vendor-portal/profile" element={<VendorPortalProfile />} />
              <Route path="/vendor-portal/commlog" element={<VendorCommLog />} />
              <Route path="/vendor-portal/onboarding" element={<VendorOnboardingFirstQuote />} />
              <Route path="/vendor-portal/rfq/:rfqId" element={<RFQPublicForm />} />
              {/* Sprint T-Phase-1.C.1d · ServiceDesk HappyCode Channel 2 (7-day JWT · public · no auth) */}
              <Route path="/feedback/happy-code" element={<HappyCodeChannel2Form />} />
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
              <Route path="/welcome/scenarios" element={<P><ClientBlueprintsPage /></P>} />
              <Route path="/welcome/dev-tools" element={<P><EngineeringConsolePage /></P>} />
              <Route path="/welcome/dev-tools/seed-lab" element={<P><SeedLabPage /></P>} />
              <Route path="/add-ons" element={<P><AddOnsPage /></P>} />
              <Route path="/add-ons/barcode" element={<P><AddonsBarcode /></P>} />
              <Route path="/operix-go" element={<P><OperixGoPage /></P>} />
              <Route path="/operix-go/vetan-nidhi" element={<P><VetanNidhiMobile /></P>} />
              <Route path="/operix-go/salesx" element={<P><SalesXGoMobile /></P>} />
              <Route path="/operix-go/receivx" element={<P><ReceivXGoMobile /></P>} />
              <Route path="/operix-go/gate-guard" element={<P><MobileGateGuardPage /></P>} />
              <Route path="/operix-go/qualicheck" element={<P><MobileQualiCheckPage /></P>} />
              <Route path="/operix-go/inward-receipt" element={<P><MobileInwardReceiptPage /></P>} />
              <Route path="/operix-go/store-issue" element={<P><MobileStoreIssuePage /></P>} />
              <Route path="/operix-go/receipt-ack" element={<P><MobileReceiptAckPage /></P>} />
              <Route path="/operix-go/material-indent" element={<P><MobileMaterialIndentPage /></P>} />
              <Route path="/operix-go/production/material-issue" element={<P><MobileMaterialIssuePage /></P>} />
              <Route path="/operix-go/production/confirmation" element={<P><MobileProductionConfirmationPage /></P>} />
              <Route path="/operix-go/production/job-work-out" element={<P><MobileJobWorkOutPage /></P>} />
              <Route path="/operix-go/production/job-work-receipt" element={<P><MobileJobWorkReceiptPage /></P>} />
              <Route path="/operix-go/production/job-card" element={<P><MobileJobCardPage /></P>} />
              <Route path="/operix-go/approval-inbox" element={<P><MobileApprovalInboxPage /></P>} />
              <Route path="/operix-go/site-engineer" element={<P><MobileSiteEngineerPage /></P>} />
              <Route path="/operix-go/maintenance-technician" element={<P><MobileMaintenanceTechnicianPage /></P>} />
              <Route path="/operix-go/shop-floor-operator" element={<P><MobileShopFloorOperatorPage /></P>} />
              <Route path="/operix-go/site-dpr" element={<P><MobileSiteDPRCapture /></P>} />
              <Route path="/operix-go/site-snag" element={<P><MobileSiteSnagCapture /></P>} />
              <Route path="/operix-go/site-safety" element={<P><MobileSiteSafetyIncidentCapture /></P>} />
              <Route path="/operix-go/site-material-issue" element={<P><MobileSiteMaterialIssueCapture /></P>} />
              <Route path="/operix-go/breakdown-capture" element={<P><MobileBreakdownCapture /></P>} />
              <Route path="/operix-go/pm-tickoff-capture" element={<P><MobilePMTickoffCapture /></P>} />
              <Route path="/operix-go/spares-issue-capture" element={<P><MobileSparesIssueCapture /></P>} />
              <Route path="/operix-go/asset-photo-capture" element={<P><MobileAssetPhotoCapture /></P>} />
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
              <Route path="/erp/accounting/compliance-settings-automation" element={<P><ComplianceSettingsAutomation /></P>} />
              <Route path="/erp/fincore/reports/gst/rcm-compliance-report" element={<P><RCMComplianceReport /></P>} />
              <Route path="/erp/accounting/finframe" element={<P><FinFrame /></P>} />
              <Route path="/erp/accounting/ledger-master" element={<P><LedgerMaster /></P>} />
              <Route path="/erp/accounting/income-tax" element={<P><IncomeTaxMaster /></P>} />
              <Route path="/erp/accounting/currency-master" element={<P><CurrencyMaster /></P>} />
              <Route path="/erp/accounting/voucher-types" element={<P><VoucherTypesMaster /></P>} />
              <Route path="/erp/accounting/transaction-templates" element={<P><TransactionTemplates /></P>} />
              <Route path="/erp/accounting/period-lock" element={<P><PeriodLockSettings /></P>} />
              {/* PHASE 2 REMOVE — Mock auth dev panel route */}
              <Route path="/erp/accounting/mock-auth" element={<P><MockAuthDevPanel /></P>} />
              <Route path="/erp/fincore" element={<P><FinCorePage /></P>} />
              <Route path="/erp/fincore/masters/asset-centres" element={<P><AssetCentreMasterPage /></P>} />
              <Route path="/erp/fincore/masters/voucher-class" element={<P><VoucherClassMasterPage /></P>} />
              <Route path="/erp/fincore/registers/approvals-pending" element={<P><ApprovalsPendingPage /></P>} />
              <Route path="/erp/fincore/registers/cancellation-audit-register" element={<P><CancellationAuditRegister /></P>} />
              <Route path="/erp/fincore/pinned-templates" element={<P><PinnedTemplatesView /></P>} />
              <Route path="/erp/fincore/statutory-fa-pack/caro-20" element={<P><CARO20Disclosure /></P>} />
              <Route path="/erp/fincore/statutory-fa-pack/msme-capital" element={<P><MSMECapitalBreaches /></P>} />
              <Route path="/erp/fincore/statutory-fa-pack/ind-as-116" element={<P><IndAS116ROUSchedule /></P>} />
              <Route path="/erp/fincore/statutory-fa-pack/fa-ledger-pack" element={<P><FALedgerPackReport /></P>} />
              <Route path="/erp/projx" element={<P><ProjXPage /></P>} />
              <Route path="/erp/projx/masters/project-centres" element={<P><ProjectCentreMasterPage /></P>} />
              <Route path="/erp/projx/documents" element={<P><ProjXPage /></P>} />
              {/* Sprint T-Phase-1.3-DashboardAudit-Fix · Block D · Tier 1 #5 NEW · EngineeringX placeholder */}
              <Route path="/erp/engineeringx" element={<P><EngineeringXPage /></P>} />
              {/* Sprint T-Phase-1.3-DashboardAudit-Fix · Block D · Tier 1 #12 NEW · SiteX placeholder */}
              <Route path="/erp/sitex" element={<P><SiteXPage /></P>} />
              {/* Sprint T-Phase-1.A.16a · MaintainPro Foundation Masters · 11th card on Shell */}
              <Route path="/erp/maintainpro" element={<P><MaintainProPage /></P>} />
              {/* Sprint T-Phase-1.C.1a · ServiceDesk Masters Foundation · 12th card on Shell */}
              <Route path="/erp/servicedesk" element={<P><ServiceDeskPage /></P>} />
              <Route path="/erp/comply360" element={<P><Comply360Page /></P>} />
              <Route path="/erp/fincore/invoice-print" element={<P><SalesInvoicePrint /></P>} />
              <Route path="/erp/fincore/receipt-print" element={<P><ReceiptPrint /></P>} />
              <Route path="/erp/fincore/payment-print" element={<P><PaymentPrint /></P>} />
              <Route path="/erp/fincore/contra-print" element={<P><ContraEntryPrint /></P>} />
              <Route path="/erp/fincore/journal-print" element={<P><JournalEntryPrint /></P>} />
              <Route path="/erp/fincore/purchase-invoice-print" element={<P><PurchaseInvoicePrint /></P>} />
              <Route path="/erp/fincore/credit-note-print" element={<P><CreditNotePrint /></P>} />
              <Route path="/erp/fincore/debit-note-print" element={<P><DebitNotePrint /></P>} />
              <Route path="/erp/fincore/delivery-note-print" element={<P><DeliveryNotePrint /></P>} />
              <Route path="/erp/fincore/receipt-note-print" element={<P><ReceiptNotePrint /></P>} />
              <Route path="/erp/fincore/stock-adjustment-print" element={<P><StockAdjustmentPrint /></P>} />
              <Route path="/erp/fincore/stock-journal-print" element={<P><StockJournalPrint /></P>} />
              <Route path="/erp/fincore/stock-transfer-print" element={<P><StockTransferPrint /></P>} />
              <Route path="/erp/fincore/mfg-journal-print" element={<P><ManufacturingJournalPrint /></P>} />
              <Route path="/erp/fincore/settings/print-config" element={<P><PrintConfigPage /></P>} />
              <Route path="/erp/fincore/settings/register-config" element={<P><RegisterConfigPage /></P>} />
              {/* T-T8.2-Foundation · PayOut hub nested routes */}
              <Route path="/erp/payout" element={<P><PayOutPage /></P>}>
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<PayOutDashboard />} />
                <Route path="vendor-payment" element={<VendorPaymentEntry />} />
                <Route path="payment-register" element={<PaymentRegisterRoute />} />
                {/* T-T8.3-AdvanceIntel · Bill Settlement screen */}
                <Route path="bill-settlement" element={<BillSettlement />} />
                {/* T-T8.4-Requisition-Universal · 3 routes */}
                <Route path="requisition" element={<PaymentRequisitionEntry />} />
                <Route path="requisition-inbox" element={<RequisitionInbox />} />
                <Route path="requisition-history" element={<RequisitionHistory />} />
                {/* T-T8.5-MSME-Compliance · MSME 43B(h) Alerts */}
                <Route path="msme-alerts" element={<MSMEAlerts />} />
                {/* T-T8.6-VendorAnalytics · 5-tier vendor performance analytics */}
                <Route path="vendor-analytics" element={<VendorAnalytics />} />
                {/* T-T8.7-SmartAP · 5 industry firsts (hub + 4 sub-screens) */}
                <Route path="smart-ap" element={<SmartAPHub />} />
                <Route path="smart-ap/bulk-pay" element={<SmartAPHub />} />
                <Route path="smart-ap/auto-pay-rules" element={<SmartAPHub />} />
                <Route path="smart-ap/cash-flow" element={<SmartAPHub />} />
                <Route path="smart-ap/forecast" element={<SmartAPHub />} />
                <Route path="smart-ap/bank-files" element={<SmartAPHub />} />
                {/* Direct deep-links to sub-screens (bypass hub tabs · legacy/frontdesk) */}
                <Route path="smart-ap-bulk-pay" element={<BulkPayBuilder />} />
                <Route path="smart-ap-auto-pay-rules" element={<AutoPayRulesEditor />} />
                <Route path="smart-ap-cash-flow" element={<CashFlowDashboard />} />
              </Route>
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
              {/* T-Phase-2.HK-2 · MainStoreHub Rename · canonical route + legacy redirect */}
              <Route path="/erp/main-store-hub" element={<P><MainStoreHub /></P>} />
              <Route path="/erp/inventory-hub" element={<Navigate to="/erp/main-store-hub" replace />} />
              <Route path="/erp/procure-hub" element={<P><Procure360Page /></P>} />
              <Route path="/erp/procure-hub/*" element={<P><Procure360Page /></P>} />
              {/* T-Phase-2.HK-2 · DepartmentStores Rename · canonical route + legacy redirect */}
              <Route path="/erp/department-store" element={<P><DepartmentStorePage /></P>} />
              <Route path="/erp/store-hub" element={<Navigate to="/erp/department-store" replace />} />
              <Route path="/erp/bill-passing" element={<P><BillPassingPage /></P>} />
              {/* Sprint T-Phase-1.2.6f-d-2-card4-4-pre-1 · Block E · D-304 · GateFlow */}
              <Route path="/erp/gateflow" element={<P><GateFlowPage /></P>} />
              {/* Sprint T-Phase-1.2.6f-d-2-card5-5-pre-1 · Block G · D-326 · QualiCheck */}
              <Route path="/erp/qualicheck" element={<P><QualiCheckPage /></P>} />
              <Route path="/erp/docvault" element={<P><DocVaultPage /></P>} />
              <Route path="/erp/requestx" element={<P><RequestX /></P>} />
              <Route path="/erp/vendor-portal" element={<P><VendorPortal /></P>} />
              <Route path="/erp/vendor-portal/*" element={<P><VendorPortal /></P>} />
              {/* Sprint T-Phase-1.EX-1 · EximX Foundation */}
              <Route path="/erp/eximx" element={<P><EximXPage /></P>} />
              <Route path="/erp/eximx/export/*" element={<P><EximXExportLayout /></P>} />
              <Route path="/erp/eximx/import/*" element={<P><EximXImportLayout /></P>} />
              <Route path="/erp/eximx/unified/*" element={<P><EximXUnifiedLayout /></P>} />
              {/* Sprint T-Phase-2.B-2 · D-NEW-FA + D-NEW-FE */}
              <Route path="/erp/eximx/finance/cross-entity-realisation" element={<P><CrossEntityRealisationDashboard /></P>} />
              <Route path="/erp/eximx/compliance/form-3ceb" element={<P><Form3CEBDashboard /></P>} />
              {/* Sprint T-Phase-2.A-EX-12 · D-NEW-FJ + D-NEW-FK */}
              <Route path="/erp/eximx/finance/lc" element={<P><LCList /></P>} />
              <Route path="/erp/eximx/finance/lc/:id" element={<P><LCDetail /></P>} />
              <Route path="/erp/eximx/finance/packing-credit" element={<P><PackingCreditList /></P>} />
              <Route path="/erp/eximx/finance/packing-credit/:id" element={<P><PackingCreditDetail /></P>} />
              <Route path="/erp/production" element={<P><ProductionPage /></P>} />
              <Route path="/erp/production/*" element={<P><ProductionPage /></P>} />
              {/* T-Phase-2.HK-2 · MainStoreHub sub-routes — canonical /erp/main-store-hub/* */}
              <Route path="/erp/main-store-hub/parametric" element={<P><Parametric /></P>} />
              <Route path="/erp/main-store-hub/batch-grid" element={<P><BatchGrid /></P>} />
              <Route path="/erp/main-store-hub/serial-grid" element={<P><SerialGrid /></P>} />
              <Route path="/erp/main-store-hub/stock-matrix" element={<P><StockMatrix /></P>} />
              <Route path="/erp/main-store-hub/classify" element={<P><Classify /></P>} />
              <Route path="/erp/main-store-hub/brand-matrix" element={<P><BrandMatrix /></P>} />
              <Route path="/erp/main-store-hub/storage-matrix" element={<P><StorageMatrix /></P>} />
              <Route path="/erp/main-store-hub/measure-x" element={<P><MeasureX /></P>} />
              <Route path="/erp/main-store-hub/item-craft" element={<P><ItemCraft /></P>} />
              <Route path="/erp/main-store-hub/bom-master" element={<P><BOMMaster /></P>} />
              <Route path="/erp/main-store-hub/code-matrix" element={<P><CodeMatrix /></P>} />
              <Route path="/erp/main-store-hub/item-templates" element={<P><ItemTemplates /></P>} />
              <Route path="/erp/main-store-hub/label-templates" element={<P><LabelTemplates /></P>} />
              <Route path="/erp/main-store-hub/barcode-generator" element={<P><BarcodeGenerator /></P>} />
              <Route path="/erp/main-store-hub/asset-tags" element={<P><AssetTagManager /></P>} />
              <Route path="/erp/main-store-hub/bin-labels" element={<P><BinLocationLabels /></P>} />
              <Route path="/erp/main-store-hub/print-queue" element={<P><PrintQueue /></P>} />
              <Route path="/erp/main-store-hub/rfid-manager" element={<P><RFIDManager /></P>} />
              <Route path="/erp/main-store-hub/opening-stock" element={<P><OpeningStockEntry /></P>} />
              <Route path="/erp/main-store-hub/item-rates" element={<P><ItemRatesMRP /></P>} />
              <Route path="/erp/main-store-hub/price-lists" element={<P><PriceListManager /></P>} />
              <Route path="/erp/main-store-hub/reorder-alerts" element={<P><ReorderAlerts /></P>} />
              {/* T-Phase-2.HK-2 · Legacy /erp/inventory-hub/* redirects (bookmark preservation) */}
              <Route path="/erp/inventory-hub/parametric" element={<Navigate to="/erp/main-store-hub/parametric" replace />} />
              <Route path="/erp/inventory-hub/batch-grid" element={<Navigate to="/erp/main-store-hub/batch-grid" replace />} />
              <Route path="/erp/inventory-hub/serial-grid" element={<Navigate to="/erp/main-store-hub/serial-grid" replace />} />
              <Route path="/erp/inventory-hub/stock-matrix" element={<Navigate to="/erp/main-store-hub/stock-matrix" replace />} />
              <Route path="/erp/inventory-hub/classify" element={<Navigate to="/erp/main-store-hub/classify" replace />} />
              <Route path="/erp/inventory-hub/brand-matrix" element={<Navigate to="/erp/main-store-hub/brand-matrix" replace />} />
              <Route path="/erp/inventory-hub/storage-matrix" element={<Navigate to="/erp/main-store-hub/storage-matrix" replace />} />
              <Route path="/erp/inventory-hub/measure-x" element={<Navigate to="/erp/main-store-hub/measure-x" replace />} />
              <Route path="/erp/inventory-hub/item-craft" element={<Navigate to="/erp/main-store-hub/item-craft" replace />} />
              <Route path="/erp/inventory-hub/bom-master" element={<Navigate to="/erp/main-store-hub/bom-master" replace />} />
              <Route path="/erp/inventory-hub/code-matrix" element={<Navigate to="/erp/main-store-hub/code-matrix" replace />} />
              <Route path="/erp/inventory-hub/item-templates" element={<Navigate to="/erp/main-store-hub/item-templates" replace />} />
              <Route path="/erp/inventory-hub/label-templates" element={<Navigate to="/erp/main-store-hub/label-templates" replace />} />
              <Route path="/erp/inventory-hub/barcode-generator" element={<Navigate to="/erp/main-store-hub/barcode-generator" replace />} />
              <Route path="/erp/inventory-hub/asset-tags" element={<Navigate to="/erp/main-store-hub/asset-tags" replace />} />
              <Route path="/erp/inventory-hub/bin-labels" element={<Navigate to="/erp/main-store-hub/bin-labels" replace />} />
              <Route path="/erp/inventory-hub/print-queue" element={<Navigate to="/erp/main-store-hub/print-queue" replace />} />
              <Route path="/erp/inventory-hub/rfid-manager" element={<Navigate to="/erp/main-store-hub/rfid-manager" replace />} />
              <Route path="/erp/inventory-hub/opening-stock" element={<Navigate to="/erp/main-store-hub/opening-stock" replace />} />
              <Route path="/erp/inventory-hub/item-rates" element={<Navigate to="/erp/main-store-hub/item-rates" replace />} />
              <Route path="/erp/inventory-hub/price-lists" element={<Navigate to="/erp/main-store-hub/price-lists" replace />} />
              <Route path="/erp/inventory-hub/reorder-alerts" element={<Navigate to="/erp/main-store-hub/reorder-alerts" replace />} />
              {/* Sprint 79c · T-Phase-5.A.1.11-PASS-C · Atomic 29-redirect sweep · card routes → Comply360 native targets · all use replace prop (browser-history correctness · DP-S79-3) · Form3CEB target = actual S77b path (DP-S79-4 Option A) · FA-redirect lock (DP-S79-5) */}
              <Route path="/erp/fincore/reports/gst/GSTR1" element={<Navigate to="/erp/comply360/tax-gst/gstr-1" replace />} />
              <Route path="/erp/fincore/reports/gst/GSTR3B" element={<Navigate to="/erp/comply360/tax-gst/gstr-3b" replace />} />
              <Route path="/erp/fincore/reports/gst/GSTR9" element={<Navigate to="/erp/comply360/tax-gst/gstr-9" replace />} />
              <Route path="/erp/fincore/reports/gst/GSTR2Register" element={<Navigate to="/erp/comply360/tax-gst/gstr-2b" replace />} />
              <Route path="/erp/fincore/reports/gst/ITCRegister" element={<Navigate to="/erp/comply360/tax-gst/itc-register" replace />} />
              <Route path="/erp/fincore/reports/gst/RCMRegister" element={<Navigate to="/erp/comply360/tax-gst/rcm-register" replace />} />
              <Route path="/erp/fincore/reports/gst/RCMComplianceReport" element={<Navigate to="/erp/comply360/tax-gst/rcm-compliance" replace />} />
              <Route path="/erp/fincore/reports/gst/Clause44Report" element={<Navigate to="/erp/comply360/tax-gst/clause-44" replace />} />
              <Route path="/erp/fincore/reports/gst/RecoPanel" element={<Navigate to="/erp/comply360/tax-gst/reconciliation" replace />} />
              <Route path="/erp/fincore/reports/Form24Q" element={<Navigate to="/erp/comply360/tax-gst/form-24q" replace />} />
              <Route path="/erp/fincore/reports/Form26Q" element={<Navigate to="/erp/comply360/tax-gst/form-26q" replace />} />
              <Route path="/erp/fincore/reports/Form27Q" element={<Navigate to="/erp/comply360/tax-gst/form-27q" replace />} />
              <Route path="/erp/fincore/reports/Form26AS" element={<Navigate to="/erp/comply360/tax-gst/form-26as" replace />} />
              <Route path="/erp/fincore/reports/Form3CD" element={<Navigate to="/erp/comply360/tax-gst/form-3cd" replace />} />
              <Route path="/erp/fincore/reports/TDSAdvance" element={<Navigate to="/erp/comply360/tax-gst/tds-advance" replace />} />
              <Route path="/erp/fincore/reports/TDSAnalyticsReport" element={<Navigate to="/erp/comply360/tax-gst/tds-analytics" replace />} />
              <Route path="/erp/fincore/reports/AuditDashboard" element={<Navigate to="/erp/comply360/internal-audit/dashboard" replace />} />
              <Route path="/erp/fincore/reports/AuditTrailReport" element={<Navigate to="/erp/comply360/internal-audit/audit-trail" replace />} />
              <Route path="/erp/fincore/statutory-fa-pack/CARO20Disclosure" element={<Navigate to="/erp/comply360/companies/caro-2020" replace />} />
              <Route path="/erp/fincore/statutory-fa-pack/IndAS116ROUSchedule" element={<Navigate to="/erp/comply360/companies/ind-as-116" replace />} />
              <Route path="/erp/fincore/statutory-fa-pack/MSMECapitalBreaches" element={<Navigate to="/erp/comply360/vendor/msme-breaches" replace />} />
              <Route path="/erp/fincore/statutory-fa-pack/EPCGStatusReport" element={<Navigate to="/erp/comply360/exim/epcg-status" replace />} />
              <Route path="/erp/fincore/statutory-fa-pack/FALedgerPackReport" element={<Navigate to="/erp/comply360/fixed-assets/ledger-pack" replace />} />
              <Route path="/erp/pay-hub/transactions/StatutoryReturns" element={<Navigate to="/erp/comply360/payroll/statutory-returns" replace />} />
              <Route path="/erp/eximx/compliance/CAROTARRoOMatrix" element={<Navigate to="/erp/comply360/exim/carotar-roo" replace />} />
              <Route path="/erp/eximx/compliance/EWSDashboard" element={<Navigate to="/erp/comply360/exim/ews-dashboard" replace />} />
              <Route path="/erp/eximx/compliance/AEOBenefitsDashboard" element={<Navigate to="/erp/comply360/exim/aeo-benefits" replace />} />
              <Route path="/erp/eximx/compliance/Form3CEBDashboard" element={<Navigate to="/erp/comply360/exim/foreign-tax/form-3ceb" replace />} />
              <Route path="/erp/vendor-portal/panels/Msme43BhTrackerPanel" element={<Navigate to="/erp/comply360/vendor/msme-43bh-tracker" replace />} />
              <Route path="/erp/command-center" element={<P><CommandCenterPage /></P>} />
              <Route path="/erp/pay-hub" element={<P><PayHubPage /></P>} />
              <Route path="/erp/salesx" element={<P><SalesXPage /></P>} />
              <Route path="/erp/salesx/proforma-print/:quotationId" element={<P><ProformaInvoicePrint /></P>} />
              <Route path="/erp/receivx" element={<P><ReceivXPage /></P>} />
              {/* Sprint T-Phase-1.2.5h-b2 · Smoke test gated to non-prod (L-1) */}
              {!import.meta.env.PROD && (
                <Route path="/erp/smoke-test" element={<P><SmokeTestRunner /></P>} />
              )}
              <Route path="/erp/command-center/errors" element={<P><RecentErrorsPage /></P>} />
              <Route path="/erp" element={<P><ErpDashboard /></P>} />
              <Route path="/erp/dashboard" element={<P><ErpDashboard /></P>} />
              {/* 🆕 Sprint 68 FAR-4 · Block 14 · FAR-2 deferred Block 9 route supplement · Q-LOCK-12 A */}
              <Route path="/erp/fa-physical-verification" element={<P><FAPhysicalVerificationPage entityCode="SINHA" /></P>} />
              <Route path="/erp/fa-calibration-status" element={<P><FACalibrationStatusReportPage entityCode="SINHA" /></P>} />
              <Route path="/erp/fa-amc-renewal-pipeline" element={<P><FAAMCRenewalPipelinePage entityCode="SINHA" /></P>} />
              <Route path="/erp/fa-vehicle-register" element={<P><FAVehicleRegisterPage entityCode="SINHA" /></P>} />
              {/* [Sprint 68 FAR-4 Wire-Up T-fix · Tier 3 · 2 NEW routes · F-13 + F-DEAD-2 absorption] */}
              <Route path="/mobile/fa-scan" element={<P><MobileFAScanPage /></P>} />
              <Route path="/erp/fincore/statutory-fa-pack/epcg-status" element={<P><EPCGStatusReport /></P>} />
              <Route path="/partner" element={<PartnerDashboard />} />
              <Route path="/partner/dashboard" element={<PartnerDashboard />} />
              <Route path="/erp/distributor/login" element={<DistributorLogin />} />
              <Route path="/erp/distributor-hub" element={<P><DistributorHubPage /></P>} />
              <Route path="/erp/customer-hub" element={<P><CustomerHubPage /></P>} />
              <Route path="/erp/customer-hub/*" element={<P><CustomerHubPage /></P>} />
              {/* T-Phase-1.1.0 · Backward-compat redirects: legacy /erp/backoffice/* → /erp/frontdesk */}
              <Route path="/erp/backoffice/dispatch" element={<Navigate to="/erp/logistics" replace />} />
              <Route path="/erp/backoffice/dispatch/*" element={<Navigate to="/erp/logistics" replace />} />
              <Route path="/erp/backoffice/*" element={<Navigate to="/erp/frontdesk" replace />} />
              <Route path="/erp/backoffice" element={<Navigate to="/erp/frontdesk" replace />} />
              {/* Sprint T-Phase-1.1.1p-v2 — backward-compat redirect old logistics path */}
              <Route path="/erp/frontdesk/dispatch" element={<Navigate to="/erp/logistics" replace />} />
              <Route path="/erp/frontdesk/dispatch/*" element={<Navigate to="/erp/logistics" replace />} />
              {/* New canonical routes */}
              <Route path="/erp/logistics" element={<P><DispatchHubPage /></P>} />
              <Route path="/erp/logistics/*" element={<P><DispatchHubPage /></P>} />
              <Route path="/erp/dispatch" element={<P><DispatchOpsPage /></P>} />
              <Route path="/erp/dispatch/*" element={<P><DispatchOpsPage /></P>} />
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
              {/* Sprint 15c-2 — Logistic portal (own auth boundary via LogisticLayout) */}
              <Route path="/erp/logistic/login" element={<LogisticLogin />} />
              <Route path="/erp/logistic/dashboard" element={<LogisticDashboard />} />
              <Route path="/erp/logistic/invoices/new" element={<LogisticInvoiceSubmit />} />
              <Route path="/erp/logistic/lr-queue" element={<LogisticLRQueue />} />
              <Route path="/erp/logistic/payments" element={<LogisticPayments />} />
              <Route path="/erp/logistic/disputes" element={<LogisticDisputes />} />
              <Route path="/erp/logistic/profile" element={<LogisticProfile />} />
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
              {/* T-Phase-1.H.1 · Q-LOCK-7a · backward-compat for old /erp/finecore bookmarks */}
              <Route path="/erp/finecore" element={<FineCoreLegacyRedirect />} />
              <Route path="/erp/finecore/*" element={<FineCoreLegacyRedirect />} />
              {/* T-Phase-1.H.2 · Q-LOCK-7a · backward-compat for old /erp/qulicheak + /operix-go/qulicheak bookmarks · D-NEW-CM Legacy Redirect Convention · D-NEW-CN canonical */}
              <Route path="/erp/qulicheak" element={<QulicheakLegacyRedirect />} />
              <Route path="/erp/qulicheak/*" element={<QulicheakLegacyRedirect />} />
              <Route path="/operix-go/qulicheak" element={<QulicheakLegacyRedirect />} />
              <Route path="*" element={<Navigate to="/auth/login" replace />} />
            </Routes>
          </Suspense>
          <ConditionalDishani />
          {import.meta.env.DEV && DevNavPanel && <React.Suspense fallback={null}><DevNavPanel /></React.Suspense>}
          </FactoryProvider>
          </ERPCompanyProvider>
        </BrowserRouter>
        </ErrorBoundary>
      </DishaniProvider>
    </TooltipProvider>
  </GlobalDateRangeProvider>
  </LanguageProvider>
  </ThemeProvider>
);

export default App;
