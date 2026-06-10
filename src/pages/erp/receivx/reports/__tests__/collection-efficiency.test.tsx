/**
 * @file collection-efficiency.test.tsx
 * @sprint RPT-2c · CollectionEfficiency wrap
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CollectionEfficiencyPanel } from '../CollectionEfficiency';

describe('RPT-2c · CollectionEfficiencyPanel', () => {
  it('renders header', () => {
    render(<CollectionEfficiencyPanel entityCode="E1" />);
    expect(screen.getByText(/Collection Efficiency/i)).toBeInTheDocument();
  });
  it('preserves legend block', () => {
    render(<CollectionEfficiencyPanel entityCode="E1" />);
    expect(screen.getByText(/Legend/i)).toBeInTheDocument();
  });
  it('mounts TableChartToggle defaulting to Table', () => {
    render(<CollectionEfficiencyPanel entityCode="E1" />);
    expect(screen.getByTestId('table-chart-toggle')).toBeInTheDocument();
    expect(screen.getByTestId('tct-tab-table').getAttribute('data-state')).toBe('active');
  });
  it('renders integrity badge + period chip', () => {
    render(<CollectionEfficiencyPanel entityCode="E1" />);
    expect(screen.getByTestId('rx-ce-integrity-badge')).toBeInTheDocument();
    expect(screen.getByTestId('rx-ce-period-chip')).toBeInTheDocument();
  });
});
