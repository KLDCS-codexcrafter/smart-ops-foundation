import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProductionHandoff } from '../ProductionHandoff';

describe('RPT-6c · eng-handoff (toggle recipe)', () => {
  it('mounts toggle host + integrity badge', () => {
    render(<ProductionHandoff />);
    expect(screen.getByTestId('eng-handoff-toggle-host')).toBeInTheDocument();
    expect(screen.getByTestId('eng-handoff-integrity-badge')).toBeInTheDocument();
  });
});
