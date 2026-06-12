import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DistributorOrderRegisterPanel } from '../DistributorOrderRegister';

describe('RPT-7c · db-orders (dashboard recipe)', () => {
  it('mounts dashboard host + integrity badge + chart host', () => {
    render(<MemoryRouter><DistributorOrderRegisterPanel /></MemoryRouter>);
    expect(screen.getByTestId('db-orders-dashboard-host')).toBeInTheDocument();
    expect(screen.getByTestId('db-orders-integrity-badge')).toBeInTheDocument();
    expect(screen.getByTestId('db-orders-chart-host')).toBeInTheDocument();
  });
});
