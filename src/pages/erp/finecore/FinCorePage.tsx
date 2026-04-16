/**
 * FinCorePage.tsx — Main Fin Core container
 * Mirrors PayHubPage.tsx — SidebarProvider + FineCoreSidebar + content area.
 * [JWT] All data loaded via hooks
 */
import { useState, useCallback } from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { FineCoreSidebar } from './FineCoreSidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
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
  'fc-inv-stock-journal': 'Stock Journal',
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
};

export function FinCorePagePanel() {
  const [activeModule, setActiveModule] = useState<FineCoreModule>('fc-hub');
  const [drafts, setDrafts] = useState<DraftEntry[]>([]);
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);
  const [selectedCompany] = useERPCompany();
  const entityCode = selectedCompany && selectedCompany !== 'all' ? selectedCompany : 'SMRT';

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
      case 'fc-hub': return <FineCoreHubPanel />;
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
      case 'fc-inv-stock-journal': return <StockJournalPanel onSaveDraft={addToDraftTray} />;
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
      default: return <ComingSoonPanel module={activeModule} />;
    }
  };

  return (
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
  );
}
export default function FinCorePage() { return <FinCorePagePanel />; }
