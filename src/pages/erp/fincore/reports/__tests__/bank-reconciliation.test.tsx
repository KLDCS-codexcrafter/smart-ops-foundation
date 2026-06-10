/**
 * @file bank-reconciliation.test.tsx
 * @sprint RPT-1b · BankReconciliation wrap
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BankReconciliationPanel } from '../BankReconciliation';

vi.mock('@/hooks/useJournal', () => ({
  useJournal: () => ({
    entries: [],
    getLedgerBalance: () => ({ dr: 0, cr: 0, balance: 0 }),
    getLedgerHistory: () => [],
    getTrialBalanceAsOf: () => [],
  }),
}));

describe('RPT-1b · BankReconciliationPanel', () => {
  it('renders header', () => {
    render(<BankReconciliationPanel entityCode="E1" />);
    expect(screen.getByText('Bank Reconciliation')).toBeInTheDocument();
  });
  it('preserves Auto Match + Save BRS buttons', () => {
    render(<BankReconciliationPanel entityCode="E1" />);
    expect(screen.getByText(/Auto Match/i)).toBeInTheDocument();
    expect(screen.getByText(/Save BRS/i)).toBeInTheDocument();
  });
  it('mounts TableChartToggle defaulting to Table', () => {
    render(<BankReconciliationPanel entityCode="E1" />);
    expect(screen.getByTestId('table-chart-toggle')).toBeInTheDocument();
    expect(screen.getByTestId('tct-tab-table').getAttribute('data-state')).toBe('active');
  });
  it('renders integrity badge + period chip', () => {
    render(<BankReconciliationPanel entityCode="E1" />);
    expect(screen.getByTestId('br-integrity-badge')).toBeInTheDocument();
    expect(screen.getByTestId('br-period-chip')).toBeInTheDocument();
  });
});
