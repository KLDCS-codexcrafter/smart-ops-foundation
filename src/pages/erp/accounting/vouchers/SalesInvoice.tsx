import VoucherFormShell from '@/components/finecore/VoucherFormShell';
export function SalesInvoicePanel() {
  return <VoucherFormShell voucherTypeName="Sales Invoice" title="Sales Invoice" showTerms showPaymentTerms defaultOpen />;
}
export default function SalesInvoice() {
  return <SalesInvoicePanel />;
}
