import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SecondarySalesRegisterPanel } from '../SecondarySalesRegister';

describe('RPT-7a · sx-secondary (dashboard recipe)', () => {
  it('mounts dashboard host + integrity badge', () => {
    render(<MemoryRouter><SecondarySalesRegisterPanel /></MemoryRouter>);
    expect(screen.getByTestId('sx-secondary-dashboard-host')).toBeInTheDocument();
    expect(screen.getByTestId('sx-secondary-integrity-badge')).toBeInTheDocument();
  });
});
