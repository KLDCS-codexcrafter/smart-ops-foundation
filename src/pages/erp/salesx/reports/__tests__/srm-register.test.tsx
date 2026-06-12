import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SRMRegisterPanel } from '../SRMRegister';

describe('RPT-7a · sx-srm (dashboard recipe)', () => {
  it('mounts dashboard host + integrity badge', () => {
    render(<MemoryRouter><SRMRegisterPanel /></MemoryRouter>);
    expect(screen.getByTestId('sx-srm-dashboard-host')).toBeInTheDocument();
    expect(screen.getByTestId('sx-srm-integrity-badge')).toBeInTheDocument();
  });
});
