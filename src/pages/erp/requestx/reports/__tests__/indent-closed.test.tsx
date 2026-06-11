import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { IndentClosedPanel } from '../IndentClosed';

describe('RPT-6b · rq-closed (toggle recipe)', () => {
  it('mounts toggle host + integrity badge', () => {
    render(<MemoryRouter><IndentClosedPanel /></MemoryRouter>);
    expect(screen.getByTestId('rq-closed-toggle-host')).toBeInTheDocument();
    expect(screen.getByTestId('rq-closed-integrity-badge')).toBeInTheDocument();
  });
});
