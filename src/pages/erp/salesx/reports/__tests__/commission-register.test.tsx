import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CommissionRegisterPanel } from '../CommissionRegister';

describe('RPT-7a · sx-commission (dashboard recipe)', () => {
  it('mounts dashboard host + integrity badge', () => {
    render(<MemoryRouter><CommissionRegisterPanel entityCode="SMRT" /></MemoryRouter>);
    expect(screen.getByTestId('sx-commission-dashboard-host')).toBeInTheDocument();
    expect(screen.getByTestId('sx-commission-integrity-badge')).toBeInTheDocument();
  });
});
