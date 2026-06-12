import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { EcomXDashboardPage } from '../EcomXDashboardPage';

describe('RPT-7c · ec-gmv (dashboard recipe)', () => {
  beforeEach(() => {
    localStorage.setItem('erp-selected-company', 'SMRT');
  });
  it('mounts dashboard host + integrity badge + chart host', () => {
    render(<MemoryRouter><EcomXDashboardPage /></MemoryRouter>);
    expect(screen.getByTestId('ec-gmv-dashboard-host')).toBeInTheDocument();
    expect(screen.getByTestId('ec-gmv-integrity-badge')).toBeInTheDocument();
    expect(screen.getByTestId('ec-gmv-chart-host')).toBeInTheDocument();
  });
});
