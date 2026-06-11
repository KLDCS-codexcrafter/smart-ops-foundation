/**
 * @file budget-utilization-dashboard.test.tsx — RPT-5c toggle recipe
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BudgetUtilizationDashboard } from '../BudgetUtilizationDashboard';

describe('RPT-5c · BudgetUtilizationDashboard (toggle recipe)', () => {
  it('mounts toggle host + integrity badge + chart toggle', () => {
    render(<BudgetUtilizationDashboard />);
    expect(screen.getByTestId('pr-budget-utilization-toggle-host')).toBeInTheDocument();
    expect(screen.getByTestId('pr-budget-utilization-integrity-badge')).toBeInTheDocument();
    expect(screen.getByTestId('table-chart-toggle')).toBeInTheDocument();
  });
  it('preserves Budget Utilization Dashboard heading', () => {
    render(<BudgetUtilizationDashboard />);
    expect(screen.getAllByText(/Budget Utilization Dashboard/i).length).toBeGreaterThanOrEqual(1);
  });
});
