/**
 * @file enquiry-details-panel.test.tsx — RPT-5c dashboard recipe
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EnquiryDetailsReportPanel } from '../EnquiryDetailsReportPanel';

describe('RPT-5c · EnquiryDetailsReportPanel (dashboard recipe)', () => {
  it('mounts dashboard host + integrity badge', () => {
    render(<EnquiryDetailsReportPanel />);
    expect(screen.getByTestId('pr-enquiry-dashboard-host')).toBeInTheDocument();
    expect(screen.getByTestId('pr-enquiry-integrity-badge')).toBeInTheDocument();
  });
  it('preserves Enquiry Details Report heading', () => {
    render(<EnquiryDetailsReportPanel />);
    expect(screen.getAllByText(/Enquiry Details Report/i).length).toBeGreaterThanOrEqual(1);
  });
});
