/**
 * @file vendor-agreements-register.test.tsx — RPT-5c toggle recipe
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Procure360VendorAgreementsRegisterPanel } from '../Procure360VendorAgreementsRegister';

describe('RPT-5c · Procure360VendorAgreementsRegister (toggle recipe)', () => {
  it('mounts toggle host + integrity badge + chart toggle', () => {
    render(<Procure360VendorAgreementsRegisterPanel onNavigate={() => {}} />);
    expect(screen.getByTestId('pr-vendor-agreements-toggle-host')).toBeInTheDocument();
    expect(screen.getByTestId('pr-vendor-agreements-integrity-badge')).toBeInTheDocument();
    expect(screen.getByTestId('table-chart-toggle')).toBeInTheDocument();
  });
  it('preserves Vendor Agreements heading', () => {
    render(<Procure360VendorAgreementsRegisterPanel onNavigate={() => {}} />);
    expect(screen.getAllByText(/Vendor Agreements/i).length).toBeGreaterThanOrEqual(1);
  });
});
