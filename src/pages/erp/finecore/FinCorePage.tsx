/**
 * FinCorePage.tsx — Main Fin Core container
 * Mirrors PayHubPage.tsx — SidebarProvider + FineCoreSidebar + content area.
 * [JWT] All data loaded via hooks
 */
import { useState, useCallback, useEffect } from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { FineCoreSidebar } from './FineCoreSidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import { logAudit } from '@/lib/card-audit-engine';
import { recordActivity } from '@/lib/cross-card-activity-engine';
import { rememberModule } from '@/lib/breadcrumb-memory';
import { GuidedTourOverlay } from '@/components/layout/GuidedTourOverlay';
import { DraftTray, type FineCoreModule, type DraftEntry } from '@/components/finecore/DraftTray';
import { ComingSoonPanel } from '@/components/finecore/ComingSoonPanel';
import { FineCoreHubPanel } from './FineCoreHub';
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
import { StockAdjustmentPanel } from '@/pages/erp/accounting/vouchers/StockAdjustment';
import { StockTransferDispatchPanel } from '@/pages/erp/accounting/vouchers/StockTransferDispatch';
import { PurchaseOrderPanel } from '@/pages/erp/finecore/PurchaseOrder';
import { SalesOrderPanel } from '@/pages/erp/finecore/SalesOrder';
import { DayBookPanel } from './reports/DayBook';
import { LedgerReportPanel } from './reports/LedgerReport';
import { TrialBalancePanel } from './reports/TrialBalance';
import { ProfitLossPanel } from './reports/ProfitLoss';
import { BalanceSheetPanel } from './reports/BalanceSheet';
import { StockSummaryPanel } from './reports/StockSummary';
import { OutstandingAgingPanel } from './reports/OutstandingAging';
import { BankReconciliationPanel } from './reports/BankReconciliation';
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
import { CapitalAssetMasterPanel } from '@/pages/erp/accounting/capital-assets/CapitalAssetMaster';
import { DepreciationWorkingsPanel } from '@/pages/erp/accounting/capital-assets/DepreciationWorkings';
import { AMCWarrantyTrackerPanel } from '@/pages/erp/accounting/capital-assets/AMCWarrantyTracker';
import { AssetDisposalPanel } from '@/pages/erp/accounting/capital-assets/AssetDisposal';
import { CWIPRegisterPanel } from '@/pages/erp/accounting/capital-assets/CWIPRegister';
import { FAReportsPanel } from '@/pages/erp/accounting/capital-assets/FAReports';
import { FixedAssetRegisterPanel } from '@/pages/erp/accounting/capital-assets/FixedAssetRegister';
import { useERPCompany } from '@/components/layout/ERPCompanySelector';

const breadcrumbLabels: Partial<Record<FineCoreModule, string>> = {
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
};

export function FinCorePagePanel() {
  const [activeModule, setActiveModule] = useState<FineCoreModule>('fc-hub');
  const [drafts, setDrafts] = useState<DraftEntry[]>([]);
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);
  const [selectedCompany] = useERPCompany();
  const entityCode = selectedCompany && selectedCompany !== 'all' ? selectedCompany : 'SMRT';
  const { entityCode: entCode, userId } = useCardEntitlement();

  useEffect(() => {
    logAudit({
      entityCode: entCode, userId, userName: userId,
      cardId: 'finecore',
      action: 'card_open',
    });
  }, [entCode, userId]);

  useEffect(() => {
    rememberModule('finecore', activeModule);
    logAudit({
      entityCode: entCode, userId, userName: userId,
      cardId: 'finecore',
      moduleId: activeModule,
      action: 'module_open',
    });
    recordActivity(entCode, userId, {
      card_id: 'finecore',
      kind: 'module',
      ref_id: activeModule,
      title: `FineCore · ${activeModule}`,
      subtitle: null,
      deep_link: `/erp/finecore#${activeModule}`,
    });
  }, [activeModule, entCode, userId]);

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
      case 'fc-hub': return <FineCoreHubPanel onNavigate={mod => setActiveModule(mod as FineCoreModule)} />;
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
      case 'fc-ord-purchase-order': return <PurchaseOrderPanel entityCode={entityCode} />;
      case 'fc-ord-sales-order': return <SalesOrderPanel entityCode={entityCode} />;
      case 'fc-rpt-daybook': return <DayBookPanel entityCode={entityCode} onNavigate={mod => setActiveModule(mod as FineCoreModule)} />;
      case 'fc-rpt-ledger': return <LedgerReportPanel entityCode={entityCode} />;
      case 'fc-rpt-trial-balance': return <TrialBalancePanel entityCode={entityCode} />;
      case 'fc-rpt-pl': return <ProfitLossPanel entityCode={entityCode} />;
      case 'fc-rpt-bs': return <BalanceSheetPanel entityCode={entityCode} />;
      case 'fc-rpt-stock-summary': return <StockSummaryPanel entityCode={entityCode} />;
      case 'fc-rpt-outstanding': return <OutstandingAgingPanel entityCode={entityCode} />;
      case 'fc-bnk-reconciliation': return <BankReconciliationPanel entityCode={entityCode} />;
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
      default: return <ComingSoonPanel module={activeModule} />;
    }
  };

  return (
    <>
      <GuidedTourOverlay cardId='finecore' />
      <SidebarProvider defaultOpen>
        <FineCoreSidebar active={activeModule} onNavigate={setActiveModule} />
        <SidebarInset>
          <ERPHeader
            breadcrumbs={[
              { label: 'Operix Core', href: '/erp/dashboard' },
              { label: 'Fin Core' },
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
