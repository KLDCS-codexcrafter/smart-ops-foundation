import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FireSafetyExpiryReport } from '../FireSafetyExpiryReport';

describe('RPT-6c · mnt-fire-expiry (dashboard recipe)', () => {
  it('mounts dashboard host + integrity badge', () => {
    render(<FireSafetyExpiryReport />);
    expect(screen.getByTestId('mnt-fire-expiry-dashboard-host')).toBeInTheDocument();
    expect(screen.getByTestId('mnt-fire-expiry-integrity-badge')).toBeInTheDocument();
  });
});
