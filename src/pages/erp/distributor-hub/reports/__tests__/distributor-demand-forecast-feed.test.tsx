import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DistributorDemandForecastFeedPanel } from '../DistributorDemandForecastFeed';

describe('RPT-7c · db-demand (toggle recipe)', () => {
  it('mounts TableChartToggle host + integrity badge, defaults to Table', () => {
    render(<MemoryRouter><DistributorDemandForecastFeedPanel /></MemoryRouter>);
    expect(screen.getByTestId('db-demand-toggle-host')).toBeInTheDocument();
    expect(screen.getByTestId('db-demand-integrity-badge')).toBeInTheDocument();
    expect(screen.getByTestId('table-chart-toggle')).toBeInTheDocument();
    expect(screen.getByTestId('tct-tab-table')).toHaveAttribute('data-state', 'active');
  });
});
