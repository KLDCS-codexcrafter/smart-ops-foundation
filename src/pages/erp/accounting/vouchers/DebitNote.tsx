import VoucherFormShell from '@/components/finecore/VoucherFormShell';
export function DebitNotePanel() {
  return <VoucherFormShell voucherTypeName="Debit Note" title="Debit Note" showTerms showPaymentTerms={false} />;
}
export default function DebitNote() {
  return <DebitNotePanel />;
}
