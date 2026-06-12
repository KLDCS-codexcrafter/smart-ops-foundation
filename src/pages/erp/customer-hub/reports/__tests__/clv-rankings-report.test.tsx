import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CLVRankingsReportPanel } from '../CLVRankingsReport';

describe('RPT-7c · cu-clv (dashboard recipe)', () => {
  it('mounts dashboard host + integrity badge + chart host', () => {
    render(<MemoryRouter><CLVRankingsReportPanel /></MemoryRouter>);
    expect(screen.getByTestId('cu-clv-dashboard-host')).toBeInTheDocument();
    expect(screen.getByTestId('cu-clv-integrity-badge')).toBeInTheDocument();
    expect(screen.getByTestId('cu-clv-chart-host')).toBeInTheDocument();
  });
});
