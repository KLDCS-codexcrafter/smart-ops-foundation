/**
 * @file trial-balance.test.tsx
 * @sprint RPT-1b · TrialBalance wrap
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TrialBalancePanel } from '../TrialBalance';

vi.mock('@/hooks/useJournal', () => ({
  useJournal: () => ({
    entries: [],
    getLedgerBalance: () => ({ dr: 0, cr: 0, balance: 0 }),
    getLedgerHistory: () => [],
    getTrialBalanceAsOf: () => [],
  }),
}));

describe('RPT-1b · TrialBalancePanel', () => {
  it('renders header', () => {
    render(<TrialBalancePanel entityCode="E1" />);
    expect(screen.getByText('Trial Balance')).toBeInTheDocument();
  });
  it('preserves existing Condensed + Hide-zero switches', () => {
    render(<TrialBalancePanel entityCode="E1" />);
    expect(screen.getByText(/Condensed/i)).toBeInTheDocument();
    expect(screen.getByText(/Hide zero balances/i)).toBeInTheDocument();
  });
  it('mounts TableChartToggle defaulting to Table', () => {
    render(<TrialBalancePanel entityCode="E1" />);
    expect(screen.getByTestId('table-chart-toggle')).toBeInTheDocument();
    expect(screen.getByTestId('tct-tab-table').getAttribute('data-state')).toBe('active');
  });
  it('renders integrity badge + period chip', () => {
    render(<TrialBalancePanel entityCode="E1" />);
    expect(screen.getByTestId('tb-integrity-badge')).toBeInTheDocument();
    expect(screen.getByTestId('tb-period-chip')).toBeInTheDocument();
  });
});
