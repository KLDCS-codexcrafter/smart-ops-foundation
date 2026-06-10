/**
 * @file        ews-dashboard.test.tsx
 * @sprint      RPT-2b-iv · robust assertions (no h1 — queryAllByText)
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EWSDashboard } from '../EWSDashboard';

describe('RPT-2b-iv · EWSDashboard', () => {
  it('preserves existing header + tiles (no h1 — title via queryAllByText)', () => {
    render(<EWSDashboard />);
    expect(screen.queryAllByText(/Early Warning System/i).length).toBeGreaterThan(0);
    expect(screen.queryAllByText(/Active Signals/i).length).toBeGreaterThan(0);
  });
  it('adds ScorecardTile + ReportChart + integrity badge', () => {
    render(<EWSDashboard />);
    expect(screen.getAllByTestId('scorecard-tile').length).toBeGreaterThan(0);
    expect(screen.getByTestId('integrity-badge-ews')).toBeInTheDocument();
    expect(screen.getByTestId('rpt2biv-ews-section')).toBeInTheDocument();
  });
});
