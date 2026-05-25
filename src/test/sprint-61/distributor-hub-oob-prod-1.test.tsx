import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DistributorDemandForecastFeedPanel } from '@/pages/erp/distributor-hub/reports/DistributorDemandForecastFeed';

// useEntityCode pulls from ERPCompanyProvider · mock to a deterministic entity
vi.mock('@/hooks/useEntityCode', () => ({
  useEntityCode: () => ({ entityCode: 'TEST-OOB1', entityId: 'test-oob1' }),
}));

// listForecasts reads localStorage · default = empty
import { vi } from 'vitest';

describe('DistributorDemandForecastFeedPanel · OOB-PROD-1 · MOAT 35 smoke', () => {
  it('renders the OOB-PROD-1 / MOAT 35 header', () => {
    render(<DistributorDemandForecastFeedPanel />);
    expect(
      screen.getByText(/Distributor Demand Forecast Feed/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/OOB-PROD-1/)).toBeInTheDocument();
    expect(screen.getByText(/MOAT 35/)).toBeInTheDocument();
  });

  it('shows the empty state when no forecasts exist for the entity', () => {
    render(<DistributorDemandForecastFeedPanel />);
    expect(
      screen.getByText(/No forecasts generated yet/i),
    ).toBeInTheDocument();
  });

  it('renders the three KPI tiles', () => {
    render(<DistributorDemandForecastFeedPanel />);
    expect(screen.getByText(/Items with active forecast/i)).toBeInTheDocument();
    expect(screen.getByText(/Total forecast qty/i)).toBeInTheDocument();
    expect(screen.getByText(/Distributor-weighted contribution/i)).toBeInTheDocument();
  });
});
