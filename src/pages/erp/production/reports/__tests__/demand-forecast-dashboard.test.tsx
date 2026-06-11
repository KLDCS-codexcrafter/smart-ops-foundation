/**
 * @file demand-forecast-dashboard.test.tsx — RPT-6a toggle recipe
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Comp from '../DemandForecastDashboard';

describe('RPT-6a · prod-demand-forecast (toggle recipe)', () => {
  it('mounts toggle host + integrity badge', () => {
    render(<MemoryRouter><Comp /></MemoryRouter>);
    expect(screen.getByTestId('prod-demand-forecast-toggle-host')).toBeInTheDocument();
    expect(screen.getByTestId('prod-demand-forecast-integrity-badge')).toBeInTheDocument();
  });
});
