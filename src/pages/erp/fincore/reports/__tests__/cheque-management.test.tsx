/**
 * @file cheque-management.test.tsx
 * @sprint RPT-1b · ChequeManagement wrap
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChequeManagementPanel } from '../ChequeManagement';

vi.mock('@/hooks/useVouchers', () => ({
  useVouchers: () => ({ vouchers: [] }),
}));

describe('RPT-1b · ChequeManagementPanel', () => {
  it('renders header', () => {
    render(<ChequeManagementPanel entityCode="E1" />);
    expect(screen.getByText('Cheque Management')).toBeInTheDocument();
  });
  it('preserves existing Issued/Received tabs', () => {
    render(<ChequeManagementPanel entityCode="E1" />);
    expect(screen.getByText(/Issued Cheques/i)).toBeInTheDocument();
    expect(screen.getByText(/Received Cheques/i)).toBeInTheDocument();
  });
  it('mounts TableChartToggle defaulting to Table', () => {
    render(<ChequeManagementPanel entityCode="E1" />);
    expect(screen.getByTestId('table-chart-toggle')).toBeInTheDocument();
    expect(screen.getByTestId('tct-tab-table').getAttribute('data-state')).toBe('active');
  });
  it('renders integrity badge', () => {
    render(<ChequeManagementPanel entityCode="E1" />);
    expect(screen.getByTestId('cm-integrity-badge')).toBeInTheDocument();
  });
  it('renders period chip', () => {
    render(<ChequeManagementPanel entityCode="E1" />);
    expect(screen.getByTestId('cm-period-chip')).toBeInTheDocument();
  });
});
