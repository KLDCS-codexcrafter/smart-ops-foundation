import VoucherFormShell from '@/components/finecore/VoucherFormShell';
export function ReceiptPanel() {
  return <VoucherFormShell voucherTypeName="Receipt" title="Receipt Voucher" showTerms={false} showPaymentTerms={false} />;
}
export default function Receipt() {
  return <ReceiptPanel />;
}
