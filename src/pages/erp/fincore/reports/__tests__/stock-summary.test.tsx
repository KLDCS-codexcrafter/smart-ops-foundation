/**
 * @file stock-summary.test.tsx
 * @sprint RPT-1b · StockSummary wrap
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StockSummaryPanel } from '../StockSummary';

vi.mock('@/hooks/useStockLedger', () => ({
  useStockLedger: () => ({ entries: [] }),
}));

describe('RPT-1b · StockSummaryPanel', () => {
  it('renders header', () => {
    render(<StockSummaryPanel entityCode="E1" />);
    expect(screen.getByText('Stock Summary')).toBeInTheDocument();
  });
  it('preserves Grand Total row', () => {
    render(<StockSummaryPanel entityCode="E1" />);
    expect(screen.getByText('Grand Total')).toBeInTheDocument();
  });
  it('mounts TableChartToggle defaulting to Table', () => {
    render(<StockSummaryPanel entityCode="E1" />);
    expect(screen.getByTestId('table-chart-toggle')).toBeInTheDocument();
    expect(screen.getByTestId('tct-tab-table').getAttribute('data-state')).toBe('active');
  });
  it('renders integrity badge + period chip', () => {
    render(<StockSummaryPanel entityCode="E1" />);
    expect(screen.getByTestId('ss-integrity-badge')).toBeInTheDocument();
    expect(screen.getByTestId('ss-period-chip')).toBeInTheDocument();
  });
});
