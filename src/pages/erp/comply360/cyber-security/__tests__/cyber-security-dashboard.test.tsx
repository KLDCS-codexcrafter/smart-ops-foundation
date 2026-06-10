/**
 * @file        cyber-security-dashboard.test.tsx
 * @sprint      RPT-2a-ii · robust assertions (T2 lesson)
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import CyberSecurityDashboardPage from '../CyberSecurityDashboardPage';

describe('RPT-2a-ii · CyberSecurityDashboardPage', () => {
  it('preserves existing header + tiles', () => {
    render(<CyberSecurityDashboardPage />);
    expect(screen.getByRole('heading', { name: /Cyber Security/i })).toBeInTheDocument();
    expect(screen.queryAllByText(/Open Incidents/i).length).toBeGreaterThan(0);
  });
  it('adds ScorecardTile + ReportChart + integrity badge', () => {
    render(<CyberSecurityDashboardPage />);
    expect(screen.getAllByTestId('scorecard-tile').length).toBeGreaterThan(0);
    expect(screen.getByTestId('integrity-badge-cyber')).toBeInTheDocument();
    expect(screen.getByTestId('rpt2aii-cyber-section')).toBeInTheDocument();
  });
});
