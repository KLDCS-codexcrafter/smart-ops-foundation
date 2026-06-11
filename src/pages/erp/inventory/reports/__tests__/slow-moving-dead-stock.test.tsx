/**
 * @file slow-moving-dead-stock.test.tsx — RPT-5b wrap
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SlowMovingDeadStockReportPanel } from '../SlowMovingDeadStockReport';

describe('RPT-5b · SlowMovingDeadStockReport wrap', () => {
  it('mounts toggle host + integrity badge + chart toggle (defaults to Table)', () => {
    render(<SlowMovingDeadStockReportPanel />);
    expect(screen.getByTestId('inv-slow-moving-toggle-host')).toBeInTheDocument();
    expect(screen.getByTestId('inv-slow-moving-integrity-badge')).toBeInTheDocument();
    expect(screen.getByTestId('table-chart-toggle')).toBeInTheDocument();
    expect(screen.getByTestId('tct-tab-table').getAttribute('data-state')).toBe('active');
  });
  it('preserves Slow-Moving / Dead Stock heading', () => {
    render(<SlowMovingDeadStockReportPanel />);
    expect(screen.getAllByText(/Slow-Moving \/ Dead Stock/i).length).toBeGreaterThan(0);
  });
});
