import VoucherFormShell from '@/components/finecore/VoucherFormShell';
export function StockTransferPanel() {
  return <VoucherFormShell voucherTypeName="Stock Transfer" title="Stock Transfer" showTerms={false} showPaymentTerms={false} />;
}
export default function StockTransfer() {
  return <StockTransferPanel />;
}
