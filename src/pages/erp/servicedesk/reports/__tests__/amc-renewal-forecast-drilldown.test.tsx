import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AMCRenewalForecastDrillDown } from '../AMCRenewalForecastDrillDown';

describe('RPT-8a · sd-amc-forecast (dashboard recipe · Dialog)', () => {
  it('mounts dashboard host + integrity badge + chart host inside open dialog', () => {
    render(
      <AMCRenewalForecastDrillDown open month="2026-07" records={[]} onClose={() => {}} />,
    );
    expect(screen.getByTestId('sd-amc-forecast-dashboard-host')).toBeInTheDocument();
    expect(screen.getByTestId('sd-amc-forecast-integrity-badge')).toBeInTheDocument();
    expect(screen.getByTestId('sd-amc-forecast-chart-host')).toBeInTheDocument();
  });
});
