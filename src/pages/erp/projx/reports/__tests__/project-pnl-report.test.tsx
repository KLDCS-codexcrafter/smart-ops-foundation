import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ProjectPnLReportPanel } from '../ProjectPnLReport';

describe('RPT-7b · px-pnl (dashboard recipe)', () => {
  it('mounts dashboard host + integrity badge + chart host', () => {
    render(<MemoryRouter><ProjectPnLReportPanel /></MemoryRouter>);
    expect(screen.getByTestId('px-pnl-dashboard-host')).toBeInTheDocument();
    expect(screen.getByTestId('px-pnl-integrity-badge')).toBeInTheDocument();
    expect(screen.getByTestId('px-pnl-chart-host')).toBeInTheDocument();
  });
});
