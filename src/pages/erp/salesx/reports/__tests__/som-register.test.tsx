import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SOMRegisterPanel } from '../SOMRegister';

describe('RPT-7a · sx-som (dashboard recipe)', () => {
  it('mounts dashboard host + integrity badge', () => {
    render(<MemoryRouter><SOMRegisterPanel /></MemoryRouter>);
    expect(screen.getByTestId('sx-som-dashboard-host')).toBeInTheDocument();
    expect(screen.getByTestId('sx-som-integrity-badge')).toBeInTheDocument();
  });
});
