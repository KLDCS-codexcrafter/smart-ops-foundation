import VoucherFormShell from '@/components/finecore/VoucherFormShell';
export function JournalEntryPanel() {
  return <VoucherFormShell voucherTypeName="Journal" title="Journal Entry" showTerms={false} showPaymentTerms={false} />;
}
export default function JournalEntry() {
  return <JournalEntryPanel />;
}
