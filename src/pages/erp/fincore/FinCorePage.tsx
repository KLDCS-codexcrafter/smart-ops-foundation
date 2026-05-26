/**
 * FinCorePage.tsx — Main Fin Core container
 * Mirrors PayHubPage.tsx — SidebarProvider + FinCoreSidebar + content area.
 * [JWT] All data loaded via hooks
 */
// i18n: Sprint T-Phase-1.2.5h-c2-fix · minimum-viable migration
import { useState, useCallback, useEffect } from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { FinCoreSidebar } from './FinCoreSidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import { logAudit } from '@/lib/card-audit-engine';
import { recordActivity } from '@/lib/cross-card-activity-engine';
import { rememberModule } from '@/lib/breadcrumb-memory';
import { GuidedTourOverlay } from '@/components/layout/GuidedTourOverlay';
import { DraftTray, type FinCoreModule, type DraftEntry } from '@/components/fincore/DraftTray';
import { ComingSoonPanel } from '@/components/fincore/ComingSoonPanel';
import { FinCoreHubPanel } from './FinCoreHub';
import { SalesInvoicePanel } from '@/pages/erp/accounting/vouchers/SalesInvoice';
import { PurchaseInvoicePanel } from '@/pages/erp/accounting/vouchers/PurchaseInvoice';
import { ReceiptPanel } from '@/pages/erp/accounting/vouchers/Receipt';
import { PaymentPanel } from '@/pages/erp/accounting/vouchers/Payment';
import { JournalEntryPanel } from '@/pages/erp/accounting/vouchers/JournalEntry';
import { ContraEntryPanel } from '@/pages/erp/accounting/vouchers/ContraEntry';
import { CreditNotePanel } from '@/pages/erp/accounting/vouchers/CreditNote';
import { DebitNotePanel } from '@/pages/erp/accounting/vouchers/DebitNote';
import { DeliveryNotePanel } from '@/pages/erp/accounting/vouchers/DeliveryNote';
import { ReceiptNotePanel } from '@/pages/erp/accounting/vouchers/ReceiptNote';
import { StockJournalPanel } from '@/pages/erp/accounting/vouchers/StockJournal';
import { ManufacturingJournalPanel } from '@/pages/erp/accounting/vouchers/ManufacturingJournal';
import { StockAdjustmentPanel } from '@/pages/erp/accounting/vouchers/StockAdjustment';
import { StockTransferDispatchPanel } from '@/pages/erp/accounting/vouchers/StockTransferDispatch';
import { PurchaseOrderPanel } from '@/pages/erp/fincore/PurchaseOrder';
import { SalesOrderPanel } from '@/pages/erp/fincore/SalesOrder';
import { DayBookPanel } from './reports/DayBook';
import { LedgerReportPanel } from './reports/LedgerReport';
import { TrialBalancePanel } from './reports/TrialBalance';
import { ProfitLossPanel } from './reports/ProfitLoss';
import { BalanceSheetPanel } from './reports/BalanceSheet';
import { StockSummaryPanel } from './reports/StockSummary';
import { OutstandingAgingPanel } from './reports/OutstandingAging';
import { BankReconciliationPanel } from './reports/BankReconciliation';
import { BankReconciliationAdvancedPanel } from './BankReconciliationAdvancedPanel';
import { AssetUnificationPanel } from './AssetUnificationPanel';
import { ChequeManagementPanel } from './reports/ChequeManagement';
import { TDSAdvancePanel } from './reports/TDSAdvance';
import { GSTR1Panel } from './reports/gst/GSTR1';
import { GSTR3BPanel } from './reports/gst/GSTR3B';
import { GSTR9Panel } from './reports/gst/GSTR9';
import { GSTR2RegisterPanel } from './reports/gst/GSTR2Register';
import { ITCRegisterPanel } from './reports/gst/ITCRegister';
import { RecoPanelGST } from './reports/gst/RecoPanel';
import { Form24QPanel } from './reports/Form24Q';
import { Form26QPanel } from './reports/Form26Q';
import { Form27QPanel } from './reports/Form27Q';
import { ChallanRegisterPanel } from './reports/ChallanRegister';
import { TDSAnalyticsPanel } from './reports/TDSAnalyticsReport';
import { Form26ASPanel } from './reports/Form26AS';
import { AuditDashboardPanel } from './reports/AuditDashboard';
import { Form3CDPanel } from './reports/Form3CD';
import { Clause44ReportPanel } from './reports/gst/Clause44Report';
import { IRNRegisterPanel } from './reports/IRNRegister';
import { EWayBillRegisterPanel } from './reports/EWayBillRegister';
import AuditTrailReport from './reports/AuditTrailReport';
import MonthlyProductionAccounts from './reports/MonthlyProductionAccounts';
import { CapitalAssetMasterPanel } from '@/pages/erp/accounting/capital-assets/CapitalAssetMaster';
import { DepreciationWorkingsPanel } from '@/pages/erp/accounting/capital-assets/DepreciationWorkings';
import { AMCWarrantyTrackerPanel } from '@/pages/erp/accounting/capital-assets/AMCWarrantyTracker';
import { AssetDisposalPanel } from '@/pages/erp/accounting/capital-assets/AssetDisposal';
import { CWIPRegisterPanel } from '@/pages/erp/accounting/capital-assets/CWIPRegister';
import { FAReportsPanel } from '@/pages/erp/accounting/capital-assets/FAReports';
import { FixedAssetRegisterPanel } from '@/pages/erp/accounting/capital-assets/FixedAssetRegister';
// [Sprint 66 FAR-2 · Block 9 · FA Physical-Reality panels]
import { FAPhysicalVerificationPanel } from '@/pages/erp/accounting/capital-assets/FAPhysicalVerification';
import { FACalibrationStatusReportPanel } from '@/pages/erp/accounting/capital-assets/FACalibrationStatusReport';
import { FAAMCRenewalPipelinePanel } from '@/pages/erp/accounting/capital-assets/FAAMCRenewalPipeline';
import { FAVehicleRegisterPanel } from '@/pages/erp/accounting/capital-assets/FAVehicleRegister';
// [Sprint 67 FAR-3 · Block 11 · Compute Engine panels · Q-LOCK-9/10/11 A]
import { MultiGAAPDepreciationReportPanel } from '@/pages/erp/accounting/capital-assets/MultiGAAPDepreciationReport';
import { UOPDepreciationReportPanel } from '@/pages/erp/accounting/capital-assets/UOPDepreciationReport';
import { ComponentDepreciationReportPanel } from '@/pages/erp/accounting/capital-assets/ComponentDepreciationReport';
import { OpeningDepreciationMigrationToolPanel } from '@/pages/erp/accounting/capital-assets/OpeningDepreciationMigrationTool';
import { AssetMasterExcelImportPanel } from '@/pages/erp/accounting/capital-assets/AssetMasterExcelImport';
// [Sprint 65 FAR-1 · Statutory FA Pack panels]
import { CARO20DisclosurePanel } from './statutory-fa-pack/CARO20Disclosure';
import { MSMECapitalBreachesPanel } from './statutory-fa-pack/MSMECapitalBreaches';
import { IndAS116ROUSchedulePanel } from './statutory-fa-pack/IndAS116ROUSchedule';
import { FALedgerPackReportPanel } from './statutory-fa-pack/FALedgerPackReport';
// [T10-pre.2d-B] 13 voucher-type register panels
import { SalesRegisterPanel } from './registers/SalesRegister';
import { PurchaseRegisterPanel } from './registers/PurchaseRegister';
import { ReceiptRegisterPanel } from './registers/ReceiptRegister';
import { PaymentRegisterPanel } from './registers/PaymentRegister';
import { ContraRegisterPanel } from './registers/ContraRegister';
import { JournalRegisterPanel } from './registers/JournalRegister';
import { CreditNoteRegisterPanel } from './registers/CreditNoteRegister';
import { DebitNoteRegisterPanel } from './registers/DebitNoteRegister';
import { DeliveryNoteRegisterPanel } from './registers/DeliveryNoteRegister';
import { ReceiptNoteRegisterPanel } from './registers/ReceiptNoteRegister';
import { StockAdjustmentRegisterPanel } from './registers/StockAdjustmentRegister';
import { StockJournalRegisterPanel } from './registers/StockJournalRegister';
import { StockTransferRegisterPanel } from './registers/StockTransferRegister';
import { useEntityCode } from '@/hooks/useEntityCode';
import { SelectCompanyGate } from '@/components/layout/SelectCompanyGate';
import { useT } from '@/lib/i18n-engine';

