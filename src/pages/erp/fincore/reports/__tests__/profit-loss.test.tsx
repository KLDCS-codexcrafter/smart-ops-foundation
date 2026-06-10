/**
 * @file profit-loss.test.tsx
 * @sprint RPT-1b · ProfitLoss wrap
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProfitLossPanel } from '../ProfitLoss';

vi.mock('@/hooks/useJournal', () => ({
  useJournal: () => ({
    entries: [],
    getLedgerBalance: () => ({ dr: 0, cr: 0, balance: 0 }),
    getLedgerHistory: () => [],
    getTrialBalanceAsOf: () => [],
  }),
}));

describe('RPT-1b · ProfitLossPanel', () => {
  it('renders header', () => {
    render(<ProfitLossPanel entityCode="E1" />);
    expect(screen.getByText('Profit & Loss Statement')).toBeInTheDocument();
  });
  it('preserves existing Net Profit and Gross Profit rows', () => {
    render(<ProfitLossPanel entityCode="E1" />);
    expect(screen.getByText('Net Profit')).toBeInTheDocument();
    expect(screen.getByText('Gross Profit')).toBeInTheDocument();
  });
  it('mounts TableChartToggle defaulting to Table', () => {
    render(<ProfitLossPanel entityCode="E1" />);
    expect(screen.getByTestId('table-chart-toggle')).toBeInTheDocument();
    expect(screen.getByTestId('tct-tab-table').getAttribute('data-state')).toBe('active');
  });
  it('renders integrity badge + period chip', () => {
    render(<ProfitLossPanel entityCode="E1" />);
    expect(screen.getByTestId('pl-integrity-badge')).toBeInTheDocument();
    expect(screen.getByTestId('pl-period-chip')).toBeInTheDocument();
  });
});
