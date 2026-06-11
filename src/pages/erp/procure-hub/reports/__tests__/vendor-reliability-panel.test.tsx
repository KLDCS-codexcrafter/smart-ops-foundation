/**
 * @file vendor-reliability-panel.test.tsx — RPT-5c dashboard recipe
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VendorReliabilityPanel } from '../VendorReliabilityPanel';

describe('RPT-5c · VendorReliabilityPanel (dashboard recipe)', () => {
  it('mounts dashboard host + integrity badge', () => {
    render(<VendorReliabilityPanel />);
    expect(screen.getByTestId('pr-vendor-reliability-dashboard-host')).toBeInTheDocument();
    expect(screen.getByTestId('pr-vendor-reliability-integrity-badge')).toBeInTheDocument();
  });
  it('preserves Vendor Reliability heading', () => {
    render(<VendorReliabilityPanel />);
    expect(screen.getAllByText(/Vendor Reliability/i).length).toBeGreaterThanOrEqual(1);
  });
});
