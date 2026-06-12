import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CustomerOrderRegisterPanel } from '../CustomerOrderRegister';

describe('RPT-7a · sx-customer-orders (dashboard recipe)', () => {
  it('mounts dashboard host + integrity badge', () => {
    render(<MemoryRouter><CustomerOrderRegisterPanel /></MemoryRouter>);
    expect(screen.getByTestId('sx-customer-orders-dashboard-host')).toBeInTheDocument();
    expect(screen.getByTestId('sx-customer-orders-integrity-badge')).toBeInTheDocument();
  });
});