const breadcrumbLabels: Partial<Record<FinCoreModule, string>> = {
  'fc-hub': 'Hub Overview',
  'fc-txn-sales-invoice': 'Sales Invoice',
  'fc-txn-purchase-invoice': 'Purchase Invoice',
  'fc-txn-receipt': 'Receipt',
  'fc-txn-payment': 'Payment',
  'fc-txn-journal': 'Journal Entry',
  'fc-txn-contra': 'Contra',
  'fc-txn-credit-note': 'Credit Note',
  'fc-txn-debit-note': 'Debit Note',
  'fc-txn-delivery-note': 'Delivery Note',
  'fc-txn-receipt-note': 'Receipt Note (GRN)',
  'fc-inv-stock-adjustment': 'Stock Adjustment',
  'fc-inv-stock-transfer-dispatch': 'Stock Transfer — Dispatch',
  'fc-inv-stock-journal': 'Stock Journal (legacy)',
  'fc-inv-mfg-journal': 'Manufacturing Journal',
  'fc-ord-purchase-order': 'Purchase Order',
  'fc-ord-sales-order': 'Sales Order',
  'fc-rpt-daybook': 'Day Book',
  'fc-rpt-ledger': 'Ledger Report',
  'fc-rpt-trial-balance': 'Trial Balance',
  'fc-rpt-pl': 'Profit & Loss',
  'fc-rpt-bs': 'Balance Sheet',
  'fc-rpt-stock-summary': 'Stock Summary',
  'fc-rpt-outstanding': 'Outstanding Aging',
  'fc-bnk-reconciliation': 'Bank Reconciliation',
  'fc-bnk-cheque': 'Cheque Management',
  'fc-out-receivables': 'Receivables',
  'fc-out-payables': 'Payables',
  'fc-tds-advance': 'TDS Advance',
  'fc-rpt-26as': 'Form 26AS Reconciliation',
  'fc-rpt-audit-trail': 'Audit Trail (MCA Rule 3(1))',
  'fc-rpt-monthly-production': 'Monthly Production Accounts (CGST Rule 56(12))',
  'fc-gst-gstr1': 'GSTR-1',
  'fc-gst-gstr3b': 'GSTR-3B',
  'fc-gst-gstr9': 'GSTR-9 Annual Return',
  'fc-gst-gstr2': 'GSTR-2 Purchase Register',
  'fc-gst-itc': 'ITC Register',
  'fc-gst-2a': '2A/2B Reconciliation',
  'fc-gst-irn-register': 'IRN Register',
  'fc-gst-ewb-register': 'E-Way Bill Register',
  'fc-audit-dashboard': 'Audit Dashboard',
  'fc-audit-3cd': 'Form 3CD',
  'fc-audit-clause44': 'Clause 44 Report',
  'fc-fa-register':     'Fixed Asset Register',
  'fc-fa-master':       'Capital Asset Master',
  'fc-fa-depreciation': 'Depreciation Workings',
  'fc-fa-amc':          'AMC & Warranty',
  'fc-fa-disposal':     'Asset Disposal',
  'fc-fa-cwip':         'Capital WIP',
  'fc-fa-reports':      'FA Reports',
  // [Sprint 65 FAR-1]
  'fc-fa-caro-20':       'CARO 2020 Disclosure (3(i))',
  'fc-fa-msme-capital':  'MSME Capital Breaches (43B(h))',
  'fc-fa-ind-as-116':    'Ind AS 116 ROU Schedule',
  'fc-fa-ledger-pack':   'FA Ledger Pack (Schedule III)',
  // [T10-pre.2d-B] 13 voucher-type registers
  'fc-rpt-sales-register':            'Sales Register',
  'fc-rpt-purchase-register':         'Purchase Register',
  'fc-rpt-receipt-register':          'Receipt Register',
  'fc-rpt-payment-register':          'Payment Register',
  'fc-rpt-contra-register':           'Contra Register',
  'fc-rpt-journal-register':          'Journal Register',
  'fc-rpt-credit-note-register':      'Credit Note Register',
  'fc-rpt-debit-note-register':       'Debit Note Register',
  'fc-rpt-delivery-note-register':    'Delivery Note Register',
  'fc-rpt-receipt-note-register':     'Receipt Note Register',
  'fc-rpt-stock-adjustment-register': 'Stock Adjustment Register',
  'fc-rpt-stock-journal-register':    'Stock Journal Register',
  'fc-rpt-stock-transfer-register':   'Stock Transfer Register',
  // [HK-6 Sprint] 26th + 27th SIBLING consumers
  'fc-bnk-reconciliation-v2':         'Bank Reconciliation (v2 · Engine)',
  'fc-rpt-asset-unification':         'Asset Unification (3-Shape)',
};

