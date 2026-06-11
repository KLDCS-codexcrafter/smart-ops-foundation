import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AgeingPendingIndentsPanel } from '../AgeingPendingIndents';

describe('RPT-6b · rq-ageing (toggle recipe)', () => {
  it('mounts toggle host + integrity badge', () => {
    render(<MemoryRouter><AgeingPendingIndentsPanel /></MemoryRouter>);
    expect(screen.getByTestId('rq-ageing-toggle-host')).toBeInTheDocument();
    expect(screen.getByTestId('rq-ageing-integrity-badge')).toBeInTheDocument();
  });
});
