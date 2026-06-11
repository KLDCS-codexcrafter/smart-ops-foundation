import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { StockReceiptAckRegisterPanel } from '../StockReceiptAckRegister';

describe('RPT-6b · st-receipt-ack (dashboard recipe)', () => {
  it('mounts dashboard host + integrity badge', () => {
    render(<MemoryRouter><StockReceiptAckRegisterPanel /></MemoryRouter>);
    expect(screen.getByTestId('st-receipt-ack-dashboard-host')).toBeInTheDocument();
    expect(screen.getByTestId('st-receipt-ack-integrity-badge')).toBeInTheDocument();
  });
});
