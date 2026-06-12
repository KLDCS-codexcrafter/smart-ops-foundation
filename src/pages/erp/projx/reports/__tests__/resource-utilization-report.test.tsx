import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ResourceUtilizationReportPanel } from '../ResourceUtilizationReport';

describe('RPT-7b · px-utilization (dashboard recipe)', () => {
  it('mounts dashboard host + integrity badge + chart host', () => {
    render(<MemoryRouter><ResourceUtilizationReportPanel /></MemoryRouter>);
    expect(screen.getByTestId('px-utilization-dashboard-host')).toBeInTheDocument();
    expect(screen.getByTestId('px-utilization-integrity-badge')).toBeInTheDocument();
    expect(screen.getByTestId('px-utilization-chart-host')).toBeInTheDocument();
  });
});
