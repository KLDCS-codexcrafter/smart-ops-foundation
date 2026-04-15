import VoucherFormShell from '@/components/finecore/VoucherFormShell';
export default function DebitNote() {
  return <VoucherFormShell voucherTypeName="Debit Note" title="Debit Note" showTerms showPaymentTerms={false} />;
}
