import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import SLAManagementPage from '../SLAManagementPage';

describe('RPT-8b · tf-sla (toggle recipe)', () => {
  it('mounts TableChartToggle host + integrity badge, defaults to Table', () => {
    render(<SLAManagementPage />);
    expect(screen.getByTestId('tf-sla-toggle-host')).toBeInTheDocument();
    expect(screen.getByTestId('tf-sla-integrity-badge')).toBeInTheDocument();
    expect(screen.getByTestId('table-chart-toggle')).toBeInTheDocument();
    expect(screen.getByTestId('tct-tab-table')).toHaveAttribute('data-state', 'active');
  });
});
