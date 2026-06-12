import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SalesOrderRegisterPanel } from '../SalesOrderRegister';

describe('RPT-7a · sx-sales-orders (dashboard recipe)', () => {
  it('mounts dashboard host + integrity badge', () => {
    render(<MemoryRouter><SalesOrderRegisterPanel /></MemoryRouter>);
    expect(screen.getByTestId('sx-sales-orders-dashboard-host')).toBeInTheDocument();
    expect(screen.getByTestId('sx-sales-orders-integrity-badge')).toBeInTheDocument();
  });
});
