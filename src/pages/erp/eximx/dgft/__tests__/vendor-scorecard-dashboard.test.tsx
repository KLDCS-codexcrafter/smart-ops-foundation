/**
 * @file        vendor-scorecard-dashboard.test.tsx
 * @sprint      RPT-2b-iv · robust assertions (no h1 — queryAllByText)
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VendorScorecardDashboard } from '../VendorScorecardDashboard';

describe('RPT-2b-iv · VendorScorecardDashboard', () => {
  it('preserves existing header + tiles (no h1 — title via queryAllByText)', () => {
    render(<VendorScorecardDashboard />);
    expect(screen.queryAllByText(/Vendor Reliability Scorecard/i).length).toBeGreaterThan(0);
    expect(screen.queryAllByText(/Average Composite Score/i).length).toBeGreaterThan(0);
  });
  it('adds ScorecardTile + ReportChart + integrity badge', () => {
    render(<VendorScorecardDashboard />);
    expect(screen.getAllByTestId('scorecard-tile').length).toBeGreaterThan(0);
    expect(screen.getByTestId('integrity-badge-vendor-score')).toBeInTheDocument();
    expect(screen.getByTestId('rpt2biv-vendor-score-section')).toBeInTheDocument();
  });
});
