import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ExpiryReviewPage from '../ExpiryReviewPage';

describe('RPT-8b · dv-expiry (toggle recipe)', () => {
  it('mounts TableChartToggle host + integrity badge, defaults to Table', () => {
    render(<ExpiryReviewPage />);
    expect(screen.getByTestId('dv-expiry-toggle-host')).toBeInTheDocument();
    expect(screen.getByTestId('dv-expiry-integrity-badge')).toBeInTheDocument();
    expect(screen.getByTestId('table-chart-toggle')).toBeInTheDocument();
    expect(screen.getByTestId('tct-tab-table')).toHaveAttribute('data-state', 'active');
  });
});
