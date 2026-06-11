import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CycleCountStatusPanel } from '../CycleCountStatus';

describe('RPT-6b · st-cycle-count (toggle recipe)', () => {
  it('mounts toggle host + integrity badge', () => {
    render(<MemoryRouter><CycleCountStatusPanel /></MemoryRouter>);
    expect(screen.getByTestId('st-cycle-count-toggle-host')).toBeInTheDocument();
    expect(screen.getByTestId('st-cycle-count-integrity-badge')).toBeInTheDocument();
  });
});
