/**
 * @file rate-contract-list-panel.test.tsx
 * @sprint RPT-2c · RateContractListPanel wrap
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/hooks/useEntityCode', () => ({
  useEntityCode: () => ({ entityCode: 'E1', entityId: 'E1' }),
}));
vi.mock('@/lib/rate-contract-engine', () => ({
  listRateContracts: () => [],
  createRateContract: () => ({}),
}));

import { RateContractListPanel } from '../RateContractListPanel';

describe('RPT-2c · RateContractListPanel', () => {
  it('renders header', () => {
    render(<RateContractListPanel />);
    expect(screen.getByRole('heading', { name: /Rate Contracts/i })).toBeInTheDocument();
  });

  it('preserves New Contract button', () => {
    render(<RateContractListPanel />);
    expect(screen.getByText(/New Contract/i)).toBeInTheDocument();
  });
  it('mounts TableChartToggle defaulting to Table', () => {
    render(<RateContractListPanel />);
    expect(screen.getByTestId('table-chart-toggle')).toBeInTheDocument();
    expect(screen.getByTestId('tct-tab-table').getAttribute('data-state')).toBe('active');
  });
  it('renders integrity badge + period chip', () => {
    render(<RateContractListPanel />);
    expect(screen.getByTestId('bp-rc-integrity-badge')).toBeInTheDocument();
    expect(screen.getByTestId('bp-rc-period-chip')).toBeInTheDocument();
  });
});
