/**
 * @file consumption-summary.test.tsx — RPT-5b wrap
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ConsumptionSummaryReportPanel } from '../ConsumptionSummaryReport';

describe('RPT-5b · ConsumptionSummaryReport wrap', () => {
  it('mounts toggle host + integrity badge + chart toggle (defaults to Table)', () => {
    render(<ConsumptionSummaryReportPanel />);
    expect(screen.getByTestId('inv-consumption-summary-toggle-host')).toBeInTheDocument();
    expect(screen.getByTestId('inv-consumption-summary-integrity-badge')).toBeInTheDocument();
    expect(screen.getByTestId('table-chart-toggle')).toBeInTheDocument();
    expect(screen.getByTestId('tct-tab-table').getAttribute('data-state')).toBe('active');
  });
  it('preserves the Consumption Intelligence heading', () => {
    render(<ConsumptionSummaryReportPanel />);
    expect(screen.getAllByText(/Consumption Intelligence/i).length).toBeGreaterThan(0);
  });
});
