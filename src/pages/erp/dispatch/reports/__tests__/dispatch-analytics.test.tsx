import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DispatchAnalyticsPanel } from '../DispatchAnalytics';

describe('RPT-8a · dp-analytics (dashboard recipe)', () => {
  it('mounts dashboard host + integrity badge + chart host', () => {
    render(<MemoryRouter><DispatchAnalyticsPanel /></MemoryRouter>);
    expect(screen.getByTestId('dp-analytics-dashboard-host')).toBeInTheDocument();
    expect(screen.getByTestId('dp-analytics-integrity-badge')).toBeInTheDocument();
    expect(screen.getByTestId('dp-analytics-chart-host')).toBeInTheDocument();
  });
});
