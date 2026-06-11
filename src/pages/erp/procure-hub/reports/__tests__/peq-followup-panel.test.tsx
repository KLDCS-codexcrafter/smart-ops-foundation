/**
 * @file peq-followup-panel.test.tsx — RPT-5c dashboard recipe
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PeqFollowupRegisterPanel } from '../PeqFollowupRegisterPanel';

describe('RPT-5c · PeqFollowupRegisterPanel (dashboard recipe)', () => {
  it('mounts dashboard host + integrity badge', () => {
    render(<PeqFollowupRegisterPanel />);
    expect(screen.getByTestId('pr-peq-followup-dashboard-host')).toBeInTheDocument();
    expect(screen.getByTestId('pr-peq-followup-integrity-badge')).toBeInTheDocument();
  });
  it('preserves PEQ Followup Register heading', () => {
    render(<PeqFollowupRegisterPanel />);
    expect(screen.getAllByText(/PEQ Followup Register/i).length).toBeGreaterThanOrEqual(1);
  });
});
