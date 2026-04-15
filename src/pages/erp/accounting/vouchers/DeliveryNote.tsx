import VoucherFormShell from '@/components/finecore/VoucherFormShell';
export function DeliveryNotePanel() {
  return <VoucherFormShell voucherTypeName="Delivery Note" title="Delivery Note" showTerms showPaymentTerms={false} />;
}
export default function DeliveryNote() {
  return <DeliveryNotePanel />;
}
