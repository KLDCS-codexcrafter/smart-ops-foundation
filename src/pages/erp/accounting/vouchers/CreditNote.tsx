import VoucherFormShell from '@/components/finecore/VoucherFormShell';
export function CreditNotePanel() {
  return <VoucherFormShell voucherTypeName="Credit Note" title="Credit Note" showTerms showPaymentTerms />;
}
export default function CreditNote() {
  return <CreditNotePanel />;
}
