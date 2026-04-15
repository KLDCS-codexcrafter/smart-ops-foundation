import VoucherFormShell from '@/components/finecore/VoucherFormShell';
export function ContraEntryPanel() {
  return <VoucherFormShell voucherTypeName="Contra" title="Contra Entry" showTerms={false} showPaymentTerms={false} />;
}
export default function ContraEntry() {
  return <ContraEntryPanel />;
}
