/**
 * @file tds-deduction-panel.test.tsx — RPT-5c dashboard recipe
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TdsDeductionReportPanel } from '../TdsDeductionReportPanel';

describe('RPT-5c · TdsDeductionReportPanel (dashboard recipe)', () => {
  it('mounts dashboard host + integrity badge', () => {
    render(<TdsDeductionReportPanel />);
    expect(screen.getByTestId('pr-tds-deduction-dashboard-host')).toBeInTheDocument();
    expect(screen.getByTestId('pr-tds-deduction-integrity-badge')).toBeInTheDocument();
  });
  it('preserves TDS Deduction heading', () => {
    render(<TdsDeductionReportPanel />);
    expect(screen.getAllByText(/TDS Deduction/i).length).toBeGreaterThanOrEqual(1);
  });
});
