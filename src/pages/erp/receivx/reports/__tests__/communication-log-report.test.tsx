/**
 * @file communication-log-report.test.tsx
 * @sprint RPT-2c · CommunicationLogReport wrap
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CommunicationLogReportPanel } from '../CommunicationLogReport';

describe('RPT-2c · CommunicationLogReportPanel', () => {
  it('renders header', () => {
    render(<CommunicationLogReportPanel entityCode="E1" />);
    expect(screen.getByText(/Communication Log/i)).toBeInTheDocument();
  });
  it('preserves Customer search input', () => {
    render(<CommunicationLogReportPanel entityCode="E1" />);
    expect(screen.getByPlaceholderText(/Customer\.\.\./)).toBeInTheDocument();
  });
  it('mounts TableChartToggle defaulting to Table', () => {
    render(<CommunicationLogReportPanel entityCode="E1" />);
    expect(screen.getByTestId('table-chart-toggle')).toBeInTheDocument();
    expect(screen.getByTestId('tct-tab-table').getAttribute('data-state')).toBe('active');
  });
  it('renders integrity badge + period chip', () => {
    render(<CommunicationLogReportPanel entityCode="E1" />);
    expect(screen.getByTestId('rx-clr-integrity-badge')).toBeInTheDocument();
    expect(screen.getByTestId('rx-clr-period-chip')).toBeInTheDocument();
  });
});
