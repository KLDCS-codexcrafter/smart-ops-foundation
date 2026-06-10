/**
 * @file        buyer-reliability-dashboard.test.tsx
 * @sprint      RPT-2b-iv · header via getByRole heading + queryAllByText
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BuyerReliabilityDashboard } from '../BuyerReliabilityDashboard';

describe('RPT-2b-iv · BuyerReliabilityDashboard', () => {
  it('preserves existing header + tiles', () => {
    render(<BuyerReliabilityDashboard />);
    expect(screen.getByRole('heading', { name: /Buyer Reliability Index/i })).toBeInTheDocument();
    expect(screen.queryAllByText(/Distribution by Class/i).length).toBeGreaterThan(0);
  });
  it('adds ScorecardTile + ReportChart + integrity badge', () => {
    render(<BuyerReliabilityDashboard />);
    expect(screen.getAllByTestId('scorecard-tile').length).toBeGreaterThan(0);
    expect(screen.getByTestId('integrity-badge-buyer-reliability')).toBeInTheDocument();
    expect(screen.getByTestId('rpt2biv-buyer-reliability-section')).toBeInTheDocument();
  });
});
