/**
 * @file ptp-tracker.test.tsx
 * @sprint RPT-2c · PTPTracker wrap
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PTPTrackerPanel } from '../PTPTracker';

describe('RPT-2c · PTPTrackerPanel', () => {
  it('renders header', () => {
    render(<PTPTrackerPanel entityCode="E1" />);
    expect(screen.getByText(/Promise-to-Pay Tracker/i)).toBeInTheDocument();
  });
  it('preserves Evaluate All button', () => {
    render(<PTPTrackerPanel entityCode="E1" />);
    expect(screen.getByText(/Evaluate All/i)).toBeInTheDocument();
  });
  it('mounts TableChartToggle defaulting to Table', () => {
    render(<PTPTrackerPanel entityCode="E1" />);
    expect(screen.getByTestId('table-chart-toggle')).toBeInTheDocument();
    expect(screen.getByTestId('tct-tab-table').getAttribute('data-state')).toBe('active');
  });
  it('renders integrity badge + period chip', () => {
    render(<PTPTrackerPanel entityCode="E1" />);
    expect(screen.getByTestId('rx-ptp-integrity-badge')).toBeInTheDocument();
    expect(screen.getByTestId('rx-ptp-period-chip')).toBeInTheDocument();
  });
});
