import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BreakdownReport } from '../BreakdownReport';

describe('RPT-6c · mnt-breakdown (dashboard recipe)', () => {
  it('mounts dashboard host + integrity badge', () => {
    render(<BreakdownReport onNavigate={() => {}} />);
    expect(screen.getByTestId('mnt-breakdown-dashboard-host')).toBeInTheDocument();
    expect(screen.getByTestId('mnt-breakdown-integrity-badge')).toBeInTheDocument();
  });
});
