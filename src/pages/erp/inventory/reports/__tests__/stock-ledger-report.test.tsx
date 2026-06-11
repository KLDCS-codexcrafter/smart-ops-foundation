/**
 * @file stock-ledger-report.test.tsx — RPT-5b wrap
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StockLedgerReportPanel } from '../StockLedgerReport';

describe('RPT-5b · StockLedgerReport wrap', () => {
  it('mounts toggle host + integrity badge + chart toggle (defaults to Table)', () => {
    render(<StockLedgerReportPanel />);
    expect(screen.getByTestId('inv-stock-ledger-toggle-host')).toBeInTheDocument();
    expect(screen.getByTestId('inv-stock-ledger-integrity-badge')).toBeInTheDocument();
    expect(screen.getByTestId('table-chart-toggle')).toBeInTheDocument();
    expect(screen.getByTestId('tct-tab-table').getAttribute('data-state')).toBe('active');
  });
  it('preserves Stock Ledger Report heading', () => {
    render(<StockLedgerReportPanel />);
    expect(screen.getAllByText(/Stock Ledger Report/i).length).toBeGreaterThan(0);
  });
});
