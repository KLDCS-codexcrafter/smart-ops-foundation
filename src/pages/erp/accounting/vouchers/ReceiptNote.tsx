import VoucherFormShell from '@/components/finecore/VoucherFormShell';
export function ReceiptNotePanel() {
  return <VoucherFormShell voucherTypeName="Receipt Note" title="Receipt Note (GRN)" showTerms showPaymentTerms={false} />;
}
export default function ReceiptNote() {
  return <ReceiptNotePanel />;
}
