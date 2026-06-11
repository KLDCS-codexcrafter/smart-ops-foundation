import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LookAheadPlan } from '../LookAheadPlan';

describe('RPT-6c · site-lookahead (dashboard recipe)', () => {
  it('mounts dashboard host + integrity badge', () => {
    render(<LookAheadPlan onNavigate={() => {}} />);
    expect(screen.getByTestId('site-lookahead-dashboard-host')).toBeInTheDocument();
    expect(screen.getByTestId('site-lookahead-integrity-badge')).toBeInTheDocument();
  });
});
