/**
 * @file        waste-management-dashboard.test.tsx
 * @sprint      RPT-2a-i
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import WasteManagementDashboardPage from '../WasteManagementDashboardPage';

describe('RPT-2a-i · WasteManagementDashboardPage', () => {
  it('preserves existing header + tiles', () => {
    render(<WasteManagementDashboardPage />);
    expect(screen.getByText(/Waste Management Compliance/i)).toBeInTheDocument();
    expect(screen.getByText(/Active Authorisations/i)).toBeInTheDocument();
  });
  it('adds ScorecardTile + integrity badge', () => {
    render(<WasteManagementDashboardPage />);
    expect(screen.getAllByTestId('scorecard-tile').length).toBeGreaterThan(0);
    expect(screen.getByTestId('integrity-badge-waste')).toBeInTheDocument();
    expect(screen.getByTestId('rpt2ai-waste-section')).toBeInTheDocument();
  });
});
