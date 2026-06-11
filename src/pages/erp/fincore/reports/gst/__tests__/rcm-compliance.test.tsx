/**
 * @file rcm-compliance.test.tsx · RPT-2e-i toggle-wrap presence
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RCMComplianceReportPanel } from '../RCMComplianceReport';

describe('RPT-2e-i · RCMComplianceReport', () => {
  it('preserves header and adds toggle-host + period chip + integrity badge', () => {
    render(<RCMComplianceReportPanel entityCode="ENT001" />);
    expect(screen.queryAllByText(/RCM Compliance/i).length).toBeGreaterThan(0);
    expect(screen.getByTestId('fc-rcm-compliance-toggle-host')).toBeInTheDocument();
    expect(screen.getByTestId('fc-rcm-compliance-period-chip')).toBeInTheDocument();
    expect(screen.getByTestId('fc-rcm-compliance-integrity-badge')).toBeInTheDocument();
  });
});
