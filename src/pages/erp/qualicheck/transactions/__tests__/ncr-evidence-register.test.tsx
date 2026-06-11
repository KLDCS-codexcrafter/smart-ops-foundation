/**
 * @file ncr-evidence-register.test.tsx — RPT-5d toggle recipe
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QualiCheckNcrEvidenceRegisterPanel } from '../QualiCheckNcrEvidenceRegister';

describe('RPT-5d · QualiCheckNcrEvidenceRegister (toggle recipe)', () => {
  it('mounts toggle host + integrity badge + chart toggle', () => {
    render(<QualiCheckNcrEvidenceRegisterPanel onNavigate={() => {}} />);
    expect(screen.getByTestId('qc-ncr-toggle-host')).toBeInTheDocument();
    expect(screen.getByTestId('qc-ncr-integrity-badge')).toBeInTheDocument();
    expect(screen.getByTestId('table-chart-toggle')).toBeInTheDocument();
  });
  it('preserves NCR Evidence heading', () => {
    render(<QualiCheckNcrEvidenceRegisterPanel onNavigate={() => {}} />);
    expect(screen.getAllByText(/NCR Evidence/i).length).toBeGreaterThanOrEqual(1);
  });
});
