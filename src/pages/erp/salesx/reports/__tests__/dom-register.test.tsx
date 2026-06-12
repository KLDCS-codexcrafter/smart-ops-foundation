import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DOMRegisterPanel } from '../DOMRegister';

describe('RPT-7a · sx-dom (dashboard recipe)', () => {
  it('mounts dashboard host + integrity badge', () => {
    render(<MemoryRouter><DOMRegisterPanel /></MemoryRouter>);
    expect(screen.getByTestId('sx-dom-dashboard-host')).toBeInTheDocument();
    expect(screen.getByTestId('sx-dom-integrity-badge')).toBeInTheDocument();
  });
});
