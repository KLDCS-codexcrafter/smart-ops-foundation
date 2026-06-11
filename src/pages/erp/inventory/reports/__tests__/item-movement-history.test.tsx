/**
 * @file item-movement-history.test.tsx — RPT-5b wrap
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ItemMovementHistoryReportPanel } from '../ItemMovementHistoryReport';

describe('RPT-5b · ItemMovementHistoryReport wrap', () => {
  it('mounts toggle host + integrity badge + chart toggle', () => {
    render(<ItemMovementHistoryReportPanel />);
    expect(screen.getByTestId('inv-item-movement-toggle-host')).toBeInTheDocument();
    expect(screen.getByTestId('inv-item-movement-integrity-badge')).toBeInTheDocument();
    expect(screen.getByTestId('table-chart-toggle')).toBeInTheDocument();
  });
  it('preserves the Item Movement History heading', () => {
    render(<ItemMovementHistoryReportPanel />);
    expect(screen.getAllByText(/Item Movement History/i).length).toBeGreaterThan(0);
  });
});
