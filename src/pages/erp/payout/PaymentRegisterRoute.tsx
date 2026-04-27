/**
 * @file     PaymentRegisterRoute.tsx
 * @purpose  Thin wrapper · renders existing PaymentRegisterPanel inside PayOut layout.
 * @sprint   T-T8.2-Foundation · D-146 reuse · zero rebuild.
 */
import { PaymentRegisterPanel } from '@/pages/erp/finecore/registers/PaymentRegister';
import { useEntityCode } from '@/hooks/useEntityCode';
import { SelectCompanyGate } from '@/components/layout/SelectCompanyGate';

export default function PaymentRegisterRoute() {
  const { entityCode } = useEntityCode();
  if (!entityCode) return <SelectCompanyGate title="Select a company" description="Payment Register is entity-scoped." />;
  return <PaymentRegisterPanel entityCode={entityCode} />;
}
