/**
 * @file        src/pages/erp/vendor-portal/panels/VendorAgreementsPanel.tsx
 * @sprint      T-Phase-1.A.1-VendorPortal-Foundation · A-Q10=B re-mount
 */
import { Procure360VendorAgreementsRegisterPanel } from '@/pages/erp/procure-hub/transactions/Procure360VendorAgreementsRegister';

export function VendorAgreementsPanel(): JSX.Element {
  return <Procure360VendorAgreementsRegisterPanel onNavigate={() => { /* no-op · Vendor Portal context */ }} />;
}
