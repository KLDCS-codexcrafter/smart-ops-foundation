import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { IndentRegisterPanel } from '../IndentRegister';

describe('RPT-6b · rq-indent (dashboard recipe)', () => {
  it('mounts dashboard host + integrity badge', () => {
    render(<MemoryRouter><IndentRegisterPanel /></MemoryRouter>);
    expect(screen.getByTestId('rq-indent-dashboard-host')).toBeInTheDocument();
    expect(screen.getByTestId('rq-indent-integrity-badge')).toBeInTheDocument();
  });
});
