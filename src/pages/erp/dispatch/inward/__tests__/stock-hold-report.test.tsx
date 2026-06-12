import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { StockHoldReportPanel } from '../StockHoldReport';

describe('RPT-8a · dp-stock-hold (toggle recipe)', () => {
  it('mounts TableChartToggle host + integrity badge, defaults to Table', () => {
    render(<MemoryRouter><StockHoldReportPanel /></MemoryRouter>);
    expect(screen.getByTestId('dp-stock-hold-toggle-host')).toBeInTheDocument();
    expect(screen.getByTestId('dp-stock-hold-integrity-badge')).toBeInTheDocument();
    expect(screen.getByTestId('table-chart-toggle')).toBeInTheDocument();
    expect(screen.getByTestId('tct-tab-table')).toHaveAttribute('data-state', 'active');
  });
});
