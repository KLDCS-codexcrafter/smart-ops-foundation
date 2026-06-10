/**
 * @file requisition-history.test.tsx
 * @sprint RPT-2c · RequisitionHistory wrap
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/lib/payment-requisition-engine', () => ({
  listRequisitions: () => [],
}));

import RequisitionHistory from '../RequisitionHistory';

describe('RPT-2c · RequisitionHistory', () => {
  it('renders header', () => {
    render(<RequisitionHistory />);
    expect(screen.getByText(/Requisition History/i)).toBeInTheDocument();
  });
  it('preserves Refresh button', () => {
    render(<RequisitionHistory />);
    expect(screen.getByText(/Refresh/i)).toBeInTheDocument();
  });
  it('mounts TableChartToggle defaulting to Table', () => {
    render(<RequisitionHistory />);
    expect(screen.getByTestId('table-chart-toggle')).toBeInTheDocument();
    expect(screen.getByTestId('tct-tab-table').getAttribute('data-state')).toBe('active');
  });
  it('renders integrity badge + period chip', () => {
    render(<RequisitionHistory />);
    expect(screen.getByTestId('po-rh-integrity-badge')).toBeInTheDocument();
    expect(screen.getByTestId('po-rh-period-chip')).toBeInTheDocument();
  });
});
