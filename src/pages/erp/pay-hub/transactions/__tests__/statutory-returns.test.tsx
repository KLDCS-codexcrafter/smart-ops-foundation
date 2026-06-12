import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import StatutoryReturns from '../StatutoryReturns';

describe('RPT-8b · ph-statutory (toggle recipe)', () => {
  it('mounts TableChartToggle host + integrity badge, defaults to Table', () => {
    render(<StatutoryReturns />);
    expect(screen.getByTestId('ph-statutory-toggle-host')).toBeInTheDocument();
    expect(screen.getByTestId('ph-statutory-integrity-badge')).toBeInTheDocument();
    expect(screen.getByTestId('table-chart-toggle')).toBeInTheDocument();
    expect(screen.getByTestId('tct-tab-table')).toHaveAttribute('data-state', 'active');
  });
});
