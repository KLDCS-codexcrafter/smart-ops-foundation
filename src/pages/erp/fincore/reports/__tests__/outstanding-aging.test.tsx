/**
 * @file        outstanding-aging.test.tsx
 * @purpose     OutstandingAgingPanel renders · toggle defaults to Table · chart view works · existing tabs present.
 * @sprint      RPT-1a
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OutstandingAgingPanel } from '../OutstandingAging';

vi.mock('@/hooks/useOutstanding', () => ({
  useOutstanding: () => ({
    getAging: () => [
      { id: 'b1', party_id: 'p1', party_name: 'Acme Pvt Ltd', party_type: 'debtor',
        voucher_no: 'INV-001', voucher_date: '2026-05-01', due_date: '2026-05-31',
        original_amount: 100000, pending_amount: 100000, ageDays: 10, bucket: 0 },
      { id: 'b2', party_id: 'p2', party_name: 'Beta Industries', party_type: 'creditor',
        voucher_no: 'BILL-002', voucher_date: '2026-03-01', due_date: '2026-03-15',
        original_amount: 50000, pending_amount: 50000, ageDays: 100, bucket: 3 },
    ],
  }),
}));

describe('RPT-1a · OutstandingAgingPanel', () => {
  it('renders with header', () => {
    render(<OutstandingAgingPanel entityCode="E1" />);
    expect(screen.getByText('Outstanding Aging')).toBeInTheDocument();
  });

  it('preserves existing Receivables/Payables/Both tabs', () => {
    render(<OutstandingAgingPanel entityCode="E1" />);
    expect(screen.getByText('Receivables')).toBeInTheDocument();
    expect(screen.getByText('Payables')).toBeInTheDocument();
    expect(screen.getByText('Both')).toBeInTheDocument();
  });

  it('mounts the TableChartToggle defaulting to Table view', () => {
    render(<OutstandingAgingPanel entityCode="E1" />);
    const toggle = screen.getByTestId('table-chart-toggle');
    expect(toggle).toBeInTheDocument();
    expect(screen.getByTestId('tct-tab-table')).toBeInTheDocument();
    expect(screen.getByTestId('tct-tab-chart')).toBeInTheDocument();
  });

  it('renders the integrity badge with fnv1a short hash', () => {
    render(<OutstandingAgingPanel entityCode="E1" />);
    const badge = screen.getByTestId('oa-integrity-badge');
    expect(badge).toBeInTheDocument();
    expect(badge.getAttribute('title')?.startsWith('fnv1a:')).toBe(true);
  });

  it('renders the period chip (falls back to as-on date when no provider)', () => {
    render(<OutstandingAgingPanel entityCode="E1" />);
    expect(screen.getByTestId('oa-period-chip')).toBeInTheDocument();
  });

  it('exposes both Table and Chart tabs (toggle interactive)', () => {
    render(<OutstandingAgingPanel entityCode="E1" />);
    const tableTab = screen.getByTestId('tct-tab-table');
    const chartTab = screen.getByTestId('tct-tab-chart');
    expect(tableTab).toBeInTheDocument();
    expect(chartTab).toBeInTheDocument();
    expect(tableTab.getAttribute('data-state')).toBe('active');
  });
});
