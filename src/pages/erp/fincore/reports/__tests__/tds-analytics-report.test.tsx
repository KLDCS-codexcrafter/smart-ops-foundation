/**
 * @file tds-analytics-report.test.tsx — RPT-2e-ii
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TDSAnalyticsPanel } from '../TDSAnalyticsReport';

describe('TDSAnalyticsReport (RPT-2e-ii wrap)', () => {
  it('mounts the toggle host + period + integrity badge', () => {
    render(<TDSAnalyticsPanel entityCode="TEST_ENT" />);
    expect(screen.getByTestId('fc-tds-analytics-toggle-host')).toBeInTheDocument();
    expect(screen.getByTestId('fc-tds-analytics-period-chip')).toBeInTheDocument();
    expect(screen.getByTestId('fc-tds-analytics-integrity-badge')).toBeInTheDocument();
    expect(screen.getByTestId('table-chart-toggle')).toBeInTheDocument();
  });
  it('preserves the TDS Analytics heading', () => {
    render(<TDSAnalyticsPanel entityCode="TEST_ENT" />);
    expect(screen.getAllByText(/TDS Analytics/i).length).toBeGreaterThan(0);
  });
});
