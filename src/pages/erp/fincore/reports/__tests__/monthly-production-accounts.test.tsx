/**
 * @file monthly-production-accounts.test.tsx
 * @sprint RPT-1b · MonthlyProductionAccounts wrap
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import MonthlyProductionAccounts from '../MonthlyProductionAccounts';

vi.mock('@/hooks/useEntityCode', () => ({
  useEntityCode: () => ({ entityCode: 'E1' }),
}));

beforeEach(() => {
  localStorage.setItem(
    'erp_companies',
    JSON.stringify([{ entityCode: 'E1', legalEntityName: 'Acme Mfg', businessActivity: 'Manufacturing' }]),
  );
});

describe('RPT-1b · MonthlyProductionAccounts', () => {
  it('renders title', () => {
    render(<MonthlyProductionAccounts />);
    expect(screen.getByText(/Monthly Production Accounts/i)).toBeInTheDocument();
  });
  it('preserves Raw Materials Consumed section', () => {
    render(<MonthlyProductionAccounts />);
    expect(screen.getByText('Raw Materials Consumed')).toBeInTheDocument();
  });
  it('mounts TableChartToggle defaulting to Table', () => {
    render(<MonthlyProductionAccounts />);
    expect(screen.getByTestId('table-chart-toggle')).toBeInTheDocument();
    expect(screen.getByTestId('tct-tab-table').getAttribute('data-state')).toBe('active');
  });
  it('renders integrity badge + period chip', () => {
    render(<MonthlyProductionAccounts />);
    expect(screen.getByTestId('mpa-integrity-badge')).toBeInTheDocument();
    expect(screen.getByTestId('mpa-period-chip')).toBeInTheDocument();
  });
});
