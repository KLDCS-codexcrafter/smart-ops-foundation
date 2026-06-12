import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QuotationRegisterV2Panel } from '../QuotationRegisterV2';

describe('RPT-7a · sx-quotations (dashboard recipe)', () => {
  it('mounts dashboard host + integrity badge', () => {
    render(<MemoryRouter><QuotationRegisterV2Panel /></MemoryRouter>);
    expect(screen.getByTestId('sx-quotations-dashboard-host')).toBeInTheDocument();
    expect(screen.getByTestId('sx-quotations-integrity-badge')).toBeInTheDocument();
  });
});
