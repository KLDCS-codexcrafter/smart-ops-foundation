/**
 * @file ledger-report.test.tsx
 * @sprint RPT-1b · LedgerReport wrap
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LedgerReportPanel } from '../LedgerReport';

vi.mock('@/hooks/useJournal', () => ({
  useJournal: () => ({
    getLedgerBalance: () => ({ dr: 0, cr: 0, balance: 0 }),
    getLedgerHistory: () => [],
    entries: [],
    getTrialBalanceAsOf: () => [],
  }),
}));

describe('RPT-1b · LedgerReportPanel', () => {
  it('renders header', () => {
    render(<LedgerReportPanel entityCode="E1" />);
    expect(screen.getByText('Ledger Report')).toBeInTheDocument();
  });
  it('renders period chip', () => {
    render(<LedgerReportPanel entityCode="E1" />);
    expect(screen.getByTestId('lr-period-chip')).toBeInTheDocument();
  });
  it('renders integrity badge with fnv1a hash', () => {
    render(<LedgerReportPanel entityCode="E1" />);
    const b = screen.getByTestId('lr-integrity-badge');
    expect(b).toBeInTheDocument();
    expect(b.getAttribute('title')?.startsWith('fnv1a:')).toBe(true);
  });
  it('preserves existing Export CSV + Print buttons', () => {
    render(<LedgerReportPanel entityCode="E1" />);
    expect(screen.getByText(/Export CSV/i)).toBeInTheDocument();
    expect(screen.getByText(/Print/i)).toBeInTheDocument();
  });
});
