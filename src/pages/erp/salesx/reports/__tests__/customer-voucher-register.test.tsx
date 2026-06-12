import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CustomerVoucherRegisterPanel } from '../CustomerVoucherRegister';

describe('RPT-7a · sx-vouchers (dashboard recipe)', () => {
  it('mounts dashboard host + integrity badge', () => {
    render(<MemoryRouter><CustomerVoucherRegisterPanel /></MemoryRouter>);
    expect(screen.getByTestId('sx-vouchers-dashboard-host')).toBeInTheDocument();
    expect(screen.getByTestId('sx-vouchers-integrity-badge')).toBeInTheDocument();
  });
});
