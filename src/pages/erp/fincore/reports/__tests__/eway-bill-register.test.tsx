/**
 * @file eway-bill-register.test.tsx — RPT-2e-iii
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EWayBillRegisterPanel } from '../EWayBillRegister';

describe('EWayBillRegister (RPT-2e-iii wrap)', () => {
  it('mounts toggle host + period + integrity badge', () => {
    render(<EWayBillRegisterPanel entityCode="TEST_ENT" />);
    expect(screen.getByTestId('fc-eway-toggle-host')).toBeInTheDocument();
    expect(screen.getByTestId('fc-eway-period-chip')).toBeInTheDocument();
    expect(screen.getByTestId('fc-eway-integrity-badge')).toBeInTheDocument();
    expect(screen.getByTestId('table-chart-toggle')).toBeInTheDocument();
  });
  it('preserves the heading', () => {
    render(<EWayBillRegisterPanel entityCode="TEST_ENT" />);
    expect(screen.getAllByText(/E-Way Bill Register/i).length).toBeGreaterThan(0);
  });
});
