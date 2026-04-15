import VoucherFormShell from '@/components/finecore/VoucherFormShell';
export default function PurchaseInvoice() {
  return <VoucherFormShell voucherTypeName="Purchase Invoice" title="Purchase Invoice" showTerms showPaymentTerms={false} />;
}
