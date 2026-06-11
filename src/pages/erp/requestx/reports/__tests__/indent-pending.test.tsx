import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { IndentPendingPanel } from '../IndentPending';

describe('RPT-6b · rq-pending (toggle recipe)', () => {
  it('mounts toggle host + integrity badge', () => {
    render(<MemoryRouter><IndentPendingPanel /></MemoryRouter>);
    expect(screen.getByTestId('rq-pending-toggle-host')).toBeInTheDocument();
    expect(screen.getByTestId('rq-pending-integrity-badge')).toBeInTheDocument();
  });
});
