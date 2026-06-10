/**
 * @file        meetings-dashboard.test.tsx
 * @sprint      RPT-2a-iii · robust assertions
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MeetingsDashboardPage from '../MeetingsDashboardPage';

describe('RPT-2a-iii · MeetingsDashboardPage', () => {
  it('preserves existing header + tiles', () => {
    render(<MeetingsDashboardPage />);
    expect(screen.getByRole('heading', { name: /Meetings · Board · AGM · Committees/i })).toBeInTheDocument();
    expect(screen.queryAllByText(/Quorum met/i).length).toBeGreaterThan(0);
  });
  it('adds ScorecardTile + ReportChart + integrity badge', () => {
    render(<MeetingsDashboardPage />);
    expect(screen.getAllByTestId('scorecard-tile').length).toBeGreaterThan(0);
    expect(screen.getByTestId('integrity-badge-meetings')).toBeInTheDocument();
    expect(screen.getByTestId('rpt2aiii-meetings-section')).toBeInTheDocument();
  });
});
