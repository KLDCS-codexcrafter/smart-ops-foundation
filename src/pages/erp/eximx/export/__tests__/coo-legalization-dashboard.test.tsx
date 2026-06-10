/**
 * @file        coo-legalization-dashboard.test.tsx
 * @sprint      RPT-2b-iv · header via getByRole heading
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CoOLegalizationDashboard } from '../CoOLegalizationDashboard';

describe('RPT-2b-iv · CoOLegalizationDashboard', () => {
  it('preserves existing header + table', () => {
    render(<CoOLegalizationDashboard />);
    expect(screen.getByRole('heading', { name: /CoO Legalization Dashboard/i })).toBeInTheDocument();
    expect(screen.queryAllByText(/Legalization Pipeline/i).length).toBeGreaterThan(0);
  });
  it('adds ScorecardTile + ReportChart + integrity badge', () => {
    render(<CoOLegalizationDashboard />);
    expect(screen.getAllByTestId('scorecard-tile').length).toBeGreaterThan(0);
    expect(screen.getByTestId('integrity-badge-coo-legal')).toBeInTheDocument();
    expect(screen.getByTestId('rpt2biv-coo-legal-section')).toBeInTheDocument();
  });
});
