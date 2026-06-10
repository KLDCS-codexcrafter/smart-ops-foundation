/**
 * @file credit-risk-report.test.tsx
 * @sprint RPT-2c · CreditRiskReport wrap
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CreditRiskReportPanel } from '../CreditRiskReport';

describe('RPT-2c · CreditRiskReportPanel', () => {
  it('renders header', () => {
    render(<CreditRiskReportPanel entityCode="E1" />);
    expect(screen.getByText(/Credit Risk Report/i)).toBeInTheDocument();
  });
  it('preserves existing search input', () => {
    render(<CreditRiskReportPanel entityCode="E1" />);
    expect(screen.getByPlaceholderText(/Customer\.\.\./)).toBeInTheDocument();
  });
  it('mounts TableChartToggle defaulting to Table', () => {
    render(<CreditRiskReportPanel entityCode="E1" />);
    expect(screen.getByTestId('table-chart-toggle')).toBeInTheDocument();
    expect(screen.getByTestId('tct-tab-table').getAttribute('data-state')).toBe('active');
  });
  it('renders integrity badge + period chip', () => {
    render(<CreditRiskReportPanel entityCode="E1" />);
    expect(screen.getByTestId('rx-crr-integrity-badge')).toBeInTheDocument();
    expect(screen.getByTestId('rx-crr-period-chip')).toBeInTheDocument();
  });
});