export function FinCorePagePanel() {
  const t = useT();
  const [activeModule, setActiveModule] = useState<FinCoreModule>('fc-hub');
  const [drafts, setDrafts] = useState<DraftEntry[]>([]);
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);
  // [T10-pre.2d-B] Pre-filter passed to DayBookPanel when arriving via register drill-down.
  const [dayBookInitialFilters, setDayBookInitialFilters] = useState<Record<string, unknown> | undefined>(undefined);
  const { entityCode } = useEntityCode();
  const { entityCode: entCode, userId } = useCardEntitlement();

  // [T10-pre.2d-B] Clear DayBook drill-down filters when leaving the DayBook module.
  useEffect(() => {
    if (activeModule !== 'fc-rpt-daybook') setDayBookInitialFilters(undefined);
  }, [activeModule]);

  useEffect(() => {
    if (!entityCode) return;
    logAudit({
      entityCode: entCode, userId, userName: userId,
      cardId: 'fincore',
      action: 'card_open',
    });
  }, [entCode, userId, entityCode]);

  useEffect(() => {
    if (!entityCode) return;
    rememberModule('fincore', activeModule);
    logAudit({
      entityCode: entCode, userId, userName: userId,
      cardId: 'fincore',
      moduleId: activeModule,
      action: 'module_open',
    });
    recordActivity(entCode, userId, {
      card_id: 'fincore',
      kind: 'module',
      ref_id: activeModule,
      title: `FinCore · ${activeModule}`,
      subtitle: null,
      deep_link: `/erp/fincore#${activeModule}`,
    });
  }, [activeModule, entCode, userId, entityCode]);

  const addToDraftTray = useCallback((draft: DraftEntry) => {
    if (drafts.length >= 5) {
      toast.warning('5 entries already open — post or discard one first.');
      return;
    }
    setDrafts(prev => [...prev, draft]);
    setActiveDraftId(draft.id);
    toast.info('Entry saved to draft tray');
  }, [drafts.length]);

  const handleCloseDraft = useCallback((id: string) => {
    setDrafts(prev => prev.filter(d => d.id !== id));
    if (activeDraftId === id) setActiveDraftId(null);
  }, [activeDraftId]);

  const handleSwitchDraft = useCallback((id: string) => {
    const draft = drafts.find(d => d.id === id);
    if (draft) {
      setActiveDraftId(id);
      setActiveModule(draft.module);
    }
  }, [drafts]);

  const renderModule = () => {
    switch (activeModule) {
      case 'fc-hub': return <FinCoreHubPanel onNavigate={mod => setActiveModule(mod as FinCoreModule)} />;
      case 'fc-txn-sales-invoice': return <SalesInvoicePanel onSaveDraft={addToDraftTray} />;
      case 'fc-txn-purchase-invoice': return <PurchaseInvoicePanel onSaveDraft={addToDraftTray} />;
      case 'fc-txn-receipt': return <ReceiptPanel onSaveDraft={addToDraftTray} />;
      case 'fc-txn-payment': return <PaymentPanel onSaveDraft={addToDraftTray} />;
      case 'fc-txn-journal': return <JournalEntryPanel onSaveDraft={addToDraftTray} />;
      case 'fc-txn-contra': return <ContraEntryPanel onSaveDraft={addToDraftTray} />;
      case 'fc-txn-credit-note': return <CreditNotePanel onSaveDraft={addToDraftTray} />;
      case 'fc-txn-debit-note': return <DebitNotePanel onSaveDraft={addToDraftTray} />;
      case 'fc-txn-delivery-note': return <DeliveryNotePanel onSaveDraft={addToDraftTray} />;
      case 'fc-txn-receipt-note': return <ReceiptNotePanel onSaveDraft={addToDraftTray} />;
      case 'fc-inv-stock-adjustment': return <StockAdjustmentPanel onSaveDraft={addToDraftTray} />;
      case 'fc-inv-stock-transfer-dispatch': return <StockTransferDispatchPanel onSaveDraft={addToDraftTray} />;
      case 'fc-inv-stock-journal': return <StockJournalPanel onSaveDraft={addToDraftTray} />;
      case 'fc-inv-mfg-journal': return <ManufacturingJournalPanel onSaveDraft={addToDraftTray} />;
      case 'fc-ord-purchase-order': return <PurchaseOrderPanel entityCode={entityCode} />;
      case 'fc-ord-sales-order': return <SalesOrderPanel entityCode={entityCode} />;
      case 'fc-rpt-daybook': return <DayBookPanel entityCode={entityCode} initialFilters={dayBookInitialFilters as { dateFrom?: string; dateTo?: string; typeFilter?: string; search?: string } | undefined} onNavigate={mod => setActiveModule(mod as FinCoreModule)} />;
      case 'fc-rpt-ledger': return <LedgerReportPanel entityCode={entityCode} />;
      case 'fc-rpt-trial-balance': return <TrialBalancePanel entityCode={entityCode} />;
      case 'fc-rpt-pl': return <ProfitLossPanel entityCode={entityCode} />;
      case 'fc-rpt-bs': return <BalanceSheetPanel entityCode={entityCode} />;
      case 'fc-rpt-stock-summary': return <StockSummaryPanel entityCode={entityCode} />;
      case 'fc-rpt-outstanding': return <OutstandingAgingPanel entityCode={entityCode} />;
      case 'fc-bnk-reconciliation': return <BankReconciliationPanel entityCode={entityCode} />;
      case 'fc-bnk-reconciliation-v2': return <BankReconciliationAdvancedPanel entityCode={entityCode} />;
      case 'fc-rpt-asset-unification': return <AssetUnificationPanel entityCode={entityCode} />;
      case 'fc-bnk-cheque': return <ChequeManagementPanel entityCode={entityCode} />;
      case 'fc-out-receivables': return <OutstandingAgingPanel entityCode={entityCode} type="debtor" />;
      case 'fc-out-payables': return <OutstandingAgingPanel entityCode={entityCode} type="creditor" />;
      case 'fc-tds-advance': return <TDSAdvancePanel entityCode={entityCode} />;
      case 'fc-rpt-24q': return <Form24QPanel entityCode={entityCode} />;
      case 'fc-rpt-26q': return <Form26QPanel entityCode={entityCode} />;
      case 'fc-rpt-27q': return <Form27QPanel entityCode={entityCode} />;
      case 'fc-rpt-challan': return <ChallanRegisterPanel entityCode={entityCode} />;
      case 'fc-tds-analytics': return <TDSAnalyticsPanel entityCode={entityCode} />;
      case 'fc-rpt-26as': return <Form26ASPanel entityCode={entityCode} />;
      case 'fc-rpt-audit-trail': return <AuditTrailReport />;
      case 'fc-rpt-monthly-production': return <MonthlyProductionAccounts />;
      case 'fc-gst-gstr1': return <GSTR1Panel entityCode={entityCode} />;
      case 'fc-gst-gstr3b': return <GSTR3BPanel entityCode={entityCode} />;
      case 'fc-gst-gstr9': return <GSTR9Panel entityCode={entityCode} />;
      case 'fc-gst-gstr2': return <GSTR2RegisterPanel entityCode={entityCode} />;
      case 'fc-gst-itc': return <ITCRegisterPanel entityCode={entityCode} />;
      case 'fc-gst-2a': return <RecoPanelGST entityCode={entityCode} />;
      case 'fc-gst-irn-register': return <IRNRegisterPanel entityCode={entityCode} />;
      case 'fc-gst-ewb-register': return <EWayBillRegisterPanel entityCode={entityCode} />;
      case 'fc-audit-dashboard': return <AuditDashboardPanel entityCode={entityCode} />;
      case 'fc-audit-3cd': return <Form3CDPanel entityCode={entityCode} />;
      case 'fc-audit-clause44': return <Clause44ReportPanel entityCode={entityCode} />;
      case 'fc-fa-register':    return <FixedAssetRegisterPanel entityCode={entityCode} />;
      case 'fc-fa-master':      return <CapitalAssetMasterPanel entityCode={entityCode} />;
      case 'fc-fa-depreciation':return <DepreciationWorkingsPanel entityCode={entityCode} />;
      case 'fc-fa-amc':         return <AMCWarrantyTrackerPanel entityCode={entityCode} />;
      case 'fc-fa-disposal':    return <AssetDisposalPanel entityCode={entityCode} />;
      case 'fc-fa-cwip':        return <CWIPRegisterPanel entityCode={entityCode} />;
      case 'fc-fa-reports':     return <FAReportsPanel entityCode={entityCode} />;
      // [Sprint 65 FAR-1 · Statutory FA Pack]
      case 'fc-fa-caro-20':      return <CARO20DisclosurePanel entityCode={entityCode} />;
      case 'fc-fa-msme-capital': return <MSMECapitalBreachesPanel entityCode={entityCode} />;
      case 'fc-fa-ind-as-116':   return <IndAS116ROUSchedulePanel entityCode={entityCode} />;
      case 'fc-fa-ledger-pack':  return <FALedgerPackReportPanel entityCode={entityCode} />;
      // [Sprint 66 FAR-2 · Block 9 · FA Physical-Reality]
      case 'fc-fa-physical-verification': return <FAPhysicalVerificationPanel entityCode={entityCode} />;
      case 'fc-fa-calibration-status':    return <FACalibrationStatusReportPanel entityCode={entityCode} />;
      case 'fc-fa-amc-renewal-pipeline':  return <FAAMCRenewalPipelinePanel entityCode={entityCode} />;
      case 'fc-fa-vehicle-register':      return <FAVehicleRegisterPanel entityCode={entityCode} />;
      // [Sprint 67 FAR-3 · Block 5 · Compute Engine routes · Q-LOCK-9 A]
      // Prompt B Blocks 10-11 will replace these placeholder divs with the actual panels
      case 'fc-fa-multi-gaap-report':
        return <div className="p-6 text-sm text-muted-foreground">Multi-GAAP Depreciation Report (3 Books) · landing in Sprint 67 FAR-3 Prompt B Block 10</div>;
      case 'fc-fa-uop-report':
        return <div className="p-6 text-sm text-muted-foreground">UOP Depreciation Report · landing in Sprint 67 FAR-3 Prompt B Block 11</div>;
      case 'fc-fa-component-report':
        return <div className="p-6 text-sm text-muted-foreground">Component Depreciation Report (Ind AS 16) · landing in Sprint 67 FAR-3 Prompt B Block 11</div>;
      case 'fc-fa-opening-migration':
        return <div className="p-6 text-sm text-muted-foreground">Opening Depreciation Migration Tool · landing in Sprint 67 FAR-3 Prompt B Block 8</div>;
      case 'fc-fa-excel-import':
        return <div className="p-6 text-sm text-muted-foreground">Asset Master Excel Import · landing in Sprint 67 FAR-3 Prompt B Block 9</div>;
      // [T10-pre.2d-B] 13 voucher-type registers — all drill back to DayBook pre-filtered.
      case 'fc-rpt-sales-register':            return <SalesRegisterPanel            entityCode={entityCode} onNavigate={(mod, filters) => { setActiveModule(mod); if (filters) setDayBookInitialFilters(filters); }} />;
      case 'fc-rpt-purchase-register':         return <PurchaseRegisterPanel         entityCode={entityCode} onNavigate={(mod, filters) => { setActiveModule(mod); if (filters) setDayBookInitialFilters(filters); }} />;
      case 'fc-rpt-receipt-register':          return <ReceiptRegisterPanel          entityCode={entityCode} onNavigate={(mod, filters) => { setActiveModule(mod); if (filters) setDayBookInitialFilters(filters); }} />;
      case 'fc-rpt-payment-register':          return <PaymentRegisterPanel          entityCode={entityCode} onNavigate={(mod, filters) => { setActiveModule(mod); if (filters) setDayBookInitialFilters(filters); }} />;
      case 'fc-rpt-contra-register':           return <ContraRegisterPanel           entityCode={entityCode} onNavigate={(mod, filters) => { setActiveModule(mod); if (filters) setDayBookInitialFilters(filters); }} />;
      case 'fc-rpt-journal-register':          return <JournalRegisterPanel          entityCode={entityCode} onNavigate={(mod, filters) => { setActiveModule(mod); if (filters) setDayBookInitialFilters(filters); }} />;
      case 'fc-rpt-credit-note-register':      return <CreditNoteRegisterPanel       entityCode={entityCode} onNavigate={(mod, filters) => { setActiveModule(mod); if (filters) setDayBookInitialFilters(filters); }} />;
      case 'fc-rpt-debit-note-register':       return <DebitNoteRegisterPanel        entityCode={entityCode} onNavigate={(mod, filters) => { setActiveModule(mod); if (filters) setDayBookInitialFilters(filters); }} />;
      case 'fc-rpt-delivery-note-register':    return <DeliveryNoteRegisterPanel     entityCode={entityCode} onNavigate={(mod, filters) => { setActiveModule(mod); if (filters) setDayBookInitialFilters(filters); }} />;
      case 'fc-rpt-receipt-note-register':     return <ReceiptNoteRegisterPanel      entityCode={entityCode} onNavigate={(mod, filters) => { setActiveModule(mod); if (filters) setDayBookInitialFilters(filters); }} />;
      case 'fc-rpt-stock-adjustment-register': return <StockAdjustmentRegisterPanel  entityCode={entityCode} onNavigate={(mod, filters) => { setActiveModule(mod); if (filters) setDayBookInitialFilters(filters); }} />;
      case 'fc-rpt-stock-journal-register':    return <StockJournalRegisterPanel     entityCode={entityCode} onNavigate={(mod, filters) => { setActiveModule(mod); if (filters) setDayBookInitialFilters(filters); }} />;
      case 'fc-rpt-stock-transfer-register':   return <StockTransferRegisterPanel    entityCode={entityCode} onNavigate={(mod, filters) => { setActiveModule(mod); if (filters) setDayBookInitialFilters(filters); }} />;
      default: return <ComingSoonPanel module={activeModule} />;
    }
  };

  if (!entityCode) {
    return (
      <SidebarProvider defaultOpen={false}>
        <div className="min-h-screen bg-background flex flex-col">
          <ERPHeader
            breadcrumbs={[{ label: t('fincore.title', 'Fin Core'), href: '/erp/fincore' }]}
            showDatePicker={false}
          />
          <main className="flex-1">
            <SelectCompanyGate
              title="Select a company to use Fin Core"
              description="Fin Core vouchers and reports are scoped to a specific company. Consolidated multi-company reports arrive in Horizon 1.5."
            />
          </main>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <>
      <GuidedTourOverlay cardId='fincore' />
      <SidebarProvider defaultOpen>
        <FinCoreSidebar active={activeModule} onNavigate={setActiveModule} />
        <SidebarInset>
          <ERPHeader
            breadcrumbs={[
              { label: 'Operix Core', href: '/erp/dashboard' },
              { label: t('fincore.title', 'Fin Core') },
              { label: breadcrumbLabels[activeModule] ?? activeModule },
            ]}
            showDatePicker={false}
            showCompany={false}
          />
          <DraftTray
            drafts={drafts}
            activeDraftId={activeDraftId}
            onSwitch={handleSwitchDraft}
            onClose={handleCloseDraft}
          />
          <ScrollArea className="flex-1">
            <div className="p-0">{renderModule()}</div>
          </ScrollArea>
        </SidebarInset>
      </SidebarProvider>
    </>
  );
}
export default function FinCorePage() { return <FinCorePagePanel />; }
