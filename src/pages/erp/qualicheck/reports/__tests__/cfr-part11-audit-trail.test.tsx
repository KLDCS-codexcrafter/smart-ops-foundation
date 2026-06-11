/**
 * @file cfr-part11-audit-trail.test.tsx — RPT-5d toggle recipe
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import CFRPart11AuditTrailViewer from '../CFRPart11AuditTrailViewer';

describe('RPT-5d · CFRPart11AuditTrailViewer (toggle recipe)', () => {
  it('mounts toggle host + integrity badge + chart toggle', () => {
    render(<CFRPart11AuditTrailViewer />);
    expect(screen.getByTestId('qc-cfr-audit-toggle-host')).toBeInTheDocument();
    expect(screen.getByTestId('qc-cfr-audit-integrity-badge')).toBeInTheDocument();
    expect(screen.getByTestId('table-chart-toggle')).toBeInTheDocument();
  });
  it('preserves CFR Part 11 heading', () => {
    render(<CFRPart11AuditTrailViewer />);
    expect(screen.getAllByText(/21 CFR Part 11/i).length).toBeGreaterThanOrEqual(1);
  });
});
