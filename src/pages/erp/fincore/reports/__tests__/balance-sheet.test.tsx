/**
 * @file balance-sheet.test.tsx
 * @sprint RPT-1b · BalanceSheet wrap
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BalanceSheetPanel } from '../BalanceSheet';

vi.mock('@/hooks/useJournal', () => ({
  useJournal: () => ({
    entries: [],
    getLedgerBalance: () => ({ dr: 0, cr: 0, balance: 0 }),
    getLedgerHistory: () => [],
    getTrialBalanceAsOf: () => [],
  }),
}));

describe('RPT-1b · BalanceSheetPanel', () => {
  it('renders header', () => {
    render(<BalanceSheetPanel entityCode="E1" />);
    expect(screen.getByText('Balance Sheet')).toBeInTheDocument();
  });
  it('preserves existing ASSETS and LIABILITIES & CAPITAL sections', () => {
    render(<BalanceSheetPanel entityCode="E1" />);
    expect(screen.getByText('ASSETS')).toBeInTheDocument();
    expect(screen.getByText('LIABILITIES & CAPITAL')).toBeInTheDocument();
  });
  it('mounts TableChartToggle defaulting to Table', () => {
    render(<BalanceSheetPanel entityCode="E1" />);
    expect(screen.getByTestId('table-chart-toggle')).toBeInTheDocument();
    expect(screen.getByTestId('tct-tab-table').getAttribute('data-state')).toBe('active');
  });
  it('renders integrity badge + period chip', () => {
    render(<BalanceSheetPanel entityCode="E1" />);
    expect(screen.getByTestId('bs-integrity-badge')).toBeInTheDocument();
    expect(screen.getByTestId('bs-period-chip')).toBeInTheDocument();
  });
});
