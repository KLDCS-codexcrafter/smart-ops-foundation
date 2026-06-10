/**
 * @file        dpdp-dashboard.test.tsx
 * @sprint      RPT-2a-i (T2: robust pattern aligned)
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import DPDPDashboardPage from '../DPDPDashboardPage';

describe('RPT-2a-i · DPDPDashboardPage', () => {
  it('preserves existing header + tiles', () => {
    render(<DPDPDashboardPage />);
    expect(screen.getByRole('heading', { name: /DPDP Act 2023/i })).toBeInTheDocument();
    expect(screen.queryAllByText(/Active DPOs/i).length).toBeGreaterThan(0);
  });
  it('adds ScorecardTile + integrity badge', () => {
    render(<DPDPDashboardPage />);
    expect(screen.getAllByTestId('scorecard-tile').length).toBeGreaterThan(0);
    expect(screen.getByTestId('integrity-badge-dpdp')).toBeInTheDocument();
    expect(screen.getByTestId('rpt2ai-dpdp-section')).toBeInTheDocument();
  });
});
