import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SalesReturnMemoRegisterPanel } from '../SalesReturnMemoRegister';

describe('RPT-7a · sx-returns (dashboard recipe)', () => {
  it('mounts dashboard host + integrity badge', () => {
    render(<MemoryRouter><SalesReturnMemoRegisterPanel entityCode="SMRT" /></MemoryRouter>);
    expect(screen.getByTestId('sx-returns-dashboard-host')).toBeInTheDocument();
    expect(screen.getByTestId('sx-returns-integrity-badge')).toBeInTheDocument();
  });
});
