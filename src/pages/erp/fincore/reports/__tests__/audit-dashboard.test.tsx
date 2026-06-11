/**
 * @file audit-dashboard.test.tsx — RPT-2e-iii (dashboard recipe)
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AuditDashboardPanel } from '../AuditDashboard';

describe('AuditDashboard (RPT-2e-iii dashboard recipe)', () => {
  it('mounts recipe host + period + integrity badge + chart + scorecard', () => {
    render(<AuditDashboardPanel entityCode="TEST_ENT" />);
    expect(screen.getByTestId('fc-audit-dash-recipe-host')).toBeInTheDocument();
    expect(screen.getByTestId('fc-audit-dash-period-chip')).toBeInTheDocument();
    expect(screen.getByTestId('fc-audit-dash-integrity-badge')).toBeInTheDocument();
    expect(screen.getByTestId('fc-audit-dash-chart-host')).toBeInTheDocument();
    expect(screen.getByTestId('scorecard-tile')).toBeInTheDocument();
  });
  it('preserves the heading', () => {
    render(<AuditDashboardPanel entityCode="TEST_ENT" />);
    expect(screen.getByRole('heading', { name: /Tax Audit Dashboard/i })).toBeInTheDocument();
  });
});
