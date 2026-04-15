import VoucherFormShell from '@/components/finecore/VoucherFormShell';
export function PaymentPanel() {
  return <VoucherFormShell voucherTypeName="Payment" title="Payment Voucher" showTerms={false} showPaymentTerms={false} />;
}
export default function Payment() {
  return <PaymentPanel />;
}
