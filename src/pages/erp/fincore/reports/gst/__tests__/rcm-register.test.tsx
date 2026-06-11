/**
 * @file rcm-register.test.tsx — RPT-2e-ii
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RCMRegisterPanel } from '../RCMRegister';

describe('RCMRegister (RPT-2e-ii wrap)', () => {
  it('mounts the toggle host + period + integrity badge + table', () => {
    render(<RCMRegisterPanel entityCode="TEST_ENT" />);
    expect(screen.getByTestId('fc-rcm-register-toggle-host')).toBeInTheDocument();
    expect(screen.getByTestId('fc-rcm-register-period-chip')).toBeInTheDocument();
    expect(screen.getByTestId('fc-rcm-register-integrity-badge')).toBeInTheDocument();
    expect(screen.getByTestId('table-chart-toggle')).toBeInTheDocument();
    expect(screen.getByTestId('tct-tab-table')).toBeInTheDocument();
    expect(screen.getByTestId('tct-tab-chart')).toBeInTheDocument();
  });
  it('preserves the existing register header', () => {
    render(<RCMRegisterPanel entityCode="TEST_ENT" />);
    expect(screen.getAllByText(/RCM Register/i).length).toBeGreaterThan(0);
  });
});
