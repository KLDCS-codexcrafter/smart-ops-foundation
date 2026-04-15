import VoucherFormShell from '@/components/finecore/VoucherFormShell';
export function PurchaseInvoicePanel() {
  return <VoucherFormShell voucherTypeName="Purchase Invoice" title="Purchase Invoice" showTerms showPaymentTerms={false} />;
}
export default function PurchaseInvoice() {
  return <PurchaseInvoicePanel />;
}
