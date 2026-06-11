/**
 * @file audit-trail-report.test.tsx — RPT-2e-ii
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AuditTrailReportPanel } from '../AuditTrailReport';

describe('AuditTrailReport (RPT-2e-ii wrap)', () => {
  it('mounts the toggle host + period + integrity badge', () => {
    render(<AuditTrailReportPanel entityCode="TEST_ENT" />);
    expect(screen.getByTestId('fc-audit-trail-toggle-host')).toBeInTheDocument();
    expect(screen.getByTestId('fc-audit-trail-period-chip')).toBeInTheDocument();
    expect(screen.getByTestId('fc-audit-trail-integrity-badge')).toBeInTheDocument();
    expect(screen.getByTestId('table-chart-toggle')).toBeInTheDocument();
  });
  it('preserves the Audit Trail heading', () => {
    render(<AuditTrailReportPanel entityCode="TEST_ENT" />);
    expect(screen.getAllByText(/Audit Trail/i).length).toBeGreaterThan(0);
  });
});
