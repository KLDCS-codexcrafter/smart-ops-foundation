import VoucherFormShell from '@/components/finecore/VoucherFormShell';
export default function ReceiptNote() {
  return <VoucherFormShell voucherTypeName="Receipt Note" title="Receipt Note (GRN)" showTerms showPaymentTerms={false} />;
}
